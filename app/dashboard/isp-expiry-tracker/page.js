'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Download, MapPin, Search, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import DataTable from '@/components/DataTable';

const ALLOWED_ROLES = ['MASTER', 'ADMIN', 'SALES_DIRECTOR', 'SUPER_ADMIN'];

// Whole-day difference between today and the expiry date. Both sides are
// normalised to local midnight so a plan expiring later today reads as 0 days
// left rather than a fraction that rounds the wrong way.
const daysUntil = (dateValue) => {
  if (!dateValue) return null;
  const expiry = new Date(dateValue);
  if (Number.isNaN(expiry.getTime())) return null;
  const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfExpiry - startOfToday) / (24 * 60 * 60 * 1000));
};

// Urgency banding for the days-left badge. Tuned for a sales follow-up
// rhythm: anything inside a week needs a call now, a month is planning
// range, a quarter is just awareness.
const urgencyStyle = (days) => {
  if (days === null) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (days < 0) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (days <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (days <= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (days <= 90) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
};

const urgencyLabel = (days) => {
  if (days === null) return '—';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `${days}d left`;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Local YYYY-MM-DD. Deliberately not toISOString().slice(0,10) — that converts
// to UTC first, which rolls the date back a day for IST before 05:30.
const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The summary cards double as filters, so each one has to resolve to the same
// window the backend counted for it — otherwise the card would show 12 and the
// table would show something else.
const presetRange = (key) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  };
  switch (key) {
    case 'expired':
      return { dateTo: toDateKey(shift(-1)) };
    case 'thisMonth':
      return { dateFrom: toDateKey(today), dateTo: toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case 'next30':
      return { dateFrom: toDateKey(today), dateTo: toDateKey(shift(30)) };
    case 'next90':
      return { dateFrom: toDateKey(today), dateTo: toDateKey(shift(90)) };
    default:
      return {};
  }
};

export default function IspExpiryTrackerPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, expired: 0, thisMonth: 0, next30: 0, next90: 0, byBdm: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [bdmId, setBdmId] = useState('');
  // A preset (set by clicking a summary card) and a custom window are mutually
  // exclusive — picking either one clears the other.
  const [preset, setPreset] = useState('');
  const [expiryMode, setExpiryMode] = useState('month');
  const [month, setMonth] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomWindow, setShowCustomWindow] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [detailLead, setDetailLead] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const allowed = user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (user && !allowed) router.replace('/dashboard');
  }, [user, allowed, router]);

  // Debounce the search box so typing a company name doesn't fire a request
  // per keystroke against a table that can hold thousands of rows.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filterParams = useCallback(() => {
    const expiryWindow = preset
      ? presetRange(preset)
      : expiryMode === 'month'
        ? (month ? { month } : {})
        : {
            ...(dateFrom ? { dateFrom } : {}),
            ...(dateTo ? { dateTo } : {}),
          };
    return {
      ...(bdmId ? { bdmId } : {}),
      ...expiryWindow,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    };
  }, [bdmId, preset, expiryMode, month, dateFrom, dateTo, debouncedSearch]);

  // Choosing a card clears any custom window, and vice versa.
  const applyPreset = (key) => {
    setPreset((current) => (current === key ? '' : key));
    setMonth('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const applyCustomWindow = (setter) => (value) => {
    setPreset('');
    setter(value);
    setPage(1);
  };

  const clearAllFilters = () => {
    setBdmId('');
    setPreset('');
    setMonth('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leads/isp-expiry/list', {
        params: { page, limit, ...filterParams() }
      });
      setLeads(data.leads);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ISP expiry leads');
    }
    setLoading(false);
  }, [page, limit, filterParams]);

  useEffect(() => {
    if (allowed) loadLeads();
  }, [allowed, loadLeads]);

  const openMap = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Export ALL leads matching the current filters (the table is
  // server-paginated, so we page through the endpoint at limit=100).
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = filterParams();
      let exportPage = 1;
      let all = [];
      for (;;) {
        const { data } = await api.get('/leads/isp-expiry/list', {
          params: { ...params, page: exportPage, limit: 100 }
        });
        all = all.concat(data.leads || []);
        if (exportPage >= (data.pagination?.totalPages || 1)) break;
        exportPage += 1;
      }
      if (!all.length) {
        toast.error('No leads to export');
        return;
      }
      const rows = all.map((l) => {
        const days = daysUntil(l.existingPlanExpiryDate);
        return {
          'Lead Number': l.leadNumber || '',
          'Company': l.campaignData?.company || '',
          'Customer Name': l.campaignData?.name || '',
          'Contact': l.campaignData?.phone || '',
          'Email': l.campaignData?.email || '',
          'City': l.campaignData?.city || '',
          'BDM': l.createdBy?.name || '',
          'Existing ISP': l.existingIsp || '',
          'Existing Bandwidth': l.existingBandwidth || '',
          'Plan Expiry Date': formatDate(l.existingPlanExpiryDate),
          'Days To Expiry': days === null ? '' : days,
          'Bandwidth Required': l.bandwidthRequirement || '',
          'Lead Added On': l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : '',
          'Google Maps Link': l.createdLatitude != null
            ? `https://www.google.com/maps?q=${l.createdLatitude},${l.createdLongitude}`
            : ''
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
        { wch: 20 }, { wch: 44 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ISP Expiry');
      XLSX.writeFile(workbook, `isp-expiry-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${rows.length} lead${rows.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  if (!allowed) return null;

  // Six columns, not ten: each cell pairs the two facts that are read
  // together, so the table stops overflowing and stays scannable. The full
  // flat field list still goes out in the Excel export and the detail modal.
  const columns = [
    {
      key: 'company', label: 'Company',
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-100">{row.campaignData?.company || '—'}</div>
          <div className="text-xs font-mono text-slate-400 dark:text-slate-500">{row.leadNumber || '—'}</div>
        </div>
      )
    },
    {
      key: 'customer', label: 'Customer',
      render: (row) => (
        <div className="min-w-[140px]">
          <div className="text-slate-900 dark:text-slate-100">{row.campaignData?.name || '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.campaignData?.phone || '—'}</div>
        </div>
      )
    },
    {
      key: 'currentPlan', label: 'Current plan',
      render: (row) => (
        <div className="min-w-[120px]">
          <div className="text-slate-900 dark:text-slate-100">{row.existingIsp || '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.existingBandwidth || '—'}</div>
        </div>
      )
    },
    {
      key: 'expiry', label: 'Expires',
      render: (row) => {
        const days = daysUntil(row.existingPlanExpiryDate);
        return (
          <div className="min-w-[130px]">
            <div className="text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatDate(row.existingPlanExpiryDate)}</div>
            <span className={`mt-0.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${urgencyStyle(days)}`}>
              {urgencyLabel(days)}
            </span>
          </div>
        );
      }
    },
    { key: 'bdm', label: 'BDM', render: (row) => <span className="whitespace-nowrap">{row.createdBy?.name || '—'}</span> },
    {
      key: 'map', label: '',
      render: (row) => (
        row.createdLatitude != null ? (
          <button
            onClick={(e) => { e.stopPropagation(); openMap(row.createdLatitude, row.createdLongitude); }}
            title="Open location in Google Maps"
            aria-label="Open location in Google Maps"
            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <MapPin className="w-4 h-4" />
          </button>
        ) : null
      )
    },
  ];

  const hasFilters = bdmId || preset || month || dateFrom || dateTo || search;

  // Filters live in their own bar rather than DataTable's header: that header
  // is a two-column justify-between, so a long title plus five controls wraps
  // into a jumble. Here every control is labelled and has room.
  const filterBar = (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] max-w-md">
          <label htmlFor="expiry-search" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="expiry-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Company, contact, phone or ISP"
              className="h-9 w-full pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="expiry-bdm" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            BDM
          </label>
          <select
            id="expiry-bdm"
            value={bdmId}
            onChange={(e) => { setBdmId(e.target.value); setPage(1); }}
            className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All BDMs</option>
            {stats.byBdm.map(b => (
              <option key={b.bdmId} value={b.bdmId}>{b.bdmName} ({b.count})</option>
            ))}
          </select>
        </div>

        {/* The cards above cover the usual windows, so the date pickers stay
            folded away until someone actually needs a specific one. */}
        <button
          type="button"
          onClick={() => setShowCustomWindow((v) => !v)}
          aria-expanded={showCustomWindow}
          className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-sm transition-colors ${
            showCustomWindow || month || dateFrom || dateTo
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          Pick dates
          <ChevronDown className={`w-4 h-4 transition-transform ${showCustomWindow ? 'rotate-180' : ''}`} />
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {showCustomWindow && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3">
          {/* One mode visible at a time — three bare date boxes side by side
              gave no clue which was which. */}
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Filter expiry by</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              {[{ key: 'month', label: 'Month' }, { key: 'range', label: 'Date range' }].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => { setExpiryMode(m.key); setPreset(''); setMonth(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                  aria-pressed={expiryMode === m.key}
                  className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${
                    expiryMode === m.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {expiryMode === 'month' ? (
            <div>
              <label htmlFor="expiry-month" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Expiry month
              </label>
              <input
                id="expiry-month"
                type="month"
                value={month}
                onChange={(e) => applyCustomWindow(setMonth)(e.target.value)}
                className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="expiry-from" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Expires on or after
                </label>
                <input
                  id="expiry-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => applyCustomWindow(setDateFrom)(e.target.value)}
                  className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="expiry-to" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Expires on or before
                </label>
                <input
                  id="expiry-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => applyCustomWindow(setDateTo)(e.target.value)}
                  className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // Each card is also the filter for the window it counts — the number you
  // read is the number you click.
  const statCards = [
    { key: 'expired', label: 'Already expired', value: stats.expired, accent: 'text-red-600 dark:text-red-400', ring: 'ring-red-500/40 border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20' },
    { key: 'thisMonth', label: 'Expiring this month', value: stats.thisMonth, accent: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/40 border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/20' },
    { key: 'next30', label: 'Next 30 days', value: stats.next30, accent: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/40 border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20' },
    { key: 'next90', label: 'Next 90 days', value: stats.next90, accent: 'text-slate-700 dark:text-slate-200', ring: 'ring-slate-400/40 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ISP Expiry Tracker</h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Leads added by BDMs that have not moved past the first stage, and are still running on another
        provider — sorted by when that provider&rsquo;s plan lapses, so the team can follow up in time.
      </p>

      {/* Counts always cover every stage-1 lead, never the active filter — so
          they stay a fixed reference you filter against. Clicking one filters
          the table to exactly the window it counts. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {statCards.map((card) => {
          const active = preset === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => applyPreset(card.key)}
              aria-pressed={active}
              className={`text-left cursor-pointer rounded-lg border px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? `ring-2 ${card.ring}`
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                <span>{card.label}</span>
                {active && <X className="w-3.5 h-3.5 shrink-0" />}
              </p>
              <p className={`text-2xl font-bold ${card.accent}`}>{card.value ?? 0}</p>
            </button>
          );
        })}
      </div>

      {filterBar}

      <DataTable
        title="Follow-up queue"
        totalCount={stats.total}
        columns={columns}
        data={leads}
        loading={loading}
        headerExtra={
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 h-9 px-3 whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4 shrink-0" />
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        }
        serverPagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setLimit(newSize); setPage(1); }}
        onRowClick={(row) => setDetailLead(row)}
        emptyMessage="No leads awaiting follow-up"
        emptySubtitle="Leads added from the BDM queue with an existing-plan expiry date will appear here until they move to feasibility"
        emptyIcon={CalendarClock}
      />

      {/* Detail modal */}
      {detailLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setDetailLead(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl"
               onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1 text-slate-900 dark:text-slate-100">
              {detailLead.campaignData?.company || 'Lead'}
            </h2>
            <p className="text-xs font-mono text-slate-500 mb-4">{detailLead.leadNumber || ''}</p>
            <dl className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Customer</dt><dd>{detailLead.campaignData?.name || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Contact</dt><dd>{detailLead.campaignData?.phone || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="truncate">{detailLead.campaignData?.email || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">City</dt><dd>{detailLead.campaignData?.city || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">BDM</dt><dd>{detailLead.createdBy?.name || '—'}</dd></div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Existing ISP</dt><dd className="font-medium">{detailLead.existingIsp || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Existing bandwidth</dt><dd>{detailLead.existingBandwidth || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Plan expires</dt><dd>{formatDate(detailLead.existingPlanExpiryDate)}</dd></div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${urgencyStyle(daysUntil(detailLead.existingPlanExpiryDate))}`}>
                    {urgencyLabel(daysUntil(detailLead.existingPlanExpiryDate))}
                  </span>
                </dd>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Bandwidth required</dt><dd>{detailLead.bandwidthRequirement || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Lead added</dt><dd>{detailLead.createdAt ? new Date(detailLead.createdAt).toLocaleString('en-IN') : '—'}</dd></div>
              {detailLead.requirements && (
                <div>
                  <dt className="text-slate-500 mb-1">Notes</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{detailLead.requirements}</dd>
                </div>
              )}
            </dl>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setDetailLead(null)}
                className="px-4 py-2 text-sm border rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Close</button>
              {detailLead.createdLatitude != null && (
                <button onClick={() => openMap(detailLead.createdLatitude, detailLead.createdLongitude)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Open Map
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
