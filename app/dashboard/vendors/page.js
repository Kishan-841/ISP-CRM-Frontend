'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useVendorStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  Search,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  ShieldCheck,
  Ban,
  Upload,
  ExternalLink,
  LayoutGrid,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import CreateVendorModal from '@/components/CreateVendorModal';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { VENDOR_CATEGORY_CONFIG, VENDOR_APPROVAL_STATUS_CONFIG } from '@/lib/statusConfig';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

const CATEGORY_LABELS = {
  FIBER: 'Fiber',
  COMMISSION: 'Commission',
  CHANNEL_PARTNER: 'Channel Partner',
  THIRD_PARTY: 'Third Party'
};

const CATEGORY_COLORS = Object.fromEntries(
  Object.entries(VENDOR_CATEGORY_CONFIG).map(([k, v]) => [k, v.color])
);

const APPROVAL_STATUS_ICON_MAP = {
  PENDING_ADMIN: Clock,
  PENDING_ACCOUNTS: Clock,
  APPROVED: ShieldCheck,
  REJECTED: Ban,
};

const APPROVAL_STATUS_CONFIG = Object.fromEntries(
  Object.entries(VENDOR_APPROVAL_STATUS_CONFIG).map(([key, val]) => [key, { ...val, icon: APPROVAL_STATUS_ICON_MAP[key] }])
);

export default function VendorsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    vendors,
    stats,
    fetchVendors,
    fetchVendorStats,
    updateVendor,
    deleteVendor,
    approveVendor,
    rejectVendor,
    getVendorById,
    uploadVendorDocs,
    verifyVendorDocs,
    isLoading
  } = useVendorStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [rejectingVendor, setRejectingVendor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(null);
  const [showUploadDocsModal, setShowUploadDocsModal] = useState(false);
  const [uploadingDocsFor, setUploadingDocsFor] = useState(null);
  const [uploadDocsData, setUploadDocsData] = useState({
    panNumber: '', gstNumber: '',
    accountNumber: '', ifscCode: '', accountName: '', bankName: '', branchName: '',
    panDocumentFile: null, gstDocumentFile: null, cancelledChequeFile: null
  });
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);


  // Edit form state
  const [editFormData, setEditFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    category: '',
    isActive: true
  });

  // Mobile pagination
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAccountsTeam = user?.role === 'ACCOUNTS_TEAM';
  const isFeasibilityTeam = user?.role === 'FEASIBILITY_TEAM';
  const hasAccess = isSuperAdmin || isAccountsTeam || isFeasibilityTeam;
  const canCreate = hasAccess;

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !hasAccess) {
      router.push('/dashboard');
    }
  }, [user, hasAccess, router]);

  // Map tab to approvalStatus filter
  const getApprovalFilter = useCallback(() => {
    switch (activeTab) {
      case 'pending_admin': return 'PENDING_ADMIN';
      case 'pending_accounts': return 'PENDING_ACCOUNTS';
      case 'approved': return 'APPROVED';
      case 'rejected': return 'REJECTED';
      default: return undefined;
    }
  }, [activeTab]);

  // Fetch vendors on load and when search/tab changes
  useEffect(() => {
    if (hasAccess) {
      const approvalStatus = getApprovalFilter();
      fetchVendors(searchTerm, undefined, approvalStatus);
      fetchVendorStats();
    }
  }, [hasAccess, searchTerm, activeTab, fetchVendors, fetchVendorStats, getApprovalFilter]);

  // Auto-refresh when socket events arrive
  useSocketRefresh(() => { fetchVendors(searchTerm, undefined, getApprovalFilter()); fetchVendorStats(); }, { enabled: hasAccess });

  // Reset mobile pagination when filter changes
  useEffect(() => {
    setMobilePage(1);
  }, [searchTerm, activeTab]);


  const handleOpenEditModal = (vendor) => {
    setEditingVendor(vendor);
    setEditFormData({
      companyName: vendor.companyName || '',
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      category: vendor.category || '',
      isActive: vendor.isActive
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    if (!editFormData.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setIsSaving(true);
    const result = await updateVendor(editingVendor.id, editFormData);
    if (result.success) {
      toast.success(result.message || 'Vendor updated');
      setShowEditModal(false);
      setEditingVendor(null);
      fetchVendorStats();
    } else {
      toast.error(result.error || 'Failed to update vendor');
    }
    setIsSaving(false);
  };

  const handleViewVendor = async (vendor) => {
    const result = await getVendorById(vendor.id);
    if (result.success) {
      setSelectedVendor(result.vendor);
      setShowViewModal(true);
    } else {
      setSelectedVendor(vendor);
      setShowViewModal(true);
    }
  };

  const handleDelete = async (vendor) => {
    if (!confirm(`Are you sure you want to delete "${vendor.companyName}"?`)) return;
    const result = await deleteVendor(vendor.id);
    if (result.success) {
      toast.success('Vendor deleted');
      fetchVendorStats();
    } else {
      toast.error(result.error || 'Failed to delete vendor');
    }
  };

  const handleApprove = async (vendor) => {
    setIsApproving(vendor.id);
    const result = await approveVendor(vendor.id);
    if (result.success) {
      toast.success(result.message || 'Vendor approved');
      const approvalStatus = getApprovalFilter();
      fetchVendors(searchTerm, undefined, approvalStatus);
      fetchVendorStats();
    } else {
      toast.error(result.error || 'Failed to approve vendor');
    }
    setIsApproving(null);
  };

  const handleOpenRejectModal = (vendor) => {
    setRejectingVendor(vendor);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setIsSaving(true);
    const result = await rejectVendor(rejectingVendor.id, rejectReason);
    if (result.success) {
      toast.success(result.message || 'Vendor rejected');
      setShowRejectModal(false);
      setRejectingVendor(null);
      const approvalStatus = getApprovalFilter();
      fetchVendors(searchTerm, undefined, approvalStatus);
      fetchVendorStats();
    } else {
      toast.error(result.error || 'Failed to reject vendor');
    }
    setIsSaving(false);
  };

  const canApproveVendor = (vendor) => {
    if (isSuperAdmin && vendor.approvalStatus === 'PENDING_ADMIN') return true;
    return false;
  };

  const canRejectVendor = (vendor) => canApproveVendor(vendor);

  // Can upload docs: vendor is admin-approved (PENDING_ACCOUNTS) or fully approved, docs pending/rejected, user is creator or admin/feasibility
  const canUploadDocs = (vendor) => {
    if (vendor.docsStatus !== 'PENDING' && vendor.docsStatus !== 'REJECTED') return false;
    if (vendor.approvalStatus !== 'PENDING_ACCOUNTS' && vendor.approvalStatus !== 'APPROVED') return false;
    if (isSuperAdmin || isFeasibilityTeam) return true;
    return vendor.createdById === user?.id;
  };

  const openUploadDocsModal = (vendor) => {
    setUploadingDocsFor(vendor);
    setUploadDocsData({
      panNumber: vendor.panNumber || '', gstNumber: vendor.gstNumber || '',
      accountNumber: '', ifscCode: '', accountName: '', bankName: '', branchName: '',
      panDocumentFile: null, gstDocumentFile: null, cancelledChequeFile: null
    });
    setShowUploadDocsModal(true);
  };

  const handleUploadDocs = async () => {
    if (!uploadDocsData.panNumber.trim()) { toast.error('PAN Number is required'); return; }
    if (!uploadDocsData.accountName.trim()) { toast.error('Account Name is required'); return; }
    if (!uploadDocsData.accountNumber.trim()) { toast.error('Account Number is required'); return; }
    if (!uploadDocsData.ifscCode.trim()) { toast.error('IFSC Code is required'); return; }
    if (!uploadDocsData.bankName.trim()) { toast.error('Bank Name is required'); return; }
    if (!uploadDocsData.branchName.trim()) { toast.error('Branch Name is required'); return; }
    setIsUploadingDocs(true);
    const result = await uploadVendorDocs(uploadingDocsFor.id, uploadDocsData);
    if (result.success) {
      toast.success(result.message || 'Documents uploaded successfully');
      setShowUploadDocsModal(false);
      setUploadingDocsFor(null);
      fetchVendors(searchTerm, undefined, getApprovalFilter());
    } else {
      toast.error(result.error || 'Failed to upload documents');
    }
    setIsUploadingDocs(false);
  };

  // Can verify docs: accounts team or admin, vendor docs are uploaded
  const canVerifyDocs = (vendor) => {
    if (vendor.docsStatus !== 'UPLOADED') return false;
    if (isSuperAdmin || isAccountsTeam) return true;
    return false;
  };

  const [verifyingDocsId, setVerifyingDocsId] = useState(null);
  const [showRejectDocsModal, setShowRejectDocsModal] = useState(false);
  const [rejectDocsVendor, setRejectDocsVendor] = useState(null);
  const [rejectDocsReason, setRejectDocsReason] = useState('');

  const handleVerifyDocs = async (vendorId) => {
    setVerifyingDocsId(vendorId);
    const result = await verifyVendorDocs(vendorId, 'VERIFIED');
    if (result.success) {
      toast.success(result.message || 'Vendor documents verified and approved');
      fetchVendors(searchTerm, undefined, getApprovalFilter());
      fetchVendorStats();
    } else {
      toast.error(result.error || 'Failed to verify documents');
    }
    setVerifyingDocsId(null);
  };

  const handleRejectDocs = async () => {
    if (!rejectDocsReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setVerifyingDocsId(rejectDocsVendor.id);
    const result = await verifyVendorDocs(rejectDocsVendor.id, 'REJECTED', rejectDocsReason.trim());
    if (result.success) {
      toast.success(result.message || 'Vendor documents rejected');
      setShowRejectDocsModal(false);
      setRejectDocsVendor(null);
      setRejectDocsReason('');
      fetchVendors(searchTerm, undefined, getApprovalFilter());
      fetchVendorStats();
    } else {
      toast.error(result.error || 'Failed to reject documents');
    }
    setVerifyingDocsId(null);
  };

  useModal(showEditModal, () => {
    if (!isSaving) { setShowEditModal(false); setEditingVendor(null); }
  });
  useModal(showViewModal, () => setShowViewModal(false));
  useModal(showRejectModal, () => {
    if (!isSaving) { setShowRejectModal(false); setRejectingVendor(null); }
  });
  useModal(showUploadDocsModal, () => {
    if (!isUploadingDocs) { setShowUploadDocsModal(false); setUploadingDocsFor(null); }
  });
  useModal(showRejectDocsModal, () => {
    if (!verifyingDocsId) { setShowRejectDocsModal(false); setRejectDocsVendor(null); }
  });

  // Mobile pagination
  const mobileTotalPages = Math.ceil((vendors?.length || 0) / mobilePageSize);
  const mobileStartIndex = (mobilePage - 1) * mobilePageSize;
  const mobileEndIndex = mobileStartIndex + mobilePageSize;
  const mobilePaginatedVendors = vendors?.slice(mobileStartIndex, mobileEndIndex) || [];

  // Add serial number for DataTable (preserves global numbering across pages)
  const vendorsWithIndex = (vendors || []).map((v, i) => ({ ...v, _sno: i + 1 }));

  if (!hasAccess) return null;

  const tabs = [
    { key: 'all', label: 'All', count: stats.total, icon: LayoutGrid, color: 'orange' },
    { key: 'pending_admin', label: 'Pending Admin', count: stats.pendingAdmin, icon: Clock, color: 'yellow' },
    { key: 'pending_accounts', label: 'Pending Accounts', count: stats.pendingAccounts, icon: Clock, color: 'orange' },
    { key: 'approved', label: 'Approved', count: stats.approved, icon: ShieldCheck, color: 'emerald' },
    { key: 'rejected', label: 'Rejected', count: stats.rejected, icon: Ban, color: 'red' },
  ];

  const getActiveTabClasses = (color) => {
    switch (color) {
      case 'orange': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-300 dark:ring-orange-700';
      case 'yellow': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-300 dark:ring-yellow-700';
      case 'orange': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-300 dark:ring-orange-700';
      case 'emerald': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-300 dark:ring-emerald-700';
      case 'red': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-300 dark:ring-red-700';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getActiveBadgeClasses = (color) => {
    switch (color) {
      case 'orange': return 'bg-orange-200 dark:bg-orange-800';
      case 'yellow': return 'bg-yellow-200 dark:bg-yellow-800';
      case 'orange': return 'bg-orange-200 dark:bg-orange-800';
      case 'emerald': return 'bg-emerald-200 dark:bg-emerald-800';
      case 'red': return 'bg-red-200 dark:bg-red-800';
      default: return 'bg-slate-200 dark:bg-slate-700';
    }
  };

  // Common input class
  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Vendors" description="Manage vendor creation and approval workflow">
        {canCreate && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            size="sm"
          >
            <Plus size={16} />
            Create Vendor
          </Button>
        )}
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="orange" icon={Clock} label="Pending Admin" value={stats.pendingAdmin || 0} />
        <StatCard color="blue" icon={Clock} label="Pending Accounts" value={stats.pendingAccounts || 0} />
        <StatCard color="emerald" icon={ShieldCheck} label="Approved" value={stats.approved || 0} />
        <StatCard color="red" icon={Ban} label="Rejected" value={stats.rejected || 0} />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.key,
          label: tab.label,
          count: tab.count,
          icon: tab.icon,
          variant: tab.key === 'approved' ? 'success' : tab.key === 'rejected' ? 'danger' : tab.key === 'pending_admin' || tab.key === 'pending_accounts' ? 'warning' : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-64 md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, contact, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          />
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {vendors?.length || 0} vendor{(vendors?.length || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Desktop Table */}
      <DataTable
        columns={[
          {
            key: 'sno',
            label: 'S.No',
            render: (row) => (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {row._sno}
              </span>
            ),
          },
          {
            key: 'company',
            label: 'Company',
            render: (row) => (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{row.companyName}</p>
                  {row.gstNumber && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">GST: {row.gstNumber}</p>
                  )}
                  {(row.approvalStatus === 'PENDING_ACCOUNTS' || row.approvalStatus === 'APPROVED') && row.docsStatus === 'PENDING' && row.leads?.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} className="flex-shrink-0" />
                      Please upload documents — lead &quot;{row.leads[0].campaignData?.company}&quot; has reached accounts verification.
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'contact',
            label: 'Contact',
            render: (row) => (
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{row.contactPerson || '-'}</p>
                {row.phone && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone size={10} />
                    {row.phone}
                  </p>
                )}
                {row.email && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Mail size={10} />
                    {row.email}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'category',
            label: 'Category',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => row.category ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[row.category] || ''}`}>
                {CATEGORY_LABELS[row.category] || row.category}
              </span>
            ) : (
              <span className="text-slate-400 text-sm">-</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => {
              const statusConfig = APPROVAL_STATUS_CONFIG[row.approvalStatus] || APPROVAL_STATUS_CONFIG.PENDING_ADMIN;
              const StatusIcon = statusConfig.icon;
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                  <StatusIcon size={12} />
                  {statusConfig.label}
                </span>
              );
            },
          },
          {
            key: 'created',
            label: 'Created',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => (
              <div>
                <p className="text-sm text-slate-900 dark:text-white">
                  {new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {row.createdBy?.name || 'Unknown'}
                </p>
              </div>
            ),
          },
        ]}
        data={vendorsWithIndex}
        loading={isLoading}
        pagination={true}
        defaultPageSize={10}
        emptyMessage="No vendors in this category yet"
        emptyIcon={Building2}
        emptyFilteredMessage="Try a different search term"
        className="hidden lg:block"
        actions={(vendor) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => handleViewVendor(vendor)}
              className="p-1.5 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
              title="View Details"
            >
              <Eye size={16} />
            </button>
            {canApproveVendor(vendor) && (
              <button
                onClick={() => handleApprove(vendor)}
                disabled={isApproving === vendor.id}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                title="Approve"
              >
                {isApproving === vendor.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              </button>
            )}
            {canRejectVendor(vendor) && (
              <button
                onClick={() => handleOpenRejectModal(vendor)}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Reject"
              >
                <XCircle size={16} />
              </button>
            )}
            {canUploadDocs(vendor) && (
              <button
                onClick={() => openUploadDocsModal(vendor)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                title="Upload Documents"
              >
                <Upload size={16} />
              </button>
            )}
            {canVerifyDocs(vendor) && (
              <>
                <button
                  onClick={() => handleVerifyDocs(vendor.id)}
                  disabled={verifyingDocsId === vendor.id}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                  title="Verify Documents"
                >
                  {verifyingDocsId === vendor.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                </button>
                <button
                  onClick={() => { setRejectDocsVendor(vendor); setRejectDocsReason(''); setShowRejectDocsModal(true); }}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Reject Documents"
                >
                  <XCircle size={16} />
                </button>
              </>
            )}
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => handleOpenEditModal(vendor)}
                  className="p-1.5 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(vendor)}
                  className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        )}
      />

      {/* Mobile Card View */}
      <Card className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : mobilePaginatedVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Building2 size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No vendors found</p>
              <p className="text-sm mt-1">
                {searchTerm ? 'Try a different search term' : 'No vendors in this category yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {mobilePaginatedVendors.map((vendor, index) => {
                  const statusConfig = APPROVAL_STATUS_CONFIG[vendor.approvalStatus] || APPROVAL_STATUS_CONFIG.PENDING_ADMIN;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div key={vendor.id} className="p-4">
                      {/* Card Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{vendor.companyName}</p>
                              {vendor.contactPerson && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{vendor.contactPerson}</p>
                              )}
                            </div>
                            <span className="text-xs font-medium text-slate-400 flex-shrink-0">#{mobileStartIndex + index + 1}</span>
                          </div>
                        </div>
                      </div>

                      {/* Docs Warning */}
                      {(vendor.approvalStatus === 'PENDING_ACCOUNTS' || vendor.approvalStatus === 'APPROVED') && vendor.docsStatus === 'PENDING' && vendor.leads?.length > 0 && (
                        <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertCircle size={12} className="flex-shrink-0" />
                            Please upload documents — lead &quot;{vendor.leads[0].campaignData?.company}&quot; has reached accounts verification.
                          </p>
                        </div>
                      )}

                      {/* Card Info */}
                      <div className="space-y-2 mb-3">
                        {vendor.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Phone size={12} className="flex-shrink-0" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Mail size={12} className="flex-shrink-0" />
                            <span className="truncate">{vendor.email}</span>
                          </div>
                        )}
                        {vendor.gstNumber && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">GST: {vendor.gstNumber}</p>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon size={10} />
                          {statusConfig.label}
                        </span>
                        {vendor.category && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[vendor.category] || ''}`}>
                            {CATEGORY_LABELS[vendor.category] || vendor.category}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                          {new Date(vendor.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleViewVendor(vendor)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        {canApproveVendor(vendor) && (
                          <button
                            onClick={() => handleApprove(vendor)}
                            disabled={isApproving === vendor.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                          >
                            {isApproving === vendor.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Approve
                          </button>
                        )}
                        {canRejectVendor(vendor) && (
                          <button
                            onClick={() => handleOpenRejectModal(vendor)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        )}
                        {canUploadDocs(vendor) && (
                          <button
                            onClick={() => openUploadDocsModal(vendor)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          >
                            <Upload size={14} />
                            Upload Docs
                          </button>
                        )}
                        {canVerifyDocs(vendor) && (
                          <>
                            <button
                              onClick={() => handleVerifyDocs(vendor.id)}
                              disabled={verifyingDocsId === vendor.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                            >
                              {verifyingDocsId === vendor.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                              Verify Docs
                            </button>
                            <button
                              onClick={() => { setRejectDocsVendor(vendor); setRejectDocsReason(''); setShowRejectDocsModal(true); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            >
                              <XCircle size={14} />
                              Reject Docs
                            </button>
                          </>
                        )}
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(vendor)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors ml-auto"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(vendor)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Pagination */}
              {mobileTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Showing <span className="font-medium">{mobileStartIndex + 1}</span> to <span className="font-medium">{Math.min(mobileEndIndex, vendors.length)}</span> of <span className="font-medium">{vendors.length}</span> vendors
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMobilePage(p => Math.max(1, p - 1))}
                      disabled={mobilePage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    {Array.from({ length: Math.min(mobileTotalPages, 5) }, (_, i) => {
                      let page;
                      if (mobileTotalPages <= 5) {
                        page = i + 1;
                      } else if (mobilePage <= 3) {
                        page = i + 1;
                      } else if (mobilePage >= mobileTotalPages - 2) {
                        page = mobileTotalPages - 4 + i;
                      } else {
                        page = mobilePage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setMobilePage(page)}
                          className={`h-8 w-8 text-sm rounded-md font-medium transition-colors ${
                            page === mobilePage
                              ? 'bg-orange-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMobilePage(p => Math.min(mobileTotalPages, p + 1))}
                      disabled={mobilePage === mobileTotalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Vendor Modal */}
      <CreateVendorModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          const approvalStatus = getApprovalFilter();
          fetchVendors(searchTerm, undefined, approvalStatus);
          fetchVendorStats();
        }}
      />

      {/* Edit Modal (Admin only) */}
      {showEditModal && editingVendor && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Edit size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Edit Vendor</h2>
              </div>
              <button
                onClick={() => { setShowEditModal(false); setEditingVendor(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEdit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.companyName}
                    onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Person</label>
                  <input
                    type="text"
                    value={editFormData.contactPerson}
                    onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select Category</option>
                    <option value="FIBER">Fiber</option>
                    <option value="COMMISSION">Commission</option>
                    <option value="CHANNEL_PARTNER">Channel Partner</option>
                    <option value="THIRD_PARTY">Third Party</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingVendor(null); }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={isSaving || !editFormData.companyName.trim()}
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Update Vendor'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedVendor && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Building2 size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Vendor Details</h2>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white truncate">
                    {selectedVendor.companyName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${APPROVAL_STATUS_CONFIG[selectedVendor.approvalStatus]?.color || ''}`}>
                      {APPROVAL_STATUS_CONFIG[selectedVendor.approvalStatus]?.label || selectedVendor.approvalStatus}
                    </span>
                    {selectedVendor.category && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedVendor.category] || ''}`}>
                        {CATEGORY_LABELS[selectedVendor.category]}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Contact Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Contact Person</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedVendor.contactPerson || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedVendor.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white break-all">{selectedVendor.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Address</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedVendor.address || '-'}
                        {selectedVendor.city && <>, {selectedVendor.city}</>}
                        {selectedVendor.state && <>, {selectedVendor.state}</>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Documents</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">PAN Number</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">{selectedVendor.panNumber || '-'}</p>
                    {selectedVendor.panDocument && (
                      <a href={selectedVendor.panDocument} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium mt-1">
                        <ExternalLink size={12} /> View Document
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">GST Number</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">{selectedVendor.gstNumber || '-'}</p>
                    {selectedVendor.gstDocument && (
                      <a href={selectedVendor.gstDocument} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium mt-1">
                        <ExternalLink size={12} /> View Document
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              {(selectedVendor.accountNumber || selectedVendor.bankName) && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Bank Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Account Number</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">{selectedVendor.accountNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">IFSC Code</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">{selectedVendor.ifscCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Account Name</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedVendor.accountName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Bank Name</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedVendor.bankName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Branch</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedVendor.branchName || '-'}</p>
                    </div>
                    <div>
                      {selectedVendor.cancelledCheque && (
                        <>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Cancelled Cheque</p>
                          <a href={selectedVendor.cancelledCheque} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium mt-1">
                            <ExternalLink size={12} /> View Document
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Timeline */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Approval Timeline</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Created by <span className="font-medium">{selectedVendor.createdBy?.name || 'Unknown'}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(selectedVendor.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {selectedVendor.adminApprovedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Admin approved by <span className="font-medium">{selectedVendor.adminApprovedBy?.name || 'Unknown'}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(selectedVendor.adminApprovedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedVendor.adminRejectionReason && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Admin rejected: <span className="text-red-600 dark:text-red-400">{selectedVendor.adminRejectionReason}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedVendor.accountsApprovedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Accounts approved by <span className="font-medium">{selectedVendor.accountsApprovedBy?.name || 'Unknown'}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(selectedVendor.accountsApprovedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedVendor.accountsRejectionReason && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Accounts rejected: <span className="text-red-600 dark:text-red-400">{selectedVendor.accountsRejectionReason}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Button
                onClick={() => setShowViewModal(false)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingVendor && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Reject Vendor</h2>
              </div>
              <button
                onClick={() => { setShowRejectModal(false); setRejectingVendor(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You are about to reject <span className="font-semibold text-slate-900 dark:text-white">{rejectingVendor.companyName}</span>. Please provide a reason.
              </p>
              <div>
                <label className={labelClass}>
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder="Provide a reason for rejecting this vendor..."
                />
              </div>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectingVendor(null); }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSaving || !rejectReason.trim()}
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Vendor'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Docs Modal */}
      {showRejectDocsModal && rejectDocsVendor && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Reject Vendor Documents</h2>
              </div>
              <button
                onClick={() => { setShowRejectDocsModal(false); setRejectDocsVendor(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You are about to reject documents for <span className="font-semibold text-slate-900 dark:text-white">{rejectDocsVendor.companyName}</span>. The vendor creator will be notified to re-upload.
              </p>
              <div>
                <label className={labelClass}>
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectDocsReason}
                  onChange={(e) => setRejectDocsReason(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder="Provide a reason for rejecting the documents..."
                />
              </div>
            </div>
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                onClick={() => { setShowRejectDocsModal(false); setRejectDocsVendor(null); }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectDocs}
                disabled={verifyingDocsId || !rejectDocsReason.trim()}
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {verifyingDocsId ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" />Rejecting...</>
                ) : (
                  'Reject Documents'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Documents Modal */}
      {showUploadDocsModal && uploadingDocsFor && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Upload Vendor Documents</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{uploadingDocsFor.companyName || uploadingDocsFor.individualName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setUploadDocsData(prev => ({
                      ...prev,
                      panNumber: 'ABCDE1234F',
                      gstNumber: '27AAECG8392G1Z9',
                      accountName: uploadingDocsFor.companyName || uploadingDocsFor.individualName || 'Test Account',
                      accountNumber: '9876543210123456',
                      ifscCode: 'HDFC0001234',
                      bankName: 'HDFC Bank',
                      branchName: 'Wakad, Pune'
                    }));
                    toast.success('Fields prefilled with test data');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  Prefill
                </button>
                <button
                  onClick={() => { setShowUploadDocsModal(false); setUploadingDocsFor(null); }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Document Uploads */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Documents</p>
                {[
                  { key: 'panDocumentFile', label: 'PAN Document', required: true },
                  { key: 'gstDocumentFile', label: 'GST Certificate', required: false },
                  { key: 'cancelledChequeFile', label: 'Cancelled Cheque', required: true }
                ].map(doc => (
                  <div key={doc.key}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{doc.label} {doc.required ? <span className="text-red-500">*</span> : <span className="text-slate-400 text-xs">(Optional)</span>}</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        <Upload size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {uploadDocsData[doc.key] ? uploadDocsData[doc.key].name : `Upload ${doc.label}`}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadDocsData(prev => ({ ...prev, [doc.key]: e.target.files[0] || null }))}
                          className="hidden"
                        />
                      </label>
                      {uploadDocsData[doc.key] && (
                        <button
                          onClick={() => setUploadDocsData(prev => ({ ...prev, [doc.key]: null }))}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PAN Number <span className="text-red-500">*</span></label>
                  <input type="text" value={uploadDocsData.panNumber}
                    onChange={(e) => setUploadDocsData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" placeholder="ABCDE1234F" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GST Number <span className="text-slate-400 text-xs">(Optional)</span></label>
                  <input type="text" value={uploadDocsData.gstNumber}
                    onChange={(e) => setUploadDocsData(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Bank Details <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Name <span className="text-red-500">*</span></label>
                    <input type="text" value={uploadDocsData.accountName}
                      onChange={(e) => setUploadDocsData(prev => ({ ...prev, accountName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Number <span className="text-red-500">*</span></label>
                    <input type="text" value={uploadDocsData.accountNumber}
                      onChange={(e) => setUploadDocsData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IFSC Code <span className="text-red-500">*</span></label>
                    <input type="text" value={uploadDocsData.ifscCode}
                      onChange={(e) => setUploadDocsData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bank Name <span className="text-red-500">*</span></label>
                    <input type="text" value={uploadDocsData.bankName}
                      onChange={(e) => setUploadDocsData(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Name <span className="text-red-500">*</span></label>
                    <input type="text" value={uploadDocsData.branchName}
                      onChange={(e) => setUploadDocsData(prev => ({ ...prev, branchName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowUploadDocsModal(false); setUploadingDocsFor(null); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleUploadDocs}
                disabled={isUploadingDocs || !uploadDocsData.panNumber.trim() || !uploadDocsData.accountName.trim() || !uploadDocsData.accountNumber.trim() || !uploadDocsData.ifscCode.trim() || !uploadDocsData.bankName.trim() || !uploadDocsData.branchName.trim()}
              >
                {isUploadingDocs ? <><Loader2 size={16} className="animate-spin mr-2" />Uploading...</> : <><Upload size={16} className="mr-2" />Upload Documents</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
