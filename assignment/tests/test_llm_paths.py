from __future__ import annotations

import json
import os
from dataclasses import replace
from pathlib import Path

import pytest

from engine.cache import FileCache
from engine.config import get_settings
from engine.explainer import generate_explanation
from engine.message_context import extract_message_context
from engine.models import Evidence
from engine.parsers import load_shift
from engine.reconcile import reconcile_shift


ROOT = Path(__file__).resolve().parents[1]


class _DummyOpenAI:
    def __init__(self, *args, **kwargs) -> None:
        pass


def _llm_settings(cache_dir: Path):
    return replace(
        get_settings(),
        openai_api_key="test-key",
        reasoning_steps_enabled=True,
        cache_dir=cache_dir,
    )


def test_message_context_llm_parse_and_cache(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    shift = load_shift(ROOT / "test_shifts/shift_001_overtime")
    settings = _llm_settings(tmp_path / "cache")
    cache = FileCache(settings.cache_dir)

    monkeypatch.setattr("engine.message_context.OpenAI", _DummyOpenAI)
    monkeypatch.setattr(
        "engine.message_context._llm_extract",
        lambda client, model, prompt: json.dumps(
            {
                "overtime_approved": True,
                "malfunction_reported": False,
                "no_show_outreach": False,
                "break_dispute": False,
                "emergency_exception": False,
                "key_messages": ["Supervisor explicitly approved OT"],
            }
        ),
    )

    ctx1 = extract_message_context(shift.messages, settings, cache)
    assert ctx1.overtime_approved is True
    assert any("approved" in msg.lower() for msg in ctx1.key_messages)

    def _should_not_run(*args, **kwargs):
        raise AssertionError("LLM extractor should not be called when cache is warm")

    monkeypatch.setattr("engine.message_context._llm_extract", _should_not_run)
    ctx2 = extract_message_context(shift.messages, settings, cache)
    assert ctx2.overtime_approved is True


def test_message_context_llm_invalid_json_falls_back(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    shift = load_shift(ROOT / "test_shifts/shift_001_overtime")
    settings = _llm_settings(tmp_path / "cache")
    cache = FileCache(settings.cache_dir)

    monkeypatch.setattr("engine.message_context.OpenAI", _DummyOpenAI)
    monkeypatch.setattr("engine.message_context._llm_extract", lambda client, model, prompt: "not-json")

    ctx = extract_message_context(shift.messages, settings, cache)
    assert ctx.overtime_approved is True
    assert len(ctx.key_messages) > 0


def test_explainer_llm_parse_and_cache(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    shift = load_shift(ROOT / "test_shifts/shift_001_overtime")
    settings = _llm_settings(tmp_path / "cache")
    cache = FileCache(settings.cache_dir)

    monkeypatch.setattr("engine.explainer.OpenAI", _DummyOpenAI)
    monkeypatch.setattr(
        "engine.explainer._llm_explain",
        lambda client, model, prompt: json.dumps(
            {
                "explanation": "Mock LLM explanation.",
                "reasoning_steps": ["step one", "step two"],
            }
        ),
    )

    explanation, steps = generate_explanation(
        shift=shift,
        evidence=Evidence(
            facility_hours=7.47,
            worker_hours=10.22,
            gps_hours=10.67,
            sources_agreement="none",
            gps_on_site_confirmed=True,
            overtime_approved=True,
            key_messages=["OT approved at 13:30"],
        ),
        confidence="high",
        flags=[],
        recommended_hours=10.2,
        recommended_break_minutes=30,
        break_policy_applied="worker_submission",
        facility_break_minutes=30,
        worker_break_minutes=30,
        settings=settings,
        cache=cache,
    )
    assert explanation == "Mock LLM explanation."
    assert steps == ["step one", "step two"]

    def _should_not_run(*args, **kwargs):
        raise AssertionError("LLM explainer should not be called when cache is warm")

    monkeypatch.setattr("engine.explainer._llm_explain", _should_not_run)
    explanation2, steps2 = generate_explanation(
        shift=shift,
        evidence=Evidence(
            facility_hours=7.47,
            worker_hours=10.22,
            gps_hours=10.67,
            sources_agreement="none",
            gps_on_site_confirmed=True,
            overtime_approved=True,
            key_messages=["OT approved at 13:30"],
        ),
        confidence="high",
        flags=[],
        recommended_hours=10.2,
        recommended_break_minutes=30,
        break_policy_applied="worker_submission",
        facility_break_minutes=30,
        worker_break_minutes=30,
        settings=settings,
        cache=cache,
    )
    assert explanation2 == explanation
    assert steps2 == steps


def test_explainer_llm_invalid_json_falls_back(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    shift = load_shift(ROOT / "test_shifts/shift_005_break_dispute")
    settings = _llm_settings(tmp_path / "cache")
    cache = FileCache(settings.cache_dir)

    monkeypatch.setattr("engine.explainer.OpenAI", _DummyOpenAI)
    monkeypatch.setattr("engine.explainer._llm_explain", lambda client, model, prompt: "{bad json")

    explanation, steps = generate_explanation(
        shift=shift,
        evidence=Evidence(
            facility_hours=7.07,
            worker_hours=7.57,
            gps_hours=8.0,
            sources_agreement="partial",
            gps_on_site_confirmed=True,
            overtime_approved=False,
            key_messages=["worker says break was interrupted"],
        ),
        confidence="low",
        flags=["Requires human review - break dispute unresolved"],
        recommended_hours=7.5,
        recommended_break_minutes=30,
        break_policy_applied="worker_favor",
        facility_break_minutes=60,
        worker_break_minutes=30,
        settings=settings,
        cache=cache,
    )
    assert "Break dispute resolved using worker_favor policy" in explanation
    assert isinstance(steps, list)
    assert any("deterministically" in step.lower() for step in steps)


@pytest.mark.integration
def test_llm_integration_smoke_shift001(tmp_path: Path) -> None:
    if os.getenv("RUN_LLM_INTEGRATION") != "1":
        pytest.skip("Set RUN_LLM_INTEGRATION=1 to run real OpenAI integration test")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")

    settings = replace(
        get_settings(),
        openai_api_key=api_key,
        reasoning_steps_enabled=False,
        cache_dir=tmp_path / "cache",
    )
    cache = FileCache(settings.cache_dir)
    shift = load_shift(ROOT / "test_shifts/shift_001_overtime")
    result = reconcile_shift(shift, settings=settings, cache=cache)
    assert result.explanation.strip()
