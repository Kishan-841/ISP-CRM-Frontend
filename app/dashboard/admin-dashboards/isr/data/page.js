'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Mail, ClipboardList, Clock, AlertCircle, Users, Calendar, Filter } from 'lucide-react';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const BUCKET_LABEL = {
  assigned:  'Total Assigned',
  working:   'Working Data',
  pending:   'Pending Data',
  converted: 'Converted to Lead',
};

// Per-bucket visual hint — colour + icon + one-line subtitle. Mirrors the
// source dashboard cards so the user keeps their orientation across the
// drill-in transition.
const BUCKET_THEME = {
  assigned: {
    icon: ClipboardList,
    accent: 'from-orange-500 to-orange-600',
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    subtitle: 'Every campaign data record assigned to an ISR.',
  },
  working: {
    icon: Clock,
    accent: 'from-blue-500 to-indigo-600',
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    subtitle: 'Records where at least one call attempt has been recorded.',
  },
  pending: {
    icon: AlertCircle,
    accent: 'from-amber-500 to-orange-500',
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    subtitle: 'New records still waiting on their first call attempt.',
  },
  converted: {
    icon: Users,
    accent: 'from-emerald-500 to-teal-600',
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    subtitle: 'Records marked Interested by the ISR — handed off to BDM.',
  },
};

const PERIOD_LABEL = {
  last7days: 'Last 7 Days',
  monthly:   'Last 30 Days',
  yearly:    'Last 365 Days',
  alltime:   'All Time',
  today:     'Today',
  mtd:       'Month to Date',
  ytd:       'Year to Date',
  lastMonth: 'Last Month',
  lastYear:  'Last Year',
  custom:    'Custom Range',
};

const OUTCOME_COLOR = {
  INTERESTED:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NOT_INTERESTED:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  NOT_REACHABLE:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CALL_LATER:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  WRONG_NUMBER:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RINGING_NOT_PICKED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DND:                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  OTHERS:             'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  NEW:                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'MASTER', 'SALES_DIRECTOR', 'BDM_TEAM_LEADER', 'OPS_TEAM']);

export default function IsrDataDrillPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuthStore();

  const bucket   = sp.get('bucket')   || 'assigned';
  const period   = sp.get('period')   || null;
  const fromDate = sp.get('fromDate') || null;
  const toDate   = sp.get('toDate')   || null;
  const userId   = sp.get('userId')   || null;

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Access gate — matches the parent dashboard's `isAllowed` exactly.
  useEffect(() => {
    if (user && !ALLOWED_ROLES.has(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Debounce the search input so each keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const p = new URLSearchParams({
        bucket,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search)   p.set('search', search);
      if (period)   p.set('period', period);
      if (fromDate) p.set('fromDate', fromDate);
      if (toDate)   p.set('toDate', toDate);
      if (userId)   p.set('userId', userId);

      const res = await api.get(`/campaigns/isr-data?${p.toString()}`);
      setRows(res.data.items || []);
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination?.total || 0,
        totalPages: res.data.pagination?.totalPages || 0,
      }));
    } catch (e) {
      console.error('Drill-in fetch failed:', e);
      toast.error('Failed to load drill-in data');
    } finally {
      setIsLoading(false);
    }
  }, [bucket, period, fromDate, toDate, userId, search, pagination.page, pagination.limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (r) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-slate-900 dark:text-slate-100">{r.company || '—'}</p>
          {r.name && <p className="text-xs text-slate-500 dark:text-slate-400">{r.name}{r.title ? ` · ${r.title}` : ''}</p>}
          {(r.city || r.state) && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{[r.city, r.state].filter(Boolean).join(', ')}</p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Phone / Email',
      render: (r) => (
        <div className="text-xs space-y-1 max-w-[200px]">
          {r.phone && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Phone size={11} className="text-slate-400 shrink-0" />
              <span className="truncate" title={r.phone}>{r.phone}</span>
            </div>
          )}
          {r.email && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Mail size={11} className="text-slate-400 shrink-0" />
              <span className="truncate" title={r.email}>{r.email}</span>
            </div>
          )}
          {!r.phone && !r.email && <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'campaign',
      label: 'Campaign',
      render: (r) => r.campaign ? (
        <div className="text-xs">
          <p className="font-medium text-slate-700 dark:text-slate-300">{r.campaign.code}</p>
          <p className="text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{r.campaign.name}</p>
        </div>
      ) : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      key: 'isr',
      label: 'Assigned ISR',
      render: (r) => r.isrName
        ? <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.isrName}</span>
        : <span className="text-slate-400 text-xs italic">Unassigned</span>,
    },
    {
      key: 'outcome',
      label: 'Last Outcome',
      render: (r) => {
        if (r.lastCall) {
          return (
            <Badge className={`${OUTCOME_COLOR[r.lastCall.outcome] || OUTCOME_COLOR.OTHERS} border-0 font-medium`}>
              {r.lastCall.outcome.replace(/_/g, ' ')}
            </Badge>
          );
        }
        // No call log yet — fall back to current data status so admins can
        // still see the bucket placement at a glance.
        return (
          <Badge className={`${OUTCOME_COLOR[r.status] || OUTCOME_COLOR.OTHERS} border-0 font-medium opacity-60`}>
            {r.status === 'NEW' ? 'Not Called' : r.status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'lastCallAt',
      label: 'Last Called',
      render: (r) => r.lastCall?.at
        ? (
          <div className="text-xs">
            <p className="text-slate-700 dark:text-slate-300">
              {new Date(r.lastCall.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            {r.lastCall.by && <p className="text-[11px] text-slate-500">by {r.lastCall.by}</p>}
          </div>
        )
        : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      key: 'lead',
      label: 'Lead',
      render: (r) => r.lead
        ? (
          <div className="text-xs">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-medium">
              {r.lead.leadNumber || 'Converted'}
            </Badge>
            {r.lead.status && (
              <p className="text-[11px] text-slate-500 mt-1">{r.lead.status.replace(/_/g, ' ')}</p>
            )}
          </div>
        )
        : <span className="text-slate-400 text-xs">—</span>,
    },
  ];

  if (!user || !ALLOWED_ROLES.has(user.role)) return null;

  const theme = BUCKET_THEME[bucket] || BUCKET_THEME.assigned;
  const BucketIcon = theme.icon;
  const periodLabel = period ? (PERIOD_LABEL[period] || period) : 'All Time';

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Back row */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-600 dark:text-slate-400 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to ISR Dashboard
        </Button>
      </div>

      {/* Hero card — anchors the page; pulls the user's eye to the bucket
          context (label + count) and the active filters at a glance. */}
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 ${theme.border} bg-white dark:bg-slate-900 shadow-sm`}>
        <div className={`absolute inset-y-0 right-0 w-1/3 opacity-[0.06] bg-gradient-to-br ${theme.accent} pointer-events-none`} />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br ${theme.accent} text-white flex items-center justify-center shadow-sm shrink-0`}>
            <BucketIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{BUCKET_LABEL[bucket] || 'Campaign Data'}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${theme.badge}`}>
                {isLoading ? '…' : pagination.total.toLocaleString()} {pagination.total === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{theme.subtitle}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{periodLabel}</span>
              </div>
              {userId && (
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Scoped to one ISR</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DataTable handles its own container styling — no Card wrap, avoids
          the double-card visual. */}
      <div className="overflow-x-auto">
        <DataTable
          totalCount={pagination.total}
          columns={columns}
          data={rows}
          searchable
          searchPlaceholder="Search company, name, phone, email…"
          onSearch={(v) => setSearchInput(v)}
          pagination
          defaultPageSize={pagination.limit}
          pageSizeOptions={[10, 25, 50, 100]}
          serverPagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: pagination.totalPages,
          }}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(l) => setPagination(prev => ({ ...prev, page: 1, limit: l }))}
          loading={isLoading}
          emptyMessage="No records in this bucket"
          emptySubtitle="Try a different period or clear your search"
        />
      </div>
    </div>
  );
}
