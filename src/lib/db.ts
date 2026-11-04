import path from 'node:path';
import fs from 'node:fs';

const isPostgres = !!(
  process.env.POSTGRES_URL || 
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))
);

let sqliteDbInstance: any = null;
let neonClientInstance: any = null;
let isInitialized = false;

// Neon postgres client initialization
function getNeonClient() {
  if (!neonClientInstance) {
    const { neon } = require('@neondatabase/serverless');
    const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    neonClientInstance = neon(connStr);
  }
  return neonClientInstance;
}

// SQLite initialization
function getSqliteDb() {
  if (!sqliteDbInstance) {
    const { DatabaseSync } = require('node:sqlite');
    const DB_PATH = process.env.DATABASE_PATH || 
      (process.env.VERCEL ? path.join('/tmp', 'forms.db') : path.join(process.cwd(), 'data', 'forms.db'));
    
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    sqliteDbInstance = new DatabaseSync(DB_PATH);
    sqliteDbInstance.exec('PRAGMA foreign_keys = ON;');
    sqliteDbInstance.exec('PRAGMA journal_mode = WAL;');
  }
  return sqliteDbInstance;
}

// Universal query runner
export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureInitialized();

  if (isPostgres) {
    const sqlClient = getNeonClient();
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const rows = await sqlClient.query(pgSql, params);
    return (Array.isArray(rows) ? rows : (rows as any)?.rows || []) as T[];
  } else {
    const db = getSqliteDb();
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows as T[];
  }
}

// Universal single row query
export async function dbQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await dbQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Universal execute runner
export async function dbExec(sql: string, params: any[] = []): Promise<{ changes: number }> {
  await ensureInitialized();

  if (isPostgres) {
    const sqlClient = getNeonClient();
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await sqlClient.query(pgSql, params, { fullResults: true });
    const changes = res?.rowCount ?? (Array.isArray(res) ? res.length : 1);
    return { changes };
  } else {
    const db = getSqliteDb();
    const stmt = db.prepare(sql);
    const res = stmt.run(...params);
    return { changes: res.changes };
  }
}

// Ensure schema and initial forms exist
async function ensureInitialized() {
  if (isInitialized) return;

  if (isPostgres) {
    const sqlClient = getNeonClient();
    await sqlClient.query(`
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

    // Always ensure default forms exist in Postgres
    const now = new Date().toISOString();
    await sqlClient.query(`
      INSERT INTO forms (id, form_id, name, description, sheet_url, form_url, status, fields_count, created_at, updated_at)
      VALUES 
        ('1', 'class-of-1990-electoral', 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM', 'Application form for electoral committee positions.', 'https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit', 'https://docs.google.com/forms/d/e/1FAIpQLSfrNXCyayrL8lLUCsIc69LvWyyH9MI6Iyx1EEXOE1RkX6jmxQ/viewform', 'Active', 15, '${now}', '${now}'),
        ('2', 'the-great-survey', 'The Great Survey', 'Annual member survey', NULL, NULL, 'Active', 1, '${now}', '${now}'),
        ('3', 'the-great-survey-pt-2', 'The Great Survey pt.2', 'Follow up survey', NULL, NULL, 'Inactive', 1, '${now}', '${now}'),
        ('4', 'new-features', 'New Features', 'Feedback on upcoming portal features', NULL, NULL, 'Active', 5, '${now}', '${now}')
      ON CONFLICT (form_id) DO NOTHING;
    `);

  } else {
    const db = getSqliteDb();
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

    // Always ensure default forms exist in SQLite
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO forms (id, form_id, name, description, sheet_url, form_url, status, fields_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('1', 'class-of-1990-electoral', 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM', 'Application form for electoral committee positions.', 'https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA/edit', 'https://docs.google.com/forms/d/e/1FAIpQLSfrNXCyayrL8lLUCsIc69LvWyyH9MI6Iyx1EEXOE1RkX6jmxQ/viewform', 'Active', 15, now, now);
    insert.run('2', 'the-great-survey', 'The Great Survey', 'Annual member survey', null, null, 'Active', 1, now, now);
    insert.run('3', 'the-great-survey-pt-2', 'The Great Survey pt.2', 'Follow up survey', null, null, 'Inactive', 1, now, now);
    insert.run('4', 'new-features', 'New Features', 'Feedback on upcoming portal features', null, null, 'Active', 5, now, now);
  }

  isInitialized = true;
}
