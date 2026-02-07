from __future__ import annotations

import argparse
import csv
import json
import os
import random
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from openai import OpenAI


@dataclass
class Scenario:
    slug: str
    title: str
    expected_conflict: str
    facility_start_delta_min: int
    facility_end_delta_min: int
    worker_start_delta_min: int | None
    worker_end_delta_min: int | None
    facility_break: int | None
    worker_break: int | None
    notes: str
    worker_notes: str
    message_lines: list[str]
    gps_mode: str


BASE_SCENARIOS = [
    Scenario("early_departure", "Early Departure", "facility_worker_dispute", 0, -90, 0, -10, 30, 30, "Left early", "Supervisor released early", ["[2026-02-01 13:20] SUPERVISOR → WORKER: We can wrap up early today.", "[2026-02-01 13:21] WORKER → SUPERVISOR: Copy, finishing final tasks now."], "onsite_short"),
    Scenario("late_arrival_traffic", "Late Arrival Traffic", "late_arrival", 20, 0, 15, 0, 30, 30, "Late clock-in", "Traffic due to highway accident", ["[2026-02-02 06:15] WORKER → AGENT: Running 15-20 minutes late due to accident.", "[2026-02-02 06:16] AGENT → WORKER: Noted, please check in when you arrive."], "onsite"),
    Scenario("double_shift", "Double Shift", "overtime_policy", 0, 180, 0, 180, 30, 30, "Extended for second shift", "Covered second line", ["[2026-02-03 13:40] SUPERVISOR → WORKER: Can you stay for the next shift?", "[2026-02-03 13:42] WORKER → SUPERVISOR: Yes, I can stay."], "onsite_long"),
    Scenario("split_shift", "Split Shift", "split_shift", 0, 0, 0, 0, 60, 45, "Split shift policy", "Had 45 minute break", ["[2026-02-04 10:00] SUPERVISOR → WORKER: Take lunch now and return at 10:45.", "[2026-02-04 10:46] WORKER → SUPERVISOR: Back on floor."], "onsite"),
    Scenario("equipment_failure", "Equipment Failure", "clock_malfunction", 0, -120, 0, 0, 30, 30, "Tablet malfunctioned", "Worked full shift", ["[2026-02-05 13:00] FACILITY_SYSTEM: Clock out recorded for worker", "[2026-02-05 13:05] WORKER → AGENT: Tablet clocked me out but I am still working."], "onsite"),
    Scenario("weather_closure", "Weather Closure", "weather_exception", 0, -180, 0, -180, 30, 30, "Site closed due to storm", "Sent home early due to weather", ["[2026-02-06 11:10] SUPERVISOR → WORKER: Severe storm warning, site closing at noon.", "[2026-02-06 11:11] WORKER → SUPERVISOR: Understood, wrapping up."], "onsite_short"),
    Scenario("training_day", "Training Day", "training_time", 30, 0, 0, 0, 30, 30, "Clock starts after training", "Training began before shift", ["[2026-02-07 06:20] AGENT → WORKER: Training starts at 6:30 and is paid.", "[2026-02-07 06:21] WORKER → AGENT: Got it."], "onsite"),
    Scenario("injury_incident", "Injury Incident", "injury_policy", 0, -240, 0, -240, 30, 30, "Worker left after injury", "Minor injury reported", ["[2026-02-08 10:30] WORKER → AGENT: I hurt my wrist and supervisor sent me home.", "[2026-02-08 10:32] AGENT → WORKER: Please seek medical care and file an incident report."], "onsite_short"),
    Scenario("gps_battery_dead", "GPS Battery Dead", "gps_gap", 0, 0, 0, 0, 30, 30, "No anomalies", "Phone battery died mid-shift", ["[2026-02-09 09:15] SYSTEM: GPS signal lost - battery_dead", "[2026-02-09 14:05] SYSTEM: GPS signal restored"], "battery_gap"),
    Scenario("worker_no_submit", "Worker No Submit", "missing_worker_submission", 0, 0, None, None, 30, None, "Facility complete", "", ["[2026-02-10 15:30] AGENT → WORKER: Please submit your timesheet.", "[2026-02-10 18:00] AGENT → WORKER: Reminder: missing timesheet for today's shift."], "onsite"),
    Scenario("unapproved_ot", "Unapproved Overtime", "overtime_unapproved", 0, 0, 0, 120, 30, 30, "Facility capped at scheduled", "Stayed late to finish task", ["[2026-02-11 15:05] WORKER → AGENT: Stayed 2 hours late to finish loading.", "[2026-02-11 15:12] AGENT → WORKER: I don't yet see OT approval from supervisor."], "onsite_long"),
    Scenario("multi_site_day", "Multi-site Day", "secondary_site", 0, -45, 0, 0, 30, 30, "Early clock out", "Worked at south site midday", ["[2026-02-12 10:55] SUPERVISOR → WORKER: Please run inventory at south site.", "[2026-02-12 12:05] WORKER → SUPERVISOR: Done at south site, returning now."], "multisite"),
    Scenario("short_break_dispute", "Short Break Dispute", "break_dispute", 0, 0, 0, 0, 60, 30, "Standard 60-minute lunch", "Only took 30 while working", ["[2026-02-13 11:50] SUPERVISOR → WORKER: Don't forget lunch.", "[2026-02-13 14:40] WORKER → AGENT: Didn't get full lunch today, kept working."], "onsite"),
    Scenario("night_shift_crossover", "Night Shift Crossover", "cross_midnight", 0, 0, 0, 0, 30, 30, "Overnight shift", "Overnight event", ["[2026-02-14 23:00] AGENT → WORKER: Confirming overnight shift through 6am.", "[2026-02-15 06:05] WORKER → AGENT: Shift complete."], "overnight"),
    Scenario("rounding_dispute", "Rounding Dispute", "rounding", 3, -2, 0, 0, 30, 30, "Clock rounds to nearest 15", "Reported exact minutes", ["[2026-02-15 14:10] WORKER → AGENT: Time clock rounded my times.", "[2026-02-15 14:12] AGENT → WORKER: We'll review against GPS."], "onsite"),
    Scenario("tip_bonus", "Tip/Bonus", "bonus_adjustment", 0, 0, 0, 0, 30, 30, "Bonus to be added separately", "Client approved performance bonus", ["[2026-02-16 15:05] SUPERVISOR → AGENT: Please add $40 bonus for excellent performance.", "[2026-02-16 15:08] AGENT → WORKER: Bonus approved and noted."], "onsite"),
    Scenario("orientation", "Orientation Partial Day", "orientation_time", 60, 0, 30, 0, 30, 30, "Clock starts after orientation", "Orientation started at 6:30", ["[2026-02-17 06:10] AGENT → WORKER: Orientation begins at 6:30 and is paid.", "[2026-02-17 06:11] WORKER → AGENT: Thanks for confirming."], "onsite"),
    Scenario("emergency_evacuation", "Emergency Evacuation", "policy_exception", 0, -210, 0, -210, 30, 30, "Fire alarm evacuation", "Evacuated and shift cancelled", ["[2026-02-18 09:40] SYSTEM: Facility emergency evacuation in progress.", "[2026-02-18 09:45] SUPERVISOR → WORKER: Shift cancelled, evacuate now."], "onsite_short"),
    Scenario("facility_time_dispute", "Worker Disputes Facility Time", "facility_worker_dispute", 0, -120, 0, 0, 30, 30, "Facility shows early departure", "Worked full shift", ["[2026-02-19 13:55] WORKER → AGENT: Facility clock shows early out but I am still on floor.", "[2026-02-19 14:00] AGENT → WORKER: Keep working, we'll reconcile with GPS."], "onsite"),
    Scenario("supervisor_late_entry", "Supervisor Late Entry", "late_manual_entry", 0, -60, 0, 0, 30, 30, "Supervisor entered time next day", "Worked full shift", ["[2026-02-20 16:05] SUPERVISOR → AGENT: I entered times late after system outage.", "[2026-02-20 16:06] AGENT → SUPERVISOR: Received, we'll reconcile with worker/GPS."], "onsite"),
]

WORKER_PROFILES = [
    {"name": "Priya Sharma", "position": "Inventory Clerk", "base_rate": 20.5},
    {"name": "Miguel Santos", "position": "Forklift Operator", "base_rate": 24.0},
    {"name": "Jasmine Lee", "position": "Picker/Packer", "base_rate": 19.0},
    {"name": "Robert Nguyen", "position": "Material Handler", "base_rate": 22.0},
    {"name": "Alicia Gomez", "position": "Warehouse Associate", "base_rate": 18.5},
    {"name": "Darnell Brooks", "position": "Shipping Associate", "base_rate": 21.0},
    {"name": "Hannah Patel", "position": "Receiving Clerk", "base_rate": 20.0},
    {"name": "Brandon Kim", "position": "Team Lead", "base_rate": 26.0},
    {"name": "Elena Rivera", "position": "Quality Inspector", "base_rate": 23.0},
    {"name": "Tyrone Davis", "position": "Dock Coordinator", "base_rate": 22.5},
]

FACILITY_POOL = [
    {"name": "Apex Distribution - North", "lat": 33.7490, "lng": -84.3880},
    {"name": "Midtown Fulfillment Hub", "lat": 33.7821, "lng": -84.3948},
    {"name": "Riverbend Logistics", "lat": 33.7082, "lng": -84.4281},
    {"name": "Peachtree Cold Storage", "lat": 33.7623, "lng": -84.3579},
    {"name": "South Metro Crossdock", "lat": 33.6418, "lng": -84.4459},
    {"name": "Oakland Industrial Park", "lat": 33.7351, "lng": -84.3202},
]

SHIFT_PATTERNS = [
    (5, 30, 8),   # 5:30am-1:30pm
    (6, 0, 8),    # 6:00am-2:00pm
    (7, 0, 8),    # 7:00am-3:00pm
    (8, 30, 8),   # 8:30am-4:30pm
    (9, 0, 8),    # 9:00am-5:00pm
    (10, 0, 8),   # 10:00am-6:00pm
]

DATE_POOL = [
    datetime(2026, 1, 7),
    datetime(2026, 1, 14),
    datetime(2026, 1, 29),
    datetime(2026, 2, 3),
    datetime(2026, 2, 11),
    datetime(2026, 2, 18),
    datetime(2026, 3, 2),
    datetime(2026, 3, 9),
    datetime(2026, 3, 21),
    datetime(2026, 4, 1),
    datetime(2026, 4, 7),
    datetime(2026, 4, 20),
    datetime(2026, 5, 4),
    datetime(2026, 5, 12),
    datetime(2026, 5, 27),
    datetime(2026, 6, 3),
    datetime(2026, 6, 11),
    datetime(2026, 6, 24),
    datetime(2026, 7, 6),
    datetime(2026, 7, 15),
]


def _format_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M")


def _format_time(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


DATE_PREFIX_RE = re.compile(r"^\[(\d{4}-\d{2}-\d{2}) ")


def _render_messages_for_date(lines: list[str], day: datetime) -> list[str]:
    day_str = day.strftime("%Y-%m-%d")
    rendered: list[str] = []
    for line in lines:
        m = DATE_PREFIX_RE.match(line)
        if not m:
            rendered.append(line)
            continue
        rendered.append(line.replace(m.group(1), day_str, 1))
    return rendered


def _message_variation(lines: list[str], idx: int, day: datetime) -> list[str]:
    rng = random.Random(700 + idx)
    varied: list[str] = []
    for line in lines:
        text = line
        if idx % 2 == 0:
            text = text.replace("Please", "Pls").replace("please", "pls").replace("you", "u")
        if idx % 3 == 0:
            text = text.replace("I am", "I'm").replace("do not", "don't")
        if rng.random() < 0.25:
            text = text.replace("today", "tdy").replace("Thanks", "Thx")
        if rng.random() < 0.2:
            text = text.replace("supervisor", "sup").replace("Supervisor", "Sup")
        if rng.random() < 0.2:
            text = text.replace("running", "runnin").replace("because", "bc").replace("please", "pls")
        if rng.random() < 0.15:
            text = text.replace(".", "").replace("'", "")
        varied.append(text)

    # Add an extra realistic follow-up on some scenarios.
    if idx % 4 == 0:
        day_str = day.strftime("%Y-%m-%d")
        varied.append(f"[{day_str} 15:22] AGENT → WORKER: thx for the update, logging this for payroll review.")

    return varied


def _jitter_minutes(base: datetime, rng: random.Random, low: int = -6, high: int = 7) -> datetime:
    return base + timedelta(minutes=rng.randint(low, high))


def _jitter_coord(value: float, rng: random.Random, spread: float = 0.00035) -> float:
    return round(value + rng.uniform(-spread, spread), 6)


def _terse_note(text: str, rng: random.Random) -> str:
    if rng.random() < 0.5:
        return text
    replacements = {
        "Worker left after injury": "left early - inj",
        "Tablet malfunctioned": "tablet issue, bad clockout",
        "Site closed due to storm": "storm close, sent home",
        "Standard 60-minute lunch": "std 60 lunch",
        "Facility shows early departure": "facility early out",
        "Supervisor entered time next day": "manual entry next day",
    }
    return replacements.get(text, text.lower())


def _llm_generate_messages(
    *,
    client: OpenAI,
    model: str,
    scenario: Scenario,
    day: datetime,
    shift_id: str,
) -> list[str] | None:
    day_str = day.strftime("%Y-%m-%d")
    prompt = (
        "Generate 3 realistic staffing-shift messages in this exact format:\n"
        "[YYYY-MM-DD HH:MM] SENDER → RECIPIENT: content\n"
        "Valid senders/recipients: WORKER, SUPERVISOR, AGENT, SYSTEM, FACILITY_SYSTEM.\n"
        "Return plain text lines only (no markdown).\n"
        f"Date: {day_str}\nShift ID: {shift_id}\nScenario: {scenario.title}\n"
        f"Context: {scenario.worker_notes or scenario.notes}\n"
    )
    response = client.responses.create(model=model, input=prompt)
    text = (getattr(response, "output_text", "") or "").strip()
    if not text:
        return None
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None
    if not all(line.startswith("[") and ":" in line for line in lines):
        return None
    return lines[:5]


def _gps_events(
    mode: str,
    start: datetime,
    end: datetime,
    facility_lat: float,
    facility_lng: float,
    rng: random.Random,
) -> tuple[list[dict], list[dict], dict | None]:
    events: list[dict] = []
    gaps: list[dict] = []
    secondary_site = None

    def add(ts: datetime, lat: float, lng: float, activity: str) -> None:
        events.append({"timestamp": _iso(ts), "lat": round(lat, 6), "lng": round(lng, 6), "activity": activity})

    if mode == "overnight":
        add(start - timedelta(minutes=rng.randint(10, 18)), facility_lat + 0.002, facility_lng + 0.002, "driving")
        cursor = start
        while cursor <= end:
            activity = "walking" if rng.random() < 0.2 else "stationary"
            add(cursor, _jitter_coord(facility_lat, rng), _jitter_coord(facility_lng, rng), activity)
            cursor += timedelta(minutes=rng.randint(7, 14))
        add(end + timedelta(minutes=rng.randint(4, 9)), facility_lat + 0.002, facility_lng + 0.002, "driving")
        return events, gaps, secondary_site

    if mode == "battery_gap":
        add(start - timedelta(minutes=rng.randint(6, 12)), facility_lat + 0.0018, facility_lng + 0.0018, "driving")
        cursor = start
        gap_start = start + timedelta(hours=2, minutes=rng.randint(-8, 8))
        gap_end = end - timedelta(hours=1, minutes=rng.randint(-8, 8))
        while cursor < gap_start:
            add(cursor, _jitter_coord(facility_lat, rng), _jitter_coord(facility_lng, rng), "stationary")
            cursor += timedelta(minutes=rng.randint(5, 11))
        gaps.append({"start": _iso(gap_start), "end": _iso(gap_end), "reason": "battery_dead"})
        cursor = gap_end
        while cursor <= end:
            activity = "walking" if rng.random() < 0.15 else "stationary"
            add(cursor, _jitter_coord(facility_lat, rng), _jitter_coord(facility_lng, rng), activity)
            cursor += timedelta(minutes=rng.randint(5, 12))
        add(end + timedelta(minutes=rng.randint(4, 9)), facility_lat + 0.002, facility_lng + 0.002, "driving")
        return events, gaps, secondary_site

    if mode == "multisite":
        secondary_site = {"lat": round(facility_lat + 0.01, 6), "lng": round(facility_lng - 0.01, 6), "name": "Secondary Site"}
        add(start - timedelta(minutes=rng.randint(7, 13)), facility_lat + 0.0018, facility_lng + 0.0018, "driving")
        depart_for_secondary = start + timedelta(hours=2, minutes=rng.randint(35, 55))
        return_from_secondary = depart_for_secondary + timedelta(minutes=rng.randint(45, 70))

        cursor = start
        while cursor < depart_for_secondary:
            add(cursor, _jitter_coord(facility_lat, rng), _jitter_coord(facility_lng, rng), "stationary")
            cursor += timedelta(minutes=rng.randint(6, 12))

        add(depart_for_secondary, facility_lat + 0.0025, facility_lng - 0.0025, "driving")
        cursor = depart_for_secondary + timedelta(minutes=rng.randint(10, 16))
        while cursor < return_from_secondary:
            add(cursor, _jitter_coord(secondary_site["lat"], rng), _jitter_coord(secondary_site["lng"], rng), "stationary")
            cursor += timedelta(minutes=rng.randint(5, 11))

        add(return_from_secondary, facility_lat + 0.0018, facility_lng - 0.0012, "driving")
        cursor = return_from_secondary + timedelta(minutes=rng.randint(10, 16))
        while cursor <= end:
            add(cursor, _jitter_coord(facility_lat, rng), _jitter_coord(facility_lng, rng), "stationary")
            cursor += timedelta(minutes=rng.randint(6, 12))
        add(end + timedelta(minutes=rng.randint(5, 10)), facility_lat + 0.0018, facility_lng + 0.0018, "driving")
        return events, gaps, secondary_site

    if mode == "onsite_long":
        end = end + timedelta(hours=2)

    if mode == "onsite_short":
        end = end - timedelta(hours=2)

    add(start - timedelta(minutes=rng.randint(7, 13)), facility_lat + 0.0018, facility_lng + 0.0018, "driving")
    cursor = start
    while cursor <= end:
        activity = "walking" if rng.random() < 0.18 else "stationary"
        add(cursor, _jitter_coord(facility_lat, rng), _jitter_coord(facility_lng, rng), activity)
        cursor += timedelta(minutes=rng.randint(5, 11))
    add(end + timedelta(minutes=rng.randint(4, 9)), facility_lat + 0.0018, facility_lng + 0.0018, "driving")

    return events, gaps, secondary_site


def generate_dataset(output_dir: Path, count: int, use_llm: bool = False) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    client: OpenAI | None = None
    model = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    if use_llm and os.getenv("OPENAI_API_KEY"):
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    scenarios = BASE_SCENARIOS[:count]
    manifest_entries: list[dict] = []

    for idx, scenario in enumerate(scenarios, start=6):
        day = DATE_POOL[(idx - 6) % len(DATE_POOL)]
        rng = random.Random(2026 + idx)
        start_hour, start_minute, duration_hours = SHIFT_PATTERNS[rng.randrange(len(SHIFT_PATTERNS))]
        start = day.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
        end = start + timedelta(hours=duration_hours)

        if scenario.slug == "night_shift_crossover":
            start = day.replace(hour=22, minute=0, second=0, microsecond=0)
            end = (day + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)

        shift_id = f"SHF-{8800 + idx:04d}{chr(65 + (idx % 26))}"
        worker_id = f"W-{5000 + idx}"
        worker_profile = WORKER_PROFILES[rng.randrange(len(WORKER_PROFILES))]
        worker_name = worker_profile["name"]
        position = worker_profile["position"]
        hourly_rate = worker_profile["base_rate"] + ((idx % 3) * 0.5)
        facility_profile = FACILITY_POOL[rng.randrange(len(FACILITY_POOL))]

        folder_name = f"shift_{idx:03d}_{scenario.slug}"
        folder = output_dir / folder_name
        folder.mkdir(parents=True, exist_ok=True)

        facility_clock_in = _jitter_minutes(start + timedelta(minutes=scenario.facility_start_delta_min), rng)
        facility_clock_out = _jitter_minutes(end + timedelta(minutes=scenario.facility_end_delta_min), rng)

        worker_clock_in = None if scenario.worker_start_delta_min is None else _jitter_minutes(start + timedelta(minutes=scenario.worker_start_delta_min), rng, low=-4, high=5)
        worker_clock_out = None if scenario.worker_end_delta_min is None else _jitter_minutes(end + timedelta(minutes=scenario.worker_end_delta_min), rng, low=-5, high=6)

        if worker_clock_in and worker_clock_out and worker_clock_out <= worker_clock_in:
            worker_clock_out = worker_clock_in + timedelta(hours=6, minutes=rng.randint(20, 95))
        if facility_clock_out <= facility_clock_in:
            facility_clock_out = facility_clock_in + timedelta(hours=6, minutes=rng.randint(15, 100))

        facility_rows = [
            {
                "shift_id": shift_id,
                "worker_id": worker_id,
                "worker_name": worker_name,
                "position": position,
                "hourly_rate": f"{hourly_rate:.2f}",
                "scheduled_start": _format_dt(start),
                "scheduled_end": _format_dt(end),
                "clock_in": "" if scenario.worker_start_delta_min is None and scenario.facility_start_delta_min == 0 and scenario.slug == "worker_no_submit" else _format_time(facility_clock_in),
                "clock_out": "" if scenario.worker_end_delta_min is None and scenario.facility_end_delta_min == 0 and scenario.slug == "worker_no_submit" else _format_time(facility_clock_out),
                "break_minutes": "" if scenario.facility_break is None else str(scenario.facility_break),
                "notes": f"{_terse_note(scenario.notes, rng)} ({facility_profile['name']})",
            }
        ]

        if scenario.slug == "worker_no_submit":
            facility_rows[0]["clock_in"] = _format_time(start)
            facility_rows[0]["clock_out"] = _format_time(end)

        if scenario.slug == "double_shift":
            facility_rows[0]["scheduled_end"] = _format_dt(end)
            facility_rows[0]["clock_out"] = _format_time(end)

        with (folder / "facility.csv").open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "shift_id",
                    "worker_id",
                    "worker_name",
                    "position",
                    "hourly_rate",
                    "scheduled_start",
                    "scheduled_end",
                    "clock_in",
                    "clock_out",
                    "break_minutes",
                    "notes",
                ],
            )
            writer.writeheader()
            writer.writerows(facility_rows)

        worker_payload = {
            "shift_id": shift_id,
            "worker_id": worker_id,
            "submitted_at": None if worker_clock_in is None else _iso(end + timedelta(minutes=30)),
            "clock_in": None if worker_clock_in is None else _iso(worker_clock_in),
            "clock_out": None if worker_clock_out is None else _iso(worker_clock_out),
            "break_minutes": scenario.worker_break,
            "notes": scenario.worker_notes,
        }

        if scenario.slug == "worker_no_submit":
            worker_payload.update(
                {
                    "submitted_at": None,
                    "clock_in": None,
                    "clock_out": None,
                    "break_minutes": None,
                    "notes": None,
                }
            )

        (folder / "worker.json").write_text(json.dumps(worker_payload, indent=2) + "\n", encoding="utf-8")

        facility_lat = facility_profile["lat"] + ((idx % 4) - 1.5) * 0.0007
        facility_lng = facility_profile["lng"] + ((idx % 5) - 2.0) * 0.0006
        events, gaps, secondary_site = _gps_events(scenario.gps_mode, start, end, facility_lat, facility_lng, rng)

        gps_payload = {
            "shift_id": shift_id,
            "worker_id": worker_id,
            "facility_location": {"lat": round(facility_lat, 6), "lng": round(facility_lng, 6)},
            "events": events,
            "signal_gaps": gaps,
        }

        if scenario.slug in {"worker_no_submit"}:
            gps_payload["home_location"] = {"lat": round(facility_lat + 0.06, 6), "lng": round(facility_lng - 0.03, 6)}

        if secondary_site is not None:
            gps_payload["secondary_site"] = secondary_site

        if scenario.slug == "worker_no_submit":
            home = gps_payload["home_location"]
            gps_payload["events"] = [
                {"timestamp": _iso(start - timedelta(hours=1)), "lat": home["lat"], "lng": home["lng"], "activity": "stationary"},
                {"timestamp": _iso(start), "lat": home["lat"], "lng": home["lng"], "activity": "stationary"},
                {"timestamp": _iso(start + timedelta(hours=1)), "lat": home["lat"], "lng": home["lng"], "activity": "stationary"},
            ]

        (folder / "gps.json").write_text(json.dumps(gps_payload, indent=2) + "\n", encoding="utf-8")

        lines = _message_variation(_render_messages_for_date(scenario.message_lines, day), idx, day)
        if client is not None:
            llm_lines = _llm_generate_messages(client=client, model=model, scenario=scenario, day=day, shift_id=shift_id)
            if llm_lines:
                lines = llm_lines
        (folder / "messages.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

        manifest_entries.append(
            {
                "folder": folder_name,
                "shift_id": shift_id,
                "scenario": scenario.slug,
                "title": scenario.title,
                "expected_conflict": scenario.expected_conflict,
            }
        )

    manifest = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "count": len(manifest_entries), "scenarios": manifest_entries}
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic timesheet scenarios")
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--out", type=Path, default=Path("generated_shifts"))
    parser.add_argument("--use-llm", action="store_true", help="Use OpenAI to generate message lines when OPENAI_API_KEY is set")
    args = parser.parse_args()

    manifest = generate_dataset(args.out, args.count, use_llm=args.use_llm)
    print(f"Generated {manifest['count']} scenarios in {args.out}")


if __name__ == "__main__":
    main()
