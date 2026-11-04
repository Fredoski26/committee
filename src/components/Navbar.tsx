'use client';

import React from 'react';
import { Settings, ExternalLink, RefreshCw, Code2, BarChart3, Database } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'forms' | 'responses' | 'analytics' | 'integration';
  onTabChange: (tab: 'dashboard' | 'forms' | 'responses' | 'analytics' | 'integration') => void;
  onOpenAppsScript: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function Navbar({
  currentTab,
  onTabChange,
  onOpenAppsScript,
  onRefresh,
  isRefreshing
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tabs */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Form<span className="text-blue-600">Builder</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-1.5">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-blue-100/80 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => onTabChange('forms')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentTab === 'forms'
                  ? 'bg-blue-100/80 text-blue-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              My Forms
            </button>

            <button
              onClick={() => onTabChange('responses')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentTab === 'responses'
                  ? 'bg-blue-100/80 text-blue-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Responses
            </button>

            <button
              onClick={() => onTabChange('analytics')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center space-x-1.5 ${
                currentTab === 'analytics'
                  ? 'bg-blue-100/80 text-blue-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => onTabChange('integration')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center space-x-1.5 ${
                currentTab === 'integration'
                  ? 'bg-blue-100/80 text-blue-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Webhook & Logs</span>
            </button>
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={onOpenAppsScript}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-sm"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Apps Script Guide</span>
          </button>

          <button
            onClick={() => onTabChange('integration')}
            className="flex items-center space-x-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
