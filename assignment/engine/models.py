from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Location(BaseModel):
    lat: float
    lng: float


class FacilityData(BaseModel):
    shift_id: str
    worker_id: str
    worker_name: str
    position: str | None = None
    hourly_rate: float | None = None
    scheduled_start: datetime
    scheduled_end: datetime
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    break_minutes: int | None = None
    notes: str | None = None


class WorkerData(BaseModel):
    shift_id: str
    worker_id: str
    submitted_at: datetime | None = None
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    break_minutes: int | None = None
    notes: str | None = None


class GPSEvent(BaseModel):
    timestamp: datetime
    lat: float
    lng: float
    activity: str = "unknown"


class SignalGap(BaseModel):
    start: datetime
    end: datetime
    reason: str = "unknown"


class GPSData(BaseModel):
    shift_id: str
    worker_id: str
    facility_location: Location
    home_location: Location | None = None
    secondary_site: dict | None = None
    events: list[GPSEvent] = Field(default_factory=list)
    signal_gaps: list[SignalGap] = Field(default_factory=list)


class Message(BaseModel):
    timestamp: datetime
    sender: str
    recipient: str | None = None
    content: str


class ShiftData(BaseModel):
    folder_name: str
    facility: FacilityData
    worker: WorkerData
    gps: GPSData
    messages: list[Message] = Field(default_factory=list)


class Recommendation(BaseModel):
    hours: float
    hourly_rate: float
    payout: float
    break_minutes: int


class Evidence(BaseModel):
    facility_hours: float | None = None
    worker_hours: float | None = None
    gps_hours: float | None = None
    sources_agreement: Literal["full", "partial", "none"]
    gps_on_site_confirmed: bool
    overtime_approved: bool | None = None
    key_messages: list[str] = Field(default_factory=list)


class DataQuality(BaseModel):
    facility_data: Literal["complete", "partial", "missing"]
    worker_submission: Literal["complete", "partial", "missing"]
    gps_coverage: Literal["complete", "partial", "missing"]
    messages: Literal["relevant", "present", "empty"]


class ReconciliationResult(BaseModel):
    shift_id: str
    worker_id: str
    worker_name: str
    recommendation: Recommendation
    confidence: Literal["high", "medium", "low"]
    explanation: str
    evidence: Evidence
    flags: list[str] = Field(default_factory=list)
    confidence_suggestions: list[str] = Field(default_factory=list)
    data_quality: DataQuality
    reasoning_steps: list[str] | None = None
    meta: dict | None = None


class GPSPresenceSummary(BaseModel):
    first_on_site: datetime | None = None
    last_on_site: datetime | None = None
    gps_hours: float | None = None
    on_site_event_count: int = 0
    total_event_count: int = 0
    coverage_ratio: float = 0.0
    signal_gap_minutes: float = 0.0
    at_home_during_shift: bool = False
    secondary_site_visits: list[str] = Field(default_factory=list)


class MessageContext(BaseModel):
    overtime_approved: bool = False
    malfunction_reported: bool = False
    no_show_outreach: bool = False
    break_dispute: bool = False
    emergency_exception: bool = False
    key_messages: list[str] = Field(default_factory=list)
