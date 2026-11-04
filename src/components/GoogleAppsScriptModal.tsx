'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Code2, CheckCircle2, ChevronRight } from 'lucide-react';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleAppsScriptModal({ isOpen, onClose }: GoogleAppsScriptModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const scriptCode = `/**
 * GOOGLE APPS SCRIPT: Google Forms & Sheets Webhook Integration
 * Target Form: CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM
 * Target Sheet: https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA
 */

var CONFIG = {
  DEFAULT_WEBHOOK_URL: 'http://localhost:3000/api/webhooks/google-forms', // update to your domain or ngrok URL
  DEFAULT_WEBHOOK_SECRET: 'gforms_sec_7f9a8d4c2b1e0f3a5e8c',
  DEFAULT_FORM_ID: 'class-of-1990-electoral',
  DEFAULT_FORM_NAME: 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM'
};

function getSettings() {
  var props = PropertiesService.getScriptProperties();
  return {
    webhookUrl: props.getProperty('WEBHOOK_URL') || CONFIG.DEFAULT_WEBHOOK_URL,
    webhookSecret: props.getProperty('WEBHOOK_SECRET') || CONFIG.DEFAULT_WEBHOOK_SECRET,
    formId: props.getProperty('FORM_ID') || CONFIG.DEFAULT_FORM_ID,
    formName: props.getProperty('FORM_NAME') || CONFIG.DEFAULT_FORM_NAME
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

function onFormSubmit(e) {
  var settings = getSettings();
  try {
    var payload = buildPayloadFromEvent(e, settings);
    var success = sendPayloadWithRetry(payload, settings);
    if (e && e.range) {
      updateSyncStatusInSheet(e.range.getRow(), success ? 'SYNCED' : 'FAILED');
    }
  } catch (err) {
    Logger.log('Critical error: ' + err.toString());
  }
}

function buildPayloadFromEvent(e, settings) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var timestamp = new Date().toISOString();
  var externalSubmissionId = 'sub_' + new Date().getTime();
  var answers = [];
  var submitterEmail = null;
  var submitterName = null;
  var submitterPhone = null;

  if (e && e.response) {
    var response = e.response;
    externalSubmissionId = response.getId() || externalSubmissionId;
    timestamp = response.getTimestamp().toISOString();
    submitterEmail = response.getRespondentEmail() || null;

    var itemResponses = response.getItemResponses();
    for (var i = 0; i < itemResponses.length; i++) {
      answers.push({
        question: itemResponses[i].getItem().getTitle(),
        answer: itemResponses[i].getResponse(),
        type: itemResponses[i].getItem().getType().toString().toLowerCase()
      });
    }
  } else if (e && e.namedValues) {
    var keys = Object.keys(e.namedValues);
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      var val = e.namedValues[key] ? e.namedValues[key].join(', ') : '';
      if (key === 'Timestamp') {
        if (val) timestamp = new Date(val).toISOString();
        continue;
      }
      answers.push({ question: key, answer: val, type: 'text' });
    }
    if (e.range) {
      externalSubmissionId = 'row_' + e.range.getRow() + '_' + new Date(timestamp).getTime();
    }
  }

  for (var k = 0; k < answers.length; k++) {
    var q = answers[k].question.toLowerCase();
    var a = answers[k].answer ? String(answers[k].answer) : '';
    if (!submitterName && (q.indexOf('full name') !== -1 || q.indexOf("contestant's name") !== -1)) submitterName = a;
    if (!submitterEmail && (q.indexOf('email') !== -1)) submitterEmail = a;
    if (!submitterPhone && (q.indexOf('phone') !== -1 || q.indexOf('whatsapp') !== -1)) submitterPhone = a;
  }

  return {
    formId: settings.formId,
    formName: settings.formName,
    sheetUrl: sheet.getUrl(),
    externalSubmissionId: externalSubmissionId,
    submittedAt: timestamp,
    submitterName: submitterName,
    submitterEmail: submitterEmail,
    submitterPhone: submitterPhone,
    answers: answers
  };
}

function sendPayloadWithRetry(payload, settings) {
  var maxRetries = 3;
  var delayMs = 1000;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-webhook-secret': settings.webhookSecret },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(settings.webhookUrl, options);
      if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) return true;
    } catch (e) {
      Logger.log('Network error attempt ' + attempt + ': ' + e.toString());
    }
    Utilities.sleep(delayMs);
    delayMs *= 2;
  }
  return false;
}

function updateSyncStatusInSheet(rowNum, status) {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var statusCol = headers.indexOf('Sync Status') + 1;
    if (statusCol === 0) {
      statusCol = headers.length + 1;
      sheet.getRange(1, statusCol).setValue('Sync Status');
    }
    sheet.getRange(rowNum, statusCol).setValue(status + ' (' + Utilities.formatDate(new Date(), 'GMT+1', 'yyyy-MM-dd HH:mm') + ')');
  } catch (err) {}
}

function syncHistoricalResponses() {
  var ui = SpreadsheetApp.getUi();
  var settings = getSettings();
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return ui.alert('No responses found to sync.');

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var synced = 0;

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var actualRowNum = r + 2;
    var answers = [];
    var timestamp = new Date().toISOString();

    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      if (!header || header === 'Sync Status') continue;
      if (header === 'Timestamp' && row[c]) timestamp = new Date(row[c]).toISOString();
      else answers.push({ question: header, answer: row[c], type: 'text' });
    }

    var payload = {
      formId: settings.formId,
      formName: settings.formName,
      sheetUrl: sheet.getUrl(),
      externalSubmissionId: 'row_' + actualRowNum + '_' + new Date(timestamp).getTime(),
      submittedAt: timestamp,
      answers: answers
    };

    if (sendPayloadWithRetry(payload, settings)) {
      synced++;
      updateSyncStatusInSheet(actualRowNum, 'SYNCED');
    }
  }
  ui.alert('Sync Finished', 'Successfully synced ' + synced + ' responses to dashboard.', ui.ButtonSet.OK);
}

function testWebhookConnection() {
  var ui = SpreadsheetApp.getUi();
  var settings = getSettings();
  var testPayload = {
    formId: settings.formId,
    formName: settings.formName,
    externalSubmissionId: 'test_' + new Date().getTime(),
    submittedAt: new Date().toISOString(),
    submitterName: 'Test Connection Submitter',
    answers: [{ question: 'Status', answer: 'Verified from Google Apps Script', type: 'text' }]
  };
  try {
    var res = UrlFetchApp.fetch(settings.webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-webhook-secret': settings.webhookSecret },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    });
    ui.alert('Test Result', 'Response Code: ' + res.getResponseCode() + '\\n' + res.getContentText(), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Connection Failed', e.toString(), ui.ButtonSet.OK);
  }
}

function installTrigger() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(sheet).onFormSubmit().create();
  SpreadsheetApp.getUi().alert('Trigger Installed', 'Submissions will now automatically be forwarded to the dashboard.', SpreadsheetApp.getUi().ButtonSet.OK);
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Google Apps Script Integration Setup</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Connect your Google Sheet & Form to automatically send submissions to this dashboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs">
            <span className="font-bold text-blue-900">Your Resources:</span>
            <a
              href="https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit?resourcekey=&gid=2115549164#gid=2115549164"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-blue-700 font-semibold hover:underline gap-1"
            >
              <span>Target Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSfrNXCyayrL8lLUCsIc69LvWyyH9MI6Iyx1EEXOE1RkX6jmxQ/viewform"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-blue-700 font-semibold hover:underline gap-1"
            >
              <span>Application Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { num: 1, title: 'Open Extensions' },
              { num: 2, title: 'Paste Script' },
              { num: 3, title: 'Set Trigger' },
              { num: 4, title: 'Test & Verify' }
            ].map(step => (
              <div
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                  activeStep === step.num
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    activeStep === step.num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Code Viewer with Copy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Google Apps Script Source Code (`Code.gs`)
              </span>
              <button
                onClick={copyCode}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Complete Script'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs font-mono overflow-x-auto max-h-80 border border-slate-800">
                {scriptCode}
              </pre>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">
            Script file also saved in: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">google-apps-script/Code.gs</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-sm"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
