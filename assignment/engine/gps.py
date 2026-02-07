from __future__ import annotations

import math
from datetime import datetime

from .models import GPSData, GPSPresenceSummary, Location


def distance_meters(loc1: Location, loc2: Location) -> float:
    meters_per_degree = 111_000
    lat_diff = loc2.lat - loc1.lat
    lng_diff = loc2.lng - loc1.lng
    return meters_per_degree * math.sqrt(lat_diff**2 + lng_diff**2)


def is_on_site(lat: float, lng: float, site: Location, radius: float = 100.0) -> bool:
    return distance_meters(Location(lat=lat, lng=lng), site) <= radius


def compute_presence(gps_data: GPSData, shift_start: datetime, shift_end: datetime, radius: float = 100.0) -> GPSPresenceSummary:
    on_site_events = [
        event
        for event in gps_data.events
        if shift_start <= event.timestamp <= shift_end and is_on_site(event.lat, event.lng, gps_data.facility_location, radius)
    ]

    signal_gap_minutes = 0.0
    for gap in gps_data.signal_gaps:
        gap_start = max(gap.start, shift_start)
        gap_end = min(gap.end, shift_end)
        if gap_end > gap_start:
            signal_gap_minutes += (gap_end - gap_start).total_seconds() / 60.0

    shift_minutes = max(1.0, (shift_end - shift_start).total_seconds() / 60.0)
    coverage_ratio = max(0.0, min(1.0, (shift_minutes - signal_gap_minutes) / shift_minutes))

    first_on_site = on_site_events[0].timestamp if on_site_events else None
    last_on_site = on_site_events[-1].timestamp if on_site_events else None
    gps_hours = None
    if first_on_site and last_on_site and last_on_site > first_on_site:
        gps_hours = (last_on_site - first_on_site).total_seconds() / 3600.0

    at_home_count = 0
    home_total = 0
    if gps_data.home_location is not None:
        for event in gps_data.events:
            if shift_start <= event.timestamp <= shift_end:
                home_total += 1
                if is_on_site(event.lat, event.lng, gps_data.home_location, radius=120.0):
                    at_home_count += 1

    at_home_during_shift = home_total > 0 and at_home_count / home_total >= 0.6 and len(on_site_events) == 0

    secondary_site_visits: list[str] = []
    if gps_data.secondary_site:
        sec = gps_data.secondary_site
        sec_loc = Location(lat=sec["lat"], lng=sec["lng"])
        for event in gps_data.events:
            if shift_start <= event.timestamp <= shift_end and is_on_site(event.lat, event.lng, sec_loc, radius):
                secondary_site_visits.append(event.timestamp.isoformat(timespec="minutes"))

    return GPSPresenceSummary(
        first_on_site=first_on_site,
        last_on_site=last_on_site,
        gps_hours=gps_hours,
        on_site_event_count=len(on_site_events),
        total_event_count=len([e for e in gps_data.events if shift_start <= e.timestamp <= shift_end]),
        coverage_ratio=coverage_ratio,
        signal_gap_minutes=signal_gap_minutes,
        at_home_during_shift=at_home_during_shift,
        secondary_site_visits=secondary_site_visits,
    )
