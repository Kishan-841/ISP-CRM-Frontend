'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useVendorStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DollarSign,
  Eye,
  File,
  Image as ImageIcon,
  IndianRupee,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  History,
  Wifi,
  Hash,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Pencil,
  Save,
  ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getDocumentTypeById, getAllDocumentTypes } from '@/lib/documentTypes';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency } from '@/lib/formatters';
import TabBar from '@/components/TabBar';

// Helper to get documents as array from object or array format
const getDocumentsArray = (documents) => {
  if (!documents) return [];
  if (Array.isArray(documents)) return documents;
  return Object.values(documents);
};

// Helper to get document count
const getDocumentsCount = (documents) => {
  if (!documents) return 0;
  if (Array.isArray(documents)) return documents.length;
  return Object.keys(documents).length;
};

export default function AccountsVerificationPage() {
  const router = useRouter();
  const { user, isAccountsTeam: _isAccountsTeam, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isBDM: _isBDM, isMaster } = useRoleCheck();
  const isAccountsTeam = isMaster ? true : _isAccountsTeam;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const isBDM = isMaster ? false : _isBDM;
  const {
    accountsQueue,
    accountsStats,
    fetchAccountsQueue,
    accountsTeamDisposition,
    updateFinancialDetails,
    updateAccountsDetails,
    getLeadMOMs,
    isLoading,
    accountsReviewHistory,
    accountsReviewCounts,
    fetchAccountsReviewHistory
  } = useLeadStore();

  const { verifyVendorDocs } = useVendorStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [vendorVerifyProcessing, setVendorVerifyProcessing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);

  // Edit mode for approved leads
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [leadMOMs, setLeadMOMs] = useState([]);

  // Tab state
  const [activeTab, setActiveTab] = useState('pending');

  // Disposition state
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [arcAmount, setArcAmount] = useState('');
  const [otcAmount, setOtcAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // GST state
  const [customerGstNo, setCustomerGstNo] = useState('');
  const [customerLegalName, setCustomerLegalName] = useState('');

  // New customer detail fields state
  const [companyName, setCompanyName] = useState('');
  const [panCardNo, setPanCardNo] = useState('');
  const [tanNumber, setTanNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPincode, setBillingPincode] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [installationPincode, setInstallationPincode] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poExpiryDate, setPoExpiryDate] = useState('');
  const [billDate, setBillDate] = useState('');
  const [technicalInchargeMobile, setTechnicalInchargeMobile] = useState('');
  const [technicalInchargeEmail, setTechnicalInchargeEmail] = useState('');
  const [accountsInchargeMobile, setAccountsInchargeMobile] = useState('');
  const [accountsInchargeEmail, setAccountsInchargeEmail] = useState('');
  const [bdmName, setBdmName] = useState('');
  const [serviceManager, setServiceManager] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Editable state for BDM to update rejected leads
  const [editArc, setEditArc] = useState('');
  const [editOtc, setEditOtc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useModal(showDetailsModal, () => { setShowDetailsModal(false); setIsEditingApproved(false); });
  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));
  useModal(showDocPreview, () => { setShowDocPreview(false); setPreviewDoc(null); });

  // Redirect non-authorized users (allow Accounts, Admin, BDM, and BDM Team Leader)
  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin && !isBDM && !isBDMTeamLeader) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, isBDM, isBDMTeamLeader, router]);

  useSocketRefresh(fetchAccountsQueue, { enabled: isAccountsTeam || isAdmin || isBDMTeamLeader });

  // Fetch review counts on initial load (for tab badges)
  useEffect(() => {
    if (isAccountsTeam || isAdmin || isBDM || isBDMTeamLeader) {
      fetchAccountsReviewHistory('all'); // Fetch counts for approved/rejected tabs
    }
  }, [isAccountsTeam, isAdmin, isBDM, isBDMTeamLeader, fetchAccountsReviewHistory]);

  // Fetch data based on active tab
  useEffect(() => {
    if (isAccountsTeam || isAdmin || isBDMTeamLeader) {
      if (activeTab === 'pending') {
        fetchAccountsQueue();
      } else {
        fetchAccountsReviewHistory(activeTab);
      }
    } else if (isBDM) {
      // BDM can only see rejected leads
      fetchAccountsReviewHistory('rejected');
    }
  }, [isAccountsTeam, isAdmin, isBDM, isBDMTeamLeader, activeTab, fetchAccountsQueue, fetchAccountsReviewHistory]);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const resetDispositionForm = () => {
    setDecision('');
    setReason('');
    setArcAmount('');
    setOtcAmount('');
    setAdvanceAmount('');
    setPaymentTerms('');
    setCustomerGstNo('');
    setCustomerLegalName('');
    // Reset new fields
    setCompanyName('');
    setPanCardNo('');
    setTanNumber('');
    setBillingAddress('');
    setBillingPincode('');
    setInstallationAddress('');
    setInstallationPincode('');
    setPoNumber('');
    setPoExpiryDate('');
    setBillDate('');
    setTechnicalInchargeMobile('');
    setTechnicalInchargeEmail('');
    setAccountsInchargeMobile('');
    setAccountsInchargeEmail('');
    setBdmName('');
    setServiceManager('');
  };

  const handleViewDetails = async (lead) => {
    setSelectedLead(lead);
    // Reset edit mode
    setIsEditingApproved(false);
    // Initialize editable fields for BDM
    setEditArc(lead.arcAmount?.toString() || '');
    setEditOtc(lead.otcAmount?.toString() || '');
    // Initialize all edit fields for approved leads
    setArcAmount(lead.arcAmount?.toString() || '');
    setOtcAmount(lead.otcAmount?.toString() || '');
    setAdvanceAmount(lead.advanceAmount?.toString() || '');
    setPaymentTerms(lead.paymentTerms || '');
    setCustomerGstNo(lead.customerGstNo || '');
    setCustomerLegalName(lead.customerLegalName || '');
    setCompanyName(lead.company || '');
    setPanCardNo(lead.panCardNo || '');
    setTanNumber(lead.tanNumber || '');
    setBillingAddress(lead.billingAddress || '');
    setBillingPincode(lead.billingPincode || '');
    setInstallationAddress(lead.installationAddress || '');
    setInstallationPincode(lead.installationPincode || '');
    setPoNumber(lead.poNumber || '');
    setPoExpiryDate(lead.poExpiryDate ? new Date(lead.poExpiryDate).toISOString().split('T')[0] : '');
    setBillDate(lead.billDate ? new Date(lead.billDate).toISOString().split('T')[0] : '');
    setTechnicalInchargeMobile(lead.technicalInchargeMobile || '');
    setTechnicalInchargeEmail(lead.technicalInchargeEmail || '');
    setAccountsInchargeMobile(lead.accountsInchargeMobile || '');
    setAccountsInchargeEmail(lead.accountsInchargeEmail || '');
    setBdmName(lead.bdmName || '');
    setServiceManager(lead.serviceManager || '');
    const result = await getLeadMOMs(lead.id);
    if (result.success) {
      setLeadMOMs(result.moms || []);
    }
    setShowDetailsModal(true);
  };

  // Handler for saving updated accounts details on approved leads
  const handleSaveAccountsDetails = async () => {
    if (!selectedLead) return;

    setIsSavingDetails(true);
    try {
      const result = await updateAccountsDetails(selectedLead.id, {
        arcAmount: arcAmount ? parseFloat(arcAmount) : null,
        otcAmount: otcAmount ? parseFloat(otcAmount) : null,
        advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null,
        paymentTerms: paymentTerms || null,
        customerGstNo: customerGstNo || null,
        customerLegalName: customerLegalName || null,
        companyName: companyName || null,
        panCardNo: panCardNo || null,
        tanNumber: tanNumber || null,
        billingAddress: billingAddress || null,
        billingPincode: billingPincode || null,
        installationAddress: installationAddress || null,
        installationPincode: installationPincode || null,
        poNumber: poNumber || null,
        poExpiryDate: poExpiryDate || null,
        billDate: billDate || null,
        technicalInchargeMobile: technicalInchargeMobile || null,
        technicalInchargeEmail: technicalInchargeEmail || null,
        accountsInchargeMobile: accountsInchargeMobile || null,
        accountsInchargeEmail: accountsInchargeEmail || null,
        bdmName: bdmName || null,
        serviceManager: serviceManager || null
      });

      if (result.success) {
        toast.success('Accounts details updated successfully!');
        setSelectedLead(result.lead);
        setIsEditingApproved(false);
      } else {
        toast.error(result.error || 'Failed to update details');
      }
    } catch (error) {
      toast.error('Failed to update details');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Handler for BDM to update ARC/OTC on rejected leads
  const handleUpdateFinancials = async () => {
    if (!selectedLead) return;

    setIsUpdating(true);
    try {
      const result = await updateFinancialDetails(selectedLead.id, {
        arcAmount: editArc ? parseFloat(editArc) : null,
        otcAmount: editOtc ? parseFloat(editOtc) : null
      });

      if (result.success) {
        toast.success('Pricing updated and resubmitted for accounts review!');
        // Close modal and refresh list (lead will be removed as it's now pending)
        setShowDetailsModal(false);
        setSelectedLead(null);
        setIsEditingApproved(false);
        // Refresh the rejected list
        fetchAccountsReviewHistory('rejected');
      } else {
        toast.error(result.error || 'Failed to update pricing');
      }
    } catch (error) {
      toast.error('Failed to update pricing');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDisposition = (lead) => {
    setSelectedLead(lead);
    resetDispositionForm();
    // Pre-fill existing values if any
    if (lead.arcAmount) setArcAmount(lead.arcAmount.toString());
    if (lead.otcAmount) setOtcAmount(lead.otcAmount.toString());
    if (lead.advanceAmount) setAdvanceAmount(lead.advanceAmount.toString());
    if (lead.paymentTerms) setPaymentTerms(lead.paymentTerms);

    // Pre-fill GST if exists or use suggestion from same company
    if (lead.customerGstNo) {
      setCustomerGstNo(lead.customerGstNo);
      setCustomerLegalName(lead.customerLegalName || '');
    } else if (lead.suggestedGstNo) {
      // Auto-fill from same company's existing GST
      setCustomerGstNo(lead.suggestedGstNo);
      setCustomerLegalName(lead.suggestedLegalName || '');
    }

    // Pre-fill new customer detail fields
    setCompanyName(lead.company || lead.campaignData?.company || '');
    if (lead.panCardNo) setPanCardNo(lead.panCardNo);
    if (lead.tanNumber) setTanNumber(lead.tanNumber);
    if (lead.billingAddress) setBillingAddress(lead.billingAddress);
    if (lead.billingPincode) setBillingPincode(lead.billingPincode);
    if (lead.installationAddress) setInstallationAddress(lead.installationAddress);
    else if (lead.fullAddress) setInstallationAddress(lead.fullAddress);
    if (lead.installationPincode) setInstallationPincode(lead.installationPincode);
    if (lead.poNumber) setPoNumber(lead.poNumber);
    if (lead.poExpiryDate) setPoExpiryDate(lead.poExpiryDate.split('T')[0]);
    if (lead.billDate) setBillDate(lead.billDate.split('T')[0]);
    if (lead.technicalInchargeMobile) setTechnicalInchargeMobile(lead.technicalInchargeMobile);
    if (lead.technicalInchargeEmail) setTechnicalInchargeEmail(lead.technicalInchargeEmail);
    if (lead.accountsInchargeMobile) setAccountsInchargeMobile(lead.accountsInchargeMobile);
    if (lead.accountsInchargeEmail) setAccountsInchargeEmail(lead.accountsInchargeEmail);
    // Pre-fill BDM name from the assigned BDM
    if (lead.bdmName) setBdmName(lead.bdmName);
    else if (lead.bdm?.name) setBdmName(lead.bdm.name);
    else if (lead.assignedTo?.name) setBdmName(lead.assignedTo.name);
    if (lead.serviceManager) setServiceManager(lead.serviceManager);

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

    if (decision === 'APPROVED') {
      // Validate company name
      if (!companyName || companyName.trim().length === 0) {
        toast.error('Company name is required for approval');
        return;
      }
      // Validate GST
      if (!customerGstNo || customerGstNo.trim().length !== 15) {
        toast.error('Valid 15-character GST number is required for approval');
        return;
      }
      // Validate PAN
      if (!panCardNo || panCardNo.trim().length !== 10) {
        toast.error('Valid 10-character PAN card number is required for approval');
        return;
      }
      // Validate TAN
      if (!tanNumber || tanNumber.trim().length === 0) {
        toast.error('TAN number is required for approval');
        return;
      }
      // Validate billing address
      if (!billingAddress || billingAddress.trim().length === 0) {
        toast.error('Billing address is required for approval');
        return;
      }
      if (!billingPincode || billingPincode.trim().length === 0) {
        toast.error('Billing pincode is required for approval');
        return;
      }
      // Validate installation address
      if (!installationAddress || installationAddress.trim().length === 0) {
        toast.error('Installation address is required for approval');
        return;
      }
      if (!installationPincode || installationPincode.trim().length === 0) {
        toast.error('Installation pincode is required for approval');
        return;
      }
      // Validate PO number
      if (!poNumber || poNumber.trim().length === 0) {
        toast.error('PO number is required for approval');
        return;
      }
      // Validate ARC/OTC
      if (!arcAmount || parseFloat(arcAmount) <= 0) {
        toast.error('Valid ARC amount is required for approval');
        return;
      }
      if (!otcAmount || parseFloat(otcAmount) < 0) {
        toast.error('Valid OTC amount is required for approval');
        return;
      }
      // Validate legal name
      if (!customerLegalName || customerLegalName.trim().length === 0) {
        toast.error('Legal name (as per GST) is required for approval');
        return;
      }
    }

    setIsSaving(true);

    const result = await accountsTeamDisposition(selectedLead.id, {
      decision,
      reason: reason.trim() || null,
      arcAmount: arcAmount ? parseFloat(arcAmount) : null,
      otcAmount: otcAmount ? parseFloat(otcAmount) : null,
      advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null,
      paymentTerms: paymentTerms.trim() || null,
      customerGstNo: customerGstNo.trim() || null,
      customerLegalName: customerLegalName.trim() || null,
      // New customer detail fields
      companyName: companyName.trim() || null,
      panCardNo: panCardNo.trim() || null,
      tanNumber: tanNumber.trim() || null,
      billingAddress: billingAddress.trim() || null,
      billingPincode: billingPincode.trim() || null,
      installationAddress: installationAddress.trim() || null,
      installationPincode: installationPincode.trim() || null,
      poNumber: poNumber.trim() || null,
      poExpiryDate: poExpiryDate || null,
      billDate: billDate || null,
      technicalInchargeMobile: technicalInchargeMobile.trim() || null,
      technicalInchargeEmail: technicalInchargeEmail.trim() || null,
      accountsInchargeMobile: accountsInchargeMobile.trim() || null,
      accountsInchargeEmail: accountsInchargeEmail.trim() || null,
      bdmName: bdmName.trim() || null,
      serviceManager: serviceManager.trim() || null
    });

    if (result.success) {
      setShowDispositionDialog(false);
      setSelectedLead(null);
      toast.success(result.message || 'Decision saved');
      fetchAccountsQueue();
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

  // Get current list based on tab
  const getCurrentList = () => {
    // Check accounts team/admin/TL FIRST
    if (isAccountsTeam || isAdmin || isBDMTeamLeader) {
      if (activeTab === 'pending') {
        return accountsQueue || [];
      }
      return accountsReviewHistory || [];
    }
    // BDM only sees rejected leads that belong to them
    if (isBDM) {
      const rejected = accountsReviewHistory || [];
      return rejected.filter(lead =>
        lead.accountsStatus === 'ACCOUNTS_REJECTED' &&
        (lead.createdById === user?.id || lead.assignedToId === user?.id)
      );
    }
    return [];
  };

  // Pagination
  const currentList = getCurrentList();
  const totalPages = Math.ceil((currentList?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = currentList?.slice(startIndex, endIndex) || [];

  if (!isAccountsTeam && !isAdmin && !isBDM && !isBDMTeamLeader) {
    return null;
  }

  // Render tabs
  const renderTabs = () => {
    // Accounts team/admin/TL sees all tabs
    if (isAccountsTeam || isAdmin || isBDMTeamLeader) {
      return (
        <TabBar
          tabs={[
            { key: 'pending', label: 'Pending', count: accountsStats?.pending || 0, icon: Clock, variant: 'warning' },
            { key: 'approved', label: 'Approved', count: accountsReviewCounts?.approved || 0, icon: CheckCircle, variant: 'success' },
            { key: 'rejected', label: 'Rejected', count: accountsReviewCounts?.rejected || 0, icon: XCircle, variant: 'danger' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />
      );
    }

    // BDM only sees rejected tab with their leads count
    if (isBDM) {
      const myRejectedCount = (accountsReviewHistory || []).filter(lead =>
        lead.accountsStatus === 'ACCOUNTS_REJECTED' &&
        (lead.createdById === user?.id || lead.assignedToId === user?.id)
      ).length;

      return (
        <TabBar
          tabs={[
            { key: 'rejected', label: 'Rejected by Accounts', count: myRejectedCount, icon: XCircle, variant: 'danger' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />
      );
    }

    return null;
  };

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
            const isApproved = lead.accountsStatus === 'ACCOUNTS_APPROVED';
            return (
              <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className={`flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 ${
                  isApproved ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10'
                }`}>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isApproved ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Building2 className={`h-4 w-4 ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name}</p>
                  </div>
                  <Badge className={`flex-shrink-0 ${
                    isApproved ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {isApproved ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>
                <div className="p-3 space-y-3">
                  {(lead.arcAmount || lead.otcAmount) && (
                    <div className="grid grid-cols-2 gap-3">
                      {lead.arcAmount && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">ARC</p>
                          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(lead.arcAmount)}</p>
                        </div>
                      )}
                      {lead.otcAmount && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">OTC</p>
                          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{formatCurrency(lead.otcAmount)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.bdm?.name || '-'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Reviewed</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                        {lead.accountsVerifiedAt ? new Date(lead.accountsVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </p>
                    </div>
                  </div>
                  {lead.accountsRejectionReason && (
                    <div className="flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">{lead.accountsRejectionReason}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lead.accountsVerifiedAt ? new Date(lead.accountsVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
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
          data={currentList}
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
                    {lead.location && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{lead.location}</p>
                    )}
                    {(lead.bandwidthRequirement || lead.numberOfIPs) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {lead.bandwidthRequirement && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
                            <Wifi size={10} />
                            {lead.bandwidthRequirement}
                          </span>
                        )}
                        {lead.numberOfIPs && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs">
                            <Hash size={10} />
                            {lead.numberOfIPs} IPs
                          </span>
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
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.title || '-'}</p>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (lead) => (
                <div>
                  <Badge className={`${
                    lead.accountsStatus === 'ACCOUNTS_APPROVED'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {lead.accountsStatus === 'ACCOUNTS_APPROVED' ? 'Approved' : 'Rejected'}
                  </Badge>
                  {lead.accountsRejectionReason && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                        {lead.accountsRejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'financial',
              label: 'Financial Details',
              render: (lead) => {
                if (lead.accountsStatus === 'ACCOUNTS_APPROVED' && (lead.arcAmount || lead.otcAmount)) {
                  return (
                    <div className="space-y-1">
                      {lead.arcAmount && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">ARC:</span>
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(lead.arcAmount)}
                          </span>
                        </div>
                      )}
                      {lead.otcAmount && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">OTC:</span>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(lead.otcAmount)}
                          </span>
                        </div>
                      )}
                      {lead.advanceAmount && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Advance:</span>
                          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {formatCurrency(lead.advanceAmount)}
                          </span>
                        </div>
                      )}
                      {lead.documents?.ADVANCE_OTC?.paymentMethod && (
                        <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            {lead.documents.ADVANCE_OTC.paymentMethod === 'cheque' ? 'Cheque' :
                             lead.documents.ADVANCE_OTC.paymentMethod === 'neft' ? 'NEFT' :
                             lead.documents.ADVANCE_OTC.paymentMethod === 'mail_approval' ? 'Mail Approval' :
                             lead.documents.ADVANCE_OTC.paymentMethod}
                            {lead.documents.ADVANCE_OTC.referenceNumber && (
                              <span className="ml-1 font-medium">#{lead.documents.ADVANCE_OTC.referenceNumber}</span>
                            )}
                          </span>
                          {(lead.documents.ADVANCE_OTC.amount || lead.documents.ADVANCE_OTC.date) && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {lead.documents.ADVANCE_OTC.amount && (
                                <span className="font-medium">₹{parseFloat(lead.documents.ADVANCE_OTC.amount).toLocaleString('en-IN')}</span>
                              )}
                              {lead.documents.ADVANCE_OTC.amount && lead.documents.ADVANCE_OTC.date && ' • '}
                              {lead.documents.ADVANCE_OTC.date && (
                                <span>{new Date(lead.documents.ADVANCE_OTC.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return <span className="text-xs text-slate-400">-</span>;
              },
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.bdm?.name || '-'}</p>
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
                        {lead.dataCreatedBy?.name || 'Unknown'}
                      </span>
                    )}
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]'))
                        ? (lead.campaign?.name?.replace(/^\[Self\]\s*/i, '') || '-')
                        : (lead.campaign?.name || '-')
                      }
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'reviewed',
              label: 'Reviewed',
              render: (lead) => (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {lead.accountsVerifiedAt
                      ? new Date(lead.accountsVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '-'
                    }
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {lead.accountsVerifiedAt
                      ? new Date(lead.accountsVerifiedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                      : ''
                    }
                  </p>
                </div>
              ),
            },
          ]}
          actions={(lead) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(lead)}
              className="h-8 px-3 text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Eye size={14} className="mr-1" />
              View
            </Button>
          )}
          pagination={true}
          defaultPageSize={10}
          emptyMessage={`No ${activeTab} leads found`}
          emptyIcon={ClipboardCheck}
        />
      </>
    );
  };

  // Render pending queue table
  const renderPendingTable = () => {
    if (paginatedList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <DollarSign size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No pending verifications</p>
          <p className="text-sm mt-1">All leads have been processed</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile card view */}
        <div className="lg:hidden p-3 space-y-3">
          {paginatedList.map((lead) => (
            <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                    {lead.verificationAttempts > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium flex-shrink-0">
                        #{lead.verificationAttempts}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name} {lead.title ? `• ${lead.title}` : ''}</p>
                </div>
                {lead.interestLevel && (
                  <Badge className={`flex-shrink-0 text-xs ${
                    lead.interestLevel === 'HOT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    lead.interestLevel === 'WARM' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {lead.interestLevel}
                  </Badge>
                )}
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {lead.arcAmount ? (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">ARC</p>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(lead.arcAmount)}</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">ARC</p>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Pending Entry</p>
                    </div>
                  )}
                  {lead.otcAmount ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">OTC</p>
                      <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{formatCurrency(lead.otcAmount)}</p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">OTC</p>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Pending</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2.5">
                    <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold uppercase">Documents</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-bold text-orange-800 dark:text-orange-200">{getDocumentsCount(lead.documents)} files</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">BDM</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.bdm?.name || '-'}</p>
                  </div>
                </div>
                {lead.products?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.products.slice(0, 3).map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                        {p.title}
                      </Badge>
                    ))}
                    {lead.products.length > 3 && (
                      <span className="text-xs text-slate-500">+{lead.products.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <Button size="sm" variant="outline" onClick={() => handleViewDetails(lead)} className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 h-8 text-xs">
                  <Eye size={14} className="mr-1" /> View
                </Button>
                {!isBDMTeamLeader && (
                  <Button size="sm" onClick={() => handleOpenDisposition(lead)} className="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                    <IndianRupee size={14} className="mr-1" /> Verify
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <DataTable
          className="hidden lg:block"
          data={currentList}
          columns={[
            {
              key: 'company',
              label: 'Company',
              render: (lead) => (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {lead.company}
                    </span>
                    {lead.verificationAttempts > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                        Attempt #{lead.verificationAttempts}
                      </span>
                    )}
                    {lead.suggestedGstNo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" title={`GST: ${lead.suggestedGstNo}`}>
                        GST Available
                      </span>
                    )}
                  </div>
                  {lead.industry && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {lead.industry}
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
                      <MapPin size={10} />
                      {lead.city}{lead.state ? `, ${lead.state}` : ''}
                    </div>
                  )}
                  {(lead.bandwidthRequirement || lead.numberOfIPs) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {lead.bandwidthRequirement && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
                          <Wifi size={10} />
                          {lead.bandwidthRequirement}
                        </span>
                      )}
                      {lead.numberOfIPs && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs">
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
              key: 'contact',
              label: 'Contact',
              render: (lead) => (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs font-medium">
                    {lead.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA'}
                  </div>
                  <div>
                    <div className="text-slate-900 dark:text-slate-100 text-sm font-medium">{lead.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{lead.title || '-'}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'products',
              label: 'Products',
              render: (lead) => (
                <div className="flex flex-wrap gap-1 max-w-[180px]">
                  {lead.products?.length > 0 ? (
                    lead.products.slice(0, 2).map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                        {p.title}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                  {lead.products?.length > 2 && (
                    <span className="text-xs text-slate-500">+{lead.products.length - 2}</span>
                  )}
                </div>
              ),
            },
            {
              key: 'interest',
              label: 'Interest',
              render: (lead) => {
                if (!lead.interestLevel) return <span className="text-xs text-slate-400">-</span>;
                const colorClass = lead.interestLevel === 'HOT'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : lead.interestLevel === 'WARM'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
                return (
                  <Badge className={`text-xs font-medium ${colorClass}`}>
                    {lead.interestLevel}
                  </Badge>
                );
              },
            },
            {
              key: 'financial',
              label: 'Financial Info',
              render: (lead) => {
                if (!(lead.arcAmount || lead.otcAmount)) {
                  return (
                    <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      Pending Entry
                    </Badge>
                  );
                }
                return (
                  <div className="space-y-1">
                    {lead.arcAmount && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">ARC:</span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(lead.arcAmount)}
                        </span>
                      </div>
                    )}
                    {lead.otcAmount && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">OTC:</span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(lead.otcAmount)}
                        </span>
                      </div>
                    )}
                    {lead.documents?.ADVANCE_OTC?.paymentMethod && (
                      <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {lead.documents.ADVANCE_OTC.paymentMethod === 'cheque' ? 'Cheque' :
                           lead.documents.ADVANCE_OTC.paymentMethod === 'neft' ? 'NEFT' :
                           lead.documents.ADVANCE_OTC.paymentMethod === 'mail_approval' ? 'Mail Approval' :
                           lead.documents.ADVANCE_OTC.paymentMethod}
                          {lead.documents.ADVANCE_OTC.referenceNumber && (
                            <span className="ml-1 font-medium">#{lead.documents.ADVANCE_OTC.referenceNumber}</span>
                          )}
                        </span>
                        {(lead.documents.ADVANCE_OTC.amount || lead.documents.ADVANCE_OTC.date) && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            {lead.documents.ADVANCE_OTC.amount && (
                              <span className="font-medium">₹{parseFloat(lead.documents.ADVANCE_OTC.amount).toLocaleString('en-IN')}</span>
                            )}
                            {lead.documents.ADVANCE_OTC.amount && lead.documents.ADVANCE_OTC.date && ' • '}
                            {lead.documents.ADVANCE_OTC.date && (
                              <span>{new Date(lead.documents.ADVANCE_OTC.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'documents',
              label: 'Documents',
              render: (lead) => (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                    <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {getDocumentsCount(lead.documents)} files
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={10} />
                      Docs verified
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'bdm',
              label: 'BDM',
              render: (lead) => (
                <div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                    {lead.bdm?.name || '-'}
                  </div>
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
                        {lead.dataCreatedBy?.name || 'Unknown'}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {(lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]'))
                        ? (lead.campaign?.name?.replace(/^\[Self\]\s*/i, '') || '-')
                        : (lead.campaign?.name || '-')
                      }
                    </span>
                  </div>
                </div>
              ),
            },
          ]}
          actions={(lead) => (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewDetails(lead)}
                className="h-8 px-3 text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Eye size={14} className="mr-1" />
                View
              </Button>
              {!isBDMTeamLeader && (
                <Button
                  size="sm"
                  onClick={() => handleOpenDisposition(lead)}
                  className="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <IndianRupee size={14} className="mr-1" />
                  Verify
                </Button>
              )}
            </div>
          )}
          pagination={true}
          defaultPageSize={10}
          emptyMessage="No pending verifications"
          emptyIcon={ClipboardCheck}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isBDM ? 'Accounts Review - Rejected Leads' : 'Accounts Verification'}
            </h1>
            {isBDMTeamLeader && (
              <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs">
                Read-Only View
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">
            {isBDM
              ? 'Review and update pricing for leads rejected by accounts team'
              : 'Verify financial details for leads approved by docs team'
            }
          </p>
        </div>
      </div>

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
       

      {/* Details Modal */}
      {showDetailsModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Lead Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {selectedLead.company}
                </p>
              </div>
              <button
                onClick={() => { setShowDetailsModal(false); setIsEditingApproved(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 sm:p-5 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      {selectedLead.fullAddress || selectedLead.location || selectedLead.city || '-'}
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
                    <Calendar size={16} />
                    Expected Delivery Date
                  </h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Verification Status (for history items) */}
              {selectedLead.accountsStatus && (
                <div className={`p-4 rounded-xl border ${
                  selectedLead.accountsStatus === 'ACCOUNTS_APPROVED'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedLead.accountsStatus === 'ACCOUNTS_APPROVED' ? (
                      <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={18} className="text-red-600 dark:text-red-400" />
                    )}
                    <h4 className={`text-sm font-semibold ${
                      selectedLead.accountsStatus === 'ACCOUNTS_APPROVED'
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {selectedLead.accountsStatus === 'ACCOUNTS_APPROVED' ? 'Approved by Accounts' : 'Rejected by Accounts'}
                    </h4>
                  </div>
                  {selectedLead.accountsVerifiedAt && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      Reviewed on {formatDate(selectedLead.accountsVerifiedAt)}
                    </p>
                  )}
                  {selectedLead.accountsRejectionReason && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-900 dark:text-red-100">{selectedLead.accountsRejectionReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Interest Level */}
              {selectedLead.interestLevel && (
                <div className={`p-4 rounded-xl border ${
                  selectedLead.interestLevel === 'HOT'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : selectedLead.interestLevel === 'WARM'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                    selectedLead.interestLevel === 'HOT'
                      ? 'text-red-800 dark:text-red-300'
                      : selectedLead.interestLevel === 'WARM'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-blue-800 dark:text-blue-300'
                  }`}>
                    <TrendingUp size={16} />
                    Interest Level
                  </h4>
                  <Badge className={`text-sm font-semibold ${
                    selectedLead.interestLevel === 'HOT'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : selectedLead.interestLevel === 'WARM'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {selectedLead.interestLevel}
                  </Badge>
                </div>
              )}

              {/* Financial Details - Editable for BDM on rejected leads */}
              {(isBDM && selectedLead.accountsStatus === 'ACCOUNTS_REJECTED') ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <IndianRupee size={16} />
                    Update Pricing
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs text-red-600 dark:text-red-400 mb-1">ARC (Monthly)</label>
                      <Input
                        type="number"
                        value={editArc}
                        onChange={(e) => setEditArc(e.target.value)}
                        placeholder="Enter ARC"
                        className="text-sm h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-red-600 dark:text-red-400 mb-1">OTC (One-time)</label>
                      <Input
                        type="number"
                        value={editOtc}
                        onChange={(e) => setEditOtc(e.target.value)}
                        placeholder="Enter OTC"
                        className="text-sm h-10"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleUpdateFinancials}
                    disabled={isUpdating}
                    className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update & Resubmit for Review'
                    )}
                  </Button>
                </div>
              ) : (selectedLead.arcAmount || selectedLead.otcAmount) && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <IndianRupee size={16} />
                    Financial Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {selectedLead.arcAmount && (
                      <div>
                        <p className="text-xs text-orange-600 dark:text-orange-400">ARC (Monthly)</p>
                        <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                          {formatCurrency(selectedLead.arcAmount)}
                        </p>
                      </div>
                    )}
                    {selectedLead.otcAmount && (
                      <div>
                        <p className="text-xs text-orange-600 dark:text-orange-400">OTC</p>
                        <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                          {formatCurrency(selectedLead.otcAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GST Details */}
              {(selectedLead.customerGstNo || selectedLead.suggestedGstNo) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    GST Details
                    {selectedLead.gstVerifiedAt && (
                      <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">
                        Verified
                      </Badge>
                    )}
                    {!selectedLead.customerGstNo && selectedLead.suggestedGstNo && (
                      <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px]">
                        From Same Company
                      </Badge>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">GST Number</p>
                      <p className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                        {selectedLead.customerGstNo || selectedLead.suggestedGstNo}
                      </p>
                    </div>
                    {(selectedLead.customerLegalName || selectedLead.suggestedLegalName) && (
                      <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Legal Name</p>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {selectedLead.customerLegalName || selectedLead.suggestedLegalName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Complete Accounts Details - For Approved Leads */}
              {activeTab === 'approved' && selectedLead.accountsVerifiedAt && !selectedLead.accountsRejectedReason && (isAccountsTeam || isAdmin) && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle size={16} />
                      Accounts Verification Details
                    </h4>
                    {!isEditingApproved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingApproved(true)}
                        className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30"
                      >
                        <Pencil size={14} className="mr-1" />
                        Edit Details
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingApproved(false)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAccountsDetails}
                          disabled={isSavingDetails}
                          className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isSavingDetails ? (
                            <>
                              <Loader2 className="animate-spin w-3 h-3 mr-1" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={14} className="mr-1" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingApproved ? (
                    // Edit Mode
                    <div className="space-y-4">
                      {/* Financial Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">ARC Amount</Label>
                          <Input
                            type="number"
                            value={arcAmount}
                            disabled
                            className="h-9 text-sm mt-1 bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">OTC Amount</Label>
                          <Input
                            type="number"
                            value={otcAmount}
                            disabled
                            className="h-9 text-sm mt-1 bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Advance Amount</Label>
                          <Input
                            type="number"
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(e.target.value)}
                            className="h-9 text-sm mt-1"
                            placeholder="₹"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Payment Terms</Label>
                          <Input
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            className="h-9 text-sm mt-1"
                            placeholder="e.g., Net 30"
                          />
                        </div>
                      </div>

                      {/* Company & Tax Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">GST Number</Label>
                          <Input
                            value={customerGstNo}
                            onChange={(e) => setCustomerGstNo(e.target.value.toUpperCase())}
                            className="h-9 text-sm mt-1 font-mono"
                            maxLength={15}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Legal Name</Label>
                          <Input
                            value={customerLegalName}
                            onChange={(e) => setCustomerLegalName(e.target.value)}
                            className="h-9 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">PAN Number</Label>
                          <Input
                            value={panCardNo}
                            onChange={(e) => setPanCardNo(e.target.value.toUpperCase())}
                            className="h-9 text-sm mt-1 font-mono"
                            maxLength={10}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">TAN Number</Label>
                          <Input
                            value={tanNumber}
                            onChange={(e) => setTanNumber(e.target.value.toUpperCase())}
                            className="h-9 text-sm mt-1 font-mono"
                            maxLength={10}
                          />
                        </div>
                      </div>

                      {/* Address Details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Billing Address</Label>
                          <Input
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value)}
                            className="h-9 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Billing Pincode</Label>
                          <Input
                            value={billingPincode}
                            onChange={(e) => setBillingPincode(e.target.value)}
                            className="h-9 text-sm mt-1"
                            maxLength={6}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Installation Address</Label>
                          <Input
                            value={installationAddress}
                            onChange={(e) => setInstallationAddress(e.target.value)}
                            className="h-9 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 dark:text-green-400">Installation Pincode</Label>
                          <Input
                            value={installationPincode}
                            onChange={(e) => setInstallationPincode(e.target.value)}
                            className="h-9 text-sm mt-1"
                            maxLength={6}
                          />
                        </div>
                      </div>

                      {/* PO Details */}
                      <div>
                        <Label className="text-xs text-green-700 dark:text-green-400">PO Number</Label>
                        <Input
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-4">
                      {/* Financial Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">ARC Amount</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.arcAmount ? formatCurrency(selectedLead.arcAmount) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">OTC Amount</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.otcAmount ? formatCurrency(selectedLead.otcAmount) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Advance Amount</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.advanceAmount ? formatCurrency(selectedLead.advanceAmount) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Payment Terms</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.paymentTerms || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Company & Tax Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">GST Number</p>
                          <p className="text-sm font-mono font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.customerGstNo || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Legal Name</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.customerLegalName || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">PAN Number</p>
                          <p className="text-sm font-mono font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.panCardNo || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">TAN Number</p>
                          <p className="text-sm font-mono font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.tanNumber || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Address Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Billing Address</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.billingAddress || '-'}
                            {selectedLead.billingPincode && ` - ${selectedLead.billingPincode}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Installation Address</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {selectedLead.installationAddress || '-'}
                            {selectedLead.installationPincode && ` - ${selectedLead.installationPincode}`}
                          </p>
                        </div>
                      </div>

                      {/* Expected Delivery Date */}
                      {selectedLead.expectedDeliveryDate && (
                        <div>
                          <p className="text-xs text-cyan-600 dark:text-cyan-400">Expected Delivery Date</p>
                          <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                            {new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      )}

                      {/* PO Details */}
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-400">PO Number</p>
                        <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                          {selectedLead.poNumber || '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advance OTC Payment Details */}
              {selectedLead.documents?.ADVANCE_OTC?.paymentMethod && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                    <IndianRupee size={16} />
                    Advance OTC Payment Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Payment Method</p>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 capitalize">
                        {selectedLead.documents.ADVANCE_OTC.paymentMethod === 'cheque' ? 'Cheque' :
                         selectedLead.documents.ADVANCE_OTC.paymentMethod === 'neft' ? 'NEFT' :
                         selectedLead.documents.ADVANCE_OTC.paymentMethod === 'mail_approval' ? 'Mail Approval' :
                         selectedLead.documents.ADVANCE_OTC.paymentMethod}
                      </p>
                    </div>
                    {selectedLead.documents.ADVANCE_OTC.referenceNumber && (
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {selectedLead.documents.ADVANCE_OTC.paymentMethod === 'cheque' ? 'Cheque Number' :
                           selectedLead.documents.ADVANCE_OTC.paymentMethod === 'neft' ? 'UTR Number' :
                           'Reference'}
                        </p>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {selectedLead.documents.ADVANCE_OTC.referenceNumber}
                        </p>
                      </div>
                    )}
                    {selectedLead.documents.ADVANCE_OTC.amount && (
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Amount</p>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          ₹{parseFloat(selectedLead.documents.ADVANCE_OTC.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {selectedLead.documents.ADVANCE_OTC.date && (
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {selectedLead.documents.ADVANCE_OTC.paymentMethod === 'cheque' ? 'Cheque Date' : 'Date'}
                        </p>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {new Date(selectedLead.documents.ADVANCE_OTC.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
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
                      return (
                        <div key={doc.documentType || index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getFileIcon(doc.mimetype)}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {doc.originalName}
                                </p>
                                {docTypeInfo && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                    {docTypeInfo.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatFileSize(doc.size)}
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
                              href={getPreviewUrl(doc)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Open in New Tab"
                            >
                              <ExternalLink size={18} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No documents uploaded</p>
                )}
              </div>

              {/* Vendor Verification (Independent) */}
              {selectedLead.vendor && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Building2 size={16} />
                      Vendor Verification
                      <Badge className={`text-xs ml-1 ${
                        selectedLead.vendor.docsStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        selectedLead.vendor.docsStatus === 'UPLOADED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        selectedLead.vendor.docsStatus === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {selectedLead.vendor.docsStatus || 'PENDING'}
                      </Badge>
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Vendor Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Vendor Name</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.companyName}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Type</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {selectedLead.vendor.vendorType === 'INDIVIDUAL' ? 'Individual' : 'Company'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Category</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.category?.replace(/_/g, ' ') || '-'}</p>
                      </div>
                      {selectedLead.vendor.gstNumber && (
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">GST</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.gstNumber}</p>
                        </div>
                      )}
                      {selectedLead.vendor.panNumber && (
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">PAN</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.panNumber}</p>
                        </div>
                      )}
                    </div>

                    {/* Vendor Documents */}
                    {selectedLead.vendor.docsStatus === 'UPLOADED' && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Vendor Documents</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {selectedLead.vendor.panDocument && (
                            <a href={selectedLead.vendor.panDocument} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <FileText size={14} /> PAN Document <ExternalLink size={12} />
                            </a>
                          )}
                          {selectedLead.vendor.gstDocument && (
                            <a href={selectedLead.vendor.gstDocument} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <FileText size={14} /> GST Document <ExternalLink size={12} />
                            </a>
                          )}
                          {selectedLead.vendor.cancelledCheque && (
                            <a href={selectedLead.vendor.cancelledCheque} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <FileText size={14} /> Cancelled Cheque <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        {/* Bank Details */}
                        {selectedLead.vendor.accountNumber && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-2">
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">A/C Name</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.accountName || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">A/C Number</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.accountNumber}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">IFSC</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.ifscCode || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Bank</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendor.bankName || '-'}</p>
                            </div>
                          </div>
                        )}

                        {/* Verify / Reject Buttons */}
                        {(isAccountsTeam || isAdmin) && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                setVendorVerifyProcessing(true);
                                const r = await verifyVendorDocs(selectedLead.vendor.id, 'VERIFIED');
                                if (r.success) {
                                  toast.success('Vendor documents verified');
                                  setSelectedLead(prev => ({ ...prev, vendor: { ...prev.vendor, docsStatus: 'VERIFIED' } }));
                                } else toast.error(r.error || 'Failed');
                                setVendorVerifyProcessing(false);
                              }}
                              disabled={vendorVerifyProcessing}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              {vendorVerifyProcessing ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle size={14} className="mr-1" />}
                              Verify Docs
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const reason = prompt('Reason for rejecting vendor documents:');
                                if (!reason) return;
                                setVendorVerifyProcessing(true);
                                const r = await verifyVendorDocs(selectedLead.vendor.id, 'REJECTED', reason);
                                if (r.success) {
                                  toast.success('Vendor documents rejected');
                                  setSelectedLead(prev => ({ ...prev, vendor: { ...prev.vendor, docsStatus: 'REJECTED' } }));
                                } else toast.error(r.error || 'Failed');
                                setVendorVerifyProcessing(false);
                              }}
                              disabled={vendorVerifyProcessing}
                              className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs"
                            >
                              <XCircle size={14} className="mr-1" /> Reject Docs
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pending docs warning */}
                    {selectedLead.vendor.docsStatus === 'PENDING' && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                        <AlertCircle size={14} /> Vendor documents not yet uploaded by feasibility team
                      </div>
                    )}

                    {/* Verified badge */}
                    {selectedLead.vendor.docsStatus === 'VERIFIED' && (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle size={14} /> Vendor documents verified
                      </div>
                    )}

                    {/* Rejected */}
                    {selectedLead.vendor.docsStatus === 'REJECTED' && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300">
                        <XCircle size={14} /> Vendor documents rejected
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MOMs */}
              {leadMOMs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Meeting History ({leadMOMs.length})
                  </h4>
                  <div className="space-y-2">
                    {leadMOMs.map(mom => (
                      <div key={mom.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {formatDate(mom.meetingDate)}
                          </span>
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

            <div className="flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => { setShowDetailsModal(false); setIsEditingApproved(false); }}
                className="border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                size="sm"
              >
                Close
              </Button>
              {activeTab === 'pending' && !isBDMTeamLeader && (
                <Button
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenDisposition(selectedLead);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm"
                >
                  <DollarSign size={16} className="mr-1" />
                  Verify Financials
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disposition Dialog - Customer Details Form */}
      {!isBDMTeamLeader && showDispositionDialog && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Accounts Verification
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                  {selectedLead.company} | Fields marked with * are mandatory
                </p>
              </div>
              <button
                onClick={() => setShowDispositionDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Decision Selection */}
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                  Decision
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDecision('APPROVED')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      decision === 'APPROVED'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle className={`w-6 h-6 ${
                      decision === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      decision === 'APPROVED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      Approve
                    </span>
                  </button>
                  <button
                    onClick={() => setDecision('REJECTED')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      decision === 'REJECTED'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
                    }`}
                  >
                    <XCircle className={`w-6 h-6 ${
                      decision === 'REJECTED' ? 'text-red-600' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      decision === 'REJECTED' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      Reject
                    </span>
                  </button>
                </div>
              </div>

              {/* Rejection Reason (shown for REJECTED) */}
              {decision === 'REJECTED' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-700 dark:text-red-400">
                    Reason for Rejection *
                  </Label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    className="w-full h-24 px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {/* Customer Details Form (shown for APPROVED) */}
              {decision === 'APPROVED' && (
                <div className="space-y-4">
                  {/* Test Prefill Button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompanyName(companyName || 'Test Company Pvt Ltd');
                        setCustomerGstNo(customerGstNo || '27AABCU9603R1ZM');
                        setPanCardNo(panCardNo || 'AAAAA1234A');
                        setTanNumber(tanNumber || 'MUMA12345B');
                        setCustomerLegalName(customerLegalName || 'Test Company Private Limited');
                        setBillingAddress(billingAddress || '123, Test Building, MG Road, Andheri East');
                        setBillingPincode(billingPincode || '400069');
                        setInstallationAddress(installationAddress || '456, Tech Park, Powai');
                        setInstallationPincode(installationPincode || '400076');
                        setPoNumber(poNumber || 'PO-2024-001');
                        setArcAmount(arcAmount || '15000');
                        setOtcAmount(otcAmount || '5000');
                        toast.success('Test data prefilled!');
                      }}
                      className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    >
                      Prefill Test Data
                    </Button>
                  </div>

                  {/* Bento Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                    {/* Company & Tax Details - spans full width */}
                    <div className="lg:col-span-2 p-4 bg-orange-50/60 dark:bg-orange-900/10 rounded-xl border border-orange-200/60 dark:border-orange-800/40">
                      <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <Building2 size={14} />
                        Company & Tax Details
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-1 block">Company Name *</Label>
                          <Input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Enter company name"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-1 block">GST Number *</Label>
                          <Input
                            type="text"
                            value={customerGstNo}
                            onChange={(e) => setCustomerGstNo(e.target.value.toUpperCase())}
                            placeholder="e.g., 27AABCU9603R1ZM"
                            maxLength={15}
                            className="h-9 text-sm font-mono uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-1 block">PAN Card No *</Label>
                          <Input
                            type="text"
                            value={panCardNo}
                            onChange={(e) => setPanCardNo(e.target.value.toUpperCase())}
                            placeholder="e.g., AAAAA1234A"
                            maxLength={10}
                            className="h-9 text-sm font-mono uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-1 block">TAN Number *</Label>
                          <Input
                            type="text"
                            value={tanNumber}
                            onChange={(e) => setTanNumber(e.target.value.toUpperCase())}
                            placeholder="Enter TAN number"
                            className="h-9 text-sm font-mono uppercase"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-1 block">Legal Name (as per GST) *</Label>
                          <Input
                            type="text"
                            value={customerLegalName}
                            onChange={(e) => setCustomerLegalName(e.target.value)}
                            placeholder="Enter legal name as per GST certificate"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="p-4 bg-blue-50/60 dark:bg-blue-900/10 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
                      <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <MapPin size={14} />
                        Billing Address
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-1 block">Address * (100 char limit)</Label>
                          <Input
                            type="text"
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value.slice(0, 100))}
                            placeholder="Enter billing address"
                            maxLength={100}
                            className="h-9 text-sm"
                          />
                          <p className="text-[10px] text-blue-400 mt-0.5">{billingAddress.length}/100 characters</p>
                        </div>
                        <div>
                          <Label className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-1 block">Pincode *</Label>
                          <Input
                            type="text"
                            value={billingPincode}
                            onChange={(e) => setBillingPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="h-9 text-sm w-32"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Installation Address */}
                    <div className="p-4 bg-violet-50/60 dark:bg-violet-900/10 rounded-xl border border-violet-200/60 dark:border-violet-800/40">
                      <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <MapPin size={14} />
                        Installation Address
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-violet-600/80 dark:text-violet-400/80 mb-1 block">Address * (100 char limit)</Label>
                          <Input
                            type="text"
                            value={installationAddress}
                            onChange={(e) => setInstallationAddress(e.target.value.slice(0, 100))}
                            placeholder="Enter installation address"
                            maxLength={100}
                            className="h-9 text-sm"
                          />
                          <p className="text-[10px] text-violet-400 mt-0.5">{installationAddress.length}/100 characters</p>
                        </div>
                        <div>
                          <Label className="text-xs text-violet-600/80 dark:text-violet-400/80 mb-1 block">Pincode *</Label>
                          <Input
                            type="text"
                            value={installationPincode}
                            onChange={(e) => setInstallationPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="h-9 text-sm w-32"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PO Number */}
                    <div className="p-4 bg-amber-50/60 dark:bg-amber-900/10 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                      <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <FileText size={14} />
                        PO Details
                      </h4>
                      <div>
                        <Label className="text-xs text-amber-600/80 dark:text-amber-400/80 mb-1 block">PO Number *</Label>
                        <Input
                          type="text"
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          placeholder="Enter PO number"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-900/10 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                      <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <IndianRupee size={14} />
                        Financial Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1 block">ARC (Monthly) *</Label>
                          <Input
                            type="number"
                            value={arcAmount}
                            disabled
                            className="h-9 text-sm bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1 block">OTC (One-time) *</Label>
                          <Input
                            type="number"
                            value={otcAmount}
                            disabled
                            className="h-9 text-sm bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1 block">Advance Amount</Label>
                          <Input
                            type="number"
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(e.target.value)}
                            placeholder="Enter advance"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-1 block">Payment Terms</Label>
                          <Input
                            type="text"
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            placeholder="e.g., Net 30"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowDispositionDialog(false)}
                disabled={isSaving}
                className="border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDisposition}
                disabled={!decision || isSaving}
                size="sm"
                className={`text-white text-xs sm:text-sm ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decision === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {decision === 'APPROVED' ? <CheckCircle size={16} className="mr-1" /> : <XCircle size={16} className="mr-1" />}
                    {decision === 'APPROVED' ? 'Approve & Save' : 'Reject'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocPreview && previewDoc && (
        <div data-modal className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {getFileIcon(previewDoc.mimetype)}
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                    {previewDoc.originalName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(previewDoc.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getPreviewUrl(previewDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Open in New Tab"
                >
                  <ExternalLink size={20} />
                </a>
                <button
                  onClick={() => setShowDocPreview(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              {isImageFile(previewDoc) ? (
                <img
                  src={getDocumentUrl(previewDoc)}
                  alt={previewDoc.originalName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : isPdfFile(previewDoc) ? (
                <iframe
                  src={getPreviewUrl(previewDoc)}
                  title={previewDoc.originalName}
                  className="w-full h-[70vh] rounded-lg"
                />
              ) : (
                <div className="text-center p-8">
                  <File className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Preview not available for this file type
                  </p>
                  <a
                    href={getPreviewUrl(previewDoc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <ExternalLink size={16} />
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
