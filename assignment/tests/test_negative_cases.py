from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

import pytest
from pydantic import ValidationError

from engine.cache import FileCache
from engine.config import get_settings
from engine.models import ShiftData
from engine.parsers import load_shift, parse_facility, parse_gps, parse_messages, parse_worker
from engine.reconcile import reconcile_shift


ROOT = Path(__file__).resolve().parents[1]


def _write(path: Path, content: str, encoding: str = "utf-8") -> None:
    path.write_text(content, encoding=encoding)


def test_malformed_csv_missing_required_column(tmp_path: Path) -> None:
    _write(
        tmp_path / "facility.csv",
        "shift_id,worker_id,worker_name,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes\n"
        "S1,W1,Alice,2026-01-01 07:00,2026-01-01 15:00,07:00,15:00,30\n",
    )
    with pytest.raises(ValueError, match="missing required columns"):
        parse_facility(tmp_path / "facility.csv")


def test_facility_clock_out_before_clock_in_non_overnight_raises(tmp_path: Path) -> None:
    _write(
        tmp_path / "facility.csv",
        "shift_id,worker_id,worker_name,position,hourly_rate,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes,notes\n"
        "S1,W1,Alice,Loader,21,2026-01-01 07:00,2026-01-01 15:00,15:00,07:00,30,\n",
    )
    with pytest.raises(ValueError, match="clock_out earlier than clock_in"):
        parse_facility(tmp_path / "facility.csv")


def test_worker_json_with_extra_fields_is_accepted(tmp_path: Path) -> None:
    payload = {
        "shift_id": "S1",
        "worker_id": "W1",
        "submitted_at": "2026-01-01T16:00:00",
        "clock_in": "2026-01-01T07:00:00",
        "clock_out": "2026-01-01T15:00:00",
        "break_minutes": 30,
        "notes": "ok",
        "unexpected": "ignored",
    }
    (tmp_path / "worker.json").write_text(json.dumps(payload), encoding="utf-8")
    worker = parse_worker(tmp_path / "worker.json")
    assert worker.shift_id == "S1"
    assert worker.worker_id == "W1"


def test_gps_zero_events_parses(tmp_path: Path) -> None:
    payload = {
        "shift_id": "S1",
        "worker_id": "W1",
        "facility_location": {"lat": 33.75, "lng": -84.38},
        "events": [],
        "signal_gaps": [],
    }
    (tmp_path / "gps.json").write_text(json.dumps(payload), encoding="utf-8")
    gps = parse_gps(tmp_path / "gps.json")
    assert gps.events == []


def test_messages_with_unrecognized_lines_do_not_crash(tmp_path: Path) -> None:
    _write(
        tmp_path / "messages.txt",
        "[2026-01-01 08:00] AGENT → WORKER: hello\n"
        "this line is malformed\n",
    )
    messages = parse_messages(tmp_path / "messages.txt")
    assert len(messages) == 2
    assert messages[1].sender == "SYSTEM"
    assert messages[1].content.startswith("UNPARSEABLE_MESSAGE_LINE")


def test_facility_latin1_encoding_fallback(tmp_path: Path) -> None:
    csv_text = (
        "shift_id,worker_id,worker_name,position,hourly_rate,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes,notes\n"
        "S1,W1,José Álvarez,Loader,21,2026-01-01 07:00,2026-01-01 15:00,07:00,15:00,30,\n"
    )
    (tmp_path / "facility.csv").write_bytes(csv_text.encode("latin-1"))
    facility = parse_facility(tmp_path / "facility.csv")
    assert facility.worker_name == "José Álvarez"


def test_empty_facility_csv_reports_no_data_rows(tmp_path: Path) -> None:
    _write(
        tmp_path / "facility.csv",
        "shift_id,worker_id,worker_name,position,hourly_rate,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes,notes\n",
    )
    with pytest.raises(ValueError, match="no data rows"):
        parse_facility(tmp_path / "facility.csv")


def test_worker_invalid_datetime_raises(tmp_path: Path) -> None:
    payload = {
        "shift_id": "S1",
        "worker_id": "W1",
        "submitted_at": "not-a-date",
        "clock_in": "2026-01-01T07:00:00",
        "clock_out": "2026-01-01T15:00:00",
        "break_minutes": 30,
    }
    parse_worker_path = tmp_path / "worker_invalid.json"
    parse_worker_path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValueError):
        parse_worker(parse_worker_path)


def test_gps_missing_timestamp_raises_validation_error(tmp_path: Path) -> None:
    payload = {
        "shift_id": "S1",
        "worker_id": "W1",
        "facility_location": {"lat": 33.75, "lng": -84.38},
        "events": [{"lat": 33.75, "lng": -84.38, "activity": "stationary"}],
        "signal_gaps": [],
    }
    (tmp_path / "gps.json").write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ValidationError):
        parse_gps(tmp_path / "gps.json")


def test_all_sources_null_or_empty_reconcile_without_crash(tmp_path: Path) -> None:
    shift_dir = tmp_path / "shift"
    shift_dir.mkdir()

    _write(
        shift_dir / "facility.csv",
        "shift_id,worker_id,worker_name,position,hourly_rate,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes,notes\n"
        "S1,W1,Alice,Loader,22,2026-01-01 07:00,2026-01-01 15:00,,,,\n",
    )
    (shift_dir / "worker.json").write_text(
        json.dumps(
            {
                "shift_id": "S1",
                "worker_id": "W1",
                "submitted_at": None,
                "clock_in": None,
                "clock_out": None,
                "break_minutes": None,
                "notes": None,
            }
        ),
        encoding="utf-8",
    )
    (shift_dir / "gps.json").write_text(
        json.dumps(
            {
                "shift_id": "S1",
                "worker_id": "W1",
                "facility_location": {"lat": 33.75, "lng": -84.38},
                "events": [],
                "signal_gaps": [],
            }
        ),
        encoding="utf-8",
    )
    _write(shift_dir / "messages.txt", "")

    settings = replace(get_settings(), openai_api_key=None, reasoning_steps_enabled=False)
    result = reconcile_shift(load_shift(shift_dir), settings=settings, cache=FileCache(settings.cache_dir))
    assert result.recommendation.hours == 0.0
    assert result.shift_id == "S1"
