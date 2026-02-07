from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .cache import FileCache
from .confidence import clamp_confidence, score_confidence
from .confidence_suggestions import build_confidence_suggestions
from .config import Settings, get_settings
from .explainer import generate_explanation
from .gps import compute_presence
from .message_context import extract_message_context
from .models import DataQuality, Evidence, Recommendation, ReconciliationResult, ShiftData


@dataclass
class Decision:
    hours: float
    break_minutes: int
    flags: list[str]
    rule: str
    confidence_cap: str | None


def _duration_hours(start: datetime | None, end: datetime | None) -> float | None:
    if start is None or end is None or end <= start:
        return None
    return (end - start).total_seconds() / 3600.0


def _net_hours(start: datetime | None, end: datetime | None, break_minutes: int | None) -> float | None:
    gross = _duration_hours(start, end)
    if gross is None:
        return None
    deduction = (break_minutes or 0) / 60.0
    return max(0.0, gross - deduction)


def _sources_agreement(values: list[float | None]) -> str:
    available = [value for value in values if value is not None]
    if len(available) < 2:
        return "none"
    spread = max(available) - min(available)
    if spread <= 0.25:
        return "full"
    if spread <= 1.0:
        return "partial"
    return "none"


def _round_hours(value: float) -> float:
    return round(max(0.0, value), 1)


def _append_unique_flag(flags: list[str], message: str) -> None:
    if message not in flags:
        flags.append(message)


def reconcile_shift(shift: ShiftData, settings: Settings | None = None, cache: FileCache | None = None) -> ReconciliationResult:
    settings = settings or get_settings()
    cache = cache or FileCache(settings.cache_dir)

    facility = shift.facility
    worker = shift.worker
    gps = shift.gps

    message_context = extract_message_context(shift.messages, settings, cache)
    analysis_end = max(
        timestamp
        for timestamp in [
            facility.scheduled_end,
            facility.clock_out or facility.scheduled_end,
            worker.clock_out or facility.scheduled_end,
        ]
    )
    gps_presence = compute_presence(gps, facility.scheduled_start, analysis_end)

    facility_break = facility.break_minutes if facility.break_minutes is not None else 0
    worker_break = worker.break_minutes if worker.break_minutes is not None else facility_break

    break_dispute = (
        facility.break_minutes is not None
        and worker.break_minutes is not None
        and facility.break_minutes != worker.break_minutes
    )

    break_minutes = worker_break
    flags: list[str] = []
    confidence_cap: str | None = None
    break_policy_applied = "worker_submission" if worker.break_minutes is not None else "facility_default"

    if break_dispute:
        if settings.break_dispute_policy == "worker_favor":
            break_minutes = min(facility.break_minutes, worker.break_minutes)
        elif settings.break_dispute_policy == "facility_favor":
            break_minutes = max(facility.break_minutes, worker.break_minutes)
        else:
            break_minutes = int(round((facility.break_minutes + worker.break_minutes) / 2.0))
        break_policy_applied = settings.break_dispute_policy
        _append_unique_flag(flags, "Requires human review - break dispute unresolved")
        confidence_cap = "low"

    facility_hours = _net_hours(facility.clock_in, facility.clock_out, facility_break)
    worker_hours = _net_hours(worker.clock_in, worker.clock_out, worker_break)
    gps_hours_raw = gps_presence.gps_hours
    gps_hours_net = max(0.0, gps_hours_raw - break_minutes / 60.0) if gps_hours_raw is not None else None

    scheduled_hours = _duration_hours(facility.scheduled_start, facility.scheduled_end) or 0.0

    # Rule 1: no-show
    if facility.clock_in is None and facility.clock_out is None and worker.clock_in is None and worker.clock_out is None:
        if gps_presence.at_home_during_shift or gps_presence.on_site_event_count == 0:
            decision = Decision(hours=0.0, break_minutes=0, flags=flags, rule="no_show", confidence_cap="high")
        else:
            decision = Decision(hours=0.0, break_minutes=0, flags=flags + ["Requires human review - potential no-show with uncertain GPS"], rule="no_show_uncertain", confidence_cap="low")
    else:
        available_hours = [value for value in [facility_hours, worker_hours, gps_hours_net] if value is not None]
        agreement = _sources_agreement([facility_hours, worker_hours, gps_hours_net])

        # Rule 8: all agree within 15 minutes
        if len(available_hours) >= 2 and (max(available_hours) - min(available_hours)) <= 0.25:
            decision = Decision(
                hours=sum(available_hours) / len(available_hours),
                break_minutes=break_minutes,
                flags=flags,
                rule="agreement",
                confidence_cap="high",
            )
        else:
            # Candidate base hours with deterministic prioritization
            if message_context.malfunction_reported and (gps_hours_net is not None or worker_hours is not None):
                candidates = [value for value in [gps_hours_net, worker_hours] if value is not None]
                base_hours = max(candidates) if candidates else (facility_hours or 0.0)
                decision = Decision(
                    hours=base_hours,
                    break_minutes=break_minutes,
                    flags=flags + ["Potential time clock malfunction"],
                    rule="equipment_malfunction",
                    confidence_cap="medium",
                )
            elif gps_presence.coverage_ratio >= 0.8 and gps_hours_net is not None:
                decision = Decision(
                    hours=gps_hours_net,
                    break_minutes=break_minutes,
                    flags=flags,
                    rule="gps_strong",
                    confidence_cap=None,
                )
            elif gps_presence.coverage_ratio < 0.5:
                fallback = worker_hours if worker_hours is not None else facility_hours
                if fallback is None and gps_hours_net is not None:
                    fallback = gps_hours_net
                fallback = fallback or 0.0
                weak_flags = flags + [f"Missing GPS data for approximately {gps_presence.signal_gap_minutes:.0f} minutes"]
                _append_unique_flag(weak_flags, "Requires human review - GPS coverage below 50%")
                decision = Decision(
                    hours=fallback,
                    break_minutes=break_minutes,
                    flags=weak_flags,
                    rule="gps_weak",
                    confidence_cap="low",
                )
            else:
                if gps_hours_net is not None:
                    base_hours = gps_hours_net
                elif worker_hours is not None:
                    base_hours = worker_hours
                else:
                    base_hours = facility_hours or 0.0
                decision = Decision(
                    hours=base_hours,
                    break_minutes=break_minutes,
                    flags=flags,
                    rule="mixed_fallback",
                    confidence_cap="medium",
                )

        # OT rules on top of base decision
        if decision.hours > scheduled_hours + 0.1:
            if message_context.overtime_approved:
                decision.rule = f"{decision.rule}+ot_approved"
                decision.confidence_cap = None
            else:
                _append_unique_flag(decision.flags, "Overtime not explicitly approved")
                decision.rule = f"{decision.rule}+ot_unapproved"
                decision.confidence_cap = "medium"

    facility_worker_spread = None
    if facility_hours is not None and worker_hours is not None:
        facility_worker_spread = abs(facility_hours - worker_hours)
        if facility_worker_spread >= 2.0:
            _append_unique_flag(decision.flags, "Worker submission significantly differs from facility")

    if (
        facility_hours is not None
        and facility_hours > 0
        and worker.clock_in is None
        and worker.clock_out is None
        and gps_presence.on_site_event_count == 0
    ):
        _append_unique_flag(decision.flags, "Requires human review - facility clock conflicts with missing worker submission and no on-site GPS")
        decision.confidence_cap = "low"

    if message_context.emergency_exception:
        _append_unique_flag(decision.flags, "Requires human review - emergency/incident reported")
        decision.rule = f"{decision.rule}+emergency_context"
        if decision.confidence_cap is None:
            decision.confidence_cap = "medium"

    if gps_presence.secondary_site_visits:
        message_text = " ".join((m.content or "").lower() for m in shift.messages)
        corroborated = any(
            token in message_text
            for token in ["secondary", "south site", "other site", "errand", "run over", "another site"]
        )
        if corroborated:
            _append_unique_flag(decision.flags, "Secondary site visit corroborated by messages")
        else:
            _append_unique_flag(decision.flags, "Requires human review - secondary site visit not corroborated")
            if decision.confidence_cap is None:
                decision.confidence_cap = "medium"
        decision.rule = f"{decision.rule}+secondary_site_context"

    if decision.rule.startswith("no_show") and not message_context.no_show_outreach:
        _append_unique_flag(decision.flags, "No-show outreach not documented")
        decision.rule = f"{decision.rule}+no_outreach"
        decision.confidence_cap = "medium"

    hours_rounded = _round_hours(decision.hours)
    hourly_rate = facility.hourly_rate if facility.hourly_rate is not None else settings.default_hourly_rate
    payout = round(hours_rounded * hourly_rate, 2)

    evidence = Evidence(
        facility_hours=round(facility_hours, 2) if facility_hours is not None else None,
        worker_hours=round(worker_hours, 2) if worker_hours is not None else None,
        gps_hours=round(gps_hours_raw, 2) if gps_hours_raw is not None else None,
        sources_agreement=_sources_agreement([facility_hours, worker_hours, gps_hours_net]),
        gps_on_site_confirmed=gps_presence.on_site_event_count > 0,
        overtime_approved=message_context.overtime_approved,
        key_messages=message_context.key_messages,
    )

    source_values = [evidence.facility_hours, evidence.worker_hours, gps_hours_net]
    available_values = [value for value in source_values if value is not None]
    spread = (max(available_values) - min(available_values)) if len(available_values) >= 2 else 0.0
    major_conflict = spread >= 0.5
    critical_conflict = spread >= 2.0

    missing_sources = sum(1 for value in [evidence.facility_hours, evidence.worker_hours, evidence.gps_hours] if value is None)
    unresolved_policy_issue = any("Requires human review" in flag for flag in decision.flags) or any(
        token in " ".join(decision.flags).lower() for token in ["break dispute", "overtime"]
    )

    confidence, _confidence_score = score_confidence(
        sources_agreement=evidence.sources_agreement,
        gps_coverage_ratio=gps_presence.coverage_ratio,
        has_gps_confirmation=evidence.gps_on_site_confirmed,
        has_major_conflict=major_conflict,
        has_critical_conflict=critical_conflict,
        has_message_corroboration=bool(evidence.key_messages),
        missing_sources=missing_sources,
        unresolved_policy_issue=unresolved_policy_issue,
    )

    confidence = clamp_confidence(confidence, decision.confidence_cap)
    confidence_override_applied = False

    if decision.rule.startswith("no_show") and message_context.no_show_outreach:
        confidence = "high"
        confidence_override_applied = True

    if (
        gps_presence.coverage_ratio >= 0.8
        and evidence.gps_on_site_confirmed
        and message_context.overtime_approved
        and decision.hours > scheduled_hours + 0.1
    ):
        confidence = "high"
        confidence_override_applied = True

    if break_dispute:
        confidence = "low"
        confidence_override_applied = True

    data_quality = DataQuality(
        facility_data=(
            "complete" if facility.clock_in and facility.clock_out and facility.break_minutes is not None else "partial" if facility.clock_in or facility.clock_out or facility.notes else "missing"
        ),
        worker_submission=(
            "complete" if worker.clock_in and worker.clock_out and worker.submitted_at else "partial" if worker.clock_in or worker.clock_out or worker.notes else "missing"
        ),
        gps_coverage=(
            "complete"
            if gps_presence.coverage_ratio >= 0.8 and gps_presence.on_site_event_count > 0
            else "partial"
            if gps_presence.coverage_ratio > 0
            else "missing"
        ),
        messages=("relevant" if evidence.key_messages else "present" if shift.messages else "empty"),
    )

    confidence_suggestions = build_confidence_suggestions(
        confidence=confidence,
        flags=decision.flags,
        evidence=evidence,
        data_quality=data_quality,
        gps_coverage_ratio=gps_presence.coverage_ratio,
        secondary_site_visits_count=len(gps_presence.secondary_site_visits),
    )

    explanation, reasoning_steps = generate_explanation(
        shift=shift,
        evidence=evidence,
        confidence=confidence,
        flags=decision.flags,
        recommended_hours=hours_rounded,
        recommended_break_minutes=decision.break_minutes,
        break_policy_applied=break_policy_applied,
        facility_break_minutes=facility.break_minutes,
        worker_break_minutes=worker.break_minutes,
        settings=settings,
        cache=cache,
    )

    return ReconciliationResult(
        shift_id=facility.shift_id,
        worker_id=facility.worker_id,
        worker_name=facility.worker_name,
        recommendation=Recommendation(
            hours=hours_rounded,
            hourly_rate=float(hourly_rate),
            payout=payout,
            break_minutes=decision.break_minutes,
        ),
        confidence=confidence,
        explanation=explanation,
        evidence=evidence,
        flags=sorted(set(decision.flags)),
        confidence_suggestions=confidence_suggestions,
        data_quality=data_quality,
        reasoning_steps=reasoning_steps,
        meta={
            "rule_applied": decision.rule,
            "confidence_override_applied": confidence_override_applied,
            "break_policy_applied": break_policy_applied,
            "secondary_site_visits_count": len(gps_presence.secondary_site_visits),
            "gps_coverage_ratio": round(gps_presence.coverage_ratio, 3),
        },
    )
