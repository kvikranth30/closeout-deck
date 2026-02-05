# X-Ray Schema Reference

This document describes the data model used in the Closeout Copilot X-Ray interface, for reference.

## Core Entities

### Engagement

An engagement represents a worker's assignment to a shift at a facility.

```typescript
interface Engagement {
  id: string;
  shift_id: string;
  worker: Worker;
  facility: Facility;
  position: string;

  scheduled: {
    start: DateTime;
    end: DateTime;
    break_minutes: number;
  };

  sources: {
    facility: FacilityTimesheet | null;
    worker: WorkerSubmission | null;
    gps: GPSData | null;
    messages: Message[];
  };

  reconciliation: Reconciliation | null;
  status: 'pending' | 'reconciled' | 'approved' | 'disputed';
}
```

### Worker

```typescript
interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  home_location?: { lat: number; lng: number };
}
```

### Facility

```typescript
interface Facility {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  geofence_radius_meters: number;
}
```

## Time Data Sources

### FacilityTimesheet

Data from customer time clock systems.

```typescript
interface FacilityTimesheet {
  source: 'facility';
  clock_in: DateTime | null;
  clock_out: DateTime | null;
  break_minutes: number;
  notes: string;
  recorded_by: 'hardware' | 'manual' | 'qr_code';
}
```

### WorkerSubmission

Data from worker app submissions.

```typescript
interface WorkerSubmission {
  source: 'worker';
  submitted_at: DateTime;
  clock_in: DateTime;
  clock_out: DateTime;
  break_minutes: number;
  notes: string;
}
```

### GPSData

Location tracking data.

```typescript
interface GPSData {
  source: 'gps';
  events: GPSEvent[];
  signal_gaps: SignalGap[];
  coverage_percent: number;
}

interface GPSEvent {
  timestamp: DateTime;
  location: { lat: number; lng: number };
  activity: 'stationary' | 'walking' | 'driving' | 'unknown';
  accuracy_meters: number;
}

interface SignalGap {
  start: DateTime;
  end: DateTime;
  reason: 'signal_lost' | 'battery_dead' | 'permission_revoked' | 'unknown';
}
```

### Message

Communication records.

```typescript
interface Message {
  timestamp: DateTime;
  from: MessageParty;
  to: MessageParty;
  content: string;
  channel: 'sms' | 'app' | 'email';
}

type MessageParty =
  | { type: 'worker'; id: string }
  | { type: 'supervisor'; name: string }
  | { type: 'agent'; id: string }
  | { type: 'system' };
```

## Reconciliation Output

### Reconciliation

The AI-generated recommendation.

```typescript
interface Reconciliation {
  recommended_hours: number;
  hourly_rate: number;
  payout: number;
  break_minutes: number;

  confidence: 'high' | 'medium' | 'low';
  confidence_factors: ConfidenceFactor[];

  explanation: string;
  evidence: Evidence;

  flags: Flag[];

  generated_at: DateTime;
  model_version: string;
}

interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative';
  description: string;
}

interface Evidence {
  facility_hours: number | null;
  worker_hours: number | null;
  gps_hours: number | null;

  sources_agreement: 'full' | 'partial' | 'none';
  gps_on_site_confirmed: boolean;
  overtime_approved: boolean | null;

  key_messages: string[];
  key_gps_events: string[];
}

interface Flag {
  type: 'requires_review' | 'data_quality' | 'policy_exception';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggested_action?: string;
}
```

## Utility Types

```typescript
type DateTime = string; // ISO 8601 format: "2026-01-15T06:02:00"

interface Location {
  lat: number;  // Latitude in decimal degrees
  lng: number;  // Longitude in decimal degrees
}
```

## Distance Calculation

To determine if a GPS event is "on-site":

```typescript
function isOnSite(event: GPSEvent, facility: Facility): boolean {
  const distance = haversineDistance(
    event.location,
    facility.location
  );
  return distance <= facility.geofence_radius_meters;
}

// Simple approximation for short distances
function approximateDistance(loc1: Location, loc2: Location): number {
  const metersPerDegree = 111_000;
  const latDiff = loc2.lat - loc1.lat;
  const lngDiff = loc2.lng - loc1.lng;
  return metersPerDegree * Math.sqrt(latDiff ** 2 + lngDiff ** 2);
}
```

Default geofence radius is 100 meters if not specified.
