'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Search, RefreshCw } from 'lucide-react';

// Admin / Master / Sales Director audit log viewer. Paginated, filterable,
// expandable rows show the full before/after diff for any UPDATE and the
// full snapshot for any DELETE.

const ENTITY_LABELS = {
  LEAD: 'Lead',
  CAMPAIGN: 'Campaign',
  CAMPAIGN_DATA: 'Contact',
};

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ENTITY_COLORS = {
  LEAD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CAMPAIGN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CAMPAIGN_DATA: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const formatVal = (v) => {
  if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
  if (typeof v === 'object') return <span className="font-mono text-xs">{JSON.stringify(v)}</span>;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleString('en-IN');
  }
  return String(v);
};

const formatTimestamp = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
};

export default function AuditLogPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canView = user && (user.role === 'SUPER_ADMIN' || user.role === 'MASTER' || user.role === 'SALES_DIRECTOR');

  useEffect(() => {
    if (user && !canView) router.push('/dashboard');
  }, [user, canView, router]);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [actors, setActors] = useState([]);
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchActors = useCallback(async () => {
    try {
      const res = await api.get('/admin/audit-log/actors');
      setActors(res.data.items || []);
    } catch {
      // non-blocking — filter is optional
    }
  }, []);

  const fetchItems = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (userId) params.set('userId', userId);
      if (search) params.set('search', search);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const res = await api.get(`/admin/audit-log?${params}`);
      setItems(res.data.items || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [canView, pagination.page, pagination.limit, entityType, action, userId, search, fromDate, toDate]);

  useEffect(() => { fetchActors(); }, [fetchActors]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const onSearch = (e) => {
    e?.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setEntityType(''); setAction(''); setUserId(''); setSearchInput(''); setSearch('');
    setFromDate(''); setToDate('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  // Build a short human summary of the changes for the collapsed row
  const summarizeRow = (row) => {
    if (row.action === 'DELETE') {
      const snap = row.snapshot || {};
      const label =
        row.entityType === 'LEAD' ? (snap.leadNumber || snap.id) :
        row.entityType === 'CAMPAIGN' ? (snap.name || snap.id) :
        (snap.company || snap.name || snap.id);
      return `deleted ${ENTITY_LABELS[row.entityType] || row.entityType}: ${label || ''}`;
    }
    if (row.action === 'CREATE') {
      const snap = row.snapshot || {};
      const label =
        row.entityType === 'LEAD' ? (snap.leadNumber || snap.id) :
        row.entityType === 'CAMPAIGN' ? (snap.name || snap.id) :
        (snap.company || snap.name || snap.id);
      return `created ${ENTITY_LABELS[row.entityType] || row.entityType}: ${label || ''}`;
    }
    // UPDATE
    const changedFields = Object.keys(row.changes || {});
    if (changedFields.length === 0) return 'no changes recorded';
    if (changedFields.length <= 3) return `edited ${changedFields.join(', ')}`;
    return `edited ${changedFields.length} fields (${changedFields.slice(0, 3).join(', ')}, ...)`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Audit Log" description="Track every create, edit, and delete across leads, campaigns, and contacts." />

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <select
            className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
            value={entityType}
            onChange={e => { setEntityType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          >
            <option value="">All entities</option>
            <option value="LEAD">Lead</option>
            <option value="CAMPAIGN">Campaign</option>
            <option value="CAMPAIGN_DATA">Contact</option>
          </select>
          <select
            className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
            value={action}
            onChange={e => { setAction(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          >
            <option value="">All actions</option>
            <option value="CREATE">Created</option>
            <option value="UPDATE">Edited</option>
            <option value="DELETE">Deleted</option>
          </select>
          <select
            className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
            value={userId}
            onChange={e => { setUserId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          >
            <option value="">All users</option>
            {actors.map(a => (
              <option key={a.userId} value={a.userId}>{a.userName} ({a.userRole})</option>
            ))}
          </select>
          <Input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="h-8 text-sm"
          />
          <Input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={resetFilters} className="h-8">Reset</Button>
        </div>
        <form onSubmit={onSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              placeholder="Search by user name / email / entity id..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <Button type="submit" size="sm" className="h-8">Search</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => fetchItems()} className="h-8" title="Refresh">
            <RefreshCw size={14} />
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-600 dark:text-slate-300">
              <tr>
                <th className="text-left py-2 px-3 w-8"></th>
                <th className="text-left py-2 px-3 whitespace-nowrap">When</th>
                <th className="text-left py-2 px-3 whitespace-nowrap">Who</th>
                <th className="text-left py-2 px-3 whitespace-nowrap">Action</th>
                <th className="text-left py-2 px-3 whitespace-nowrap">Entity</th>
                <th className="text-left py-2 px-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">No audit entries match these filters.</td></tr>
              ) : items.map(row => {
                const isOpen = expandedId === row.id;
                return (
                  <Row key={row.id} row={row} isOpen={isOpen} onToggle={() => setExpandedId(isOpen ? null : row.id)} summary={summarizeRow(row)} />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span>Showing {items.length} of {pagination.total} entries</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-7"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
              Prev
            </Button>
            <span className="px-2">Page {pagination.page} / {pagination.totalPages}</span>
            <Button size="sm" variant="outline" className="h-7"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ row, isOpen, onToggle, summary }) {
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={onToggle}>
        <td className="py-2 px-3 align-top">
          {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        </td>
        <td className="py-2 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{formatTimestamp(row.createdAt)}</td>
        <td className="py-2 px-3 whitespace-nowrap">
          {row.userName ? (
            <div className="flex flex-col">
              <span className="font-medium text-slate-900 dark:text-slate-100">{row.userName}</span>
              <span className="text-[11px] text-slate-500">{row.userRole}</span>
            </div>
          ) : <span className="text-slate-400">system</span>}
        </td>
        <td className="py-2 px-3 whitespace-nowrap">
          <Badge className={`${ACTION_COLORS[row.action] || ''} border-0`}>{row.action}</Badge>
        </td>
        <td className="py-2 px-3 whitespace-nowrap">
          <Badge className={`${ENTITY_COLORS[row.entityType] || ''} border-0`}>{ENTITY_LABELS[row.entityType] || row.entityType}</Badge>
        </td>
        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 break-all">{summary}</td>
      </tr>
      {isOpen && (
        <tr className="bg-slate-50/60 dark:bg-slate-800/30">
          <td></td>
          <td colSpan={5} className="py-3 px-3">
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-400">
                <div><span className="font-medium">Entity ID:</span> <span className="font-mono">{row.entityId}</span></div>
                {row.userEmail && <div><span className="font-medium">Email:</span> {row.userEmail}</div>}
                {row.context?.endpoint && <div><span className="font-medium">Endpoint:</span> {row.context.endpoint}</div>}
                {row.context?.cascadedFromCampaignName && (
                  <div><span className="font-medium">Cascaded from campaign:</span> {row.context.cascadedFromCampaignName}</div>
                )}
              </div>
              {row.changes && Object.keys(row.changes).length > 0 && (
                <div>
                  <div className="font-semibold mb-1 text-slate-700 dark:text-slate-200">Field changes</div>
                  <table className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="text-left py-1.5 px-2 w-1/4">Field</th>
                        <th className="text-left py-1.5 px-2">Before</th>
                        <th className="text-left py-1.5 px-2">After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {Object.entries(row.changes).map(([field, { from, to }]) => (
                        <tr key={field}>
                          <td className="py-1.5 px-2 font-mono text-slate-700 dark:text-slate-300">{field}</td>
                          <td className="py-1.5 px-2 text-red-700 dark:text-red-300 break-all">{formatVal(from)}</td>
                          <td className="py-1.5 px-2 text-emerald-700 dark:text-emerald-300 break-all">{formatVal(to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {row.snapshot && (
                <details>
                  <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                    Full row snapshot ({row.action})
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto bg-slate-100 dark:bg-slate-800 p-3 rounded font-mono text-[11px] whitespace-pre-wrap break-all">
                    {JSON.stringify(row.snapshot, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
