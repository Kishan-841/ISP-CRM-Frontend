'use client';

import { useEffect, useState, useMemo } from 'react';
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
  UserPlus,
  CheckCircle2,
  Circle,
} from 'lucide-react';

import { useAuthStore, useTeamPerformanceStore } from '@/lib/store';
import { useModal } from '@/lib/useModal';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { stageColorClass } from '@/lib/leadStageColors';

// Team Leads — the BDM Team Leader's master list of EVERY lead owned by the
// BDMs under them. Built around the questions a TL actually asks:
//   "Whose lead is this?"        → BDM column + filter
//   "Where did it come from?"    → Source column (ISR-assigned vs BDM self-created)
//   "Where is it right now?"     → derived current stage + which team owns it
//   "Is it going stale?"         → days in stage / last activity
//   "What has happened so far?"  → journey timeline in the detail view

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
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'isr', label: 'Assigned by ISR' },
  { value: 'bdm', label: 'Self-created (BDM)' },
  { value: 'sam', label: 'SAM' },
];

const BUCKET_FILTER_OPTIONS = [
  ['all', 'All stages'],
  ['BDM', 'BDM'],
  ['FEASIBILITY', 'Feasibility'],
  ['OPS', 'OPS'],
  ['SALES_DIRECTOR', 'Sales Director'],
  ['DOCS', 'Docs'],
  ['ACCOUNTS', 'Accounts'],
  ['NOC', 'NOC'],
  ['STORE', 'Store'],
  ['DELIVERY', 'Delivery'],
  ['PENDING_ACTIVATION', 'Pending Activation'],
  ['ACTIVE', 'Active'],
  ['COLD', 'Cold'],
  ['DROPPED', 'Dropped'],
];

const JOURNEY_STEPS = [
  ['feasibilityReviewedAt', 'Feasibility reviewed'],
  ['opsApprovedAt', 'OPS approved'],
  ['superAdmin2ApprovedAt', 'Sales Director approved'],
  ['loginCompletedAt', 'Customer login completed'],
  ['docsVerifiedAt', 'Docs verified'],
  ['accountsVerifiedAt', 'Accounts verified'],
  ['pushedToInstallationAt', 'Pushed to installation'],
  ['customerCreatedAt', 'Customer account created (NOC)'],
  ['nocConfiguredAt', 'NOC configured'],
  ['installationCompletedAt', 'Installation completed'],
  ['customerAcceptanceAt', 'Customer accepted'],
  ['demoPlanAssignedAt', 'Demo plan assigned'],
  ['actualPlanCreatedAt', 'Plan created'],
];

function StageBadge({ stage }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageColorClass(stage)}`}>
      {stage || '—'}
    </span>
  );
}

function SourceBadge({ row }) {
  const isISR = row.createdBy?.role === 'ISR';
  return (
    <div className="flex flex-col">
      <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
        isISR
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}>
        {isISR ? 'Assigned by ISR' : (row.sourceLabel || '—')}
      </span>
      {row.createdBy && (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {row.createdBy.name} · {formatDate(row.createdAt)}
        </span>
      )}
    </div>
  );
}

export default function TeamLeadsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    byMember,
    totals,
    leads,
    pagination,
    leadsLoading,
    fetchSummary,
    fetchLeads,
  } = useTeamPerformanceStore();

  const isAllowed = user?.role === 'BDM_TEAM_LEADER' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER';

  const [bdmId, setBdmId] = useState('all');
  const [source, setSource] = useState('all');
  const [bucket, setBucket] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingLead, setViewingLead] = useState(null);

  useEffect(() => {
    if (user && !isAllowed) router.push('/dashboard');
  }, [user, isAllowed, router]);

  // Member list for the BDM dropdown.
  useEffect(() => {
    if (isAllowed) fetchSummary();
  }, [isAllowed, fetchSummary]);

  useEffect(() => {
    if (!isAllowed) return;
    fetchLeads({ bdmId, source, bucket, search, page, limit: 25 });
  }, [isAllowed, fetchLeads, bdmId, source, bucket, search, page]);

  useEffect(() => { setPage(1); }, [bdmId, source, bucket, search]);

  useModal(Boolean(viewingLead), () => setViewingLead(null));

  const selectedBdmName = useMemo(
    () => (byMember || []).find(m => m.id === bdmId)?.name,
    [byMember, bdmId]
  );

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
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div className="min-w-0">
          <div className="text-sm text-slate-900 dark:text-slate-100 truncate">{row.contactName || '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.phone || ''}</div>
        </div>
      ),
    },
    {
      key: 'bdm',
      label: 'BDM',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          {row.bdm?.name || '—'}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (row) => <SourceBadge row={row} />,
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
            {row.currentOwner ? ` · with ${row.currentOwner}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'arc',
      label: 'ARC',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-white">{inr(row.arcAmount)}</span>
      ),
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      render: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(row.lastActivityAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={bdmId === 'all' ? 'Team Leads' : `${selectedBdmName || 'Member'}'s Leads`}
        description="Every lead owned by your BDMs — who brought it in, where it stands right now, and how long it's been sitting there."
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <select
          value={bdmId}
          onChange={(e) => setBdmId(e.target.value)}
          className="w-full lg:w-56 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">All BDMs ({totals?.totalLeads || 0} leads)</option>
          {(byMember || []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.role === 'BDM_TEAM_LEADER' ? ' (TL)' : ''} — {m.totalLeads} leads
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full lg:w-48 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {SOURCE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          className="w-full lg:w-48 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {BUCKET_FILTER_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, phone, or lead #"
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div className="text-xs text-slate-500 self-center whitespace-nowrap">
          {pagination.total} lead{pagination.total === 1 ? '' : 's'}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={leads || []}
        loading={leadsLoading}
        emptyIcon={Users}
        emptyMessage="No leads found"
        emptySubtitle={source !== 'all' || bucket !== 'all' || search ? 'Try removing a filter.' : 'No leads under your team yet.'}
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

      {/* Detail modal — customer, origin, and the full journey */}
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
                <SourceBadge row={viewingLead} />
              </div>

              <Section title="Customer">
                <Field icon={Briefcase} label="Company" value={viewingLead.company} />
                <Field icon={Users} label="Name" value={viewingLead.contactName} />
                <Field icon={Phone} label="Phone" value={viewingLead.phone} />
                <Field icon={Mail} label="Email" value={viewingLead.email} />
              </Section>

              <Section title="Pipeline & Ownership">
                <Field icon={Layers} label="Current stage" value={viewingLead.currentStage} />
                <Field icon={Users} label="Currently with" value={viewingLead.currentOwner} />
                <Field icon={Users} label="Assigned BDM" value={viewingLead.bdm?.name} />
                <Field
                  icon={UserPlus}
                  label="Origin"
                  value={viewingLead.createdBy
                    ? `${viewingLead.createdBy.name} (${viewingLead.createdBy.role}) · ${viewingLead.sourceLabel || ''}`
                    : viewingLead.sourceLabel}
                />
                <Field icon={IndianRupee} label="ARC" value={inr(viewingLead.arcAmount)} />
                <Field icon={Clock} label="Time in stage" value={formatRelative(viewingLead.daysInStage)} />
              </Section>

              {viewingLead.journey && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Journey</h4>
                  </div>
                  <div className="p-4 space-y-0.5">
                    <div className="flex items-start gap-3 py-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                        <p className="text-sm text-slate-900 dark:text-white">
                          Created{viewingLead.createdBy ? ` by ${viewingLead.createdBy.name}` : ''}
                          {viewingLead.sourceLabel ? <span className="text-xs text-slate-500"> · {viewingLead.sourceLabel}</span> : null}
                        </p>
                        <p className="text-xs text-slate-500 whitespace-nowrap">{formatDate(viewingLead.journey.createdAt)}</p>
                      </div>
                    </div>
                    {JOURNEY_STEPS.map(([key, label]) => {
                      const reached = Boolean(viewingLead.journey[key]);
                      return (
                        <div key={key} className={`flex items-start gap-3 py-1.5 ${reached ? '' : 'opacity-40'}`}>
                          {reached ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                            <p className="text-sm text-slate-900 dark:text-white">
                              {label}
                              {key === 'nocConfiguredAt' && viewingLead.journey.circuitId ? (
                                <span className="text-xs font-mono text-slate-500"> · {viewingLead.journey.circuitId}</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-slate-500 whitespace-nowrap">
                              {reached ? formatDate(viewingLead.journey[key]) : '—'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
