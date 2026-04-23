'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  User,
  MapPin,
  Clock,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Eye,
  ExternalLink as OpenLink,
  File,
  Image as ImageIcon,
  AlertCircle,
  History,
  DollarSign,
  Wifi,
  Network,
  Hash,
  ArrowUp,
  ArrowDown,
  ClipboardCheck
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';
import { formatCurrency } from '@/lib/formatters';
import TabBar from '@/components/TabBar';

// Helper to get documents as array from object or array format
const getDocumentsArray = (documents) => {
  if (!documents) return [];
  if (Array.isArray(documents)) return documents;
  return Object.values(documents);
};

const getDocumentsCount = (documents) => {
  if (!documents) return 0;
  if (Array.isArray(documents)) return documents.length;
  return Object.keys(documents).length;
};

// Parse feasibility notes from JSON
const parseFeasibilityData = (lead) => {
  // New simplified flow: direct columns on Lead
  if (lead?.feasibilityVendorType || lead?.tentativeCapex != null || lead?.tentativeOpex != null) {
    return {
      vendorType: lead.feasibilityVendorType,
      vendorDetails: {
        capex: lead.tentativeCapex,
        opex: lead.tentativeOpex,
      },
      additionalNotes: lead.feasibilityDescription || lead.feasibilityNotes || null,
    };
  }
  // Legacy: JSON-encoded vendor details in feasibilityNotes
  if (!lead?.feasibilityNotes) return null;
  try {
    const data = JSON.parse(lead.feasibilityNotes);
    return data;
  } catch {
    return { additionalNotes: lead.feasibilityNotes };
  }
};

// Get vendor type label
const getVendorTypeLabel = (vendorType) => {
  const labels = {
    ownNetwork: 'Own Network',
    fiberVendor: 'Fiber Vendor',
    commissionVendor: 'Commission Vendor',
    thirdParty: 'Third Party',
    telco: 'Telco'
  };
  return labels[vendorType] || vendorType;
};

export default function OpsApprovalPage() {
  const router = useRouter();
  const { user, isOpsTeam: _isOpsTeam, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const isOpsTeam = isMaster ? true : _isOpsTeam;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const {
    opsQueue,
    opsStats,
    fetchOpsQueue,
    opsTeamDisposition,
    isLoading,
    opsReviewHistory,
    opsReviewCounts,
    fetchOpsReviewHistory
  } = useLeadStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('pending');

  // Disposition state
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  // Optional notes — forwarded to Sales Director + BDM on whichever
  // decision is taken (approve or reject). Independent of the REJECTED
  // rejection reason, which remains a required field on reject.
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sort state (pending tab only)
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Bulk selection state (pending tab only)
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useModal(showDetailsModal, () => setShowDetailsModal(false));
  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));
  useModal(showDocPreview, () => { setShowDocPreview(false); setPreviewDoc(null); });

  // Redirect non-OPS users
  useEffect(() => {
    if (user && !isOpsTeam && !isBDMTeamLeader) {
      router.push('/dashboard');
    }
  }, [user, isOpsTeam, isBDMTeamLeader, router]);

  useSocketRefresh(fetchOpsQueue, { enabled: isOpsTeam || isBDMTeamLeader });

  // Fetch review counts on initial load (for tab badges)
  useEffect(() => {
    if (isOpsTeam || isBDMTeamLeader) {
      fetchOpsReviewHistory('all');
    }
  }, [isOpsTeam, isBDMTeamLeader, fetchOpsReviewHistory]);

  // Fetch data based on active tab
  useEffect(() => {
    if (isOpsTeam || isBDMTeamLeader) {
      if (activeTab === 'pending') {
        fetchOpsQueue();
      } else {
        fetchOpsReviewHistory(activeTab);
      }
    }
  }, [isOpsTeam, isBDMTeamLeader, activeTab, fetchOpsQueue, fetchOpsReviewHistory]);

  // Reset pagination and selection when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedLeads(new Set());
  }, [activeTab]);

  const resetDecision = () => {
    setDecision('');
    setReason('');
    setNotes('');
  };

  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  const handleOpenDisposition = (lead) => {
    setSelectedLead(lead);
    resetDecision();
    setShowDispositionDialog(true);
  };

  const handleSubmitDisposition = async () => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    if (decision === 'REJECTED' && !reason.trim()) {
      toast.error('Reason is required when rejecting');
      return;
    }

    setIsSaving(true);

    const result = await opsTeamDisposition(selectedLead.id, {
      decision,
      reason: reason.trim() || null,
      notes: notes.trim() || null,
    });

    if (result.success) {
      setShowDispositionDialog(false);
      setSelectedLead(null);
      toast.success(result.message || 'Decision saved');
      fetchOpsQueue();
    } else {
      toast.error(result.error || 'Failed to save decision');
    }

    setIsSaving(false);
  };

  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortLeads = (leads) => {
    return [...leads].sort((a, b) => {
      let valA, valB;

      if (sortField === 'company') {
        valA = (a.company || '').toLowerCase();
        valB = (b.company || '').toLowerCase();
      } else if (sortField === 'createdAt') {
        valA = new Date(a.updatedAt || a.createdAt).getTime();
        valB = new Date(b.updatedAt || b.createdAt).getTime();
      } else if (sortField === 'arcAmount') {
        valA = Number(a.arcAmount) || 0;
        valB = Number(b.arcAmount) || 0;
      } else if (sortField === 'status') {
        valA = (a.opsApprovalStatus || '').toLowerCase();
        valB = (b.opsApprovalStatus || '').toLowerCase();
      } else {
        return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleBulkAction = async (action) => {
    if (selectedLeads.size === 0) return;

    if (action === 'reject') {
      const reason = window.prompt('Enter rejection reason for all selected leads:');
      if (!reason || !reason.trim()) {
        toast.error('Rejection reason is required');
        return;
      }
      await processBulkAction(action, reason.trim());
    } else {
      await processBulkAction(action, null);
    }
  };

  const processBulkAction = async (action, reason) => {
    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const leadId of selectedLeads) {
      const result = await opsTeamDisposition(leadId, {
        decision: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reason
      });
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setBulkProcessing(false);
    setSelectedLeads(new Set());

    const actionLabel = action === 'approve' ? 'approved' : 'rejected';
    if (failCount > 0) {
      toast.success(`${successCount} leads ${actionLabel}, ${failCount} failed`);
    } else {
      toast.success(`${successCount} leads ${actionLabel}`);
    }

    fetchOpsQueue();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
    if (mimetype?.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <File className="w-4 h-4 text-slate-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentUrl = (doc) => {
    return doc.url || doc.path || '';
  };

  // Route PDFs + Office docs through the backend proxy so Cloudinary's
  // Content-Disposition: attachment header is stripped for inline rendering.
  const getPreviewUrl = (doc) => {
    const rawUrl = getDocumentUrl(doc);
    if (!rawUrl) return '';
    const name = (doc.originalName || rawUrl).toLowerCase();
    const isImage = doc.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/.test(name);
    if (isImage) return rawUrl;
    if (!rawUrl.includes('cloudinary.com')) return rawUrl;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : '';
    return `${apiBase}/proxy/file?url=${encodeURIComponent(rawUrl)}&token=${encodeURIComponent(token || '')}`;
  };

  const handleViewDocument = (doc) => {
    setPreviewDoc(doc);
    setShowDocPreview(true);
  };

  const getExt = (doc) => ((doc?.originalName || doc?.url || '').toLowerCase().match(/\.([a-z0-9]+)(\?|$)/)?.[1] || '');
  const isImageFile = (doc) => {
    if (doc?.mimetype?.startsWith('image/')) return true;
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(getExt(doc));
  };
  const isPdfFile = (doc) => {
    if (doc?.mimetype?.includes('pdf')) return true;
    return getExt(doc) === 'pdf';
  };

  const getInterestLevelBadge = (level) => {
    const styles = {
      HOT: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      WARM: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      COLD: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    };
    return styles[level] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  // Get current list based on tab, with sorting for pending
  const getCurrentList = () => {
    if (activeTab === 'pending') {
      return sortLeads(opsQueue || []);
    }
    return opsReviewHistory || [];
  };

  // Pagination
  const currentList = getCurrentList();
  const totalPages = Math.ceil((currentList?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = currentList?.slice(startIndex, endIndex) || [];

  if (!isOpsTeam && !isBDMTeamLeader) {
    return null;
  }

  // Render tabs
  const renderTabs = () => (
    <TabBar
      tabs={[
        { key: 'pending', label: 'Pending', count: opsStats?.pending || 0, icon: Clock, variant: 'warning' },
        { key: 'approved', label: 'Approved', count: opsReviewCounts?.approved || 0, icon: CheckCircle, variant: 'success' },
        { key: 'rejected', label: 'Rejected', count: opsReviewCounts?.rejected || 0, icon: XCircle, variant: 'danger' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      className="mb-6"
    />
  );

  // Render history table (for approved/rejected tabs)
  const renderHistoryTable = () => {
    if (paginatedList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <History size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No {activeTab} quotations found</p>
          <p className="text-sm mt-1">
            {activeTab === 'approved'
              ? 'Quotations you approve will appear here'
              : 'Quotations you reject will appear here'
            }
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile card view */}
        <div className="lg:hidden p-3 space-y-3">
          {paginatedList.map((lead) => {
            const isApproved = lead.opsApprovalStatus === 'APPROVED';
            return (
              <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {/* Company header + status */}
                <div className={`flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 ${
                  isApproved
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'bg-red-50/50 dark:bg-red-900/10'
                }`}>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isApproved
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Building2 className={`h-4 w-4 ${
                      isApproved
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name || lead.campaignData?.name || '-'}</p>
                  </div>
                  <Badge className={`flex-shrink-0 ${
                    isApproved
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {isApproved ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>

                {/* Info grid */}
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">ARC</p>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(lead.arcAmount)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">OTC</p>
                      <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{formatCurrency(lead.otcAmount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.assignedTo?.name || lead.createdBy?.name || '-'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Reviewed</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                        {lead.opsApprovedAt
                          ? new Date(lead.opsApprovedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '-'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {lead.opsRejectedReason && (
                    <div className="flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                        {lead.opsRejectedReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer: date + actions */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lead.opsApprovedAt
                      ? new Date(lead.opsApprovedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '-'
                    }
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(lead)}
                    className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 h-8 text-xs"
                  >
                    <Eye size={14} className="mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table view */}
        <DataTable
          className="hidden lg:block"
          columns={[
            {
              key: 'company',
              label: 'Company',
              render: (lead) => (
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeTab === 'approved'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Building2 className={`h-5 w-5 ${
                      activeTab === 'approved'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{lead.name || lead.campaignData?.name || '-'}</p>
                      {lead.interestLevel && (
                        <Badge className={`text-[10px] ${getInterestLevelBadge(lead.interestLevel)}`}>
                          {lead.interestLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'feasibility',
              label: 'Feasibility',
              render: (lead) => {
                const feasibilityData = parseFeasibilityData(lead);
                const hasData = feasibilityData?.vendorType || feasibilityData?.vendorDetails?.capex != null || feasibilityData?.vendorDetails?.opex != null;
                if (!hasData) {
                  return <span className="text-slate-400 text-sm">-</span>;
                }
                return (
                  <div className="space-y-1">
                    {feasibilityData?.vendorType && (
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                        {getVendorTypeLabel(feasibilityData.vendorType)}
                      </Badge>
                    )}
                    <div className="text-xs text-slate-500 space-y-0.5">
                      {feasibilityData.vendorDetails?.vendorName && (
                        <p className="truncate max-w-[100px]" title={feasibilityData.vendorDetails.vendorName}>
                          {feasibilityData.vendorDetails.vendorName}
                        </p>
                      )}
                      {feasibilityData.vendorDetails?.fiberRequired && (
                        <p>Fiber: {typeof feasibilityData.vendorDetails.fiberRequired === 'object' ? `${feasibilityData.vendorDetails.fiberRequired.quantity || 0}m` : `${feasibilityData.vendorDetails.fiberRequired}m`}</p>
                      )}
                      {(feasibilityData.vendorDetails?.capex || feasibilityData.vendorDetails?.opex) && (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {feasibilityData.vendorDetails?.capex && (
                            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px] font-medium">
                              CAPEX: ₹{Number(feasibilityData.vendorDetails.capex).toLocaleString()}
                            </span>
                          )}
                          {feasibilityData.vendorDetails?.opex && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-medium">
                              OPEX: ₹{Number(feasibilityData.vendorDetails.opex).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'quotation',
              label: 'Quotation',
              render: (lead) => (
                <div className="space-y-1">
                  {lead.arcAmount && (
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      ARC: {formatCurrency(lead.arcAmount)}
                    </p>
                  )}
                  {lead.otcAmount && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      OTC: {formatCurrency(lead.otcAmount)}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (lead) => (
                <div>
                  <Badge className={`${
                    lead.opsApprovalStatus === 'APPROVED'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {lead.opsApprovalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </Badge>
                  {lead.opsRejectedReason && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                        {lead.opsRejectedReason}
                      </p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.assignedTo?.name || lead.createdBy?.name || '-'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.campaign?.name || '-'}</p>
                </div>
              ),
            },
            {
              key: 'reviewed',
              label: 'Reviewed',
              render: (lead) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {lead.opsApprovedAt
                      ? new Date(lead.opsApprovedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '-'
                    }
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {lead.opsApprovedAt
                      ? new Date(lead.opsApprovedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                      : ''
                    }
                  </p>
                </div>
              ),
            },
          ]}
          data={paginatedList}
          loading={false}
          emptyMessage={`No ${activeTab} quotations found`}
          emptyIcon={ClipboardCheck}
          actions={(lead) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(lead)}
              className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Eye size={16} className="mr-1" />
              View
            </Button>
          )}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {startIndex + 1} to {Math.min(endIndex, currentList.length)} of {currentList.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-slate-200 dark:border-slate-700"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-200 dark:border-slate-700"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Render pending queue table
  const renderPendingTable = () => {
    if (paginatedList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <FileCheck size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No pending approvals</p>
          <p className="text-sm mt-1">All quotations have been processed</p>
        </div>
      );
    }

    return (
      <>
        {/* Bulk action bar (mobile only - DataTable handles desktop bulk actions) */}
        {!isBDMTeamLeader && selectedLeads.size > 0 && (
          <div className="lg:hidden flex items-center gap-3 p-3 mx-3 mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {selectedLeads.size} selected
            </span>
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? 'Processing...' : 'Approve All'}
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={() => setSelectedLeads(new Set())}
              disabled={bulkProcessing}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Mobile card view */}
        <div className="lg:hidden p-3 space-y-3">
          {paginatedList.map((lead) => {
            const feasibilityData = parseFeasibilityData(lead);
            return (
              <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {/* Company header */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 flex-shrink-0"
                    checked={selectedLeads.has(lead.id)}
                    onChange={(e) => {
                      const next = new Set(selectedLeads);
                      if (e.target.checked) next.add(lead.id);
                      else next.delete(lead.id);
                      setSelectedLeads(next);
                    }}
                  />
                  <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name || lead.campaignData?.name || '-'}</p>
                  </div>
                  {lead.interestLevel && (
                    <Badge className={`text-[10px] flex-shrink-0 ${getInterestLevelBadge(lead.interestLevel)}`}>
                      {lead.interestLevel}
                    </Badge>
                  )}
                </div>

                {/* Info grid */}
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">ARC</p>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(lead.arcAmount)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">OTC</p>
                      <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{formatCurrency(lead.otcAmount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {feasibilityData?.vendorType && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Vendor</p>
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs mt-1">
                          {getVendorTypeLabel(feasibilityData.vendorType)}
                        </Badge>
                      </div>
                    )}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.assignedTo?.name || lead.createdBy?.name || '-'}</p>
                    </div>
                  </div>

                  {/* Products */}
                  {(lead.products?.length > 0 || lead.bandwidthRequirement) && (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.products?.map(p => (
                        <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                          {p.title}
                        </Badge>
                      ))}
                      {lead.bandwidthRequirement && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
                          <Wifi size={10} />
                          {lead.bandwidthRequirement}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: date + actions */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(lead.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(lead)}
                      className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 h-8 text-xs"
                    >
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                    {!isBDMTeamLeader && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenDisposition(lead)}
                        className="bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table view */}
        <DataTable
          className="hidden lg:block"
          columns={[
            {
              key: 'company',
              label: 'Company',
              sortable: true,
              onSort: () => handleSortClick('company'),
              sortIcon: sortField === 'company' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null,
              render: (lead) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{lead.name || lead.campaignData?.name || '-'}</p>
                      {lead.interestLevel && (
                        <Badge className={`text-[10px] ${getInterestLevelBadge(lead.interestLevel)}`}>
                          {lead.interestLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'feasibility',
              label: 'Feasibility',
              render: (lead) => {
                const feasibilityData = parseFeasibilityData(lead);
                const hasData = feasibilityData?.vendorType || feasibilityData?.vendorDetails?.capex != null || feasibilityData?.vendorDetails?.opex != null;
                if (!hasData) {
                  return <span className="text-slate-400 text-sm">-</span>;
                }
                return (
                  <div className="space-y-1">
                    {feasibilityData?.vendorType && (
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                        {getVendorTypeLabel(feasibilityData.vendorType)}
                      </Badge>
                    )}
                    <div className="text-xs text-slate-500 space-y-0.5">
                      {feasibilityData.vendorDetails?.vendorName && (
                        <p className="truncate max-w-[100px]" title={feasibilityData.vendorDetails.vendorName}>
                          {feasibilityData.vendorDetails.vendorName}
                        </p>
                      )}
                      {feasibilityData.vendorDetails?.fiberRequired && (
                        <p>Fiber: {typeof feasibilityData.vendorDetails.fiberRequired === 'object' ? `${feasibilityData.vendorDetails.fiberRequired.quantity || 0}m` : `${feasibilityData.vendorDetails.fiberRequired}m`}</p>
                      )}
                      {(feasibilityData.vendorDetails?.capex || feasibilityData.vendorDetails?.opex) && (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {feasibilityData.vendorDetails?.capex && (
                            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px] font-medium">
                              CAPEX: ₹{Number(feasibilityData.vendorDetails.capex).toLocaleString()}
                            </span>
                          )}
                          {feasibilityData.vendorDetails?.opex && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-medium">
                              OPEX: ₹{Number(feasibilityData.vendorDetails.opex).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'quotation',
              label: 'Quotation',
              sortable: true,
              onSort: () => handleSortClick('arcAmount'),
              sortIcon: sortField === 'arcAmount' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null,
              render: (lead) => (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      ARC: {formatCurrency(lead.arcAmount)}
                    </span>
                  </div>
                  {lead.otcAmount && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 ml-5">
                      OTC: {formatCurrency(lead.otcAmount)}
                    </p>
                  )}
                  {lead.advanceAmount && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 ml-5">
                      Advance: {formatCurrency(lead.advanceAmount)}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'products',
              label: 'Products',
              render: (lead) => (
                <div>
                  <div className="flex flex-wrap gap-1">
                    {lead.products?.slice(0, 2).map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                        {p.title}
                      </Badge>
                    ))}
                    {lead.products?.length > 2 && (
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                        +{lead.products.length - 2}
                      </Badge>
                    )}
                  </div>
                  {(lead.bandwidthRequirement || lead.numberOfIPs) && (
                    <div className="flex items-center gap-2 mt-1">
                      {lead.bandwidthRequirement && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
                          <Wifi size={10} />
                          {lead.bandwidthRequirement}
                        </span>
                      )}
                      {lead.numberOfIPs && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs">
                          <Hash size={10} />
                          {lead.numberOfIPs} IPs
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.assignedTo?.name || lead.createdBy?.name || '-'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lead.campaign?.code === 'SAM-GENERATED' ? (
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] px-1.5 py-0 rounded">
                        SAM Generated {lead.dataCreatedBy?.name ? `(${lead.dataCreatedBy.name})` : ''}
                      </span>
                    ) : lead.isCustomerReferral ? (
                      <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] px-1.5 py-0 rounded">
                        Customer Referral
                      </span>
                    ) : (lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]')) && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 rounded">
                        {lead.dataCreatedBy?.name || lead.createdBy?.name || 'Self'}
                      </span>
                    )}
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {lead.campaign?.name?.replace(/^\[Self\]\s*/i, '') || '-'}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'submitted',
              label: 'Submitted',
              sortable: true,
              onSort: () => handleSortClick('createdAt'),
              sortIcon: sortField === 'createdAt' ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null,
              render: (lead) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {new Date(lead.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(lead.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              ),
            },
          ]}
          data={paginatedList}
          loading={false}
          emptyMessage="No pending approvals"
          emptyIcon={ClipboardCheck}
          selectedRows={selectedLeads}
          onSelectAll={(checked) => {
            if (checked) {
              setSelectedLeads(new Set(currentList.map(l => l.id)));
            } else {
              setSelectedLeads(new Set());
            }
          }}
          onSelectRow={(id) => {
            const next = new Set(selectedLeads);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            setSelectedLeads(next);
          }}
          bulkActions={
            !isBDMTeamLeader ? (
              <>
                <button
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkProcessing}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {bulkProcessing ? 'Processing...' : 'Approve All'}
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkProcessing}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={() => setSelectedLeads(new Set())}
                  disabled={bulkProcessing}
                  className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear
                </button>
              </>
            ) : null
          }
          actions={(lead) => (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewDetails(lead)}
                className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Eye size={16} className="mr-1" />
                View
              </Button>
              {!isBDMTeamLeader && (
                <Button
                  size="sm"
                  onClick={() => handleOpenDisposition(lead)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Review
                </Button>
              )}
            </div>
          )}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {startIndex + 1} to {Math.min(endIndex, currentList.length)} of {currentList.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-slate-200 dark:border-slate-700"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-200 dark:border-slate-700"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="OPS Approval Queue" description="Review and approve quotations before they are shared with customers">
        {isBDMTeamLeader && (
          <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs">
            Read-Only View
          </Badge>
        )}
      </PageHeader>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : activeTab === 'pending' ? (
        renderPendingTable()
      ) : (
        renderHistoryTable()
      )}

      {/* Details Modal - Compact Version */}
      {showDetailsModal && selectedLead && (() => {
        const feasData = parseFeasibilityData(selectedLead);
        const vd = feasData?.vendorDetails || {};
        return (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedLead.company}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{selectedLead.name} • {selectedLead.industry || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">

              {/* Financial Summary — Hero Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">ARC</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{formatCurrency(selectedLead.arcAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">OTC</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{formatCurrency(selectedLead.otcAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">CAPEX</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{vd.capex ? `₹${Number(vd.capex).toLocaleString()}` : '-'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">OPEX</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{vd.opex ? `₹${Number(vd.opex).toLocaleString()}` : '-'}</p>
                </div>
              </div>

              {/* Two Column Detail Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Left: Contact + Products + Attachments */}
                <div className="space-y-4">
                  {/* Contact & Location */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact & Location</h4>
                    </div>
                    <div className="p-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400 shrink-0" />
                        <span className="text-slate-900 dark:text-slate-100">{selectedLead.name}</span>
                        {selectedLead.title && <span className="text-slate-400 text-xs">({selectedLead.title})</span>}
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 text-xs">{selectedLead.fullAddress || selectedLead.location || selectedLead.city || '-'}</span>
                      </div>
                      {(selectedLead.billingAddress || selectedLead.billingPincode) && (
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[11px] text-slate-400 uppercase font-medium">Billing: </span>
                            <span className="text-slate-600 dark:text-slate-300 text-xs">{selectedLead.billingAddress || '-'} {selectedLead.billingPincode && `(${selectedLead.billingPincode})`}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Products & Service */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Products & Service</h4>
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedLead.products?.map(p => (
                          <Badge key={p.id} className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs">
                            {p.title}
                          </Badge>
                        )) || <span className="text-slate-400 text-xs">-</span>}
                        {selectedLead.bandwidthRequirement && (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs">
                            <Wifi size={10} className="mr-1" />{selectedLead.bandwidthRequirement}
                          </Badge>
                        )}
                        {selectedLead.numberOfIPs && (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs">
                            <Hash size={10} className="mr-1" />{selectedLead.numberOfIPs} IPs
                          </Badge>
                        )}
                      </div>
                      {selectedLead.expectedDeliveryDate && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Expected delivery: {new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedLead.quotationAttachments?.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Attachments</h4>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {selectedLead.quotationAttachments.map((file, i) => (
                          <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                            <FileText size={14} className="text-orange-500 shrink-0" />
                            <span className="truncate flex-1">{file.filename}</span>
                            <Eye size={13} className="text-slate-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {getDocumentsCount(selectedLead.documents) > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Documents ({getDocumentsCount(selectedLead.documents)})</h4>
                      </div>
                      <div className="p-3 space-y-1.5 max-h-[120px] overflow-y-auto">
                        {getDocumentsArray(selectedLead.documents).map((doc, index) => (
                          <div key={doc.documentType || index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate flex-1">
                              {getFileIcon(doc.mimetype)}
                              <span className="truncate text-slate-700 dark:text-slate-300">{doc.originalName}</span>
                            </div>
                            <button onClick={() => handleViewDocument(doc)} className="p-1 text-orange-600 hover:text-orange-700 shrink-0">
                              <Eye size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedLead.requirements && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</h4>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedLead.requirements}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Feasibility */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Network size={12} />
                        Feasibility
                      </h4>
                      {feasData?.vendorType && (
                        <Badge className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-[11px]">
                          {getVendorTypeLabel(feasData.vendorType)}
                        </Badge>
                      )}
                    </div>
                    {feasData && feasData.vendorType ? (
                      <div className="p-3">
                        {/* Vendor & POP Info */}
                        {(vd.vendorName || vd.provider || vd.nearestPop) && (
                          <div className="space-y-1.5 text-xs mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            {vd.vendorName && (
                              <div className="flex justify-between"><span className="text-slate-500">Vendor</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.vendorName}</span></div>
                            )}
                            {vd.provider && (
                              <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.provider}</span></div>
                            )}
                            {vd.nearestPop && (
                              <div className="flex justify-between"><span className="text-slate-500">Nearest POP</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.nearestPop}</span></div>
                            )}
                            {vd.distanceFromPop && (
                              <div className="flex justify-between"><span className="text-slate-500">Distance</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.distanceFromPop}m</span></div>
                            )}
                          </div>
                        )}

                        {/* Equipment Table */}
                        <div className="space-y-1.5 text-xs">
                          {[
                            { key: 'fiberRequired', label: 'Fiber' },
                            { key: 'switch', label: 'Switch' },
                            { key: 'sfp', label: 'SFP' },
                            { key: 'closure', label: 'Closure' },
                            { key: 'patchChord', label: 'Patch Cord' },
                            { key: 'rf', label: 'RF' },
                          ].filter(({ key }) => vd[key]).map(({ key, label }) => {
                            const val = vd[key];
                            const display = typeof val === 'object' ? `${val.quantity || 0} × ${val.modelNumber || '-'}` : val;
                            return (
                              <div key={key} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <span className="text-slate-500">{label}</span>
                                <span className="font-medium text-slate-900 dark:text-slate-100 font-mono">{display}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Vendor Financial Details */}
                        {(vd.percentage || vd.perMtrCost || vd.p2pCapacity || vd.arc || vd.otc || vd.bandwidth || vd.rent) && (
                          <div className="space-y-1.5 text-xs mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            {vd.percentage && (
                              <div className="flex justify-between"><span className="text-slate-500">Commission</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.percentage}%</span></div>
                            )}
                            {vd.perMtrCost && (
                              <div className="flex justify-between"><span className="text-slate-500">Per Mtr Cost</span><span className="font-medium text-slate-900 dark:text-slate-100">₹{vd.perMtrCost}</span></div>
                            )}
                            {vd.p2pCapacity && (
                              <div className="flex justify-between"><span className="text-slate-500">P2P Capacity</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.p2pCapacity} MB</span></div>
                            )}
                            {vd.bandwidth && (
                              <div className="flex justify-between"><span className="text-slate-500">Bandwidth</span><span className="font-medium text-slate-900 dark:text-slate-100">{vd.bandwidth}</span></div>
                            )}
                            {vd.arc && (
                              <div className="flex justify-between"><span className="text-slate-500">ARC</span><span className="font-medium text-slate-900 dark:text-slate-100">₹{vd.arc}</span></div>
                            )}
                            {vd.otc && (
                              <div className="flex justify-between"><span className="text-slate-500">OTC</span><span className="font-medium text-slate-900 dark:text-slate-100">₹{vd.otc}</span></div>
                            )}
                            {vd.p2pArc && (
                              <div className="flex justify-between"><span className="text-slate-500">P2P ARC</span><span className="font-medium text-slate-900 dark:text-slate-100">₹{vd.p2pArc}</span></div>
                            )}
                            {vd.p2pOtc && (
                              <div className="flex justify-between"><span className="text-slate-500">P2P OTC</span><span className="font-medium text-slate-900 dark:text-slate-100">₹{vd.p2pOtc}</span></div>
                            )}
                            {vd.rent && (
                              <div className="flex justify-between"><span className="text-slate-500">Rent</span><span className="font-medium text-slate-900 dark:text-slate-100">₹{vd.rent}</span></div>
                            )}
                          </div>
                        )}

                        {/* Feasibility Notes */}
                        {feasData.additionalNotes && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400 uppercase font-medium mb-1">Notes</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{feasData.additionalNotes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-xs text-slate-400">No feasibility data available</p>
                      </div>
                    )}
                  </div>

                  {/* Vendor Info */}
                  {vd.vendorDetails && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vendor Details</h4>
                      </div>
                      <div className="p-3 space-y-1 text-xs">
                        {vd.vendorDetails.companyName && (
                          <p className="font-medium text-slate-900 dark:text-slate-100">{vd.vendorDetails.companyName}</p>
                        )}
                        {vd.vendorDetails.contactPerson && (
                          <p className="text-slate-500">{vd.vendorDetails.contactPerson}</p>
                        )}
                        {vd.vendorDetails.phone && (
                          <p className="text-slate-500">{vd.vendorDetails.phone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OPS Status */}
                  {selectedLead.opsApprovalStatus && selectedLead.opsApprovalStatus !== 'PENDING' && (
                    <div className={`rounded-xl border overflow-hidden ${
                      selectedLead.opsApprovalStatus === 'APPROVED'
                        ? 'border-emerald-200 dark:border-emerald-800'
                        : 'border-red-200 dark:border-red-800'
                    }`}>
                      <div className={`px-3 py-2 flex items-center gap-2 ${
                        selectedLead.opsApprovalStatus === 'APPROVED'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        {selectedLead.opsApprovalStatus === 'APPROVED' ? (
                          <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle size={14} className="text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-xs font-semibold ${
                          selectedLead.opsApprovalStatus === 'APPROVED' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                        }`}>
                          {selectedLead.opsApprovalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </span>
                        {selectedLead.opsApprovedAt && (
                          <span className="text-[11px] text-slate-500 ml-auto">{formatDate(selectedLead.opsApprovedAt)}</span>
                        )}
                      </div>
                      {selectedLead.opsRejectedReason && (
                        <div className="px-3 py-2">
                          <p className="text-xs text-red-600 dark:text-red-400">{selectedLead.opsRejectedReason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 flex-shrink-0">
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                size="sm"
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Close
              </Button>
              {activeTab === 'pending' && !isBDMTeamLeader && (
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenDisposition(selectedLead);
                  }}
                  size="sm"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Review Quotation
                </Button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Disposition Dialog */}
      {!isBDMTeamLeader && showDispositionDialog && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Review Quotation</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLead.company} • {formatCurrency(selectedLead.arcAmount)} ARC
                </p>
              </div>
              <button
                onClick={() => setShowDispositionDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
              {/* Quotation Attachments */}
              {selectedLead.quotationAttachments?.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase mb-2">Attachments</h4>
                  <div className="space-y-1.5">
                    {selectedLead.quotationAttachments.map((file, i) => (
                      <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <FileText size={13} />
                        <span className="truncate">{file.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Approval Decision <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDecision('APPROVED')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <CheckCircle size={28} />
                    <span className="font-medium">Approve</span>
                  </button>
                  <button
                    onClick={() => setDecision('REJECTED')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      decision === 'REJECTED'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                  >
                    <XCircle size={28} />
                    <span className="font-medium">Reject</span>
                  </button>
                </div>
              </div>

              {/* Reason - Required for Rejection */}
              {decision === 'REJECTED' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for rejection..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This reason will be shared with the BDM so they can make corrections
                  </p>
                </div>
              )}

              {decision === 'APPROVED' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    After approval, this quotation will be sent back to BDM and then further sent to customer.
                  </p>
                </div>
              )}

              {/* Optional approval notes — forwarded to the next-step user
                  (Sales Director + BDM). Shown on both approve and reject
                  flows so OPS can add context regardless of the decision. */}
              {decision && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Notes <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any context for the Sales Director or BDM…"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Visible to the Sales Director and the BDM on the next step.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3 flex-shrink-0">
              <Button
                onClick={() => setShowDispositionDialog(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDisposition}
                disabled={
                  !decision ||
                  isSaving ||
                  (decision === 'REJECTED' && !reason.trim())
                }
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocPreview && previewDoc && (
        <div data-modal className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(previewDoc.mimetype)}
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {previewDoc.originalName}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatFileSize(previewDoc.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getPreviewUrl(previewDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <OpenLink size={20} />
                </a>
                <button
                  onClick={() => {
                    setShowDocPreview(false);
                    setPreviewDoc(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4 min-h-[400px]">
              {isImageFile(previewDoc) ? (
                <img
                  src={getDocumentUrl(previewDoc)}
                  alt={previewDoc.originalName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : isPdfFile(previewDoc) ? (
                <iframe
                  src={getPreviewUrl(previewDoc)}
                  className="w-full h-[70vh] rounded-lg border-0"
                  title={previewDoc.originalName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 py-12">
                  <File size={64} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm mb-4">This file type cannot be previewed directly</p>
                  <a
                    href={getPreviewUrl(previewDoc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <OpenLink size={18} />
                    Open File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
