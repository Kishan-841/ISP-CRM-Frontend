'use client';
import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

// Raw, unmodified audit payload — the source of truth behind the friendly
// view. Opened from the "View raw data" button in AuditEventDrawer.
export default function RawJsonModal({ row, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!row) return null;

  // Show the meaningful raw fields only — not the whole drawer state.
  const payload = {
    eventType: row.eventType,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    actor: { id: row.actorId, name: row.actorName, role: row.actorRole, type: row.actorType },
    changes: row.changes ?? null,
    snapshot: row.snapshot ?? null,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    httpMethod: row.httpMethod,
    routePath: row.routePath,
    requestId: row.requestId,
    status: row.status,
    createdAt: row.createdAt,
  };
  const text = JSON.stringify(payload, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
         onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-sm">Raw event data</h3>
          <div className="flex items-center gap-1">
            <button onClick={copy}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={onClose}
                    className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
          {text}
        </pre>
      </div>
    </div>
  );
}
