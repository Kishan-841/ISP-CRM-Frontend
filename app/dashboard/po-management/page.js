'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import POStatusBadge from '@/components/po/POStatusBadge';
import POProgressStepper from '@/components/po/POProgressStepper';
import {
  getStatusLabel,
  getStatusBadgeClass,
  formatCurrency,
  formatDate,
  formatDateTime,
  getPOSummary,
  getCategoryLabel,
  getActionHint
} from '@/lib/po-utils';
import {
  Plus,
  Search,
  Package,
  Clock,
  CheckCircle,
  Truck,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  FileText,
  AlertCircle,
  Info,
  Building2,
  Calendar,
  Eye,
  Boxes,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function POManagementPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  // Data states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPO, setExpandedPO] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [newPO, setNewPO] = useState({
    vendorId: '',
    warehouse: 'Pune',
    remark: '',
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vendor creation modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    companyName: '',
    gstNumber: '',
    panNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  });
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);

  // Inventory states (per-PO)
  const [inventoryItems, setInventoryItems] = useState(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isUploadingSerials, setIsUploadingSerials] = useState(false);
  const [uploadedSerialFile, setUploadedSerialFile] = useState(null);
  const [isSavingInventory, setIsSavingInventory] = useState(false);

  // Access control
  const isMaster = user?.role === 'MASTER';
  const isStoreManager = user?.role === 'STORE_MANAGER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasAccess = isStoreManager || isSuperAdmin || isMaster;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showCreateModal, () => !isSubmitting && setShowCreateModal(false));
  useModal(showVendorModal, () => !isCreatingVendor && setShowVendorModal(false));

  useEffect(() => {
    if (user && !hasAccess) {
      router.push('/dashboard');
    }
  }, [user, hasAccess, router]);

  // Fetch all data
  useEffect(() => {
    if (hasAccess && token) {
      fetchData();
    }
  }, [hasAccess, token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [posRes, productsRes, vendorsRes] = await Promise.all([
        fetch(`${API_BASE}/store/purchase-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/store/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/store/vendors`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (posRes.ok) setPurchaseOrders(await posRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (vendorsRes.ok) setVendors(await vendorsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh when socket events arrive (e.g., PO status changes by another user)
  useSocketRefresh(fetchData, { enabled: hasAccess });

  // Calculate stats
  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(po => ['PENDING_ADMIN', 'PENDING_SUPER_ADMIN'].includes(po.status)).length,
    withVendor: purchaseOrders.filter(po => po.status === 'PENDING_RECEIPT').length,
    receiving: purchaseOrders.filter(po => po.status === 'PARTIALLY_RECEIVED').length,
    inventory: purchaseOrders.filter(po => po.status === 'RECEIVED').length,
    completed: purchaseOrders.filter(po => po.status === 'COMPLETED').length
  };

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po =>
    po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create PO handlers
  const handleAddItem = () => {
    setNewPO(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: '' }]
    }));
  };

  const handleRemoveItem = (index) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setNewPO(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };

      // Auto-fill price when product selected
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product?.price) {
          items[index].unitPrice = product.price;
        }
      }

      return { ...prev, items };
    });
  };

  const handleSubmitPO = async () => {
    if (!newPO.vendorId) {
      toast.error('Please select a vendor');
      return;
    }
    if (newPO.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    if (newPO.items.some(item => !item.productId || !item.quantity)) {
      toast.error('Please fill in all item details');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/store/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPO)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Purchase Order created successfully!');
        setShowCreateModal(false);
        setNewPO({ vendorId: '', warehouse: 'Pune', remark: '', items: [] });
        fetchData();
      } else {
        toast.error(data.message || 'Failed to create PO');
      }
    } catch (error) {
      toast.error('Failed to create Purchase Order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new vendor handler
  const handleCreateVendor = async () => {
    if (!newVendor.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    if (!newVendor.panNumber.trim()) {
      toast.error('PAN number is required');
      return;
    }

    // Validate PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(newVendor.panNumber.trim().toUpperCase())) {
      toast.error('Invalid PAN format. Must be like ABCDE1234F');
      return;
    }

    setIsCreatingVendor(true);
    try {
      const response = await fetch(`${API_BASE}/store/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newVendor)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vendor created successfully!');
        // Add new vendor to list and select it
        setVendors(prev => [...prev, data.vendor].sort((a, b) => a.companyName.localeCompare(b.companyName)));
        setNewPO(prev => ({ ...prev, vendorId: data.vendor.id }));
        setShowVendorModal(false);
        setNewVendor({
          companyName: '',
          gstNumber: '',
          panNumber: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: ''
        });
      } else {
        toast.error(data.message || 'Failed to create vendor');
      }
    } catch (error) {
      toast.error('Failed to create vendor');
    } finally {
      setIsCreatingVendor(false);
    }
  };

  // ========== Inventory Functions ==========
  const fetchInventoryItems = async (poId) => {
    setIsLoadingInventory(true);
    try {
      const response = await fetch(`${API_BASE}/store/purchase-orders/${poId}/inventory-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setInventoryItems(await response.json());
      }
    } catch (error) {
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const handleDownloadTemplate = async (poId) => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch(`${API_BASE}/store/purchase-orders/${poId}/add-to-inventory/template`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `serial_template_${poId.slice(0, 8)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded! Fill in serial numbers and upload.');
    } catch (error) {
      toast.error(error.message || 'Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleSerialFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setUploadedSerialFile(file);
    }
  };

  const handleUploadSerials = async (poId) => {
    if (!uploadedSerialFile) {
      toast.error('Please select a file first');
      return;
    }
    setIsUploadingSerials(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedSerialFile);
      const response = await fetch(`${API_BASE}/store/purchase-orders/${poId}/add-to-inventory/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message);
        setUploadedSerialFile(null);
        fetchData();
        fetchInventoryItems(poId);
      } else {
        const errMsg = data.errors ? data.message + ': ' + data.errors.join(', ') : data.message;
        toast.error(errMsg || 'Failed to upload');
      }
    } catch (error) {
      toast.error('Failed to upload serial numbers');
    } finally {
      setIsUploadingSerials(false);
    }
  };

  const handleAddWithoutSerials = async (poId) => {
    setIsSavingInventory(true);
    try {
      const response = await fetch(`${API_BASE}/store/purchase-orders/${poId}/add-to-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message);
        setUploadedSerialFile(null);
        fetchData();
        fetchInventoryItems(poId);
      } else {
        toast.error(data.message || 'Failed to add items');
      }
    } catch (error) {
      toast.error('Failed to add items to store');
    } finally {
      setIsSavingInventory(false);
    }
  };

  // When expanding a RECEIVED PO, fetch inventory items
  const handleExpandPO = (poId, poStatus) => {
    const isExpanded = expandedPO === poId;
    setExpandedPO(isExpanded ? null : poId);
    if (!isExpanded && (poStatus === 'RECEIVED' || poStatus === 'COMPLETED')) {
      fetchInventoryItems(poId);
    } else {
      setInventoryItems(null);
      setUploadedSerialFile(null);
    }
  };

  // Desktop DataTable columns
  const poColumns = [
    {
      key: 'expand',
      label: '',
      width: '40px',
      render: (row) => (
        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          {expandedPO === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ),
    },
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
        if (!['RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED'].includes(row.status)) {
          return <div className="text-center"><span className="text-xs text-slate-400">-</span></div>;
        }
        const summary = getPOSummary(row);
        return (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-14 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    summary.percentReceived === 100 ? 'bg-emerald-500' : 'bg-orange-600'
                  }`}
                  style={{ width: `${summary.percentReceived}%` }}
                />
              </div>
              <span className={`text-xs font-semibold ${
                summary.percentReceived === 100 ? 'text-emerald-600' : 'text-orange-600'
              }`}>
                {summary.percentReceived}%
              </span>
            </div>
            <span className="text-xs text-slate-500 mt-0.5">
              {summary.totalReceived}/{summary.totalOrdered}
            </span>
          </div>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <div className="text-right">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(row.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="text-center">
          <POStatusBadge status={row.status} size="sm" showIcon={false} />
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (row) => (
        <div className="flex justify-center">
          <POProgressStepper status={row.status} compact />
        </div>
      ),
    },
    {
      key: 'giirn',
      label: 'GIIRN',
      render: (row) => (
        <div className="text-center">
          {row.giirnNumber ? (
            <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
              {row.giirnNumber}
            </span>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <div className="text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(row.createdAt)}
          </span>
        </div>
      ),
    },
  ];

  if (!hasAccess) return null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader title="Purchase Orders" description="Create and track purchase orders for store inventory">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white gap-2"
        >
          <Plus size={18} />
          New PO
        </Button>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard color="slate" icon={ShoppingCart} label="Total POs" value={stats.total} />
        <StatCard color="amber" icon={Clock} label="Pending" value={stats.pending} />
        <StatCard color="indigo" icon={Truck} label="With Vendor" value={stats.withVendor} />
        <StatCard color="orange" icon={Package} label="Receiving" value={stats.receiving} />
        <StatCard color="orange" icon={Boxes} label="Inventory" value={stats.inventory} />
        <StatCard color="emerald" icon={CheckCircle} label="Completed" value={stats.completed} />
      </div>

      {/* Mobile Search */}
      <div className="lg:hidden relative w-full sm:max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by PO number or vendor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* PO List - Mobile Card View */}
      <Card className="lg:hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <ShoppingCart size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">No purchase orders yet</p>
              <p className="text-sm mt-1">Create your first PO to get started</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus size={16} className="mr-2" />
                Create PO
              </Button>
            </div>
          ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredPOs.map((po) => {
                  const summary = getPOSummary(po);
                  const isExpanded = expandedPO === po.id;

                  return (
                    <div key={po.id} className="p-3 sm:p-4">
                      {/* Card Header */}
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => handleExpandPO(po.id, po.status)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {po.poNumber}
                            </span>
                            <POStatusBadge status={po.status} size="sm" showIcon={false} />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {formatDate(po.createdAt)}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 truncate">
                            {po.vendor?.companyName || '-'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(po.totalAmount)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {summary.totalItems} items ({summary.totalOrdered} {summary.unitLabel})
                          </p>
                        </div>
                      </div>

                      {/* Expand Toggle */}
                      <button
                        onClick={() => handleExpandPO(po.id, po.status)}
                        className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp size={14} /> Hide details</>
                        ) : (
                          <><ChevronDown size={14} /> Show details</>
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {/* Progress Stepper */}
                          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Progress</h4>
                            <POProgressStepper status={po.status} />
                          </div>

                          {/* Status Hint */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-start gap-2">
                              <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                {getActionHint(po.status, user?.role) || getStatusLabel(po.status)}
                              </p>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Items ({po.items?.length || 0})
                              </h4>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {po.items?.map((item, idx) => {
                                const received = item.receivedQuantity || 0;
                                const pending = item.quantity - received;
                                const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                                const unitLabel = isFiber ? 'mtrs' : 'pcs';

                                return (
                                  <div key={item.id} className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                          {idx + 1}. {item.product?.modelNumber || 'Unknown'}
                                        </p>
                                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                          {getCategoryLabel(item.product?.category)}
                                        </span>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                          {formatCurrency((item.unitPrice || 0) * item.quantity)}
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          item.status === 'IN_STORE'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                          {item.status === 'IN_STORE' ? 'In Store' : 'Pending'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                                      <span>Ordered: {item.quantity} {unitLabel}</span>
                                      <span>Received: {received} {unitLabel}</span>
                                      {pending > 0 && <span className="text-amber-600">Pending: {pending} {unitLabel}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total:</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(po.totalAmount)}</span>
                            </div>
                          </div>

                          {/* Inventory Section - for RECEIVED POs */}
                          {(po.status === 'RECEIVED' || po.status === 'COMPLETED') && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <div className="px-3 sm:px-4 py-2.5 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                                    <Boxes size={16} />
                                    Add to Inventory
                                  </h4>
                                  {po.status === 'COMPLETED' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                                      All items in store
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 sm:p-4">
                                {isLoadingInventory ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                  </div>
                                ) : inventoryItems && expandedPO === po.id ? (
                                  <div className="space-y-4">
                                    {inventoryItems.inStoreItems?.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
                                          In Store ({inventoryItems.inStoreCount})
                                        </p>
                                        <div className="space-y-1.5">
                                          {inventoryItems.inStoreItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                  {item.product?.modelNumber}
                                                </span>
                                              </div>
                                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2">
                                                {item.receivedQuantity ?? item.quantity} {item.product?.category === 'FIBER' || item.product?.unit === 'mtrs' ? 'mtrs' : 'pcs'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {inventoryItems.pendingItems?.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
                                          Pending ({inventoryItems.pendingCount})
                                        </p>
                                        <div className="space-y-1.5">
                                          {inventoryItems.pendingItems.map((item) => {
                                            const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                                            return (
                                              <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <Package size={14} className="text-amber-500 flex-shrink-0" />
                                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                    {item.product?.modelNumber}
                                                  </span>
                                                </div>
                                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2">
                                                  {item.receivedQuantity ?? item.quantity} {isFiber ? 'mtrs' : 'pcs'}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Serial Number Workflow */}
                                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
                                            1. Download template → 2. Fill serial numbers → 3. Upload filled Excel
                                          </p>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(po.id); }}
                                              disabled={isDownloadingTemplate}
                                              variant="outline"
                                              size="sm"
                                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                                            >
                                              {isDownloadingTemplate ? (
                                                <><Loader2 className="animate-spin w-4 h-4 mr-1" /> Downloading...</>
                                              ) : (
                                                <><Download size={14} className="mr-1" /> Download Template</>
                                              )}
                                            </Button>

                                            <div>
                                              <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleSerialFileChange}
                                                className="hidden"
                                                id={`excel-upload-mobile-${po.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                              <label
                                                htmlFor={`excel-upload-mobile-${po.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center justify-center gap-1 w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                              >
                                                <Upload size={14} />
                                                {uploadedSerialFile ? 'Change File' : 'Upload Excel'}
                                              </label>
                                            </div>
                                          </div>

                                          {uploadedSerialFile && (
                                            <div className="mt-3 flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                              <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 truncate">{uploadedSerialFile.name}</p>
                                              </div>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setUploadedSerialFile(null); }}
                                                className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          )}

                                          <div className="mt-3 flex gap-3">
                                            {uploadedSerialFile ? (
                                              <Button
                                                onClick={(e) => { e.stopPropagation(); handleUploadSerials(po.id); }}
                                                disabled={isUploadingSerials}
                                                size="sm"
                                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                                              >
                                                {isUploadingSerials ? (
                                                  <><Loader2 className="animate-spin w-4 h-4 mr-1" /> Processing...</>
                                                ) : (
                                                  <><Upload size={14} className="mr-1" /> Upload & Add to Store</>
                                                )}
                                              </Button>
                                            ) : (
                                              <Button
                                                onClick={(e) => { e.stopPropagation(); handleAddWithoutSerials(po.id); }}
                                                disabled={isSavingInventory}
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100"
                                              >
                                                {isSavingInventory ? (
                                                  <><Loader2 className="animate-spin w-4 h-4 mr-1" /> Adding...</>
                                                ) : (
                                                  'Add Without Serials'
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {inventoryItems.pendingCount === 0 && inventoryItems.inStoreCount > 0 && (
                                      <div className="text-center py-2">
                                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                          All items have been added to inventory
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {/* Additional Info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {po.remark && (
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Remark</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{po.remark}</p>
                              </div>
                            )}
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Warehouse</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{po.warehouse || 'Pune'}</p>
                            </div>
                            {po.createdBy && (
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Created By</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{po.createdBy.name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          )}
        </CardContent>
      </Card>

      {/* Desktop Table View */}
      <DataTable
        title="Purchase Orders"
        totalCount={purchaseOrders.length}
        columns={poColumns}
        data={purchaseOrders}
        searchable
        searchPlaceholder="Search by PO number or vendor..."
        searchKeys={['poNumber', 'vendor.companyName']}
        pagination
        defaultPageSize={25}
        loading={isLoading}
        emptyMessage="No purchase orders yet"
        emptyIcon={ShoppingCart}
        onRowClick={(row) => handleExpandPO(row.id, row.status)}
        className="hidden lg:block"
      />

      {/* Desktop Expanded PO Detail */}
      {expandedPO && !isLoading && (
        <div className="hidden lg:block">
          {(() => {
            const po = purchaseOrders.find(p => p.id === expandedPO);
            if (!po) return null;

            return (
              <Card className="bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Progress Stepper Full */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Progress</h4>
                      <POProgressStepper status={po.status} />
                    </div>

                    {/* Status Hint */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start gap-2">
                        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {getActionHint(po.status, user?.role) || getStatusLabel(po.status)}
                        </p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Items ({po.items?.length || 0})
                        </h4>
                      </div>
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                            <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">#</th>
                            <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">Product</th>
                            <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">Category</th>
                            <th className="text-center py-2 px-4 text-xs font-medium text-slate-500">Ordered</th>
                            <th className="text-center py-2 px-4 text-xs font-medium text-slate-500">Received</th>
                            <th className="text-center py-2 px-4 text-xs font-medium text-slate-500">Pending</th>
                            <th className="text-right py-2 px-4 text-xs font-medium text-slate-500">Unit Price</th>
                            <th className="text-right py-2 px-4 text-xs font-medium text-slate-500">Total</th>
                            <th className="text-center py-2 px-4 text-xs font-medium text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {po.items?.map((item, idx) => {
                            const received = item.receivedQuantity || 0;
                            const pending = item.quantity - received;
                            const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                            const unitLabel = isFiber ? 'mtrs' : 'pcs';

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="py-2 px-4 text-sm text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-4">
                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {item.product?.modelNumber || 'Unknown'}
                                  </span>
                                </td>
                                <td className="py-2 px-4">
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {getCategoryLabel(item.product?.category)}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-center text-sm text-slate-700 dark:text-slate-300">
                                  {item.quantity}
                                  <span className="text-xs text-slate-400 ml-1">{unitLabel}</span>
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`text-sm font-medium ${received > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {received}
                                  </span>
                                  {received > 0 && <span className="text-xs text-slate-400 ml-1">{unitLabel}</span>}
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`text-sm font-medium ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {pending}
                                  </span>
                                  {pending > 0 && <span className="text-xs text-slate-400 ml-1">{unitLabel}</span>}
                                </td>
                                <td className="py-2 px-4 text-right text-sm text-slate-700 dark:text-slate-300">
                                  {formatCurrency(item.unitPrice)}
                                  {isFiber && <span className="text-xs text-slate-400">/mtr</span>}
                                </td>
                                <td className="py-2 px-4 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {formatCurrency((item.unitPrice || 0) * item.quantity)}
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    item.status === 'IN_STORE'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}>
                                    {item.status === 'IN_STORE' ? 'In Store' : 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                          <tr>
                            <td colSpan={7} className="py-2 px-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                              Total:
                            </td>
                            <td className="py-2 px-4 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(po.totalAmount)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Inventory Section - for RECEIVED POs */}
                    {(po.status === 'RECEIVED' || po.status === 'COMPLETED') && (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                              <Boxes size={16} />
                              Add to Inventory
                            </h4>
                            {po.status === 'COMPLETED' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                                All items in store
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          {isLoadingInventory ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                            </div>
                          ) : inventoryItems && expandedPO === po.id ? (
                            <div className="space-y-4">
                              {inventoryItems.inStoreItems?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
                                    In Store ({inventoryItems.inStoreCount})
                                  </p>
                                  <div className="space-y-1.5">
                                    {inventoryItems.inStoreItems.map((item) => (
                                      <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle size={14} className="text-emerald-500" />
                                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {item.product?.modelNumber}
                                          </span>
                                          <span className="text-xs text-slate-500">
                                            {getCategoryLabel(item.product?.category)}
                                          </span>
                                        </div>
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                          {item.receivedQuantity ?? item.quantity} {item.product?.category === 'FIBER' || item.product?.unit === 'mtrs' ? 'mtrs' : 'pcs'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {inventoryItems.pendingItems?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">
                                    Pending ({inventoryItems.pendingCount})
                                  </p>
                                  <div className="space-y-1.5">
                                    {inventoryItems.pendingItems.map((item) => {
                                      const isFiber = item.product?.category === 'FIBER' || item.product?.unit === 'mtrs';
                                      return (
                                        <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                          <div className="flex items-center gap-2">
                                            <Package size={14} className="text-amber-500" />
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                              {item.product?.modelNumber}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                              {getCategoryLabel(item.product?.category)} | {item.product?.brandName}
                                            </span>
                                          </div>
                                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                            {item.receivedQuantity ?? item.quantity} {isFiber ? 'mtrs' : 'pcs'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Serial Number Workflow */}
                                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
                                      1. Download template → 2. Fill serial numbers → 3. Upload filled Excel
                                    </p>

                                    <div className="grid grid-cols-2 gap-3">
                                      <Button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(po.id); }}
                                        disabled={isDownloadingTemplate}
                                        variant="outline"
                                        size="sm"
                                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                                      >
                                        {isDownloadingTemplate ? (
                                          <><Loader2 className="animate-spin w-4 h-4 mr-1" /> Downloading...</>
                                        ) : (
                                          <><Download size={14} className="mr-1" /> Download Template</>
                                        )}
                                      </Button>

                                      <div>
                                        <input
                                          type="file"
                                          accept=".xlsx,.xls"
                                          onChange={handleSerialFileChange}
                                          className="hidden"
                                          id={`excel-upload-${po.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <label
                                          htmlFor={`excel-upload-${po.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center justify-center gap-1 w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                          <Upload size={14} />
                                          {uploadedSerialFile ? 'Change File' : 'Upload Excel'}
                                        </label>
                                      </div>
                                    </div>

                                    {uploadedSerialFile && (
                                      <div className="mt-3 flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <FileSpreadsheet size={16} className="text-emerald-600" />
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">{uploadedSerialFile.name}</p>
                                        </div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setUploadedSerialFile(null); }}
                                          className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    )}

                                    <div className="mt-3 flex gap-3">
                                      {uploadedSerialFile ? (
                                        <Button
                                          onClick={(e) => { e.stopPropagation(); handleUploadSerials(po.id); }}
                                          disabled={isUploadingSerials}
                                          size="sm"
                                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                                        >
                                          {isUploadingSerials ? (
                                            <><Loader2 className="animate-spin w-4 h-4 mr-1" /> Processing...</>
                                          ) : (
                                            <><Upload size={14} className="mr-1" /> Upload & Add to Store</>
                                          )}
                                        </Button>
                                      ) : (
                                        <Button
                                          onClick={(e) => { e.stopPropagation(); handleAddWithoutSerials(po.id); }}
                                          disabled={isSavingInventory}
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100"
                                        >
                                          {isSavingInventory ? (
                                            <><Loader2 className="animate-spin w-4 h-4 mr-1" /> Adding...</>
                                          ) : (
                                            'Add Without Serials'
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {inventoryItems.pendingCount === 0 && inventoryItems.inStoreCount > 0 && (
                                <div className="text-center py-2">
                                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    All items have been added to inventory
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Additional Info Row */}
                    <div className="flex gap-4">
                      {po.remark && (
                        <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Remark
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{po.remark}</p>
                        </div>
                      )}

                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Warehouse
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{po.warehouse || 'Pune'}</p>
                      </div>

                      {po.createdBy && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Created By
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{po.createdBy.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Create PO Modal */}
      {showCreateModal && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100">Create Purchase Order</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Add items you want to order from a vendor</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={newPO.vendorId}
                    onChange={(e) => setNewPO({ ...newPO, vendorId: e.target.value })}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.companyName}{vendor.category ? ` (${vendor.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())})` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowVendorModal(true)}
                    variant="outline"
                    className="px-4 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    <Plus size={18} />
                    <span className="ml-1 hidden sm:inline">New Vendor</span>
                  </Button>
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Warehouse
                </label>
                <select
                  value={newPO.warehouse}
                  onChange={(e) => setNewPO({ ...newPO, warehouse: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Pune">Pune</option>
                  <option value="Sambhaji Nagar">Sambhaji Nagar</option>
                  <option value="Ahilya Nagar">Ahilya Nagar</option>
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Items <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Plus size={14} />
                    Add Item
                  </Button>
                </div>

                {newPO.items.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                    <Package size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No items added yet</p>
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      variant="outline"
                      size="sm"
                      className="mt-3"
                    >
                      <Plus size={14} className="mr-1" />
                      Add First Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Column Headers - desktop only */}
                    <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      <div className="flex-1">Product</div>
                      <div className="w-28 text-center">Qty / Unit</div>
                      <div className="w-44 text-center">Unit Price</div>
                      <div className="w-8"></div>
                    </div>

                    {newPO.items.map((item, index) => {
                      const selectedProduct = products.find(p => p.id === item.productId);
                      const isFiber = selectedProduct?.category === 'FIBER' || selectedProduct?.unit === 'mtrs';

                      return (
                        <div key={index} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          {/* Product Select */}
                          <div className="w-full sm:flex-1">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                              <option value="">Select product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.modelNumber} - {getCategoryLabel(product.category)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity with unit suffix */}
                          <div className="w-full sm:w-28">
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                placeholder="Qty"
                                className="w-full pl-3 pr-12 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500">
                                {isFiber ? 'mtrs' : 'pcs'}
                              </span>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="w-full sm:w-44">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                placeholder={selectedProduct?.price ? String(selectedProduct.price) : "0"}
                                className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              />
                            </div>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="w-8 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Price Note & Total */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info size={14} />
                        <span>Prices are pre-filled from catalog. Actual price may vary - use as reference only.</span>
                      </p>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Total Amount</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(newPO.items.reduce((sum, item) => sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 0), 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Remark (Optional)
                </label>
                <textarea
                  value={newPO.remark}
                  onChange={(e) => setNewPO({ ...newPO, remark: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex gap-3">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitPO}
                disabled={isSubmitting}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create PO'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Vendor Modal */}
      {showVendorModal && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Add New Vendor</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Create a new vendor for purchase orders</p>
              </div>
              <button
                onClick={() => setShowVendorModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVendor.companyName}
                  onChange={(e) => setNewVendor({ ...newVendor, companyName: e.target.value })}
                  placeholder="Enter company name"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* GST & PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={newVendor.gstNumber}
                    onChange={(e) => setNewVendor({ ...newVendor, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g., 27AABCU9603R1ZM"
                    maxLength={15}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newVendor.panNumber}
                    onChange={(e) => setNewVendor({ ...newVendor, panNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g., ABCDE1234F"
                    maxLength={10}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                    placeholder="Contact name"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    placeholder="e.g., 9876543210"
                    maxLength={10}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  placeholder="vendor@example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <textarea
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  placeholder="Street address"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newVendor.city}
                    onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <select
                    value={newVendor.state}
                    onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select State</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Delhi">Delhi</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex gap-3">
              <Button
                onClick={() => setShowVendorModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateVendor}
                disabled={isCreatingVendor || !newVendor.companyName.trim() || !newVendor.panNumber.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isCreatingVendor ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Vendor'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
