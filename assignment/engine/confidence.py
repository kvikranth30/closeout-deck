from __future__ import annotations

from typing import Literal


ConfidenceLevel = Literal["high", "medium", "low"]


CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


def clamp_confidence(level: ConfidenceLevel, cap: ConfidenceLevel | None) -> ConfidenceLevel:
    if cap is None:
        return level
    return level if CONFIDENCE_RANK[level] <= CONFIDENCE_RANK[cap] else cap


def score_confidence(
    *,
    sources_agreement: str,
    gps_coverage_ratio: float,
    has_gps_confirmation: bool,
    has_major_conflict: bool,
    has_critical_conflict: bool,
    has_message_corroboration: bool,
    missing_sources: int,
    unresolved_policy_issue: bool,
) -> tuple[ConfidenceLevel, int]:
    score = 100

    if sources_agreement == "partial":
        score -= 12
    elif sources_agreement == "none":
        score -= 30

    if gps_coverage_ratio < 0.5:
        score -= 30
    elif gps_coverage_ratio < 0.8:
        score -= 12

    if not has_gps_confirmation:
        score -= 12

    if has_major_conflict:
        score -= 15
    if has_critical_conflict:
        score -= 20

    if has_message_corroboration:
        score += 8

    score -= min(30, missing_sources * 10)

    if unresolved_policy_issue:
        score -= 15

    score = max(0, min(100, score))

    if score >= 80:
        return "high", score
    if score >= 55:
        return "medium", score
    return "low", score
