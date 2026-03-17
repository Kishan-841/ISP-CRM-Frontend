'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useProductStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

export default function CreateProductPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createProduct, fetchParentProducts, parentProducts } = useProductStore();

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    isSerialized: false,
    status: 'ACTIVE',
    parentId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchParentProducts();
  }, [fetchParentProducts]);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Redirect if not admin
  if (!isAdmin) {
    router.push('/dashboard/products');
    return null;
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Product title is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    const submitData = {
      title: formData.title,
      code: formData.code || null,
      isSerialized: formData.isSerialized,
      status: formData.status,
      parentId: formData.parentId || null
    };

    const result = await createProduct(submitData);

    if (result.success) {
      router.push('/dashboard/products');
    } else {
      setError(result.error || 'Failed to create product.');
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <Link href="/dashboard/products" className="hover:text-orange-600 dark:hover:text-orange-400">Products</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Create Product</span>
      </div>

      {/* Page Header */}
      <PageHeader title="Create Product" description="Add a new product to the system" />

      {/* Main Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Product Details
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md text-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Product Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">
                Product Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter product title"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Product Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-slate-700 dark:text-slate-300">
                Product Code (SKU)
              </Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="Enter product code (optional)"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Is Serialized */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Product Type
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isSerialized"
                    checked={!formData.isSerialized}
                    onChange={() => handleInputChange('isSerialized', false)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Bulk (Quantity-based)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isSerialized"
                    checked={formData.isSerialized}
                    onChange={() => handleInputChange('isSerialized', true)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Serialized (Serial Number)</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Serialized products (e.g., Switch, SFP) require unique serial numbers. Bulk products (e.g., RF, Closure, Patch Cord) are tracked by quantity only.
              </p>
            </div>

            {/* Parent Product (for sub-products) */}
            <div className="space-y-2">
              <Label htmlFor="parentId" className="text-slate-700 dark:text-slate-300">
                Parent Product
              </Label>
              <select
                id="parentId"
                value={formData.parentId}
                onChange={(e) => handleInputChange('parentId', e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              >
                <option value="">None (Create as Parent Product)</option>
                {parentProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a parent product to create this as a sub-product. Leave empty to create a main product.
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">
                Status
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Product
                  </>
                )}
              </Button>
              <Link href="/dashboard/products">
                <Button type="button" variant="outline" className="border-slate-300 dark:border-slate-600">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
