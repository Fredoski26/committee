'use client';

import React from 'react';
import { DashboardStats } from '@/lib/types';
import { TrendingUp, PieChart, BarChart3, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AnalyticsViewProps {
  stats: DashboardStats;
}

export default function AnalyticsView({ stats }: AnalyticsViewProps) {
  const maxTimelineCount = Math.max(1, ...stats.timeline.map(t => t.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Analytics & Submissions Trends</h2>
        <p className="text-xs text-slate-500 mt-0.5">Aggregated response performance metrics and question distributions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Timeline Chart (Last 14 Days) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Response Volume (14 Days)</h3>
              <p className="text-xs text-slate-400">Incoming submissions over time</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {stats.timeline.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              No daily submission records yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-44 flex items-end gap-2 pt-6">
                {stats.timeline.map((item, idx) => {
                  const heightPercent = Math.max(8, (item.count / maxTimelineCount) * 100);
                  const shortDate = item.date.slice(5);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition mb-1">
                        {item.count}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md hover:from-blue-700 hover:to-blue-500 transition duration-150 cursor-pointer"
                        title={`${item.date}: ${item.count} submissions`}
                      />
                      <div className="text-[9px] text-slate-400 mt-2 truncate w-full text-center">
                        {shortDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Submissions by Google Form */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Submissions per Google Form</h3>
              <p className="text-xs text-slate-400">Traffic distribution across active forms</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {stats.submissionsByForm.map((f, idx) => {
              const pct = stats.totalSubmissions > 0 ? Math.round((f.count / stats.totalSubmissions) * 100) : 0;
              const barColors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-purple-600'];
              const color = barColors[idx % barColors.length];

              return (
                <div key={f.formId} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate max-w-[260px]">{f.formName}</span>
                    <span className="text-slate-500">{f.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${color} rounded-full transition-all duration-300`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Review Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Processing & Review Status</h3>
              <p className="text-xs text-slate-400">Submission workflow progression</p>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {['pending', 'reviewed', 'completed'].map((statusKey) => {
              const item = stats.submissionsByStatus.find(s => s.status === statusKey);
              const count = item ? item.count : 0;
              const pct = stats.totalSubmissions > 0 ? Math.round((count / stats.totalSubmissions) * 100) : 0;

              const config = {
                pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
                reviewed: { label: 'Reviewed', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
                completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 }
              }[statusKey]!;

              const Icon = config.icon;

              return (
                <div key={statusKey} className={`${config.bg} p-4 rounded-xl border border-slate-100 text-center`}>
                  <div className="inline-flex p-2 rounded-lg bg-white shadow-xs mb-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{count}</div>
                  <div className="text-xs font-semibold text-slate-600 capitalize mt-0.5">{config.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{pct}% of total</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Question Response Distribution (Position Contested For) */}
        {stats.questionDistributions && stats.questionDistributions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Candidate Position Distribution</h3>
                <p className="text-xs text-slate-400">{stats.questionDistributions[0].question}</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {stats.questionDistributions[0].answers.map((ans, idx) => {
                const totalAnswers = stats.questionDistributions![0].answers.reduce((acc, curr) => acc + curr.count, 0);
                const pct = totalAnswers > 0 ? Math.round((ans.count / totalAnswers) * 100) : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{ans.label}</span>
                      <span className="font-bold text-slate-900">{ans.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
