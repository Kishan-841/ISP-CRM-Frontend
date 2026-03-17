'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Building2,
  FileText,
  Upload,
  ClipboardCheck,
  History,
  Truck,
  PackagePlus,
  ArrowRight,
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import POStatusBadge from '@/components/po/POStatusBadge';
import POProgressStepper from '@/components/po/POProgressStepper';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPOSummary,
  getCategoryLabel
} from '@/lib/po-utils';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GoodsReceiptPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Modal states
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Verification form
  const [receiptStatus, setReceiptStatus] = useState('');
  const [receiptRemark, setReceiptRemark] = useState('');
  const [verificationStatement, setVerificationStatement] = useState('');
  const [itemReceipts, setItemReceipts] = useState({});
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testBypass, setTestBypass] = useState(false);

  // Batch update form
  const [batchItems, setBatchItems] = useState({});
  const [batchRemark, setBatchRemark] = useState('');
  const [batchReceiptStatus, setBatchReceiptStatus] = useState('');
  const [batchHistory, setBatchHistory] = useState([]);


  const isAdmin = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canAccess = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, canAccess, router]);

  useSocketRefresh(() => { fetchStats(); fetchPurchaseOrders(); }, { enabled: canAccess && !!token });

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/store/goods-receipt/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch POs
  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      let endpoint = '/store/goods-receipt/pending';
      if (activeTab === 'awaitingBatch') {
        endpoint = '/store/goods-receipt/partial';
      } else if (activeTab !== 'pending') {
        endpoint = `/store/goods-receipt/verified?status=${activeTab}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setPurchaseOrders(await response.json());
      }
    } catch (error) {
      console.error('Error fetching POs:', error);
      toast.error('Failed to fetch purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess && token) {
      fetchStats();
    }
  }, [canAccess, token]);

  useEffect(() => {
    if (canAccess && token) {
      fetchPurchaseOrders();
    }
  }, [canAccess, token, activeTab]);

  // Open verify modal
  const handleOpenVerify = (po) => {
    setSelectedPO(po);
    setReceiptStatus('');
    setReceiptRemark('');
    setVerificationStatement('');
    setInvoiceFile(null);
    setTestBypass(false);

    const initialItems = {};
    po.items?.forEach(item => {
      initialItems[item.id] = {
        receivedQuantity: item.quantity,
        receiptStatus: 'RECEIVED',
        receiptRemark: ''
      };
    });
    setItemReceipts(initialItems);
    setShowVerifyModal(true);
  };

  // Open batch modal
  const handleOpenBatch = async (po) => {
    setSelectedPO(po);
    setBatchRemark('');
    setBatchReceiptStatus('');

    const initialBatch = {};
    po.items?.forEach(item => {
      const pending = item.quantity - (item.receivedQuantity || 0);
      if (pending > 0) {
        initialBatch[item.id] = {
          receivedInBatch: 0,
          damagedInBatch: 0,
          remark: ''
        };
      }
    });
    setBatchItems(initialBatch);

    // Fetch batch history
    try {
      const response = await fetch(`${API_BASE}/store/goods-receipt/${po.id}/batch-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBatchHistory(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batch history:', error);
    }

    setShowBatchModal(true);
  };

  const handleItemChange = (itemId, field, value) => {
    // For receivedQuantity, enforce max limit
    if (field === 'receivedQuantity' && selectedPO) {
      const item = selectedPO.items?.find(i => i.id === itemId);
      if (item) {
        const maxAllowed = item.quantity;
        if (value > maxAllowed) {
          toast.error(`Cannot receive more than ${maxAllowed} (ordered quantity)`);
          value = maxAllowed;
        }
        if (value < 0) value = 0;
      }
    }
    setItemReceipts(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const handleBatchItemChange = (itemId, field, value) => {
    // For receivedInBatch, enforce max limit (remaining quantity)
    if (field === 'receivedInBatch' && selectedPO) {
      const item = selectedPO.items?.find(i => i.id === itemId);
      if (item) {
        const alreadyReceived = item.receivedQuantity || 0;
        const maxAllowed = item.quantity - alreadyReceived;
        if (value > maxAllowed) {
          toast.error(`Cannot receive more than ${maxAllowed} (only ${maxAllowed} remaining)`);
          value = maxAllowed;
        }
        if (value < 0) value = 0;
      }
    }
    setBatchItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/store/goods-receipt/upload-signed-po`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setInvoiceFile(data.url);
        toast.success('Invoice uploaded');
      } else {
        toast.error('Failed to upload invoice');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!receiptStatus) {
      toast.error('Please select a receipt status');
      return;
    }

    if (!receiptRemark.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    if (!testBypass && receiptStatus !== 'RECEIPT_REJECTED' && !invoiceFile) {
      toast.error('Please upload the vendor invoice with signature');
      return;
    }

    setIsSaving(true);
    try {
      const itemsData = Object.entries(itemReceipts).map(([id, data]) => ({
        id,
        ...data
      }));

      const response = await fetch(`${API_BASE}/store/goods-receipt/${selectedPO.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiptStatus,
          receiptRemark: receiptRemark.trim(),
          verificationStatement: verificationStatement.trim(),
          items: itemsData,
          signedPOUrl: invoiceFile,
          testBypass
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Verification completed');
        setShowVerifyModal(false);
        setSelectedPO(null);
        fetchPurchaseOrders();
        fetchStats();
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('Failed to verify receipt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitBatch = async () => {
    // Validate receipt status is selected
    if (!batchReceiptStatus) {
      toast.error('Please select a receipt status');
      return;
    }

    // For non-rejection, validate at least one item received
    if (batchReceiptStatus !== 'RECEIPT_REJECTED') {
      const hasReceived = Object.values(batchItems).some(item => item.receivedInBatch > 0);
      if (!hasReceived) {
        toast.error('Please enter received quantity for at least one item');
        return;
      }
    }

    if (!batchRemark.trim()) {
      toast.error('Please enter a remark for this batch');
      return;
    }

    setIsSaving(true);
    try {
      const itemsData = Object.entries(batchItems)
        .filter(([_, data]) => data.receivedInBatch > 0)
        .map(([itemId, data]) => ({ itemId, ...data }));

      const response = await fetch(`${API_BASE}/store/goods-receipt/${selectedPO.id}/update-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiptStatus: batchReceiptStatus,
          items: itemsData,
          remark: batchRemark.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Batch recorded');
        setShowBatchModal(false);
        setSelectedPO(null);
        fetchPurchaseOrders();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to record batch');
      }
    } catch (error) {
      toast.error('Failed to record batch');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canAccess) return null;

  // Tab config
  const tabs = [
    { id: 'pending', label: 'Verify Receipt', count: stats.pendingReceipt || 0, color: 'amber', icon: ClipboardCheck },
    { id: 'awaitingBatch', label: 'Awaiting Delivery', count: stats.partiallyReceived || 0, color: 'orange', icon: Truck },
    { id: 'RECEIVED', label: 'Completed', count: stats.received || 0, color: 'emerald', icon: CheckCircle },
    { id: 'RECEIPT_REJECTED', label: 'Rejected', count: stats.receiptRejected || 0, color: 'red', icon: XCircle }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Goods Receipt" description="Verify deliveries and record received items">
        {/* Flow Visual */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">
          <span className="text-slate-500 dark:text-slate-400">PO Approved</span>
          <ArrowRight size={16} className="text-slate-400" />
          <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
            Verify Receipt
          </span>
          <ArrowRight size={16} className="text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Add to Store</span>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard color="amber" icon={ClipboardCheck} label="To Verify" value={stats.pendingReceipt || 0} />
        <StatCard color="orange" icon={Truck} label="Awaiting Delivery" value={stats.partiallyReceived || 0} />
        <StatCard color="emerald" icon={CheckCircle} label="Completed" value={stats.received || 0} />
        <StatCard color="red" icon={XCircle} label="Rejected" value={stats.receiptRejected || 0} />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.id,
          label: tab.label,
          count: tab.count,
          icon: tab.icon,
          variant: tab.id === 'RECEIVED' ? 'success' : tab.id === 'RECEIPT_REJECTED' ? 'danger' : tab.id === 'pending' ? 'warning' : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <DataTable
        title={activeTab === 'pending' ? 'Pending Verification' :
               activeTab === 'awaitingBatch' ? 'Awaiting Delivery' :
               activeTab === 'RECEIVED' ? 'Completed' : 'Rejected'}
        totalCount={purchaseOrders?.length || 0}
        columns={[
          {
            key: 'poNumber',
            label: 'PO Number',
            render: (row) => (
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {row.poNumber}
              </span>
            ),
          },
          {
            key: 'vendor',
            label: 'Vendor',
            render: (row) => (
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {row.vendor?.companyName || '-'}
              </span>
            ),
          },
          {
            key: 'items',
            label: 'Items',
            render: (row) => {
              const summary = getPOSummary(row);
              return (
                <div className="text-center">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {summary.totalItems}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({summary.totalOrdered} {summary.unitLabel})
                  </span>
                </div>
              );
            },
          },
          {
            key: 'received',
            label: 'Received',
            render: (row) => {
              const summary = getPOSummary(row);
              if (activeTab === 'awaitingBatch' && row.summary) {
                return (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-600 rounded-full"
                          style={{ width: `${row.summary.percentReceived}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {row.summary.percentReceived}%
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {row.summary.totalReceived}/{row.summary.totalOrdered}
                    </span>
                  </div>
                );
              }
              return (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {summary.totalReceived}/{summary.totalOrdered}
                </span>
              );
            },
          },
          {
            key: 'totalAmount',
            label: 'Amount',
            render: (row) => (
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(row.totalAmount)}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <POStatusBadge status={row.status} size="sm" showIcon={false} />
            ),
          },
          {
            key: 'giirnNumber',
            label: 'GIIRN',
            render: (row) => row.giirnNumber ? (
              <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                {row.giirnNumber}
              </span>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            ),
          },
          {
            key: 'createdAt',
            label: 'Date',
            render: (row) => (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(row.createdAt)}
              </span>
            ),
          },
        ]}
        data={purchaseOrders || []}
        searchable
        searchPlaceholder="Search PO number, vendor..."
        searchKeys={['poNumber', 'vendor.companyName', 'giirnNumber']}
        pagination
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage={
          activeTab === 'pending' ? 'Approved POs will appear here when goods arrive' :
          activeTab === 'awaitingBatch' ? 'Partially received POs will appear here' :
          'No records found'
        }
        emptyIcon={PackageCheck}
        actions={(row) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPO(row);
                setShowDetailsModal(true);
              }}
              className="border-slate-200 dark:border-slate-700 h-8 px-2"
            >
              <Eye size={14} />
            </Button>

            {activeTab === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleOpenVerify(row)}
                className="bg-amber-600 hover:bg-amber-700 text-white h-8"
              >
                <ClipboardCheck size={14} className="mr-1" />
                Verify
              </Button>
            )}

            {activeTab === 'awaitingBatch' && (
              <Button
                size="sm"
                onClick={() => handleOpenBatch(row)}
                className="bg-orange-600 hover:bg-orange-700 text-white h-8"
              >
                <PackagePlus size={14} className="mr-1" />
                Record
              </Button>
            )}
          </div>
        )}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedPO.poNumber}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <POStatusBadge status={selectedPO.status} size="sm" />
                  {selectedPO.giirnNumber && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                      {selectedPO.giirnNumber}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Progress */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <POProgressStepper status={selectedPO.status} />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Vendor</span>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPO.vendor?.companyName || '-'}</p>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">Total Amount</span>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {formatCurrency(selectedPO.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  Items ({selectedPO.items?.length || 0})
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Product</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Ordered</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Received</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {selectedPO.items?.map((item) => {
                        const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                        const unitLabel = isFiber ? 'mtrs' : 'pcs';

                        return (
                          <tr key={item.id}>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-900 dark:text-slate-100">{item.product?.modelNumber}</p>
                              <p className="text-xs text-slate-500">{getCategoryLabel(item.product?.category)}</p>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-900 dark:text-slate-100">
                              {item.quantity}
                              <span className="text-xs text-slate-400 ml-1">{unitLabel}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={item.receivedQuantity === item.quantity ? 'text-emerald-600' : 'text-amber-600'}>
                                {item.receivedQuantity ?? '-'}
                              </span>
                              {item.receivedQuantity > 0 && <span className="text-xs text-slate-400 ml-1">{unitLabel}</span>}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.unitPrice)}
                              {isFiber && <span className="text-xs text-slate-400">/mtr</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipt Info */}
              {(selectedPO.receiptRemark || selectedPO.verificationStatement) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck size={14} className="text-blue-500" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Verification Details</span>
                  </div>
                  {selectedPO.receiptRemark && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Remark:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{selectedPO.receiptRemark}</p>
                    </div>
                  )}
                  {selectedPO.verificationStatement && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Statement:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 italic">"{selectedPO.verificationStatement}"</p>
                    </div>
                  )}
                  {selectedPO.receiptVerifiedBy && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Verified by {selectedPO.receiptVerifiedBy.name} on {formatDateTime(selectedPO.receiptVerifiedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Vendor Invoice */}
              {selectedPO.signedPOUrl && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">Vendor Invoice</span>
                  </div>
                  <a href={selectedPO.signedPOUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 hover:underline">
                    View vendor invoice
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <Button onClick={() => setShowDetailsModal(false)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verify Goods Receipt</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedPO.poNumber} - {formatCurrency(selectedPO.totalAmount)}
                </p>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Verify Each Item
                </h4>
                <div className="space-y-3">
                  {selectedPO.items?.map((item) => {
                    const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                    const unitLabel = isFiber ? 'mtrs' : 'pcs';

                    return (
                      <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{item.product?.modelNumber}</p>
                            <p className="text-sm text-slate-500">
                              Ordered: {item.quantity} <span className="text-slate-400">{unitLabel}</span>
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {getCategoryLabel(item.product?.category)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              {isFiber ? 'Received Meters' : 'Received Qty'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={itemReceipts[item.id]?.receivedQuantity ?? item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'receivedQuantity', parseInt(e.target.value) || 0)}
                                className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm ${isFiber ? 'pr-12' : ''}`}
                              />
                              {isFiber && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-orange-600 dark:text-orange-400">
                                  mtrs
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Status
                            </label>
                            <select
                              value={itemReceipts[item.id]?.receiptStatus ?? 'RECEIVED'}
                              onChange={(e) => handleItemChange(item.id, 'receiptStatus', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                              <option value="RECEIVED">Received</option>
                              <option value="PARTIAL">Partial</option>
                              <option value="NOT_RECEIVED">Not Received</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Remark
                            </label>
                            <input
                              type="text"
                              placeholder="Optional"
                              value={itemReceipts[item.id]?.receiptRemark ?? ''}
                              onChange={(e) => handleItemChange(item.id, 'receiptRemark', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Overall Receipt Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setReceiptStatus('RECEIVED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      receiptStatus === 'RECEIVED'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle size={28} />
                    <span className="font-semibold">All Received</span>
                  </button>
                  <button
                    onClick={() => setReceiptStatus('PARTIALLY_RECEIVED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      receiptStatus === 'PARTIALLY_RECEIVED'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                    }`}
                  >
                    <AlertTriangle size={28} />
                    <span className="font-semibold">Partial</span>
                  </button>
                  <button
                    onClick={() => setReceiptStatus('RECEIPT_REJECTED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      receiptStatus === 'RECEIPT_REJECTED'
                        ? 'bg-red-500 text-white border-red-500 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300'
                    }`}
                  >
                    <XCircle size={28} />
                    <span className="font-semibold">Reject</span>
                  </button>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Verification Remark <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={receiptRemark}
                  onChange={(e) => setReceiptRemark(e.target.value)}
                  rows={3}
                  placeholder="Describe what was received, any issues, etc..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                />
              </div>

              {/* Invoice Upload */}
              {receiptStatus !== 'RECEIPT_REJECTED' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Vendor Invoice with Signature {!testBypass && <span className="text-red-500">*</span>}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Upload the signed vendor invoice received with the goods delivery
                  </p>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center">
                    {invoiceFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-emerald-500" />
                        <div className="text-left">
                          <p className="font-medium text-slate-900 dark:text-slate-100">Invoice uploaded</p>
                          <a href={invoiceFile} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">
                            View invoice
                          </a>
                        </div>
                        <button onClick={() => setInvoiceFile(null)} className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          PDF, JPG, PNG (Max 10MB)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                          id="invoice-upload"
                          disabled={isUploading}
                        />
                        <label
                          htmlFor="invoice-upload"
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                            isUploading ? 'bg-slate-200 text-slate-500' : 'bg-orange-600 hover:bg-orange-700 text-white'
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="animate-spin w-4 h-4" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              Upload Invoice
                            </>
                          )}
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Verification Statement */}
              {receiptStatus !== 'RECEIPT_REJECTED' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Verification Statement
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Add any additional statement confirming the goods received match the invoice
                  </p>
                  <textarea
                    value={verificationStatement}
                    onChange={(e) => setVerificationStatement(e.target.value)}
                    rows={2}
                    placeholder="e.g., I confirm that all items received match the invoice quantities and are in good condition..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                  />
                </div>
              )}

              {/* Test Bypass */}
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                <input
                  type="checkbox"
                  id="testBypass"
                  checked={testBypass}
                  onChange={(e) => setTestBypass(e.target.checked)}
                  className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="testBypass" className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Test Mode:</strong> Skip file upload (for testing only)
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button onClick={() => setShowVerifyModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitVerification}
                disabled={!receiptStatus || !receiptRemark.trim() || isSaving}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Submit Verification'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Modal */}
      {showBatchModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <PackagePlus className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record Next Batch</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPO.poNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Progress Summary */}
              {selectedPO.summary && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">Receipt Progress</h4>
                    <span className="text-lg font-bold text-orange-700 dark:text-orange-300">
                      {selectedPO.summary.percentReceived}%
                    </span>
                  </div>
                  <div className="h-3 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${selectedPO.summary.percentReceived}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedPO.summary.totalOrdered}</p>
                      <p className="text-xs text-slate-500">Ordered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{selectedPO.summary.totalReceived}</p>
                      <p className="text-xs text-emerald-600">Received</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{selectedPO.summary.totalPending}</p>
                      <p className="text-xs text-amber-600">Pending</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Batch History */}
              {batchHistory.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} className="text-slate-500" />
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Previous Batches</h4>
                  </div>
                  <div className="space-y-2">
                    {batchHistory.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600">
                            {batch.batchNumber}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              Batch #{batch.batchNumber}: {batch.totalReceived} items
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(batch.verifiedAt)} by {batch.verifiedBy?.name}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${batch.resultStatus === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {batch.resultStatus === 'RECEIVED' ? 'Complete' : 'Partial'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items to Update */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Record Items Received
                </h4>
                <div className="space-y-3">
                  {selectedPO.items?.filter(item => {
                    const pending = item.quantity - (item.receivedQuantity || 0);
                    return pending > 0;
                  }).map((item) => {
                    const pending = item.quantity - (item.receivedQuantity || 0);
                    const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                    const unitLabel = isFiber ? 'mtrs' : 'pcs';

                    return (
                      <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{item.product?.modelNumber}</p>
                            <p className="text-sm text-slate-500">
                              Received: {item.receivedQuantity || 0} / {item.quantity} {unitLabel}
                              <span className="text-amber-600 ml-2 font-semibold">({pending} {unitLabel} pending)</span>
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {getCategoryLabel(item.product?.category)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              {isFiber ? 'Meters in Batch' : 'Received in Batch'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={pending}
                                value={batchItems[item.id]?.receivedInBatch ?? 0}
                                onChange={(e) => handleBatchItemChange(item.id, 'receivedInBatch', parseInt(e.target.value) || 0)}
                                className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm ${isFiber ? 'pr-12' : ''}`}
                              />
                              {isFiber && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-orange-600 dark:text-orange-400">
                                  mtrs
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              {isFiber ? 'Damaged (mtrs)' : 'Damaged'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={batchItems[item.id]?.damagedInBatch ?? 0}
                              onChange={(e) => handleBatchItemChange(item.id, 'damagedInBatch', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Remark
                            </label>
                            <input
                              type="text"
                              placeholder="Optional"
                              value={batchItems[item.id]?.remark ?? ''}
                              onChange={(e) => handleBatchItemChange(item.id, 'remark', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receipt Status Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Receipt Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setBatchReceiptStatus('RECEIVED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      batchReceiptStatus === 'RECEIVED'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle size={28} />
                    <span className="font-semibold">All Received</span>
                  </button>
                  <button
                    onClick={() => setBatchReceiptStatus('PARTIALLY_RECEIVED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      batchReceiptStatus === 'PARTIALLY_RECEIVED'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                    }`}
                  >
                    <AlertTriangle size={28} />
                    <span className="font-semibold">Partial</span>
                  </button>
                  <button
                    onClick={() => setBatchReceiptStatus('RECEIPT_REJECTED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      batchReceiptStatus === 'RECEIPT_REJECTED'
                        ? 'bg-red-500 text-white border-red-500 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300'
                    }`}
                  >
                    <XCircle size={28} />
                    <span className="font-semibold">Reject</span>
                  </button>
                </div>
              </div>

              {/* Batch Remark */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Batch Remark <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={batchRemark}
                  onChange={(e) => setBatchRemark(e.target.value)}
                  rows={3}
                  placeholder="Describe this batch delivery..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button onClick={() => setShowBatchModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitBatch}
                disabled={!batchReceiptStatus || !batchRemark.trim() || isSaving}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <PackagePlus size={16} className="mr-2" />
                    Record Batch
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
