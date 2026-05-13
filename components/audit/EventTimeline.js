'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

/**
 * Compact timeline of audit events for a single entity. Used in History
 * tabs on Lead / Invoice / Complaint / Service Order detail pages.
 *
 * Props:
 *   - entityType: 'Lead' | 'Invoice' | 'Complaint' | 'ServiceOrder' | ...
 *   - entityId:   the UUID of the record
 *
 * Calls GET /api/audit/entity/:type/:id and renders rows oldest at the
 * bottom (desc).
 */
export default function EventTimeline({ entityType, entityId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entityId) { setItems([]); return; }
    setItems(null);
    setError(null);
    api.get(`/audit/entity/${entityType}/${entityId}`)
      .then(r => setItems(r.data.data || []))
      .catch(e => setError(e.response?.data?.message || e.message));
  }, [entityType, entityId]);

  if (error)        return <div className="p-4 text-red-600 text-sm">Error: {error}</div>;
  if (items === null) return <div className="p-4 text-slate-400 text-sm">Loading history…</div>;
  if (items.length === 0) return <div className="p-4 text-slate-400 text-sm">No history recorded.</div>;

  return (
    <ul className="space-y-3">
      {items.map(r => (
        <li key={r.id} className="border-l-2 border-slate-200 dark:border-slate-700 pl-3 text-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(r.createdAt).toLocaleString('en-IN')} · {r.ipAddress || '—'}
          </div>
          <div>
            <span className="font-medium">{r.actorName || 'System'}</span>{' '}
            <span className="text-slate-500">({r.actorRole || r.actorType})</span>{' '}
            <span className="font-mono text-xs">{r.action}</span>
          </div>
          {Array.isArray(r.changes) && r.changes.length > 0 && (
            <ul className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">
              {r.changes.slice(0, 3).map((c, i) => (
                <li key={i}>
                  {c.field}:{' '}
                  <span className="text-red-600 line-through">{JSON.stringify(c.oldValue)}</span>
                  {' → '}
                  <span className="text-green-700 dark:text-green-400">{JSON.stringify(c.newValue)}</span>
                </li>
              ))}
              {r.changes.length > 3 && (
                <li className="text-slate-400">… {r.changes.length - 3} more</li>
              )}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
