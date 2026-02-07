from __future__ import annotations

import json
import re
from hashlib import sha256

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from .cache import FileCache
from .config import Settings
from .models import Message, MessageContext


def _norm_sender(sender: str) -> str:
    return sender.strip().upper()


def _line(msg: Message) -> str:
    recipient = f" -> {msg.recipient}" if msg.recipient else ""
    return f"[{msg.timestamp.isoformat(timespec='minutes')}] {_norm_sender(msg.sender)}{recipient}: {msg.content}"


def _deterministic_context(messages: list[Message]) -> MessageContext:
    context = MessageContext()
    key_messages: list[str] = []

    for message in messages:
        text = message.content.lower()
        sender = _norm_sender(message.sender)

        if re.search(r"\b(approve|approved|ok|yes)\b", text) and (
            "ot" in text or "overtime" in text or "stay" in text or "late" in text
        ):
            context.overtime_approved = True
            key_messages.append(_line(message))

        if any(token in text for token in ["tablet", "malfunction", "clocked me out", "clock out recorded", "time clock"]):
            context.malfunction_reported = True
            key_messages.append(_line(message))

        if sender == "AGENT" and any(token in text for token in ["on your way", "please respond", "haven't heard", "marking as no-show"]):
            context.no_show_outreach = True
            key_messages.append(_line(message))

        if any(token in text for token in ["break", "lunch", "didn't really get", "ate at desk", "working lunch"]):
            context.break_dispute = True
            key_messages.append(_line(message))

        if any(token in text for token in ["emergency", "injury", "injured", "hurt", "medical", "hospital", "evacuation", "weather", "storm", "accident"]):
            context.emergency_exception = True
            key_messages.append(_line(message))

    context.key_messages = list(dict.fromkeys(key_messages))[:6]
    return context


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def _llm_extract(client: OpenAI, model: str, prompt: str) -> str:
    response = client.responses.create(model=model, input=prompt)
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text
    raw = response.model_dump() if hasattr(response, "model_dump") else {}
    return json.dumps(raw)


def extract_message_context(messages: list[Message], settings: Settings, cache: FileCache) -> MessageContext:
    deterministic = _deterministic_context(messages)
    if not settings.openai_api_key or not messages:
        return deterministic

    joined = "\n".join(_line(message) for message in messages)
    cache_key = f"message_context:{settings.openai_model}:{sha256(joined.encode('utf-8')).hexdigest()}"
    cached = cache.get(cache_key)
    if cached is not None:
        try:
            cached_context = MessageContext.model_validate(cached)
            return _merge_context(deterministic, cached_context)
        except Exception:
            pass

    prompt = (
        "Extract reconciliation context as JSON with boolean keys: "
        "overtime_approved, malfunction_reported, no_show_outreach, break_dispute, emergency_exception, "
        "and key_messages as short list of quoted message snippets.\n"
        "Return ONLY valid JSON.\n"
        f"Messages:\n{joined}"
    )

    try:
        client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds)
        text = _llm_extract(client, settings.openai_model, prompt)
        payload = json.loads(text)
        llm_context = MessageContext.model_validate(payload)
        merged = _merge_context(deterministic, llm_context)
        cache.set(cache_key, merged.model_dump())
        return merged
    except Exception:
        return deterministic


def _merge_context(primary: MessageContext, secondary: MessageContext) -> MessageContext:
    key_messages = _semantic_dedupe((primary.key_messages or []) + (secondary.key_messages or []), limit=6)
    return MessageContext(
        overtime_approved=primary.overtime_approved or secondary.overtime_approved,
        malfunction_reported=primary.malfunction_reported or secondary.malfunction_reported,
        no_show_outreach=primary.no_show_outreach or secondary.no_show_outreach,
        break_dispute=primary.break_dispute or secondary.break_dispute,
        emergency_exception=primary.emergency_exception or secondary.emergency_exception,
        key_messages=key_messages,
    )


def _semantic_dedupe(lines: list[str], limit: int = 6) -> list[str]:
    """Deduplicate message snippets even when one is a shortened version of another."""
    kept: list[str] = []
    canonical: list[str] = []

    for line in lines:
        value = (line or "").strip()
        if not value:
            continue

        # Drop timestamp/sender prefix when present for semantic comparison.
        text = value
        if "]" in text and ": " in text:
            text = text.split("]", 1)[-1]
            if ": " in text:
                text = text.split(": ", 1)[-1]
        norm = " ".join(text.lower().split())
        if not norm:
            continue

        duplicate = False
        for existing in canonical:
            if norm == existing or norm in existing or existing in norm:
                duplicate = True
                break
        if duplicate:
            continue

        kept.append(value)
        canonical.append(norm)
        if len(kept) >= limit:
            break

    return kept
