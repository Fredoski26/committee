const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const dbPath = path.join(__dirname, '..', 'data', 'forms.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables if needed
db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    form_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sheet_url TEXT,
    form_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    fields_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    external_submission_id TEXT NOT NULL,
    submitter_name TEXT,
    submitter_email TEXT,
    submitter_phone TEXT,
    answers TEXT NOT NULL,
    raw_payload TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    submitted_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE,
    UNIQUE(form_id, external_submission_id)
  );

  CREATE TABLE IF NOT EXISTS webhook_logs (
    id TEXT PRIMARY KEY,
    form_id TEXT,
    external_submission_id TEXT,
    status TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    message TEXT,
    error_message TEXT,
    payload TEXT NOT NULL,
    headers TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );
`);

console.log('Seeding initial data matching screenshot and user form...');

// Clear existing tables for a clean seed
db.exec('DELETE FROM webhook_logs;');
db.exec('DELETE FROM form_submissions;');
db.exec('DELETE FROM forms;');

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 3600000 * 5).toISOString(); // 5 hours ago (today)
const twoDaysAgo = new Date(Date.now() - 3600000 * 48).toISOString();

const insertForm = db.prepare(`
  INSERT INTO forms (id, form_id, name, description, sheet_url, form_url, status, fields_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 1. "The Great Survey pt.2" (Inactive, 1 fields, 0 responses)
insertForm.run(
  crypto.randomUUID(),
  'the-great-survey-pt-2',
  'The Great Survey pt.2',
  'Follow up survey for team feedback',
  null,
  null,
  'Inactive',
  1,
  twoDaysAgo,
  twoDaysAgo
);

// 2. "The Great Survey" (Active, 1 fields, 1 response)
insertForm.run(
  crypto.randomUUID(),
  'the-great-survey',
  'The Great Survey',
  'Annual member survey',
  null,
  null,
  'Active',
  1,
  twoDaysAgo,
  twoDaysAgo
);

// 3. "New Features" (Active, 5 fields, 1 response from George)
insertForm.run(
  crypto.randomUUID(),
  'new-features',
  'New Features',
  'Feedback on upcoming portal features',
  null,
  null,
  'Active',
  5,
  yesterday,
  yesterday
);

// 4. "CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM" (User provided form)
insertForm.run(
  crypto.randomUUID(),
  'class-of-1990-electoral',
  'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM',
  'Application form for candidates contesting for electoral committee and executive positions.',
  'https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit?resourcekey=&gid=2115549164#gid=2115549164',
  'https://docs.google.com/forms/d/e/1FAIpQLSfrNXCyayrL8lLUCsIc69LvWyyH9MI6Iyx1EEXOE1RkX6jmxQ/viewform',
  'Active',
  15,
  now,
  now
);

const insertSubmission = db.prepare(`
  INSERT INTO form_submissions (
    id, form_id, external_submission_id, submitter_name, submitter_email, submitter_phone,
    answers, raw_payload, status, notes, submitted_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// George's submission for "New Features" (shown in screenshot)
insertSubmission.run(
  crypto.randomUUID(),
  'new-features',
  'sub_george_screenshot_001',
  'George',
  'george@example.com',
  '+1 555-0199',
  JSON.stringify([
    { question: 'What feature would you like to see next?', answer: 'Automated response notifications and export tools', type: 'text' },
    { question: 'How satisfied are you with the platform?', answer: 'Very Satisfied', type: 'multiple_choice' },
    { question: 'Preferred notification channel', answer: ['Email', 'In-App'], type: 'checkboxes' },
    { question: 'Additional Feedback', answer: 'The new design looks crisp and easy to navigate.', type: 'text' }
  ]),
  JSON.stringify({ submitter: 'George', source: 'Google Forms' }),
  'reviewed',
  'Verified user feedback.',
  yesterday,
  yesterday,
  yesterday
);

// The Great Survey submission
insertSubmission.run(
  crypto.randomUUID(),
  'the-great-survey',
  'sub_survey_001',
  'Alex Rivera',
  'alex.r@example.org',
  '+1 555-0142',
  JSON.stringify([
    { question: 'Overall Experience Rating', answer: 'Excellent', type: 'multiple_choice' }
  ]),
  JSON.stringify({ submitter: 'Alex Rivera' }),
  'completed',
  null,
  yesterday,
  yesterday,
  yesterday
);

// Sample submission for Electoral Committee
insertSubmission.run(
  crypto.randomUUID(),
  'class-of-1990-electoral',
  'sub_electoral_sample_001',
  'Dr. Emmanuel Adebayo',
  'adebayo.e@alumni90.org',
  '08037743197',
  JSON.stringify([
    { question: 'Full Name', answer: 'Dr. Emmanuel Adebayo', type: 'text' },
    { question: 'Date of Birth', answer: '1972-04-15', type: 'date' },
    { question: 'Email Address', answer: 'adebayo.e@alumni90.org', type: 'text' },
    { question: 'Phone Number', answer: '08037743197', type: 'text' },
    { question: 'Class/Year Set', answer: 'Class of 1990', type: 'text' },
    { question: 'Position Contested For', answer: 'President', type: 'dropdown' },
    { question: 'Why are you interested in contesting for this position?', answer: 'To foster unity, advance alumni welfare, and establish scholarship endowments for deserving students.', type: 'paragraph' },
    { question: 'Write your statement here', answer: 'My manifesto focuses on transparency, quarterly town halls, and modernizing our alumni network.', type: 'paragraph' },
    { question: 'Reference Name', answer: 'Chief O. Johnson', type: 'text' },
    { question: 'Reference Date', answer: '2026-09-10', type: 'date' },
    { question: "Contestant's Name", answer: 'Dr. Emmanuel Adebayo', type: 'text' },
    { question: 'Declaration Confirmation', answer: ['I confirm that I have read, understood, and agree to the declaration above.'], type: 'checkboxes' },
    { question: 'Declaration Date', answer: '2026-09-12', type: 'date' }
  ]),
  JSON.stringify({ submitter: 'Dr. Emmanuel Adebayo', form: 'CLASS OF 1990' }),
  'pending',
  'Candidate documents received. Awaiting committee screening.',
  now,
  now,
  now
);

console.log('Seeding complete! Successfully created forms and submissions.');
