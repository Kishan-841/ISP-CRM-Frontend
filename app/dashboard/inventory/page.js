'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useInventoryStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    items,
    stats,
    fetchItems,
    fetchStats,
    createItem,
    updateItem,
    updateQuantity,
    deleteItem,
    isLoading
  } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    quantity: 0,
    unit: 'pcs',
    minStock: 0
  });

  // Product name options with their categories
  const productTypes = ['Switch', 'SFP', 'Closure', 'Patch Cord', 'RF', 'Fiber'];

  // Category options based on product type
  const categoryOptions = {
    'Switch': ['1G', '10G'],
    'SFP': ['1G', '10G'],
    'Closure': ['2 way', '4 way'],
    'Patch Cord': ['LC/LC', 'SC/LC', 'SC/SC']
  };

  // Quantity adjustment state
  const [quantityAdjustment, setQuantityAdjustment] = useState(0);

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isStoreManager = user?.role === 'STORE_MANAGER';
  const canAccess = isAdmin || isStoreManager;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showModal, () => !isSaving && handleCloseModal());
  useModal(showQuantityModal, () => setShowQuantityModal(false));

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, canAccess, router]);

  // Fetch items on load and when search/filter changes
  useEffect(() => {
    if (canAccess) {
      const isActive = filterStatus === 'all' ? undefined : filterStatus === 'active';
      fetchItems(searchTerm, isActive);
      fetchStats();
    }
  }, [isAdmin, searchTerm, filterStatus, fetchItems, fetchStats]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      quantity: 0,
      unit: 'pcs',
      minStock: 0
    });
    setEditingItem(null);
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        category: item.category || '',
        description: item.description || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'pcs',
        minStock: item.minStock || 0
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleOpenQuantityModal = (item) => {
    setSelectedItem(item);
    setQuantityAdjustment(0);
    setShowQuantityModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    setIsSaving(true);

    let result;
    if (editingItem) {
      result = await updateItem(editingItem.id, formData);
    } else {
      result = await createItem(formData);
    }

    if (result.success) {
      toast.success(result.message || (editingItem ? 'Item updated' : 'Item created'));
      handleCloseModal();
      fetchStats();
    } else {
      toast.error(result.error || 'Failed to save item');
    }

    setIsSaving(false);
  };

  const handleQuantityAdjust = async () => {
    if (quantityAdjustment === 0) {
      toast.error('Please enter an adjustment value');
      return;
    }

    const result = await updateQuantity(selectedItem.id, quantityAdjustment);
    if (result.success) {
      toast.success(result.message || 'Quantity updated');
      setShowQuantityModal(false);
      fetchStats();
    } else {
      toast.error(result.error || 'Failed to update quantity');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    const result = await deleteItem(item.id);
    if (result.success) {
      toast.success('Item deleted');
      fetchStats();
    } else {
      toast.error(result.error || 'Failed to delete item');
    }
  };

  const handleToggleActive = async (item) => {
    const result = await updateItem(item.id, { isActive: !item.isActive });
    if (result.success) {
      toast.success(item.isActive ? 'Item deactivated' : 'Item activated');
      fetchStats();
    } else {
      toast.error(result.error || 'Failed to update item');
    }
  };

  // Common units for dropdown
  const unitOptions = ['pcs', 'mtrs'];

  if (!canAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Inventory Management" description="Manage your products and stock levels">
        <Button
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.lowStock}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <XCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.inactive}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        title="Products"
        totalCount={items?.length || 0}
        columns={[
          {
            key: 'name',
            label: 'Product',
            render: (row) => (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
                  {row.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {row.description}
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'category',
            label: 'Category',
            render: (row) => row.category ? (
              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {row.category}
              </Badge>
            ) : (
              <span className="text-slate-400">-</span>
            ),
          },
          {
            key: 'quantity',
            label: 'Quantity',
            render: (row) => {
              const isLowStock = row.quantity <= row.minStock;
              return (
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      isLowStock
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {row.quantity}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{row.unit}</span>
                    {isLowStock && (
                      <AlertTriangle size={16} className="text-amber-500" title="Low stock" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Min: {row.minStock} {row.unit}
                  </p>
                </div>
              );
            },
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <Badge className={
                row.isActive
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }>
                {row.isActive ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
        ]}
        data={items || []}
        searchable
        searchPlaceholder="Search products..."
        onSearch={(value) => setSearchTerm(value)}
        filters={
          <div className="flex items-center gap-2">
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === status
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        }
        pagination
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage={searchTerm ? 'Try a different search term' : 'Add your first product to get started'}
        emptyIcon={Package}
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenQuantityModal(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Adjust Quantity"
            >
              <Package size={18} />
            </button>
            <button
              onClick={() => handleOpenModal(row)}
              className="p-2 text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => handleToggleActive(row)}
              className={`p-2 rounded-lg transition-colors ${
                row.isActive
                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
              }`}
              title={row.isActive ? 'Deactivate' : 'Activate'}
            >
              {row.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value, category: '' })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  >
                    <option value="">Select Product</option>
                    {productTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category {categoryOptions[formData.name] && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={!categoryOptions[formData.name]}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{categoryOptions[formData.name] ? 'Select Category' : 'N/A'}</option>
                    {categoryOptions[formData.name]?.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  >
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  />
                </div>
              </div>
            </form>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                type="button"
                onClick={handleCloseModal}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  editingItem ? 'Update Product' : 'Add Product'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Adjustment Modal */}
      {showQuantityModal && selectedItem && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Adjust Quantity
              </h2>
              <button
                onClick={() => setShowQuantityModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center">
                <p className="font-medium text-slate-900 dark:text-slate-100">{selectedItem.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Current: <span className="font-semibold">{selectedItem.quantity} {selectedItem.unit}</span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setQuantityAdjustment(q => q - 1)}
                  className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  value={quantityAdjustment}
                  onChange={(e) => setQuantityAdjustment(parseInt(e.target.value) || 0)}
                  className="w-24 px-4 py-2 text-center text-lg font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                />
                <button
                  onClick={() => setQuantityAdjustment(q => q + 1)}
                  className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  New quantity:{' '}
                  <span className={`font-semibold ${
                    (selectedItem.quantity + quantityAdjustment) < 0
                      ? 'text-red-600'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {selectedItem.quantity + quantityAdjustment} {selectedItem.unit}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                type="button"
                onClick={() => setShowQuantityModal(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuantityAdjust}
                disabled={quantityAdjustment === 0 || (selectedItem.quantity + quantityAdjustment) < 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Update Quantity
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
