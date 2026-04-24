'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useProductStore, useEmailStore, useUserStore } from '@/lib/store';
import api from '@/lib/api';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import {
  Search,
  FileText,
  Mail,
  Phone,
  Building2,
  MapPin,
  Send,
  CheckCircle,
  Package,
  User,
  Upload,
  Paperclip,
  X,
  Trash2,
  ShieldCheck,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  IndianRupee,
  Truck,
  ArrowRight,
  ChevronRight,
  Eye,
  ExternalLink,
  Loader2,
  DollarSign,
  FileCheck,
  Wifi,
  Network,
  Cable,
  Percent,
  Radio,
  Plus,
  History,
  AtSign,
  Link2,
  Copy,
  UserPlus,
  Users,
  Hash,
  Zap,
  LogIn,
  MessageCircle
} from 'lucide-react';
import DocumentUploadSlot from '@/components/DocumentUploadSlot';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import { getAllDocumentTypes, getUploadProgress, getMissingDocuments, getDocumentTypeById, getRequiredCount } from '@/lib/documentTypes';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

// Stage configuration with explicit Tailwind classes for proper purging
const STAGES = [
  {
    id: 'create_quote',
    label: 'Create Quote',
    icon: FileText,
    activeClasses: {
      container: 'bg-orange-100 dark:bg-orange-900/40 border-2 border-orange-500 dark:border-orange-400',
      icon: 'bg-orange-600 text-white',
      badge: 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200'
    },
    rowClasses: 'bg-orange-50/60 dark:bg-orange-950/20 border-l-4 border-l-orange-500'
  },
  {
    id: 'approval',
    label: 'Approval',
    icon: ShieldCheck,
    activeClasses: {
      container: 'bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-500 dark:border-amber-400',
      icon: 'bg-amber-600 text-white',
      badge: 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200'
    },
    rowClasses: 'bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-500'
  },
  {
    id: 'share_customer',
    label: 'Share with Customer',
    icon: Send,
    activeClasses: {
      container: 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 dark:border-blue-400',
      icon: 'bg-blue-600 text-white',
      badge: 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
    },
    rowClasses: 'bg-blue-50/60 dark:bg-blue-950/20 border-l-4 border-l-blue-500'
  },
  {
    id: 'login',
    label: 'Login',
    icon: LogIn,
    activeClasses: {
      container: 'bg-cyan-100 dark:bg-cyan-900/40 border-2 border-cyan-500 dark:border-cyan-400',
      icon: 'bg-cyan-600 text-white',
      badge: 'bg-cyan-200 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200'
    },
    rowClasses: 'bg-cyan-50/60 dark:bg-cyan-950/20 border-l-4 border-l-cyan-500'
  },
  {
    id: 'docs_upload',
    label: 'Docs Upload',
    icon: Upload,
    activeClasses: {
      container: 'bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-500 dark:border-indigo-400',
      icon: 'bg-indigo-600 text-white',
      badge: 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200'
    },
    rowClasses: 'bg-indigo-50/60 dark:bg-indigo-950/20 border-l-4 border-l-indigo-500'
  },
  {
    id: 'docs_review',
    label: 'Docs Verification',
    icon: FileCheck,
    activeClasses: {
      container: 'bg-teal-100 dark:bg-teal-900/40 border-2 border-teal-500 dark:border-teal-400',
      icon: 'bg-teal-600 text-white',
      badge: 'bg-teal-200 dark:bg-teal-800 text-teal-700 dark:text-teal-200'
    },
    rowClasses: 'bg-teal-50/60 dark:bg-teal-950/20 border-l-4 border-l-teal-500'
  },
  {
    id: 'accounts_review',
    label: 'Accounts Review',
    icon: DollarSign,
    activeClasses: {
      container: 'bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-500 dark:border-emerald-400',
      icon: 'bg-emerald-600 text-white',
      badge: 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200'
    },
    rowClasses: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500'
  },
  {
    id: 'installation',
    label: 'Installation',
    icon: Truck,
    activeClasses: {
      container: 'bg-green-100 dark:bg-green-900/40 border-2 border-green-500 dark:border-green-400',
      icon: 'bg-green-600 text-white',
      badge: 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-200'
    },
    rowClasses: 'bg-green-50/60 dark:bg-green-950/20 border-l-4 border-l-green-500'
  }
];

export default function QuotationManagementPage() {
  const router = useRouter();
  const { user, isBDM: _isBDM, isBDMCP, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const isBDM = isMaster ? false : _isBDM;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const canAccessBDM = isBDM || isBDMCP || isBDMTeamLeader || isAdmin;
  const {
    leads,
    isLoading,
    fetchLeads,
    updateLead,
    uploadDocument,
    removeDocument,
    getLeadDocuments,
    pushToDocsVerificationTyped,
    markLoginComplete,
    pushToInstallation,
    generateUploadLink,
    getUploadLinks,
    revokeUploadLink,
    setUploadMethod,
    updateFinancialDetails
  } = useLeadStore();

  const { products: allProducts, fetchProducts } = useProductStore();
  const { sendQuotationEmail, isSending: isEmailSending } = useEmailStore();
  const { fetchUsersByRole } = useUserStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStage, setActiveStage] = useState('create_quote');
  const [selectedLead, setSelectedLead] = useState(null);

  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Form states
  const [isSaving, setIsSaving] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [leadDocuments, setLeadDocuments] = useState({});
  const [uploadingType, setUploadingType] = useState(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Quote details
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [quoteDetails, setQuoteDetails] = useState({
    bandwidth: '',
    numberOfIPs: '',
    arcAmount: '',
    otcAmount: ''
  });

  // Share with customer form (enhanced for server-side email)
  const [shareForm, setShareForm] = useState({
    to: '',
    cc: '',
    subject: '',
    customerName: '',
    quotationAmount: '',
    arc: '',
    otc: '',
    bandwidth: '',
    numberOfIPs: '',
    products: [],
    location: '',
    senderName: '',
    senderDesignation: '',
    senderPhone: '',
    senderEmail: ''
  });

  // Quotation attachments (optional, sent to OPS and Admin)
  const [quotationAttachments, setQuotationAttachments] = useState([]);
  const [isUploadingQuoteAttachment, setIsUploadingQuoteAttachment] = useState(false);
  const quoteAttachmentInputRef = React.useRef(null);

  // Email attachments
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = React.useRef(null);

  // Installation notes
  const [installationNotes, setInstallationNotes] = useState('');
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [selectedDeliveryUser, setSelectedDeliveryUser] = useState('');
  const [isLoadingDeliveryUsers, setIsLoadingDeliveryUsers] = useState(false);

  // Docs upload modal states
  const [showDocsUploadModal, setShowDocsUploadModal] = useState(false);
  const [uploadMethod, setUploadMethodState] = useState('bdm'); // 'bdm' or 'customer'
  const [uploadLinks, setUploadLinks] = useState([]);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState('');
  const [linkExpiryDays, setLinkExpiryDays] = useState(7);
  const [customerNote, setCustomerNote] = useState('');
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [selectedDocsForLink, setSelectedDocsForLink] = useState([]);

  // Advance OTC specific states
  const [advanceOtcMethod, setAdvanceOtcMethod] = useState(''); // 'cheque' | 'neft' | 'mail_approval'
  const [advanceOtcReference, setAdvanceOtcReference] = useState(''); // cheque number or UTR
  const [advanceOtcAmount, setAdvanceOtcAmount] = useState('');
  const [advanceOtcDate, setAdvanceOtcDate] = useState('');

  // Editable ARC/OTC amounts
  const [editableArc, setEditableArc] = useState('');
  const [editableOtc, setEditableOtc] = useState('');

  // Accounts rejected edit modal
  const [showAccountsRejectedModal, setShowAccountsRejectedModal] = useState(false);
  const [rejectedEditArc, setRejectedEditArc] = useState('');
  const [rejectedEditOtc, setRejectedEditOtc] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showQuoteModal, () => !isSaving && setShowQuoteModal(false));
  useModal(showShareModal, () => !isSaving && setShowShareModal(false));
  useModal(showDetailsModal, () => setShowDetailsModal(false));
  useModal(showInstallationModal, () => !isSaving && setShowInstallationModal(false));
  useModal(showLoginModal, () => !isSaving && setShowLoginModal(false));
  useModal(showDocsUploadModal, () => setShowDocsUploadModal(false));
  useModal(showAccountsRejectedModal, () => !isResubmitting && setShowAccountsRejectedModal(false));

  useEffect(() => {
    if (user && !isAdmin && !canAccessBDM) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, canAccessBDM, router]);

  // Opportunity Pipeline only shows leads whose status is FEASIBLE. Bare
  // fetchLeads() pulls the 25 newest regardless of status, so if recent
  // activity created a lot of NEW / QUALIFIED / FOLLOW_UP leads, the
  // FEASIBLE ones get pushed off page 1 and the UI looks empty even when
  // the sidebar badge says otherwise. Filter server-side and ask for a
  // big-enough page to cover realistic quotation-pipeline volume.
  const refreshOpportunityLeads = useCallback(
    () => fetchLeads(1, 500, { status: 'FEASIBLE' }),
    [fetchLeads]
  );

  useSocketRefresh(() => { refreshOpportunityLeads(); }, { enabled: isAdmin || canAccessBDM });

  useEffect(() => {
    refreshOpportunityLeads();
  }, [refreshOpportunityLeads]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // === HELPER FUNCTIONS ===

  // Parse feasibility notes from JSON — supports both the new simplified fields
  // (stored as direct columns) and the legacy JSON format in feasibilityNotes.
  const parseFeasibilityData = (lead) => {
    // New simplified flow: direct columns on Lead
    if (lead.feasibilityVendorType || lead.tentativeCapex != null || lead.tentativeOpex != null) {
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
    if (!lead.feasibilityNotes) return null;
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

  const getOpsStatus = (lead) => {
    if (!lead.opsApprovalStatus) return null;
    return lead.opsApprovalStatus.toLowerCase();
  };

  const getSA2Status = (lead) => {
    if (!lead.superAdmin2ApprovalStatus) return null;
    return lead.superAdmin2ApprovalStatus.toLowerCase();
  };

  const getDocsStatus = (lead) => {
    if (!lead.sharedVia?.includes('docs_verification')) return null;
    if (lead.docsVerifiedAt) {
      return lead.docsRejectedReason ? 'rejected' : 'approved';
    }
    return 'pending';
  };

  const getAccountsStatus = (lead) => {
    if (!lead.docsVerifiedAt || lead.docsRejectedReason) return null;
    if (lead.accountsVerifiedAt) {
      return lead.accountsRejectedReason ? 'rejected' : 'approved';
    }
    return 'pending';
  };

  const hasSharedWithCustomer = (lead) => {
    return lead.sharedVia?.includes('email') || lead.sharedVia?.includes('whatsapp');
  };

  const isPushedToInstallation = (lead) => {
    return !!lead.pushedToInstallationAt;
  };

  // === CATEGORIZE LEADS BY STAGE ===

  const feasibleLeads = leads.filter(lead => lead.status === 'FEASIBLE');

  // Check if docs have been pushed for verification
  const isPushedForDocsVerification = (lead) => {
    return lead.sharedVia?.includes('docs_verification');
  };

  const categorizedLeads = {
    // Stage 1: Create Quote - No OPS status yet
    create_quote: feasibleLeads.filter(lead => !getOpsStatus(lead)),

    // Stage 2: Approval - OPS Review + Admin Review combined
    approval: feasibleLeads.filter(lead =>
      (getOpsStatus(lead) === 'pending' || getOpsStatus(lead) === 'rejected') ||
      (getOpsStatus(lead) === 'approved' && (getSA2Status(lead) === 'pending' || getSA2Status(lead) === 'rejected'))
    ),

    // Stage 4: Share with Customer - OPS approved + SA2 approved (or null for pre-existing leads) but not shared yet
    share_customer: feasibleLeads.filter(lead =>
      getOpsStatus(lead) === 'approved' &&
      (getSA2Status(lead) === 'approved' || getSA2Status(lead) === null) &&
      !hasSharedWithCustomer(lead)
    ),

    // Stage 5: Login - Shared with customer, customer accepted quotation, awaiting login completion
    login: feasibleLeads.filter(lead =>
      hasSharedWithCustomer(lead) && !lead.loginCompletedAt && !isPushedForDocsVerification(lead)
    ),

    // Stage 6: Docs Upload - Login completed, but not pushed for verification yet
    docs_upload: feasibleLeads.filter(lead =>
      hasSharedWithCustomer(lead) && lead.loginCompletedAt && !isPushedForDocsVerification(lead)
    ),

    // Stage 5: Docs Verification - Pushed for verification, pending or rejected docs
    docs_review: feasibleLeads.filter(lead =>
      isPushedForDocsVerification(lead) &&
      (getDocsStatus(lead) === 'pending' || getDocsStatus(lead) === 'rejected')
    ),

    // Stage 6: Accounts Review - Docs approved, pending accounts only (rejected goes to docs team)
    accounts_review: feasibleLeads.filter(lead =>
      getDocsStatus(lead) === 'approved' &&
      getAccountsStatus(lead) === 'pending'
    ),

    // Stage 7: Installation - Accounts approved
    installation: feasibleLeads.filter(lead =>
      getAccountsStatus(lead) === 'approved'
    )
  };

  const currentLeads = categorizedLeads[activeStage] || [];

  // Apply search filter
  const filteredLeads = currentLeads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return [lead.company, lead.name, lead.email, lead.phone, lead.city, lead.campaign?.name]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(query));
  });

  // === HANDLERS ===

  const handleOpenQuoteModal = (lead) => {
    setSelectedLead(lead);
    // Pre-select existing products from the lead
    const existingProductIds = lead.products?.map(p => p.id) || [];
    setSelectedProducts(existingProductIds);
    setQuoteDetails({
      bandwidth: lead.bandwidthRequirement || '',
      numberOfIPs: lead.numberOfIPs || '',
      arcAmount: lead.arcAmount || lead.tentativePrice || '',
      otcAmount: lead.otcAmount || ''
    });
    setQuotationAttachments(lead.quotationAttachments || []);
    setShowQuoteModal(true);
  };

  const handleOpenShareModal = (lead) => {
    setSelectedLead(lead);
    const productNames = lead.products?.map(p => p.title) || [];
    const totalAmount = (parseFloat(lead.arcAmount) || 0) + (parseFloat(lead.otcAmount) || 0);

    setShareForm({
      to: lead.email || '',
      cc: '',
      subject: `Quotation for Internet Lease Line - ${lead.company}`,
      customerName: lead.name || lead.company || '',
      quotationAmount: `₹${totalAmount.toLocaleString('en-IN')}`,
      arc: `₹${(parseFloat(lead.arcAmount) || 0).toLocaleString('en-IN')}`,
      otc: `₹${(parseFloat(lead.otcAmount) || 0).toLocaleString('en-IN')}`,
      bandwidth: lead.bandwidthRequirement || '',
      numberOfIPs: lead.numberOfIPs ? `${lead.numberOfIPs}` : '',
      products: productNames,
      companyName: lead.company || '',
      location: lead.fullAddress || lead.location || [lead.city, lead.state].filter(Boolean).join(', ') || '',
      senderName: user?.name || '',
      senderDesignation: '',
      senderPhone: '',
      senderEmail: user?.email || ''
    });
    setEmailAttachments([]); // Reset attachments
    setShowShareModal(true);
  };

  // Handle opening docs upload modal
  const handleOpenDocsUploadModal = async (lead) => {
    setSelectedLead(lead);
    setUploadMethodState(lead.docUploadMethod || 'bdm');
    setLeadDocuments(lead.documents || {});
    setLinkExpiryDays(7);
    setCustomerNote('');
    // Initialize all documents as selected for link generation
    setSelectedDocsForLink(getAllDocumentTypes().map(d => d.id));
    // Initialize editable ARC/OTC from lead
    setEditableArc(lead.arcAmount?.toString() || '');
    setEditableOtc(lead.otcAmount?.toString() || '');
    // Reset advance OTC states
    const existingAdvanceOtc = lead.documents?.ADVANCE_OTC;
    setAdvanceOtcMethod(existingAdvanceOtc?.paymentMethod || '');
    setAdvanceOtcReference(existingAdvanceOtc?.referenceNumber || '');
    setAdvanceOtcAmount(existingAdvanceOtc?.amount || '');
    setAdvanceOtcDate(existingAdvanceOtc?.date || '');
    setShowDocsUploadModal(true);

    // Fetch existing upload links
    setIsLoadingLinks(true);
    const result = await getUploadLinks(lead.id);
    if (result.success) {
      setUploadLinks(result.links || []);
    }
    setIsLoadingLinks(false);
  };

  // Handle generating customer upload link
  const handleGenerateUploadLink = async () => {
    if (!selectedLead) return;

    if (selectedDocsForLink.length === 0) {
      toast.error('Please select at least one document type');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const result = await generateUploadLink(selectedLead.id, linkExpiryDays, customerNote, selectedDocsForLink);
      if (result.success) {
        setUploadLinks(prev => [result.uploadLink, ...prev]);
        setLastGeneratedUrl(result.uploadLink.url);
        toast.success('Upload link generated successfully!');
        setCustomerNote('');

        // Copy to clipboard
        await navigator.clipboard.writeText(result.uploadLink.url);
        toast.success('Link copied to clipboard!');
      } else {
        toast.error(result.error || 'Failed to generate link');
      }
    } catch (error) {
      toast.error('Failed to generate upload link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Handle revoking upload link
  const handleRevokeLink = async (linkId) => {
    if (!selectedLead) return;
    if (!confirm('Are you sure you want to revoke this link? The customer will no longer be able to upload documents using this link.')) return;

    const result = await revokeUploadLink(selectedLead.id, linkId);
    if (result.success) {
      setUploadLinks(prev => prev.map(link =>
        link.id === linkId ? { ...link, isActive: false } : link
      ));
      toast.success('Link revoked');
    } else {
      toast.error(result.error || 'Failed to revoke link');
    }
  };

  // Handle copying link to clipboard
  const handleCopyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShareWhatsApp = (url) => {
    const companyName = selectedLead?.companyName || 'Customer';
    const message = `Hello ${companyName},\n\nPlease upload the required documents using this link:\n${url}\n\nThank you.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShareEmail = (url) => {
    const companyName = selectedLead?.companyName || 'Customer';
    const subject = `Document Upload Request - ${companyName}`;
    const body = `Hello ${companyName},\n\nPlease upload the required documents using the link below:\n\n${url}\n\nThank you.`;
    window.open(`mailto:${selectedLead?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  // Handle switching upload method
  const handleSwitchUploadMethod = async (method) => {
    if (!selectedLead) return;
    setUploadMethodState(method);

    const result = await setUploadMethod(selectedLead.id, method);
    if (!result.success) {
      toast.error(result.error || 'Failed to set upload method');
    }
  };

  // Handle refreshing lead documents
  const refreshLeadDocuments = async () => {
    if (!selectedLead) return;
    setIsLoadingDocs(true);
    const result = await getLeadDocuments(selectedLead.id);
    if (result.success) {
      setLeadDocuments(result.documents || {});
    }
    setIsLoadingDocs(false);
  };

  // Handle attachment upload
  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploadingAttachment(true);

    for (const file of files) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        continue;
      }

      try {
        // Upload to Cloudinary via email attachment API
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5001/api/emails/upload-attachment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          setEmailAttachments(prev => [...prev, {
            filename: data.filename || file.name,
            url: data.url,
            size: file.size,
            publicId: data.publicId
          }]);
          toast.success(`${file.name} uploaded`);
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || `Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploadingAttachment(false);
    // Reset input
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (index) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleOpenDetailsModal = (lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  const handleOpenInstallationModal = async (lead) => {
    setSelectedLead(lead);
    setInstallationNotes('');
    setSelectedDeliveryUser('');
    setShowInstallationModal(true);

    // Fetch delivery team users
    setIsLoadingDeliveryUsers(true);
    try {
      const result = await fetchUsersByRole('DELIVERY_TEAM');
      if (result.success) {
        setDeliveryUsers(result.users || []);
      } else {
        toast.error(result.error || 'Failed to fetch delivery users');
      }
    } catch (error) {
      toast.error('Failed to fetch delivery users');
    }
    setIsLoadingDeliveryUsers(false);
  };

  // Document upload handlers
  const handleUploadDocument = async (documentType, file) => {
    if (!selectedLead) return;
    setUploadingType(documentType);
    try {
      const result = await uploadDocument(selectedLead.id, documentType, file);
      if (result.success) {
        setLeadDocuments(result.documents);
        toast.success(`Document uploaded`);
      } else {
        toast.error(result.error || 'Failed to upload');
      }
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploadingType(null);
    }
  };

  const handleRemoveDocument = async (documentType) => {
    if (!selectedLead) return;
    if (!confirm('Remove this document?')) return;

    try {
      const result = await removeDocument(selectedLead.id, documentType);
      if (result.success) {
        setLeadDocuments(result.documents);
        toast.success('Document removed');
      } else {
        toast.error(result.error || 'Failed to remove');
      }
    } catch (error) {
      toast.error('Failed to remove document');
    }
  };

  // Submit quote to OPS
  // Upload quotation attachment to Cloudinary
  const handleQuoteAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) { toast.error(`${file.name}: Only PDF, DOC, DOCX, JPG, PNG allowed`); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: File too large (max 10MB)`); return; }
    }
    setIsUploadingQuoteAttachment(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/emails/upload-attachment', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data) {
          setQuotationAttachments(prev => [...prev, {
            filename: res.data.filename || file.name,
            url: res.data.url,
            size: file.size,
          }]);
        }
      }
    } catch (err) {
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploadingQuoteAttachment(false);
      if (quoteAttachmentInputRef.current) quoteAttachmentInputRef.current.value = '';
    }
  };

  const handleSubmitToOps = async () => {
    if (!selectedLead) return;

    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    if (!quoteDetails.bandwidth) {
      toast.error('Please enter bandwidth requirement');
      return;
    }

    if (!quoteDetails.arcAmount) {
      toast.error('Please enter ARC amount');
      return;
    }

    const grandTotal = (parseFloat(quoteDetails.arcAmount) || 0) + (parseFloat(quoteDetails.otcAmount) || 0);

    setIsSaving(true);
    try {
      // Update lead with quote details and set OPS status to PENDING
      const result = await updateLead(selectedLead.id, {
        productIds: selectedProducts,
        bandwidthRequirement: quoteDetails.bandwidth,
        numberOfIPs: quoteDetails.numberOfIPs ? parseInt(quoteDetails.numberOfIPs) : null,
        arcAmount: parseFloat(quoteDetails.arcAmount) || 0,
        otcAmount: parseFloat(quoteDetails.otcAmount) || 0,
        quotationAttachments: quotationAttachments.length > 0 ? quotationAttachments : null,
        opsApprovalStatus: 'PENDING'
      });

      if (result.success) {
        toast.success('Quotation submitted for Sales Director approval');
        setShowQuoteModal(false);
        refreshOpportunityLeads();
      } else {
        toast.error(result.error || 'Failed to submit');
      }
    } catch (error) {
      toast.error('Failed to submit quotation');
    } finally {
      setIsSaving(false);
    }
  };

  // Share with customer via server-side email (Resend)
  const handleShareWithCustomer = async () => {
    if (!selectedLead) return;

    // Validate email
    if (!shareForm.to) {
      toast.error('Recipient email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareForm.to)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate CC emails if provided
    const ccEmails = shareForm.cc.split(',').map(e => e.trim()).filter(Boolean);
    for (const cc of ccEmails) {
      if (!emailRegex.test(cc)) {
        toast.error(`Invalid CC email: ${cc}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Prepare email data
      const emailData = {
        customerName: shareForm.customerName,
        quotationAmount: shareForm.quotationAmount,
        otc: shareForm.otc,
        arc: shareForm.arc,
        bandwidth: shareForm.bandwidth,
        products: shareForm.products,
        companyName: shareForm.companyName,
        numberOfIPs: shareForm.numberOfIPs,
        location: shareForm.location,
        senderName: shareForm.senderName,
        senderDesignation: shareForm.senderDesignation,
        senderPhone: shareForm.senderPhone,
        senderEmail: shareForm.senderEmail
      };

      // Send email via server
      const emailResult = await sendQuotationEmail({
        referenceId: selectedLead.id,
        referenceType: 'lead',
        to: shareForm.to,
        cc: ccEmails,
        subject: shareForm.subject,
        emailData,
        attachments: emailAttachments.filter(a => !a.isLocal).map(a => ({
          filename: a.filename,
          url: a.url
        }))
      });

      if (emailResult.success) {
        // Update sharedVia: keep only sharing methods (email, whatsapp), remove docs_verification
        // This ensures the lead goes to "Docs Upload" stage, not "Docs Verification"
        const currentSharedVia = selectedLead.sharedVia || '';
        const sharedMethods = currentSharedVia.split(',').filter(Boolean);

        // Keep only email and whatsapp, remove docs_verification
        const allowedMethods = ['email', 'whatsapp'];
        let newMethods = sharedMethods.filter(method => allowedMethods.includes(method));

        // Add email if not already present
        if (!newMethods.includes('email')) {
          newMethods.push('email');
        }

        const newSharedVia = newMethods.join(',');

        await updateLead(selectedLead.id, {
          sharedVia: newSharedVia,
          // Also reset docs verification fields so lead can go through the flow again
          docsVerifiedAt: null,
          docsRejectedReason: null
        });

        toast.success('Quotation email sent successfully!');
        setShowShareModal(false);
        refreshOpportunityLeads();
      } else {
        toast.error(emailResult.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSaving(false);
    }
  };

  // Bypass mode - skip email and push to docs upload stage (for testing)
  const handleBypassShare = async () => {
    if (!selectedLead) return;

    if (!confirm('BYPASS MODE: This will skip email sending and push the lead to Docs Upload stage. Continue?')) {
      return;
    }

    setIsSaving(true);
    try {
      // Update sharedVia to only 'email' - this puts it in docs_upload stage
      await updateLead(selectedLead.id, {
        sharedVia: 'email',
        docsVerifiedAt: null,
        docsRejectedReason: null
      });

      toast.success('BYPASS: Lead pushed to Docs Upload');
      setShowShareModal(false);
      refreshOpportunityLeads();
    } catch (error) {
      console.error('Bypass share error:', error);
      toast.error('Failed to bypass share');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Login modal
  const handleOpenLoginModal = (lead) => {
    setSelectedLead(lead);
    setShowLoginModal(true);
  };

  // Mark Login Complete - customer accepted quotation
  const handleMarkLoginComplete = async () => {
    if (!selectedLead) return;

    setIsSaving(true);
    try {
      const result = await markLoginComplete(selectedLead.id);
      if (result.success) {
        toast.success('Login marked complete');
        setShowLoginModal(false);
        refreshOpportunityLeads();
      } else {
        toast.error(result.error || 'Failed to mark login complete');
      }
    } catch (error) {
      toast.error('Failed to mark login complete');
    } finally {
      setIsSaving(false);
    }
  };

  // Push to installation
  const handlePushToInstallation = async () => {
    if (!selectedLead) return;

    if (!selectedDeliveryUser) {
      toast.error('Please select a delivery user');
      return;
    }

    setIsSaving(true);
    try {
      const result = await pushToInstallation(selectedLead.id, installationNotes, selectedDeliveryUser);
      if (result.success) {
        toast.success('Assigned to Delivery Team');
        setShowInstallationModal(false);
        refreshOpportunityLeads();
      } else {
        toast.error(result.error || 'Failed to push');
      }
    } catch (error) {
      toast.error('Failed to push to installation');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle opening accounts rejected edit modal
  const handleOpenAccountsRejectedModal = (lead) => {
    setSelectedLead(lead);
    setRejectedEditArc(lead.arcAmount?.toString() || '');
    setRejectedEditOtc(lead.otcAmount?.toString() || '');
    setShowAccountsRejectedModal(true);
  };

  // Handle resubmitting after accounts rejection
  const handleResubmitToAccounts = async () => {
    if (!selectedLead) return;

    setIsResubmitting(true);
    try {
      const result = await updateFinancialDetails(selectedLead.id, {
        arcAmount: rejectedEditArc ? parseFloat(rejectedEditArc) : null,
        otcAmount: rejectedEditOtc ? parseFloat(rejectedEditOtc) : null
      });

      if (result.success) {
        toast.success('Pricing updated and resubmitted to accounts team!');
        setShowAccountsRejectedModal(false);
        refreshOpportunityLeads();
      } else {
        toast.error(result.error || 'Failed to resubmit');
      }
    } catch (error) {
      toast.error('Failed to resubmit to accounts');
    } finally {
      setIsResubmitting(false);
    }
  };

  // === RENDER HELPERS ===

  const getStatusBadge = (lead) => {
    const opsStatus = getOpsStatus(lead);
    const docsStatus = getDocsStatus(lead);
    const accountsStatus = getAccountsStatus(lead);

    if (activeStage === 'create_quote') {
      return (
        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
          Ready to Quote
        </Badge>
      );
    }

    if (activeStage === 'approval') {
      const sa2Status = getSA2Status(lead);
      if (sa2Status === 'rejected') {
        return (
          <div className="space-y-1">
            <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              Sales Director Rejected
            </Badge>
            {lead.superAdmin2RejectedReason && (
              <p className="text-xs text-red-600 dark:text-red-400 max-w-[180px] truncate" title={lead.superAdmin2RejectedReason}>
                {lead.superAdmin2RejectedReason}
              </p>
            )}
          </div>
        );
      }
      return (
        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
          <Clock size={12} className="mr-1" />
          Sales Director Review
        </Badge>
      );
    }

    if (activeStage === 'share_customer') {
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
          <CheckCircle size={12} className="mr-1" />
          Fully Approved
        </Badge>
      );
    }

    if (activeStage === 'login') {
      return (
        <div className="space-y-1">
          <Badge className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
            <Clock size={12} className="mr-1" />
            Awaiting Login
          </Badge>
          {lead.arcAmount && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              ARC: {formatCurrency(lead.arcAmount)}
            </p>
          )}
        </div>
      );
    }

    if (activeStage === 'docs_upload') {
      const docCount = Object.keys(lead.documents || {}).length;
      const totalRequired = getRequiredCount();
      // Check if this lead was sent back from accounts (has rejection reason)
      const isAccountsRejected = lead.docsRejectedReason?.includes('Accounts rejected') || lead.docsRejectedReason?.includes('accounts');
      return (
        <div className="space-y-1">
          {isAccountsRejected ? (
            <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              <AlertCircle size={12} className="mr-1" />
              Re-upload Required
            </Badge>
          ) : (
            <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
              <Upload size={12} className="mr-1" />
              {docCount}/{totalRequired} Docs
            </Badge>
          )}
          {lead.docsRejectedReason && (
            <p className="text-xs text-red-600 dark:text-red-400 max-w-[180px] truncate" title={lead.docsRejectedReason}>
              {lead.docsRejectedReason}
            </p>
          )}
          {lead.docUploadMethod && !isAccountsRejected && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lead.docUploadMethod === 'customer' ? 'Customer uploading' : lead.docUploadMethod === 'mixed' ? 'Mixed upload' : 'BDM uploading'}
            </p>
          )}
        </div>
      );
    }

    if (activeStage === 'docs_review') {
      if (docsStatus === 'rejected') {
        return (
          <div className="space-y-1">
            <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              Docs Rejected
            </Badge>
            {lead.docsRejectedReason && (
              <p className="text-xs text-red-600 dark:text-red-400 max-w-[180px] truncate" title={lead.docsRejectedReason}>
                {lead.docsRejectedReason}
              </p>
            )}
          </div>
        );
      }
      return (
        <Badge className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
          <Clock size={12} className="mr-1" />
          Docs Pending
        </Badge>
      );
    }

    if (activeStage === 'accounts_review') {
      if (accountsStatus === 'rejected') {
        return (
          <div className="space-y-1">
            <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              Accounts Rejected
            </Badge>
            {lead.accountsRejectedReason && (
              <p className="text-xs text-red-600 dark:text-red-400 max-w-[180px] truncate" title={lead.accountsRejectedReason}>
                {lead.accountsRejectedReason}
              </p>
            )}
          </div>
        );
      }
      return (
        <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          <Clock size={12} className="mr-1" />
          Accounts Pending
        </Badge>
      );
    }

    if (activeStage === 'installation') {
      if (isPushedToInstallation(lead)) {
        return (
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle size={12} className="mr-1" />
            Sent to Installation
          </Badge>
        );
      }
      return (
        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          Ready for Installation
        </Badge>
      );
    }

    return null;
  };

  const getActionButton = (lead) => {
    const opsStatus = getOpsStatus(lead);
    const docsStatus = getDocsStatus(lead);
    const accountsStatus = getAccountsStatus(lead);

    if (activeStage === 'create_quote') {
      return (
        <Button
          size="icon"
          onClick={() => handleOpenQuoteModal(lead)}
          className="bg-orange-600 hover:bg-orange-700 text-white h-8 w-8"
          title="Create Quote"
        >
          <FileText size={16} />
        </Button>
      );
    }

    if (activeStage === 'approval') {
      const sa2Status = getSA2Status(lead);
      if (sa2Status === 'rejected') {
        return (
          <Button
            size="icon"
            onClick={() => handleOpenQuoteModal(lead)}
            className="bg-red-600 hover:bg-red-700 text-white h-8 w-8"
            title="Edit & Resubmit to Sales Director"
          >
            <RefreshCw size={16} />
          </Button>
        );
      }
      return null;
    }

    if (activeStage === 'share_customer') {
      return (
        <Button
          size="icon"
          onClick={() => handleOpenShareModal(lead)}
          disabled={!lead.email}
          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 h-8 w-8"
          title="Send Email"
        >
          <Mail size={16} />
        </Button>
      );
    }

    if (activeStage === 'login') {
      return (
        <Button
          size="sm"
          onClick={() => handleOpenLoginModal(lead)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white h-8"
          title="Mark Login Complete"
        >
          <LogIn size={14} className="mr-1" />
          Login
        </Button>
      );
    }

    if (activeStage === 'docs_upload') {
      return (
        <Button
          size="icon"
          onClick={() => handleOpenDocsUploadModal(lead)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 w-8"
          title="Upload Docs"
        >
          <Upload size={16} />
        </Button>
      );
    }

    if (activeStage === 'docs_review') {
      if (docsStatus === 'rejected') {
        return (
          <Button
            size="icon"
            onClick={() => handleOpenDocsUploadModal(lead)}
            className="bg-red-600 hover:bg-red-700 text-white h-8 w-8"
            title="Re-upload Docs"
          >
            <RefreshCw size={16} />
          </Button>
        );
      }
      return null;
    }

    if (activeStage === 'accounts_review') {
      if (accountsStatus === 'rejected') {
        return (
          <Button
            size="icon"
            onClick={() => handleOpenAccountsRejectedModal(lead)}
            className="bg-red-600 hover:bg-red-700 text-white h-8 w-8"
            title="Edit ARC/OTC & Resubmit"
          >
            <RefreshCw size={16} />
          </Button>
        );
      }
      return null;
    }

    if (activeStage === 'installation') {
      if (isPushedToInstallation(lead)) {
        return null;
      }
      return (
        <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]">
          <Clock size={10} className="mr-1" /> Ops Pending
        </Badge>
      );
    }

    return null;
  };

  const getInterestBadge = (level) => {
    const styles = {
      HOT: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      WARM: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      COLD: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    };
    return styles[level] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  if (!canAccessBDM && !isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Quotation Management" description="Manage quotations through the approval workflow" />

      {/* Workflow Progress */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const count = categorizedLeads[stage.id]?.length || 0;
              const isActive = activeStage === stage.id;
              const isPast = STAGES.findIndex(s => s.id === activeStage) > index;

              return (
                <div key={stage.id} className="flex items-center">
                  <button
                    onClick={() => setActiveStage(stage.id)}
                    className={`flex flex-col items-center min-w-[110px] p-3 rounded-xl transition-all ${
                      isActive
                        ? stage.activeClasses.container
                        : 'border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg mb-2 ${
                      isActive
                        ? stage.activeClasses.icon
                        : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <span className={`text-xs font-semibold text-center leading-tight ${
                      isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {stage.label}
                    </span>
                    <span className={`mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? stage.activeClasses.badge
                        : count > 0
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                  {index < STAGES.length - 1 && (
                    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 mx-0.5 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Search by company, name, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
        />
      </div>

      {/* Leads Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              {React.createElement(STAGES.find(s => s.id === activeStage)?.icon || FileText, { size: 48, className: 'mb-4 opacity-50' })}
              <p className="text-lg font-medium">No leads in this stage</p>
              <p className="text-sm mt-1">
                {activeStage === 'create_quote' && 'Feasible leads will appear here for quotation'}
                {activeStage === 'approval' && 'Leads pending OPS or admin approval will appear here'}
                {activeStage === 'share_customer' && 'Fully approved leads ready to share will appear here'}
                {activeStage === 'login' && 'Leads awaiting customer login confirmation will appear here'}
                {activeStage === 'docs_upload' && 'Leads awaiting document upload will appear here'}
                {activeStage === 'docs_review' && 'Leads pending docs verification will appear here'}
                {activeStage === 'accounts_review' && 'Leads pending accounts approval will appear here'}
                {activeStage === 'installation' && 'Leads ready for installation will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Feasibility</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Products</th>
                    {activeStage !== 'create_quote' && (
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Amount</th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredLeads.map((lead) => {
                    const feasibilityData = parseFeasibilityData(lead);
                    const isSelfGenerated = lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]') || lead.campaign?.name?.startsWith('[BDM Self]') || lead.campaign?.name?.startsWith('[SAM Self]');
                    const cleanCampaignName = lead.campaign?.name?.replace(/^\[(Self|BDM Self|SAM Self)\]\s*/i, '') || '-';

                    const stageConfig = STAGES.find(s => s.id === activeStage);

                    return (
                    <tr key={lead.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${stageConfig?.rowClasses || ''}`}>
                      {/* Company */}
                      <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
                            {isSelfGenerated ? (
                              <div className="flex items-center gap-1">
                                <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                  {lead.dataCreatedBy?.name || lead.createdBy?.name || 'Self Generated'}
                                </Badge>
                                {cleanCampaignName !== '-' && (
                                  <span className="text-xs text-slate-400">{cleanCampaignName}</span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">{lead.campaign?.name || '-'}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name || '-'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              {lead.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Feasibility Info */}
                      <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                        {feasibilityData && feasibilityData.vendorType ? (
                          <div className="space-y-1">
                            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                              {getVendorTypeLabel(feasibilityData.vendorType)}
                            </Badge>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {feasibilityData.vendorDetails?.capex && (
                                <p>CAPEX: ₹{feasibilityData.vendorDetails.capex}</p>
                              )}
                              {feasibilityData.vendorDetails?.opex && (
                                <p>OPEX: ₹{feasibilityData.vendorDetails.opex}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>

                      {/* Products */}
                      <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {lead.products?.slice(0, 2).map(p => (
                            <Badge key={p.id} variant="outline" className="text-xs">
                              {p.title}
                            </Badge>
                          ))}
                          {lead.products?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
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
                      </td>

                      {/* Amount - hidden in create_quote stage */}
                      {activeStage !== 'create_quote' && (
                        <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                          {lead.arcAmount ? (
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {formatCurrency(lead.arcAmount)}
                              </p>
                              <p className="text-xs text-slate-500">ARC</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                        {getStatusBadge(lead)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {getActionButton(lead)}

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDetailsModal(lead)}
                            className="text-slate-500 hover:text-slate-700 h-8 w-8"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Quote Modal */}
      {showQuoteModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {getOpsStatus(selectedLead) === 'rejected'
                      ? 'Edit & Resubmit Quotation'
                      : 'Create Quotation'
                    }
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedLead.company}</p>
                </div>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Rejection Alert */}
              {getOpsStatus(selectedLead) === 'rejected' && selectedLead.opsRejectedReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">OPS Rejection Reason:</p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">{selectedLead.opsRejectedReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval notes forwarded from OPS / Sales Director — shown
                  to the BDM on both approve and reject flows so handoff
                  context isn't lost. Quiet when neither approver left a note. */}
              {(selectedLead.opsApprovalNotes || selectedLead.superAdmin2ApprovalNotes) && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Approval Notes</p>
                  {selectedLead.opsApprovalNotes && (
                    <div>
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">OPS</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedLead.opsApprovalNotes}</p>
                    </div>
                  )}
                  {selectedLead.superAdmin2ApprovalNotes && (
                    <div>
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Sales Director</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedLead.superAdmin2ApprovalNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Feasibility Information Summary */}
              {(() => {
                const feasibilityData = parseFeasibilityData(selectedLead);
                if (!feasibilityData || !feasibilityData.vendorType) return null;

                const vendorDetails = feasibilityData.vendorDetails || {};

                return (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Feasibility Information</h4>
                      <Badge className="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 ml-auto">
                        {getVendorTypeLabel(feasibilityData.vendorType)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {vendorDetails.capex && (
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded">
                          <span className="text-slate-500">CAPEX:</span> <span className="font-medium text-slate-900 dark:text-slate-100">₹{vendorDetails.capex}</span>
                        </span>
                      )}
                      {vendorDetails.opex && (
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded">
                          <span className="text-slate-500">OPEX:</span> <span className="font-medium text-slate-900 dark:text-slate-100">₹{vendorDetails.opex}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Products Selection */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Package size={16} className="text-orange-600" />
                  Products <span className="text-red-500">*</span>
                  {selectedProducts.length > 0 && (
                    <span className="text-xs font-normal text-orange-600 dark:text-orange-400">
                      ({selectedProducts.length} selected)
                    </span>
                  )}
                </h3>
                {allProducts.length > 0 ? (() => {
                  const parentProducts = allProducts.filter(p => !p.parentId && p.children && p.children.length > 0);
                  const standaloneProducts = allProducts.filter(p => !p.parentId && (!p.children || p.children.length === 0));
                  return (
                    <div className="space-y-3">
                      {/* Parent categories (ILL, MSP, etc.) and standalone products */}
                      <div className="flex flex-wrap gap-2">
                        {parentProducts.map((parent) => {
                          const childIds = parent.children.map(c => c.id);
                          const selectedChildCount = childIds.filter(id => selectedProducts.includes(id)).length;
                          const isExpanded = expandedCategory === parent.id;
                          return (
                            <button
                              key={parent.id}
                              type="button"
                              onClick={() => setExpandedCategory(isExpanded ? null : parent.id)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                                isExpanded
                                  ? 'bg-orange-600 text-white'
                                  : selectedChildCount > 0
                                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-2 border-orange-400 dark:border-orange-500'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500'
                              }`}
                            >
                              {parent.title}
                              {selectedChildCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isExpanded ? 'bg-white/20 text-white' : 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200'}`}>
                                  {selectedChildCount}
                                </span>
                              )}
                              <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          );
                        })}
                        {standaloneProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setSelectedProducts(prev =>
                                prev.includes(product.id)
                                  ? prev.filter(id => id !== product.id)
                                  : [...prev, product.id]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              selectedProducts.includes(product.id)
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500'
                            }`}
                          >
                            {product.title}
                          </button>
                        ))}
                      </div>

                      {/* Expanded category children - auto-expand if any child is selected */}
                      {(() => {
                        const activeParent = expandedCategory
                          ? parentProducts.find(p => p.id === expandedCategory)
                          : parentProducts.find(p => p.children.some(c => selectedProducts.includes(c.id)));
                        const parent = activeParent;
                        if (!parent) return null;
                        const childProducts = allProducts.filter(p => p.parentId === parent.id);
                        return (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2">{parent.title} Products</p>
                            <div className="flex flex-wrap gap-2">
                              {childProducts.map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProducts(prev =>
                                      prev.includes(product.id)
                                        ? prev.filter(id => id !== product.id)
                                        : [...prev, product.id]
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    selectedProducts.includes(product.id)
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500'
                                  }`}
                                >
                                  {product.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })() : (
                  <span className="text-sm text-slate-400">Loading products...</span>
                )}
              </div>

              {/* Quotation Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <IndianRupee size={16} className="text-emerald-600" />
                  Quotation Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Bandwidth */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Bandwidth <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Wifi size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        value={quoteDetails.bandwidth}
                        onChange={(e) => setQuoteDetails(prev => ({ ...prev, bandwidth: e.target.value }))}
                        placeholder="e.g., 100 Mbps"
                        className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                      />
                    </div>
                  </div>

                  {/* Number of IPs */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      No. of IPs
                    </label>
                    <div className="relative">
                      <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="number"
                        value={quoteDetails.numberOfIPs}
                        onChange={(e) => setQuoteDetails(prev => ({ ...prev, numberOfIPs: e.target.value }))}
                        placeholder="e.g., 8"
                        min="1"
                        className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                      />
                    </div>
                  </div>

                  {/* ARC */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      ARC (Annual) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                      <Input
                        type="number"
                        value={quoteDetails.arcAmount}
                        onChange={(e) => setQuoteDetails(prev => ({ ...prev, arcAmount: e.target.value }))}
                        placeholder="Enter amount"
                        className="pl-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                      />
                    </div>
                  </div>

                  {/* OTC */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      OTC (One Time)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                      <Input
                        type="number"
                        value={quoteDetails.otcAmount}
                        onChange={(e) => setQuoteDetails(prev => ({ ...prev, otcAmount: e.target.value }))}
                        placeholder="Enter amount"
                        className="pl-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Quotation Attachments (optional) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Paperclip size={14} className="inline mr-1" />
                    Attachments <span className="text-xs text-slate-400 font-normal">(optional — visible to OPS & Admin)</span>
                  </label>
                  {quotationAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {quotationAttachments.map((file, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
                          <FileText size={12} />
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="max-w-[150px] truncate hover:text-blue-600">{file.filename}</a>
                          <button onClick={() => setQuotationAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-slate-400 hover:text-red-500">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    onClick={() => !isUploadingQuoteAttachment && quoteAttachmentInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors"
                  >
                    <input
                      ref={quoteAttachmentInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleQuoteAttachmentUpload}
                      className="hidden"
                    />
                    {isUploadingQuoteAttachment ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" />
                        Uploading...
                      </div>
                    ) : (
                      <>
                        <Upload size={18} className="mx-auto mb-1 text-slate-400" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Click to upload files (PDF, DOC, JPG, PNG — max 10MB each)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Grand Total */}
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Grand Total</span>
                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      ₹{((parseFloat(quoteDetails.arcAmount) || 0) + (parseFloat(quoteDetails.otcAmount) || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    ARC: ₹{(parseFloat(quoteDetails.arcAmount) || 0).toLocaleString('en-IN')} + OTC: ₹{(parseFloat(quoteDetails.otcAmount) || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This quotation will be sent to Sales Director for approval
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowQuoteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitToOps}
                  disabled={isSaving || selectedProducts.length === 0 || !quoteDetails.bandwidth || !quoteDetails.arcAmount}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Submit to Sales Director
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share with Customer Modal - Server-side Email */}
      {showShareModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header - fixed */}
            <div className="p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Send Quotation Email</h2>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{selectedLead.company}</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body - scrollable */}
            <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* OPS Approved Badge */}
              <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    OPS Approved - Ready to share with customer
                  </span>
                </div>
              </div>

              {/* Email Recipients Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <AtSign size={16} />
                  Recipients
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      To (Customer Email) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={shareForm.to}
                      onChange={(e) => setShareForm(prev => ({ ...prev, to: e.target.value }))}
                      placeholder="customer@email.com"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      CC (Optional, comma-separated)
                    </label>
                    <Input
                      type="text"
                      value={shareForm.cc}
                      onChange={(e) => setShareForm(prev => ({ ...prev, cc: e.target.value }))}
                      placeholder="manager@email.com, sales@email.com"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Subject
                    </label>
                    <Input
                      value={shareForm.subject}
                      onChange={(e) => setShareForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Email Content Preview Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText size={16} />
                  Email Content (Editable)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Customer Name
                    </label>
                    <Input
                      value={shareForm.customerName}
                      onChange={(e) => setShareForm(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="John Doe"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Location
                    </label>
                    <Input
                      value={shareForm.location}
                      onChange={(e) => setShareForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Mumbai, Maharashtra"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Bandwidth
                    </label>
                    <Input
                      value={shareForm.bandwidth}
                      onChange={(e) => setShareForm(prev => ({ ...prev, bandwidth: e.target.value }))}
                      placeholder="100 Mbps"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      No. of IPs
                    </label>
                    <Input
                      value={shareForm.numberOfIPs}
                      onChange={(e) => setShareForm(prev => ({ ...prev, numberOfIPs: e.target.value }))}
                      placeholder="8"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ARC (Annual)
                    </label>
                    <Input
                      value={shareForm.arc}
                      onChange={(e) => setShareForm(prev => ({ ...prev, arc: e.target.value }))}
                      placeholder="₹50,000"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      OTC (One Time)
                    </label>
                    <Input
                      value={shareForm.otc}
                      onChange={(e) => setShareForm(prev => ({ ...prev, otc: e.target.value }))}
                      placeholder="₹10,000"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Total Amount
                    </label>
                    <Input
                      value={shareForm.quotationAmount}
                      onChange={(e) => setShareForm(prev => ({ ...prev, quotationAmount: e.target.value }))}
                      placeholder="₹60,000"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                {shareForm.products?.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Products Included
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {shareForm.products.map((product, idx) => (
                        <Badge key={idx} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                          {product}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sender Details Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User size={16} />
                  Sender Signature
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Your Name
                    </label>
                    <Input
                      value={shareForm.senderName}
                      onChange={(e) => setShareForm(prev => ({ ...prev, senderName: e.target.value }))}
                      placeholder="John Doe"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Designation
                    </label>
                    <Input
                      value={shareForm.senderDesignation}
                      onChange={(e) => setShareForm(prev => ({ ...prev, senderDesignation: e.target.value }))}
                      placeholder="Business Development Manager"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Phone
                    </label>
                    <Input
                      value={shareForm.senderPhone}
                      onChange={(e) => setShareForm(prev => ({ ...prev, senderPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Email
                    </label>
                    <Input
                      value={shareForm.senderEmail}
                      onChange={(e) => setShareForm(prev => ({ ...prev, senderEmail: e.target.value }))}
                      placeholder="you@gazon.in"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Upload size={16} />
                  Attachments (Optional)
                </h3>

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="mb-2"
                    >
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 size={14} className="mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus size={14} className="mr-2" />
                          Add Attachment
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (Max 10MB each)
                    </p>
                  </div>

                  {/* Attachment List */}
                  {emailAttachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {emailAttachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                {attachment.filename}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFileSize(attachment.size)}
                                {attachment.isLocal && (
                                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                                    (Local - won't be attached)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex-shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Preview Box */}
              <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 sm:mb-3 flex items-center gap-2">
                  <Eye size={14} />
                  Email Preview
                </h4>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm overflow-hidden">
                  {/* Purple header */}
                  <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3">
                    <p className="text-white font-bold text-sm">
                      Proposal of Internet Lease Line (1:1){shareForm.companyName ? ` – ${shareForm.companyName}` : ''}
                    </p>
                    <p className="text-orange-200 text-xs mt-0.5">Gazon Communications India Ltd.</p>
                  </div>
                  <div className="p-3 sm:p-4 space-y-3">
                    <p className="text-slate-900 dark:text-slate-100 text-xs">
                      Dear {shareForm.customerName || 'Sir/Ma\'am'},
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      Greetings from Gazon Communications India Ltd! Please find the commercial details below.
                    </p>
                    {/* Commercial table preview */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded text-xs overflow-hidden">
                      <div className="grid grid-cols-4 bg-orange-600 text-white text-[10px] font-semibold">
                        <div className="px-2 py-1.5 text-center">Location</div>
                        <div className="px-2 py-1.5 text-center">Bandwidth</div>
                        <div className="px-2 py-1.5 text-center">ARC</div>
                        <div className="px-2 py-1.5 text-center">OTC</div>
                      </div>
                      <div className="grid grid-cols-4 text-[10px]">
                        <div className="px-2 py-1.5 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{shareForm.location || '-'}</div>
                        <div className="px-2 py-1.5 text-center font-medium text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">{shareForm.bandwidth || '-'}</div>
                        <div className="px-2 py-1.5 text-center font-medium text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">{shareForm.arc || '-'}</div>
                        <div className="px-2 py-1.5 text-center font-medium text-slate-900 dark:text-slate-100">{shareForm.otc || '-'}</div>
                      </div>
                    </div>
                    {/* Signature preview */}
                    {shareForm.senderName && (
                      <div className="border-t border-orange-300 dark:border-orange-800 pt-2 mt-2">
                        <p className="text-xs text-slate-500">Best regards,</p>
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">{shareForm.senderName}{shareForm.senderDesignation ? ` | ${shareForm.senderDesignation}` : ''}</p>
                        <p className="text-[10px] text-slate-400">Gazon Communications India Ltd.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> This email will be sent directly from our system. The customer will receive a professionally formatted HTML email with the quotation details.
                </p>
              </div>
            </div>

            {/* Footer - fixed */}
            <div className="p-3 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={handleBypassShare}
                  disabled={isSaving}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 text-xs sm:text-sm order-2 sm:order-1"
                  size="sm"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle size={14} className="mr-1.5" />
                  )}
                  Skip Email
                </Button>
                <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
                  <Button variant="outline" onClick={() => setShowShareModal(false)} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleShareWithCustomer}
                    disabled={isSaving || isEmailSending || !shareForm.to}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm flex-1 sm:flex-none"
                    size="sm"
                  >
                    {(isSaving || isEmailSending) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={14} className="mr-1.5" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{selectedLead.company}</h2>
                  {(selectedLead.isSelfGenerated || selectedLead.campaign?.name?.startsWith('[Self]') || selectedLead.campaign?.name?.startsWith('[BDM Self]') || selectedLead.campaign?.name?.startsWith('[SAM Self]')) ? (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Created by: {selectedLead.dataCreatedBy?.name || selectedLead.createdBy?.name || 'Unknown'}
                      </Badge>
                      <span className="text-sm text-slate-500 truncate">
                        {selectedLead.campaign?.name?.replace(/^\[(Self|BDM Self|SAM Self)\]\s*/i, '') || ''}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 truncate">{selectedLead.campaign?.name || '-'}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Contact Name</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Location</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedLead.fullAddress || selectedLead.location || [selectedLead.city, selectedLead.state].filter(Boolean).join(', ') || '-'}
                  </p>
                </div>
              </div>

              {/* Feasibility Information */}
              {(() => {
                const feasibilityData = parseFeasibilityData(selectedLead);
                if (!feasibilityData || !feasibilityData.vendorType) return null;

                const vendorDetails = feasibilityData.vendorDetails || {};

                return (
                  <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Feasibility Details</h4>
                      <Badge className="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 sm:ml-auto">
                        {getVendorTypeLabel(feasibilityData.vendorType)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {vendorDetails.capex && (
                        <div className="p-2 bg-white dark:bg-slate-800 rounded">
                          <p className="text-xs text-slate-500 dark:text-slate-400">CAPEX</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">₹{vendorDetails.capex}</p>
                        </div>
                      )}
                      {vendorDetails.opex && (
                        <div className="p-2 bg-white dark:bg-slate-800 rounded">
                          <p className="text-xs text-slate-500 dark:text-slate-400">OPEX</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">₹{vendorDetails.opex}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Financial Info */}
              {(selectedLead.arcAmount || selectedLead.otcAmount) && (
                <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">Financial Details</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">ARC</p>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">{formatCurrency(selectedLead.arcAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">OTC</p>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">{formatCurrency(selectedLead.otcAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Advance</p>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">{formatCurrency(selectedLead.advanceAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Terms</p>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">{selectedLead.paymentTerms || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedLead.products?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Products</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.products.map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs">
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Approval Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Sales Director Approval</span>
                    <Badge className={
                      getSA2Status(selectedLead) === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      getSA2Status(selectedLead) === 'rejected' ? 'bg-red-100 text-red-700' :
                      getSA2Status(selectedLead) === 'pending' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {getSA2Status(selectedLead)?.toUpperCase() || 'NOT SUBMITTED'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Docs Verification</span>
                    <Badge className={
                      getDocsStatus(selectedLead) === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      getDocsStatus(selectedLead) === 'rejected' ? 'bg-red-100 text-red-700' :
                      getDocsStatus(selectedLead) === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {getDocsStatus(selectedLead)?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Accounts Approval</span>
                    <Badge className={
                      getAccountsStatus(selectedLead) === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      getAccountsStatus(selectedLead) === 'rejected' ? 'bg-red-100 text-red-700' :
                      getAccountsStatus(selectedLead) === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {getAccountsStatus(selectedLead)?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Installation Modal */}
      {showInstallationModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Push to Installation</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedLead.company}</p>
                </div>
                <button
                  onClick={() => setShowInstallationModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    All approvals complete - Ready for installation
                  </span>
                </div>
              </div>

              {/* Feasibility Details for Installation */}
              {(() => {
                const feasibilityData = parseFeasibilityData(selectedLead);
                if (!feasibilityData || !feasibilityData.vendorType) return null;

                const vendorDetails = feasibilityData.vendorDetails || {};

                return (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase">Installation Requirements</h4>
                      <Badge className="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs ml-auto">
                        {getVendorTypeLabel(feasibilityData.vendorType)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {vendorDetails.capex && (
                        <div className="p-2 bg-white dark:bg-slate-800 rounded text-center">
                          <p className="text-slate-500">CAPEX</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">₹{vendorDetails.capex}</p>
                        </div>
                      )}
                      {vendorDetails.opex && (
                        <div className="p-2 bg-white dark:bg-slate-800 rounded text-center">
                          <p className="text-slate-500">OPEX</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">₹{vendorDetails.opex}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Delivery User <span className="text-red-500">*</span>
                </label>
                {isLoadingDeliveryUsers ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading delivery users...
                  </div>
                ) : deliveryUsers.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    No delivery users found. Please create delivery team users first.
                  </div>
                ) : (
                  <select
                    value={selectedDeliveryUser}
                    onChange={(e) => setSelectedDeliveryUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a delivery user...</option>
                    {deliveryUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Installation Notes (Optional)
                </label>
                <textarea
                  value={installationNotes}
                  onChange={(e) => setInstallationNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes for the installation team..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setShowInstallationModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePushToInstallation}
                disabled={isSaving || !selectedDeliveryUser || deliveryUsers.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} className="mr-2" />
                    Assign to Delivery
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mark Login</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedLead.company}</p>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-600" />
                  <span className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                    Customer has accepted the quotation
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">ARC Amount</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">
                      {selectedLead.arcAmount ? formatCurrency(selectedLead.arcAmount) : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">OTC Amount</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">
                      {selectedLead.otcAmount ? formatCurrency(selectedLead.otcAmount) : 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedLead.bandwidthRequirement && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Wifi size={14} />
                    <span>{selectedLead.bandwidthRequirement} Mbps</span>
                    {selectedLead.numberOfIPs && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <Network size={14} />
                        <span>{selectedLead.numberOfIPs} IPs</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                This will confirm that the customer is ready to proceed with PO and documents.
              </p>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLoginModal(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkLoginComplete}
                disabled={isSaving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <LogIn size={16} className="mr-2" />}
                Confirm Login
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Docs Upload Modal */}
      {showDocsUploadModal && selectedLead && (() => {
        const activeLink = uploadLinks.find(link => link.isActive && new Date() < new Date(link.expiresAt));
        const hasActiveLink = !!activeLink;

        // Get documents assigned to customer via active link
        const customerDocIds = activeLink?.requiredDocuments || [];
        // Documents for BDM are those NOT assigned to customer
        const allDocTypes = getAllDocumentTypes();
        const bdmDocTypes = allDocTypes.filter(d => !customerDocIds.includes(d.id));
        const customerDocTypes = allDocTypes.filter(d => customerDocIds.includes(d.id));

        return (
          <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Document Upload</h2>
                    <p className="text-sm text-slate-500">{selectedLead.company}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Test Mode Toggle */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Test Mode</span>
                      <Switch
                        checked={testMode}
                        onCheckedChange={setTestMode}
                      />
                    </div>
                    <button
                      onClick={() => setShowDocsUploadModal(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Upload Method Toggle */}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchUploadMethod('bdm')}
                    disabled={hasActiveLink}
                    className={uploadMethod === 'bdm'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                      : 'text-slate-700 dark:text-slate-300'}
                  >
                    <User size={14} className="mr-2" />
                    BDM Uploads
                    {hasActiveLink && <span className="ml-1 text-xs">(Link Active)</span>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchUploadMethod('customer')}
                    className={uploadMethod === 'customer'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                      : 'text-slate-700 dark:text-slate-300'}
                  >
                    <Users size={14} className="mr-2" />
                    Customer Uploads
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* Rejection Alert - Show if lead was sent back from accounts/docs */}
                {selectedLead.docsRejectedReason && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                          {selectedLead.docsRejectedReason?.includes('Accounts rejected') ? 'Accounts Rejection - Sent Back by Docs Team:' : 'Rejection Reason:'}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{selectedLead.docsRejectedReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* BDM Upload Mode */}
                {uploadMethod === 'bdm' && (
                  <div className="space-y-3">
                    {/* Warning if active link exists */}
                    {hasActiveLink && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          <AlertCircle size={14} className="inline mr-2" />
                          Customer upload link is active ({customerDocIds.length} docs assigned to customer).
                          {bdmDocTypes.length > 0 && (
                            <span className="block mt-1">
                              Switch to <strong>"Customer Uploads"</strong> mode to upload remaining {bdmDocTypes.length} docs as BDM.
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        Progress: {Object.keys(leadDocuments).length} / {testMode ? '1 (Test)' : '11'} documents
                      </span>
                      <div className="w-32 bg-indigo-200 dark:bg-indigo-800 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (Object.keys(leadDocuments).length / (testMode ? 1 : 11)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Compact Document Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {getAllDocumentTypes().map((docType) => {
                        const doc = leadDocuments[docType.id];
                        const isUploading = uploadingType === docType.id;
                        const isAdvanceOtc = docType.id === 'ADVANCE_OTC';

                        // Special handling for ADVANCE_OTC
                        if (isAdvanceOtc) {
                          return (
                            <div
                              key={docType.id}
                              className={`p-2 rounded-lg border text-xs col-span-2 lg:col-span-3 ${
                                doc
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {docType.order}. {docType.label}
                                </span>
                                {doc && <CheckCircle size={14} className="text-emerald-600 shrink-0" />}
                              </div>
                              {doc ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <span className="capitalize">{doc.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                                    {doc.referenceNumber && <span>• Ref: {doc.referenceNumber}</span>}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500 truncate flex-1">{doc.originalName}</span>
                                    <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} className="h-6 w-6 p-0">
                                      <Eye size={12} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        const result = await removeDocument(selectedLead.id, docType.id);
                                        if (result.success) {
                                          setLeadDocuments(result.documents || {});
                                          setAdvanceOtcMethod('');
                                          setAdvanceOtcReference('');
                                          setAdvanceOtcDate('');
                                          setAdvanceOtcAmount('');
                                          toast.success('Removed');
                                        }
                                      }}
                                      className="h-6 w-6 p-0 text-red-500"
                                      disabled={hasActiveLink}
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Payment Method Selection */}
                                  <div className="flex gap-1">
                                    {[
                                      { id: 'cheque', label: 'Cheque' },
                                      { id: 'neft', label: 'NEFT' },
                                      { id: 'mail_approval', label: 'Mail Approval' }
                                    ].map((method) => (
                                      <Button
                                        key={method.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setAdvanceOtcMethod(method.id);
                                          setAdvanceOtcReference('');
                                          setAdvanceOtcDate('');
                                          setAdvanceOtcAmount('');
                                        }}
                                        disabled={hasActiveLink}
                                        className={`text-xs flex-1 ${advanceOtcMethod === method.id
                                          ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                                          : 'text-slate-700 dark:text-slate-300'}`}
                                      >
                                        {method.label}
                                      </Button>
                                    ))}
                                  </div>

                                  {/* Cheque Inputs */}
                                  {advanceOtcMethod === 'cheque' && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <Input
                                        value={advanceOtcReference}
                                        onChange={(e) => setAdvanceOtcReference(e.target.value)}
                                        placeholder="Cheque Number"
                                        className="text-xs h-8"
                                        disabled={hasActiveLink}
                                      />
                                      <Input
                                        type="date"
                                        value={advanceOtcDate}
                                        onChange={(e) => setAdvanceOtcDate(e.target.value)}
                                        placeholder="Date"
                                        className="text-xs h-8"
                                        disabled={hasActiveLink}
                                      />
                                      <Input
                                        type="number"
                                        value={advanceOtcAmount}
                                        onChange={(e) => setAdvanceOtcAmount(e.target.value)}
                                        placeholder="Amount"
                                        className="text-xs h-8"
                                        disabled={hasActiveLink}
                                      />
                                    </div>
                                  )}

                                  {/* NEFT Inputs */}
                                  {advanceOtcMethod === 'neft' && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <Input
                                        value={advanceOtcReference}
                                        onChange={(e) => setAdvanceOtcReference(e.target.value)}
                                        placeholder="UTR Number"
                                        className="text-xs h-8"
                                        disabled={hasActiveLink}
                                      />
                                      <Input
                                        type="date"
                                        value={advanceOtcDate}
                                        onChange={(e) => setAdvanceOtcDate(e.target.value)}
                                        placeholder="Date"
                                        className="text-xs h-8"
                                        disabled={hasActiveLink}
                                      />
                                      <Input
                                        type="number"
                                        value={advanceOtcAmount}
                                        onChange={(e) => setAdvanceOtcAmount(e.target.value)}
                                        placeholder="Amount"
                                        className="text-xs h-8"
                                        disabled={hasActiveLink}
                                      />
                                    </div>
                                  )}

                                  {/* Upload Button */}
                                  {advanceOtcMethod && (
                                    <label className={`flex items-center justify-center p-2 border border-dashed rounded cursor-pointer
                                      ${hasActiveLink ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'}
                                      ${isUploading ? 'border-amber-400 bg-amber-100' : 'border-amber-300 dark:border-amber-600'}
                                    `}>
                                      {isUploading ? (
                                        <Loader2 size={14} className="animate-spin text-amber-600" />
                                      ) : (
                                        <span className="text-amber-700 dark:text-amber-400">
                                          {advanceOtcMethod === 'mail_approval' ? 'Upload Mail Screenshot' :
                                           advanceOtcMethod === 'cheque' ? 'Upload Cheque Image' : 'Upload NEFT Proof'}
                                        </span>
                                      )}
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        disabled={hasActiveLink || isUploading || ((advanceOtcMethod === 'cheque' || advanceOtcMethod === 'neft') && (!advanceOtcReference || !advanceOtcDate || !advanceOtcAmount))}
                                        onChange={async (e) => {
                                          if (e.target.files?.[0]) {
                                            if ((advanceOtcMethod === 'cheque' || advanceOtcMethod === 'neft') && (!advanceOtcReference || !advanceOtcDate || !advanceOtcAmount)) {
                                              toast.error(`Please fill all fields (${advanceOtcMethod === 'cheque' ? 'Cheque Number' : 'UTR Number'}, Date, Amount)`);
                                              return;
                                            }
                                            setUploadingType(docType.id);
                                            const result = await uploadDocument(
                                              selectedLead.id,
                                              docType.id,
                                              e.target.files[0],
                                              { paymentMethod: advanceOtcMethod, referenceNumber: advanceOtcReference, date: advanceOtcDate, amount: advanceOtcAmount }
                                            );
                                            if (result.success) {
                                              setLeadDocuments(result.documents || {});
                                              toast.success(`${docType.label} uploaded`);
                                            } else {
                                              toast.error(result.error || 'Upload failed');
                                            }
                                            setUploadingType(null);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                    </label>
                                  )}

                                  {!advanceOtcMethod && (
                                    <p className="text-amber-600 dark:text-amber-400 text-center">
                                      Select payment method above
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Normal document handling
                        return (
                          <div
                            key={docType.id}
                            className={`p-2 rounded-lg border text-xs ${
                              doc
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                                {docType.order}. {docType.label}
                              </span>
                              {doc && <CheckCircle size={14} className="text-emerald-600 shrink-0" />}
                            </div>
                            {doc ? (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 truncate flex-1">{doc.originalName}</span>
                                <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} className="h-6 w-6 p-0">
                                  <Eye size={12} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const result = await removeDocument(selectedLead.id, docType.id);
                                    if (result.success) {
                                      setLeadDocuments(result.documents || {});
                                      toast.success('Removed');
                                    }
                                  }}
                                  className="h-6 w-6 p-0 text-red-500"
                                  disabled={hasActiveLink}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            ) : (
                              <label className={`flex items-center justify-center p-1.5 border border-dashed rounded cursor-pointer
                                ${hasActiveLink ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}
                                ${isUploading ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 dark:border-slate-600'}
                              `}>
                                {isUploading ? (
                                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                                ) : (
                                  <span className="text-slate-500">Click to upload</span>
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept={(docType.acceptedFormats || ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']).map(f => `.${f}`).join(',')}
                                  disabled={hasActiveLink || isUploading}
                                  onChange={async (e) => {
                                    if (e.target.files?.[0]) {
                                      setUploadingType(docType.id);
                                      const result = await uploadDocument(selectedLead.id, docType.id, e.target.files[0]);
                                      if (result.success) {
                                        setLeadDocuments(result.documents || {});
                                        toast.success(`${docType.label} uploaded`);
                                      } else {
                                        toast.error(result.error || 'Upload failed');
                                      }
                                      setUploadingType(null);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Editable ARC/OTC Fields */}
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <IndianRupee size={14} />
                        Pricing Details
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">ARC (Monthly)</label>
                          <Input
                            type="number"
                            value={editableArc}
                            onChange={(e) => setEditableArc(e.target.value)}
                            placeholder="Enter ARC"
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">OTC (One-time)</label>
                          <Input
                            type="number"
                            value={editableOtc}
                            onChange={(e) => setEditableOtc(e.target.value)}
                            placeholder="Enter OTC"
                            className="text-sm h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Upload Mode */}
                {uploadMethod === 'customer' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Generate Link & Links History */}
                    <div className="space-y-4">
                      {/* Generate Link */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <Link2 size={14} />
                          Generate Link
                        </h3>
                        <div className="space-y-2">
                          {/* Document Selection */}
                          <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                              Select docs for customer to upload. You can upload the rest below.
                            </p>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                Customer Docs ({selectedDocsForLink.length}/{getAllDocumentTypes().length})
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setSelectedDocsForLink(getAllDocumentTypes().map(d => d.id))}
                                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                  All
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  onClick={() => setSelectedDocsForLink([])}
                                  className="text-xs text-slate-500 hover:text-slate-600"
                                >
                                  None
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-0.5 max-h-32 overflow-y-auto">
                              {getAllDocumentTypes().map((docType) => (
                                <label
                                  key={docType.id}
                                  className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedDocsForLink.includes(docType.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDocsForLink(prev => [...prev, docType.id]);
                                      } else {
                                        setSelectedDocsForLink(prev => prev.filter(id => id !== docType.id));
                                      }
                                    }}
                                    className="h-3 w-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs text-slate-600 dark:text-slate-400">
                                    {docType.order}. {docType.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Expiry Days */}
                          <div className="flex gap-1">
                            {[3, 7, 14, 30].map((days) => (
                              <Button
                                key={days}
                                variant="outline"
                                size="sm"
                                onClick={() => setLinkExpiryDays(days)}
                                className={`text-xs px-2 ${linkExpiryDays === days
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                                  : 'text-slate-700 dark:text-slate-300'}`}
                              >
                                {days}d
                              </Button>
                            ))}
                          </div>
                          <Input
                            value={customerNote}
                            onChange={(e) => setCustomerNote(e.target.value)}
                            placeholder="Note for customer (optional)"
                            className="text-xs h-8"
                          />
                          <Button
                            onClick={handleGenerateUploadLink}
                            disabled={isGeneratingLink || selectedDocsForLink.length === 0}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                          >
                            {isGeneratingLink ? <Loader2 size={12} className="animate-spin" /> : <><Link2 size={12} className="mr-1" />Generate & Copy</>}
                          </Button>
                          {lastGeneratedUrl && (
                            <>
                              <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="flex-1 text-[10px] text-slate-600 dark:text-slate-400 truncate px-1">{lastGeneratedUrl}</span>
                                <Button variant="ghost" size="sm" onClick={() => handleCopyLink(lastGeneratedUrl)} className="h-6 w-6 p-0 shrink-0"><Copy size={12} /></Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleShareWhatsApp(lastGeneratedUrl)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                                >
                                  <MessageCircle size={12} className="mr-1" />WhatsApp
                                </Button>
                                <Button
                                  onClick={() => handleShareEmail(lastGeneratedUrl)}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                >
                                  <Mail size={12} className="mr-1" />Email
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Links History */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Links History</h3>
                        {isLoadingLinks ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : uploadLinks.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-2">No links generated</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {uploadLinks.map((link) => {
                              const isExpired = new Date() > new Date(link.expiresAt);
                              const isInactive = !link.isActive || isExpired;
                              const docsCount = link.requiredDocuments?.length || getAllDocumentTypes().length;
                              return (
                                <div key={link.id} className={`p-2 rounded border text-xs ${isInactive ? 'opacity-50 bg-slate-100 dark:bg-slate-700' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className={isInactive ? 'text-slate-500' : 'text-emerald-700 dark:text-emerald-400'}>
                                        {isExpired ? 'Expired' : !link.isActive ? 'Deleted' : 'Active'} - {link.accessCount} visits
                                      </span>
                                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                                        {docsCount} doc{docsCount !== 1 ? 's' : ''} requested
                                      </span>
                                    </div>
                                    {!isInactive && (
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(link.url)} className="h-6 w-6 p-0 text-green-600" title="Share via WhatsApp"><MessageCircle size={12} /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleShareEmail(link.url)} className="h-6 w-6 p-0 text-blue-600" title="Share via Email"><Mail size={12} /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopyLink(link.url)} className="h-6 w-6 p-0" title="Copy Link"><Copy size={12} /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleRevokeLink(link.id)} className="h-6 w-6 p-0 text-red-500" title="Delete Link"><Trash2 size={12} /></Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Documents Status */}
                    <div className="space-y-3">
                      {/* Overall Progress */}
                      <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                          Total: {Object.keys(leadDocuments).length} / {testMode ? '1 (Test)' : getAllDocumentTypes().length} documents
                        </span>
                        <Button variant="outline" size="sm" onClick={refreshLeadDocuments} disabled={isLoadingDocs} className="h-7 text-xs">
                          <RefreshCw size={12} className={isLoadingDocs ? 'animate-spin' : ''} />
                        </Button>
                      </div>

                      {/* Customer Docs Status (if active link exists) */}
                      {hasActiveLink && customerDocTypes.length > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <Users size={14} />
                            Customer Uploads ({customerDocTypes.filter(d => leadDocuments[d.id]).length}/{customerDocTypes.length})
                          </h3>
                          <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                            {customerDocTypes.map((docType) => {
                              const doc = leadDocuments[docType.id];
                              return (
                                <div key={docType.id} className={`flex items-center justify-between p-1.5 rounded text-xs ${doc ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-900'}`}>
                                  <div className="flex items-center gap-2">
                                    {doc ? <CheckCircle size={12} className="text-blue-600" /> : <Clock size={12} className="text-slate-400" />}
                                    <span className={doc ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500'}>{docType.order}. {docType.label}</span>
                                  </div>
                                  {doc && (
                                    <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} className="h-5 w-5 p-0"><Eye size={10} /></Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* BDM Upload Section */}
                      {hasActiveLink && bdmDocTypes.length === 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                          <p className="text-sm text-slate-500">
                            All documents are assigned to customer. Waiting for customer uploads.
                          </p>
                        </div>
                      )}
                      {bdmDocTypes.length > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <User size={14} />
                            BDM Uploads ({bdmDocTypes.filter(d => leadDocuments[d.id]).length}/{bdmDocTypes.length})
                          </h3>
                          <div className="space-y-2">
                            {bdmDocTypes.map((docType) => {
                              const doc = leadDocuments[docType.id];
                              const isUploading = uploadingType === docType.id;
                              const isAdvanceOtc = docType.id === 'ADVANCE_OTC';

                              // Special handling for ADVANCE_OTC
                              if (isAdvanceOtc) {
                                return (
                                  <div key={docType.id} className={`p-2 rounded-lg border text-xs ${doc ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{docType.order}. {docType.label}</span>
                                      {doc && <CheckCircle size={12} className="text-emerald-600" />}
                                    </div>
                                    {doc ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[10px]">
                                          <span className="capitalize">{doc.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                                          {doc.referenceNumber && <span>• Ref: {doc.referenceNumber}</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-500 truncate flex-1">{doc.originalName}</span>
                                          <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} className="h-5 w-5 p-0"><Eye size={10} /></Button>
                                          <Button variant="ghost" size="sm" onClick={async () => {
                                            const result = await removeDocument(selectedLead.id, docType.id);
                                            if (result.success) {
                                              setLeadDocuments(result.documents || {});
                                              setAdvanceOtcMethod('');
                                              setAdvanceOtcReference('');
                                              setAdvanceOtcDate('');
                                              setAdvanceOtcAmount('');
                                              toast.success('Removed');
                                            }
                                          }} className="h-5 w-5 p-0 text-red-500"><Trash2 size={10} /></Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <div className="flex gap-1">
                                          {[{ id: 'cheque', label: 'Cheque' }, { id: 'neft', label: 'NEFT' }, { id: 'mail_approval', label: 'Mail' }].map((method) => (
                                            <button key={method.id} onClick={() => { setAdvanceOtcMethod(method.id); setAdvanceOtcReference(''); setAdvanceOtcDate(''); setAdvanceOtcAmount(''); }}
                                              className={`text-[10px] px-2 py-1 rounded flex-1 ${advanceOtcMethod === method.id ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
                                              {method.label}
                                            </button>
                                          ))}
                                        </div>
                                        {advanceOtcMethod === 'cheque' && (
                                          <div className="grid grid-cols-3 gap-1">
                                            <Input value={advanceOtcReference} onChange={(e) => setAdvanceOtcReference(e.target.value)}
                                              placeholder="Cheque No." className="text-[10px] h-6" />
                                            <Input type="date" value={advanceOtcDate} onChange={(e) => setAdvanceOtcDate(e.target.value)}
                                              className="text-[10px] h-6" />
                                            <Input type="number" value={advanceOtcAmount} onChange={(e) => setAdvanceOtcAmount(e.target.value)}
                                              placeholder="Amount" className="text-[10px] h-6" />
                                          </div>
                                        )}
                                        {advanceOtcMethod === 'neft' && (
                                          <div className="grid grid-cols-3 gap-1">
                                            <Input value={advanceOtcReference} onChange={(e) => setAdvanceOtcReference(e.target.value)}
                                              placeholder="UTR No." className="text-[10px] h-6" />
                                            <Input type="date" value={advanceOtcDate} onChange={(e) => setAdvanceOtcDate(e.target.value)}
                                              className="text-[10px] h-6" />
                                            <Input type="number" value={advanceOtcAmount} onChange={(e) => setAdvanceOtcAmount(e.target.value)}
                                              placeholder="Amount" className="text-[10px] h-6" />
                                          </div>
                                        )}
                                        {advanceOtcMethod && (
                                          <label className="flex items-center justify-center p-1.5 border border-dashed border-amber-300 rounded cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30">
                                            {isUploading ? <Loader2 size={12} className="animate-spin text-amber-600" /> : <span className="text-amber-700 dark:text-amber-400 text-[10px]">Upload {advanceOtcMethod === 'mail_approval' ? 'Mail SS' : 'Proof'}</span>}
                                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                                              disabled={isUploading || ((advanceOtcMethod === 'cheque' || advanceOtcMethod === 'neft') && (!advanceOtcReference || !advanceOtcDate || !advanceOtcAmount))}
                                              onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                  if ((advanceOtcMethod === 'cheque' || advanceOtcMethod === 'neft') && (!advanceOtcReference || !advanceOtcDate || !advanceOtcAmount)) {
                                                    toast.error(`Fill all fields first`);
                                                    return;
                                                  }
                                                  setUploadingType(docType.id);
                                                  const result = await uploadDocument(selectedLead.id, docType.id, e.target.files[0], { paymentMethod: advanceOtcMethod, referenceNumber: advanceOtcReference, date: advanceOtcDate, amount: advanceOtcAmount });
                                                  if (result.success) { setLeadDocuments(result.documents || {}); toast.success(`${docType.label} uploaded`); }
                                                  else { toast.error(result.error || 'Upload failed'); }
                                                  setUploadingType(null);
                                                  e.target.value = '';
                                                }
                                              }} />
                                          </label>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // Normal document handling
                              return (
                                <div key={docType.id} className={`flex items-center justify-between p-1.5 rounded text-xs ${doc ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-white dark:bg-slate-900'}`}>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {doc ? <CheckCircle size={12} className="text-emerald-600 shrink-0" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                    <span className={`truncate ${doc ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>{docType.order}. {docType.label}</span>
                                  </div>
                                  {doc ? (
                                    <div className="flex gap-1 shrink-0">
                                      <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} className="h-5 w-5 p-0"><Eye size={10} /></Button>
                                      <Button variant="ghost" size="sm" onClick={async () => {
                                        const result = await removeDocument(selectedLead.id, docType.id);
                                        if (result.success) { setLeadDocuments(result.documents || {}); toast.success('Removed'); }
                                      }} className="h-5 w-5 p-0 text-red-500"><Trash2 size={10} /></Button>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer shrink-0">
                                      {isUploading ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : <span className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">Upload</span>}
                                      <input type="file" className="hidden" accept={(docType.acceptedFormats || ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']).map(f => `.${f}`).join(',')} disabled={isUploading}
                                        onChange={async (e) => {
                                          if (e.target.files?.[0]) {
                                            setUploadingType(docType.id);
                                            const result = await uploadDocument(selectedLead.id, docType.id, e.target.files[0]);
                                            if (result.success) { setLeadDocuments(result.documents || {}); toast.success(`${docType.label} uploaded`); }
                                            else { toast.error(result.error || 'Upload failed'); }
                                            setUploadingType(null);
                                            e.target.value = '';
                                          }
                                        }} />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* No active link - Show all docs for reference */}
                      {!hasActiveLink && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            All Documents ({Object.keys(leadDocuments).length}/{getAllDocumentTypes().length})
                          </h3>
                          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                            {getAllDocumentTypes().map((docType) => {
                              const doc = leadDocuments[docType.id];
                              return (
                                <div key={docType.id} className={`flex items-center justify-between p-1.5 rounded text-xs ${doc ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-white dark:bg-slate-900'}`}>
                                  <div className="flex items-center gap-2">
                                    {doc ? <CheckCircle size={12} className="text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                                    <span className={doc ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>{docType.order}. {docType.label}</span>
                                  </div>
                                  {doc && (
                                    <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} className="h-5 w-5 p-0"><Eye size={10} /></Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Editable ARC/OTC Fields */}
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <IndianRupee size={14} />
                          Pricing Details
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">ARC (Monthly)</label>
                            <Input
                              type="number"
                              value={editableArc}
                              onChange={(e) => setEditableArc(e.target.value)}
                              placeholder="Enter ARC"
                              className="text-sm h-9"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">OTC (One-time)</label>
                            <Input
                              type="number"
                              value={editableOtc}
                              onChange={(e) => setEditableOtc(e.target.value)}
                              placeholder="Enter OTC"
                              className="text-sm h-9"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex gap-3">
                <Button variant="outline" onClick={() => setShowDocsUploadModal(false)} className="flex-1">
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    const docCount = Object.keys(leadDocuments).length;
                    const requiredCount = getRequiredCount(testMode);

                    if (!testMode && docCount < requiredCount) {
                      toast.error(`Please upload all ${requiredCount} documents before submitting`);
                      return;
                    }

                    setIsSaving(true);
                    try {
                      const result = await pushToDocsVerificationTyped(
                        selectedLead.id,
                        testMode ? '(TEST MODE) Bypassed document upload' : 'Documents submitted for verification',
                        testMode,
                        { arcAmount: parseFloat(editableArc) || selectedLead.arcAmount, otcAmount: parseFloat(editableOtc) || selectedLead.otcAmount }
                      );

                      if (result.success) {
                        toast.success(testMode ? 'Test mode: Bypassed to verification!' : 'Documents submitted for verification!');
                        setShowDocsUploadModal(false);
                        refreshOpportunityLeads();
                      } else {
                        toast.error(result.error || 'Failed to submit');
                      }
                    } catch (error) {
                      toast.error('Failed to submit');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving || (!testMode && Object.keys(leadDocuments).length === 0)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} className="mr-2" />{testMode ? 'Bypass (Test Mode)' : 'Submit for Verification'}</>}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Accounts Rejected Edit Modal */}
      {showAccountsRejectedModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Pricing & Resubmit</h2>
                  <p className="text-sm text-slate-500">{selectedLead.company}</p>
                </div>
                <button
                  onClick={() => setShowAccountsRejectedModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Rejection reason */}
              {selectedLead.accountsRejectedReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{selectedLead.accountsRejectedReason}</p>
                </div>
              )}

              {/* Current values display */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Current Values</p>
                <div className="flex gap-4">
                  <div>
                    <span className="text-xs text-slate-500">ARC:</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      ₹{(parseFloat(selectedLead.arcAmount) || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">OTC:</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      ₹{(parseFloat(selectedLead.otcAmount) || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New ARC Amount (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={rejectedEditArc}
                      onChange={(e) => setRejectedEditArc(e.target.value)}
                      placeholder="Enter new ARC amount"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New OTC Amount (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={rejectedEditOtc}
                      onChange={(e) => setRejectedEditOtc(e.target.value)}
                      placeholder="Enter new OTC amount"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAccountsRejectedModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResubmitToAccounts}
                disabled={isResubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isResubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} className="mr-2" />
                    Resubmit to Accounts
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
