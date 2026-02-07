from __future__ import annotations

from pathlib import Path

from engine.parsers import load_shift, parse_messages


ROOT = Path(__file__).resolve().parents[1]


def test_facility_time_only_parsing() -> None:
    shift = load_shift(ROOT / "test_shifts/shift_001_overtime")
    assert shift.facility.clock_in is not None
    assert shift.facility.clock_out is not None
    assert shift.facility.clock_in.hour == 6
    assert shift.facility.clock_out.hour == 14


def test_worker_null_handling_no_show() -> None:
    shift = load_shift(ROOT / "test_shifts/shift_002_noshow")
    assert shift.worker.clock_in is None
    assert shift.worker.clock_out is None
    assert shift.worker.submitted_at is None


def test_message_parser_arrow_and_system_formats() -> None:
    messages = parse_messages(ROOT / "test_shifts/shift_003_gps_gap/messages.txt")
    assert len(messages) == 2
    assert messages[0].sender == "SYSTEM"
    assert "GPS signal lost" in messages[0].content
