'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { CheckCircle2, XCircle, Paperclip, ExternalLink } from 'lucide-react';
import { SERVICE_ORDER_TYPE_CONFIG, SERVICE_ORDER_STATUS_CONFIG } from '@/lib/statusConfig';

const typeBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

const statusBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.color])
);

export default function OrderApprovals() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  // Honour ?status=… in the URL so the "Date Change Approvals" sidebar link
  // lands directly on its filter. Otherwise default to Sales Director queue.
  const [filterStatus, setFilterStatus] = useState(() => {
    const urlStatus = searchParams?.get('status');
    return urlStatus || 'PENDING_SALES_DIRECTOR_APPROVAL';
  });
  const [search, setSearch] = useState('');

  // Keep the filter in sync if the user clicks a different sidebar entry
  // while already on this page (Next.js doesn't unmount the component).
  useEffect(() => {
    const urlStatus = searchParams?.get('status');
    if (urlStatus && urlStatus !== filterStatus) {
      setFilterStatus(urlStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date-change reject modal — separate path so the user sees the right
  // "Reject date change" copy and the API call goes to the right endpoint.
  const [showDateRejectModal, setShowDateRejectModal] = useState(false);
  const [dateRejectOrderId, setDateRejectOrderId] = useState(null);
  const [dateRejectReason, setDateRejectReason] = useState('');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER' && user.role !== 'SALES_DIRECTOR') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (filterStatus) params.append('status', filterStatus);
      if (search) params.append('search', search);

      // This is now the Sales Director's queue. All order types eventually land
      // here (UPGRADE/DOWNGRADE arrive after Delivery's gate; RATE_REVISION and
      // DISCONNECTION skip Delivery and start here). The page no longer filters
      // by orderType — the API returns every row matching the chosen status and
      // the row-level UI still adapts per-type for CTA labels.
      const response = await api.get(`/service-orders?${params}`);
      setOrders(response.data.orders);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filterStatus, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (orderId, e) => {
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${orderId}/approve`);
      toast.success('Order approved!');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectModal = (orderId, e) => {
    e.stopPropagation();
    setRejectOrderId(orderId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${rejectOrderId}/reject`, { rejectionReason });
      toast.success('Order rejected.');
      setShowRejectModal(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve a date change proposed by Accounts. Different endpoint than the
  // standard Sales-Director approval — this one applies the new effectiveDate
  // and completes the order in one shot.
  const handleApproveDateChange = async (orderId, e) => {
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${orderId}/approve-date-change`);
      toast.success('Date change approved. Order completed.');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve date change');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDateRejectModal = (orderId, e) => {
    e.stopPropagation();
    setDateRejectOrderId(orderId);
    setDateRejectReason('');
    setShowDateRejectModal(true);
  };

  const handleRejectDateChange = async () => {
    if (!dateRejectReason.trim() || dateRejectReason.trim().length < 5) {
      toast.error('Rejection reason is required (min 5 chars).');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${dateRejectOrderId}/reject-date-change`, {
        rejectionReason: dateRejectReason,
      });
      toast.success('Date change rejected. Order returned to Accounts.');
      setShowDateRejectModal(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject date change');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'orderNumber', label: 'Order #' },
    {
      key: 'createdAt', label: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    },
    {
      key: 'customer', label: 'Customer',
      render: (row) => row.customer?.campaignData?.company || '-'
    },
    {
      key: 'orderType', label: 'Type',
      render: (row) => (
        <Badge className={`${typeBadgeColors[row.orderType]} border-0`}>
          {row.orderType.replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      key: 'effectiveDate', label: 'Effective Date',
      render: (row) => {
        const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        // When Accounts has proposed a change, show the before → after diff
        // so the admin can decide at a glance.
        if (row.status === 'PENDING_ADMIN_DATE_APPROVAL' && row.proposedEffectiveDate) {
          return (
            <div className="text-sm space-y-0.5">
              <p className="text-slate-500 line-through">{fmt(row.effectiveDate)}</p>
              <p className="text-green-600 dark:text-green-400 font-medium">{fmt(row.proposedEffectiveDate)}</p>
              {row.proposedEffectiveDateBy?.name && (
                <p className="text-xs text-slate-400">proposed by {row.proposedEffectiveDateBy.name}</p>
              )}
            </div>
          );
        }
        return fmt(row.effectiveDate);
      }
    },
    {
      key: 'createdBy', label: 'Created By',
      render: (row) => row.createdBy?.name || '-'
    },
    {
      key: 'planChange', label: 'Plan Change',
      render: (row) => {
        if (row.orderType === 'DISCONNECTION') {
          return (
            <div className="text-sm space-y-0.5">
              <span className="text-red-500">Disconnect</span>
              {row.disconnectionCategory && (
                <p className="text-xs text-slate-500">{row.disconnectionCategory.name} → {row.disconnectionSubCategory?.name || '-'}</p>
              )}
            </div>
          );
        }
        const formatArc = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '?';
        return (
          <div className="text-sm space-y-0.5">
            <p>{row.currentBandwidth || '?'} Mbps → {row.newBandwidth || '?'} Mbps</p>
            {row.orderType !== 'RATE_REVISION' && (
              <p className="text-slate-500">{formatArc(row.currentArc)} → {formatArc(row.newArc)}</p>
            )}
            {row.orderType === 'RATE_REVISION' && (
              <p className="text-teal-600 text-xs">ARC unchanged</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'attachments', label: 'Documents',
      render: (row) => {
        const files = Array.isArray(row.attachments) ? row.attachments : [];
        const hasAnything = row.approvalFileUrl || row.poFileUrl || files.length > 0;
        if (!hasAnything) return <span className="text-slate-400 text-sm">-</span>;
        const labelledLink = (url, label) => (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors whitespace-nowrap"
            title={label}
          >
            <Paperclip className="w-3 h-3" />
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
          </a>
        );
        return (
          <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.approvalFileUrl && labelledLink(row.approvalFileUrl, 'View customer approval')}
            {row.poFileUrl && labelledLink(row.poFileUrl, 'View Purchase Order')}
            {files.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-orange-600 hover:text-orange-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={att.originalName}
              >
                <Paperclip className="w-3 h-3" />
                <span className="max-w-[80px] truncate">{att.originalName || `File ${idx + 1}`}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
              </a>
            ))}
          </div>
        );
      }
    },
    {
      key: 'status', label: 'Status',
      render: (row) => (
        <Badge className={`${statusBadgeColors[row.status]} border-0`}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      key: 'notes', label: 'Notes',
      render: (row) => row.notes
        ? <span className="text-xs text-slate-700 dark:text-slate-300" title={row.notes}>{row.notes.length > 60 ? `${row.notes.slice(0, 60)}…` : row.notes}</span>
        : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      key: 'actions', label: 'Actions',
      render: (row) => {
        if (row.status === 'PENDING_SALES_DIRECTOR_APPROVAL') {
          return (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                onClick={(e) => handleApprove(row.id, e)}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => openRejectModal(row.id, e)}
                className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          );
        }
        // Admin date-change approval — separate endpoints + reject reason.
        // SUPER_ADMIN only (SALES_DIRECTOR shouldn't see action buttons here).
        if (row.status === 'PENDING_ADMIN_DATE_APPROVAL' && (user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER')) {
          return (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                onClick={(e) => handleApproveDateChange(row.id, e)}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve Date
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => openDateRejectModal(row.id, e)}
                className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" /> Reject Date
              </Button>
            </div>
          );
        }
        return null;
      }
    },
  ];

  const filters = (
    <select
      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
      value={filterStatus}
      onChange={(e) => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
    >
      <option value="">All Statuses</option>
      <option value="PENDING_SALES_DIRECTOR_APPROVAL">Pending Sales Director</option>
      <option value="PENDING_DELIVERY_APPROVAL">Pending Delivery</option>
      <option value="PENDING_ADMIN_DATE_APPROVAL">Pending Admin (Date Change)</option>
      <option value="APPROVED">Approved</option>
      <option value="REJECTED">Rejected</option>
      <option value="COMPLETED">Completed</option>
      <option value="CANCELLED">Cancelled</option>
    </select>
  );

  return (
    <div className="p-6">
      <DataTable
        title="Sales Director Approvals"
        totalCount={pagination.total}
        columns={columns}
        data={orders}
        loading={isLoading}
        searchable
        searchPlaceholder="Search by order # or company..."
        onSearch={(val) => { setSearch(val); setPagination(p => ({ ...p, page: 1 })); }}
        filters={filters}
        onRowClick={(row) => router.push(`/dashboard/order-approvals/${row.id}`)}
        pagination
        serverPagination={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          pageSize: pagination.limit,
        }}
        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
        onPageSizeChange={(limit) => setPagination(p => ({ ...p, limit, page: 1 }))}
        emptyMessage="No orders pending approval"
      />

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold mb-3">Reject Service Order</h3>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[100px]"
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Date-Change Reject Modal */}
      {showDateRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold mb-3">Reject Effective-Date Change</h3>
            <p className="text-sm text-slate-500 mb-3">
              The order will be sent back to Accounts to retry processing.
            </p>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[100px]"
              placeholder="Reason for rejection (min 5 chars)..."
              value={dateRejectReason}
              onChange={(e) => setDateRejectReason(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowDateRejectModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleRejectDateChange}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject Date Change'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
