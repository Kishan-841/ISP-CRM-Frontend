'use client';
import { useEffect, useState } from 'react';
import { X, Globe, Code2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuditStore } from '@/lib/store';
import {
  humanizeField, formatScalar, isComplex, isUserRefField, actionVerb, actionBadgeClass,
  formatTimestamp, shortUserAgent,
} from '@/lib/auditFormat';
import ChangeList from './ChangeList';
import RawJsonModal from './RawJsonModal';

// Backfilled rows stored a JSON blob in `description`; we hide those here and
// leave them to the raw view. Plain-text descriptions render normally.
function isJsonish(text) {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (!(t.startsWith('{') || t.startsWith('['))) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

// Friendly key-field list for CREATE/DELETE events (which carry a full
// snapshot instead of a diff). Shows only scalar, non-empty top-level fields.
function SnapshotSummary({ snapshot, userMap }) {
  const [showAll, setShowAll] = useState(false);
  // Keep user-reference ids (they resolve to names) but drop opaque ids.
  const entries = Object.entries(snapshot)
    .filter(([k, v]) => !isComplex(v) && v !== null && v !== undefined && v !== '')
    .filter(([k]) => isUserRefField(k) || (!/^id$/i.test(k) && !/Id$/.test(k)))
    .filter(([k]) => !['createdAt', 'updatedAt'].includes(k));

  if (entries.length === 0) return <div className="text-sm text-slate-500">No readable fields.</div>;
  const shown = showAll ? entries : entries.slice(0, 10);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
        {shown.map(([k, v]) => (
          <div key={k} className="contents">
            <div className="text-slate-500 dark:text-slate-400 truncate">{humanizeField(k)}</div>
            <div className="text-slate-800 dark:text-slate-200 break-words">{formatScalar(v, k, userMap)}</div>
          </div>
        ))}
      </div>
      {entries.length > 10 && (
        <button onClick={() => setShowAll(s => !s)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          {showAll ? 'Show less' : `Show ${entries.length - 10} more`}
        </button>
      )}
    </div>
  );
}

export default function AuditEventDrawer({ eventId, onClose }) {
  const [row, setRow] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [showRaw, setShowRaw] = useState(false);
  const setFilter = useAuditStore(s => s.setFilter);

  useEffect(() => {
    if (!eventId) { setRow(null); setUserMap({}); return; }
    setRow(null);
    setUserMap({});
    api.get(`/audit/events/${eventId}`)
      .then(r => { setRow(r.data.data); setUserMap(r.data.userMap || {}); })
      .catch(() => setRow(null));
  }, [eventId]);

  // Lock the page behind the drawer (and its raw-data modal) so scrolling
  // inside the panel doesn't chain to the body.
  useEffect(() => {
    if (!eventId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [eventId]);

  if (!eventId) return null;

  const hasChanges = row && Array.isArray(row.changes) && row.changes.length > 0;
  const hasSnapshot = row && row.snapshot && typeof row.snapshot === 'object' && Object.keys(row.snapshot).length > 0;
  const hasRaw = hasChanges || hasSnapshot;

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <h3 className="font-semibold">Event detail</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!row ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Headline: action badge + timestamp */}
            <div className="flex items-center justify-between gap-3">
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${actionBadgeClass(row.action)}`}>
                {row.action}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(row.createdAt)}</span>
            </div>

            {/* Who did what to which entity, in a sentence */}
            <div className="text-[15px] leading-relaxed">
              <button
                onClick={() => { if (row.actorId) { setFilter('actorIds', [row.actorId]); onClose(); } }}
                disabled={!row.actorId}
                className="font-semibold hover:underline disabled:no-underline disabled:cursor-default">
                {row.actorName || 'System'}
              </button>
              {(row.actorRole || row.actorType) && (
                <span className="text-slate-500"> · {row.actorRole || row.actorType}</span>
              )}
              <span className="text-slate-600 dark:text-slate-300"> {actionVerb(row.action)} </span>
              {(row.entityLabel || row.entityType) && (
                <button
                  onClick={() => { if (row.entityId) { setFilter('entityId', row.entityId); onClose(); } }}
                  disabled={!row.entityId}
                  className="hover:underline disabled:no-underline disabled:cursor-default">
                  <span className="text-slate-500">{row.entityType}</span>
                  {row.entityLabel
                    ? <span className="font-medium"> “{row.entityLabel}”</span>
                    : row.entityId && <span className="font-mono text-xs"> {row.entityId.slice(0, 8)}…</span>}
                </button>
              )}
            </div>

            {/* What changed */}
            {hasChanges ? (
              <Section title={`What changed (${row.changes.length})`}>
                <ChangeList changes={row.changes} userMap={userMap} />
              </Section>
            ) : hasSnapshot ? (
              <Section title={row.action === 'DELETE' ? 'Deleted record' : 'Record details'}>
                <SnapshotSummary snapshot={row.snapshot} userMap={userMap} />
              </Section>
            ) : (
              <div className="text-sm text-slate-500">No field changes recorded.</div>
            )}

            {/* Raw data escape hatch */}
            {hasRaw && (
              <button
                onClick={() => setShowRaw(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Code2 className="w-3.5 h-3.5" />
                View raw data
              </button>
            )}

            {/* Human description — skip backfill rows that stored JSON here
                (that content is reachable via "View raw data"). */}
            {row.description && !isJsonish(row.description) && (
              <Section title="Description">
                <div className="text-sm text-slate-700 dark:text-slate-300">{row.description}</div>
              </Section>
            )}

            {/* Reason — user-supplied "why", surface it prominently */}
            {row.reason && (
              <Section title="Reason">
                <div className="text-sm text-slate-700 dark:text-slate-300">{row.reason}</div>
              </Section>
            )}

            {/* Error, if the action failed */}
            {row.errorMessage && (
              <Section title="Error">
                <div className="text-sm text-red-600 dark:text-red-400">{row.errorMessage}</div>
              </Section>
            )}

            {/* Context — where the request came from */}
            <Section title="Context">
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>IP {row.ipAddress || '—'}</span>
                </div>
                {(row.httpMethod || row.routePath) && (
                  <div className="break-all">
                    <span className="font-mono">{row.httpMethod} {row.routePath}</span>
                  </div>
                )}
                {row.userAgent && <div>{shortUserAgent(row.userAgent)}</div>}
                {row.requestId && <div>Request {row.requestId.slice(0, 8)}…</div>}
              </div>
            </Section>
          </div>
        )}
      </div>

      {showRaw && <RawJsonModal row={row} onClose={() => setShowRaw(false)} />}
    </div>
  );
}
