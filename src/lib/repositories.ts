import { getDb } from './db';
import { FormRecord, FormSubmissionRecord, WebhookLogRecord, DashboardStats, SubmissionAnswer } from './types';
import crypto from 'node:crypto';

export const formsRepo = {
  getAll(): FormRecord[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_id = f.form_id) as submissions_count
      FROM forms f
      ORDER BY f.created_at DESC
    `).all() as any[];
    return rows.map(r => ({
      ...r,
      submissions_count: Number(r.submissions_count || 0)
    }));
  },

  getByFormId(formId: string): FormRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM forms WHERE form_id = ?').get(formId) as any;
    return row || null;
  },

  getById(id: string): FormRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(id) as any;
    return row || null;
  },

  create(data: {
    form_id: string;
    name: string;
    description?: string | null;
    sheet_url?: string | null;
    form_url?: string | null;
    status?: 'Active' | 'Inactive';
    fields_count?: number;
  }): FormRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const status = data.status || 'Active';
    const fieldsCount = data.fields_count || 0;

    db.prepare(`
      INSERT INTO forms (id, form_id, name, description, sheet_url, form_url, status, fields_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.form_id,
      data.name,
      data.description || null,
      data.sheet_url || null,
      data.form_url || null,
      status,
      fieldsCount,
      now,
      now
    );

    return this.getByFormId(data.form_id)!;
  },

  update(formId: string, data: Partial<FormRecord>): FormRecord | null {
    const db = getDb();
    const existing = this.getByFormId(formId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = data.name ?? existing.name;
    const description = data.description !== undefined ? data.description : existing.description;
    const sheet_url = data.sheet_url !== undefined ? data.sheet_url : existing.sheet_url;
    const form_url = data.form_url !== undefined ? data.form_url : existing.form_url;
    const status = data.status ?? existing.status;
    const fields_count = data.fields_count !== undefined ? data.fields_count : existing.fields_count;

    db.prepare(`
      UPDATE forms
      SET name = ?, description = ?, sheet_url = ?, form_url = ?, status = ?, fields_count = ?, updated_at = ?
      WHERE form_id = ?
    `).run(name, description, sheet_url, form_url, status, fields_count, now, formId);

    return this.getByFormId(formId);
  },

  delete(formId: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM forms WHERE form_id = ?').run(formId);
    return res.changes > 0;
  },

  ensureForm(formId: string, name: string, fieldsCount: number = 0, formUrl?: string, sheetUrl?: string): FormRecord {
    const existing = this.getByFormId(formId);
    if (existing) {
      if (fieldsCount > existing.fields_count || (!existing.form_url && formUrl) || (!existing.sheet_url && sheetUrl)) {
        this.update(formId, {
          fields_count: Math.max(fieldsCount, existing.fields_count),
          form_url: formUrl || existing.form_url,
          sheet_url: sheetUrl || existing.sheet_url
        });
      }
      return this.getByFormId(formId)!;
    }

    return this.create({
      form_id: formId,
      name: name || formId,
      fields_count: fieldsCount,
      form_url: formUrl,
      sheet_url: sheetUrl,
      status: 'Active'
    });
  }
};

export const submissionsRepo = {
  list(params: {
    formId?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): { items: FormSubmissionRecord[]; total: number; page: number; totalPages: number } {
    const db = getDb();
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.formId) {
      whereClauses.push('fs.form_id = ?');
      sqlParams.push(params.formId);
    }

    if (params.status) {
      whereClauses.push('fs.status = ?');
      sqlParams.push(params.status);
    }

    if (params.startDate) {
      whereClauses.push('fs.submitted_at >= ?');
      sqlParams.push(params.startDate);
    }

    if (params.endDate) {
      whereClauses.push('fs.submitted_at <= ?');
      sqlParams.push(params.endDate);
    }

    if (params.search) {
      whereClauses.push('(fs.submitter_name LIKE ? OR fs.submitter_email LIKE ? OR fs.submitter_phone LIKE ? OR fs.answers LIKE ?)');
      const term = `%${params.search}%`;
      sqlParams.push(term, term, term, term);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count
    const countSql = `SELECT COUNT(*) as total FROM form_submissions fs WHERE ${whereSql}`;
    const totalRow = db.prepare(countSql).get(...sqlParams) as any;
    const total = Number(totalRow?.total || 0);

    // Items
    const querySql = `
      SELECT fs.*, f.name as form_name
      FROM form_submissions fs
      LEFT JOIN forms f ON f.form_id = fs.form_id
      WHERE ${whereSql}
      ORDER BY fs.submitted_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = db.prepare(querySql).all(...sqlParams, limit, offset) as any[];

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    };
  },

  getById(id: string): FormSubmissionRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT fs.*, f.name as form_name
      FROM form_submissions fs
      LEFT JOIN forms f ON f.form_id = fs.form_id
      WHERE fs.id = ?
    `).get(id) as any;
    return row || null;
  },

  getByExternalId(formId: string, externalSubmissionId: string): FormSubmissionRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT fs.*, f.name as form_name
      FROM form_submissions fs
      LEFT JOIN forms f ON f.form_id = fs.form_id
      WHERE fs.form_id = ? AND fs.external_submission_id = ?
    `).get(formId, externalSubmissionId) as any;
    return row || null;
  },

  create(data: {
    form_id: string;
    external_submission_id: string;
    submitter_name?: string | null;
    submitter_email?: string | null;
    submitter_phone?: string | null;
    answers: string;
    raw_payload?: string | null;
    status?: 'pending' | 'reviewed' | 'completed';
    notes?: string | null;
    submitted_at: string;
  }): FormSubmissionRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO form_submissions (
        id, form_id, external_submission_id, submitter_name, submitter_email, submitter_phone,
        answers, raw_payload, status, notes, submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.form_id,
      data.external_submission_id,
      data.submitter_name || null,
      data.submitter_email || null,
      data.submitter_phone || null,
      data.answers,
      data.raw_payload || null,
      data.status || 'pending',
      data.notes || null,
      data.submitted_at,
      now,
      now
    );

    return this.getById(id)!;
  },

  updateStatus(id: string, status: 'pending' | 'reviewed' | 'completed', notes?: string | null): FormSubmissionRecord | null {
    const db = getDb();
    const now = new Date().toISOString();

    if (notes !== undefined) {
      db.prepare(`
        UPDATE form_submissions
        SET status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(status, notes, now, id);
    } else {
      db.prepare(`
        UPDATE form_submissions
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).run(status, now, id);
    }

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM form_submissions WHERE id = ?').run(id);
    return res.changes > 0;
  },

  getAllForExport(params: {
    formId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): FormSubmissionRecord[] {
    const db = getDb();
    const whereClauses: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.formId) {
      whereClauses.push('fs.form_id = ?');
      sqlParams.push(params.formId);
    }
    if (params.status) {
      whereClauses.push('fs.status = ?');
      sqlParams.push(params.status);
    }
    if (params.startDate) {
      whereClauses.push('fs.submitted_at >= ?');
      sqlParams.push(params.startDate);
    }
    if (params.endDate) {
      whereClauses.push('fs.submitted_at <= ?');
      sqlParams.push(params.endDate);
    }

    const querySql = `
      SELECT fs.*, f.name as form_name
      FROM form_submissions fs
      LEFT JOIN forms f ON f.form_id = fs.form_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY fs.submitted_at DESC
    `;
    return db.prepare(querySql).all(...sqlParams) as any[];
  },

  getStats(): DashboardStats {
    const db = getDb();

    // Total forms
    const totalFormsRow = db.prepare('SELECT COUNT(*) as count FROM forms').get() as any;
    const totalForms = Number(totalFormsRow?.count || 0);

    // Active forms
    const activeFormsRow = db.prepare("SELECT COUNT(*) as count FROM forms WHERE status = 'Active'").get() as any;
    const activeForms = Number(activeFormsRow?.count || 0);

    // Total submissions
    const totalSubmissionsRow = db.prepare('SELECT COUNT(*) as count FROM form_submissions').get() as any;
    const totalSubmissions = Number(totalSubmissionsRow?.count || 0);

    // Today submissions (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const todaySubmissionsRow = db.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE submitted_at >= ?').get(yesterday) as any;
    const todaySubmissions = Number(todaySubmissionsRow?.count || 0);

    // Submissions by Form
    const byFormRows = db.prepare(`
      SELECT f.form_id as formId, f.name as formName, COUNT(fs.id) as count
      FROM forms f
      LEFT JOIN form_submissions fs ON fs.form_id = f.form_id
      GROUP BY f.form_id, f.name
      ORDER BY count DESC
    `).all() as any[];
    const submissionsByForm = byFormRows.map(r => ({
      formId: r.formId,
      formName: r.formName,
      count: Number(r.count || 0)
    }));

    // Submissions by Status
    const byStatusRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM form_submissions
      GROUP BY status
    `).all() as any[];
    const submissionsByStatus = byStatusRows.map(r => ({
      status: r.status,
      count: Number(r.count || 0)
    }));

    // Timeline (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const timelineRows = db.prepare(`
      SELECT substr(submitted_at, 1, 10) as date, COUNT(*) as count
      FROM form_submissions
      WHERE substr(submitted_at, 1, 10) >= ?
      GROUP BY substr(submitted_at, 1, 10)
      ORDER BY date ASC
    `).all(fourteenDaysAgo) as any[];
    const timeline = timelineRows.map(r => ({
      date: r.date,
      count: Number(r.count || 0)
    }));

    // Question distribution for key dropdown/multiple choice questions
    const questionDistributions: { question: string; answers: { label: string; count: number }[] }[] = [];
    const allSubmissions = db.prepare('SELECT answers FROM form_submissions LIMIT 200').all() as any[];
    const positionCounts: Record<string, number> = {};

    for (const sub of allSubmissions) {
      try {
        const answers: SubmissionAnswer[] = JSON.parse(sub.answers);
        for (const ans of answers) {
          const qLower = ans.question.toLowerCase();
          if (qLower.includes('position') || qLower.includes('role')) {
            const val = String(ans.answer || 'Not specified');
            positionCounts[val] = (positionCounts[val] || 0) + 1;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (Object.keys(positionCounts).length > 0) {
      questionDistributions.push({
        question: 'Position Contested For',
        answers: Object.entries(positionCounts).map(([label, count]) => ({ label, count }))
      });
    }

    return {
      totalForms,
      totalSubmissions,
      todaySubmissions,
      activeForms,
      submissionsByForm,
      submissionsByStatus,
      timeline,
      questionDistributions
    };
  }
};

export const webhookLogsRepo = {
  create(data: {
    form_id?: string | null;
    external_submission_id?: string | null;
    status: 'success' | 'duplicate' | 'error' | 'unauthorized';
    status_code: number;
    message?: string | null;
    error_message?: string | null;
    payload: string;
    headers?: string | null;
    ip?: string | null;
    user_agent?: string | null;
  }): WebhookLogRecord {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO webhook_logs (
        id, form_id, external_submission_id, status, status_code, message, error_message,
        payload, headers, ip, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.form_id || null,
      data.external_submission_id || null,
      data.status,
      data.status_code,
      data.message || null,
      data.error_message || null,
      data.payload,
      data.headers || null,
      data.ip || null,
      data.user_agent || null,
      now
    );

    const row = db.prepare('SELECT * FROM webhook_logs WHERE id = ?').get(id) as any;
    return row;
  },

  list(params: { limit?: number; page?: number; status?: string }): { items: WebhookLogRecord[]; total: number } {
    const db = getDb();
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const page = Math.max(1, params.page || 1);
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (params.status) {
      whereClauses.push('status = ?');
      sqlParams.push(params.status);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM webhook_logs WHERE ${whereSql}`).get(...sqlParams) as any;
    const total = Number(countRow?.total || 0);

    const items = db.prepare(`
      SELECT * FROM webhook_logs
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...sqlParams, limit, offset) as any[];

    return { items, total };
  },

  getById(id: string): WebhookLogRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM webhook_logs WHERE id = ?').get(id) as any;
    return row || null;
  }
};
