'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import StatCards from '@/components/StatCards';
import RecentForms from '@/components/RecentForms';
import RecentSubmissionsTable from '@/components/RecentSubmissionsTable';
import SubmissionDetailModal from '@/components/SubmissionDetailModal';
import GoogleAppsScriptModal from '@/components/GoogleAppsScriptModal';
import FormEditModal from '@/components/FormEditModal';
import AnalyticsView from '@/components/AnalyticsView';
import IntegrationLogsView from '@/components/IntegrationLogsView';
import { FormRecord, FormSubmissionRecord, DashboardStats, SubmissionStatus } from '@/lib/types';

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'forms' | 'responses' | 'analytics' | 'integration'>('dashboard');
  
  // Data states
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    totalSubmissions: 0,
    todaySubmissions: 0,
    activeForms: 0,
    submissionsByForm: [],
    submissionsByStatus: [],
    timeline: []
  });

  // Filter & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [activeSubmission, setActiveSubmission] = useState<FormSubmissionRecord | null>(null);
  const [editingForm, setEditingForm] = useState<FormRecord | null>(null);
  const [isAppsScriptOpen, setIsAppsScriptOpen] = useState(false);

  // Fetch Forms
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/forms');
      const data = await res.json();
      if (data.success) {
        setForms(data.forms);
      }
    } catch (err) {
      console.error('Error fetching forms:', err);
    }
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/form-responses/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async (isDashboard: boolean = false) => {
    try {
      const params = new URLSearchParams();
      if (selectedFormId) params.append('formId', selectedFormId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', isDashboard ? '5' : '10');

      const res = await fetch(`/api/form-responses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.items);
        setTotalSubmissions(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  }, [selectedFormId, selectedStatus, searchTerm, startDate, endDate, page]);

  // Refresh all
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchForms(),
      fetchStats(),
      fetchSubmissions(currentTab === 'dashboard')
    ]);
    setIsRefreshing(false);
  }, [fetchForms, fetchStats, fetchSubmissions, currentTab]);

  // Initial mount load
  useEffect(() => {
    fetchForms();
    fetchStats();
    fetchSubmissions(true);
  }, []); // Run ONCE on mount

  // Watch for filter/page/tab changes
  useEffect(() => {
    fetchSubmissions(currentTab === 'dashboard');
  }, [currentTab, page, selectedFormId, selectedStatus, searchTerm, startDate, endDate]);

  // Gentle background auto-refresh every 12 seconds so new submissions reflect automatically
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStats();
      fetchForms();
      fetchSubmissions(currentTab === 'dashboard');
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchStats, fetchForms, fetchSubmissions, currentTab]);

  // Handle Form actions
  const handleToggleStatus = async (formId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form and all its responses?')) return;
    try {
      const res = await fetch(`/api/forms/${formId}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Export
  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    if (selectedFormId) params.append('formId', selectedFormId);
    if (selectedStatus) params.append('status', selectedStatus);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('format', format);

    window.open(`/api/form-responses/export?${params.toString()}`, '_blank');
  };

  // Handle submission status updated in modal
  const handleStatusUpdated = (id: string, newStatus: SubmissionStatus, notes?: string) => {
    setSubmissions(prev =>
      prev.map(sub => (sub.id === id ? { ...sub, status: newStatus, notes: notes || sub.notes } : sub))
    );
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setPage(1);
        }}
        onOpenAppsScript={() => setIsAppsScriptOpen(true)}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Title & Subtitle */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {currentTab === 'dashboard' && 'Dashboard'}
            {currentTab === 'forms' && 'My Forms'}
            {currentTab === 'responses' && 'Form Responses'}
            {currentTab === 'analytics' && 'Analytics & Performance'}
            {currentTab === 'integration' && 'Integration & Webhook Hub'}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {currentTab === 'dashboard' && 'Overview of your forms and submissions'}
            {currentTab === 'forms' && 'Manage all connected Google Forms and sync parameters'}
            {currentTab === 'responses' && 'Browse, search, review and export dynamic form submissions'}
            {currentTab === 'analytics' && 'Deep dive into candidate distributions and submission trends'}
            {currentTab === 'integration' && 'Google Sheets & Apps Script real-time webhook status'}
          </p>
        </div>

        {/* Tab 1: Dashboard */}
        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stat Cards Row */}
            <StatCards
              totalForms={stats.totalForms}
              totalSubmissions={stats.totalSubmissions}
              todaySubmissions={stats.todaySubmissions}
              activeForms={stats.activeForms}
              onFilterSubmissions={() => setCurrentTab('responses')}
            />

            {/* Recent Forms Grid */}
            <RecentForms
              forms={forms}
              onViewForm={(formId) => {
                setSelectedFormId(formId);
                setCurrentTab('responses');
              }}
              onEditForm={(f) => setEditingForm(f)}
              onToggleStatus={handleToggleStatus}
              onDeleteForm={handleDeleteForm}
            />

            {/* Recent Submissions Table */}
            <RecentSubmissionsTable
              submissions={submissions}
              forms={forms}
              total={totalSubmissions}
              page={page}
              totalPages={totalPages}
              selectedFormId={selectedFormId}
              selectedStatus={selectedStatus}
              searchTerm={searchTerm}
              startDate={startDate}
              endDate={endDate}
              onSearchChange={setSearchTerm}
              onFormFilterChange={setSelectedFormId}
              onStatusFilterChange={setSelectedStatus}
              onDateChange={(s, e) => {
                setStartDate(s || '');
                setEndDate(e || '');
              }}
              onPageChange={setPage}
              onViewDetails={(sub) => setActiveSubmission(sub)}
              onExport={handleExport}
              fullView={false}
            />
          </div>
        )}

        {/* Tab 2: My Forms */}
        {currentTab === 'forms' && (
          <div className="space-y-6">
            <RecentForms
              forms={forms}
              onViewForm={(formId) => {
                setSelectedFormId(formId);
                setCurrentTab('responses');
              }}
              onEditForm={(f) => setEditingForm(f)}
              onToggleStatus={handleToggleStatus}
              onDeleteForm={handleDeleteForm}
            />
          </div>
        )}

        {/* Tab 3: Responses */}
        {currentTab === 'responses' && (
          <div className="space-y-6">
            <RecentSubmissionsTable
              submissions={submissions}
              forms={forms}
              total={totalSubmissions}
              page={page}
              totalPages={totalPages}
              selectedFormId={selectedFormId}
              selectedStatus={selectedStatus}
              searchTerm={searchTerm}
              startDate={startDate}
              endDate={endDate}
              onSearchChange={setSearchTerm}
              onFormFilterChange={setSelectedFormId}
              onStatusFilterChange={setSelectedStatus}
              onDateChange={(s, e) => {
                setStartDate(s || '');
                setEndDate(e || '');
              }}
              onPageChange={setPage}
              onViewDetails={(sub) => setActiveSubmission(sub)}
              onExport={handleExport}
              fullView={true}
            />
          </div>
        )}

        {/* Tab 4: Analytics */}
        {currentTab === 'analytics' && (
          <div>
            <AnalyticsView stats={stats} />
          </div>
        )}

        {/* Tab 5: Integration & Logs */}
        {currentTab === 'integration' && (
          <div>
            <IntegrationLogsView
              onOpenAppsScript={() => setIsAppsScriptOpen(true)}
              onRefreshAll={refreshAll}
            />
          </div>
        )}

      </main>

      {/* Modals */}
      <SubmissionDetailModal
        submission={activeSubmission}
        onClose={() => setActiveSubmission(null)}
        onStatusUpdated={handleStatusUpdated}
      />

      <FormEditModal
        form={editingForm}
        onClose={() => setEditingForm(null)}
        onSaved={refreshAll}
      />

      <GoogleAppsScriptModal
        isOpen={isAppsScriptOpen}
        onClose={() => setIsAppsScriptOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">FormBuilder</span>
            <span>•</span>
            <span>Google Forms Integration Engine</span>
          </div>
          <div>
            <span>Target: CLASS OF 1990 - ELECTORAL COMMITTEE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
