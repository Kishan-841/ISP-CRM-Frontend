'use client';

import { useEffect, useState } from 'react';
import { Search, XCircle } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { useLeadStore } from '@/lib/store';

// ARC is stored annually (arcAmount) - the /12 conversions in the billing code
// are the proof. The accounts-verification page labels the same field
// "ARC (Monthly)", which is wrong; this page does not copy that mistake.
const formatCurrency = (n) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${n.toFixed(0)}`;
};

const prettyStage = (s) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');

export default function CancelledLeadsPage() {
  const {
    cancelledLeads, cancelledLeadsPagination, cancelledLeadsLoading, fetchCancelledLeads
  } = useLeadStore();

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = () => fetchCancelledLeads({ search, fromDate, toDate, page, limit: pageSize });

  useEffect(() => { load(); }, [page, pageSize, fromDate, toDate]);

  // 400ms debounce, matching dashboard/leads/page.js
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const columns = [
    { key: 'company', label: 'Company',
      render: (row) => (
        <div>
          <p className="font-medium">{row.company || '—'}</p>
          {row.leadNumber && <p className="text-xs text-muted-foreground">{row.leadNumber}</p>}
        </div>
      ) },
    { key: 'contact', label: 'Contact',
      render: (row) => (
        <div>
          <p>{row.contactName || '—'}</p>
          {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
        </div>
      ) },
    { key: 'leadOwner', label: 'Lead Owner', render: (row) => row.leadOwner || '—' },
    { key: 'cancelledBy', label: 'Cancelled By', render: (row) => row.cancelledBy || '—' },
    { key: 'cancelledAt', label: 'Cancelled On',
      render: (row) => row.cancelledAt ? new Date(row.cancelledAt).toLocaleDateString('en-IN') : '—' },
    { key: 'cancelledAtStage', label: 'Stage', render: (row) => prettyStage(row.cancelledAtStage) },
    { key: 'arcAmount', label: 'ARC (Annual)', render: (row) => formatCurrency(row.arcAmount) },
    { key: 'otcAmount', label: 'OTC', render: (row) => formatCurrency(row.otcAmount) },
    { key: 'cancelledReason', label: 'Reason',
      render: (row) => (
        <span className="block max-w-xs truncate" title={row.cancelledReason || ''}>
          {row.cancelledReason || '—'}
        </span>
      ) }
  ];

  const hasFilters = Boolean(search || fromDate || toDate);
  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Every control is h-9 with an explicit width, matching dashboard/leads/page.js.
  // Without a width the Input defaults to w-full and each filter claims its own row.
  const dateClass =
    'h-9 w-[150px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  const filterControls = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Company, contact, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56 pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
      </div>

      {/* Two bare date inputs read as "dd/mm/yyyy" twice with no way to tell
          which end of the range each one is. */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">From</span>
        <Input
          type="date"
          value={fromDate}
          max={toDate || undefined}
          onChange={(e) => { setPage(1); setFromDate(e.target.value); }}
          className={dateClass}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">To</span>
        <Input
          type="date"
          value={toDate}
          min={fromDate || undefined}
          onChange={(e) => { setPage(1); setToDate(e.target.value); }}
          className={dateClass}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="h-9 px-3 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          Clear
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Cancelled Leads" description="Leads cancelled during delivery" />
      <DataTable
        title="Cancelled Lead List"
        columns={columns}
        data={cancelledLeads}
        filters={filterControls}
        loading={cancelledLeadsLoading}
        emptyMessage="No cancelled leads"
        emptyIcon={XCircle}
        totalCount={cancelledLeadsPagination?.total || 0}
        serverPagination={cancelledLeadsPagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
