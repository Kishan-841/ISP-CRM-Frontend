'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Eye,
  X,
  Building2,
  Mail,
  Phone,
  Clock,
  IndianRupee,
  Briefcase,
  Layers,
  Download,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import { useAuthStore, useTeamPerformanceStore } from '@/lib/store';
import { useModal } from '@/lib/useModal';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { stageColorClass } from '@/lib/leadStageColors';

// Team Performance — BDM Team Leader oversight page.
//
// Layout:
//   1. Header
//   2. "All Team" + per-BDM stat cards (horizontal row). Clicking a card
//      filters the leads table below to that BDM. "All Team" resets.
//   3. Search + status filter
//   4. Leads table — Company/Contact, Status+Days-in-stage, ARC+Last activity,
//      BDM column (only shown when filter is 'all')
//   5. Inline read-only details modal on row click

const inr = (n) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '—';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatRelative = (days) => {
  if (days == null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
};

function StageBadge({ stage }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageColorClass(stage)}`}>
      {stage || '—'}
    </span>
  );
}

// One compact KPI tile inside the selected-BDM panel.
function StatTile({ label, value, accent }) {
  const accentColor = {
    default:  'text-slate-900 dark:text-white',
    emerald:  'text-emerald-700 dark:text-emerald-400',
    red:      'text-red-600 dark:text-red-400',
    orange:   'text-orange-700 dark:text-orange-400',
  }[accent || 'default'];
  return (
    <div className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-w-[110px]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${accentColor}`}>{value}</p>
    </div>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'FEASIBLE', label: 'Feasible' },
  { value: 'NOT_FEASIBLE', label: 'Not Feasible' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled' },
  { value: 'DROPPED', label: 'Dropped' },
];

export default function TeamPerformancePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    members,
    byMember,
    totals,
    summaryLoading,
    leads,
    pagination,
    leadsLoading,
    fetchSummary,
    fetchLeads,
    exportLeads,
  } = useTeamPerformanceStore();

  // Page is meant for TLs primarily. Admins/master can land here too for
  // inspection (backend allows ?teamLeaderId=<id>, but the UI here defaults
  // to their own row, which is fine for now).
  const isAllowed = user?.role === 'BDM_TEAM_LEADER' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER';

  const [selectedBdmId, setSelectedBdmId] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingLead, setViewingLead] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user && !isAllowed) router.push('/dashboard');
  }, [user, isAllowed, router]);

  useEffect(() => {
    if (isAllowed) fetchSummary();
  }, [isAllowed, fetchSummary]);

  // Debounce search by re-fetching only on commit (Enter / blur via state).
  useEffect(() => {
    if (!isAllowed) return;
    fetchLeads({ bdmId: selectedBdmId, status, search, page, limit: 25 });
  }, [isAllowed, fetchLeads, selectedBdmId, status, search, page]);

  useEffect(() => { setPage(1); }, [selectedBdmId, status, search]);

  useModal(Boolean(viewingLead), () => setViewingLead(null));

  const aggregateCard = useMemo(() => ({
    id: 'all',
    name: 'All Team',
    role: '',
    totalLeads: totals?.totalLeads || 0,
    qualified: totals?.qualified || 0,
    inPipeline: totals?.inPipeline || 0,
    converted: totals?.converted || 0,
    dropped: totals?.dropped || 0,
    totalArc: totals?.totalArc || 0,
    conversionRate: totals?.conversionRate || 0,
  }), [totals]);

  // Whichever member (or aggregate) the dropdown points at — drives the KPI
  // tile row + the table filter.
  const selectedMember = useMemo(() => {
    if (selectedBdmId === 'all') return aggregateCard;
    return (byMember || []).find(m => m.id === selectedBdmId) || aggregateCard;
  }, [selectedBdmId, byMember, aggregateCard]);

  const showBdmColumn = selectedBdmId === 'all';

  const hasActiveFilter = selectedBdmId !== 'all' || status !== 'all' || Boolean(search.trim());

  // Export every row matching the CURRENT filters (member + status + search),
  // not just the visible page. With no filter applied this exports the whole
  // team. Filename encodes the active filter so multiple exports don't clash.
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportLeads({ bdmId: selectedBdmId, status, search });
      if (!res.success) {
        toast.error(res.error || 'Export failed');
        return;
      }
      const rows = res.data || [];
      if (rows.length === 0) {
        toast.error('No leads to export');
        return;
      }
      const formatted = rows.map((r) => ({
        'Lead #': r.leadNumber || '',
        'Company': r.company || '',
        'Contact Name': r.contactName || '',
        'Phone': r.phone || '',
        'Email': r.email || '',
        'Current Stage': r.currentStage || '',
        'Owner': r.currentOwner || '',
        'Days In Stage': r.daysInStage ?? '',
        'Status': r.status || '',
        'ARC': typeof r.arcAmount === 'number' ? r.arcAmount : '',
        'Plan': r.actualPlanName || '',
        'Active Customer': r.actualPlanIsActive ? 'Yes' : 'No',
        'Cold Lead': r.isColdLead ? 'Yes' : 'No',
        'BDM': r.bdm?.name || '',
        'BDM Email': r.bdm?.email || '',
        'Created': formatDate(r.createdAt),
        'Last Activity': formatDate(r.lastActivityAt),
      }));
      const ws = XLSX.utils.json_to_sheet(formatted);
      const headers = Object.keys(formatted[0]);
      ws['!cols'] = headers.map((h) => ({
        wch: Math.min(50, Math.max(h.length, ...formatted.map((row) => String(row[h] ?? '').length)) + 2),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Team Performance');

      const memberLabel = selectedBdmId === 'all'
        ? 'all'
        : (selectedMember?.name || 'member').replace(/\s+/g, '-');
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `team_performance_${memberLabel}_${stamp}.xlsx`);
      toast.success(`Exported ${rows.length} lead${rows.length === 1 ? '' : 's'}`);
    } finally {
      setExporting(false);
    }
  };

  if (!isAllowed) return null;

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-slate-900 dark:text-white truncate">{row.company || '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.leadNumber}</div>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <span className="text-sm text-slate-900 dark:text-slate-100">{row.contactName || '—'}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">{row.phone || '—'}</span>
      ),
    },
    {
      key: 'currentStage',
      label: 'Current Stage',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StageBadge stage={row.currentStage} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <Clock className="inline w-3 h-3 mr-1" />
            {formatRelative(row.daysInStage)}
          </span>
        </div>
      ),
    },
    {
      key: 'currentOwner',
      label: 'Owner',
      render: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{row.currentOwner || '—'}</span>
      ),
    },
    {
      key: 'arc',
      label: 'ARC',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{inr(row.arcAmount)}</div>
          {row.actualPlanName && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={row.actualPlanName}>
              {row.actualPlanName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      render: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(row.lastActivityAt)}</span>
      ),
    },
    ...(showBdmColumn
      ? [{
          key: 'bdm',
          label: 'BDM',
          render: (row) => (
            <span className="text-sm text-slate-700 dark:text-slate-300">{row.bdm?.name || '—'}</span>
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Performance"
        description="Compare your BDMs at a glance and drill into each one's leads — current stage, ARC pipeline, and time since last activity."
      >
        <Button
          onClick={handleExport}
          disabled={exporting || leadsLoading}
          size="sm"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? 'Exporting…' : (hasActiveFilter ? 'Export filtered' : 'Export all')}
        </Button>
      </PageHeader>

      {/* BDM selector + KPI tiles for whoever is selected. Dropdown replaces
          the older horizontal card grid — single source of truth for "who am
          I looking at", and the table below auto-narrows to the selection. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              View team member
            </label>
            <select
              value={selectedBdmId}
              onChange={(e) => setSelectedBdmId(e.target.value)}
              disabled={summaryLoading}
              className="w-full sm:w-72 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="all">
                All Team ({totals?.totalLeads || 0} leads)
              </option>
              {(byMember || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.role === 'BDM_TEAM_LEADER' ? ' (TL)' : ''} — {m.totalLeads} leads
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
            <StatTile label="Total leads"  value={selectedMember.totalLeads} />
            <StatTile label="In pipeline"  value={selectedMember.inPipeline} accent="emerald" />
            <StatTile label="Qualified"    value={selectedMember.qualified} />
            <StatTile label="Dropped"      value={selectedMember.dropped} accent="red" />
            <StatTile label="ARC pipeline" value={inr(selectedMember.totalArc)} accent="orange" />
            <StatTile label="Conversion"   value={`${selectedMember.conversionRate}%`} />
          </div>
        </div>
        {summaryLoading && (
          <p className="text-xs text-slate-500">Loading team...</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact, phone, or lead #"
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {STATUS_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="text-xs text-slate-500 ml-auto self-center hidden sm:block">
          {pagination.total} lead{pagination.total === 1 ? '' : 's'}
        </div>
      </div>

      {/* Leads table — DataTable already provides its own container styling, so
          no Card wrapper here (avoids the double-card visual). */}
      <DataTable
        columns={columns}
        data={leads || []}
        loading={leadsLoading}
        emptyIcon={Users}
        emptyMessage="No leads found"
        emptySubtitle={search || status !== 'all' ? 'Try removing a filter.' : 'No leads under your team yet.'}
        serverPagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
        }}
        onPageChange={setPage}
        actions={(row) => (
          <button
            onClick={(e) => { e.stopPropagation(); setViewingLead(row); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
            title="View details"
          >
            <Eye size={14} />
            View
          </button>
        )}
      />

      {/* Read-only detail modal */}
      {viewingLead && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                  <Building2 size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                    {viewingLead.company || viewingLead.leadNumber}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{viewingLead.leadNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingLead(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={viewingLead.currentStage} />
                {viewingLead.actualPlanIsActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    Active customer
                  </span>
                )}
                {viewingLead.isColdLead && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    Cold lead
                  </span>
                )}
              </div>

              <Section title="Customer">
                <Field icon={Briefcase} label="Company" value={viewingLead.company} />
                <Field icon={Users} label="Name" value={viewingLead.contactName} />
                <Field icon={Phone} label="Phone" value={viewingLead.phone} />
                <Field icon={Mail} label="Email" value={viewingLead.email} />
              </Section>

              <Section title="Pipeline">
                <Field icon={Layers} label="Current stage" value={viewingLead.currentStage} />
                <Field icon={Users} label="Current owner" value={viewingLead.currentOwner} />
                <Field icon={Clock} label="Time in stage" value={formatRelative(viewingLead.daysInStage)} />
                <Field icon={IndianRupee} label="ARC" value={inr(viewingLead.arcAmount)} />
                <Field icon={Briefcase} label="Plan" value={viewingLead.actualPlanName} />
              </Section>

              <Section title="Ownership">
                <Field icon={Users} label="Assigned BDM" value={viewingLead.bdm?.name} />
                <Field icon={Mail} label="BDM Email" value={viewingLead.bdm?.email} />
                <Field icon={Clock} label="Created" value={formatDate(viewingLead.createdAt)} />
                <Field icon={Clock} label="Last activity" value={formatDate(viewingLead.lastActivityAt)} />
              </Section>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingLead(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {children}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
