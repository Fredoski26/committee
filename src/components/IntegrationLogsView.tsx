'use client';

import React, { useState, useEffect } from 'react';
import { WebhookLogRecord } from '@/lib/types';
import { ShieldCheck, Copy, Check, Terminal, RefreshCw, AlertTriangle, Play, CheckCircle2 } from 'lucide-react';

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
  const [simulating, setSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

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
        setLogs(data.items);
      }
    } catch (err) {
      console.error(err);
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

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimulationMessage(null);
    try {
      const testPayload = {
        secret: webhookSecret,
        formId: 'class-of-1990-electoral',
        formName: 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM',
        externalSubmissionId: `sim_${Date.now()}`,
        submittedAt: new Date().toISOString(),
        submitterName: 'Hon. Florence O. Balogun',
        submitterEmail: 'f.balogun@alumni90.org',
        submitterPhone: '+234 802 345 6789',
        answers: [
          { question: 'Full Name', answer: 'Hon. Florence O. Balogun', type: 'text' },
          { question: 'Date of Birth', answer: '1973-08-20', type: 'date' },
          { question: 'Email Address', answer: 'f.balogun@alumni90.org', type: 'text' },
          { question: 'Phone Number', answer: '+234 802 345 6789', type: 'text' },
          { question: 'Class/Year Set', answer: 'Class of 1990', type: 'text' },
          { question: 'Position Contested For', answer: 'Vice President', type: 'dropdown' },
          { question: 'Why are you interested in contesting for this position?', answer: 'To support executive leadership, drive strategic partnerships, and coordinate committee sub-groups.', type: 'paragraph' },
          { question: 'Write your statement here', answer: 'Committed to empowering all alumni members and establishing an active mentorship initiative.', type: 'paragraph' },
          { question: 'Reference Name', answer: 'Engr. S. Adeleke', type: 'text' },
          { question: 'Reference Date', answer: '2026-09-11', type: 'date' },
          { question: "Contestant's Name", answer: 'Hon. Florence O. Balogun', type: 'text' },
          { question: 'Declaration Confirmation', answer: ['I confirm that I have read, understood, and agree to the declaration above.'], type: 'checkboxes' },
          { question: 'Declaration Date', answer: '2026-09-12', type: 'date' }
        ]
      };

      const res = await fetch('/api/webhooks/google-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret
        },
        body: JSON.stringify(testPayload)
      });

      const resData = await res.json();
      if (res.ok) {
        setSimulationMessage(`✅ Submission successfully received! ID: ${resData.submission?.id}`);
        await fetchLogs();
        onRefreshAll();
      } else {
        setSimulationMessage(`❌ Submission failed: ${resData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setSimulationMessage(`❌ Request error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Webhook & Integration Hub</h2>
          <p className="text-xs text-slate-500 mt-0.5">Secure Google Forms & Google Sheets communication logs</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateWebhook}
            disabled={simulating}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{simulating ? 'Sending Test...' : 'Simulate Live Submission'}</span>
          </button>
          
          <button
            onClick={onOpenAppsScript}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>Apps Script Guide</span>
          </button>
        </div>
      </div>

      {simulationMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900 flex items-center justify-between animate-in fade-in">
          <span>{simulationMessage}</span>
          <button onClick={() => setSimulationMessage(null)} className="text-blue-500 hover:text-blue-700">✕</button>
        </div>
      )}

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
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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
                {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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
                    No webhook calls recorded yet. Click "Simulate Live Submission" to test!
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
                          {log.status_code} {log.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{log.form_id || 'Global'}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                          {log.external_submission_id || 'N/A'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs truncate" title={log.error_message || log.message || ''}>
                        <div className="text-slate-800 font-medium truncate">{log.message || 'Webhook invocation'}</div>
                        {log.error_message && (
                          <div className="text-rose-500 text-[10px] truncate">{log.error_message}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => setSelectedPayload(log.payload)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                        >
                          Payload
                        </button>
                        {isError && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={isRetrying === log.id}
                            className="text-xs font-bold text-amber-600 hover:text-amber-800 transition"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono">Webhook Raw Request Body</h3>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <pre className="mt-4 p-4 bg-slate-950 rounded-2xl text-xs font-mono overflow-x-auto max-h-96">
              {JSON.stringify(JSON.parse(selectedPayload || '{}'), null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white"
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
