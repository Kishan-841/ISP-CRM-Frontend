'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { DollarSign, X, ArrowRight } from 'lucide-react';
import { SERVICE_ORDER_TYPE_CONFIG, SERVICE_ORDER_STATUS_CONFIG } from '@/lib/statusConfig';
import { formatCurrency } from '@/lib/formatters';

const typeBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

export default function AccountsOrderRequests() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');

  // Start Billing modal
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingOrder, setBillingOrder] = useState(null);
  const [processNotes, setProcessNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ACCOUNTS_TEAM' && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: 'PENDING_ACCOUNTS',
      });
      if (search) params.append('search', search);

      const response = await api.get(`/service-orders?${params}`);
      setOrders(response.data.orders);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching accounts orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openBillingModal = (order, e) => {
    e.stopPropagation();
    setBillingOrder(order);
    setProcessNotes('');
    setShowBillingModal(true);
  };

  const handleStartBilling = async () => {
    setIsSubmitting(true);
    try {
      const body = {};
      if (processNotes.trim()) {
        body.processNotes = processNotes;
      }

      await api.post(`/service-orders/${billingOrder.id}/accounts-process`, body);
      toast.success('Billing processed successfully!');
      setShowBillingModal(false);
      setBillingOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process billing');
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
      key: 'currentPlan', label: 'Current Plan',
      render: (row) => {
        if (row.orderType === 'DISCONNECTION') {
          return <span className="text-red-500 text-sm">Disconnect</span>;
        }
        return (
          <div className="text-sm">
            <p>{row.currentBandwidth || '?'} Mbps</p>
            <p className="text-slate-500 text-xs">{formatCurrency(row.currentArc)}</p>
          </div>
        );
      }
    },
    {
      key: 'newPlan', label: 'New Plan',
      render: (row) => {
        if (row.orderType === 'DISCONNECTION') {
          return <span className="text-red-500 text-sm">-</span>;
        }
        return (
          <div className="text-sm">
            <p className="font-medium">{row.newBandwidth || '?'} Mbps</p>
            <p className="text-slate-500 text-xs font-medium">{formatCurrency(row.newArc)}</p>
          </div>
        );
      }
    },
    {
      key: 'activationDate', label: 'Activation Date',
      render: (row) => row.activationDate
        ? new Date(row.activationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-'
    },
    {
      key: 'createdBy', label: 'Created By',
      render: (row) => row.createdBy?.name || '-'
    },
    {
      key: 'actions', label: 'Actions',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={(e) => openBillingModal(row, e)}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
          >
            <DollarSign className="w-3 h-3 mr-1" /> Start Billing
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Accounts Order Requests" description="Service orders pending billing processing" />
      <DataTable
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
        onRowClick={(row) => router.push(`/dashboard/sam-executive/orders/${row.id}`)}
        emptyMessage="No orders pending billing"
      />

      {/* Start Billing Modal */}
      {showBillingModal && billingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Start Billing</h3>
              <button
                onClick={() => setShowBillingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Order #</span>
                <span className="font-medium">{billingOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium">
                  {billingOrder.customer?.campaignData?.company || '-'}
                  {billingOrder.customer?.customerUsername && (
                    <span className="text-slate-400 ml-1">({billingOrder.customer.customerUsername})</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <Badge className={`${typeBadgeColors[billingOrder.orderType]} border-0 text-xs`}>
                  {billingOrder.orderType.replace(/_/g, ' ')}
                </Badge>
              </div>
              {billingOrder.orderType !== 'DISCONNECTION' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bandwidth</span>
                    <span className="flex items-center gap-1">
                      {billingOrder.currentBandwidth || '?'} Mbps
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{billingOrder.newBandwidth || '?'} Mbps</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">ARC</span>
                    <span className="flex items-center gap-1">
                      {formatCurrency(billingOrder.currentArc)}
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{formatCurrency(billingOrder.newArc)}</span>
                    </span>
                  </div>
                </>
              )}
              {billingOrder.activationDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Activation Date</span>
                  <span className="font-medium">
                    {new Date(billingOrder.activationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Process Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Process Notes (Optional)</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[80px] text-sm"
                placeholder="Any notes about the billing processing..."
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBillingModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartBilling}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Processing...' : 'Complete Billing'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
