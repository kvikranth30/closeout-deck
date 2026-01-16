# Google Sheets Skill

## Purpose
Manage the **Closeout Copilot - Customer Discovery** spreadsheet for onboarding new customers. This sheet captures all the data points needed to integrate a staffing company with HyperTrack Closeout Copilot.

---

## Spreadsheet Details

| Field | Value |
|-------|-------|
| **Title** | Closeout Copilot - Customer Discovery |
| **URL** | https://docs.google.com/spreadsheets/d/1WtffwGtcCD6pedCbQgjVbMLsbNM6QHTz_XZMaRZj9so |
| **Spreadsheet ID** | `1WtffwGtcCD6pedCbQgjVbMLsbNM6QHTz_XZMaRZj9so` |
| **Drive Folder** | https://drive.google.com/drive/folders/14Wlt-v6p3w_EaP7FKn8qY4h2996HdFIy |
| **Folder ID** | `14Wlt-v6p3w_EaP7FKn8qY4h2996HdFIy` |

---

## MCP Configuration

### Server
- **MCP Name:** `google-sheets`
- **Package:** `mcp-google-sheets@latest` (via uvx)
- **GitHub:** https://github.com/xing5/mcp-google-sheets

### Authentication
- **Method:** Service Account
- **Key File:** `/Users/vibes/Downloads/mcp-sheets-484518-112bf7a9d074.json`
- **Google Cloud Project ID:** `190001638171`

### Required Google APIs (must be enabled)
1. Google Sheets API
2. Google Drive API

### MCP Config (in ~/.claude.json)
```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "uvx",
      "args": ["mcp-google-sheets@latest"],
      "env": {
        "SERVICE_ACCOUNT_PATH": "/Users/vibes/Downloads/mcp-sheets-484518-112bf7a9d074.json",
        "DRIVE_FOLDER_ID": "14Wlt-v6p3w_EaP7FKn8qY4h2996HdFIy"
      }
    }
  }
}
```

---

## Sheet Structure

The spreadsheet has **6 tabs**:

| Tab | Sheet ID | Purpose |
|-----|----------|---------|
| **Orders-Shifts** | - | Job/worker data: names, IDs, phone, facility, addresses, scheduled times, pay/bill rates |
| **T&A Sources** | - | Time & Attendance sources: customer systems (paper, QR, badge), time tracking (mobile, web), location intelligence (GPS, geofence) |
| **Payouts-Billing** | - | Payout systems (Branch, DailyPay, etc.), billing systems (QuickBooks, Bullhorn, etc.) |
| **Pain Points-Volume** | - | Current pain points, shift volume, worker count, customer sites |
| **Communications** | `1537953650` | How they talk to workers, customers, and internal ops; channels, systems, API access |
| **Reconciliation Rules** | `732722130` | Business rules: global, customer-specific, facility-specific; where rules live; exception handling |

---

## Design Language

### Section Headers (Green)
- **Background:** RGB(0.13, 0.77, 0.37) = #22c55e (HyperTrack green)
- **Text:** White, Bold

### Column Headers (Gray)
- **Background:** RGB(0.95, 0.95, 0.95) = light gray
- **Text:** Black, Bold

### Column Widths (typical)
- Column A (Data Point/Question): 280px
- Column B (Value/Where): 150-200px
- Column C (Format/Access): 150-180px
- Column D (Notes): 120-150px

### Structure Pattern
```
[SECTION HEADER - green bg, white bold text]
[Column Headers - gray bg, bold text]
[Data row 1]
[Data row 2]
...
[empty row]
[empty row]
[NEXT SECTION HEADER]
...
```

---

## MCP Tools Reference

### Reading Data
```
mcp__google-sheets__list_spreadsheets
mcp__google-sheets__list_sheets(spreadsheet_id)
mcp__google-sheets__get_sheet_data(spreadsheet_id, sheet, range?)
mcp__google-sheets__get_sheet_formulas(spreadsheet_id, sheet, range?)
```

### Writing Data
```
mcp__google-sheets__update_cells(spreadsheet_id, sheet, range, data)
mcp__google-sheets__batch_update_cells(spreadsheet_id, sheet, ranges)
```

### Sheet Management
```
mcp__google-sheets__create_sheet(spreadsheet_id, title)
mcp__google-sheets__rename_sheet(spreadsheet, sheet, new_name)
mcp__google-sheets__add_rows(spreadsheet_id, sheet, count, start_row?)
mcp__google-sheets__add_columns(spreadsheet_id, sheet, count, start_column?)
```

### Formatting (via batch_update)
```
mcp__google-sheets__batch_update(spreadsheet_id, requests)
```

---

## Common Operations

### Read all sheets
```
mcp__google-sheets__list_sheets
  spreadsheet_id: "1WtffwGtcCD6pedCbQgjVbMLsbNM6QHTz_XZMaRZj9so"
```

### Read a tab's data
```
mcp__google-sheets__get_sheet_data
  spreadsheet_id: "1WtffwGtcCD6pedCbQgjVbMLsbNM6QHTz_XZMaRZj9so"
  sheet: "Orders-Shifts"
```

### Write to cells
```
mcp__google-sheets__update_cells
  spreadsheet_id: "1WtffwGtcCD6pedCbQgjVbMLsbNM6QHTz_XZMaRZj9so"
  sheet: "Orders-Shifts"
  range: "B2:D5"
  data: [["value1", "value2", "value3"], ["value4", "value5", "value6"]]
```

### Add a new tab with formatting
1. Create sheet: `mcp__google-sheets__create_sheet` → get sheetId from response
2. Add content: `mcp__google-sheets__update_cells`
3. Apply formatting: `mcp__google-sheets__batch_update` with requests for:
   - Column widths (`updateDimensionProperties`)
   - Section headers (`repeatCell` with green bg)
   - Column headers (`repeatCell` with gray bg)

### Formatting request template
```json
{
  "repeatCell": {
    "range": {
      "sheetId": SHEET_ID,
      "startRowIndex": 0,
      "endRowIndex": 1,
      "startColumnIndex": 0,
      "endColumnIndex": 4
    },
    "cell": {
      "userEnteredFormat": {
        "backgroundColor": {"red": 0.13, "green": 0.77, "blue": 0.37},
        "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}
      }
    },
    "fields": "userEnteredFormat(backgroundColor,textFormat)"
  }
}
```

---

## Troubleshooting

### "Storage quota exceeded"
The service account's Drive quota is full. Create sheets manually in the Drive folder, then use MCP to populate them.

### "API not enabled"
Enable the required API in Google Cloud Console:
- Sheets API: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=190001638171
- Drive API: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=190001638171

### Tools not available after adding MCP
Restart Claude Code completely (quit and reopen) for MCP tools to load.

---

## Quick Start

1. Check MCP is connected: `claude mcp list`
2. List sheets: `mcp__google-sheets__list_sheets` with spreadsheet_id `1WtffwGtcCD6pedCbQgjVbMLsbNM6QHTz_XZMaRZj9so`
3. Read/write as needed
4. Follow design language for any new tabs
