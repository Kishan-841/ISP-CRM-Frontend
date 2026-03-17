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
  Briefcase,
  MapPin,
  Clock,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Package,
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
  Wifi,
  Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getDocumentTypeById, getAllDocumentTypes } from '@/lib/documentTypes';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

// Helper to get documents as array from object or array format
const getDocumentsArray = (documents) => {
  if (!documents) return [];
  // If already an array (legacy format), return as-is
  if (Array.isArray(documents)) return documents;
  // If object (new typed format), convert to array
  return Object.values(documents);
};

// Helper to get document count
const getDocumentsCount = (documents) => {
  if (!documents) return 0;
  if (Array.isArray(documents)) return documents.length;
  return Object.keys(documents).length;
};


export default function DocsVerificationPage() {
  const router = useRouter();
  const { user, isDocsTeam, isBDMTeamLeader, isSuperAdmin: isAdmin } = useRoleCheck();
  const {
    docsQueue,
    accountsRejectedQueue,
    docsStats,
    fetchDocsQueue,
    docsTeamDisposition,
    sendBackToBDM,
    getLeadMOMs,
    isLoading,
    docsReviewHistory,
    docsReviewCounts,
    fetchDocsReviewHistory
  } = useLeadStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [leadMOMs, setLeadMOMs] = useState([]);

  // Tab state
  const [activeTab, setActiveTab] = useState('pending');

  // Disposition state
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useModal(showDetailsModal, () => setShowDetailsModal(false));
  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));
  useModal(showDocPreview, () => { setShowDocPreview(false); setPreviewDoc(null); });

  // Redirect non-DocsTeam users
  useEffect(() => {
    if (user && !isDocsTeam && !isBDMTeamLeader) {
      router.push('/dashboard');
    }
  }, [user, isDocsTeam, isBDMTeamLeader, router]);

  useSocketRefresh(fetchDocsQueue, { enabled: isDocsTeam || isBDMTeamLeader });

  // Fetch review counts on initial load (for tab badges)
  useEffect(() => {
    if (isDocsTeam || isBDMTeamLeader) {
      fetchDocsReviewHistory('all'); // Fetch counts for approved/rejected tabs
    }
  }, [isDocsTeam, isBDMTeamLeader, fetchDocsReviewHistory]);

  // Fetch data based on active tab
  useEffect(() => {
    if (isDocsTeam || isBDMTeamLeader) {
      if (activeTab === 'pending') {
        fetchDocsQueue();
      } else {
        fetchDocsReviewHistory(activeTab);
      }
    }
  }, [isDocsTeam, isBDMTeamLeader, activeTab, fetchDocsQueue, fetchDocsReviewHistory]);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const resetDecision = () => {
    setDecision('');
    setReason('');
  };

  const handleViewDetails = async (lead) => {
    setSelectedLead(lead);
    const result = await getLeadMOMs(lead.id);
    if (result.success) {
      setLeadMOMs(result.moms || []);
    }
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
      toast.error('Reason is required when rejecting documents');
      return;
    }

    setIsSaving(true);

    const result = await docsTeamDisposition(selectedLead.id, {
      decision,
      reason: reason.trim() || null
    });

    if (result.success) {
      setShowDispositionDialog(false);
      setSelectedLead(null);
      toast.success(result.message || 'Decision saved');
      fetchDocsQueue();
    } else {
      toast.error(result.error || 'Failed to save decision');
    }

    setIsSaving(false);
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
    // Use Cloudinary URL directly if available, fallback to local path
    return doc.url || doc.path || '';
  };

  const handleViewDocument = (doc) => {
    setPreviewDoc(doc);
    setShowDocPreview(true);
  };

  const isImageFile = (mimetype) => {
    return mimetype?.startsWith('image/');
  };

  const isPdfFile = (mimetype) => {
    return mimetype?.includes('pdf');
  };

  // Get current list based on tab
  const getCurrentList = () => {
    if (activeTab === 'pending') {
      return docsQueue || [];
    }
    if (activeTab === 'accounts_rejected') {
      return accountsRejectedQueue || [];
    }
    return docsReviewHistory || [];
  };

  // Pagination
  const currentList = getCurrentList();
  const totalPages = Math.ceil((currentList?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = currentList?.slice(startIndex, endIndex) || [];

  if (!isDocsTeam && !isBDMTeamLeader) {
    return null;
  }

  // Render tabs
  const renderTabs = () => (
    <TabBar
      tabs={[
        { key: 'pending', label: 'Pending', count: docsStats?.pending || 0, icon: Clock, variant: 'warning' },
        { key: 'accounts_rejected', label: 'Accounts Rejected', count: docsStats?.accountsRejected || 0, icon: AlertCircle },
        { key: 'approved', label: 'Approved', count: docsReviewCounts?.approved || 0, icon: CheckCircle, variant: 'success' },
        { key: 'rejected', label: 'Rejected', count: docsReviewCounts?.rejected || 0, icon: XCircle, variant: 'danger' },
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
          <p className="text-lg font-medium">No {activeTab} leads found</p>
          <p className="text-sm mt-1">
            {activeTab === 'approved'
              ? 'Leads you approve will appear here'
              : 'Leads you reject will appear here'
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
            const isApproved = lead.docsStatus === 'DOCS_APPROVED';
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                      {lead.campaign?.code === 'SAM-GENERATED' ? (
                        <span className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] px-1.5 py-0 rounded">
                          SAM Generated
                        </span>
                      ) : lead.isCustomerReferral ? (
                        <span className="flex-shrink-0 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] px-1.5 py-0 rounded">
                          Customer Referral
                        </span>
                      ) : (lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]')) && (
                        <span className="flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 rounded">
                          {lead.dataCreatedBy?.name || 'Self'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name} {lead.title ? `• ${lead.title}` : ''}</p>
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
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.bdm?.name || '-'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Reviewed</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                        {lead.docsVerifiedAt ? new Date(lead.docsVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {lead.docsRejectionReason && (
                    <div className="flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">{lead.docsRejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lead.docsVerifiedAt
                      ? new Date(lead.docsVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '-'
                    }
                  </p>
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(lead)} className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 h-8 text-xs">
                    <Eye size={14} className="mr-1" /> View Details
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
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activeTab === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <Building2 className={`h-5 w-5 ${activeTab === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                    {lead.location && <p className="text-sm text-slate-500 dark:text-slate-400">{lead.location}</p>}
                  </div>
                </div>
              ),
            },
            {
              key: 'contact',
              label: 'Contact',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.title || '-'}</p>
                </>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (lead) => (
                <>
                  <Badge className={`${lead.docsStatus === 'DOCS_APPROVED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    {lead.docsStatus === 'DOCS_APPROVED' ? 'Approved' : 'Rejected'}
                  </Badge>
                  {lead.docsRejectionReason && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">{lead.docsRejectionReason}</p>
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.bdm?.name || '-'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.campaign?.name || '-'}</p>
                </>
              ),
            },
            {
              key: 'reviewed',
              label: 'Reviewed',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {lead.docsVerifiedAt ? new Date(lead.docsVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {lead.docsVerifiedAt ? new Date(lead.docsVerifiedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                  </p>
                </>
              ),
            },
          ]}
          data={currentList}
          pagination={true}
          defaultPageSize={10}
          emptyMessage={`No ${activeTab} leads found`}
          emptyIcon={FileCheck}
          actions={(lead) => (
            <Button size="sm" variant="outline" onClick={() => handleViewDetails(lead)} className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Eye size={16} className="mr-1" /> View
            </Button>
          )}
        />
      </>
    );
  };

  // Handler for sending accounts-rejected lead back to BDM
  const handleSendBackToBDM = async (lead) => {
    if (!confirm(`Send "${lead.company}" back to BDM for document re-upload?`)) return;

    setIsSaving(true);
    try {
      const result = await sendBackToBDM(lead.id, lead.accountsRejectedReason || 'Accounts rejected - requires document re-upload');
      if (result.success) {
        toast.success('Lead sent back to BDM for document re-upload');
        fetchDocsQueue(); // Refresh the queue
      } else {
        toast.error(result.error || 'Failed to send back to BDM');
      }
    } catch (error) {
      toast.error('Failed to send back to BDM');
    } finally {
      setIsSaving(false);
    }
  };

  // Render accounts rejected table
  const renderAccountsRejectedTable = () => {
    if (paginatedList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <AlertCircle size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No accounts rejected leads</p>
          <p className="text-sm mt-1">Leads rejected by accounts team will appear here</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile card view */}
        <div className="lg:hidden p-3 space-y-3">
          {paginatedList.map((lead) => (
            <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {/* Company header */}
              <div className="flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 border-b border-slate-200 dark:border-slate-700">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name}</p>
                </div>
                <Badge className="flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  Acct. Rejected
                </Badge>
              </div>

              {/* Content */}
              <div className="p-3 space-y-3">
                {/* Rejection reason */}
                <div className="flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{lead.accountsRejectedReason || 'No reason provided'}</p>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {lead.arcAmount && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">ARC</p>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">₹{parseFloat(lead.arcAmount).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {lead.otcAmount && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">OTC</p>
                      <p className="text-sm font-bold text-blue-800 dark:text-blue-200">₹{parseFloat(lead.otcAmount).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.bdm?.name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <Button size="sm" onClick={() => handleSendBackToBDM(lead)} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
                  Send to BDM
                </Button>
              </div>
            </div>
          ))}
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
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{lead.name}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'rejectionReason',
              label: 'Rejection Reason',
              render: (lead) => (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">{lead.accountsRejectedReason || 'No reason provided'}</p>
                </div>
              ),
            },
            {
              key: 'financialDetails',
              label: 'Financial Details',
              render: (lead) => (
                <div className="space-y-1">
                  {lead.arcAmount && (
                    <p className="text-sm"><span className="text-slate-500 dark:text-slate-400">ARC:</span> <span className="font-medium text-slate-900 dark:text-slate-100">₹{parseFloat(lead.arcAmount).toLocaleString('en-IN')}</span></p>
                  )}
                  {lead.otcAmount && (
                    <p className="text-sm"><span className="text-slate-500 dark:text-slate-400">OTC:</span> <span className="font-medium text-slate-900 dark:text-slate-100">₹{parseFloat(lead.otcAmount).toLocaleString('en-IN')}</span></p>
                  )}
                </div>
              ),
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.bdm?.name || '-'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.campaign?.name || '-'}</p>
                </>
              ),
            },
          ]}
          data={currentList}
          pagination={true}
          defaultPageSize={10}
          emptyMessage="No accounts rejected leads"
          emptyIcon={FileCheck}
          actions={(lead) => (
            <Button size="sm" onClick={() => handleSendBackToBDM(lead)} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
              Send to BDM
            </Button>
          )}
        />
      </>
    );
  };

  // Render pending queue table
  const renderPendingTable = () => {
    if (paginatedList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <FileCheck size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No pending verifications</p>
          <p className="text-sm mt-1">All documents have been processed</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile card view */}
        <div className="lg:hidden p-3 space-y-3">
          {paginatedList.map((lead) => (
            <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {/* Company header */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name} {lead.title ? `• ${lead.title}` : ''}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2.5">
                    <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold uppercase">Documents</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-bold text-orange-800 dark:text-orange-200">{getDocumentsCount(lead.documents)} file(s)</span>
                      {lead.verificationAttempts > 1 && (
                        <span className="text-[10px] px-1 py-0 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">#{lead.verificationAttempts}</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.bdm?.name || '-'}</p>
                  </div>
                </div>

                {/* Bandwidth badges */}
                {(lead.bandwidthRequirement || lead.numberOfIPs) && (
                  <div className="flex items-center gap-1.5">
                    {lead.bandwidthRequirement && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
                        <Wifi size={10} /> {lead.bandwidthRequirement}
                      </span>
                    )}
                    {lead.numberOfIPs && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs">
                        <Hash size={10} /> {lead.numberOfIPs} IPs
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
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(lead)} className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 h-8 text-xs">
                    <Eye size={14} className="mr-1" /> View
                  </Button>
                  {!isBDMTeamLeader && (
                    <Button size="sm" onClick={() => handleOpenDisposition(lead)} className="bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs">
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                    {lead.location && <p className="text-sm text-slate-500 dark:text-slate-400">{lead.location}</p>}
                    {(lead.bandwidthRequirement || lead.numberOfIPs) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {lead.bandwidthRequirement && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs"><Wifi size={10} /> {lead.bandwidthRequirement}</span>
                        )}
                        {lead.numberOfIPs && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs"><Hash size={10} /> {lead.numberOfIPs} IPs</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'contact',
              label: 'Contact',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.title || '-'}</p>
                </>
              ),
            },
            {
              key: 'documents',
              label: 'Documents',
              render: (lead) => (
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{getDocumentsCount(lead.documents)} file(s)</p>
                      {lead.verificationAttempts > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">Attempt #{lead.verificationAttempts}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ready for review</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.bdm?.name || '-'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.campaign?.name || '-'}</p>
                </>
              ),
            },
            {
              key: 'submitted',
              label: 'Submitted',
              render: (lead) => (
                <>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{new Date(lead.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(lead.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                </>
              ),
            },
          ]}
          data={currentList}
          pagination={true}
          defaultPageSize={10}
          emptyMessage="No pending verifications"
          emptyIcon={FileCheck}
          actions={(lead) => (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleViewDetails(lead)} className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Eye size={16} className="mr-1" /> View
              </Button>
              {!isBDMTeamLeader && (
                <Button size="sm" onClick={() => handleOpenDisposition(lead)} className="bg-orange-600 hover:bg-orange-700 text-white">Verify</Button>
              )}
            </div>
          )}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Document Verification" description="Verify documents submitted by BDM for feasible leads">
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
      ) : activeTab === 'accounts_rejected' ? (
        renderAccountsRejectedTable()
      ) : (
        renderHistoryTable()
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Lead Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {selectedLead.company}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-6 overflow-y-auto">
              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Company</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedLead.company}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Contact</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedLead.name}</p>
                    <p className="text-sm text-slate-500">{selectedLead.title}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Location</p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {selectedLead.location || selectedLead.city || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Industry</p>
                    <p className="text-slate-900 dark:text-slate-100">{selectedLead.industry || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              {(selectedLead.billingAddress || selectedLead.billingPincode) && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Billing Address
                  </h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {selectedLead.billingAddress || '-'}
                    {selectedLead.billingPincode && <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">({selectedLead.billingPincode})</span>}
                  </p>
                </div>
              )}

              {/* Expected Delivery Date */}
              {selectedLead.expectedDeliveryDate && (
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    Expected Delivery Date
                  </h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Verification Status (for history items) */}
              {selectedLead.docsStatus && selectedLead.docsStatus !== 'DOCS_UPLOADED' && (
                <div className={`p-4 rounded-xl border ${
                  selectedLead.docsStatus === 'DOCS_APPROVED'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedLead.docsStatus === 'DOCS_APPROVED' ? (
                      <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={18} className="text-red-600 dark:text-red-400" />
                    )}
                    <h4 className={`text-sm font-semibold ${
                      selectedLead.docsStatus === 'DOCS_APPROVED'
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {selectedLead.docsStatus === 'DOCS_APPROVED' ? 'Documents Approved' : 'Documents Rejected'}
                    </h4>
                  </div>
                  {selectedLead.docsVerifiedAt && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      Reviewed on {formatDate(selectedLead.docsVerifiedAt)}
                    </p>
                  )}
                  {selectedLead.docsRejectionReason && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-900 dark:text-red-100">{selectedLead.docsRejectionReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Products */}
              {selectedLead.products?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Package size={16} />
                    Products of Interest
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.products.map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Uploaded Documents ({getDocumentsCount(selectedLead.documents)})
                </h4>
                {getDocumentsCount(selectedLead.documents) > 0 ? (
                  <div className="space-y-2">
                    {getDocumentsArray(selectedLead.documents).map((doc, index) => {
                      const docTypeInfo = doc.documentType ? getDocumentTypeById(doc.documentType) : null;
                      const isAdvanceOtc = doc.documentType === 'ADVANCE_OTC';
                      return (
                        <div key={doc.documentType || index} className={`p-3 rounded-lg ${isAdvanceOtc ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getFileIcon(doc.mimetype)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {doc.originalName}
                                  </p>
                                  {docTypeInfo && (
                                    <Badge variant="outline" className={`text-xs ${isAdvanceOtc ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'}`}>
                                      {docTypeInfo.label}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="View Document"
                              >
                                <Eye size={18} />
                              </button>
                              <a
                                href={getDocumentUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Open in new tab"
                              >
                                <OpenLink size={18} />
                              </a>
                            </div>
                          </div>
                          {/* ADVANCE_OTC Payment Details */}
                          {isAdvanceOtc && (doc.paymentMethod || doc.referenceNumber) && (
                            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                              <div className="flex flex-wrap gap-3 text-xs">
                                {doc.paymentMethod && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Payment Method:</span>
                                    <span className="text-amber-800 dark:text-amber-200 capitalize bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                      {doc.paymentMethod.replace('_', ' ')}
                                    </span>
                                  </div>
                                )}
                                {doc.referenceNumber && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      {doc.paymentMethod === 'cheque' ? 'Cheque No:' : doc.paymentMethod === 'neft' ? 'UTR No:' : 'Ref No:'}
                                    </span>
                                    <span className="text-amber-800 dark:text-amber-200 font-mono bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                      {doc.referenceNumber}
                                    </span>
                                  </div>
                                )}
                                {doc.amount && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Amount:</span>
                                    <span className="text-amber-800 dark:text-amber-200 font-mono bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                      ₹{parseFloat(doc.amount).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                )}
                                {doc.date && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      {doc.paymentMethod === 'cheque' ? 'Cheque Date:' : 'Date:'}
                                    </span>
                                    <span className="text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                      {new Date(doc.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    No documents uploaded
                  </p>
                )}
              </div>

              {/* Requirements/Notes */}
              {selectedLead.requirements && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                    Important Notes About This Lead
                  </h4>
                  <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {selectedLead.requirements}
                  </div>
                </div>
              )}

              {/* MOMs */}
              {leadMOMs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Meeting Notes ({leadMOMs.length})
                  </h4>
                  <div className="space-y-3">
                    {leadMOMs.map(mom => (
                      <div key={mom.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {new Date(mom.meetingDate).toLocaleDateString()}
                          </p>
                          {mom.attendees && (
                            <p className="text-xs text-slate-500">{mom.attendees}</p>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{mom.discussion}</p>
                        {mom.nextSteps && (
                          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                            Next: {mom.nextSteps}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3 flex-shrink-0">
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
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
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Verify Documents
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disposition Dialog */}
      {!isBDMTeamLeader && showDispositionDialog && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Document Verification</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLead.company} • {getDocumentsCount(selectedLead.documents)} document(s)
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
              {/* Decision Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Verification Decision <span className="text-red-500">*</span>
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
                    This reason will be shared with the BDM
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {previewDoc.originalName}
                    </h2>
                    {previewDoc.documentType && (
                      <Badge className={previewDoc.documentType === 'ADVANCE_OTC' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}>
                        {getDocumentTypeById(previewDoc.documentType)?.label || previewDoc.documentType}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatFileSize(previewDoc.size)}
                    {/* ADVANCE_OTC Payment Details in Preview */}
                    {previewDoc.documentType === 'ADVANCE_OTC' && previewDoc.paymentMethod && (
                      <span className="ml-2">
                        • <span className="capitalize">{previewDoc.paymentMethod.replace('_', ' ')}</span>
                        {previewDoc.referenceNumber && <span className="font-mono ml-1">({previewDoc.referenceNumber})</span>}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getDocumentUrl(previewDoc)}
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
              {isImageFile(previewDoc.mimetype) ? (
                <img
                  src={getDocumentUrl(previewDoc)}
                  alt={previewDoc.originalName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : isPdfFile(previewDoc.mimetype) ? (
                <iframe
                  src={getDocumentUrl(previewDoc)}
                  className="w-full h-[70vh] rounded-lg border-0"
                  title={previewDoc.originalName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 py-12">
                  <File size={64} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm mb-4">This file type cannot be previewed directly</p>
                  <a
                    href={getDocumentUrl(previewDoc)}
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
