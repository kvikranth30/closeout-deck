from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timedelta
from pathlib import Path

from .models import FacilityData, GPSData, Message, ShiftData, WorkerData


MESSAGE_ARROW_RE = re.compile(r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s+(.+?)\s+→\s+(.+?):\s*(.*)$")
MESSAGE_SYSTEM_RE = re.compile(r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s+(.+?):\s*(.*)$")
REQUIRED_FACILITY_COLUMNS = {
    "shift_id",
    "worker_id",
    "worker_name",
    "hourly_rate",
    "scheduled_start",
    "scheduled_end",
    "clock_in",
    "clock_out",
    "break_minutes",
}


def parse_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    raw = value.strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return datetime.fromisoformat(raw)


def _read_text(path: str | Path) -> str:
    data = Path(path).read_bytes()
    for encoding in ("utf-8", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Could not decode file: {path}")


def parse_facility(path: str | Path) -> FacilityData:
    text = _read_text(path)
    reader = csv.DictReader(text.splitlines())
    columns = set(reader.fieldnames or [])
    missing = sorted(REQUIRED_FACILITY_COLUMNS - columns)
    if missing:
        raise ValueError(f"facility.csv missing required columns: {', '.join(missing)}")
    try:
        row = next(reader)
    except StopIteration as exc:
        raise ValueError("facility.csv has no data rows") from exc

    scheduled_start = parse_datetime(row.get("scheduled_start"))
    scheduled_end = parse_datetime(row.get("scheduled_end"))
    if scheduled_start is None or scheduled_end is None:
        raise ValueError("facility.csv missing scheduled_start/scheduled_end")

    def parse_clock_time(key: str) -> datetime | None:
        value = (row.get(key) or "").strip()
        if not value:
            return None
        parsed = parse_datetime(value)
        if parsed is None:
            return None
        if parsed.year == 1900:
            parsed = scheduled_start.replace(hour=parsed.hour, minute=parsed.minute, second=0, microsecond=0)
        return parsed

    clock_in = parse_clock_time("clock_in")
    clock_out = parse_clock_time("clock_out")
    if clock_in and clock_out and clock_out <= clock_in:
        if scheduled_end.date() > scheduled_start.date():
            # Handle overnight shifts where exported times are HH:MM without date.
            clock_out = clock_out + timedelta(days=1)
        else:
            raise ValueError("facility.csv has clock_out earlier than clock_in for non-overnight shift")

    break_minutes = row.get("break_minutes")
    hourly_rate_raw = (row.get("hourly_rate") or "").strip()
    hourly_rate = None
    if hourly_rate_raw:
        try:
            hourly_rate = float(hourly_rate_raw)
        except ValueError as exc:
            raise ValueError(f"Invalid hourly_rate in facility.csv: {hourly_rate_raw}") from exc

    parsed_break = None
    if (break_minutes or "").strip():
        try:
            parsed_break = int(break_minutes)
        except ValueError as exc:
            raise ValueError(f"Invalid break_minutes in facility.csv: {break_minutes}") from exc

    return FacilityData(
        shift_id=(row.get("shift_id") or "").strip(),
        worker_id=(row.get("worker_id") or "").strip(),
        worker_name=(row.get("worker_name") or "").strip(),
        position=(row.get("position") or "").strip() or None,
        hourly_rate=hourly_rate,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        clock_in=clock_in,
        clock_out=clock_out,
        break_minutes=parsed_break,
        notes=(row.get("notes") or "").strip() or None,
    )


def parse_worker(path: str | Path) -> WorkerData:
    payload = json.loads(_read_text(path))
    return WorkerData(
        shift_id=payload["shift_id"],
        worker_id=payload["worker_id"],
        submitted_at=parse_datetime(payload.get("submitted_at")),
        clock_in=parse_datetime(payload.get("clock_in")),
        clock_out=parse_datetime(payload.get("clock_out")),
        break_minutes=payload.get("break_minutes"),
        notes=payload.get("notes"),
    )


def parse_gps(path: str | Path) -> GPSData:
    payload = json.loads(_read_text(path))
    gps = GPSData.model_validate(payload)
    gps.events = sorted(gps.events, key=lambda event: event.timestamp)
    return gps


def parse_messages(path: str | Path) -> list[Message]:
    lines = _read_text(path).splitlines()
    messages: list[Message] = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        m = MESSAGE_ARROW_RE.match(line)
        if m:
            ts, sender, recipient, content = m.groups()
            messages.append(
                Message(timestamp=datetime.strptime(ts, "%Y-%m-%d %H:%M"), sender=sender.strip(), recipient=recipient.strip(), content=content.strip())
            )
            continue
        m2 = MESSAGE_SYSTEM_RE.match(line)
        if m2:
            ts, sender, content = m2.groups()
            messages.append(
                Message(timestamp=datetime.strptime(ts, "%Y-%m-%d %H:%M"), sender=sender.strip(), recipient=None, content=content.strip())
            )
            continue
        messages.append(
            Message(
                timestamp=datetime(1970, 1, 1, 0, 0),
                sender="SYSTEM",
                recipient=None,
                content=f"UNPARSEABLE_MESSAGE_LINE: {line}",
            )
        )
    return messages


def load_shift(shift_dir: str | Path) -> ShiftData:
    shift_path = Path(shift_dir)
    facility = parse_facility(shift_path / "facility.csv")
    worker = parse_worker(shift_path / "worker.json")
    gps = parse_gps(shift_path / "gps.json")
    messages = parse_messages(shift_path / "messages.txt")
    return ShiftData(folder_name=shift_path.name, facility=facility, worker=worker, gps=gps, messages=messages)


def load_all_shifts(base_dir: str | Path) -> list[ShiftData]:
    base_path = Path(base_dir)
    shifts: list[ShiftData] = []
    for child in sorted(base_path.iterdir()):
        if not child.is_dir():
            continue
        required = [child / "facility.csv", child / "worker.json", child / "gps.json", child / "messages.txt"]
        if all(path.exists() for path in required):
            shifts.append(load_shift(child))
    return shifts
