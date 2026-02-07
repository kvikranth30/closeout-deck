from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from engine.cache import FileCache
from engine.config import get_settings
from engine.parsers import load_shift
from engine.reconcile import reconcile_shift


ROOT = Path(__file__).resolve().parents[1]


def _settings_no_llm():
    settings = get_settings()
    return replace(settings, openai_api_key=None, reasoning_steps_enabled=False)


def _reconcile(folder: str):
    settings = _settings_no_llm()
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / f"test_shifts/{folder}")
    return reconcile_shift(shift, settings=settings, cache=cache)


def test_shift_001_overtime_high_confidence() -> None:
    result = _reconcile("shift_001_overtime")
    assert result.confidence == "high"
    assert result.recommendation.hours >= 10.0
    assert result.evidence.overtime_approved is True


def test_shift_002_noshow_zero_hours() -> None:
    result = _reconcile("shift_002_noshow")
    assert result.recommendation.hours == 0.0
    assert result.confidence == "high"


def test_shift_003_gps_gap_has_signal_gap_quality() -> None:
    result = _reconcile("shift_003_gps_gap")
    assert result.recommendation.hours > 0
    assert result.data_quality.gps_coverage in {"partial", "complete"}


def test_shift_004_malfunction_flagged() -> None:
    result = _reconcile("shift_004_conflicting")
    assert any("malfunction" in flag.lower() for flag in result.flags)
    assert result.recommendation.hours >= 7.0


def test_shift_005_break_dispute_low_confidence() -> None:
    result = _reconcile("shift_005_break_dispute")
    assert result.recommendation.break_minutes == 30
    assert result.confidence == "low"
    assert any("break dispute" in flag.lower() for flag in result.flags)
    assert result.meta and result.meta.get("break_policy_applied") == "worker_favor"
    assert any("supervisor confirmation" in suggestion.lower() for suggestion in result.confidence_suggestions)


def test_shift_005_break_dispute_midpoint_policy() -> None:
    settings = replace(_settings_no_llm(), break_dispute_policy="midpoint")
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / "test_shifts/shift_005_break_dispute")
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert result.recommendation.break_minutes == 45
    assert result.meta and result.meta.get("break_policy_applied") == "midpoint"


def test_generated_worker_no_submit_conflict_flagged() -> None:
    settings = _settings_no_llm()
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / "generated_shifts/shift_015_worker_no_submit")
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert result.confidence == "low"
    assert any("missing worker submission" in flag.lower() for flag in result.flags)


def test_generated_large_facility_worker_spread_flagged() -> None:
    settings = _settings_no_llm()
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / "generated_shifts/shift_008_double_shift")
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert any("significantly differs from facility" in flag.lower() for flag in result.flags)


def test_generated_injury_incident_has_emergency_flag() -> None:
    settings = _settings_no_llm()
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / "generated_shifts/shift_013_injury_incident")
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert any("emergency/incident" in flag.lower() for flag in result.flags)


def test_generated_multi_site_context_is_used() -> None:
    settings = _settings_no_llm()
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / "generated_shifts/shift_017_multi_site_day")
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert "secondary_site_context" in (result.meta or {}).get("rule_applied", "")
    assert (result.meta or {}).get("secondary_site_visits_count", 0) > 0
    assert any("secondary site" in flag.lower() for flag in result.flags)
    assert any("dispatch/work-order" in suggestion.lower() for suggestion in result.confidence_suggestions)


def test_no_show_without_outreach_is_not_high_confidence() -> None:
    settings = _settings_no_llm()
    cache = FileCache(settings.cache_dir)
    base_shift = load_shift(ROOT / "test_shifts/shift_002_noshow")
    shift = base_shift.model_copy(update={"messages": []})
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert result.confidence != "high"
    assert any("outreach not documented" in flag.lower() for flag in result.flags)
    assert any("outreach evidence" in suggestion.lower() for suggestion in result.confidence_suggestions)
