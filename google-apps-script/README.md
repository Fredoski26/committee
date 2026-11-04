# Google Forms & Google Sheets Integration Guide

This guide walks you through connecting your **CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM** to your dashboard via Google Sheets and Google Apps Script.

## 🔗 Connected Resources
- **Google Form**: [CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM](https://docs.google.com/forms/d/e/1FAIpQLSfrNXCyayrL8lLUCsIc69LvWyyH9MI6Iyx1EEXOE1RkX6jmxQ/viewform)
- **Google Sheet**: [Linked Response Sheet](https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit?resourcekey=&gid=2115549164#gid=2115549164)
- **Webhook Endpoint**: `POST /api/webhooks/google-forms`
- **Default Webhook Secret**: `gforms_sec_7f9a8d4c2b1e0f3a5e8c` (configurable in `.env`)

---

## 🛠️ Step-by-Step Setup Instructions

### Step 1: Open the Script Editor in your Google Sheet
1. Open your Google Sheet: [Open Sheet](https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit?resourcekey=&gid=2115549164#gid=2115549164).
2. Click **Extensions** in the top menu -> select **Apps Script**.
3. A new tab will open with the script editor.

### Step 2: Paste the Code
1. Delete any existing code inside `Code.gs`.
2. Copy the entire contents of `google-apps-script/Code.gs` and paste it into `Code.gs`.
3. Click the **Save** icon (diskette icon) or press `Ctrl + S` / `Cmd + S`.

### Step 3: Configure Script Properties (Recommended)
1. In the Apps Script left sidebar, click the **Project Settings** (gear icon ⚙️).
2. Scroll down to **Script Properties** and click **Add script property**.
3. Add the following key-value pairs:
   - `WEBHOOK_URL`: Your server URL, e.g. `https://your-public-domain.com/api/webhooks/google-forms` (or your ngrok URL for local development: `https://xxxx.ngrok-free.app/api/webhooks/google-forms`).
   - `WEBHOOK_SECRET`: `gforms_sec_7f9a8d4c2b1e0f3a5e8c`
   - `FORM_ID`: `class-of-1990-electoral`
   - `FORM_NAME`: `CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM`
4. Click **Save script properties**.

### Step 4: Install the Form Submit Trigger
You can install the trigger in either of two ways:
- **Option A (Via Spreadsheet Menu)**:
  1. Reload your Google Sheet.
  2. Notice the new top-level menu item: **🚀 Form Dashboard**.
  3. Click **🚀 Form Dashboard** -> **Install Automatic Trigger**.
  4. Google will request permission to run the script. Click **Review permissions** -> choose your account -> click **Advanced** -> click **Go to Untitled project (unsafe)** -> click **Allow**.
- **Option B (Via Apps Script Triggers)**:
  1. In the Apps Script left sidebar, click **Triggers** (alarm clock icon ⏰).
  2. Click **+ Add Trigger** (bottom right).
  3. Set:
     - Choose which function to run: `onFormSubmit`
     - Which runs at deployment: `Head`
     - Select event source: `From spreadsheet`
     - Select event type: `On form submit`
     - Failure notification frequency: `Notify me immediately`
  4. Click **Save**.

### Step 5: Test the Integration
1. In your Google Sheet, click **🚀 Form Dashboard** -> **Test Webhook Connection**.
2. A popup will verify `✅ Connection Successful! [201 Created]`.
3. In your dashboard, check the **Recent Submissions** table and **Integration Logs** tab to see the live test event!
4. If you already have existing responses in the sheet, click **🚀 Form Dashboard** -> **Sync All Existing Rows Now** to backfill all past responses immediately.
