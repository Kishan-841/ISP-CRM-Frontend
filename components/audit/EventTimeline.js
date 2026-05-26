'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  humanizeField, formatScalar, changeKind, arrayDiff, collectionDiff, actionVerb, formatTimestamp,
} from '@/lib/auditFormat';

// One change rendered compactly for the timeline (no expand — just a summary).
function CompactChange({ change, userMap }) {
  const kind = changeKind(change);
  if (kind === 'array') {
    const { added, removed, oldCount, newCount } = arrayDiff(change.oldValue, change.newValue);
    const parts = [];
    if (added.length) parts.push(`${added.length} added`);
    if (removed.length) parts.push(`${removed.length} removed`);
    if (!parts.length) parts.push(`${oldCount} → ${newCount}`);
    return (
      <li>
        <span className="text-slate-500 dark:text-slate-400">{humanizeField(change.field)}:</span>{' '}
        <span className="text-slate-700 dark:text-slate-300">{parts.join(', ')}</span>
      </li>
    );
  }
  if (kind === 'collection') {
    const { added, removed, modified } = collectionDiff(change.oldValue, change.newValue);
    const parts = [];
    if (added.length) parts.push(`${added.length} added`);
    if (removed.length) parts.push(`${removed.length} removed`);
    if (modified.length) parts.push(`${modified.length} replaced`);
    return (
      <li>
        <span className="text-slate-500 dark:text-slate-400">{humanizeField(change.field)}:</span>{' '}
        <span className="text-slate-700 dark:text-slate-300">{parts.join(', ') || 'updated'}</span>
      </li>
    );
  }
  if (kind === 'object') {
    return (
      <li>
        <span className="text-slate-500 dark:text-slate-400">{humanizeField(change.field)}:</span>{' '}
        <span className="text-slate-700 dark:text-slate-300">updated</span>
      </li>
    );
  }
  const oldEmpty = change.oldValue === null || change.oldValue === undefined || change.oldValue === '';
  return (
    <li>
      <span className="text-slate-500 dark:text-slate-400">{humanizeField(change.field)}:</span>{' '}
      {!oldEmpty && (
        <>
          <span className="text-red-600 dark:text-red-400 line-through">{formatScalar(change.oldValue, change.field, userMap)}</span>
          {' → '}
        </>
      )}
      <span className="text-emerald-700 dark:text-emerald-400">{formatScalar(change.newValue, change.field, userMap)}</span>
    </li>
  );
}

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
  const [userMap, setUserMap] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entityId) { setItems([]); return; }
    setItems(null);
    setError(null);
    setUserMap({});
    api.get(`/audit/entity/${entityType}/${entityId}`)
      .then(r => { setItems(r.data.data || []); setUserMap(r.data.userMap || {}); })
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
            {formatTimestamp(r.createdAt)} · {r.ipAddress || '—'}
          </div>
          <div>
            <span className="font-medium">{r.actorName || 'System'}</span>{' '}
            <span className="text-slate-500">({r.actorRole || r.actorType})</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{actionVerb(r.action)}</span>
          </div>
          {Array.isArray(r.changes) && r.changes.length > 0 && (
            <ul className="text-xs mt-1 space-y-0.5">
              {r.changes.slice(0, 3).map((c, i) => (
                <CompactChange key={i} change={c} userMap={userMap} />
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
