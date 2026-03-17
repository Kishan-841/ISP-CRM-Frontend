'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendorStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VENDOR_APPROVAL_CATEGORY_CONFIG } from '@/lib/statusConfig';
import { PageHeader } from '@/components/PageHeader';

export default function VendorApprovalPage() {
  const router = useRouter();
  const { user, isAdmin } = useRoleCheck();

  const {
    pendingVendors,
    fetchVendorApprovalQueue,
    approveVendor,
    rejectVendor,
    isLoading
  } = useVendorStore();

  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0 });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingVendor, setRejectingVendor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeFilter, setActiveFilter] = useState('pending');

  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    if (isAdmin) {
      loadQueue();
    }
  }, [user, isAdmin, page, activeFilter]);

  const loadQueue = async () => {
    const result = await fetchVendorApprovalQueue(page, 20, activeFilter);
    if (result.success && result.data) {
      setStats(result.data.stats || { pending: 0, approvedToday: 0, rejectedToday: 0 });
      setPagination(result.data.pagination || { total: 0, totalPages: 1 });
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(prev => prev === filter ? 'pending' : filter);
    setPage(1);
  };

  const handleApprove = async (vendorId) => {
    setProcessingId(vendorId);
    const result = await approveVendor(vendorId);
    if (result.success) {
      toast.success(result.message || 'Vendor approved');
      loadQueue();
    } else {
      toast.error(result.error || 'Failed to approve vendor');
    }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessingId(rejectingVendor.id);
    const result = await rejectVendor(rejectingVendor.id, rejectReason.trim());
    if (result.success) {
      toast.success(result.message || 'Vendor rejected');
      setShowRejectModal(false);
      setRejectingVendor(null);
      setRejectReason('');
      loadQueue();
    } else {
      toast.error(result.error || 'Failed to reject vendor');
    }
    setProcessingId(null);
  };

  const openRejectModal = (vendor) => {
    setRejectingVendor(vendor);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const CATEGORY_COLORS = Object.fromEntries(
    Object.entries(VENDOR_APPROVAL_CATEGORY_CONFIG).map(([k, v]) => [k, v.color])
  );

  if (!user || !isAdmin) return null;

  const filterTabs = [
    { key: 'pending', label: 'Pending', count: stats.pending, icon: Clock, color: 'amber' },
    { key: 'approved', label: 'Approved Today', count: stats.approvedToday, icon: CheckCircle, color: 'emerald' },
    { key: 'rejected', label: 'Rejected Today', count: stats.rejectedToday, icon: XCircle, color: 'red' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader title="Vendor Approval" description="Review and approve vendors created by the feasibility team" />

      {/* Stats - Clickable Filter Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {filterTabs.map(({ key, label, count, icon: Icon, color }) => (
          <div
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`bg-white dark:bg-slate-900 rounded-xl border p-4 cursor-pointer transition-all ${
              activeFilter === key
                ? `border-${color}-400 dark:border-${color}-600 ring-2 ring-${color}-400/30 shadow-md`
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                activeFilter === key
                  ? `bg-${color}-200 dark:bg-${color}-800/50`
                  : `bg-${color}-100 dark:bg-${color}-900/30`
              }`}>
                <Icon size={20} className={`text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vendor List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-orange-600" />
        </div>
      ) : pendingVendors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          {activeFilter === 'pending' ? (
            <>
              <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No vendors pending approval.</p>
            </>
          ) : activeFilter === 'approved' ? (
            <>
              <CheckCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No approvals today</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No vendors have been approved today.</p>
            </>
          ) : (
            <>
              <XCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No rejections today</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No vendors have been rejected today.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pendingVendors.map(vendor => (
            <div
              key={vendor.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Vendor Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {/* Type Badge */}
                    <Badge variant="outline" className="text-xs">
                      {vendor.vendorType === 'INDIVIDUAL' ? (
                        <><User size={12} className="mr-1" />Individual</>
                      ) : (
                        <><Building2 size={12} className="mr-1" />Company</>
                      )}
                    </Badge>
                    {/* Category Badge */}
                    <Badge className={`text-xs ${CATEGORY_COLORS[vendor.category] || CATEGORY_COLORS.OTHER}`}>
                      {vendor.category?.replace(/_/g, ' ') || 'N/A'}
                    </Badge>
                    {/* Status Badge for non-pending */}
                    {activeFilter === 'approved' && (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle size={12} className="mr-1" />Approved
                      </Badge>
                    )}
                    {activeFilter === 'rejected' && (
                      <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <XCircle size={12} className="mr-1" />Rejected
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {vendor.vendorType === 'INDIVIDUAL' ? vendor.individualName : vendor.companyName}
                  </h3>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {vendor.contactPerson && (
                      <span className="flex items-center gap-1"><User size={12} />{vendor.contactPerson}</span>
                    )}
                    {vendor.phone && (
                      <span className="flex items-center gap-1"><Phone size={12} />{vendor.phone}</span>
                    )}
                    {vendor.email && (
                      <span className="flex items-center gap-1"><Mail size={12} />{vendor.email}</span>
                    )}
                    {(vendor.city || vendor.state) && (
                      <span className="flex items-center gap-1"><MapPin size={12} />{[vendor.city, vendor.state].filter(Boolean).join(', ')}</span>
                    )}
                  </div>

                  {/* Created For Lead */}
                  {vendor.createdForLead && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                      <span className="font-medium">Created for:</span>{' '}
                      {vendor.createdForLead.campaignData?.company || 'Unknown Lead'}
                    </div>
                  )}

                  {/* CAPEX / OPEX */}
                  {(vendor.estimatedCapex || vendor.estimatedOpex) && (
                    <div className="flex gap-4 mt-2">
                      {vendor.estimatedCapex > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-slate-500 dark:text-slate-400">CAPEX:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            ₹{Number(vendor.estimatedCapex).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {vendor.estimatedOpex > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <TrendingDown size={14} className="text-orange-600 dark:text-orange-400" />
                          <span className="text-slate-500 dark:text-slate-400">OPEX:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            ₹{Number(vendor.estimatedOpex).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rejection reason */}
                  {activeFilter === 'rejected' && vendor.adminRejectionReason && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                      <span className="font-medium">Reason:</span> {vendor.adminRejectionReason}
                    </div>
                  )}

                  {/* Created By & Date */}
                  <div className="flex gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {vendor.createdBy && (
                      <span>By: {vendor.createdBy.name}</span>
                    )}
                    <span>{new Date(vendor.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {activeFilter === 'approved' && vendor.adminApprovedBy?.name && (
                      <span className="text-emerald-500">Approved by: {vendor.adminApprovedBy.name}</span>
                    )}
                  </div>
                </div>

                {/* Actions - only show for pending */}
                {activeFilter === 'pending' && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      onClick={() => handleApprove(vendor.id)}
                      disabled={processingId === vendor.id}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4"
                      size="sm"
                    >
                      {processingId === vendor.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <><CheckCircle size={16} className="mr-1.5" />Approve</>
                      )}
                    </Button>
                    <Button
                      onClick={() => openRejectModal(vendor)}
                      disabled={processingId === vendor.id}
                      variant="outline"
                      className="flex-1 sm:flex-none border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm px-4"
                      size="sm"
                    >
                      <XCircle size={16} className="mr-1.5" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reject Vendor</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {rejectingVendor.vendorType === 'INDIVIDUAL' ? rejectingVendor.individualName : rejectingVendor.companyName}
                </p>
              </div>
              <button
                onClick={() => { setShowRejectModal(false); setRejectingVendor(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="Why is this vendor being rejected?"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setShowRejectModal(false); setRejectingVendor(null); }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processingId === rejectingVendor.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {processingId === rejectingVendor.id ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <XCircle size={16} className="mr-2" />
                  )}
                  Reject Vendor
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
