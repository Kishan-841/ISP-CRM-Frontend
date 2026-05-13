'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuditStore } from '@/lib/store';
import { X } from 'lucide-react';

function DescriptionBody({ text }) {
  // Backfilled rows store { snapshot, context } as a JSON string in description.
  // Pretty-print if parseable as JSON; otherwise render as plain text.
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  if (parsed && typeof parsed === 'object') {
    return (
      <pre className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-800 text-xs overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  }
  return <div className="mt-1">{text}</div>;
}

export default function AuditEventDrawer({ eventId, onClose }) {
  const [row, setRow] = useState(null);
  const setFilter = useAuditStore(s => s.setFilter);

  useEffect(() => {
    if (!eventId) { setRow(null); return; }
    api.get(`/audit/events/${eventId}`).then(r => setRow(r.data.data)).catch(() => setRow(null));
  }, [eventId]);

  if (!eventId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-[480px] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold">Event detail</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!row ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : (
          <div className="p-4 space-y-3 text-sm">
            <div className="text-base">
              <button
                onClick={() => { if (row.actorId) { setFilter('actorIds', [row.actorId]); onClose(); } }}
                disabled={!row.actorId}
                className="font-medium hover:underline disabled:no-underline disabled:cursor-default">
                {row.actorName || '—'}
              </button>{' '}
              <span className="text-slate-500">({row.actorRole || row.actorType})</span>{' '}
              <span className="font-mono">{row.action}</span>{' '}
              {(row.entityLabel || (row.entityType && row.entityId)) && (
                <button
                  onClick={() => { if (row.entityId) { setFilter('entityId', row.entityId); onClose(); } }}
                  className="hover:underline">
                  {row.entityType}{' '}
                  {row.entityLabel
                    ? <>&ldquo;{row.entityLabel}&rdquo;</>
                    : <span className="font-mono text-xs">{row.entityId.slice(0, 8)}…</span>}
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div>{new Date(row.createdAt).toLocaleString('en-IN')} · IP {row.ipAddress || '—'}</div>
              <div>{row.httpMethod} {row.routePath} · request {row.requestId ? row.requestId.slice(0, 8) + '…' : '—'}</div>
              {row.userAgent && <div className="break-all">{row.userAgent}</div>}
            </div>

            {Array.isArray(row.changes) && row.changes.length > 0 && (
              <div>
                <div className="font-medium mb-1 text-xs uppercase text-slate-500">Changes</div>
                <table className="w-full text-xs font-mono">
                  <tbody>
                    {row.changes.map((c, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-3 text-slate-600 dark:text-slate-300 align-top">{c.field}</td>
                        <td className="py-1 pr-3 text-red-600 line-through align-top">
                          {JSON.stringify(c.oldValue)}
                        </td>
                        <td className="py-1 text-green-700 dark:text-green-400 align-top">
                          {JSON.stringify(c.newValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {row.snapshot && typeof row.snapshot === 'object' && Object.keys(row.snapshot).length > 0 && (
              <details className="border border-slate-200 dark:border-slate-700 rounded">
                <summary className="cursor-pointer px-3 py-2 text-xs uppercase text-slate-500 select-none">
                  Snapshot ({Object.keys(row.snapshot).length} fields)
                </summary>
                <pre className="p-2 text-xs overflow-x-auto whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800">
                  {JSON.stringify(row.snapshot, null, 2)}
                </pre>
              </details>
            )}

            {row.description && (
              <div>
                <span className="text-xs uppercase text-slate-500">Description</span>
                <DescriptionBody text={row.description} />
              </div>
            )}

            {row.reason && (
              <div>
                <span className="text-xs uppercase text-slate-500">Reason</span>
                <div>{row.reason}</div>
              </div>
            )}

            {row.errorMessage && (
              <div className="text-red-600">
                <span className="text-xs uppercase">Error</span>
                <div>{row.errorMessage}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
