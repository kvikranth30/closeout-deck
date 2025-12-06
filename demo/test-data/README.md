# Test Data

Sample files for testing the HyperTrack Closeout demo.

## Files

| File | Description | Source Type |
|------|-------------|-------------|
| `mobile_clockin.csv` | Mobile app time records | Mobile Clock-In |
| `supervisor_log.csv` | Manager-approved times | Supervisor Confirmation |
| `location_data.csv` | GPS geofence entry/exit | Location Data |
| `worker_report.csv` | Employee self-reported times | Worker Self-Report |
| `paper_timesheet.html` | Template to screenshot | Customer System |

## Test Scenarios

### Employee: John Doe (EMP-123)
- **Mobile App:** 7:15 AM - 4:02 PM
- **Supervisor:** 7:00 AM - 4:00 PM (confirmed)
- **Location:** 6:58 AM - 4:01 PM (geofence)
- **Self-Report:** 7:00 AM - 4:00 PM
- **Paper:** 7:02 AM - 3:58 PM

Expected reconciliation: Clock-in ~7:00 AM, Clock-out ~4:00 PM

### Employee: Jane Smith (EMP-456)
- Left early with pre-approval
- Expected: Approved early exit at 3:30 PM

### Employee: Robert Johnson (EMP-789)
- Late arrival due to traffic, made up time
- Expected: Adjusted schedule noted

### Employee: Maria Garcia (EMP-234)
- Shortened shift as scheduled
- Expected: Shorter hours confirmed

## Creating a Paper Timesheet Image

Open `paper_timesheet.html` in a browser and take a screenshot to create a test image file.
