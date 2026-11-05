/**
 * GOOGLE APPS SCRIPT: Google Forms & Sheets Webhook Integration
 * 
 * Target Form: CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM
 * Target Sheet: https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA
 */

var CONFIG = {
  DEFAULT_WEBHOOK_URL: 'https://committee-psi.vercel.app/api/webhooks/google-forms',
  DEFAULT_WEBHOOK_SECRET: 'gforms_sec_7f9a8d4c2b1e0f3a5e8c',
  DEFAULT_FORM_ID: 'class-of-1990-electoral',
  FORM_ID: 'class-of-1990-electoral',
  DEFAULT_FORM_NAME: 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM'
};

function getSettings() {
  var props = PropertiesService.getScriptProperties();
  return {
    webhookUrl:    props.getProperty('WEBHOOK_URL')    || CONFIG.DEFAULT_WEBHOOK_URL,
    webhookSecret: props.getProperty('WEBHOOK_SECRET') || CONFIG.DEFAULT_WEBHOOK_SECRET,
    formId:        props.getProperty('FORM_ID')        || CONFIG.DEFAULT_FORM_ID,
    formName:      props.getProperty('FORM_NAME')      || CONFIG.DEFAULT_FORM_NAME
  };
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 Form Dashboard')
    .addItem('Test Webhook Connection', 'testWebhookConnection')
    .addItem('Install Automatic Trigger', 'installTrigger')
    .addSeparator()
    .addItem('Sync All Existing Rows Now', 'syncHistoricalResponses')
    .addToUi();
}

/**
 * Triggered automatically on every new form submission
 */
function onFormSubmit(e) {
  var settings = getSettings();
  Logger.log('Processing new form submission for: ' + settings.formName);

  try {
    var payload = buildPayloadFromEvent(e, settings);
    var success = sendPayloadWithRetry(payload, settings);

    if (e && e.range) {
      updateSyncStatusInSheet(e.range.getRow(), success ? 'SYNCED' : 'FAILED');
    }
  } catch (err) {
    Logger.log('Critical error in onFormSubmit: ' + err.toString());
  }
}

/**
 * Builds the structured JSON payload from the form submission event
 */
function buildPayloadFromEvent(e, settings) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUrl = spreadsheet ? spreadsheet.getUrl() : '';
  var timestamp = new Date().toISOString();
  var externalSubmissionId = 'sub_' + new Date().getTime();
  var answers = [];
  var submitterEmail = null;
  var submitterName = null;
  var submitterPhone = null;

  // 1. Triggered directly by Google Form
  if (e && e.response) {
    var response = e.response;
    externalSubmissionId = response.getId() || externalSubmissionId;
    try {
      timestamp = response.getTimestamp().toISOString();
    } catch (tErr) {
      timestamp = new Date().toISOString();
    }
    submitterEmail = response.getRespondentEmail() || null;

    var itemResponses = response.getItemResponses();
    for (var i = 0; i < itemResponses.length; i++) {
      var itemResp = itemResponses[i];
      answers.push({
        question: itemResp.getItem().getTitle(),
        answer: itemResp.getResponse(),
        type: itemResp.getItem().getType().toString().toLowerCase()
      });
    }
  }
  // 2. Triggered by Google Sheets linked to Google Form
  else if (e && e.namedValues) {
    var namedValues = e.namedValues;
    var keys = Object.keys(namedValues);

    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      var valArray = namedValues[key];
      var val = valArray ? valArray.join(', ') : '';

      if (key === 'Timestamp') {
        try {
          if (val) timestamp = new Date(val).toISOString();
        } catch (tErr) {}
        continue;
      }

      answers.push({
        question: key,
        answer: val,
        type: 'text'
      });
    }

    if (e.range) {
      externalSubmissionId = 'row_' + e.range.getRow() + '_' + new Date().getTime();
    }
  }
  // 3. Fallback: Parse active row from sheet
  else {
    var activeSheet = spreadsheet.getActiveSheet();
    var row = (e && e.range) ? e.range.getRow() : activeSheet.getLastRow();
    var headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    var values = activeSheet.getRange(row, 1, 1, activeSheet.getLastColumn()).getValues()[0];

    for (var h = 0; h < headers.length; h++) {
      var header = headers[h];
      if (!header || header === 'Sync Status') continue;
      var cellVal = values[h];

      if (header === 'Timestamp' && cellVal) {
        try {
          timestamp = new Date(cellVal).toISOString();
        } catch (tErr) {}
      } else {
        answers.push({
          question: header,
          answer: cellVal,
          type: 'text'
        });
      }
    }
    externalSubmissionId = 'row_' + row + '_' + new Date().getTime();
  }

  // Auto-detect submitter info from answers
  for (var k = 0; k < answers.length; k++) {
    var q = answers[k].question.toLowerCase();
    var a = answers[k].answer ? String(answers[k].answer).trim() : '';
    if (!submitterName && (q.indexOf('full name') !== -1 || q.indexOf("contestant's name") !== -1 || q === 'name')) {
      submitterName = a;
    }
    if (!submitterEmail && (q.indexOf('email') !== -1)) {
      submitterEmail = a;
    }
    if (!submitterPhone && (q.indexOf('phone') !== -1 || q.indexOf('whatsapp') !== -1)) {
      submitterPhone = a;
    }
  }

  return {
    formId: settings.formId,
    formName: settings.formName,
    sheetUrl: sheetUrl,
    externalSubmissionId: externalSubmissionId,
    submittedAt: timestamp,
    submitterName: submitterName,
    submitterEmail: submitterEmail,
    submitterPhone: submitterPhone,
    answers: answers,
    metadata: {
      source: 'Google Apps Script',
      version: '1.1.0'
    }
  };
}

/**
 * Sends webhook payload with exponential backoff retry
 */
function sendPayloadWithRetry(payload, settings) {
  var maxRetries = 3;
  var delayMs = 1000;

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-webhook-secret': settings.webhookSecret
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(settings.webhookUrl, options);
      var statusCode = response.getResponseCode();
      var responseText = response.getContentText();

      Logger.log('Webhook attempt ' + attempt + ' response [' + statusCode + ']: ' + responseText);

      if (statusCode >= 200 && statusCode < 300) {
        return true;
      }

      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        Logger.log('Client error ' + statusCode + ', aborting retry.');
        return false;
      }

    } catch (e) {
      Logger.log('Network error on attempt ' + attempt + ': ' + e.toString());
    }

    if (attempt < maxRetries) {
      Utilities.sleep(delayMs);
      delayMs *= 2;
    }
  }

  Logger.log('Failed to deliver webhook after ' + maxRetries + ' attempts.');
  return false;
}

/**
 * Updates a "Sync Status" column in Google Sheets
 */
function updateSyncStatusInSheet(rowNum, status) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var statusCol = -1;

    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === 'Sync Status') {
        statusCol = i + 1;
        break;
      }
    }

    if (statusCol === -1) {
      statusCol = headers.length + 1;
      sheet.getRange(1, statusCol).setValue('Sync Status');
    }

    var cell = sheet.getRange(rowNum, statusCol);
    cell.setValue(status + ' (' + Utilities.formatDate(new Date(), 'GMT+1', 'yyyy-MM-dd HH:mm') + ')');
  } catch (err) {
    Logger.log('Could not update status cell: ' + err.toString());
  }
}

/**
 * Syncs all existing rows in the current sheet to the backend
 */
function syncHistoricalResponses() {
  var ui = SpreadsheetApp.getUi();
  var settings = getSettings();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getActiveSheet();
  var sheetUrl = spreadsheet.getUrl();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    ui.alert('No responses found to sync.');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var syncedCount = 0;
  var failedCount = 0;

  for (var r = 0; r < data.length; r++) {
    var rowValues = data[r];
    var actualRowNum = r + 2;
    var answers = [];
    var timestamp = new Date().toISOString();
    var submitterName = null;
    var submitterEmail = null;
    var submitterPhone = null;

    for (var c = 0; c < headers.length; c++) {
      var header = String(headers[c] || '').trim();
      if (!header || header === 'Sync Status') continue;
      var cellVal = rowValues[c];

      if (header === 'Timestamp' && cellVal) {
        try {
          timestamp = new Date(cellVal).toISOString();
        } catch (e) {
          timestamp = new Date().toISOString();
        }
      } else {
        answers.push({
          question: header,
          answer: cellVal,
          type: 'text'
        });

        var qLower = header.toLowerCase();
        var valStr = cellVal ? String(cellVal).trim() : '';
        if (!submitterName && (qLower.indexOf('full name') !== -1 || qLower.indexOf("contestant's name") !== -1 || qLower === 'name')) {
          submitterName = valStr;
        }
        if (!submitterEmail && (qLower.indexOf('email') !== -1)) {
          submitterEmail = valStr;
        }
        if (!submitterPhone && (qLower.indexOf('phone') !== -1 || qLower.indexOf('whatsapp') !== -1)) {
          submitterPhone = valStr;
        }
      }
    }

    var payload = {
      formId: settings.formId,
      formName: settings.formName,
      sheetUrl: sheetUrl,
      externalSubmissionId: 'row_' + actualRowNum + '_' + new Date(timestamp).getTime(),
      submittedAt: timestamp,
      submitterName: submitterName,
      submitterEmail: submitterEmail,
      submitterPhone: submitterPhone,
      answers: answers,
      metadata: { source: 'Google Sheets Bulk Sync', row: actualRowNum }
    };

    var success = sendPayloadWithRetry(payload, settings);
    if (success) {
      syncedCount++;
      updateSyncStatusInSheet(actualRowNum, 'SYNCED');
    } else {
      failedCount++;
      updateSyncStatusInSheet(actualRowNum, 'FAILED');
    }
  }

  ui.alert('Sync Finished', 'Successfully synced ' + syncedCount + ' submissions to dashboard! ' + (failedCount > 0 ? (failedCount + ' failed.') : ''), ui.ButtonSet.OK);
}

/**
 * Tests connection to the webhook endpoint
 */
function testWebhookConnection() {
  var ui = SpreadsheetApp.getUi();
  var settings = getSettings();

  var testPayload = {
    formId: settings.formId,
    formName: settings.formName,
    externalSubmissionId: 'test_ping_' + new Date().getTime(),
    submittedAt: new Date().toISOString(),
    submitterName: 'Test Connection Agent',
    submitterEmail: 'test@example.com',
    answers: [
      { question: 'Connection Test', answer: 'Verified from Google Apps Script UI', type: 'text' }
    ]
  };

  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': settings.webhookSecret
      },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(settings.webhookUrl, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code >= 200 && code < 300) {
      ui.alert('✅ Connection Successful!', 'Status Code: ' + code + '\nResponse:\n' + body, ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Connection Failed', 'Status Code: ' + code + '\nError:\n' + body, ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('❌ Connection Error', 'Could not reach server: ' + err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Automatically creates the installable trigger
 */
function installTrigger() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getUserTriggers(spreadsheet);

  // Remove any old/broken triggers first
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create fresh installable trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  SpreadsheetApp.getUi().alert('✅ Trigger Successfully Installed!', 'Every time a Google Form is submitted to this spreadsheet, it will now automatically send the response to your dashboard.', SpreadsheetApp.getUi().ButtonSet.OK);
}
