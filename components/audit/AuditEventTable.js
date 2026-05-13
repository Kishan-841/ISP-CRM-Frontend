'use client';
import { useEffect } from 'react';
import { useAuditStore } from '@/lib/store';

export default function AuditEventTable({ onRowClick }) {
  const { items, total, nextCursor, isLoading, error, fetchEvents } = useAuditStore();

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs text-slate-600 dark:text-slate-400 flex justify-between">
        <span>
          {total === null
            ? 'Showing recent events — narrow filters to get an exact count'
            : `Total: ${total.toLocaleString()}`}
        </span>
        {isLoading && <span className="text-slate-400">loading…</span>}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <tr>
            <th className="text-left px-4 py-2">Time</th>
            <th className="text-left px-4 py-2">Actor</th>
            <th className="text-left px-4 py-2">Action</th>
            <th className="text-left px-4 py-2">Entity</th>
            <th className="text-left px-4 py-2">IP</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={r.id}
                className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                onClick={() => onRowClick(r)}>
              <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                {new Date(r.createdAt).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-2">
                {r.actor?.name || <span className="text-slate-400">—</span>}{' '}
                <span className="text-xs text-slate-500">{r.actor?.role}</span>
              </td>
              <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
              <td className="px-4 py-2">
                {r.entityLabel || <span className="text-slate-400">—</span>}
                {r.changeCount > 0 && <span className="text-xs text-slate-500"> ({r.changeCount})</span>}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                {r.ipAddress || '—'}
              </td>
            </tr>
          ))}
          {items.length === 0 && !isLoading && (
            <tr>
              <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                No events match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {nextCursor && (
        <div className="p-3 text-center border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => fetchEvents(true)} disabled={isLoading}
                  className="px-4 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
