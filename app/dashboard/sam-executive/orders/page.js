'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Plus, Upload, X, FileText, Search, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { SERVICE_ORDER_TYPE_CONFIG, SERVICE_ORDER_STATUS_CONFIG } from '@/lib/statusConfig';

const ORDER_TYPES = ['UPGRADE', 'DOWNGRADE', 'RATE_REVISION', 'DISCONNECTION'];
const STATUS_OPTIONS = ['PENDING_DOCS_REVIEW', 'DOCS_REJECTED', 'PENDING_NOC', 'PENDING_SAM_ACTIVATION', 'PENDING_ACCOUNTS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];

const typeBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

const statusBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.color])
);

export default function SAMExecutiveOrders() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [poFiles, setPoFiles] = useState([]);
  const [mailFiles, setMailFiles] = useState([]);
  const [form, setForm] = useState({
    orderType: '',
    customerId: '',
    newBandwidth: '',
    newArc: '',
    disconnectionReason: '',
    disconnectionCategoryId: '',
    disconnectionSubCategoryId: '',
    notes: '',
  });

  const [disconnectionReasons, setDisconnectionReasons] = useState([]);
  const [selectedCustomerArc, setSelectedCustomerArc] = useState(null);
  const [selectedCustomerBandwidth, setSelectedCustomerBandwidth] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState('');
  const customerSearchRef = useRef(null);

  const isMaster = user?.role === 'MASTER';
  const isSAMHead = user?.role === 'SAM_HEAD' || isMaster;
  const allowedRoles = ['SAM_EXECUTIVE', 'SAM_HEAD', 'SUPER_ADMIN', 'MASTER'];

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
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
      if (filterType) params.append('orderType', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (search) params.append('search', search);

      const response = await api.get(`/service-orders?${params}`);
      setOrders(response.data.orders);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load service orders');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filterType, filterStatus, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchCustomers = useCallback(async () => {
    try {
      const isSuperAdmin = user?.role === 'SUPER_ADMIN';
      if (isSAMHead || isSuperAdmin) {
        // SAM_HEAD and SUPER_ADMIN: fetch all customers with active accounts
        const response = await api.get('/sam/customers/invoiced?limit=200');
        setCustomers(response.data.customers || []);
      } else {
        // SAM_EXECUTIVE: fetch only assigned customers
        const response = await api.get('/sam/my-customers?limit=200');
        // Response shape: { assignments: [{ customer: { id, campaignData, ... } }] }
        const list = (response.data.assignments || []).map(a => a.customer);
        setCustomers(list);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, [isSAMHead, user?.role]);

  const openCreateModal = () => {
    setShowModal(true);
    setStep(1);
    setForm({ orderType: '', customerId: '', newBandwidth: '', newArc: '', disconnectionReason: '', disconnectionCategoryId: '', disconnectionSubCategoryId: '', notes: '' });
    setPoFiles([]);
    setMailFiles([]);
    setSelectedCustomerArc(null);
    setSelectedCustomerBandwidth(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setSelectedCustomerLabel('');
    fetchCustomers();
    // Fetch disconnection reasons
    api.get('/service-orders/disconnection-reasons').then(res => setDisconnectionReasons(res.data.data || [])).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!form.customerId || !form.orderType) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (['UPGRADE', 'DOWNGRADE', 'RATE_REVISION'].includes(form.orderType) && poFiles.length === 0) {
      toast.error('PO attachment is required for upgrade/downgrade/rate revision orders.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customerId: form.customerId,
        orderType: form.orderType,
        notes: form.notes || undefined,
      };
      if (form.orderType === 'UPGRADE' || form.orderType === 'DOWNGRADE') {
        if (!form.newBandwidth || !form.newArc) {
          toast.error('New bandwidth and ARC are required.');
          setIsSubmitting(false);
          return;
        }
        const newArcVal = parseFloat(form.newArc);
        const newBwVal = parseInt(form.newBandwidth);
        if (selectedCustomerArc !== null) {
          if (newArcVal === selectedCustomerArc) {
            toast.error('New ARC cannot be the same as the current ARC.');
            setIsSubmitting(false);
            return;
          }
          if (form.orderType === 'UPGRADE' && newArcVal <= selectedCustomerArc) {
            toast.error('For an upgrade, new ARC must be greater than the current ARC.');
            setIsSubmitting(false);
            return;
          }
          if (form.orderType === 'DOWNGRADE' && newArcVal >= selectedCustomerArc) {
            toast.error('For a downgrade, new ARC must be less than the current ARC.');
            setIsSubmitting(false);
            return;
          }
        }
        if (selectedCustomerBandwidth !== null) {
          if (newBwVal === selectedCustomerBandwidth) {
            toast.error('New bandwidth cannot be the same as the current bandwidth.');
            setIsSubmitting(false);
            return;
          }
          if (form.orderType === 'UPGRADE' && newBwVal <= selectedCustomerBandwidth) {
            toast.error('For an upgrade, new bandwidth must be greater than the current bandwidth.');
            setIsSubmitting(false);
            return;
          }
          if (form.orderType === 'DOWNGRADE' && newBwVal >= selectedCustomerBandwidth) {
            toast.error('For a downgrade, new bandwidth must be less than the current bandwidth.');
            setIsSubmitting(false);
            return;
          }
        }
        payload.newBandwidth = parseInt(form.newBandwidth);
        payload.newArc = newArcVal;
      }
      if (form.orderType === 'RATE_REVISION') {
        if (!form.newArc) {
          toast.error('New ARC is required.');
          setIsSubmitting(false);
          return;
        }
        const newArcVal = parseFloat(form.newArc);
        if (selectedCustomerArc !== null && newArcVal >= selectedCustomerArc) {
          toast.error('For rate revision, new ARC must be less than current ARC.');
          setIsSubmitting(false);
          return;
        }
        payload.newArc = newArcVal;
        if (form.newBandwidth) {
          const newBwVal = parseInt(form.newBandwidth);
          if (selectedCustomerBandwidth !== null && newBwVal < selectedCustomerBandwidth) {
            toast.error('Rate revision cannot reduce bandwidth.');
            setIsSubmitting(false);
            return;
          }
          payload.newBandwidth = newBwVal;
        }
      }
      if (form.orderType === 'DISCONNECTION') {
        if (!form.disconnectionCategoryId || !form.disconnectionSubCategoryId) {
          toast.error('Disconnection category and sub-category are required.');
          setIsSubmitting(false);
          return;
        }
        payload.disconnectionCategoryId = form.disconnectionCategoryId;
        payload.disconnectionSubCategoryId = form.disconnectionSubCategoryId;
      }

      const response = await api.post('/service-orders', payload);
      const orderId = response.data.data.id;

      // Upload PO files
      for (const file of poFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'PO');
        await api.post(`/service-orders/${orderId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      // Upload Mail files
      for (const file of mailFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'MAIL');
        await api.post(`/service-orders/${orderId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Service order created successfully!');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
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
        const date = row.activationDate || row.effectiveDate;
        return date
          ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '-';
      }
    },
    {
      key: 'arc', label: 'ARC',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-500">{row.currentArc ? formatCurrency(row.currentArc) : '-'}</p>
          {row.newArc && <p className="text-sm font-medium text-emerald-600">→ {formatCurrency(row.newArc)}</p>}
        </div>
      )
    },
    {
      key: 'bandwidth', label: 'Bandwidth',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-500">{row.currentBandwidth ? `${row.currentBandwidth >= 1000 ? (row.currentBandwidth / 1000).toFixed(0) + ' Gbps' : row.currentBandwidth + ' Mbps'}` : '-'}</p>
          {row.newBandwidth && <p className="text-sm font-medium text-emerald-600">→ {row.newBandwidth >= 1000 ? (row.newBandwidth / 1000).toFixed(0) + ' Gbps' : row.newBandwidth + ' Mbps'}</p>}
        </div>
      )
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
      key: 'createdBy', label: 'Created By',
      render: (row) => row.createdBy?.name || '-'
    },
  ];

  const filters = (
    <div className="flex gap-2 flex-wrap">
      <select
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        value={filterType}
        onChange={(e) => { setFilterType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
      >
        <option value="">All Types</option>
        {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        value={filterStatus}
        onChange={(e) => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
      >
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-6">
      <DataTable
        title="Service Orders"
        totalCount={pagination.total}
        columns={columns}
        data={orders}
        loading={isLoading}
        searchable
        searchPlaceholder="Search by order # or company..."
        onSearch={(val) => { setSearch(val); setPagination(p => ({ ...p, page: 1 })); }}
        filters={filters}
        onRowClick={(row) => {
          const basePath = isSAMHead ? '/dashboard/sam-head/orders' : '/dashboard/sam-executive/orders';
          router.push(`${basePath}/${row.id}`);
        }}
        headerExtra={
          <Button onClick={openCreateModal} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Create Order
          </Button>
        }
        pagination
        serverPagination={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          pageSize: pagination.limit,
        }}
        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
        onPageSizeChange={(limit) => setPagination(p => ({ ...p, limit, page: 1 }))}
        emptyMessage="No service orders found"
      />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">
                {step === 1 ? 'Select Order Type' : 'Create Service Order'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {step === 1 ? (
                <div className="grid grid-cols-1 gap-3">
                  {ORDER_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => { setForm(f => ({ ...f, orderType: type })); setStep(2); }}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:border-orange-500 ${
                        type === 'UPGRADE' ? 'border-blue-200 dark:border-blue-800' :
                        type === 'DOWNGRADE' ? 'border-orange-200 dark:border-orange-800' :
                        type === 'RATE_REVISION' ? 'border-teal-200 dark:border-teal-800' :
                        'border-red-200 dark:border-red-800'
                      }`}
                    >
                      <span className="font-semibold">{type.replace(/_/g, ' ')}</span>
                      <p className="text-sm text-slate-500 mt-1">
                        {type === 'UPGRADE' && 'Increase bandwidth / ARC for a customer'}
                        {type === 'DOWNGRADE' && 'Decrease bandwidth / ARC for a customer'}
                        {type === 'RATE_REVISION' && 'Same speed less ARC / More speed less ARC'}
                        {type === 'DISCONNECTION' && 'Request disconnection (30-day notice)'}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="relative" ref={customerSearchRef}>
                    <label className="block text-sm font-medium mb-1">Customer *</label>
                    {form.customerId && selectedCustomerLabel ? (
                      <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20">
                        <span className="flex-1 text-sm font-medium truncate">{selectedCustomerLabel}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, customerId: '' }));
                            setSelectedCustomerLabel('');
                            setSelectedCustomerArc(null);
                            setSelectedCustomerBandwidth(null);
                            setCustomerSearch('');
                            setShowCustomerDropdown(false);
                          }}
                          className="text-slate-400 hover:text-red-500 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Search by name, circuit ID, username..."
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                        />
                      </div>
                    )}
                    {showCustomerDropdown && !form.customerId && (
                      <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        {customers
                          .filter(c => {
                            if (!customerSearch.trim()) return true;
                            const q = customerSearch.toLowerCase();
                            return (
                              (c.campaignData?.company || '').toLowerCase().includes(q) ||
                              (c.campaignData?.name || '').toLowerCase().includes(q) ||
                              (c.circuitId || '').toLowerCase().includes(q) ||
                              (c.customerUsername || '').toLowerCase().includes(q) ||
                              (c.id || '').toLowerCase().includes(q)
                            );
                          })
                          .map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 border-b border-slate-100 dark:border-slate-800 last:border-0"
                              onClick={() => {
                                setForm(f => ({ ...f, customerId: c.id }));
                                setSelectedCustomerArc(c.arcAmount ?? c.actualPlanPrice ?? null);
                                setSelectedCustomerBandwidth(c.actualPlanBandwidth ?? null);
                                const label = c.campaignData?.company || c.customerUsername || c.id;
                                setSelectedCustomerLabel(
                                  label + (c.circuitId ? ` | ${c.circuitId}` : '') + (c.customerUsername && c.campaignData?.company ? ` | ${c.customerUsername}` : '')
                                );
                                setShowCustomerDropdown(false);
                                setCustomerSearch('');
                              }}
                            >
                              <p className="text-sm font-medium">{c.campaignData?.company || c.customerUsername || c.id}</p>
                              <p className="text-xs text-slate-500 flex gap-2 flex-wrap">
                                {c.customerUsername && <span>User: {c.customerUsername}</span>}
                                {c.circuitId && <span>Circuit: {c.circuitId}</span>}
                                {c.campaignData?.name && <span>Contact: {c.campaignData.name}</span>}
                              </p>
                            </button>
                          ))
                        }
                        {customers.filter(c => {
                          if (!customerSearch.trim()) return true;
                          const q = customerSearch.toLowerCase();
                          return (
                            (c.campaignData?.company || '').toLowerCase().includes(q) ||
                            (c.campaignData?.name || '').toLowerCase().includes(q) ||
                            (c.circuitId || '').toLowerCase().includes(q) ||
                            (c.customerUsername || '').toLowerCase().includes(q) ||
                            (c.id || '').toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <p className="px-3 py-4 text-sm text-slate-400 text-center">No customers found</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Badge className={`${typeBadgeColors[form.orderType]} border-0`}>
                    {form.orderType.replace(/_/g, ' ')}
                  </Badge>

                  {(selectedCustomerArc !== null || selectedCustomerBandwidth !== null) && ['UPGRADE', 'DOWNGRADE', 'RATE_REVISION'].includes(form.orderType) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex gap-6">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Current ARC</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{selectedCustomerArc !== null ? formatCurrency(selectedCustomerArc) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Current Bandwidth</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {selectedCustomerBandwidth !== null
                            ? (selectedCustomerBandwidth >= 1000 ? `${(selectedCustomerBandwidth / 1000).toFixed(0)} Gbps` : `${selectedCustomerBandwidth} Mbps`)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(form.orderType === 'UPGRADE' || form.orderType === 'DOWNGRADE') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">New Bandwidth (Mbps) *</label>
                        <Input
                          type="number"
                          value={form.newBandwidth}
                          onChange={(e) => setForm(f => ({ ...f, newBandwidth: e.target.value }))}
                          placeholder="e.g. 100"
                        />
                        {form.newBandwidth && selectedCustomerBandwidth !== null && (
                          <p className={`text-xs mt-1 ${
                            parseInt(form.newBandwidth) === selectedCustomerBandwidth ? 'text-red-500' :
                            form.orderType === 'UPGRADE' && parseInt(form.newBandwidth) <= selectedCustomerBandwidth ? 'text-red-500' :
                            form.orderType === 'DOWNGRADE' && parseInt(form.newBandwidth) >= selectedCustomerBandwidth ? 'text-red-500' :
                            'text-emerald-600'
                          }`}>
                            {parseInt(form.newBandwidth) === selectedCustomerBandwidth
                              ? 'New bandwidth cannot be the same as current bandwidth'
                              : form.orderType === 'UPGRADE' && parseInt(form.newBandwidth) <= selectedCustomerBandwidth
                              ? 'Upgrade bandwidth must be greater than current bandwidth'
                              : form.orderType === 'DOWNGRADE' && parseInt(form.newBandwidth) >= selectedCustomerBandwidth
                              ? 'Downgrade bandwidth must be less than current bandwidth'
                              : `Change: ${selectedCustomerBandwidth} → ${form.newBandwidth} Mbps`
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">New ARC (INR) *</label>
                        <Input
                          type="number"
                          value={form.newArc}
                          onChange={(e) => setForm(f => ({ ...f, newArc: e.target.value }))}
                          placeholder="e.g. 50000"
                        />
                        {form.newArc && selectedCustomerArc !== null && (
                          <p className={`text-xs mt-1 ${
                            parseFloat(form.newArc) === selectedCustomerArc ? 'text-red-500' :
                            form.orderType === 'UPGRADE' && parseFloat(form.newArc) <= selectedCustomerArc ? 'text-red-500' :
                            form.orderType === 'DOWNGRADE' && parseFloat(form.newArc) >= selectedCustomerArc ? 'text-red-500' :
                            'text-emerald-600'
                          }`}>
                            {parseFloat(form.newArc) === selectedCustomerArc
                              ? 'New ARC cannot be the same as current ARC'
                              : form.orderType === 'UPGRADE' && parseFloat(form.newArc) <= selectedCustomerArc
                              ? 'Upgrade ARC must be greater than current ARC'
                              : form.orderType === 'DOWNGRADE' && parseFloat(form.newArc) >= selectedCustomerArc
                              ? 'Downgrade ARC must be less than current ARC'
                              : `Difference: ${formatCurrency(Math.abs(parseFloat(form.newArc) - selectedCustomerArc))}`
                            }
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {form.orderType === 'RATE_REVISION' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">New Bandwidth (Mbps) <span className="text-slate-400 font-normal">- optional</span></label>
                        <Input
                          type="number"
                          value={form.newBandwidth}
                          onChange={(e) => setForm(f => ({ ...f, newBandwidth: e.target.value }))}
                          placeholder="Leave blank to keep same bandwidth"
                        />
                        {form.newBandwidth && selectedCustomerBandwidth !== null && parseInt(form.newBandwidth) < selectedCustomerBandwidth && (
                          <p className="text-xs mt-1 text-red-500">Rate revision cannot reduce bandwidth</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">New ARC (INR) *</label>
                        <Input
                          type="number"
                          value={form.newArc}
                          onChange={(e) => setForm(f => ({ ...f, newArc: e.target.value }))}
                          placeholder="e.g. 40000"
                        />
                        {form.newArc && selectedCustomerArc !== null && (
                          <p className={`text-xs mt-1 ${
                            parseFloat(form.newArc) >= selectedCustomerArc ? 'text-red-500' : 'text-emerald-600'
                          }`}>
                            {parseFloat(form.newArc) >= selectedCustomerArc
                              ? 'New ARC must be less than current ARC'
                              : `Change: ${formatCurrency(selectedCustomerArc)} → ${formatCurrency(parseFloat(form.newArc))}${form.newBandwidth ? ` | BW: ${selectedCustomerBandwidth} → ${form.newBandwidth} Mbps` : ' (Bandwidth stays same)'}`
                            }
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {form.orderType === 'DISCONNECTION' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Disconnection Category *</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          value={form.disconnectionCategoryId}
                          onChange={(e) => setForm(f => ({ ...f, disconnectionCategoryId: e.target.value, disconnectionSubCategoryId: '' }))}
                        >
                          <option value="">Select category...</option>
                          {disconnectionReasons.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sub Category *</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          value={form.disconnectionSubCategoryId}
                          onChange={(e) => setForm(f => ({ ...f, disconnectionSubCategoryId: e.target.value }))}
                          disabled={!form.disconnectionCategoryId}
                        >
                          <option value="">Select sub-category...</option>
                          {(disconnectionReasons.find(c => c.id === form.disconnectionCategoryId)?.subCategories || []).map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Brief Remark</label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[60px]"
                      value={form.notes}
                      onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Brief remark..."
                    />
                  </div>

                  {/* PO Upload */}
                  {['UPGRADE', 'DOWNGRADE', 'RATE_REVISION'].includes(form.orderType) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        PO Document<span className="text-red-500"> *</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500">Upload PO</span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setPoFiles(prev => [...prev, ...Array.from(e.target.files)])}
                        />
                      </label>
                      {poFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {poFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1">
                              <span className="flex items-center gap-1 truncate">
                                <FileText className="w-3 h-3 text-orange-500" /> {file.name}
                              </span>
                              <button
                                onClick={() => setPoFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mail Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mail / Other Attachments
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Upload Mail / Documents</span>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => setMailFiles(prev => [...prev, ...Array.from(e.target.files)])}
                      />
                    </label>
                    {mailFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {mailFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
                            <span className="flex items-center gap-1 truncate">
                              <FileText className="w-3 h-3 text-blue-500" /> {file.name}
                            </span>
                            <button
                              onClick={() => setMailFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...</> : 'Create Order'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
