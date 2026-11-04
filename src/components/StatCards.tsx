'use client';

import React from 'react';
import { FileText, ClipboardList, TrendingUp, CheckCircle2 } from 'lucide-react';

interface StatCardsProps {
  totalForms: number;
  totalSubmissions: number;
  todaySubmissions: number;
  activeForms: number;
  onFilterSubmissions?: (type: string) => void;
}

export default function StatCards({
  totalForms,
  totalSubmissions,
  todaySubmissions,
  activeForms,
  onFilterSubmissions
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Total Forms - Blue */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-6 text-white shadow-md shadow-blue-500/10 transition hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-blue-100">Total Forms</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4 text-4xl font-extrabold tracking-tight">{totalForms}</div>
        <div className="mt-2 text-xs font-medium text-blue-100/90">All time</div>
      </div>

      {/* 2. Total Submissions - Green */}
      <div 
        onClick={() => onFilterSubmissions && onFilterSubmissions('all')}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-6 text-white shadow-md shadow-emerald-500/10 transition hover:shadow-lg cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-emerald-100">Total Submissions</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4 text-4xl font-extrabold tracking-tight">{totalSubmissions}</div>
        <div className="mt-2 text-xs font-medium text-emerald-100/90">All forms combined</div>
      </div>

      {/* 3. Today's Submissions - Orange */}
      <div 
        onClick={() => onFilterSubmissions && onFilterSubmissions('today')}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-md shadow-orange-500/10 transition hover:shadow-lg cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-orange-100">Today's Submissions</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4 text-4xl font-extrabold tracking-tight">{todaySubmissions}</div>
        <div className="mt-2 text-xs font-medium text-orange-100/90">Last 24 hours</div>
      </div>

      {/* 4. Active Forms - Purple */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 p-6 text-white shadow-md shadow-purple-500/10 transition hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-purple-100">Active Forms</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4 text-4xl font-extrabold tracking-tight">{activeForms}</div>
        <div className="mt-2 text-xs font-medium text-purple-100/90">Currently accepting responses</div>
      </div>
    </div>
  );
}
