'use client';
import { useEffect, useState } from 'react';
import { useAuditStore } from '@/lib/store';
import api from '@/lib/api';
import { X } from 'lucide-react';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

export default function AuditFilterBar() {
  const { filters, setFilter, clearFilters } = useAuditStore();
  const [filterMeta, setFilterMeta] = useState({ actors: [], entityTypes: [], eventTypes: [] });
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    api.get('/audit/events/filters')
      .then(r => setFilterMeta(r.data.data || { actors: [], entityTypes: [], eventTypes: [] }))
      .catch(() => { /* ignore — empty dropdowns are still usable */ });
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input className="flex-1 min-w-[200px] px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
               placeholder="Search actor / entity / description…"
               value={filters.search} onChange={e => setFilter('search', e.target.value)} />

        <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)}
               className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
        <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)}
               className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />

        <select value={filters.actorIds[0] || ''}
                onChange={e => setFilter('actorIds', e.target.value ? [e.target.value] : [])}
                className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
          <option value="">All users</option>
          {filterMeta.actors.map(a => (
            <option key={a.id} value={a.id}>{a.name} · {a.role}</option>
          ))}
        </select>

        <select value={filters.entityTypes[0] || ''}
                onChange={e => setFilter('entityTypes', e.target.value ? [e.target.value] : [])}
                className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
          <option value="">All entities</option>
          {filterMeta.entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filters.actions[0] || ''}
                onChange={e => setFilter('actions', e.target.value ? [e.target.value] : [])}
                className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filters.actorType}
                onChange={e => setFilter('actorType', e.target.value)}
                className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
          <option value="">Staff + customers (default)</option>
          <option value="STAFF">Staff only</option>
          <option value="CUSTOMER">Customers only</option>
          <option value="SYSTEM">System (cron, automated)</option>
        </select>

        <button onClick={() => setShowMore(s => !s)}
                className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-sm">
          {showMore ? '− Less' : '+ More'}
        </button>
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-2 pl-1">
          <input className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                 placeholder="IP address"
                 value={filters.ipAddress}
                 onChange={e => setFilter('ipAddress', e.target.value)} />
          <input className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                 placeholder="Event type (lead.update)"
                 value={filters.eventType}
                 onChange={e => setFilter('eventType', e.target.value)} />
          <input className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                 placeholder="Entity ID (UUID)"
                 value={filters.entityId}
                 onChange={e => setFilter('entityId', e.target.value)} />
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
                  className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
            <option value="">Any status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>
      )}

      <ActiveChips filters={filters} setFilter={setFilter} clearFilters={clearFilters} filterMeta={filterMeta} />
    </div>
  );
}

function ActiveChips({ filters, setFilter, clearFilters, filterMeta }) {
  const chips = [];
  if (filters.search)        chips.push({ k: 'search', reset: '',  label: `Search: ${filters.search}` });
  if (filters.dateFrom)      chips.push({ k: 'dateFrom', reset: '', label: `From: ${filters.dateFrom}` });
  if (filters.dateTo)        chips.push({ k: 'dateTo', reset: '',   label: `To: ${filters.dateTo}` });
  if (filters.actorIds[0]) {
    const a = filterMeta.actors.find(x => x.id === filters.actorIds[0]);
    chips.push({ k: 'actorIds', reset: [], label: `User: ${a?.name || filters.actorIds[0]}` });
  }
  if (filters.entityTypes[0]) chips.push({ k: 'entityTypes', reset: [], label: `Entity: ${filters.entityTypes[0]}` });
  if (filters.actions[0])     chips.push({ k: 'actions',     reset: [], label: `Action: ${filters.actions[0]}` });
  if (filters.actorType)      chips.push({ k: 'actorType', reset: '',   label: `Actor: ${filters.actorType}` });
  if (filters.ipAddress)      chips.push({ k: 'ipAddress', reset: '',   label: `IP: ${filters.ipAddress}` });
  if (filters.eventType)      chips.push({ k: 'eventType', reset: '',   label: `Event: ${filters.eventType}` });
  if (filters.entityId)       chips.push({ k: 'entityId',  reset: '',   label: `Entity ID: ${filters.entityId.slice(0,8)}…` });
  if (filters.status)         chips.push({ k: 'status',    reset: '',   label: `Status: ${filters.status}` });

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center text-xs">
      {chips.map(c => (
        <span key={c.k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          {c.label}
          <button onClick={() => setFilter(c.k, c.reset)} className="hover:text-blue-900 dark:hover:text-blue-100">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button onClick={clearFilters} className="text-slate-500 hover:underline ml-1">Clear all</button>
    </div>
  );
}
