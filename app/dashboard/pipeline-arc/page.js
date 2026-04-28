'use client';

import { useEffect, useState } from 'react';
import { useLeadStore, useAuthStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Building2,
  Clock,
  LogIn,
  Receipt,
  Wrench,
  UserCheck,
  Banknote,
  ArrowLeft,
  Loader2,
  IndianRupee,
  Users,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency } from '@/lib/formatters';

const STAGE_CONFIG = {
  funnel: { label: 'Funnel', dateField: null, color: 'bg-orange-600' },
  login: { label: 'Login', dateField: 'loginCompletedAt', color: 'bg-cyan-600' },
  po: { label: 'PO Received', dateField: 'accountsVerifiedAt', color: 'bg-emerald-600' },
  install: { label: 'Installation Done', dateField: 'installationCompletedAt', color: 'bg-amber-600' },
  accept: { label: 'Customer Accept', dateField: 'customerAcceptanceAt', color: 'bg-blue-600' },
  ftb: { label: 'FTB Received', dateField: 'ftbDate', color: 'bg-green-600' },
};

export default function PipelineARCPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchBDMDashboardStats, bdmDashboardStats, bdmDashboardLoading, fetchBDMUsers, bdmUsers } = useLeadStore();
  const isBDM = user?.role === 'BDM';
  const isTL = user?.role === 'BDM_TEAM_LEADER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isMaster = user?.role === 'MASTER';
  const isAdmin = isSuperAdmin || isMaster;
  const canView = isBDM || isTL || isAdmin;

  // Default selection: Super-Admin / Master should see platform-wide ("all")
  // by default — viewing their own pipeline returns zero. BDM / TL keep the
  // "myself" default (empty string).
  const initialBDM = searchParams.get('userId') || (isAdmin ? 'all' : '');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBDM, setSelectedBDM] = useState(initialBDM);
  const [selectedPeriod, setSelectedPeriod] = useState(searchParams.get('period') || 'ytd');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || '');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Pagination — only affects which rows render. Totals stay computed from
  // the full filtered set so the footer always shows the grand total.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to page 1 whenever a filter/search/scope change shrinks or
  // shifts the result set — otherwise an out-of-range page would render
  // an empty body even though there are matching leads.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, stageFilter, selectedBDM, selectedPeriod, customFromDate, customToDate, pageSize]);

  // Fetch BDM users list for TL/Admin (Master/Super-Admin)
  useEffect(() => {
    if (isTL || isAdmin) {
      fetchBDMUsers();
    }
  }, [isTL, isAdmin, fetchBDMUsers]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!canView) return;
    const options = {};
    if (selectedPeriod && selectedPeriod !== 'alltime') {
      options.period = selectedPeriod;
    }
    if (selectedPeriod === 'custom' && customFromDate && customToDate) {
      options.fromDate = customFromDate;
      options.toDate = customToDate;
    }
    if ((isTL || isAdmin) && selectedBDM) {
      options.userId = selectedBDM;
    }
    fetchBDMDashboardStats(options);
  }, [canView, isTL, isAdmin, selectedBDM, selectedPeriod, customFromDate, customToDate, fetchBDMDashboardStats]);

  const dashStats = bdmDashboardStats?.dashboardStats || {};
  const pipelineLeads = dashStats.pipelineLeads || [];
  const funnelLeads = dashStats.funnelLeads || [];

  // Funnel mode draws from a separate slice — every lead with a
  // tentativePrice (funnel-eligible). Milestone modes still draw from
  // pipelineLeads (rows that have at least one milestone date set).
  const isFunnelView = stageFilter === 'funnel';
  const sourceLeads = isFunnelView ? funnelLeads : pipelineLeads;

  const filteredLeads = sourceLeads.filter((lead) => {
    // Milestone stage filter: require the row to have that milestone date.
    // Funnel stage doesn't need a date check — every funnelLeads row already
    // has a positive funnelAmount.
    if (!isFunnelView && stageFilter && STAGE_CONFIG[stageFilter]) {
      const dateField = STAGE_CONFIG[stageFilter].dateField;
      if (dateField && !lead[dateField]) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [lead.company, lead.contactName, lead.phone]
      .filter(Boolean)
      .some(f => f.toLowerCase().includes(q));
  });

  // Totals — computed from the FULL filtered set, not the visible page.
  // The footer's "Total (N leads)" line is the grand total even when a
  // small page size is selected.
  const totals = filteredLeads.reduce(
    (acc, lead) => {
      acc.arc += lead.arcAmount || 0;
      acc.funnel += lead.funnelAmount || 0;
      if (lead.loginCompletedAt) acc.login += lead.arcAmount || 0;
      if (lead.accountsVerifiedAt) acc.po += lead.arcAmount || 0;
      if (lead.installationCompletedAt) acc.install += lead.arcAmount || 0;
      if (lead.customerAcceptanceAt) acc.accept += lead.arcAmount || 0;
      acc.ftb += lead.ftbAmount || 0;
      return acc;
    },
    { arc: 0, funnel: 0, login: 0, po: 0, install: 0, accept: 0, ftb: 0 }
  );

  // Sliced view for the current page. Empty when filteredLeads is empty.
  const totalRows = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalRows);
  const pageLeads = filteredLeads.slice(pageStart, pageEnd);

  const milestoneColumns = [
    { key: 'login', label: 'Login', icon: LogIn, badgeClass: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400', dateField: 'loginCompletedAt' },
    { key: 'po', label: 'PO Received', icon: Receipt, badgeClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', dateField: 'accountsVerifiedAt' },
    { key: 'install', label: 'Installation', icon: Wrench, badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', dateField: 'installationCompletedAt' },
    { key: 'accept', label: 'Cust. Accept', icon: UserCheck, badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', dateField: 'customerAcceptanceAt' },
    { key: 'ftb', label: 'FTB Received', icon: Banknote, badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dateField: 'ftbDate' },
  ];

  const selectedBDMName =
    selectedBDM === 'all'
      ? 'All BDMs'
      : selectedBDM
      ? bdmUsers.find(u => u.id === selectedBDM)?.name || 'Selected BDM'
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {/* Back navigation: bounce to wherever the user came from (Team
            Dashboard → BDM overall, Admin home, deep link, etc.) instead
            of a hard-coded /dashboard. Falls back to the BDM overall page
            on a fresh tab where there's no history to walk back through. */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/dashboard/admin-dashboards/bdm');
            }
          }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <PageHeader
          title="Pipeline ARC Tracker"
          description={selectedBDMName ? `Viewing ${selectedBDMName}'s pipeline` : 'Track ARC across all pipeline milestones per lead'}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* BDM Selector - for TL and Admin (Super-Admin / Master). Admin roles
            default to "All BDMs" (their own pipeline is empty); TL defaults to
            their own "My Pipeline". */}
        {(isTL || isAdmin) && (
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <select
              value={selectedBDM}
              onChange={(e) => setSelectedBDM(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All BDMs</option>
              {isTL && <option value="">My Pipeline</option>}
              {bdmUsers.map((bdm) => (
                <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Period Filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          {[
            { key: 'mtd', label: 'MTD' },
            { key: 'ytd', label: 'YTD' },
            { key: 'alltime', label: 'All Time' },
            { key: 'custom', label: 'Custom' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === p.key
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {selectedPeriod === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            />
          </div>
        )}
      </div>

      {/* Active Stage Filter */}
      {stageFilter && STAGE_CONFIG[stageFilter] && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filtered by:</span>
          <Badge className={`${STAGE_CONFIG[stageFilter].color} text-white px-3 py-1 text-sm flex items-center gap-1.5`}>
            {STAGE_CONFIG[stageFilter].label}
            <button onClick={() => setStageFilter('')} className="ml-1 hover:opacity-80">
              <X size={14} />
            </button>
          </Badge>
        </div>
      )}

      {/* Summary Cards. In funnel view we surface the funnel-specific
          totals; in milestone view we keep the existing ARC + per-stage
          breakdown. Cards are clickable in milestone mode (toggling the
          stage filter); funnel mode's cards are static since the only
          stage there is the implicit "funnel" filter we're already in. */}
      <div className={`grid grid-cols-2 ${isFunnelView ? 'sm:grid-cols-2' : 'sm:grid-cols-3 lg:grid-cols-6'} gap-3`}>
        {(isFunnelView
          ? [
              // ARC card intentionally omitted here. arcAmount lives on a
              // wider lead universe (every quoted lead, including ones
              // upstream of login), so the same label sums to a different
              // number than the milestone view's Total ARC. Funnel Value
              // (tentativePrice) is the canonical headline metric for this
              // mode; per-row ARC is still visible in the table column.
              { label: 'Total Funnel Value', value: totals.funnel, borderClass: 'border-l-orange-500' },
              { label: 'Leads in Funnel', value: filteredLeads.length, borderClass: 'border-l-emerald-500', isCount: true },
            ]
          : [
              { label: 'Total ARC', value: totals.arc, borderClass: 'border-l-orange-500', stage: '' },
              { label: 'Login', value: totals.login, borderClass: 'border-l-cyan-500', stage: 'login' },
              { label: 'PO Received', value: totals.po, borderClass: 'border-l-emerald-500', stage: 'po' },
              { label: 'Installation', value: totals.install, borderClass: 'border-l-amber-500', stage: 'install' },
              { label: 'Cust. Accept', value: totals.accept, borderClass: 'border-l-blue-500', stage: 'accept' },
              { label: 'FTB Received', value: totals.ftb, borderClass: 'border-l-green-500', stage: 'ftb' },
            ]
        ).map((s) => (
          <Card
            key={s.label}
            onClick={s.stage === undefined ? undefined : () => setStageFilter(stageFilter === s.stage ? '' : s.stage)}
            className={`border-l-4 ${s.borderClass} bg-white dark:bg-card transition-all ${s.stage !== undefined ? 'cursor-pointer hover:shadow-md' : ''} ${s.stage !== undefined && stageFilter === s.stage ? 'ring-2 ring-orange-500 shadow-md' : ''}`}
          >
            <CardContent className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">{s.label}</p>
              <p className="text-lg font-bold mt-0.5">
                {s.isCount ? s.value.toLocaleString('en-IN') : formatCurrency(s.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Search by company, name, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Pipeline Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {bdmDashboardLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Building2 size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No pipeline leads found</p>
              <p className="text-sm mt-1">Leads with login or later milestones will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {isFunnelView ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Company / Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        BDM
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <IndianRupee size={12} />
                        Funnel Value
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      ARC
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">City</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 sticky left-0 bg-white dark:bg-slate-900 z-10">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.contactName} {lead.phone !== '-' ? `· ${lead.phone}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.assignedToName || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-sm text-orange-700 dark:text-orange-400">
                          {formatCurrency(lead.funnelAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-700 dark:text-slate-300">
                        {lead.arcAmount > 0 ? formatCurrency(lead.arcAmount) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.city || <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Funnel totals row — grand total over the full filtered
                      set, not the page slice. */}
                  <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                      Total ({totalRows} {totalRows === 1 ? 'lead' : 'leads'})
                    </td>
                    <td className="py-3 px-4" />
                    <td className="py-3 px-4 text-right text-sm text-orange-700 dark:text-orange-400">
                      {formatCurrency(totals.funnel)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-900 dark:text-slate-100">
                      {totals.arc > 0 ? formatCurrency(totals.arc) : '—'}
                    </td>
                    <td className="py-3 px-4" />
                  </tr>
                </tbody>
              </table>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Company / Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        BDM
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <IndianRupee size={12} />
                        ARC
                      </div>
                    </th>
                    {milestoneColumns.map((col) => (
                      <th key={col.key} className="text-center py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <col.icon size={13} />
                          {col.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {/* Company */}
                      <td className="py-3 px-4 sticky left-0 bg-white dark:bg-slate-900 z-10">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.contactName} {lead.phone !== '-' ? `· ${lead.phone}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      {/* BDM */}
                      <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.assignedToName || <span className="text-slate-400">—</span>}
                      </td>
                      {/* ARC */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {formatCurrency(lead.arcAmount)}
                        </span>
                      </td>
                      {/* Milestone columns */}
                      {milestoneColumns.map((col) => {
                        const dateVal = lead[col.dateField];
                        const amount = col.key === 'ftb' ? lead.ftbAmount : (dateVal ? lead.arcAmount : 0);
                        const isDone = !!dateVal;
                        return (
                          <td key={col.key} className="py-3 px-4 text-center">
                            {isDone ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge className={`text-[10px] px-1.5 py-0 border-0 ${col.badgeClass}`}>
                                  {formatCurrency(amount)}
                                </Badge>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                <Clock size={14} className="mx-auto" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Totals row — sums across the full filtered set, never
                      just the current page slice. */}
                  <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                      Total ({totalRows} {totalRows === 1 ? 'lead' : 'leads'})
                    </td>
                    {/* Empty cell under the BDM column to keep alignment. */}
                    <td className="py-3 px-4" />
                    <td className="py-3 px-4 text-right text-sm text-slate-900 dark:text-slate-100">
                      {formatCurrency(totals.arc)}
                    </td>
                    {[totals.login, totals.po, totals.install, totals.accept, totals.ftb].map((val, i) => (
                      <td key={i} className="py-3 px-4 text-center text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              )}
            </div>
          )}

          {/* Pagination footer. Hidden when there's nothing to page through.
              Selecting a smaller page size only shrinks the rendered slice
              — the totals row and per-stage cards both keep showing the
              grand total computed from the full filtered set. */}
          {!bdmDashboardLoading && totalRows > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{pageStart + 1}–{pageEnd}</span> of <span className="font-semibold text-slate-900 dark:text-slate-100">{totalRows}</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1.5">
                  <span>Per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 25)}
                    className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {[10, 15, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={safePage <= 1}
                  className="h-8 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  « First
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="h-8 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                <span className="text-xs text-slate-700 dark:text-slate-300 px-2">
                  Page <span className="font-semibold">{safePage}</span> of <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="h-8 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="h-8 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last »
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
