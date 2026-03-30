'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Upload, X, Paperclip, ExternalLink, ArrowRight } from 'lucide-react';
import { SERVICE_ORDER_TYPE_CONFIG } from '@/lib/statusConfig';
import { PageHeader } from '@/components/PageHeader';

const typeBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

export default function NocOrderRequests() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');

  // Process modal
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processOrder, setProcessOrder] = useState(null);
  const [speedTestFile, setSpeedTestFile] = useState(null);
  const [nocNotes, setNocNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'NOC_TEAM' && user.role !== 'NOC' && user.role !== 'NOC_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER') {
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

      const response = await api.get(`/service-orders/noc/queue?${params}`);
      setOrders(response.data.orders);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching NOC orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openProcessModal = (order, e) => {
    e.stopPropagation();
    setProcessOrder(order);
    setSpeedTestFile(null);
    setNocNotes('');
    setShowProcessModal(true);
  };

  const handleProcess = async () => {
    if (!speedTestFile) {
      toast.error('Speed test file is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('speedTest', speedTestFile);
      if (nocNotes.trim()) {
        formData.append('nocNotes', nocNotes);
      }

      await api.post(`/service-orders/${processOrder.id}/noc-process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Order processed successfully!');
      setShowProcessModal(false);
      setProcessOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process order');
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
      render: (row) => {
        const company = row.customer?.campaignData?.company;
        const username = row.customer?.customerUsername;
        return (
          <div className="text-sm">
            <p className="font-medium">{company || '-'}</p>
            {username && <p className="text-slate-500 text-xs">{username}</p>}
          </div>
        );
      }
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
      key: 'bandwidth', label: 'Bandwidth',
      render: (row) => {
        if (row.orderType === 'DISCONNECTION') {
          return <span className="text-red-500 text-sm">Disconnect</span>;
        }
        return (
          <div className="text-sm flex items-center gap-1">
            <span>{row.currentBandwidth || '?'} Mbps</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="font-medium">{row.newBandwidth || '?'} Mbps</span>
          </div>
        );
      }
    },
    {
      key: 'attachments', label: 'PO Docs',
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
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={(e) => openProcessModal(row, e)}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
          >
            <Upload className="w-3 h-3 mr-1" /> Process
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="NOC Order Requests" description="Service orders pending NOC processing" />
      <DataTable
        title="NOC Order Requests"
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
        emptyMessage="No orders pending NOC processing"
      />

      {/* Process Modal */}
      {showProcessModal && processOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Process Order - Upload Speed Test</h3>
              <button
                onClick={() => setShowProcessModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Order #</span>
                <span className="font-medium">{processOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium">
                  {processOrder.customer?.campaignData?.company || '-'}
                  {processOrder.customer?.customerUsername && (
                    <span className="text-slate-400 ml-1">({processOrder.customer.customerUsername})</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <Badge className={`${typeBadgeColors[processOrder.orderType]} border-0 text-xs`}>
                  {processOrder.orderType.replace(/_/g, ' ')}
                </Badge>
              </div>
              {processOrder.orderType !== 'DISCONNECTION' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bandwidth</span>
                    <span className="flex items-center gap-1">
                      {processOrder.currentBandwidth || '?'} Mbps
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{processOrder.newBandwidth || '?'} Mbps</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Speed Test Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">
                Speed Test Screenshot <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSpeedTestFile(e.target.files[0] || null)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
              </div>
              {speedTestFile && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {speedTestFile.name}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[80px] text-sm"
                placeholder="Any notes about the processing..."
                value={nocNotes}
                onChange={(e) => setNocNotes(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProcessModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                disabled={isSubmitting || !speedTestFile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Processing...' : 'Complete NOC Processing'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
