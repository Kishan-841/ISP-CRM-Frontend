'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useProductStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { products, isLoading, fetchProducts, deleteProduct, updateProduct } = useProductStore();
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Filters
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [filters, setFilters] = useState({
    title: '',
    status: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (productId, productTitle) => {
    if (!confirm(`Are you sure you want to delete "${productTitle}"?`)) {
      return;
    }
    setDeletingId(productId);
    const result = await deleteProduct(productId);
    setDeletingId(null);
    if (result.success) {
      toast.success('Product deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete product');
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const result = await updateProduct(product.id, { status: newStatus });
    if (result.success) {
      toast.success(`Product ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleEditStart = (product) => {
    setEditingId(product.id);
    setEditTitle(product.title);
  };

  const handleEditSave = async (productId) => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    const result = await updateProduct(productId, { title: editTitle.trim() });
    if (result.success) {
      setEditingId(null);
      setEditTitle('');
      toast.success('Product updated successfully');
    } else {
      toast.error(result.error || 'Failed to update product');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'INACTIVE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  // Organize products into hierarchy (parents first with children)
  const organizedProducts = () => {
    // Separate parent and child products
    const parents = products.filter(p => !p.parentId);
    const children = products.filter(p => p.parentId);

    // Create a map of children by parentId
    const childrenByParent = children.reduce((acc, child) => {
      if (!acc[child.parentId]) acc[child.parentId] = [];
      acc[child.parentId].push(child);
      return acc;
    }, {});

    // Build hierarchical list: parent followed by its children
    const hierarchical = [];
    parents.forEach(parent => {
      hierarchical.push({ ...parent, isParent: true });
      if (childrenByParent[parent.id]) {
        childrenByParent[parent.id].forEach(child => {
          hierarchical.push({ ...child, isChild: true });
        });
      }
    });

    // Add any orphaned children (parent was deleted)
    children.forEach(child => {
      if (!parents.find(p => p.id === child.parentId)) {
        hierarchical.push({ ...child, isChild: true, orphaned: true });
      }
    });

    return hierarchical;
  };

  // Apply filters
  const filteredProducts = organizedProducts().filter((p) => {
    if (filters.title && !p.title?.toLowerCase().includes(filters.title.toLowerCase())) return false;
    if (filters.status && !p.status?.toLowerCase().includes(filters.status.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Products</span>
      </div>

      {/* Page Header */}
      <PageHeader title="Products">
        {isAdmin && (
          <Link href="/dashboard/products/create">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Product
            </Button>
          </Link>
        )}
      </PageHeader>

      {/* Main Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Product List
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {/* Entries Control */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="h-9 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-slate-600 dark:text-slate-400">entries</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-max border-collapse">
                <thead>
                  {/* Column Headers */}
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 dark:border-slate-700">Sr. No.</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 dark:border-slate-700">Title</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 dark:border-slate-700">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 dark:border-slate-700">Sub-Products</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 dark:border-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 dark:border-slate-700">Created At</th>
                    {isAdmin && (
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Action</th>
                    )}
                  </tr>
                  {/* Filter Row */}
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-2 px-4 border-r border-slate-200 dark:border-slate-700"></th>
                    <th className="py-2 px-4 border-r border-slate-200 dark:border-slate-700">
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={filters.title}
                        onChange={(e) => handleFilterChange('title', e.target.value)}
                        className="h-8 text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </th>
                    <th className="py-2 px-4 border-r border-slate-200 dark:border-slate-700"></th>
                    <th className="py-2 px-4 border-r border-slate-200 dark:border-slate-700"></th>
                    <th className="py-2 px-4 border-r border-slate-200 dark:border-slate-700">
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="h-8 text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </th>
                    <th className="py-2 px-4 border-r border-slate-200 dark:border-slate-700"></th>
                    {isAdmin && <th className="py-2 px-4"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.slice(0, entriesPerPage).map((product, index) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          product.isChild ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-slate-900 dark:text-slate-100 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">{index + 1}</td>
                        <td className="py-4 px-4 text-slate-900 dark:text-slate-100 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                          {editingId === product.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-8 text-sm bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-48"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleEditSave(product.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleEditCancel}
                                className="h-8 px-2 border-slate-300 dark:border-slate-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {product.isChild && (
                                <span className="text-slate-400 dark:text-slate-500 mr-1">└─</span>
                              )}
                              <span className={product.isChild ? 'text-slate-700 dark:text-slate-300' : 'font-medium'}>
                                {product.title}
                              </span>
                              {product.parent && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  (under {product.parent.title})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                          {product.isChild ? (
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                              Sub-Product
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                              Parent
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                          {product._count?.children > 0 ? (
                            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                              {product._count.children} sub-product{product._count.children !== 1 ? 's' : ''}
                            </span>
                          ) : product.isChild ? (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">None</span>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                          {isAdmin ? (
                            <button
                              onClick={() => handleToggleStatus(product)}
                              className="cursor-pointer"
                              title="Click to toggle status"
                            >
                              <Badge variant="outline" className={getStatusColor(product.status)}>
                                {product.status}
                              </Badge>
                            </button>
                          ) : (
                            <Badge variant="outline" className={getStatusColor(product.status)}>
                              {product.status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                          {formatDate(product.createdAt)}
                        </td>
                        {isAdmin && (
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* Edit Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStart(product)}
                                disabled={editingId === product.id}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(product.id, product.title)}
                                disabled={deletingId === product.id || (product._count?.children > 0)}
                                title={product._count?.children > 0 ? 'Cannot delete: has sub-products' : 'Delete product'}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 disabled:opacity-50"
                              >
                                {deletingId === product.id ? (
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Info */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
            Showing 1 to {Math.min(entriesPerPage, filteredProducts.length)} of {filteredProducts.length} results
          </div>
        </CardContent>
      </Card>
    </>
  );
}
