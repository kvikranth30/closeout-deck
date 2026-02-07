from __future__ import annotations

from .models import DataQuality, Evidence


def build_confidence_suggestions(
    *,
    confidence: str,
    flags: list[str],
    evidence: Evidence,
    data_quality: DataQuality,
    gps_coverage_ratio: float,
    secondary_site_visits_count: int,
) -> list[str]:
    suggestions: list[str] = []
    flags_lower = " | ".join(flag.lower() for flag in flags)

    def add(text: str) -> None:
        if text not in suggestions:
            suggestions.append(text)

    if confidence == "high" and not flags:
        return suggestions

    if data_quality.gps_coverage in {"partial", "missing"} or gps_coverage_ratio < 0.8:
        add("Collect denser GPS telemetry (higher ping frequency) and device battery/permission diagnostics for this shift window.")

    if "break dispute" in flags_lower:
        add("Obtain supervisor confirmation of actual break duration and whether lunch was interrupted by work.")
        add("Attach facility policy text for working lunches and meal-break exceptions.")
        add("Pull task activity logs (scanner/workstation events) during the disputed break window.")

    if "overtime not explicitly approved" in flags_lower:
        add("Capture explicit supervisor OT approval (message, ticket, or signed adjustment) tied to timestamps.")

    if "secondary site" in flags_lower or secondary_site_visits_count > 0:
        add("Provide dispatch/work-order proof for secondary-site assignment and expected travel window.")

    if "no-show outreach not documented" in flags_lower:
        add("Add outreach evidence (call/SMS attempts and response timestamps) before final no-show adjudication.")

    if "emergency/incident" in flags_lower:
        add("Attach incident report and supervisor statement to validate emergency exception handling.")

    if "significantly differs from facility" in flags_lower:
        add("Review facility clock audit trail plus access-control/camera records for arrival and departure verification.")

    if "missing worker submission" in flags_lower:
        add("Request worker attestation or correction submission for clock-in/out and break details.")

    if not evidence.key_messages:
        add("Collect additional message context (agent/supervisor confirmations) to corroborate exceptions and approvals.")

    return suggestions[:6]
