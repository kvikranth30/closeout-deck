# Data Schema Reference

## Input Formats

Your engine will receive data in multiple formats. Here's what to expect:

---

## Facility Data (`facility.csv`)

CSV export from customer time clock systems.

```csv
shift_id,worker_id,worker_name,position,hourly_rate,scheduled_start,scheduled_end,clock_in,clock_out,break_minutes,notes
SHF-7829A,W-4521,Marcus Chen,Forklift Operator,25.00,2026-01-15 06:00,2026-01-15 14:00,06:02,14:00,30,
```

| Field | Type | Description |
|-------|------|-------------|
| `shift_id` | string | Unique identifier for the shift |
| `worker_id` | string | Worker identifier |
| `worker_name` | string | Worker's full name |
| `position` | string | Job role/title |
| `hourly_rate` | float | Pay rate for this shift (varies by position) |
| `scheduled_start` | datetime | When shift was supposed to start |
| `scheduled_end` | datetime | When shift was supposed to end |
| `clock_in` | time | Actual clock-in time (may be time only, not full datetime) |
| `clock_out` | time | Actual clock-out time (may be empty for no-shows) |
| `break_minutes` | integer | Total break time in minutes |
| `notes` | string | Facility notes/comments |

**Watch out for:**
- Time-only values (assumes same date as scheduled)
- Empty clock times for no-shows
- Notes field contains important context

---

## Worker Submission (`worker.json`)

JSON from worker mobile app submissions.

```json
{
  "shift_id": "SHF-7829A",
  "worker_id": "W-4521",
  "submitted_at": "2026-01-15T17:00:00",
  "clock_in": "2026-01-15T06:02:00",
  "clock_out": "2026-01-15T16:45:00",
  "break_minutes": 30,
  "notes": "Stayed late to finish unloading truck per manager request"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `shift_id` | string | Unique identifier for the shift |
| `worker_id` | string | Worker identifier |
| `submitted_at` | datetime | When worker submitted their timesheet (null if never submitted) |
| `clock_in` | datetime | Worker-reported start time |
| `clock_out` | datetime | Worker-reported end time |
| `break_minutes` | integer | Worker-reported break time |
| `notes` | string | Worker's notes/comments |

**Watch out for:**
- `null` values for no-shows or non-submissions
- `submitted_at` can be much later than shift end
- Notes often contain important context

---

## GPS Events (`gps.json`)

Location tracking data from worker's device.

```json
{
  "shift_id": "SHF-7829A",
  "worker_id": "W-4521",
  "facility_location": { "lat": 33.7490, "lng": -84.3880 },
  "events": [
    {
      "timestamp": "2026-01-15T05:58:00",
      "lat": 33.7491,
      "lng": -84.3882,
      "activity": "stationary"
    }
  ],
  "signal_gaps": [
    {
      "start": "2026-01-17T09:00:00",
      "end": "2026-01-17T11:30:00",
      "reason": "signal_lost"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `shift_id` | string | Unique identifier for the shift |
| `worker_id` | string | Worker identifier |
| `facility_location` | object | Expected work location `{lat, lng}` |
| `home_location` | object | (Optional) Worker's home `{lat, lng}` |
| `secondary_site` | object | (Optional) Other valid work location `{lat, lng, name}` |
| `events` | array | List of GPS events |
| `events[].timestamp` | datetime | When location was recorded |
| `events[].lat` | float | Latitude |
| `events[].lng` | float | Longitude |
| `events[].activity` | string | Detected activity: `stationary`, `walking`, `driving` |
| `signal_gaps` | array | (Optional) Periods where GPS was unavailable |

**Watch out for:**
- Events may not be continuous (gaps in data)
- `signal_gaps` explains missing data
- Compare event locations to `facility_location` to determine on-site presence
- Activity type can indicate travel vs work

---

## Messages (`messages.txt`)

Plain text log of communications.

```
[2026-01-15 13:30] SUPERVISOR → WORKER: Hey Marcus, can you stay late?
[2026-01-15 13:32] WORKER → SUPERVISOR: Yeah no problem
[2026-01-15 16:40] WORKER → SUPERVISOR: All done, heading out
```

Format: `[YYYY-MM-DD HH:MM] SENDER → RECIPIENT: Message content`

Sender/recipient types:
- `WORKER` — The worker on this shift
- `SUPERVISOR` — On-site manager at facility
- `AGENT` — Staffing company coordinator
- `SYSTEM` — Automated system messages

**Watch out for:**
- Messages contain crucial context (OT approval, explanations, issues)
- Timestamps help correlate with GPS and clock events
- May be empty if no relevant communication

---

## Expected Output Format

Your engine should produce JSON in this format:

```json
{
  "shift_id": "SHF-7829A",
  "worker_id": "W-4521",
  "worker_name": "Marcus Chen",

  "recommendation": {
    "hours": 10.2,
    "hourly_rate": 22.00,
    "payout": 224.40,
    "break_minutes": 30
  },

  "confidence": "high",

  "explanation": "GPS confirms worker was on-site from 06:02 until 16:42 (10h 40m). After deducting 30-minute break, recommended hours are 10.17 (rounded to 10.2). Although facility clock shows 14:00 departure, messages at 13:30 show supervisor explicitly approved overtime ('can you stay until the truck is fully unloaded? I'll approve the OT'). Worker confirmed at 13:32. GPS corroborates extended presence.",

  "evidence": {
    "facility_hours": 7.5,
    "worker_hours": 10.2,
    "gps_hours": 10.67,
    "sources_agreement": "partial",
    "gps_on_site_confirmed": true,
    "overtime_approved": true
  },

  "flags": [],

  "data_quality": {
    "facility_data": "complete",
    "worker_submission": "complete",
    "gps_coverage": "complete",
    "messages": "relevant"
  }
}
```

### Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `shift_id` | string | Shift identifier |
| `worker_id` | string | Worker identifier |
| `worker_name` | string | Worker name |
| `recommendation.hours` | float | Recommended billable hours |
| `recommendation.hourly_rate` | float | Pay rate (use $22/hr default if not specified) |
| `recommendation.payout` | float | Total payout amount |
| `recommendation.break_minutes` | integer | Break time deducted |
| `confidence` | string | `"high"`, `"medium"`, or `"low"` |
| `explanation` | string | Human-readable reasoning citing evidence |
| `evidence` | object | Supporting data points |
| `flags` | array | Issues requiring human review |
| `data_quality` | object | Assessment of input data completeness |

### Confidence Levels

- **High**: Sources agree OR GPS strongly confirms one source, clear evidence
- **Medium**: Minor conflicts resolved with reasonable assumptions, some uncertainty
- **Low**: Major conflicts, missing data, requires human judgment

### Flags

Common flags to include when relevant:
- `"Requires human review - [reason]"`
- `"Missing GPS data for [time period]"`
- `"Overtime not explicitly approved"`
- `"Worker submission significantly differs from facility"`
- `"Potential time clock malfunction"`

---

## Geolocation Notes

To determine if a GPS event is "on-site":
- Calculate distance from event coordinates to `facility_location`
- Consider within ~100 meters as "on-site" (accounts for GPS drift, parking lots, etc.)
- Events at `secondary_site` or `home_location` have special meaning

Simple distance formula (for short distances, approximation is fine):
```
distance_meters ≈ 111,000 * sqrt((lat2-lat1)² + (lng2-lng1)²)
```

---

## Hourly Rate

The `hourly_rate` field in facility.csv specifies the pay rate for each shift. Rates vary by position (e.g., Forklift Operators earn more than general Warehouse Associates).

If `hourly_rate` is missing, use **$22.00/hour** as the default.
