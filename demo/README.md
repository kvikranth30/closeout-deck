# HyperTrack Closeout

AI-Powered Timesheet Reconciliation Demo

## Quick Start

1. **Start the server:**
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

2. **Open in browser:**
   ```
   http://localhost:8000
   ```

3. **Try it out:**
   - Drag and drop files from the `test-data/` folder
   - Click "Analyze & Reconcile"
   - See the AI-powered reconciliation results

## Test Data

Sample files are provided in `test-data/`:
- `mobile_clockin.csv` - Mobile app time records
- `supervisor_log.csv` - Manager confirmations
- `location_data.csv` - GPS/geofence data
- `worker_report.csv` - Employee self-reports

## Supported File Types

- Images: `.jpg`, `.png`, `.gif`, `.webp` (OCR via Claude)
- Documents: `.pdf` (OCR via Claude)
- Spreadsheets: `.xlsx`, `.xls` (parsed with SheetJS)
- CSV: `.csv` (parsed and sent to Claude)

## How It Works

1. Upload multiple time data sources
2. Claude AI analyzes and extracts time data from each source
3. Conflicts are reconciled using priority rules:
   - Location/GPS data (highest)
   - Supervisor confirmations
   - Customer system records
   - Mobile app data
   - Paper timesheets
   - Worker self-reports (lowest)
4. Results show source breakdown, reconciled timesheet, and data quality score

## Configuration

The API key is embedded in `index.html` for demo purposes. For production, use a backend proxy.

## Security Note

This demo makes direct browser-to-API calls. The API key is exposed in the browser. This is acceptable for local demos only.
