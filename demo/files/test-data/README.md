# Test Data for HyperTrack Closeout Prototype

This folder contains sample data files for testing the timesheet reconciliation demo.

## Files Included

### 1. `mobile_clockin.csv`
Simulates export from a mobile time-tracking app. Contains clock-in/clock-out times captured via smartphone app.

### 2. `supervisor_log.csv`
Simulates supervisor confirmation records. Manager-approved start and end times.

### 3. `location_data.csv`
Simulates GPS/geofence data. Shows when workers entered and exited the job site geofence.

### 4. `worker_report.csv`
Simulates worker self-reported times submitted at end of shift.

### 5. `paper_timesheet_template.html`
**Open this in a browser and screenshot it** to create a test image file (`paper_timesheet.png`). This simulates a photographed paper timesheet from a clipboard at a facility.

## Test Scenarios

### Scenario 1: John Doe - Conflicting Times
- **Paper timesheet:** 7:02 AM - 3:58 PM
- **Mobile app:** 7:15 AM - 4:02 PM  
- **Supervisor log:** 7:00 AM - 4:00 PM
- **Location data:** 6:58 AM - 4:01 PM

This tests the AI's ability to reconcile conflicting timestamps and explain its reasoning.

### Scenario 2: Jane Smith - Early Exit
- Approved early departure
- Tests handling of partial shifts with supervisor approval

### Scenario 3: Robert Johnson - Late Arrival
- Arrived late, stayed late to compensate
- Tests handling of schedule variations

## How to Use

1. Drag any combination of these files into the prototype
2. Click "Analyze & Reconcile"
3. See how the AI handles different source combinations

## Creating the Paper Timesheet Image

1. Open `paper_timesheet_template.html` in Chrome/Firefox
2. Take a screenshot (or use browser's "Save as image" feature)
3. Save as `paper_timesheet.png` or `.jpg`
4. Use this image in your demos

## Mixing and Matching

Try these combinations to see different data quality scores:

| Files Used | Data Sources | Quality Score |
|------------|--------------|---------------|
| Paper only | 1/5 | 20% |
| Paper + Mobile | 2/5 | 40% |
| Paper + Mobile + Supervisor | 3/5 | 60% |
| Paper + Mobile + Supervisor + Location | 4/5 | 80% |
| All five sources | 5/5 | 100% |
