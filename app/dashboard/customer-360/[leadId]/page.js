'use client';

import { useEffect, useState, Fragment } from 'react';
import { useParams } from 'next/navigation';
import { useCustomer360Store } from '@/lib/store';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Wifi,
  WifiOff,
  DollarSign,
  FileText,
  AlertTriangle,
  Users,
  Calendar,
  Package,
  Activity,
  Loader2,
  ChevronDown,
  ChevronRight,
  Image,
  Eye,
  Link2,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  MapPin as MapPinIcon,
  Video,
  PhoneCall,
  RefreshCw,
  Copy,
  ExternalLink,
  Hash,
  UserCheck,
  Download,
  X,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CUSTOMER_360_DETAIL_LEAD_STATUS_CONFIG,
  CUSTOMER_360_DETAIL_DELIVERY_STATUS_CONFIG,
  INVOICE_STATUS_DARK_CONFIG,
  CREDIT_NOTE_STATUS_CONFIG,
  getStatusBadgeClass,
} from '@/lib/statusConfig';
import TabBar from '@/components/TabBar';

// ─── Formatters ───

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatStatus(status) {
  if (!status) return '-';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exportCustomerCSV(summary, tabData) {
  const rows = [['Customer 360 Export']];
  rows.push([]);

  // Summary info
  rows.push(['Company', summary.company || '']);
  rows.push(['Contact', summary.name || '']);
  rows.push(['Phone', summary.campaignData?.phone || '']);
  rows.push(['Email', summary.campaignData?.email || '']);
  rows.push(['GST', summary.customerGstNo || '']);
  rows.push(['Username', summary.customerUsername || '']);
  rows.push(['BDM', summary.assignedTo?.name || '']);
  rows.push(['Status', summary.status || '']);
  rows.push(['Delivery Status', summary.deliveryStatus || '']);
  rows.push(['Plan', summary.actualPlanName || '']);
  rows.push(['Balance', summary.currentBalance || 0]);
  rows.push([]);

  // Invoices
  if (tabData.billing?.invoices?.length) {
    rows.push(['--- INVOICES ---']);
    rows.push(['Invoice#', 'Date', 'Due Date', 'Total', 'Paid', 'Remaining', 'Status']);
    tabData.billing.invoices.forEach(inv => {
      rows.push([inv.invoiceNumber, inv.invoiceDate, inv.dueDate, inv.grandTotal, inv.totalPaidAmount, inv.remainingAmount, inv.status]);
    });
    rows.push([]);
  }

  // Complaints
  if (tabData.complaints?.complaints?.length) {
    rows.push(['--- COMPLAINTS ---']);
    rows.push(['Complaint#', 'Category', 'Priority', 'Status', 'Created']);
    tabData.complaints.complaints.forEach(c => {
      rows.push([c.complaintNumber, c.category?.name || '', c.priority, c.status, c.createdAt]);
    });
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customer-360-${(summary.company || 'export').replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatFieldName(field) {
  if (!field) return 'Field';
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Status badge colors ───

function getLeadStatusStyle(status) {
  return getStatusBadgeClass(status, CUSTOMER_360_DETAIL_LEAD_STATUS_CONFIG);
}

function getDeliveryStatusStyle(status) {
  return getStatusBadgeClass(status, CUSTOMER_360_DETAIL_DELIVERY_STATUS_CONFIG);
}

function getInvoiceStatusStyle(status) {
  return getStatusBadgeClass(status, INVOICE_STATUS_DARK_CONFIG);
}

function getCreditNoteStatusStyle(status) {
  return getStatusBadgeClass(status, CREDIT_NOTE_STATUS_CONFIG);
}

// ─── Stage timeline colors ───

function getStageColor(stage, label) {
  if (label?.includes('Rejected') || label?.includes('Dropped')) return 'red';
  if (['ACTUAL_PLAN', 'CUSTOMER_ACCEPTANCE', 'CUSTOMER_CREATED', 'NOC_CONFIGURED', 'DOCS_VERIFIED', 'ACCOUNTS_VERIFIED', 'GST_VERIFIED', 'OPS_APPROVED'].includes(stage)) return 'green';
  if (['BDM_ASSIGNED', 'ISR_ASSIGNED', 'FEASIBILITY_ASSIGNED', 'DELIVERY_REQUESTED', 'DEMO_PLAN', 'PUSHED_TO_INSTALLATION'].includes(stage)) return 'blue';
  if (stage === 'ISR_CALL') return 'indigo';
  if (stage === 'STATUS_CHANGE') return 'gray';
  return 'orange';
}

const STAGE_COLORS = {
  red: { dot: 'bg-red-500', ring: 'ring-red-100 dark:ring-red-900/50' },
  green: { dot: 'bg-emerald-500', ring: 'ring-emerald-100 dark:ring-emerald-900/50' },
  blue: { dot: 'bg-blue-500', ring: 'ring-blue-100 dark:ring-blue-900/50' },
  indigo: { dot: 'bg-indigo-500', ring: 'ring-indigo-100 dark:ring-indigo-900/50' },
  gray: { dot: 'bg-slate-400', ring: 'ring-slate-100 dark:ring-slate-700/50' },
  orange: { dot: 'bg-orange-500', ring: 'ring-orange-100 dark:ring-orange-900/50' },
};

// ─── Tab definitions ───

const TABS = [
  { key: 'journey', label: 'Journey', icon: Activity },
  { key: 'billing', label: 'Billing', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'complaints', label: 'Complaints', icon: AlertTriangle },
  { key: 'sam', label: 'SAM', icon: Users },
];

// ─── Skeleton loader ───

function SummarySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 animate-pulse">
      {/* Top row */}
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-3">
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
        <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-5 bg-slate-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Journey Tab ───

function JourneyTab({ data, loading }) {
  if (loading) return <JourneyTabSkeleton />;

  if (!data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8">
        <p className="text-center text-slate-500 dark:text-slate-400">No journey data available.</p>
      </div>
    );
  }

  const { timeline = [], statusChangeLogs = [], materials = [] } = data;

  // Merge timeline events and status change logs
  const allEvents = [
    ...timeline.map((e) => ({ ...e, eventType: 'stage' })),
    ...statusChangeLogs.map((e) => ({
      stage: 'STATUS_CHANGE',
      label: `${formatFieldName(e.field)}: ${e.oldValue || '-'} → ${e.newValue || '-'}`,
      timestamp: e.changedAt,
      user: e.changedBy,
      meta: e.reason ? { reason: e.reason } : null,
      eventType: 'statusChange',
    })),
  ].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-6">
          Customer Journey Timeline
        </h3>

        {allEvents.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            No journey events recorded.
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-0">
              {allEvents.map((event, index) => (
                <TimelineEvent
                  key={`${event.stage}-${index}`}
                  event={event}
                  isLast={index === allEvents.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Materials section */}
      {materials.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Materials Used
          </h3>
          <MaterialsTable materials={materials} />
        </div>
      )}
    </div>
  );
}

function TimelineEvent({ event, isLast }) {
  const color = getStageColor(event.stage, event.label);
  const colors = STAGE_COLORS[color];
  const isStatusChange = event.eventType === 'statusChange';

  return (
    <div className={`relative flex gap-4 ${isLast ? '' : 'pb-6'}`}>
      {/* Dot */}
      <div
        className={`relative z-10 flex-shrink-0 mt-1.5 rounded-full ring-4 ${colors.dot} ${colors.ring} ${
          isStatusChange ? 'w-2.5 h-2.5 ml-[2px]' : 'w-3.5 h-3.5'
        }`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span
            className={`font-medium ${
              isStatusChange
                ? 'text-xs text-slate-500 dark:text-slate-400'
                : 'text-sm text-slate-900 dark:text-white'
            }`}
          >
            {event.label}
          </span>
          {event.user && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {event.user.name}
              </span>
              {event.user.role && (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] uppercase tracking-wider">
                  {event.user.role.replace(/_/g, ' ')}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Timestamp */}
        {event.timestamp && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {formatDateTime(event.timestamp)}
          </p>
        )}

        {/* Meta details */}
        {event.meta && <EventMeta meta={event.meta} stage={event.stage} />}
      </div>
    </div>
  );
}

function parseFeasibilityNotes(notes) {
  if (!notes) return null;
  let data = notes;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  if (!data || typeof data !== 'object') return null;
  if (!data.vendorType && !data.capex && !data.vendorDetails) return null;
  return data;
}

function FeasibilityNotesDisplay({ data }) {
  const vd = data.vendorDetails || {};
  const equipmentItems = ['fiberRequired', 'switch', 'sfp', 'closure', 'patchChord']
    .map(key => {
      const item = vd[key] || data[key];
      if (!item || (!item.modelNumber && !item.quantity)) return null;
      return { name: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), ...item };
    })
    .filter(Boolean);

  const fmt = (v) => v != null && v !== '' ? v : null;

  return (
    <div className="mt-2 space-y-2">
      {/* Vendor & POP Info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {fmt(data.vendorType) && (
          <MetaItem label="Vendor Type" value={data.vendorType === 'ownNetwork' ? 'Own Network' : 'Fiber Vendor'} />
        )}
        {fmt(vd.popLocation) && <MetaItem label="POP Location" value={vd.popLocation} />}
        {fmt(vd.vendorName || vd.vendorDetails?.companyName) && (
          <MetaItem label="Vendor" value={vd.vendorName || vd.vendorDetails?.companyName} />
        )}
        {fmt(vd.perMtrCost) && <MetaItem label="Per Meter Cost" value={`Rs. ${vd.perMtrCost}`} />}
      </div>

      {/* Equipment Table */}
      {equipmentItems.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-1.5 px-2 font-medium text-slate-500 dark:text-slate-400">Equipment</th>
                <th className="text-left py-1.5 px-2 font-medium text-slate-500 dark:text-slate-400">Model</th>
                <th className="text-center py-1.5 px-2 font-medium text-slate-500 dark:text-slate-400">Qty</th>
                <th className="text-right py-1.5 px-2 font-medium text-slate-500 dark:text-slate-400">Unit Price</th>
                <th className="text-right py-1.5 px-2 font-medium text-slate-500 dark:text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {equipmentItems.map((item, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">{item.name}</td>
                  <td className="py-1.5 px-2 font-mono text-slate-600 dark:text-slate-400">{item.modelNumber || '-'}</td>
                  <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400">{item.quantity || '-'}</td>
                  <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-400">{item.unitPrice ? `Rs. ${Number(item.unitPrice).toLocaleString('en-IN')}` : '-'}</td>
                  <td className="py-1.5 px-2 text-right font-medium text-slate-700 dark:text-slate-300">{item.total ? `Rs. ${Number(item.total).toLocaleString('en-IN')}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cost Summary */}
      {(fmt(data.capex) || fmt(vd.capex) || fmt(data.opex) || fmt(vd.opex)) && (
        <div className="flex gap-3">
          {fmt(data.capex ?? vd.capex) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              CAPEX: Rs. {Number(data.capex ?? vd.capex).toLocaleString('en-IN')}
            </span>
          )}
          {fmt(data.opex ?? vd.opex) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
              OPEX: Rs. {Number(data.opex ?? vd.opex).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      )}

      {fmt(data.additionalNotes) && <MetaItem label="Additional Notes" value={data.additionalNotes} />}
      {fmt(data.commissionPercentage) && <MetaItem label="Commission" value={`${data.commissionPercentage}%`} />}
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}:</span> {value}
    </p>
  );
}

function EventMeta({ meta, stage }) {
  if (!meta) return null;

  // Special handling for feasibility notes (complex JSON object)
  if (meta.notes && stage === 'FEASIBILITY_ASSIGNED') {
    const feasData = parseFeasibilityNotes(meta.notes);
    if (feasData) return <FeasibilityNotesDisplay data={feasData} />;
  }

  const items = [];

  if (meta.teamLeader?.name) items.push({ label: 'Team Leader', value: meta.teamLeader.name });
  if (meta.notes && typeof meta.notes === 'string') items.push({ label: 'Notes', value: meta.notes });
  if (meta.reason) items.push({ label: 'Reason', value: meta.reason });
  if (meta.rejectedReason) items.push({ label: 'Rejection Reason', value: meta.rejectedReason });
  if (meta.status && stage === 'FEASIBILITY_ASSIGNED') {
    items.push({ label: 'Status', value: formatStatus(meta.status) });
  }
  if (meta.duration) items.push({ label: 'Duration', value: `${meta.duration}s` });
  if (meta.username) items.push({ label: 'Username', value: meta.username });

  // Delivery request approval chain
  if (meta.requestNumber) {
    items.push({ label: 'Status', value: formatStatus(meta.status) });
    if (meta.approvalChain?.superAdmin) {
      items.push({
        label: 'Super Admin Approval',
        value: `${meta.approvalChain.superAdmin.user.name} on ${formatDate(meta.approvalChain.superAdmin.at)}`,
      });
    }
    if (meta.approvalChain?.areaHead) {
      items.push({
        label: 'Area Head Approval',
        value: `${meta.approvalChain.areaHead.user.name} on ${formatDate(meta.approvalChain.areaHead.at)}`,
      });
    }
    if (meta.dispatchedAt) items.push({ label: 'Dispatched', value: formatDate(meta.dispatchedAt) });
    if (meta.completedAt) items.push({ label: 'Completed', value: formatDate(meta.completedAt) });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {items.map((item, i) => (
        <MetaItem key={i} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function MaterialsTable({ materials }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Product
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Type
            </th>
            <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Assigned
            </th>
            <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Used
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Serial Numbers
            </th>
            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              DR#
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {materials.map((item, index) => (
            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">
                {item.product || '-'}
              </td>
              <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                {formatStatus(item.type || '')}
              </td>
              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                {item.assignedQuantity || item.quantity || 0}
              </td>
              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                {item.usedQuantity || 0}
              </td>
              <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                {item.serialNumbers?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.serialNumbers.map((sn, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs rounded font-mono"
                      >
                        {sn}
                      </span>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                {item.deliveryRequest || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JourneyTabSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 animate-pulse">
      <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="space-y-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-1 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Billing Tab ───

function BillingTab({ data, loading, leadId }) {
  if (loading) return <BillingTabSkeleton />;

  if (!data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8">
        <p className="text-center text-slate-500 dark:text-slate-400">No billing data available.</p>
      </div>
    );
  }

  const { pricing, currentPlan, planHistory, invoices, advancePayments, creditNotes, accountSummary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AccountSummaryRow summary={accountSummary} />
      </div>

      {leadId && (
        <div className="flex justify-end">
          <Link
            href={`/dashboard/billing-mgmt/${leadId}/ledger`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View Full Ledger
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PricingCard pricing={pricing} />
        <CurrentPlanCard plan={currentPlan} />
      </div>

      {planHistory?.length > 0 && <PlanHistorySection history={planHistory} />}
      <InvoicesSection invoices={invoices} />
      {advancePayments?.length > 0 && <AdvancePaymentsSection payments={advancePayments} />}
      {creditNotes?.length > 0 && <CreditNotesSection notes={creditNotes} />}
    </div>
  );
}

function AccountSummaryRow({ summary }) {
  if (!summary) return null;
  const cards = [
    { label: 'Total Billed', value: summary.totalBilled, color: 'text-slate-900 dark:text-white' },
    { label: 'Total Paid', value: summary.totalPaid, color: 'text-emerald-600 dark:text-emerald-400' },
    {
      label: 'Outstanding Balance',
      value: summary.outstandingBalance,
      color: summary.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{card.label}</p>
          <p className={`text-xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
        </div>
      ))}
    </div>
  );
}

function PricingCard({ pricing }) {
  if (!pricing) return null;
  const items = [
    { label: 'ARC (Annual)', value: formatCurrency(pricing.arcAmount) },
    { label: 'OTC (One-time)', value: formatCurrency(pricing.otcAmount) },
    { label: 'Advance', value: formatCurrency(pricing.advanceAmount) },
    { label: 'Payment Terms', value: pricing.paymentTerms || '-' },
  ];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Pricing</h4>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={i}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentPlanCard({ plan }) {
  if (!plan || !plan.name) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Current Plan</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">No plan assigned.</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Current Plan</h4>
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            plan.isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {plan.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <p className="text-base font-semibold text-slate-900 dark:text-white mb-2">{plan.name}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Bandwidth: </span>
          <span className="text-slate-900 dark:text-white">
            {plan.bandwidth || '-'}{plan.uploadBandwidth ? ` / ${plan.uploadBandwidth}` : ''}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Price: </span>
          <span className="text-slate-900 dark:text-white">{formatCurrency(plan.price)}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Cycle: </span>
          <span className="text-slate-900 dark:text-white">{formatStatus(plan.billingCycle || '')}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Validity: </span>
          <span className="text-slate-900 dark:text-white">{plan.validityDays ? `${plan.validityDays} days` : '-'}</span>
        </div>
        {plan.startDate && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">Start: </span>
            <span className="text-slate-900 dark:text-white">{formatDate(plan.startDate)}</span>
          </div>
        )}
        {plan.endDate && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">End: </span>
            <span className="text-slate-900 dark:text-white">{formatDate(plan.endDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanHistorySection({ history }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Plan History</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Old Plan</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Plan</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Difference</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      h.actionType === 'UPGRADE' && h.previousArc !== h.newArc
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : h.actionType === 'UPGRADE' && h.newArc < h.previousArc
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}
                  >
                    {h.actionType === 'UPGRADE' && h.newArc < h.previousArc ? 'RATE REVISION' : h.actionType}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-slate-900 dark:text-white">{h.previousPlanName || '-'}</span>
                  <br />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {h.previousBandwidth || '-'} | {formatCurrency(h.previousArc)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-slate-900 dark:text-white">{h.newPlanName || '-'}</span>
                  <br />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {h.newBandwidth || '-'} | {formatCurrency(h.newArc)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-white">
                  {formatCurrency(h.differenceAmount)}
                </td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{formatDate(h.upgradeDate)}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{h.createdBy?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoicesSection({ invoices }) {
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statuses = ['ALL', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'GENERATED', 'CANCELLED'];
  const filtered = statusFilter === 'ALL' ? invoices : invoices?.filter(inv => inv.status === statusFilter);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          Invoices <span className="text-slate-500 dark:text-slate-400 font-normal">({filtered?.length || 0}{statusFilter !== 'ALL' ? ` of ${invoices?.length || 0}` : ''})</span>
        </h4>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : formatStatus(s)}</option>
            ))}
          </select>
        </div>
      </div>
      {!filtered?.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No invoices generated yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="w-8" />
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice#</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">GST</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paid</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Amt</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const isExpanded = expandedId === inv.id;
                const hasDetails = (inv.payments?.length > 0) || (inv.creditNotes?.length > 0);
                return (
                  <Fragment key={inv.id}>
                    <tr
                      className={`border-b border-slate-100 dark:border-slate-800 ${hasDetails ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                      onClick={() => hasDetails && setExpandedId(isExpanded ? null : inv.id)}
                    >
                      <td className="py-2 px-1 text-center">
                        {hasDetails && (
                          isExpanded
                            ? <ChevronDown className="h-4 w-4 text-slate-400 inline" />
                            : <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                        )}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                      <td className="py-2 px-2 text-right text-slate-900 dark:text-white">{formatCurrency(inv.baseAmount)}</td>
                      <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(inv.totalGstAmount)}</td>
                      <td className="py-2 px-2 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.totalPaidAmount)}</td>
                      <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{formatCurrency(inv.remainingAmount ?? (inv.grandTotal - (inv.totalPaidAmount || 0)))}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getInvoiceStatusStyle(inv.status)}`}>
                          {formatStatus(inv.status)}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="bg-slate-50 dark:bg-slate-800/30 px-6 py-3">
                          {inv.payments?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Payments</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500 dark:text-slate-400">
                                    <th className="text-left py-1 px-2">Receipt#</th>
                                    <th className="text-left py-1 px-2">Date</th>
                                    <th className="text-right py-1 px-2">Amount</th>
                                    <th className="text-left py-1 px-2">Mode</th>
                                    <th className="text-left py-1 px-2">Remark</th>
                                    <th className="text-left py-1 px-2">By</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.payments.map((p) => (
                                    <tr key={p.id} className="text-slate-600 dark:text-slate-400">
                                      <td className="py-1 px-2 font-mono">{p.receiptNumber || '-'}</td>
                                      <td className="py-1 px-2 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                                      <td className="py-1 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(p.amount)}
                                      </td>
                                      <td className="py-1 px-2">{p.paymentMode || '-'}</td>
                                      <td className="py-1 px-2 max-w-[200px] truncate">{p.remark || '-'}</td>
                                      <td className="py-1 px-2">{p.createdBy?.name || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {inv.creditNotes?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Credit Notes Applied</p>
                              <div className="flex flex-wrap gap-2">
                                {inv.creditNotes.map((cn) => (
                                  <span
                                    key={cn.id}
                                    className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs rounded"
                                  >
                                    {cn.creditNoteNumber} — {formatCurrency(cn.totalAmount)} ({formatStatus(cn.reason)})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdvancePaymentsSection({ payments }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        Advance Payments <span className="text-slate-500 dark:text-slate-400 font-normal">({payments.length})</span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receipt#</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mode</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remark</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-2 px-3 font-mono text-xs text-slate-900 dark:text-white">{p.receiptNumber || '-'}</td>
                <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.paymentMode || '-'}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.bankAccount || '-'}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(p.transactionDate || p.createdAt)}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{p.remark || '-'}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.createdBy?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreditNotesSection({ notes }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        Credit Notes <span className="text-slate-500 dark:text-slate-400 font-normal">({notes.length})</span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">CN#</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Against Invoice</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {notes.map((cn) => (
              <tr key={cn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-2 px-3 font-mono text-xs text-slate-900 dark:text-white">{cn.creditNoteNumber}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(cn.creditNoteDate)}</td>
                <td className="py-2 px-3 text-right font-medium text-orange-600 dark:text-orange-400">{formatCurrency(cn.totalAmount)}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{formatStatus(cn.reason || '')}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getCreditNoteStatusStyle(cn.status)}`}>
                    {formatStatus(cn.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                  {cn.invoice?.invoiceNumber || cn.adjustedAgainstInvoice?.invoiceNumber || '-'}
                </td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{cn.createdBy?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}

// ─── Documents Tab ───

function DocumentPreviewModal({ url, title, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!url) return null;
  const isPdf = url.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-t-xl">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          <div className="flex items-center gap-2">
            {!isPdf && (
              <>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-400 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button onClick={() => setRotation(r => r + 90)} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
              <ExternalLink className="h-4 w-4" />
            </a>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-800 rounded-b-xl flex items-center justify-center min-h-[300px]">
          {isPdf ? (
            <iframe src={url} className="w-full h-[80vh]" title={title} />
          ) : (
            <img
              src={url}
              alt={title}
              className="max-w-full transition-transform duration-200"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ data, loading }) {
  const [previewDoc, setPreviewDoc] = useState(null);

  if (loading) return <TabSkeleton label="documents" />;
  if (!data) return <EmptyTab message="No document data available." />;

  const { documents = [], uploadMethod, screenshots, verification, uploadLinks = [] } = data;

  return (
    <div className="space-y-6">
      {/* Verification Status */}
      {verification && (verification.verifiedAt || verification.rejectedReason) && (
        <div className={`border rounded-xl p-4 ${
          verification.rejectedReason
            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {verification.rejectedReason ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {verification.rejectedReason ? 'Documents Rejected' : 'Documents Verified'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            By {verification.verifiedBy?.name || 'Unknown'} on {formatDate(verification.verifiedAt)}
          </p>
          {verification.rejectedReason && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Reason: {verification.rejectedReason}</p>
          )}
        </div>
      )}

      {/* Typed Documents */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Documents <span className="text-slate-500 dark:text-slate-400 font-normal">({documents.length})</span>
          </h4>
          {uploadMethod && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {uploadMethod}
            </span>
          )}
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc, i) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {formatStatus(doc.type || '')}
                  </span>
                </div>
                {doc.url && (
                  <button
                    onClick={() => setPreviewDoc({ url: doc.url, title: formatStatus(doc.type || 'Document') })}
                    className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <Eye className="h-3 w-3" /> View Document
                  </button>
                )}
                {doc.uploadedAt && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDate(doc.uploadedAt)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshots */}
      {screenshots && (screenshots.speedTest || screenshots.latencyTest || screenshots.customerAcceptance) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Screenshots</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Speed Test', data: screenshots.speedTest },
              { label: 'Latency Test', data: screenshots.latencyTest },
              { label: 'Customer Acceptance', data: screenshots.customerAcceptance },
            ]
              .filter((s) => s.data)
              .map((s, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button onClick={() => setPreviewDoc({ url: s.data.url, title: s.label })} className="block w-full">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <Image className="h-8 w-8 text-slate-400" />
                    </div>
                  </button>
                  <div className="p-2">
                    <p className="text-xs font-medium text-slate-900 dark:text-white">{s.label}</p>
                    {s.data.uploadedBy && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        By {s.data.uploadedBy.name} on {formatDate(s.data.uploadedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Upload Links */}
      {uploadLinks.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Upload Links <span className="text-slate-500 dark:text-slate-400 font-normal">({uploadLinks.length})</span>
          </h4>
          <div className="space-y-2">
            {uploadLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono text-slate-600 dark:text-slate-400">{link.token?.slice(0, 16)}...</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span>Views: {link.accessCount || 0}</span>
                  <span>Expires: {formatDate(link.expiresAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal url={previewDoc.url} title={previewDoc.title} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}

// ─── Complaints Tab ───

function getComplaintPriorityStyle(priority) {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'MEDIUM': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'LOW': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

function getComplaintStatusStyle(status) {
  switch (status) {
    case 'OPEN': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'PENDING': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'CLOSED': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
    case 'REOPENED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

function ComplaintsTab({ data, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (loading) return <TabSkeleton label="complaints" />;
  if (!data) return <EmptyTab message="No complaint data available." />;

  const { complaints: rawComplaints = [], stats = {} } = data;
  const complaints = rawComplaints.filter(c =>
    (priorityFilter === 'ALL' || c.priority === priorityFilter) &&
    (statusFilter === 'ALL' || c.status === statusFilter)
  );

  const statCards = [
    { label: 'Total', value: stats.total || 0, color: 'text-slate-900 dark:text-white' },
    { label: 'Open', value: stats.open || 0, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'In Progress', value: stats.inProgress || 0, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Resolved', value: stats.resolved || 0, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Closed', value: stats.closed || 0, color: 'text-slate-500 dark:text-slate-400' },
    { label: 'SLA Breached', value: stats.slaBreached || 0, color: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Complaints table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Complaints <span className="text-slate-500 dark:text-slate-400 font-normal">({complaints.length}{(priorityFilter !== 'ALL' || statusFilter !== 'ALL') ? ` of ${rawComplaints.length}` : ''})</span>
          </h4>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500">
              <option value="ALL">All Priorities</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500">
              <option value="ALL">All Statuses</option>
              {['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED', 'REOPENED'].map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
            </select>
          </div>
        </div>
        {complaints.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No complaints registered.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="w-8" />
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Complaint#</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned To</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">SLA</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className="border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      >
                        <td className="py-2 px-1 text-center">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-slate-400 inline" />
                            : <ChevronRight className="h-4 w-4 text-slate-400 inline" />}
                        </td>
                        <td className="py-2 px-2 font-mono text-xs text-slate-900 dark:text-white">{c.complaintNumber}</td>
                        <td className="py-2 px-2 text-slate-600 dark:text-slate-400">
                          {c.category?.name || '-'}
                          {c.subCategory?.name && (
                            <span className="block text-xs text-slate-400 dark:text-slate-500">{c.subCategory.name}</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getComplaintPriorityStyle(c.priority)}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getComplaintStatusStyle(c.status)}`}>
                            {formatStatus(c.status)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-600 dark:text-slate-400">
                          {c.assignments?.[0]?.user?.name || '-'}
                        </td>
                        <td className="py-2 px-2">
                          {c.slaStatus === 'BREACHED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <XCircle className="h-3.5 w-3.5" /> Breached
                            </span>
                          ) : c.slaStatus === 'MET' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="h-3.5 w-3.5" /> Met
                            </span>
                          ) : c.slaStatus === 'ON_TRACK' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <Clock className="h-3.5 w-3.5" /> On Track
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50 dark:bg-slate-800/30 px-6 py-3">
                            <div className="space-y-2 text-xs">
                              {c.description && (
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Description:</span>
                                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{c.description}</p>
                                </div>
                              )}
                              {c.resolutionNotes && (
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Resolution:</span>
                                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{c.resolutionNotes}</p>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-4 pt-1">
                                <span className="text-slate-500 dark:text-slate-400">
                                  Created by: <span className="font-medium text-slate-700 dark:text-slate-300">{c.createdBy?.name || '-'}</span>
                                </span>
                                {c.tatDeadline && (
                                  <span className="text-slate-500 dark:text-slate-400">
                                    TAT Deadline: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime(c.tatDeadline)}</span>
                                  </span>
                                )}
                                {c.reopenCount > 0 && (
                                  <span className="text-red-500 dark:text-red-400">Reopened {c.reopenCount}x</span>
                                )}
                                {c.resolvedAt && (
                                  <span className="text-slate-500 dark:text-slate-400">
                                    Resolved: {formatDate(c.resolvedAt)}
                                  </span>
                                )}
                              </div>
                              {c.assignments?.length > 0 && (
                                <div className="pt-1">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Assigned to:</span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {c.assignments.map((a, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                                        {a.user?.name} ({a.user?.role?.replace(/_/g, ' ')})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SAM Activity Tab ───

function getMeetingTypeIcon(type) {
  switch (type) {
    case 'VIDEO_CALL': return Video;
    case 'PHONE_CALL': return PhoneCall;
    case 'IN_PERSON': return MapPinIcon;
    default: return MessageSquare;
  }
}

function SamTab({ data, loading }) {
  if (loading) return <TabSkeleton label="SAM activity" />;
  if (!data) return <EmptyTab message="No SAM data available." />;

  const { assignment, meetings = [], visits = [], communications = [] } = data;

  return (
    <div className="space-y-6">
      {/* SAM Assignment Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">SAM Assignment</h4>
        {assignment ? (
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{assignment.samExecutive?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {assignment.samExecutive?.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Assigned by {assignment.assignedBy?.name || '-'} on {formatDate(assignment.assignedAt)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No SAM executive assigned.</p>
        )}
      </div>

      {/* Meetings Table */}
      {meetings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Meetings <span className="text-slate-500 dark:text-slate-400 font-normal">({meetings.length})</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {meetings.map((m) => {
                  const TypeIcon = getMeetingTypeIcon(m.meetingType);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(m.meetingDate)}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <TypeIcon className="h-3.5 w-3.5" />
                          {formatStatus(m.meetingType || '')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-900 dark:text-white max-w-[200px] truncate">{m.title || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : m.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {formatStatus(m.status)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(m.followUpDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visits Table */}
      {visits.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Visits <span className="text-slate-500 dark:text-slate-400 font-normal">({visits.length})</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Purpose</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outcome</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(v.visitDate)}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{formatStatus(v.visitType || '')}</td>
                    <td className="py-2 px-3 text-slate-900 dark:text-white max-w-[180px] truncate">{v.purpose || '-'}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{v.outcome || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        v.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {formatStatus(v.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(v.nextVisitDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Communications Table */}
      {communications.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Communications <span className="text-slate-500 dark:text-slate-400 font-normal">({communications.length})</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Channel</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sent</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {communications.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {formatStatus(comm.communicationType || '')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{formatStatus(comm.channel || '')}</td>
                    <td className="py-2 px-3 text-slate-900 dark:text-white max-w-[200px] truncate">{comm.subject || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        comm.status === 'SENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : comm.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {formatStatus(comm.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(comm.sentAt)}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{comm.samExecutive?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state for no activity */}
      {!assignment && meetings.length === 0 && visits.length === 0 && communications.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8">
          <p className="text-center text-slate-500 dark:text-slate-400">No SAM activity recorded for this customer.</p>
        </div>
      )}
    </div>
  );
}

// ─── Shared tab helpers ───

function TabSkeleton({ label }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 animate-pulse">
      <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    </div>
  );
}

function EmptyTab({ message }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8">
      <p className="text-center text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function TabError({ error, onRetry }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Failed to load data</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

// ─── Stat card ───

function StatCard({ icon: Icon, label, value, subValue, color }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color || 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{value}</p>
      {subValue && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subValue}</p>
      )}
    </div>
  );
}

// ─── Info item ───

function InfoItem({ icon: Icon, label, value, copyable }) {
  const handleCopy = () => {
    if (!value || value === '-') return;
    navigator.clipboard.writeText(value);
    toast.success(`${label || 'Value'} copied!`);
  };
  return (
    <div className="min-w-0">
      {label && <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>}
      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="truncate">{value || '-'}</span>
        {copyable && value && value !== '-' && value !== 'Not created' && (
          <button onClick={handleCopy} className="shrink-0 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page component ───

export default function Customer360DetailPage() {
  const params = useParams();
  const leadId = params.leadId;

  const {
    summary,
    summaryLoading,
    fetchSummary,
    refreshSummary,
    activeTab,
    setActiveTab,
    tabData,
    tabLoading,
    tabError,
    fetchTabData,
    invalidateTab,
    reset,
  } = useCustomer360Store();

  // ─── Data fetching ───

  useEffect(() => {
    fetchSummary(leadId);
    fetchTabData(leadId, 'journey');
    // Prefetch billing tab in background for faster tab switching
    setTimeout(() => fetchTabData(leadId, 'billing'), 500);
    return () => reset();
  }, [leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Socket refresh ───

  useSocketRefresh(() => {
    const currentTab = useCustomer360Store.getState().activeTab;
    ['journey', 'billing', 'documents', 'complaints', 'sam'].forEach(invalidateTab);
    refreshSummary(leadId);
    // Re-fetch the currently active tab so user sees fresh data
    fetchTabData(leadId, currentTab, { force: true });
  }, { enabled: !!leadId });

  // ─── Tab click handler ───

  function handleTabClick(tabKey) {
    setActiveTab(tabKey);
    fetchTabData(leadId, tabKey);
  }

  // ─── Retry handler for tab errors ───

  function handleRetry(tabKey) {
    fetchTabData(leadId, tabKey, { force: true });
  }

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customer-360"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
        {summary && (
          <button
            onClick={() => exportCustomerCSV(summary, tabData)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* Summary header */}
      {summaryLoading ? (
        <SummarySkeleton />
      ) : !summary ? (
        <NotFoundCard />
      ) : (
        <SummaryHeader summary={summary} />
      )}

      {/* Only show tabs if summary loaded */}
      {summary && (
        <>
          {/* Tab bar */}
          <TabBar
            tabs={TABS.map((tab) => {
              let count = undefined;
              if (tab.key === 'complaints' && summary?.complaintsSummary?.open > 0) {
                count = summary.complaintsSummary.open;
              } else if (tab.key === 'billing' && summary?.invoicesSummary?.overdue > 0) {
                count = summary.invoicesSummary.overdue;
              }
              return {
                key: tab.key,
                label: tab.label,
                icon: tab.icon,
                count,
                variant: tab.key === 'complaints' ? 'danger' : tab.key === 'billing' ? 'warning' : undefined,
              };
            })}
            activeTab={activeTab}
            onTabChange={handleTabClick}
          />

          {/* Tab content */}
          {tabError[activeTab] ? (
            <TabError error={tabError[activeTab]} onRetry={() => handleRetry(activeTab)} />
          ) : activeTab === 'journey' ? (
            <JourneyTab data={tabData.journey} loading={tabLoading.journey} />
          ) : activeTab === 'billing' ? (
            <BillingTab data={tabData.billing} loading={tabLoading.billing} leadId={leadId} />
          ) : activeTab === 'documents' ? (
            <DocumentsTab data={tabData.documents} loading={tabLoading.documents} />
          ) : activeTab === 'complaints' ? (
            <ComplaintsTab data={tabData.complaints} loading={tabLoading.complaints} />
          ) : activeTab === 'sam' ? (
            <SamTab data={tabData.sam} loading={tabLoading.sam} />
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Not found card ───

function NotFoundCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Customer Not Found</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        The customer you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link href="/dashboard/customer-360">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
      </Link>
    </div>
  );
}

// ─── Summary header ───

function SummaryHeader({ summary }) {
  // Map API response fields to display names
  const companyName = summary.company || summary.campaignData?.company || '';
  const contactName = summary.name || '';
  const { status, deliveryStatus, createdAt, fullAddress, customerUsername, actualPlanIsActive, demoPlanIsActive, currentBalance, customerGstNo } = summary;
  const phone = summary.campaignData?.phone || '';
  const email = summary.campaignData?.email || '';
  const bdmName = summary.assignedTo?.name || null;
  const city = summary.campaignData?.city || '';
  const state = summary.campaignData?.state || '';
  const currentPlan = summary.actualPlanName
    ? { name: summary.actualPlanName, bandwidth: summary.actualPlanBandwidth, billingCycle: summary.actualPlanBillingCycle }
    : null;
  const invoiceStats = summary.invoicesSummary;
  const complaintStats = summary.complaintsSummary;
  const samExecutiveName = summary.samExecutive?.name || null;

  // Determine plan status label and color
  let planStatusLabel = 'Inactive';
  let planStatusColor = 'text-red-600 dark:text-red-400';
  if (actualPlanIsActive) {
    planStatusLabel = 'Active';
    planStatusColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (demoPlanIsActive) {
    planStatusLabel = 'Demo';
    planStatusColor = 'text-amber-600 dark:text-amber-400';
  }

  const PlanStatusIcon = actualPlanIsActive || demoPlanIsActive ? Wifi : WifiOff;

  const address = fullAddress || [city, state].filter(Boolean).join(', ') || null;

  const overdueCount = invoiceStats?.overdue || 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      {/* Top row: Company info + customer since */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full shrink-0" />
            <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400 shrink-0" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {companyName || 'Unknown Company'}
            </h1>
          </div>
          {contactName && (
            <p className="text-sm text-slate-600 dark:text-slate-400 ml-9">{contactName}</p>
          )}
          <div className="flex flex-wrap gap-2 ml-9">
            {status && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getLeadStatusStyle(status)}`}>
                {formatStatus(status)}
              </span>
            )}
            {deliveryStatus && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getDeliveryStatusStyle(deliveryStatus)}`}>
                Delivery: {formatStatus(deliveryStatus)}
              </span>
            )}
          </div>
        </div>
        {createdAt && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 shrink-0">
            <Calendar className="h-4 w-4" />
            <span>Customer since {formatDate(createdAt)}</span>
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
        <InfoItem icon={Phone} label="Phone" value={phone} copyable />
        <InfoItem icon={Mail} label="Email" value={email} copyable />
        <InfoItem icon={MapPin} label="Address" value={address} />
        <InfoItem icon={User} label="Username" value={customerUsername || 'Not created'} copyable />
        <InfoItem icon={Hash} label="GST" value={customerGstNo || '-'} copyable />
        <InfoItem icon={UserCheck} label="BDM" value={bdmName || 'Unassigned'} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Package}
          label="Current Plan"
          value={currentPlan?.name || 'No plan'}
          subValue={currentPlan ? `${currentPlan.bandwidth || '-'} | ${formatStatus(currentPlan.billingCycle || '')}` : null}
          color="text-orange-500 dark:text-orange-400"
        />
        <StatCard
          icon={PlanStatusIcon}
          label="Plan Status"
          value={planStatusLabel}
          color={planStatusColor}
        />
        <StatCard
          icon={DollarSign}
          label="Balance"
          value={formatCurrency(currentBalance)}
          color={
            currentBalance > 0
              ? 'text-red-500 dark:text-red-400'
              : 'text-emerald-500 dark:text-emerald-400'
          }
        />
        <StatCard
          icon={FileText}
          label="Invoices"
          value={`${invoiceStats?.total || 0} total`}
          subValue={overdueCount > 0 ? `${overdueCount} overdue` : 'None overdue'}
          color={overdueCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Complaints"
          value={`${complaintStats?.open || 0} open`}
          subValue={`${complaintStats?.total || 0} total`}
          color={
            (complaintStats?.open || 0) > 0
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }
        />
        <StatCard
          icon={Users}
          label="SAM"
          value={samExecutiveName || 'Not assigned'}
          color="text-slate-500 dark:text-slate-400"
        />
      </div>
    </div>
  );
}
