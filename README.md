# FormBuilder - Google Forms Response Management Dashboard

A modern, full-stack administrative dashboard that automatically integrates with Google Forms and Google Sheets via a real-time secure webhook and Google Apps Script.

Tailored specifically for the **CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM** and supporting multi-form ingestion.

---

## 📸 Overview & Features

### 1. Dashboard Overview
- **Vibrant Gradient Stat Cards**: Total Forms, Total Submissions, Today's Submissions (last 24 hours), and Active Forms.
- **Recent Forms Grid**: Connected Google Forms with fields count, response count, Active/Inactive toggle status, and edit controls.
- **Recent Submissions Table**: Displays latest submissions with Submitter Name, Email/Phone, Date/Time, and "View Details" trigger.

### 2. Multi-Form Google Integration & Webhook Engine
- **Endpoint**: `POST /api/webhooks/google-forms`
- **Webhook Authentication**: Protected via `x-webhook-secret` header or encrypted payload secret.
- **Dynamic Field & Answer Parser**: Supports all question types (text, paragraph, multiple choice, checkboxes, dropdowns, dates, times).
- **Duplicate Prevention**: Unique constraint on `(formId, externalSubmissionId)` safely ignores repeated submissions without failing Apps Script triggers.
- **Delivery Logging**: Detailed logs of incoming payloads, headers, client IP, and retry capabilities.

### 3. Submission Management & Review Workflow
- **Search & Filtering**: Search across applicant names, email, phone, and question answers; filter by form, review status (`pending`, `reviewed`, `completed`), and date ranges.
- **Review Drawer / Modal**: Complete application view, contestant contact info, statement of intent (manifesto), reference details, declaration check, internal administrative screening notes, and status switcher.
- **Exporting**: One-click export of filtered submissions to RFC 4180 **CSV** or native **Excel (.xlsx)** format with columns dynamically aligned.

### 4. Analytics & Question Response Distributions
- Response trends over time (14-day volume histogram).
- Submissions distribution per Google Form.
- Contestant position distribution chart (President, VP, Secretary, etc.).
- Processing workflow status breakdown.

---

## 📂 Project Structure

```
committee/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── forms/                      # Form listing & management
│   │   │   ├── form-responses/             # Paginated list & status update
│   │   │   │   ├── [id]/                   # Single submission detail & patch
│   │   │   │   ├── export/                 # CSV & XLSX export engine
│   │   │   │   └── stats/                  # Aggregated analytics
│   │   │   ├── integration-logs/           # Delivery logs & retry endpoint
│   │   │   └── webhooks/
│   │   │       └── google-forms/           # Secure webhook receiver
│   │   ├── globals.css                     # Tailwind CSS
│   │   ├── layout.tsx                      # Root layout
│   │   └── page.tsx                        # Main dashboard page
│   ├── components/
│   │   ├── Navbar.tsx                      # Top bar with tabs & actions
│   │   ├── StatCards.tsx                   # 4 gradient stat cards
│   │   ├── RecentForms.tsx                 # Form cards grid
│   │   ├── RecentSubmissionsTable.tsx      # Submissions table & filters
│   │   ├── SubmissionDetailModal.tsx       # Q&A detail & status updater
│   │   ├── AnalyticsView.tsx               # Graphical charts & breakdown
│   │   ├── IntegrationLogsView.tsx         # Webhook logs & live tester
│   │   ├── GoogleAppsScriptModal.tsx       # Interactive Apps Script guide
│   │   └── FormEditModal.tsx               # Edit form metadata
│   ├── lib/
│   │   ├── db.ts                           # SQLite database connection & schema
│   │   ├── repositories.ts                 # Data repositories (forms, submissions, logs)
│   │   ├── types.ts                        # TypeScript interfaces
│   │   └── validations.ts                  # Zod schema validation
│   └── types/
│       └── sqlite.d.ts                     # node:sqlite typings
├── google-apps-script/
│   ├── Code.gs                             # Complete Apps Script integration code
│   └── README.md                           # Step-by-step connection guide
├── scripts/
│   ├── seed.js                             # Database seed script
│   └── test-suite.js                       # 15 automated integration tests
├── .env                                    # Environment variables
└── package.json
```

---

## ⚡ Quick Start

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Seed Initial Data
```bash
npm run seed
```

### 3. Run the Dashboard
```bash
npm start
```
The dashboard is available at: [http://localhost:3000](http://localhost:3000).

---

## 🧪 Automated Test Suite (15/15 Passed)
Run the automated end-to-end integration test suite:
```bash
node scripts/test-suite.js
```

Verified tests:
1. `GET /api/forms` returns existing forms list.
2. `GET /api/form-responses/stats` returns aggregate metrics.
3. `POST /api/webhooks/google-forms` rejects requests missing secret (401).
4. `POST /api/webhooks/google-forms` rejects invalid webhook secret (401).
5. `POST /api/webhooks/google-forms` rejects unprocessable payloads (422).
6. `POST /api/webhooks/google-forms` accepts valid submission (201).
7. `POST /api/webhooks/google-forms` safely handles duplicate submissions (200 duplicate).
8. `GET /api/form-responses/:id` returns full submission with parsed answers.
9. `PATCH /api/form-responses/:id` updates status and internal notes.
10. `GET /api/form-responses?search=...` tests full-text search.
11. `GET /api/form-responses?limit=1` enforces pagination.
12. `GET /api/form-responses/export?format=csv` downloads valid CSV.
13. `GET /api/form-responses/export?format=xlsx` downloads valid Excel spreadsheet.
14. `GET /api/integration-logs` logs delivery events and statuses.
15. `GET /` verifies dashboard HTML rendering.

---

## 🔗 Google Apps Script Setup Guide

Follow [google-apps-script/README.md](./google-apps-script/README.md) to link your Google Sheet:
- Target Spreadsheet: [CLASS OF 1990 Responses](https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit?resourcekey=&gid=2115549164#gid=2115549164)
- Target Form: [CLASS OF 1990 Application Form](https://docs.google.com/forms/d/e/1FAIpQLSfrNXCyayrL8lLUCsIc69LvWyyH9MI6Iyx1EEXOE1RkX6jmxQ/viewform)
