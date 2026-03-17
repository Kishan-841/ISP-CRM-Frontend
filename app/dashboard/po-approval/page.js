'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Loader2,
  Eye,
  X,
  Warehouse,
  Building2,
  User,
  Calendar,
  FileText,
  Edit3,
  Trash2,
  ArrowRight,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import POStatusBadge from '@/components/po/POStatusBadge';
import POProgressStepper from '@/components/po/POProgressStepper';
import {
  getStatusLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  getPOSummary,
  getActionHint,
  getCategoryLabel
} from '@/lib/po-utils';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { PageHeader } from '@/components/PageHeader';
import { useModal } from '@/lib/useModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function POApprovalPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Modal states
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Decision state
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    vendorId: '',
    warehouse: '',
    remark: '',
    status: ''
  });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Dropdown data
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);


  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const canAccess = isSuperAdmin || isAdmin;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showDetailsModal, () => setShowDetailsModal(false));
  useModal(showApprovalModal, () => !isSaving && setShowApprovalModal(false));
  useModal(showEditModal, () => !isSaving && setShowEditModal(false));
  useModal(showDeleteConfirm, () => !isSaving && setShowDeleteConfirm(false));

  // Redirect non-admins
  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, canAccess, router]);

  useSocketRefresh(() => { fetchStats(); fetchPurchaseOrders(); }, { enabled: canAccess });

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/store/po-approval/stats`, {
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
      let endpoint = '/store/po-approval/pending';
      if (activeTab === 'APPROVED') {
        // Fetch all post-approval POs (multiple statuses)
        const results = await Promise.all([
          fetch(`${API_BASE}/store/po-approval/all?status=APPROVED`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/store/po-approval/all?status=PENDING_RECEIPT`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/store/po-approval/all?status=RECEIVED`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/store/po-approval/all?status=PARTIALLY_RECEIVED`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/store/po-approval/all?status=COMPLETED`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const allPOs = [];
        for (const res of results) {
          if (res.ok) allPOs.push(...(await res.json()));
        }
        allPOs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPurchaseOrders(allPOs);
        setIsLoading(false);
        return;
      } else if (activeTab !== 'pending') {
        endpoint = `/store/po-approval/all?status=${activeTab.toUpperCase()}`;
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

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const [vendorsRes, warehousesRes] = await Promise.all([
        fetch(`${API_BASE}/store/vendors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/store/warehouses`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (vendorsRes.ok) setVendors(await vendorsRes.json());
      if (warehousesRes.ok) setWarehouses(await warehousesRes.json());
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  useEffect(() => {
    if (canAccess && token) {
      fetchStats();
      fetchDropdownData();
    }
  }, [canAccess, token]);

  useEffect(() => {
    if (canAccess && token) {
      fetchPurchaseOrders();
    }
  }, [canAccess, token, activeTab]);

  // Approval handlers
  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/store/po-approval/${selectedPO.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('PO approved successfully');
        setShowApprovalModal(false);
        setSelectedPO(null);
        setDecision('');
        fetchPurchaseOrders();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to approve PO');
      }
    } catch (error) {
      toast.error('Failed to approve purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/store/po-approval/${selectedPO.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('PO rejected');
        setShowApprovalModal(false);
        setSelectedPO(null);
        setDecision('');
        setReason('');
        fetchPurchaseOrders();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to reject PO');
      }
    } catch (error) {
      toast.error('Failed to reject purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit handlers
  const handleOpenEdit = (po) => {
    setSelectedPO(po);
    setEditForm({
      vendorId: po.vendorId || '',
      warehouse: po.warehouse || '',
      remark: po.remark || '',
      status: po.status || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/store/po-approval/${selectedPO.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('PO updated successfully');
        setShowEditModal(false);
        setSelectedPO(null);
        fetchPurchaseOrders();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to update PO');
      }
    } catch (error) {
      toast.error('Failed to update purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handlers
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/store/po-approval/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('PO deleted successfully');
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
        fetchPurchaseOrders();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to delete PO');
      }
    } catch (error) {
      toast.error('Failed to delete purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if PO can be modified
  const canModifyPO = (po) => {
    return !po.items?.some(item => item.status === 'IN_STORE');
  };

  if (!canAccess) return null;

  // Tab configuration (Single-level approval)
  const tabs = [
    { id: 'pending', label: 'Needs Review', count: stats.myPending || 0, color: 'amber' },
    { id: 'APPROVED', label: 'Approved', count: stats.approved || 0, color: 'emerald' },
    { id: 'REJECTED', label: 'Rejected', count: stats.rejected || 0, color: 'red' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="PO Approval" description="Review and approve purchase orders from Store Managers">
        {/* Approval Flow Visual */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">
          <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
            Review PO
          </span>
          <ArrowRight size={16} className="text-slate-400" />
          <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            Approve
          </span>
          <ArrowRight size={16} className="text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Send to Vendor</span>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard color="amber" icon={Clock} label="Pending Review" value={stats.myPending || 0} />
        <StatCard color="emerald" icon={CheckCircle} label="Fully Approved" value={stats.approved || 0} />
        <StatCard color="red" icon={XCircle} label="Rejected" value={stats.rejected || 0} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? tab.color === 'amber'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-2 ring-amber-300 dark:ring-amber-700'
                  : tab.color === 'indigo'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300 dark:ring-indigo-700'
                  : tab.color === 'emerald'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-300 dark:ring-emerald-700'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-300 dark:ring-red-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === tab.id
                ? tab.color === 'amber'
                  ? 'bg-amber-200 dark:bg-amber-800'
                  : tab.color === 'indigo'
                  ? 'bg-indigo-200 dark:bg-indigo-800'
                  : tab.color === 'emerald'
                  ? 'bg-emerald-200 dark:bg-emerald-800'
                  : 'bg-red-200 dark:bg-red-800'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <DataTable
        title="Purchase Orders"
        totalCount={purchaseOrders?.length || 0}
        columns={[
          {
            key: 'poNumber',
            label: 'PO Number',
            render: (po) => (
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {po.poNumber}
              </span>
            ),
          },
          {
            key: 'vendor',
            label: 'Vendor',
            render: (po) => (
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {po.vendor?.companyName || '-'}
              </span>
            ),
          },
          {
            key: 'items',
            label: 'Items',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (po) => {
              const summary = getPOSummary(po);
              return (
                <>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {summary.totalItems}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({summary.totalOrdered} {summary.unitLabel})
                  </span>
                </>
              );
            },
          },
          {
            key: 'totalAmount',
            label: 'Amount',
            className: 'text-right',
            cellClassName: 'text-right',
            render: (po) => (
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(po.totalAmount)}
              </span>
            ),
          },
          {
            key: 'createdBy',
            label: 'Requested By',
            render: (po) => (
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {po.createdBy?.name || 'Unknown'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            label: 'Date',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (po) => (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(po.createdAt)}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (po) => (
              <POStatusBadge status={po.status} size="sm" showIcon={false} />
            ),
          },
        ]}
        data={purchaseOrders || []}
        loading={isLoading}
        pagination
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        searchable
        searchPlaceholder="Search POs..."
        searchKeys={['poNumber', 'vendor.companyName', 'createdBy.name']}
        emptyMessage={activeTab === 'pending' ? 'No POs awaiting your review' : 'No purchase orders found'}
        emptyIcon={ShoppingCart}
        actions={(po) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPO(po);
                setShowDetailsModal(true);
              }}
              className="border-slate-200 dark:border-slate-700 h-8 px-2"
            >
              <Eye size={14} />
            </Button>

            {activeTab === 'pending' && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedPO(po);
                  setDecision('');
                  setReason('');
                  setShowApprovalModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white h-8"
              >
                Review
              </Button>
            )}

            {isSuperAdmin && canModifyPO(po) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(po)}
                  className="border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 h-8 px-2"
                >
                  <Edit3 size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(po);
                    setShowDeleteConfirm(true);
                  }}
                  className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 h-8 px-2"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        )}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedPO && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedPO.poNumber}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <POStatusBadge status={selectedPO.status} size="sm" />
                  <span className="text-slate-400">|</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(selectedPO.createdAt)}
                  </span>
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
                  {selectedPO.vendor?.contactPerson && (
                    <p className="text-sm text-slate-500">{selectedPO.vendor.contactPerson}</p>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Warehouse</span>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPO.warehouse || '-'}</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Created By</span>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPO.createdBy?.name || '-'}</p>
                  <p className="text-sm text-slate-500">{selectedPO.createdBy?.email || ''}</p>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">Total Amount</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
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
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Category</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Qty/Mtrs</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Unit Price</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Total</th>
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
                              <p className="text-xs text-slate-500">{item.product?.brandName}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {getCategoryLabel(item.product?.category)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-900 dark:text-slate-100">
                              {item.quantity}
                              <span className="text-xs text-slate-400 ml-1">{unitLabel}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.unitPrice)}
                              {isFiber && <span className="text-xs text-slate-400">/mtr</span>}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency((item.unitPrice || 0) * item.quantity)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remark */}
              {selectedPO.remark && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">Remark</span>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{selectedPO.remark}</p>
                </div>
              )}

              {/* Rejection Info */}
              {selectedPO.status === 'REJECTED' && selectedPO.rejectedReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={14} className="text-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase">Rejection Reason</span>
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-200">{selectedPO.rejectedReason}</p>
                  {selectedPO.approvedBy && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Rejected by {selectedPO.approvedBy.name} on {formatDateTime(selectedPO.approvedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedPO && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Review Purchase Order</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedPO.poNumber} - {formatCurrency(selectedPO.totalAmount)}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Decision Buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Your Decision
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDecision('APPROVED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle size={32} />
                    <span className="font-semibold">Approve</span>
                  </button>
                  <button
                    onClick={() => setDecision('REJECTED')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      decision === 'REJECTED'
                        ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300'
                    }`}
                  >
                    <XCircle size={32} />
                    <span className="font-semibold">Reject</span>
                  </button>
                </div>
              </div>

              {/* Rejection Reason */}
              {decision === 'REJECTED' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Please explain why this PO is being rejected..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Info Message */}
              {decision === 'APPROVED' && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    {isSuperAdmin
                      ? 'This PO will be marked as approved and sent to the vendor. Items will be available for receipt verification.'
                      : 'This PO will move to Super Admin for final approval.'}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedPO(null);
                  setDecision('');
                  setReason('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={decision === 'APPROVED' ? handleApprove : handleReject}
                disabled={!decision || isSaving || (decision === 'REJECTED' && !reason.trim())}
                className={`flex-1 ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : decision === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-300 text-slate-500'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPO && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit PO</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPO.poNumber}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor</label>
                <select
                  value={editForm.vendorId}
                  onChange={(e) => setEditForm({ ...editForm, vendorId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.companyName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Warehouse</label>
                <select
                  value={editForm.warehouse}
                  onChange={(e) => setEditForm({ ...editForm, warehouse: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="PENDING_ADMIN">Pending Review</option>
                  <option value="PENDING_RECEIPT">Approved (Sent to Vendor)</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Remark</label>
                <textarea
                  value={editForm.remark}
                  onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete PO</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{deleteTarget.poNumber}</p>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete this purchase order? This action cannot be undone.
              </p>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  All {deleteTarget.items?.length || 0} items in this PO will also be deleted.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete PO'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
