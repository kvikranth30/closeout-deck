from __future__ import annotations

import json
from hashlib import sha256

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from .cache import FileCache
from .config import Settings
from .models import Evidence, ShiftData


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def _llm_explain(client: OpenAI, model: str, prompt: str) -> str:
    response = client.responses.create(model=model, input=prompt)
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text
    raw = response.model_dump() if hasattr(response, "model_dump") else {}
    return json.dumps(raw)


def generate_explanation(
    *,
    shift: ShiftData,
    evidence: Evidence,
    confidence: str,
    flags: list[str],
    recommended_hours: float,
    recommended_break_minutes: int,
    break_policy_applied: str | None,
    facility_break_minutes: int | None,
    worker_break_minutes: int | None,
    settings: Settings,
    cache: FileCache,
) -> tuple[str, list[str] | None]:
    fallback_reasoning_steps = _fallback_reasoning_steps(
        evidence=evidence,
        confidence=confidence,
        flags=flags,
        recommended_hours=recommended_hours,
        recommended_break_minutes=recommended_break_minutes,
        break_policy_applied=break_policy_applied,
        facility_break_minutes=facility_break_minutes,
        worker_break_minutes=worker_break_minutes,
    )
    fallback = _fallback_explanation(
        shift=shift,
        evidence=evidence,
        confidence=confidence,
        flags=flags,
        recommended_hours=recommended_hours,
        recommended_break_minutes=recommended_break_minutes,
        break_policy_applied=break_policy_applied,
        facility_break_minutes=facility_break_minutes,
        worker_break_minutes=worker_break_minutes,
    )

    if not settings.openai_api_key:
        return fallback, fallback_reasoning_steps if settings.reasoning_steps_enabled else None

    payload = {
        "shift_id": shift.facility.shift_id,
        "worker_id": shift.facility.worker_id,
        "worker_name": shift.facility.worker_name,
        "scheduled_start": shift.facility.scheduled_start.isoformat(timespec="minutes"),
        "scheduled_end": shift.facility.scheduled_end.isoformat(timespec="minutes"),
        "recommendation": {
            "hours": recommended_hours,
            "break_minutes": recommended_break_minutes,
            "confidence": confidence,
        },
        "break_policy_applied": break_policy_applied,
        "break_claims": {
            "facility_break_minutes": facility_break_minutes,
            "worker_break_minutes": worker_break_minutes,
        },
        "evidence": evidence.model_dump(),
        "flags": flags,
        "messages": [
            {
                "timestamp": msg.timestamp.isoformat(timespec="minutes"),
                "sender": msg.sender,
                "recipient": msg.recipient,
                "content": msg.content,
            }
            for msg in shift.messages
        ],
        "reasoning_steps_enabled": settings.reasoning_steps_enabled,
    }

    raw = json.dumps(payload, sort_keys=True)
    cache_key = f"explanation:{settings.openai_model}:{sha256(raw.encode('utf-8')).hexdigest()}"
    cached = cache.get(cache_key)
    if cached is not None:
        explanation = str(cached.get("explanation", fallback))
        reasoning_steps = cached.get("reasoning_steps")
        if isinstance(reasoning_steps, list):
            return explanation, [str(step) for step in reasoning_steps]
        return explanation, fallback_reasoning_steps if settings.reasoning_steps_enabled else None

    prompt = (
        "You are a staffing reconciliation analyst. "
        "Produce strict JSON with keys: explanation (string), reasoning_steps (array of short strings). "
        "Cite specific timestamps and facts from evidence/messages. "
        "Do not change numbers.\n"
        f"Input:\n{raw}"
    )

    try:
        client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds)
        text = _llm_explain(client, settings.openai_model, prompt)
        parsed = json.loads(text)
        explanation = str(parsed.get("explanation") or fallback)
        reasoning_steps = parsed.get("reasoning_steps")
        if not isinstance(reasoning_steps, list):
            reasoning_steps = fallback_reasoning_steps if settings.reasoning_steps_enabled else None
        elif not settings.reasoning_steps_enabled:
            reasoning_steps = None
        cache.set(cache_key, {"explanation": explanation, "reasoning_steps": reasoning_steps})
        return explanation, reasoning_steps
    except Exception:
        return fallback, fallback_reasoning_steps if settings.reasoning_steps_enabled else None


def _fallback_explanation(
    *,
    shift: ShiftData,
    evidence: Evidence,
    confidence: str,
    flags: list[str],
    recommended_hours: float,
    recommended_break_minutes: int,
    break_policy_applied: str | None,
    facility_break_minutes: int | None,
    worker_break_minutes: int | None,
) -> str:
    parts = [
        f"Recommended {recommended_hours:.1f} hours with {recommended_break_minutes} break minutes and {confidence} confidence.",
    ]

    if evidence.gps_hours is not None:
        parts.append(f"GPS supports on-site presence for about {evidence.gps_hours:.2f} hours.")
    if evidence.facility_hours is not None:
        parts.append(f"Facility-reported hours: {evidence.facility_hours:.2f}.")
    if evidence.worker_hours is not None:
        parts.append(f"Worker-reported hours: {evidence.worker_hours:.2f}.")
    if evidence.key_messages:
        parts.append(f"Message context considered: {evidence.key_messages[0]}")
    if any("break dispute" in flag.lower() for flag in flags) and break_policy_applied in {"worker_favor", "midpoint", "facility_favor"}:
        parts.append(
            "Break dispute resolved using "
            f"{break_policy_applied} policy "
            f"(worker={worker_break_minutes}, facility={facility_break_minutes})."
        )
    if flags:
        parts.append(f"Flags: {'; '.join(flags)}")

    return " ".join(parts)


def _fallback_reasoning_steps(
    *,
    evidence: Evidence,
    confidence: str,
    flags: list[str],
    recommended_hours: float,
    recommended_break_minutes: int,
    break_policy_applied: str | None,
    facility_break_minutes: int | None,
    worker_break_minutes: int | None,
) -> list[str]:
    steps: list[str] = []
    steps.append(
        f"Recommendation computed deterministically: {recommended_hours:.1f} payable hours with {recommended_break_minutes} break minutes."
    )
    if evidence.gps_hours is not None:
        steps.append(f"GPS corroborates on-site presence for ~{evidence.gps_hours:.2f} hours.")
    if evidence.facility_hours is not None and evidence.worker_hours is not None:
        steps.append(
            f"Facility vs worker reported hours compared ({evidence.facility_hours:.2f} vs {evidence.worker_hours:.2f}); agreement={evidence.sources_agreement}."
        )
    if any("break dispute" in flag.lower() for flag in flags):
        steps.append(
            f"Break conflict resolved by {break_policy_applied} policy (worker={worker_break_minutes}, facility={facility_break_minutes})."
        )
    if evidence.overtime_approved:
        steps.append("Message context indicates overtime was explicitly approved.")
    if flags:
        steps.append("Review flags were added for unresolved policy/data-quality risk.")
    steps.append(f"Final confidence tier set to {confidence}.")
    return steps
