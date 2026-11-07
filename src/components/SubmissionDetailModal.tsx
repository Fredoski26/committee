'use client';

import React, { useState } from 'react';
import { FormSubmissionRecord, SubmissionAnswer, SubmissionStatus } from '@/lib/types';
import { X, Calendar, User, Mail, Phone, FileCode, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface SubmissionDetailModalProps {
  submission: FormSubmissionRecord | null;
  onClose: () => void;
  onStatusUpdated?: (id: string, newStatus: SubmissionStatus, notes?: string) => void;
}

export default function SubmissionDetailModal({
  submission,
  onClose
}: SubmissionDetailModalProps) {
  if (!submission) return null;

  let answers: SubmissionAnswer[] = [];
  try {
    const parsed = JSON.parse(submission.answers);
    if (Array.isArray(parsed)) {
      answers = parsed;
    } else if (typeof parsed === 'object') {
      answers = Object.entries(parsed).map(([q, a]) => ({ question: q, answer: a as any }));
    }
  } catch {
    answers = [];
  }

  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {submission.form_name || submission.form_id}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {submission.external_submission_id}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                submission.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : submission.status === 'reviewed'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                {submission.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {submission.status === 'reviewed' && <Clock className="w-3 h-3 mr-1" />}
                {submission.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                {submission.status}
              </span>
            </div>
            <h2 className="text-2xl font-black mt-2 text-white">
              {submission.submitter_name || 'Form Submission Details'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Submitted on {new Date(submission.submitted_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          
          {/* Submitter Quick Contact Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Name</div>
                <div className="text-xs font-bold text-slate-800">{submission.submitter_name || 'Not provided'}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Email</div>
                <div className="text-xs font-bold text-slate-800 truncate" title={submission.submitter_email || ''}>
                  {submission.submitter_email || 'Not provided'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Phone</div>
                <div className="text-xs font-bold text-slate-800">{submission.submitter_phone || 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* Optional Existing Notes Display (read-only if present) */}
          {submission.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Administrative Notes
              </div>
              <div className="text-xs text-slate-800 whitespace-pre-wrap">
                {submission.notes}
              </div>
            </div>
          )}

          {/* Questions & Answers Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Submitted Question & Answer Responses ({answers.length})</span>
            </h3>

            <div className="space-y-3">
              {answers.map((item, idx) => {
                const isSectionHeader = item.question.startsWith('PART ') || item.question === 'FOR OFFICIAL USE ONLY' || item.question === 'SUBMISSION';
                
                if (isSectionHeader) {
                  return (
                    <div key={idx} className="pt-2 pb-1">
                      <div className="text-xs font-extrabold tracking-wide text-blue-700 uppercase bg-blue-50/80 px-3 py-1.5 rounded-lg border border-blue-200/50">
                        {item.question}
                      </div>
                    </div>
                  );
                }

                let answerDisplay: React.ReactNode = item.answer as any;
                if (Array.isArray(item.answer)) {
                  answerDisplay = item.answer.join(', ');
                } else if (item.answer === null || item.answer === undefined || item.answer === '') {
                  answerDisplay = <span className="text-slate-400 italic">No answer provided</span>;
                }

                return (
                  <div key={idx} className="p-3.5 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 transition">
                    <div className="text-xs font-bold text-slate-500 mb-1">
                      {item.question}
                    </div>
                    <div className="text-sm font-medium text-slate-900 whitespace-pre-wrap">
                      {answerDisplay}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Payload Inspector Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showRaw ? 'Hide Raw Webhook Payload' : 'Inspect Raw Webhook Payload'}</span>
            </button>

            {showRaw && (
              <pre className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] overflow-x-auto font-mono">
                {JSON.stringify(JSON.parse(submission.raw_payload || '{}'), null, 2)}
              </pre>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
