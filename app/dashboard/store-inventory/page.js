'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import {
  Package,
  Plus,
  Search,
  Loader2,
  X,
  Warehouse,
  Hash,
  Cable,
  Box,
  ChevronDown,
  ChevronUp,
  Barcode
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const CATEGORY_LABELS = {
  SWITCH: 'Switch',
  SFP: 'SFP',
  CLOSURE: 'Closure',
  RF: 'RF',
  PATCH_CORD: 'Patch Cord',
  FIBER: 'Fiber',
  MEDIA_CONVERTER: 'Media Converter',
  ROUTER: 'Router'
};

export default function StoreInventoryPage() {
  const router = useRouter();
  const { user, isStoreManager, isSuperAdmin: isAdmin } = useRoleCheck();

  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({
    inStoreQuantity: 0,
    inStoreItems: 0,
    inStorePcsQuantity: 0,
    inStoreMtrsQuantity: 0,
    inStorePcsCount: 0,
    inStoreMtrsCount: 0,
    totalPOs: 0,
    totalProducts: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add material modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [addForm, setAddForm] = useState({ productId: '', serialText: '', quantity: '', unitPrice: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Serial numbers dropdown state
  const [expandedSerials, setExpandedSerials] = useState(null);
  const [serialSearchTerm, setSerialSearchTerm] = useState('');
  const [dropDirection, setDropDirection] = useState('down'); // 'up' or 'down'
  const serialDropdownRef = useRef(null);
  const serialSearchInputRef = useRef(null);
  const serialButtonRefs = useRef({});

  // Close serial dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (serialDropdownRef.current && !serialDropdownRef.current.contains(event.target)) {
        setExpandedSerials(null);
        setSerialSearchTerm('');
      }
    };

    if (expandedSerials) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expandedSerials]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (expandedSerials && serialSearchInputRef.current) {
      setTimeout(() => serialSearchInputRef.current?.focus(), 100);
    }
  }, [expandedSerials]);

  // Filter serial numbers based on search term
  const filterSerialNumbers = (serialNumbers, searchTerm) => {
    if (!searchTerm.trim()) return serialNumbers;
    const search = searchTerm.toLowerCase().trim();
    return serialNumbers.filter(serial =>
      serial.toLowerCase().includes(search)
    );
  };

  // Handle serial dropdown toggle with smart positioning
  const handleSerialDropdownToggle = (productId) => {
    if (expandedSerials === productId) {
      setExpandedSerials(null);
      setSerialSearchTerm('');
    } else {
      // Calculate if we should drop up or down
      const buttonEl = serialButtonRefs.current[productId];
      if (buttonEl) {
        const rect = buttonEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = 340; // Approximate dropdown height

        // If not enough space below, drop up
        setDropDirection(spaceBelow < dropdownHeight ? 'up' : 'down');
      }
      setExpandedSerials(productId);
      setSerialSearchTerm('');
    }
  };

  const hasAccess = isStoreManager || isAdmin;

  useEffect(() => {
    if (user && !hasAccess) {
      router.push('/dashboard');
    }
  }, [user, hasAccess, router]);

  useSocketRefresh(() => { fetchInventory(); fetchStats(); }, { enabled: hasAccess });

  useEffect(() => {
    if (hasAccess) {
      fetchInventory();
      fetchStats();
    }
  }, [hasAccess]);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/store/inventory');
      setInventory(response.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/store/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/store/products/all');
      setProducts(response.data.filter(p => p.isActive));
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const handleOpenAddModal = () => {
    setAddForm({ productId: '', serialText: '', quantity: '', unitPrice: '' });
    setProductSearch('');
    fetchProducts();
    setShowAddModal(true);
  };

  const selectedProduct = products.find(p => p.id === addForm.productId);
  const isBulkProduct = selectedProduct && (selectedProduct.category === 'FIBER' || selectedProduct.unit === 'mtrs');

  const handleSubmitAdd = async () => {
    if (!addForm.productId) {
      toast.error('Please select a product');
      return;
    }
    const payload = {
      productId: addForm.productId,
      unitPrice: addForm.unitPrice ? parseFloat(addForm.unitPrice) : null
    };
    if (isBulkProduct) {
      const qty = parseInt(addForm.quantity, 10);
      if (!qty || qty <= 0) {
        toast.error('Enter a valid quantity');
        return;
      }
      payload.quantity = qty;
    } else {
      const serials = addForm.serialText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      if (serials.length === 0) {
        toast.error('Enter at least one serial number');
        return;
      }
      payload.serialNumbers = serials;
    }
    setIsAdding(true);
    try {
      const response = await api.post('/store/inventory/direct-add', payload);
      toast.success(response.data.message || 'Material added');
      setShowAddModal(false);
      fetchInventory();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add material');
    } finally {
      setIsAdding(false);
    }
  };

  const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category;

  // Filter inventory
  const filteredInventory = inventory.filter(item =>
    item.modelNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brandName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryLabel(item.category)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Store Inventory" description="Products currently in store from purchase orders" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="orange" icon={Package} label="In Store Items" value={stats.inStoreItems} />
        <StatCard color="blue" icon={Box} label="Total Qty (pcs)" value={stats.inStorePcsQuantity} />
        <StatCard color="indigo" icon={Cable} label="Fiber (mtrs)" value={stats.inStoreMtrsQuantity} />
        <StatCard color="emerald" icon={Hash} label="Products" value={stats.totalProducts} />
      </div>

      {/* Search + Add Material */}
      <div className="flex items-center gap-3">
        <div className="flex-1 sm:max-w-md relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
          />
        </div>
        <Button
          onClick={handleOpenAddModal}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          Add Material
        </Button>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Warehouse size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No products in store</p>
          <p className="text-sm mt-1">Add stock from purchased items to get started</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInventory.map((item, index) => {
                  const isFiber = item.category === 'FIBER' || item.unit === 'mtrs';
                  const unitLabel = isFiber ? 'mtrs' : 'pcs';

                  return (
                    <div key={index} className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-lg flex-shrink-0 flex items-center justify-center ${
                            isFiber
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            <Package className={`h-4 w-4 ${
                              isFiber
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.modelNumber}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.brandName}</p>
                          </div>
                        </div>
                        <Badge className={`flex-shrink-0 text-xs ${
                          item.category === 'FIBER'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            : ['SWITCH', 'SFP', 'MEDIA_CONVERTER', 'ROUTER'].includes(item.category)
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 pl-12">
                        <div>
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.totalQuantity}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{unitLabel}</span>
                        </div>
                        {isFiber ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">No serials</span>
                        ) : item.serialNumbers && item.serialNumbers.length > 0 ? (
                          <div className="relative" ref={expandedSerials === item.productId ? serialDropdownRef : null}>
                            <button
                              ref={(el) => serialButtonRefs.current[item.productId] = el}
                              onClick={() => handleSerialDropdownToggle(item.productId)}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                            >
                              <Barcode size={12} />
                              <span className="text-xs font-medium">{item.serialNumbers.length} Serial(s)</span>
                              {expandedSerials === item.productId ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {expandedSerials === item.productId && (
                              <div className="absolute z-[9999] right-0 w-[260px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl bottom-full mb-1">
                                <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-900/20 dark:to-slate-800 rounded-t-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">
                                      {item.modelNumber}
                                    </p>
                                    <button
                                      onClick={() => { setExpandedSerials(null); setSerialSearchTerm(''); }}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded ml-2"
                                    >
                                      <X size={14} className="text-slate-500" />
                                    </button>
                                  </div>
                                  <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      ref={serialSearchInputRef}
                                      type="text"
                                      value={serialSearchTerm}
                                      onChange={(e) => setSerialSearchTerm(e.target.value)}
                                      placeholder="Type to search..."
                                      className="w-full pl-8 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    {serialSearchTerm && (
                                      <button
                                        onClick={() => setSerialSearchTerm('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                      >
                                        <X size={12} className="text-slate-400" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {(() => {
                                  const filteredSerials = filterSerialNumbers(item.serialNumbers, serialSearchTerm);
                                  const totalCount = item.serialNumbers.length;
                                  const filteredCount = filteredSerials.length;
                                  return (
                                    <>
                                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          {serialSearchTerm ? (
                                            <span>Found <span className="font-bold text-emerald-600">{filteredCount}</span> of {totalCount}</span>
                                          ) : (
                                            <span>Total: <span className="font-bold">{totalCount}</span> serials</span>
                                          )}
                                        </p>
                                      </div>
                                      <div className="h-[180px] overflow-y-auto">
                                        {filteredCount === 0 ? (
                                          <div className="px-3 py-6 text-center">
                                            <Search size={18} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">No matches</p>
                                          </div>
                                        ) : (
                                          <div className="p-1">
                                            {filteredSerials.map((serial, idx) => {
                                              const searchLower = serialSearchTerm.toLowerCase();
                                              const serialLower = serial.toLowerCase();
                                              const matchIndex = serialLower.indexOf(searchLower);
                                              const originalIndex = item.serialNumbers.indexOf(serial) + 1;
                                              return (
                                                <div key={idx} className="px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded flex items-center gap-2">
                                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 w-5 text-right font-medium">{originalIndex}.</span>
                                                  <span className="font-mono text-xs">
                                                    {serialSearchTerm && matchIndex !== -1 ? (
                                                      <>{serial.substring(0, matchIndex)}<span className="bg-yellow-300 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-0.5 rounded font-semibold">{serial.substring(matchIndex, matchIndex + serialSearchTerm.length)}</span>{serial.substring(matchIndex + serialSearchTerm.length)}</>
                                                    ) : serial}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">No serials</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <DataTable
                columns={[
                  {
                    key: 'product',
                    label: 'Product',
                    render: (item) => {
                      const isFiber = item.category === 'FIBER' || item.unit === 'mtrs';
                      return (
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isFiber
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            <Package className={`h-5 w-5 ${
                              isFiber
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`} />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.modelNumber}</span>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'category',
                    label: 'Category',
                    render: (item) => (
                      <Badge className={`${
                        item.category === 'FIBER'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : ['SWITCH', 'SFP', 'MEDIA_CONVERTER', 'ROUTER'].includes(item.category)
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {getCategoryLabel(item.category)}
                      </Badge>
                    )
                  },
                  {
                    key: 'brand',
                    label: 'Brand',
                    render: (item) => (
                      <span className="text-slate-700 dark:text-slate-300">{item.brandName}</span>
                    )
                  },
                  {
                    key: 'quantity',
                    label: 'Qty / Mtrs',
                    render: (item) => {
                      const isFiber = item.category === 'FIBER' || item.unit === 'mtrs';
                      const unitLabel = isFiber ? 'mtrs' : 'pcs';
                      return (
                        <>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.totalQuantity}</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{unitLabel}</span>
                        </>
                      );
                    }
                  },
                  {
                    key: 'serials',
                    label: 'Serial Numbers',
                    render: (item) => {
                      const isFiber = item.category === 'FIBER' || item.unit === 'mtrs';
                      if (isFiber) {
                        return <span className="text-sm text-slate-400 dark:text-slate-500 italic">N/A</span>;
                      }
                      if (!item.serialNumbers || item.serialNumbers.length === 0) {
                        return <span className="text-sm text-slate-400 dark:text-slate-500 italic">No serials</span>;
                      }
                      return (
                        <div className="relative" ref={expandedSerials === item.productId ? serialDropdownRef : null}>
                          <button
                            ref={(el) => serialButtonRefs.current[item.productId] = el}
                            onClick={() => handleSerialDropdownToggle(item.productId)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          >
                            <Barcode size={14} />
                            <span className="text-sm font-medium">{item.serialNumbers.length} Serial(s)</span>
                            {expandedSerials === item.productId ? (
                              dropDirection === 'up' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                            ) : (
                              dropDirection === 'up' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            )}
                          </button>
                          {expandedSerials === item.productId && (
                            <div className={`absolute z-[9999] right-0 w-[280px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl ${
                              dropDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
                            }`}>
                              <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-900/20 dark:to-slate-800 rounded-t-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">
                                    {item.modelNumber}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setExpandedSerials(null);
                                      setSerialSearchTerm('');
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded ml-2"
                                  >
                                    <X size={14} className="text-slate-500" />
                                  </button>
                                </div>
                                <div className="relative">
                                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    ref={serialSearchInputRef}
                                    type="text"
                                    value={serialSearchTerm}
                                    onChange={(e) => setSerialSearchTerm(e.target.value)}
                                    placeholder="Type to search..."
                                    className="w-full pl-8 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                  />
                                  {serialSearchTerm && (
                                    <button
                                      onClick={() => setSerialSearchTerm('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                    >
                                      <X size={12} className="text-slate-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {(() => {
                                const filteredSerials = filterSerialNumbers(item.serialNumbers, serialSearchTerm);
                                const totalCount = item.serialNumbers.length;
                                const filteredCount = filteredSerials.length;
                                return (
                                  <>
                                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {serialSearchTerm ? (
                                          <span>
                                            Found <span className="font-bold text-emerald-600">{filteredCount}</span> of {totalCount}
                                          </span>
                                        ) : (
                                          <span>Total: <span className="font-bold">{totalCount}</span> serials</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="h-[224px] overflow-y-auto">
                                      {filteredCount === 0 ? (
                                        <div className="px-3 py-8 text-center">
                                          <Search size={20} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                          <p className="text-sm text-slate-500 dark:text-slate-400">No matches found</p>
                                        </div>
                                      ) : (
                                        <div className="p-1">
                                          {filteredSerials.map((serial, idx) => {
                                            const searchLower = serialSearchTerm.toLowerCase();
                                            const serialLower = serial.toLowerCase();
                                            const matchIndex = serialLower.indexOf(searchLower);
                                            const originalIndex = item.serialNumbers.indexOf(serial) + 1;
                                            return (
                                              <div
                                                key={idx}
                                                className="px-2 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded flex items-center gap-2"
                                              >
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 w-6 text-right font-medium">
                                                  {originalIndex}.
                                                </span>
                                                <span className="font-mono text-xs">
                                                  {serialSearchTerm && matchIndex !== -1 ? (
                                                    <>
                                                      {serial.substring(0, matchIndex)}
                                                      <span className="bg-yellow-300 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-0.5 rounded font-semibold">
                                                        {serial.substring(matchIndex, matchIndex + serialSearchTerm.length)}
                                                      </span>
                                                      {serial.substring(matchIndex + serialSearchTerm.length)}
                                                    </>
                                                  ) : (
                                                    serial
                                                  )}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    }
                  }
                ]}
                data={filteredInventory}
                loading={false}
                emptyMessage="No products in store"
                emptyIcon={Package}
                pagination={filteredInventory.length > 10}
                defaultPageSize={10}
                className="hidden lg:block"
              />
        </>
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isAdding && setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Material to Inventory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct entry without a purchase order</p>
              </div>
              <button onClick={() => !isAdding && setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Product selector */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Product <span className="text-red-500">*</span>
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by model, brand, category..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded">
                  {products.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No products available</div>
                  ) : (
                    products
                      .filter(p => {
                        if (!productSearch) return true;
                        const q = productSearch.toLowerCase();
                        return p.modelNumber?.toLowerCase().includes(q) ||
                          p.brandName?.toLowerCase().includes(q) ||
                          p.category?.toLowerCase().includes(q);
                      })
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setAddForm(f => ({ ...f, productId: p.id }))}
                          className={`w-full text-left px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            addForm.productId === p.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{p.modelNumber}</p>
                              <p className="text-xs text-slate-500">{p.brandName} • {getCategoryLabel(p.category)}</p>
                            </div>
                            <span className="text-xs text-slate-400">{p.unit}</span>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>

              {/* Conditional: serial or quantity input */}
              {selectedProduct && (
                <>
                  {isBulkProduct ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                        Quantity ({selectedProduct.unit}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={addForm.quantity}
                        onChange={(e) => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                        placeholder={`e.g. 500`}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                        Serial Numbers <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={addForm.serialText}
                        onChange={(e) => setAddForm(f => ({ ...f, serialText: e.target.value }))}
                        rows={5}
                        placeholder="Enter one serial per line (or comma-separated)&#10;SN-001&#10;SN-002&#10;SN-003"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {(() => {
                          const count = addForm.serialText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length;
                          return `${count} serial number${count !== 1 ? 's' : ''} detected`;
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Unit price (optional) */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                      Unit Price (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addForm.unitPrice}
                      onChange={(e) => setAddForm(f => ({ ...f, unitPrice: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isAdding}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAdd}
                disabled={isAdding || !addForm.productId}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isAdding ? (
                  <><Loader2 size={14} className="mr-2 animate-spin" /> Adding...</>
                ) : (
                  <><Plus size={14} className="mr-2" /> Add to Inventory</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
