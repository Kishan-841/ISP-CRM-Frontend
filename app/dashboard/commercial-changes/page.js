'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  XCircle,
  CheckCircle,
  Eye,
  Clock,
  PowerOff,
  Loader2,
  X,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore, useCommercialChangeStore } from '@/lib/store';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable';
import TabBar from '@/components/TabBar';
import StatCard from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';

// Quick-disconnect / commercial-change inbox. Surfaces requests SAM raised
// (via the inbound webhook at /api/webhooks/sam/quick-disconnect.requested)
// and lets a super-admin approve in one click or reject with a required note.
//
// Approve / reject path: PATCH /api/commercial-changes/:id/decide. The backend
// commits the decision, audit row, and outbound webhook enqueue together; the
// retry cron + the existing samWebhook delivery layer handle the rest.

const inr = (n) =>
  typeof n === 'number'
    ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const truncate = (s, n = 80) => {
  if (!s) return '—';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

export default function CommercialChangesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    items,
    pagination,
    isLoading,
    pendingCount,
    fetchList,
    fetchPendingCount,
    decide,
    cancel,
  } = useCommercialChangeStore();

  // SUPER_ADMIN only — match backend route guard. Master inherits via the
  // existing master-bypass convention used elsewhere, so include it.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER';

  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  // Reject modal state.
  const [rejectingRow, setRejectingRow] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Cancel modal state (for already-approved QDs whose workflow isn't done).
  const [cancellingRow, setCancellingRow] = useState(null);
  const [cancelNote, setCancelNote] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // View detail modal.
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    if (user && !isSuperAdmin) router.push('/dashboard');
  }, [user, isSuperAdmin, router]);

  const status = activeTab === 'pending' ? 'PENDING' : activeTab === 'approved' ? 'APPROVED' : 'REJECTED';

  const refresh = useCallback(() => {
    if (!isSuperAdmin) return;
    fetchList({ status, page, limit: 20, search });
    fetchPendingCount();
  }, [fetchList, fetchPendingCount, status, page, search, isSuperAdmin]);

  useEffect(() => { refresh(); }, [refresh]);
  useSocketRefresh(refresh, { enabled: isSuperAdmin });

  useEffect(() => { setPage(1); }, [activeTab, search]);

  useModal(Boolean(rejectingRow), () => {
    if (!isRejecting) { setRejectingRow(null); setRejectNote(''); }
  });
  useModal(Boolean(cancellingRow), () => {
    if (!isCancelling) { setCancellingRow(null); setCancelNote(''); }
  });
  useModal(Boolean(viewing), () => setViewing(null));

  if (!isSuperAdmin) return null;

  const handleApprove = async (row) => {
    setBusyId(row.id);
    const result = await decide(row.id, 'APPROVE');
    if (result.success) {
      toast.success('Approved. Decision sent to SAM.');
      refresh();
    } else {
      toast.error(result.error || 'Failed to approve.');
    }
    setBusyId(null);
  };

  const handleReject = async () => {
    const trimmed = rejectNote.trim();
    if (trimmed.length < 3) {
      toast.error('Please provide a reason (min 3 chars).');
      return;
    }
    setIsRejecting(true);
    const result = await decide(rejectingRow.id, 'REJECT', trimmed);
    if (result.success) {
      toast.success('Rejected. Reason sent to SAM.');
      setRejectingRow(null);
      setRejectNote('');
      refresh();
    } else {
      toast.error(result.error || 'Failed to reject.');
    }
    setIsRejecting(false);
  };

  const handleCancel = async () => {
    const trimmed = cancelNote.trim();
    if (trimmed.length < 3) {
      toast.error('Please provide a reason (min 3 chars).');
      return;
    }
    setIsCancelling(true);
    const result = await cancel(cancellingRow.id, trimmed);
    if (result.success) {
      toast.success('Cancelled. SAM notified.');
      setCancellingRow(null);
      setCancelNote('');
      refresh();
    } else {
      toast.error(result.error || 'Failed to cancel.');
    }
    setIsCancelling(false);
  };

  // Approved-but-not-COMPLETED-yet QDs can be cancelled by admin. Once the
  // linked service order completes, the customer is already disconnected
  // and cancellation no longer makes sense.
  const isCancellable = (row) =>
    row.status === 'APPROVED' && row.serviceOrder && row.serviceOrder.status !== 'COMPLETED' && row.serviceOrder.status !== 'CANCELLED';

  const tabs = [
    { key: 'pending', label: 'Pending', count: pendingCount, icon: Clock, variant: 'warning' },
    { key: 'approved', label: 'Approved', icon: CheckCircle, variant: 'success' },
    { key: 'rejected', label: 'Rejected', icon: XCircle, variant: 'danger' },
  ];

  const rowsWithIndex = (items || []).map((r, i) => ({ ...r, _sno: (pagination.page - 1) * pagination.limit + i + 1 }));

  const columns = [
    { key: '_sno', label: 'S.No', width: '60px' },
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.lead?.campaignData?.company || row.lead?.leadNumber || '—'}
        </span>
      ),
    },
    {
      key: 'arc',
      label: 'Current ARC',
      render: (row) => (
        <span className="text-sm text-slate-900 dark:text-slate-100">{inr(row.lead?.arcAmount)}</span>
      ),
    },
    {
      key: 'plan',
      label: 'Current Plan',
      render: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {row.lead?.actualPlanName
            ? `${row.lead.actualPlanName}${row.lead.actualPlanBandwidth ? ` (${row.lead.actualPlanBandwidth} Mbps)` : ''}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'raisedBy',
      label: 'Raised By',
      render: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {row.raisedBySamEmail || row.raisedBySamUserId || '—'}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => (
        <span title={row.reason} className="text-sm text-slate-700 dark:text-slate-300">
          {truncate(row.reason, 90)}
        </span>
      ),
    },
    {
      key: 'raisedAt',
      label: 'Raised',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">{formatDateTime(row.raisedAt)}</span>
      ),
    },
    ...(status !== 'PENDING'
      ? [{
          key: 'decision',
          label: status === 'APPROVED' ? 'Approved By' : 'Rejected By',
          render: (row) => (
            <div className="text-sm">
              <div className="font-medium text-slate-900 dark:text-white">{row.decidedBy?.name || '—'}</div>
              <div className="text-xs text-slate-500">{formatDateTime(row.decidedAt)}</div>
              {row.decisionNote && (
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic" title={row.decisionNote}>
                  &ldquo;{truncate(row.decisionNote, 60)}&rdquo;
                </div>
              )}
            </div>
          ),
        }]
      : []),
    ...(status === 'APPROVED'
      ? [{
          key: 'serviceOrder',
          label: 'Service Order',
          render: (row) => row.serviceOrder ? (
            <a
              href={`/dashboard/order-approvals?orderId=${row.serviceOrder.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex flex-col text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700"
              title={row.serviceOrder.status?.replace(/_/g, ' ')}
            >
              <span className="font-medium">{row.serviceOrder.orderNumber}</span>
              <span className="text-slate-500">{row.serviceOrder.status?.replace(/_/g, ' ')}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-400" title="SAM hasn't created the workflow service order yet">awaiting SAM</span>
          ),
        }]
      : []),
  ];

  // Row-level actions rendered in DataTable's actions slot. PENDING rows get
  // view + approve + reject; history rows only get view.
  const rowActions = (row) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setViewing(row)}
        className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md"
        title="View details"
      >
        <Eye size={16} />
      </button>
      {status === 'PENDING' && (
        <>
          <button
            onClick={() => handleApprove(row)}
            disabled={busyId === row.id}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md disabled:opacity-50"
            title="Approve"
          >
            {busyId === row.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          </button>
          <button
            onClick={() => { setRejectingRow(row); setRejectNote(''); }}
            disabled={busyId === row.id}
            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
            title="Reject"
          >
            <XCircle size={16} />
          </button>
        </>
      )}
      {status === 'APPROVED' && isCancellable(row) && (
        <button
          onClick={() => { setCancellingRow(row); setCancelNote(''); }}
          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          title="Cancel workflow"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Disconnects"
        description="SAM-raised commercial change requests awaiting your decision."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard color="orange" icon={Clock} label="Pending" value={pendingCount || 0} />
        <StatCard color="emerald" icon={CheckCircle} label="Approved (page)" value={status === 'APPROVED' ? pagination.total : '—'} />
        <StatCard color="red" icon={XCircle} label="Rejected (page)" value={status === 'REJECTED' ? pagination.total : '—'} />
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, reason, or SAM raiser email"
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* DataTable owns its own container styling — no Card wrap here, otherwise
          we get the double-card visual the user flagged. */}
      <DataTable
        columns={columns}
        data={rowsWithIndex}
        loading={isLoading}
        emptyIcon={PowerOff}
        emptyMessage="No quick disconnects"
        emptySubtitle={status === 'PENDING' ? 'Nothing waiting on your decision.' : 'No history in this tab yet.'}
        serverPagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
        }}
        onPageChange={setPage}
        actions={rowActions}
      />

      {/* Reject Modal */}
      {rejectingRow && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Reject Quick Disconnect</h2>
              </div>
              <button
                onClick={() => { setRejectingRow(null); setRejectNote(''); }}
                disabled={isRejecting}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
                <div className="font-medium text-slate-900 dark:text-white">
                  {rejectingRow.lead?.campaignData?.company || '—'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Raised by {rejectingRow.raisedBySamEmail || '—'}</div>
              </div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={4}
                placeholder="Explain why SAM should not proceed with this disconnect."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500">SAM will see this note alongside the rejection.</p>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setRejectingRow(null); setRejectNote(''); }}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={isRejecting || rejectNote.trim().length < 3}
              >
                {isRejecting ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Rejecting...</>
                ) : (
                  'Send Rejection'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancellingRow && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Cancel Workflow</h2>
              </div>
              <button
                onClick={() => { setCancellingRow(null); setCancelNote(''); }}
                disabled={isCancelling}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
                <div className="font-medium text-slate-900 dark:text-white">
                  {cancellingRow.lead?.campaignData?.company || '—'}
                </div>
                {cancellingRow.serviceOrder && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Service order {cancellingRow.serviceOrder.orderNumber} — {cancellingRow.serviceOrder.status?.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={4}
                placeholder="Why are you cancelling this disconnection mid-workflow?"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500">
                SAM will revert the account back to ACTIVE. The linked service order will be marked CANCELLED on CRM.
              </p>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setCancellingRow(null); setCancelNote(''); }}
                disabled={isCancelling}
              >
                Keep workflow
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancel}
                disabled={isCancelling || cancelNote.trim().length < 3}
              >
                {isCancelling ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Cancelling...</>
                ) : (
                  'Cancel Workflow'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewing && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <ShieldCheck size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  Quick Disconnect Request
                </h2>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
              <Section title="Customer">
                <Field label="Company" value={viewing.lead?.campaignData?.company} />
                <Field label="Lead Number" value={viewing.lead?.leadNumber} />
                <Field label="Contact" value={viewing.lead?.campaignData?.name} />
                <Field label="Email" value={viewing.lead?.campaignData?.email} />
              </Section>

              <Section title="Current State (live)">
                <Field label="Current ARC" value={inr(viewing.lead?.arcAmount)} />
                <Field
                  label="Current Plan"
                  value={
                    viewing.lead?.actualPlanName
                      ? `${viewing.lead.actualPlanName}${viewing.lead.actualPlanBandwidth ? ` (${viewing.lead.actualPlanBandwidth} Mbps)` : ''}`
                      : '—'
                  }
                />
              </Section>

              {(viewing.requestedArc || viewing.requestedPlanName || viewing.requestedBandwidth) && (
                <Section title="Snapshot at Raise Time">
                  <Field label="ARC" value={inr(viewing.requestedArc)} />
                  <Field
                    label="Plan"
                    value={
                      viewing.requestedPlanName
                        ? `${viewing.requestedPlanName}${viewing.requestedBandwidth ? ` (${viewing.requestedBandwidth} Mbps)` : ''}`
                        : '—'
                    }
                  />
                </Section>
              )}

              <Section title="Raised By">
                <Field label="SAM User" value={viewing.raisedBySamEmail || viewing.raisedBySamUserId} />
                <Field label="At" value={formatDateTime(viewing.raisedAt)} />
              </Section>

              <Section title="Reason">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {viewing.reason}
                </p>
              </Section>

              {viewing.status !== 'PENDING' && (
                <Section title={viewing.status === 'APPROVED' ? 'Approval' : 'Rejection'}>
                  <Field label={viewing.status === 'APPROVED' ? 'Approved By' : 'Rejected By'} value={viewing.decidedBy?.name} />
                  <Field label="At" value={formatDateTime(viewing.decidedAt)} />
                  {viewing.decisionNote && (
                    <div className="col-span-full">
                      <p className="text-xs text-slate-500 mb-0.5">Note</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewing.decisionNote}</p>
                    </div>
                  )}
                </Section>
              )}

              {viewing.serviceOrder && (
                <Section title="Follow-on Service Order">
                  <Field label="Order #" value={viewing.serviceOrder.orderNumber} />
                  <Field label="Status" value={viewing.serviceOrder.status?.replace(/_/g, ' ')} />
                  <div className="col-span-full">
                    <a
                      href={`/dashboard/order-approvals?orderId=${viewing.serviceOrder.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700"
                    >
                      Open in workflow queue →
                    </a>
                  </div>
                </Section>
              )}
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              {viewing.status === 'PENDING' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => { const row = viewing; setViewing(null); setRejectingRow(row); setRejectNote(''); }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => { const row = viewing; setViewing(null); await handleApprove(row); }}
                  >
                    Approve
                  </Button>
                </>
              )}
              {viewing.status !== 'PENDING' && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setViewing(null)}>Close</Button>
              )}
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

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-white break-words">{value || '—'}</p>
    </div>
  );
}
