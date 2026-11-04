import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH || 
  (process.env.VERCEL ? path.join('/tmp', 'forms.db') : path.join(process.cwd(), 'data', 'forms.db'));

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Singleton database instance
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initDatabase(dbInstance);
  }
  return dbInstance;
}

function initDatabase(db: DatabaseSync) {
  // Enable foreign keys and WAL mode for reliability
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Create tables
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

    CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
    CREATE INDEX IF NOT EXISTS idx_forms_form_id ON forms(form_id);

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

    CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON form_submissions(form_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON form_submissions(submitted_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON form_submissions(status);

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

    CREATE INDEX IF NOT EXISTS idx_logs_form_id ON webhook_logs(form_id);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON webhook_logs(status);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON webhook_logs(created_at);
  `);
}
