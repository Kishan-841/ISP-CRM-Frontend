'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useComplaintStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  X,
  Loader2,
  Settings,
  Layers,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';

export default function ComplaintCategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    categories,
    fetchAllCategories,
    createCategory,
    updateCategory,
    createSubCategory,
    updateSubCategory,
  } = useComplaintStore();

  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categoryFormActive, setCategoryFormActive] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);

  // Sub-category modal state
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [subCategoryParentId, setSubCategoryParentId] = useState(null);
  const [subCategoryForm, setSubCategoryForm] = useState({ name: '', description: '', defaultTATHours: 24 });
  const [subCategoryFormActive, setSubCategoryFormActive] = useState(true);
  const [savingSubCategory, setSavingSubCategory] = useState(false);

  // Toggle loading for inline status toggles
  const [togglingId, setTogglingId] = useState(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER';

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [user, isSuperAdmin, router]);

  // Fetch categories on mount
  useEffect(() => {
    if (isSuperAdmin) {
      loadCategories();
    }
  }, [isSuperAdmin]);

  const loadCategories = async () => {
    setIsLoading(true);
    await fetchAllCategories();
    setIsLoading(false);
  };

  // Expand/collapse
  const toggleExpand = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // ========== Category Modal ==========
  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setCategoryFormActive(true);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || '' });
    setCategoryFormActive(category.isActive);
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSavingCategory(true);
    let result;
    if (editingCategory) {
      result = await updateCategory(editingCategory.id, {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        isActive: categoryFormActive,
      });
    } else {
      result = await createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
      });
    }
    if (result.success) {
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      closeCategoryModal();
      await fetchAllCategories();
    } else {
      toast.error(result.error || 'Failed to save category');
    }
    setSavingCategory(false);
  };

  // Toggle category active/inactive inline
  const handleToggleCategoryStatus = async (category) => {
    setTogglingId(category.id);
    const result = await updateCategory(category.id, { isActive: !category.isActive });
    if (result.success) {
      toast.success(`Category ${!category.isActive ? 'activated' : 'deactivated'}`);
      await fetchAllCategories();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setTogglingId(null);
  };

  // ========== Sub-Category Modal ==========
  const openCreateSubCategoryModal = (categoryId) => {
    setEditingSubCategory(null);
    setSubCategoryParentId(categoryId);
    setSubCategoryForm({ name: '', description: '', defaultTATHours: 24 });
    setSubCategoryFormActive(true);
    setShowSubCategoryModal(true);
  };

  const openEditSubCategoryModal = (subCategory, categoryId) => {
    setEditingSubCategory(subCategory);
    setSubCategoryParentId(categoryId);
    setSubCategoryForm({
      name: subCategory.name,
      description: subCategory.description || '',
      defaultTATHours: subCategory.defaultTATHours ?? 24,
    });
    setSubCategoryFormActive(subCategory.isActive);
    setShowSubCategoryModal(true);
  };

  const closeSubCategoryModal = () => {
    setShowSubCategoryModal(false);
    setEditingSubCategory(null);
    setSubCategoryParentId(null);
  };

  const handleSaveSubCategory = async (e) => {
    e.preventDefault();
    if (!subCategoryForm.name.trim()) {
      toast.error('Sub-category name is required');
      return;
    }
    if (!subCategoryForm.defaultTATHours || subCategoryForm.defaultTATHours < 1) {
      toast.error('Default TAT must be at least 1 hour');
      return;
    }
    setSavingSubCategory(true);
    let result;
    if (editingSubCategory) {
      result = await updateSubCategory(editingSubCategory.id, {
        name: subCategoryForm.name.trim(),
        description: subCategoryForm.description.trim() || null,
        defaultTATHours: Number(subCategoryForm.defaultTATHours),
        isActive: subCategoryFormActive,
      });
    } else {
      result = await createSubCategory(subCategoryParentId, {
        name: subCategoryForm.name.trim(),
        description: subCategoryForm.description.trim() || null,
        defaultTATHours: Number(subCategoryForm.defaultTATHours),
      });
    }
    if (result.success) {
      toast.success(editingSubCategory ? 'Sub-category updated' : 'Sub-category created');
      closeSubCategoryModal();
      await fetchAllCategories();
    } else {
      toast.error(result.error || 'Failed to save sub-category');
    }
    setSavingSubCategory(false);
  };

  // Toggle sub-category active/inactive inline
  const handleToggleSubCategoryStatus = async (subCategory) => {
    setTogglingId(subCategory.id);
    const result = await updateSubCategory(subCategory.id, { isActive: !subCategory.isActive });
    if (result.success) {
      toast.success(`Sub-category ${!subCategory.isActive ? 'activated' : 'deactivated'}`);
      await fetchAllCategories();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setTogglingId(null);
  };

  // Common input classes
  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Complaint Categories</span>
      </div>

      {/* Header */}
      <PageHeader title="Complaint Categories" description="Manage complaint categories and sub-categories">
        <Button
          onClick={openCreateCategoryModal}
          className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
          size="sm"
        >
          <Plus size={16} />
          Add Category
        </Button>
      </PageHeader>

      {/* Categories List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : !categories || categories.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <Layers size={48} className="mb-4 opacity-40" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No categories yet</p>
            <p className="text-sm mt-1">Create your first complaint category to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const isExpanded = expandedCategories[category.id];
            const complaintCount = category._count?.complaints ?? 0;
            const subCategories = category.subCategories || [];
            const isInactive = !category.isActive;

            return (
              <Card
                key={category.id}
                className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-opacity ${
                  isInactive ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-0">
                  {/* Category Header */}
                  <div
                    className="flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => toggleExpand(category.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                        <Layers size={18} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-slate-900 dark:text-white truncate ${isInactive ? 'line-through' : ''}`}>
                          {category.name}
                        </p>
                        {category.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-3">
                      {/* Complaint count badge */}
                      <Badge
                        variant="outline"
                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-xs"
                      >
                        {complaintCount} complaint{complaintCount !== 1 ? 's' : ''}
                      </Badge>

                      {/* Sub-categories count */}
                      <Badge
                        variant="outline"
                        className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-xs hidden sm:inline-flex"
                      >
                        {subCategories.length} sub
                      </Badge>

                      {/* Active/Inactive toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCategoryStatus(category);
                        }}
                        disabled={togglingId === category.id}
                        className="flex-shrink-0"
                        title={category.isActive ? 'Deactivate category' : 'Activate category'}
                      >
                        {togglingId === category.id ? (
                          <Loader2 size={16} className="animate-spin text-slate-400" />
                        ) : (
                          <Badge
                            variant="outline"
                            className={`cursor-pointer ${
                              category.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                            }`}
                          >
                            {category.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </button>

                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCategoryModal(category);
                        }}
                        className="p-1.5 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                        title="Edit category"
                      >
                        <Edit size={16} />
                      </button>

                      {/* Expand/collapse chevron */}
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded sub-categories section */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800">
                      {subCategories.length === 0 ? (
                        <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                          <AlertTriangle size={24} className="mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No sub-categories yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-max border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <th className="text-left py-2.5 px-4 sm:px-6 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                  Sub-category Name
                                </th>
                                <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                  Default TAT (hrs)
                                </th>
                                <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {subCategories.map((sub) => (
                                <tr
                                  key={sub.id}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                                    !sub.isActive ? 'opacity-50' : ''
                                  }`}
                                >
                                  <td className="py-3 px-4 sm:px-6">
                                    <span
                                      className={`text-sm font-medium text-slate-900 dark:text-white ${
                                        !sub.isActive ? 'line-through text-slate-500 dark:text-slate-400' : ''
                                      }`}
                                    >
                                      {sub.name}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                      {sub.description || '-'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="inline-flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                                      <Clock size={14} className="text-slate-400" />
                                      {sub.defaultTATHours ?? '-'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => handleToggleSubCategoryStatus(sub)}
                                      disabled={togglingId === sub.id}
                                      title={sub.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                      {togglingId === sub.id ? (
                                        <Loader2 size={14} className="animate-spin text-slate-400 mx-auto" />
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className={`cursor-pointer text-xs ${
                                            sub.isActive
                                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                          }`}
                                        >
                                          {sub.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => openEditSubCategoryModal(sub, category.id)}
                                      className="p-1.5 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                                      title="Edit sub-category"
                                    >
                                      <Edit size={15} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add Sub-Category button */}
                      <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCreateSubCategoryModal(category.id)}
                          className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 gap-1.5"
                        >
                          <Plus size={14} />
                          Add Sub-Category
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========== Category Modal ========== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Settings size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h2>
              </div>
              <button
                onClick={closeCategoryModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSaveCategory} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className={labelClass}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Network Issues"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Optional description for this category"
                />
              </div>
              {editingCategory && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFormActive(!categoryFormActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      categoryFormActive ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        categoryFormActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {categoryFormActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                onClick={closeCategoryModal}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCategory}
                disabled={savingCategory || !categoryForm.name.trim()}
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {savingCategory ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : editingCategory ? (
                  'Update Category'
                ) : (
                  'Create Category'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Sub-Category Modal ========== */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Layers size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  {editingSubCategory ? 'Edit Sub-Category' : 'Add Sub-Category'}
                </h2>
              </div>
              <button
                onClick={closeSubCategoryModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSaveSubCategory} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className={labelClass}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subCategoryForm.name}
                  onChange={(e) => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Slow Speed"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={subCategoryForm.description}
                  onChange={(e) => setSubCategoryForm({ ...subCategoryForm, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Default TAT (hours) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={subCategoryForm.defaultTATHours}
                  onChange={(e) => setSubCategoryForm({ ...subCategoryForm, defaultTATHours: e.target.value })}
                  className={inputClass}
                  min={1}
                  placeholder="24"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Turn-around time for resolving complaints of this type
                </p>
              </div>
              {editingSubCategory && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubCategoryFormActive(!subCategoryFormActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      subCategoryFormActive ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        subCategoryFormActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {subCategoryFormActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                onClick={closeSubCategoryModal}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSubCategory}
                disabled={savingSubCategory || !subCategoryForm.name.trim() || !subCategoryForm.defaultTATHours}
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {savingSubCategory ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : editingSubCategory ? (
                  'Update Sub-Category'
                ) : (
                  'Create Sub-Category'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
