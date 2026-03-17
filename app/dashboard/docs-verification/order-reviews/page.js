'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { CheckCircle2, XCircle, Paperclip, ExternalLink } from 'lucide-react';
import { SERVICE_ORDER_TYPE_CONFIG, SERVICE_ORDER_STATUS_CONFIG } from '@/lib/statusConfig';
import { formatCurrency } from '@/lib/formatters';

const typeBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

const statusBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.color])
);

export default function DocsOrderReviews() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'DOCS_TEAM' && user.role !== 'SUPER_ADMIN') {
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
      if (search) params.append('search', search);

      const response = await api.get(`/service-orders/docs-review/queue?${params}`);
      setOrders(response.data.orders);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (orderId, e) => {
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${orderId}/docs-review`, { decision: 'APPROVED' });
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
      await api.post(`/service-orders/${rejectOrderId}/docs-review`, { decision: 'REJECTED', reason: rejectionReason });
      toast.success('Order rejected.');
      setShowRejectModal(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
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
      key: 'currentPlan', label: 'Current Plan',
      render: (row) => (
        <div className="text-sm space-y-0.5">
          <p>{row.currentBandwidth || '?'} Mbps</p>
          <p className="text-slate-500">{formatCurrency(row.currentArc)}</p>
        </div>
      )
    },
    {
      key: 'newPlan', label: 'New Plan',
      render: (row) => {
        if (row.orderType === 'DISCONNECTION') {
          return <span className="text-red-500 text-sm">Disconnect</span>;
        }
        return (
          <div className="text-sm space-y-0.5">
            <p>{row.newBandwidth || '?'} Mbps</p>
            <p className="text-slate-500">{formatCurrency(row.newArc)}</p>
          </div>
        );
      }
    },
    {
      key: 'attachments', label: 'Attachments',
      render: (row) => {
        const files = Array.isArray(row.attachments) ? row.attachments : [];
        if (files.length === 0) return <span className="text-slate-400 text-sm">-</span>;
        return (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
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
      key: 'actions', label: 'Actions',
      render: (row) => (
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
      )
    },
  ];

  return (
    <div className="p-6">
      <DataTable
        title="Order Reviews - Docs Verification"
        totalCount={pagination.total}
        columns={columns}
        data={orders}
        loading={isLoading}
        searchable
        searchPlaceholder="Search by order # or company..."
        onSearch={(val) => { setSearch(val); setPagination(p => ({ ...p, page: 1 })); }}
        pagination
        serverPagination={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          pageSize: pagination.limit,
        }}
        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
        onPageSizeChange={(limit) => setPagination(p => ({ ...p, limit, page: 1 }))}
        emptyMessage="No orders pending docs review"
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
    </div>
  );
}
