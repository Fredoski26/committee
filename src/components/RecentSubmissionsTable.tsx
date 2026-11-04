'use client';

import React from 'react';
import { FormSubmissionRecord, FormRecord } from '@/lib/types';
import { FileText, Search, Download, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface RecentSubmissionsTableProps {
  submissions: FormSubmissionRecord[];
  forms: FormRecord[];
  total: number;
  page: number;
  totalPages: number;
  selectedFormId?: string;
  selectedStatus?: string;
  searchTerm: string;
  startDate?: string;
  endDate?: string;
  onSearchChange: (val: string) => void;
  onFormFilterChange: (formId: string) => void;
  onStatusFilterChange: (status: string) => void;
  onDateChange: (start?: string, end?: string) => void;
  onPageChange: (newPage: number) => void;
  onViewDetails: (sub: FormSubmissionRecord) => void;
  onExport: (format: 'csv' | 'xlsx') => void;
  fullView?: boolean;
}

export default function RecentSubmissionsTable({
  submissions,
  forms,
  total,
  page,
  totalPages,
  selectedFormId,
  selectedStatus,
  searchTerm,
  startDate,
  endDate,
  onSearchChange,
  onFormFilterChange,
  onStatusFilterChange,
  onDateChange,
  onPageChange,
  onViewDetails,
  onExport,
  fullView = false
}: RecentSubmissionsTableProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      return { datePart, timePart };
    } catch {
      return { datePart: dateStr, timePart: '' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Reviewed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {fullView ? 'All Form Responses' : 'Recent Submissions'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {submissions.length} of {total} total responses
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onExport('csv')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => onExport('xlsx')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filter bar (in fullView or always available) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search submitter, text..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Form Filter */}
          <div>
            <select
              value={selectedFormId || ''}
              onChange={(e) => onFormFilterChange(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="">All Google Forms</option>
              {forms.map(f => (
                <option key={f.form_id} value={f.form_id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus || ''}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-1">
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="w-1/2 py-2 px-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              title="From date"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="w-1/2 py-2 px-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/60 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th scope="col" className="px-6 py-3.5">FORM</th>
              <th scope="col" className="px-6 py-3.5">SUBMITTER</th>
              <th scope="col" className="px-6 py-3.5">STATUS</th>
              <th scope="col" className="px-6 py-3.5">DATE</th>
              <th scope="col" className="px-6 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                  No submissions found matching your filters.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => {
                const { datePart, timePart } = formatDate(sub.submitted_at);
                let answersCount = 0;
                try {
                  const arr = JSON.parse(sub.answers);
                  answersCount = Array.isArray(arr) ? arr.length : Object.keys(arr).length;
                } catch {}

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                    {/* FORM */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{sub.form_name || sub.form_id}</div>
                          <div className="text-xs text-slate-400">{answersCount} fields answered</div>
                        </div>
                      </div>
                    </td>

                    {/* SUBMITTER */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {sub.submitter_name || 'Anonymous Submitter'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sub.submitter_email || sub.submitter_phone || 'No contact provided'}
                        </div>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sub.status)}
                    </td>

                    {/* DATE */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{datePart}</div>
                        <div className="text-xs text-slate-400">{timePart}</div>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onViewDetails(sub)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
