'use client';

import React, { useState, useEffect } from 'react';
import { WebhookLogRecord } from '@/lib/types';
import { ShieldCheck, Copy, Check, Terminal, RefreshCw, AlertTriangle, CheckCircle2, Code2, BookOpen } from 'lucide-react';

interface IntegrationLogsViewProps {
  onOpenAppsScript: () => void;
  onRefreshAll: () => void;
}

export default function IntegrationLogsView({
  onOpenAppsScript,
  onRefreshAll
}: IntegrationLogsViewProps) {
  const [logs, setLogs] = useState<WebhookLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const webhookSecret = 'gforms_sec_7f9a8d4c2b1e0f3a5e8c';
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/google-forms`);
    }
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/integration-logs?limit=30');
      const data = await res.json();
      if (data.success) {
        setLogs(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'url' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleRetry = async (logId: string) => {
    setIsRetrying(logId);
    try {
      const res = await fetch(`/api/integration-logs/${logId}/retry`, { method: 'POST' });
      await fetchLogs();
      onRefreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetrying(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Settings & Integration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Google Sheets & Forms synchronization, webhook credentials, and delivery logs</p>
        </div>

        <button
          onClick={onOpenAppsScript}
          className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
        >
          <Code2 className="w-4 h-4" />
          <span>Apps Script Guide</span>
        </button>
      </div>

      {/* Apps Script Setup Banner inside Settings */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Google Apps Script Integration Guide</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Connect your Google Form and Google Sheet directly to this dashboard. Get the ready-to-run <span className="font-mono font-medium text-slate-800 bg-white/70 px-1 py-0.5 rounded border border-blue-200">Code.gs</span> script, step-by-step setup guide, and trigger installation instructions.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAppsScript}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition shadow-sm whitespace-nowrap self-start md:self-center"
        >
          <Terminal className="w-4 h-4 text-blue-600" />
          <span>Open Guide & Script</span>
        </button>
      </div>

      {/* Integration Credentials Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Active Webhook Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Webhook Endpoint */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Webhook Endpoint URL</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
              <button
                onClick={() => handleCopy(webhookUrl, 'url')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                title="Copy URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Webhook Secret (Header: x-webhook-secret)</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookSecret}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
              <button
                onClick={() => handleCopy(webhookSecret, 'secret')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                title="Copy Secret"
              >
                {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Delivery Logs ({logs.length})</h3>
          <button
            onClick={fetchLogs}
            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">STATUS</th>
                <th className="px-5 py-3">FORM / ID</th>
                <th className="px-5 py-3">MESSAGE</th>
                <th className="px-5 py-3">TIMESTAMP</th>
                <th className="px-5 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No webhook calls recorded yet. Form submissions will appear here once received.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isDup = log.status === 'duplicate';
                  const isError = log.status === 'error' || log.status === 'unauthorized';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDup
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {isError && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {log.status} ({log.status_code})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-700">
                        {log.form_id || 'Global'}
                        {log.external_submission_id && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {log.external_submission_id}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="truncate text-slate-800">{log.message || 'Webhook invocation'}</p>
                        {log.error_message && (
                          <p className="text-[10px] text-rose-600 truncate">{log.error_message}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                        {log.payload && (
                          <button
                            onClick={() => setSelectedPayload(log.payload || null)}
                            className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold hover:underline"
                          >
                            View Payload
                          </button>
                        )}
                        {isError && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={isRetrying === log.id}
                            className="text-amber-600 hover:text-amber-800 text-[11px] font-semibold hover:underline disabled:opacity-50"
                          >
                            {isRetrying === log.id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Recorded Webhook Payload</h3>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-96">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedPayload), null, 2);
                } catch {
                  return selectedPayload;
                }
              })()}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
