'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Loader2,
  Users,
  CheckCircle2,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  FileText,
  Banknote,
  Truck,
  Activity,
  Snowflake,
  ChevronRight,
} from 'lucide-react';
import { useLeadStore } from '@/lib/store';
import useRoleCheck from '@/lib/useRoleCheck';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';

// Order matters — this is the left-to-right tab order.
const BUCKETS = [
  { key: 'BDM',                 label: 'BDM',               icon: Briefcase,     accent: 'bg-orange-500' },
  { key: 'FEASIBILITY',         label: 'Feasibility',       icon: ClipboardCheck, accent: 'bg-purple-500' },
  { key: 'OPS',                 label: 'OPS',               icon: CheckCircle2,  accent: 'bg-emerald-500' },
  { key: 'SALES_DIRECTOR',      label: 'Sales Director',    icon: ShieldCheck,   accent: 'bg-indigo-500' },
  { key: 'DOCS',                label: 'Docs',              icon: FileText,      accent: 'bg-cyan-500' },
  { key: 'ACCOUNTS',            label: 'Accounts',          icon: Banknote,      accent: 'bg-amber-500' },
  { key: 'DELIVERY',            label: 'Delivery',          icon: Truck,         accent: 'bg-pink-500' },
  { key: 'PENDING_ACTIVATION',  label: 'Pending Activation', icon: Activity,     accent: 'bg-yellow-500' },
  { key: 'ACTIVE',              label: 'Active Customers',  icon: CheckCircle2,  accent: 'bg-green-600' },
  { key: 'COLD',                label: 'Cold Leads',        icon: Snowflake,     accent: 'bg-slate-400' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function LeadBucketsPage() {
  const router = useRouter();
  const { user, isMaster, isSuperAdmin, isAdmin } = useRoleCheck();
  const isSalesDirector = user?.role === 'SALES_DIRECTOR' || isMaster;
  const canView = isMaster || isSuperAdmin || isAdmin || isSalesDirector;

  const { fetchLeadBuckets } = useLeadStore();

  const [activeBucket, setActiveBucket] = useState('BDM');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState({ summary: {}, leads: [], pagination: { total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce the search input by 350ms so we don't hammer the endpoint
  // on every keystroke. Reset the page when the search changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Bounce non-permitted users straight back to the dashboard.
  useEffect(() => {
    if (user && !canView) router.replace('/dashboard');
  }, [user, canView, router]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    const res = await fetchLeadBuckets({
      bucket: activeBucket,
      page,
      limit: pageSize,
      search: searchQuery,
    });
    if (res.success) {
      setData({
        summary: res.summary || {},
        leads: res.leads || [],
        pagination: res.pagination || { total: 0, totalPages: 1 },
      });
    } else {
      setError(res.error || 'Failed to load buckets');
    }
    setLoading(false);
  }, [canView, fetchLeadBuckets, activeBucket, page, pageSize, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  // When the user clicks a different tab, reset to page 1.
  const switchBucket = (key) => {
    if (key === activeBucket) return;
    setActiveBucket(key);
    setPage(1);
  };

  const totalAcrossBuckets = data.summary?.TOTAL || 0;

  const stageColor = useMemo(
    () => ({
      // map a few common stages to colours; everything else falls through.
      'Active Customer': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Demo Plan': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Plan Creation': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Awaiting Plan Activation': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    }),
    [],
  );

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Lead Buckets"
          description="Where every lead is sitting right now — across BDM, Feasibility, OPS, Docs, Accounts, Delivery, and post-pipeline stages."
        />
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total in pipeline: <span className="font-semibold text-slate-800 dark:text-slate-200">{totalAcrossBuckets}</span>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => {
          const count = data.summary?.[b.key] ?? 0;
          const active = activeBucket === b.key;
          const Icon = b.icon;
          return (
            <button
              key={b.key}
              onClick={() => switchBucket(b.key)}
              className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap
                ${active
                  ? 'bg-white dark:bg-slate-900 border-orange-500 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
                }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${b.accent} text-white`}>
                <Icon size={12} />
              </span>
              <span>{b.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded-full text-[11px] font-semibold
                  ${active
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <Input
          placeholder="Search company, contact, phone, lead #…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Lead table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-sm text-red-600 text-center">{error}</div>
          ) : data.leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Users size={36} className="mb-3 opacity-50" />
              <p className="text-sm">No leads in this bucket{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left">
                    <Th>Company</Th>
                    <Th>Contact</Th>
                    <Th>Phone</Th>
                    <Th>City</Th>
                    <Th>Current Stage</Th>
                    <Th>Current Owner</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/customer-360/${lead.id}`)}
                    >
                      <Td>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {lead.company || '—'}
                        </div>
                        {lead.leadNumber && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{lead.leadNumber}</div>
                        )}
                      </Td>
                      <Td>
                        <div className="text-slate-800 dark:text-slate-200">{lead.contactName || '—'}</div>
                        {lead.email && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{lead.email}</div>
                        )}
                      </Td>
                      <Td className="text-slate-700 dark:text-slate-300">{lead.phone || '—'}</Td>
                      <Td className="text-slate-700 dark:text-slate-300">
                        {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${stageColor[lead.currentStage] ||
                              'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}
                        >
                          {lead.currentStage || '—'}
                        </span>
                      </Td>
                      <Td className="text-slate-700 dark:text-slate-300 text-sm">
                        {lead.currentOwner || '—'}
                      </Td>
                      <Td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/customer-360/${lead.id}`);
                          }}
                          className="h-7 px-2 text-orange-600 hover:text-orange-700"
                        >
                          View <ChevronRight size={14} />
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Page {page} of {data.pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages || 1, p + 1))}
                    disabled={page >= (data.pagination.totalPages || 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, className = '' }) {
  return (
    <th className={`py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return <td className={`py-3 px-4 text-sm align-top ${className}`}>{children}</td>;
}
