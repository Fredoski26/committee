export type FormStatus = 'Active' | 'Inactive';
export type SubmissionStatus = 'pending' | 'reviewed' | 'completed';

export interface FormRecord {
  id: string;
  form_id: string;
  name: string;
  description: string | null;
  sheet_url: string | null;
  form_url: string | null;
  status: FormStatus;
  fields_count: number;
  created_at: string;
  updated_at: string;
  submissions_count?: number;
}

export interface SubmissionAnswer {
  question: string;
  answer: string | string[] | number | boolean | null;
  type?: string;
}

export interface FormSubmissionRecord {
  id: string;
  form_id: string;
  external_submission_id: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  answers: string; // JSON string of SubmissionAnswer[]
  raw_payload: string | null;
  status: SubmissionStatus;
  notes: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  form_name?: string;
}

export interface WebhookLogRecord {
  id: string;
  form_id: string | null;
  external_submission_id: string | null;
  status: 'success' | 'duplicate' | 'error' | 'unauthorized';
  status_code: number;
  message: string | null;
  error_message: string | null;
  payload: string;
  headers: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalForms: number;
  totalSubmissions: number;
  todaySubmissions: number;
  activeForms: number;
  submissionsByForm: { formId: string; formName: string; count: number }[];
  submissionsByStatus: { status: string; count: number }[];
  timeline: { date: string; count: number }[];
  questionDistributions?: { question: string; answers: { label: string; count: number }[] }[];
}
