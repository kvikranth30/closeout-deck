# HyperTrack Closeout Prototype — Build Specification

## 🔑 API Configuration

```
ANTHROPIC_API_KEY=your_api_key_here
```

**Model to use:** `claude-sonnet-4-20250514` (or `claude-opus-4-20250514` if available)

---

## 📋 Executive Summary

Build a single-page web application that demonstrates HyperTrack's AI-powered timesheet reconciliation. The user drags in multiple time data sources (images of paper timesheets, Excel files, CSVs), and the app uses Claude to analyze, OCR, and reconcile them into a unified timesheet with a clear opinion on actual hours worked.

**The goal:** When demoing to potential customers, I drag in their messy data, and within seconds they see the magic — their chaotic time sources transformed into a validated, reconciled timesheet. This is the "aha moment" that closes deals.

---

## 🎯 Business Context (Important for Claude Code to understand)

### The Problem We Solve

Staffing companies receive time and attendance data from multiple sources:

1. **Customer Systems** — Paper clipboards photographed and uploaded, QR codes, hardware systems at facilities
2. **Mobile Clock-In** — Web or app-based time tracking from MSPs or the staffing company's own system
3. **Location Data** — GPS/geofence data showing where workers actually were
4. **Supervisor Confirmations** — Manager sign-offs, often via text or email
5. **Worker Self-Reports** — Direct submissions from workers

These arrive at different times, in different formats, with conflicting information. Someone has to figure out: **"What's the actual time worked for this shift?"** — because that determines both worker payout and customer billing.

### What This Prototype Demonstrates

1. **Drag in your messy data** — Any format: images, Excel, CSV
2. **AI analyzes everything** — OCR for images, parsing for spreadsheets, cross-referencing all sources
3. **See each source's version** — What each data source says about clock-in/clock-out
4. **Get the reconciled truth** — Claude's final computation with reasoning
5. **See your data quality score** — Which of the 5 recommended sources you used, and which are missing (nudging toward better data practices)

---

## 🏗️ Technical Architecture

### Stack

- **Frontend:** Single HTML file with embedded CSS and JavaScript (keep it simple for local hosting)
- **Backend:** None needed — all API calls go directly to Anthropic from the browser
- **AI Engine:** Claude API (claude-sonnet-4-20250514 or claude-opus-4-20250514)
- **File Handling:** Browser FileReader API for local file processing
- **Libraries:** 
  - SheetJS (xlsx) for Excel/CSV parsing — load from CDN
  - No framework needed — vanilla JS is fine

### Local Hosting

This will run locally via:
```bash
# Simple Python server
python -m http.server 8000

# Or Node
npx serve .
```

---

## 📱 UI Specification

### Layout (Single Page)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  HyperTrack Closeout                    [Clear All] button  ││
│  │  AI-Powered Timesheet Reconciliation                        ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  DROP ZONE (when no files uploaded)                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │     ┌──────────────────────────────────────────────┐        ││
│  │     │                                              │        ││
│  │     │      📄 Drop your time data here             │        ││
│  │     │                                              │        ││
│  │     │      Images, Excel, CSV — any format         │        ││
│  │     │                                              │        ││
│  │     │      [Or click to browse]                    │        ││
│  │     │                                              │        ││
│  │     └──────────────────────────────────────────────┘        ││
│  │                                                              ││
│  │     Supported: .jpg .png .pdf .xlsx .xls .csv                ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  UPLOADED FILES (appears after files added)                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Source Files (3)                         [+ Add More]      ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                     ││
│  │  │ 📷       │ │ 📊       │ │ 📄       │                     ││
│  │  │clipboard │ │ mobile   │ │ supervisor│                    ││
│  │  │ .jpg     │ │ .xlsx    │ │ .csv     │                     ││
│  │  │    ✕     │ │    ✕     │ │    ✕     │                     ││
│  │  └──────────┘ └──────────┘ └──────────┘                     ││
│  │                                                              ││
│  │            [🔍 Analyze & Reconcile]                          ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  RESULTS (appears after analysis)                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  DATA SOURCES ANALYZED                                       ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ Source              │ Worker    │ Clock In  │ Clock Out │││
│  │  ├─────────────────────┼───────────┼───────────┼───────────┤││
│  │  │ 📷 Paper Timesheet  │ John D.   │ 7:02 AM   │ 3:58 PM   │││
│  │  │ 📊 Mobile App       │ John D.   │ 7:15 AM   │ 4:02 PM   │││
│  │  │ 📄 Supervisor Log   │ John D.   │ 7:00 AM   │ 4:00 PM   │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  │  ════════════════════════════════════════════════════════   ││
│  │                                                              ││
│  │  ✅ RECONCILED TIMESHEET                                     ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │  Worker: John Doe                                       │││
│  │  │  Date: December 3, 2024                                 │││
│  │  │                                                         │││
│  │  │  Clock In:  7:02 AM                                     │││
│  │  │  Clock Out: 4:00 PM                                     │││
│  │  │  Total:     8 hours 58 minutes                          │││
│  │  │                                                         │││
│  │  │  💡 Reasoning:                                          │││
│  │  │  "Used paper timesheet for clock-in (earliest reliable  │││
│  │  │  timestamp with photo evidence). Used supervisor log    │││
│  │  │  for clock-out (manager confirmation is most            │││
│  │  │  authoritative). Mobile app showed 7:15 AM clock-in     │││
│  │  │  which may indicate delayed app launch, not actual      │││
│  │  │  arrival time."                                         │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  │  ════════════════════════════════════════════════════════   ││
│  │                                                              ││
│  │  📊 DATA QUALITY SCORE                                       ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │  You used 3 of 5 recommended data sources               │││
│  │  │                                                         │││
│  │  │  ✅ Customer System (paper timesheet)                   │││
│  │  │  ✅ Mobile Clock-In                                     │││
│  │  │  ◯ Location Data (not provided)                         │││
│  │  │  ✅ Supervisor Confirmation                             │││
│  │  │  ◯ Worker Self-Report (not provided)                    │││
│  │  │                                                         │││
│  │  │  ┌─────────────────────────────────────────┐            │││
│  │  │  │ ████████████████████░░░░░░░░  60%      │            │││
│  │  │  └─────────────────────────────────────────┘            │││
│  │  │                                                         │││
│  │  │  💡 Add location data for higher confidence             │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Visual Design Guidelines

- **Color Palette:**
  - Primary: `#0f2942` (deep navy)
  - Accent: `#00d4aa` (teal/green)
  - Background: `#ffffff` or `#f8fafc`
  - Text: `#1a1a2e` (near black)
  - Muted: `#64748b` (gray)
  - Error/Warning: `#ef4444` (red)
  - Success: `#22c55e` (green)

- **Typography:**
  - Headers: Georgia or system serif
  - Body: Arial or system sans-serif
  - Clean, professional, not playful

- **Drop Zone:**
  - Dashed border when empty
  - Solid border + highlight color when dragging over
  - Large, inviting, impossible to miss

- **Results Cards:**
  - Rounded corners (12px)
  - Subtle shadows
  - Clear visual hierarchy

---

## 🔧 Functional Specification

### File Upload Flow

1. User drags files onto drop zone (or clicks to browse)
2. Files are validated (type check)
3. Thumbnails/icons appear showing uploaded files
4. User can remove individual files with X button
5. User clicks "Analyze & Reconcile" button
6. Loading state appears
7. Results render below

### Supported File Types

| Type | Extensions | Processing |
|------|------------|------------|
| Images | .jpg, .jpeg, .png, .gif, .webp | Send as base64 to Claude for OCR |
| PDF | .pdf | Send as base64 to Claude for OCR |
| Excel | .xlsx, .xls | Parse with SheetJS, send text to Claude |
| CSV | .csv | Parse with SheetJS or native, send text to Claude |

### Claude API Integration

#### System Prompt

```
You are a timesheet reconciliation AI for HyperTrack Closeout. Your job is to analyze time and attendance data from multiple sources and produce a reconciled, validated timesheet.

TASK:
1. Extract worker identification from each source (name, ID, etc.)
2. Extract clock-in and clock-out times from each source
3. Identify the date of the shift
4. Note the source type for each data point
5. Reconcile conflicts between sources using these priorities:
   - Location/GPS data (highest reliability for presence)
   - Supervisor confirmations (authoritative)
   - Customer system records (hardware/official)
   - Mobile app clock-in/out
   - Paper timesheets (can have transcription delays)
   - Worker self-reports (lowest priority alone, good for corroboration)
6. Produce a final reconciled timesheet with reasoning
7. Classify which of these 5 data source types were present:
   - Customer System (paper, QR, hardware at facility)
   - Mobile Clock-In (app-based time tracking)
   - Location Data (GPS, geofence)
   - Supervisor Confirmation (manager sign-off)
   - Worker Self-Report (direct worker submission)

OUTPUT FORMAT (JSON):
{
  "sources": [
    {
      "source_name": "Paper Timesheet",
      "source_type": "customer_system",
      "worker_name": "John Doe",
      "worker_id": "EMP-123",
      "date": "2024-12-03",
      "clock_in": "07:02",
      "clock_out": "15:58",
      "notes": "Handwritten, photographed clipboard"
    }
  ],
  "reconciled": {
    "worker_name": "John Doe",
    "worker_id": "EMP-123",
    "date": "2024-12-03",
    "clock_in": "07:02",
    "clock_out": "16:00",
    "total_hours": 8.97,
    "total_formatted": "8 hours 58 minutes",
    "reasoning": "Used paper timesheet for clock-in (earliest reliable timestamp). Used supervisor log for clock-out (manager confirmation). Mobile app showed later clock-in which may indicate delayed app launch."
  },
  "data_sources_used": {
    "customer_system": true,
    "mobile_clock_in": true,
    "location_data": false,
    "supervisor_confirmation": true,
    "worker_self_report": false
  },
  "confidence_score": 0.6,
  "recommendation": "Add location data for higher confidence in worker presence verification."
}

If you cannot extract meaningful time data, explain why and what format would be helpful.
```

#### API Call Structure

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          // For images:
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64ImageData
            }
          },
          // For text/spreadsheet data:
          {
            type: 'text',
            text: 'Source: mobile_app.xlsx\n\n' + spreadsheetContent
          },
          // Final instruction:
          {
            type: 'text',
            text: 'Analyze these time sources and produce a reconciled timesheet in the specified JSON format.'
          }
        ]
      }
    ]
  })
});
```

### Error Handling

- **No files:** Disable analyze button, show helper text
- **Invalid file type:** Show error toast, don't add to queue
- **API error:** Show friendly error message with retry button
- **Can't parse data:** Claude should explain what went wrong in the response

---

## 🧪 Test Data Generation

Create these dummy files for testing:

### 1. Paper Timesheet Image (`paper_timesheet.jpg`)

Create an image that looks like a photographed clipboard with:
```
DAILY TIMESHEET
Facility: ABC Warehouse
Date: December 3, 2024

Employee: John Doe
Badge #: EMP-123

Clock In: 7:02 AM  [signature]
Clock Out: 3:58 PM [signature]

Supervisor: M. Smith
```

**For the prototype, create this as a simple image with text, or use a real photo of a handwritten timesheet.**

### 2. Mobile App Export (`mobile_clockin.xlsx`)

Excel file with columns:
```
| Employee ID | Employee Name | Date       | Clock In | Clock Out | Status   |
|-------------|---------------|------------|----------|-----------|----------|
| EMP-123     | John Doe      | 2024-12-03 | 7:15 AM  | 4:02 PM   | Complete |
| EMP-456     | Jane Smith    | 2024-12-03 | 6:58 AM  | 3:30 PM   | Complete |
```

### 3. Supervisor Confirmation (`supervisor_log.csv`)

CSV file:
```csv
date,employee_name,employee_id,confirmed_start,confirmed_end,supervisor,notes
2024-12-03,John Doe,EMP-123,07:00,16:00,M. Smith,Good shift - stayed a few minutes late
2024-12-03,Jane Smith,EMP-456,07:00,15:30,M. Smith,Left early - approved
```

### 4. Location Data Export (`location_data.csv`)

CSV file:
```csv
employee_id,employee_name,date,first_geofence_entry,last_geofence_exit,location_name
EMP-123,John Doe,2024-12-03,06:58:32,16:01:45,ABC Warehouse
EMP-456,Jane Smith,2024-12-03,06:55:12,15:32:08,ABC Warehouse
```

### 5. Worker Self-Report (`worker_report.csv`)

CSV file:
```csv
submission_date,employee_id,employee_name,shift_date,reported_start,reported_end,notes
2024-12-03,EMP-123,John Doe,2024-12-03,7:00 AM,4:00 PM,Regular shift
```

---

## 📁 File Structure

```
hypertrack-closeout-prototype/
├── index.html          # Main application (single file with embedded CSS/JS)
├── README.md           # Quick start instructions
├── test-data/          # Dummy data for demos
│   ├── paper_timesheet.jpg
│   ├── mobile_clockin.xlsx
│   ├── supervisor_log.csv
│   ├── location_data.csv
│   └── worker_report.csv
└── .env.example        # Example env file showing where to put API key
```

---

## 🚀 Implementation Checklist

### Phase 1: Basic Structure
- [ ] Create single HTML file with embedded styles
- [ ] Implement drop zone with drag-and-drop
- [ ] Add file type validation
- [ ] Show uploaded files with thumbnails/icons
- [ ] Add remove button for each file

### Phase 2: File Processing
- [ ] Read images as base64
- [ ] Parse Excel files with SheetJS
- [ ] Parse CSV files
- [ ] Combine all data for API call

### Phase 3: Claude Integration
- [ ] Set up API call with proper headers
- [ ] Send combined data to Claude
- [ ] Parse JSON response
- [ ] Handle errors gracefully

### Phase 4: Results Display
- [ ] Render source-by-source breakdown table
- [ ] Render reconciled timesheet card
- [ ] Render data quality score with progress bar
- [ ] Show used vs. missing data sources (checkmarks and hollow circles)
- [ ] Display recommendation for improvement

### Phase 5: Polish
- [ ] Loading states with spinner
- [ ] Smooth transitions/animations
- [ ] Mobile-friendly responsive design
- [ ] Clear all / reset functionality

---

## 💡 Key UX Principles

1. **Immediate clarity:** The moment results appear, the value should be obvious
2. **Show your work:** Display all sources so user sees the AI isn't making things up
3. **Confidence indicators:** The data quality score builds trust and nudges better practices
4. **Speed:** Keep it fast — this is a demo, every second counts
5. **Zero friction:** Drag, drop, done. No forms, no setup.

---

## 🎬 Demo Script

When showing this to customers:

1. "I'm going to show you HyperTrack Closeout in action."
2. "Give me your messiest timesheet data. An image of a paper clipboard, your mobile app export, whatever you've got."
3. *Drag files in*
4. "Watch this." *Click Analyze*
5. "See? Three different sources, three different times. Here's what each one says."
6. "And here's the reconciled truth — with reasoning you can audit."
7. "Notice this: you used 3 of 5 data sources. Add location tracking, and your confidence goes from 60% to 95%."
8. "That's HyperTrack Closeout. $1 per shift. Want to try it with your real data?"

---

## 🔐 Security Notes

- API key is exposed in browser (acceptable for local demos only)
- For production, use a backend proxy
- Never commit API key to git

---

## ❓ Questions for Claude Code

If anything is unclear, prioritize:
1. Getting the drag-drop and file reading working first
2. Then the Claude API integration
3. Then beautiful results rendering
4. Polish last

Let's iterate on UI once the core flow works.

---

*Document created: December 4, 2024*
*For: HyperTrack Closeout Prototype*
*Builder: Claude Code*
