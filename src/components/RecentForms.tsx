'use client';

import React from 'react';
import { FormRecord } from '@/lib/types';
import { Folder, BarChart2, Eye, PauseCircle, PlayCircle, Trash2, Edit3, ExternalLink } from 'lucide-react';

interface RecentFormsProps {
  forms: FormRecord[];
  onViewForm: (formId: string) => void;
  onEditForm: (form: FormRecord) => void;
  onToggleStatus: (formId: string, currentStatus: string) => void;
  onDeleteForm: (formId: string) => void;
}

export default function RecentForms({
  forms,
  onViewForm,
  onEditForm,
  onToggleStatus,
  onDeleteForm
}: RecentFormsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Recent Forms</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {forms.slice(0, 6).map((form) => {
          const isActive = form.status === 'Active';

          return (
            <div
              key={form.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header: Title + Status Pill */}
                <div className="flex items-start justify-between gap-3">
                  <h3
                    onClick={() => onViewForm(form.form_id)}
                    className="font-bold text-slate-900 text-base leading-snug hover:text-blue-600 cursor-pointer transition line-clamp-1"
                    title={form.name}
                  >
                    {form.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {form.status}
                  </span>
                </div>

                {/* Subtitle / External links if any */}
                {form.sheet_url && (
                  <div className="mt-1">
                    <a
                      href={form.sheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline gap-1"
                    >
                      <span>Google Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Metrics: fields & responses */}
                <div className="flex items-center space-x-6 mt-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Folder className="w-4 h-4 text-slate-400" />
                    <span>{form.fields_count} fields</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-slate-700">{form.submissions_count ?? 0} responses</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onViewForm(form.form_id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition shadow-sm"
                >
                  View
                </button>
                <button
                  onClick={() => onEditForm(form)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => onToggleStatus(form.form_id, form.status)}
                  title={isActive ? 'Deactivate Form' : 'Activate Form'}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  {isActive ? (
                    <PauseCircle className="w-4 h-4" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
                <button
                  onClick={() => onDeleteForm(form.form_id)}
                  title="Delete Form"
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
