'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore, useLeadStore, useCampaignStore, useProductStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Search,
  Users,
  UserCheck,
  Briefcase,
  Mail,
  MessageSquare,
  Eye,
  Share2,
  ChevronDown,
  X,
  ArrowUpRight,
  Linkedin,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  UserPlus,
  Wifi,
  Hash,
  CalendarCheck,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import StatCard from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatDate } from '@/lib/formatters';
import { LEAD_STATUS_CONFIG, getStatusBadgeClass as _getStatusBadgeClass, getStatusLabel as _getStatusLabel } from '@/lib/statusConfig';

export default function LeadsPage() {
  const { user } = useAuthStore();
  const { leads, leadsPagination, leadsStats, isLoading, fetchLeads, updateLead, deleteLead, fetchBDMUsers, bdmUsers, createSelfLead } = useLeadStore();
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const { fetchProducts } = useProductStore();
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isBDM = user?.role === 'BDM';
  const isISR = user?.role === 'ISR';
  const isTL = user?.role === 'BDM_TEAM_LEADER';
  const isFeasibilityTeam = user?.role === 'FEASIBILITY_TEAM';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal states
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(null);
  const [showPushToPresalesModal, setShowPushToPresalesModal] = useState(false);
  const [pushToPresalesLead, setPushToPresalesLead] = useState(null);
  const [selectedBDMForPush, setSelectedBDMForPush] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const shareDropdownRef = useRef(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [editForm, setEditForm] = useState({
    company: '',
    name: '',
    title: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    industry: '',
    linkedinUrl: '',
    requirements: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add Lead modal state (for BDM)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    designation: '',
    city: '',
    industry: '',
    linkedinUrl: '',
    notes: '',
    source: 'Self Lead'
  });
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  const loadLeads = () => {
    fetchLeads(page, pageSize, {
      search: searchQuery || undefined,
      campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      pipelineStage: selectedPipelineStage !== 'all' ? selectedPipelineStage : undefined,
    });
  };

  useSocketRefresh(loadLeads);

  // Re-fetch when pagination or filters change
  useEffect(() => {
    loadLeads();
  }, [page, pageSize, selectedCampaign, selectedStatus, selectedPipelineStage]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadLeads();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchCampaigns();
    fetchProducts();
    fetchBDMUsers();
  }, [fetchCampaigns, fetchProducts, fetchBDMUsers]);

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target)) {
        setShowShareDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLeadTypeColor = (type) => {
    switch (type) {
      case 'QUALIFIED':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'PUSHED_TO_PRESALES':
        return 'bg-slate-700 dark:bg-slate-600 text-white dark:text-slate-100 border-slate-600 dark:border-slate-500';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getLeadTypeLabel = (type) => {
    switch (type) {
      case 'QUALIFIED':
        return 'Qualified';
      case 'PUSHED_TO_PRESALES':
        return 'Pushed to Presales';
      default:
        return type || 'Qualified';
    }
  };

  const getStatusColor = (status) => _getStatusBadgeClass(status, LEAD_STATUS_CONFIG);
  const getStatusLabel = (status) => _getStatusLabel(status, LEAD_STATUS_CONFIG);

  const leadStatusOptions = [
    'NEW',
    'QUALIFIED',
    'FEASIBLE',
    'NOT_FEASIBLE',
    'FOLLOW_UP',
    'DROPPED'
  ];

  const handleStatusChange = async (leadId, newStatus) => {
    const result = await updateLead(leadId, { status: newStatus });
    if (result.success) {
      toast.success('Status updated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleTypeChange = async (leadId, newType) => {
    const result = await updateLead(leadId, { type: newType });
    if (result.success) {
      toast.success('Lead type updated');
    } else {
      toast.error(result.error || 'Failed to update lead type');
    }
  };

  const handleOpenPushToPresales = (lead) => {
    setPushToPresalesLead(lead);
    setSelectedBDMForPush(lead.assignedTo?.id || '');
    setShowPushToPresalesModal(true);
  };

  const handleConfirmPushToPresales = async () => {
    if (!selectedBDMForPush) {
      toast.error('Please select a BDM to assign');
      return;
    }

    setIsPushing(true);
    const result = await updateLead(pushToPresalesLead.id, {
      type: 'PUSHED_TO_PRESALES',
      assignedToId: selectedBDMForPush
    });

    if (result.success) {
      toast.success('Lead pushed to presales and assigned to BDM');
      setShowPushToPresalesModal(false);
      setPushToPresalesLead(null);
      setSelectedBDMForPush('');
    } else {
      toast.error(result.error || 'Failed to push to presales');
    }
    setIsPushing(false);
  };

  const handleAssignBDM = async (leadId, bdmId) => {
    const result = await updateLead(leadId, { assignedToId: bdmId || null });
    if (result.success) {
      toast.success('BDM assigned successfully');
    } else {
      toast.error(result.error || 'Failed to assign BDM');
    }
  };

  const handleDelete = async (leadId) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }
    setDeletingId(leadId);
    const result = await deleteLead(leadId);
    setDeletingId(null);
    if (result.success) {
      toast.success('Lead deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete lead');
    }
  };

  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  const handleOpenEditModal = (lead) => {
    setEditLead(lead);
    setEditForm({
      company: lead.company || '',
      name: lead.name || '',
      title: lead.title || '',
      email: lead.email || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      city: lead.city || '',
      industry: lead.industry || '',
      linkedinUrl: lead.linkedinUrl || '',
      requirements: lead.requirements || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editLead) return;

    // Validate required fields
    if (!editForm.company?.trim()) {
      toast.error('Company is required');
      return;
    }
    if (!editForm.phone?.trim()) {
      toast.error('Phone is required');
      return;
    }

    setIsSavingEdit(true);

    // Build update data - only include fields that have values or are optional
    const updateData = {
      company: editForm.company.trim(),
      name: editForm.name?.trim() || '',
      title: editForm.title?.trim() || '',
      phone: editForm.phone.trim(),
      whatsapp: editForm.whatsapp?.trim() || null,
      email: editForm.email?.trim() || null,
      city: editForm.city?.trim() || null,
      industry: editForm.industry?.trim() || null,
      linkedinUrl: editForm.linkedinUrl?.trim() || null,
      requirements: editForm.requirements?.trim() || null
    };

    const result = await updateLead(editLead.id, updateData);
    if (result.success) {
      toast.success('Lead updated successfully');
      setShowEditModal(false);
      setEditLead(null);
      setEditForm({
        company: '',
        name: '',
        title: '',
        email: '',
        phone: '',
        whatsapp: '',
        city: '',
        industry: '',
        linkedinUrl: '',
        requirements: ''
      });
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setIsSavingEdit(false);
  };

  const handleOpenLinkedIn = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Add Lead handlers
  const handleAddLeadFormChange = (field, value) => {
    setAddLeadForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateLead = async () => {
    // Validate required fields
    if (!addLeadForm.company?.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!addLeadForm.contactName?.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (!addLeadForm.phone?.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setIsCreatingLead(true);

    const result = await createSelfLead({
      company: addLeadForm.company.trim(),
      contactName: addLeadForm.contactName.trim(),
      phone: addLeadForm.phone.trim(),
      email: addLeadForm.email?.trim() || null,
      designation: addLeadForm.designation?.trim() || null,
      city: addLeadForm.city?.trim() || null,
      industry: addLeadForm.industry?.trim() || null,
      linkedinUrl: addLeadForm.linkedinUrl?.trim() || null,
      notes: addLeadForm.notes?.trim() || null,
      source: addLeadForm.source || 'Self Lead',
      createAsLead: true
    });

    if (result.success) {
      toast.success('Lead created successfully!');
      setShowAddLeadModal(false);
      setAddLeadForm({
        company: '',
        contactName: '',
        phone: '',
        email: '',
        designation: '',
        city: '',
        industry: '',
        linkedinUrl: '',
        notes: '',
        source: 'Self Lead'
      });
      loadLeads();
    } else {
      toast.error(result.error || 'Failed to create lead');
    }

    setIsCreatingLead(false);
  };

  const handleShareWhatsApp = async (lead) => {
    const phone = lead.phone?.replace(/\D/g, '');
    const productNames = lead.products?.map(p => p.title).join(', ') || 'our products';
    const message = encodeURIComponent(
      `Hi ${lead.name || 'there'},\n\nThank you for your interest in ${productNames}!\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowShareDropdown(null);

    // Update sharedVia field in database
    const currentSharedVia = lead.sharedVia || '';
    if (!currentSharedVia.includes('whatsapp')) {
      const newSharedVia = currentSharedVia ? `${currentSharedVia},whatsapp` : 'whatsapp';
      await updateLead(lead.id, { sharedVia: newSharedVia });
      loadLeads();
    }
    toast.success('WhatsApp opened');
  };

  const handleShareEmail = async (lead) => {
    if (!lead.email) {
      toast.error('No email address available');
      return;
    }
    const productNames = lead.products?.map(p => p.title).join(', ') || 'our products';
    const subject = encodeURIComponent('Follow-up on your interest');
    const body = encodeURIComponent(
      `Hi ${lead.name || 'there'},\n\nThank you for your interest in ${productNames}!\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`
    );
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank');
    setShowShareDropdown(null);

    // Update sharedVia field in database
    const currentSharedVia = lead.sharedVia || '';
    if (!currentSharedVia.includes('email')) {
      const newSharedVia = currentSharedVia ? `${currentSharedVia},email` : 'email';
      await updateLead(lead.id, { sharedVia: newSharedVia });
      loadLeads();
    }
    toast.success('Email client opened');
  };

  // Use campaigns from store, with fallback to deriving from loaded leads
  const uniqueCampaigns = (() => {
    if (campaigns && campaigns.length > 0) return campaigns;
    // Fallback: derive unique campaigns from current leads data
    const seen = new Map();
    for (const lead of leads) {
      const c = lead.campaign;
      if (c && !seen.has(c.id)) seen.set(c.id, c);
    }
    return Array.from(seen.values());
  })();

  // Apply filters
  // Server-side filtered — leads are already filtered by the API
  const filteredLeads = leads;

  const getPipelineStageLabel = (lead) => {
    if (lead.actualPlanIsActive) return 'Live';
    if (lead.customerAcceptanceAt || lead.installationCompletedAt) return 'Installed';
    if (lead.customerUsername) return 'At NOC';
    if (lead.pushedToInstallationAt || (lead.accountsVerifiedAt && lead.accountsStatus === 'ACCOUNTS_APPROVED')) return 'Push to Delivery';
    if (lead.docsVerifiedAt && !lead.docsRejectedReason) return 'Accounts Review';
    if (lead.sharedVia?.includes('docs_verification')) return 'Docs Review';
    if (lead.opsApprovalStatus === 'APPROVED') return 'Docs Upload';
    if (lead.opsApprovalStatus === 'PENDING') return 'Quote Sent';
    if (lead.status === 'FEASIBLE' || lead.feasibilityReviewedAt) return 'Feasible';
    if (lead.status === 'DROPPED' || lead.status === 'NOT_FEASIBLE' || lead.opsApprovalStatus === 'REJECTED' || lead.accountsStatus === 'ACCOUNTS_REJECTED') return 'Dropped';
    return 'At BDM';
  };

  const handleExportExcel = () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      toast.error('No leads to export.');
      return;
    }
    const formattedData = filteredLeads.map((lead) => ({
      'Lead #': lead.leadNumber || '-',
      'Company': lead.company || '-',
      'Contact Name': lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-',
      'Phone': lead.phone || '-',
      'Email': lead.email || '-',
      'City': lead.city || '-',
      'Campaign': lead.campaign?.name || '-',
      'Products': lead.products?.map(p => p.title).join(', ') || '-',
      'Bandwidth': lead.bandwidthRequirement || '-',
      'No. of IPs': lead.numberOfIPs || '-',
      'Status': lead.status?.replace(/_/g, ' ') || '-',
      'Pipeline Stage': getPipelineStageLabel(lead),
      'Assigned To': lead.assignedTo?.name || 'Unassigned',
      'Created By': lead.createdBy?.name || '-',
      'Created At': lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 25 },
      { wch: 14 }, { wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 10 },
      { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Leads_${dateStr}.xlsx`);
    toast.success(`Exported ${formattedData.length} leads to Excel.`);
  };

  // Stats from server
  const bdmStats = {
    total: leadsStats?.total || 0,
    pending: leadsStats?.pending || 0,
    qualified: leadsStats?.qualified || 0,
    followUp: leadsStats?.followUp || 0,
    dropped: leadsStats?.dropped || 0,
    feasible: leadsStats?.feasible || 0,
    notFeasible: leadsStats?.notFeasible || 0,
    meetingScheduled: leadsStats?.meetingScheduled || 0,
  };

  // Build columns dynamically based on role
  const columns = [
    {
      key: 'leadNumber',
      label: 'Lead #',
      render: (lead) => (
        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
          {lead.leadNumber || '-'}
        </span>
      ),
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'company',
      label: 'Company',
      render: (lead) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {lead.company || '-'}
        </span>
      ),
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (lead) => {
        const displayName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-';
        return (
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{lead.phone}</p>
          </div>
        );
      },
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'campaign',
      label: 'Campaign',
      render: (lead) => (
        (lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]')) ? (
          <div className="flex flex-col gap-0.5">
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              {lead.dataCreatedBy?.name || 'Unknown'}
            </Badge>
            {lead.campaign && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {lead.campaign.name?.replace(/^\[Self\]\s*/i, '') || '-'}
              </span>
            )}
          </div>
        ) : lead.campaign ? (
          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
            {lead.campaign.name}
          </Badge>
        ) : (
          <span className="text-slate-400">-</span>
        )
      ),
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'products',
      label: 'Interest Products',
      render: (lead) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {lead.products?.slice(0, 3).map((product) => (
            <Badge
              key={product.id}
              variant="outline"
              className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs"
            >
              {product.title}
            </Badge>
          ))}
          {lead.products?.length > 3 && (
            <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800">
              +{lead.products.length - 3}
            </Badge>
          )}
          {(!lead.products || lead.products.length === 0) && (
            <span className="text-slate-400 text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'bwIps',
      label: 'BW / IPs',
      render: (lead) => (
        <div className="flex flex-col gap-1">
          {lead.bandwidthRequirement ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs font-medium">
              <Wifi size={10} />
              {lead.bandwidthRequirement}
            </span>
          ) : null}
          {lead.numberOfIPs ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs font-medium">
              <Hash size={10} />
              {lead.numberOfIPs} IPs
            </span>
          ) : null}
          {!lead.bandwidthRequirement && !lead.numberOfIPs && (
            <span className="text-slate-400 text-sm">-</span>
          )}
        </div>
      ),
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'engagement',
      label: 'Engagement',
      render: (lead) => (
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-md ${
              lead.sharedVia?.includes('whatsapp')
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
            title={lead.sharedVia?.includes('whatsapp') ? 'Shared via WhatsApp' : 'Not shared via WhatsApp'}
          >
            <MessageSquare size={16} />
          </div>
          <div
            className={`p-1.5 rounded-md ${
              lead.sharedVia?.includes('email')
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
            title={lead.sharedVia?.includes('email') ? 'Shared via Email' : 'Not shared via Email'}
          >
            <Mail size={16} />
          </div>
          <button
            onClick={() => lead.linkedinUrl && handleOpenLinkedIn(lead.linkedinUrl)}
            className={`p-1.5 rounded-md transition-colors ${
              lead.linkedinUrl
                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50 cursor-pointer'
                : 'text-slate-300 dark:text-slate-600 cursor-default'
            }`}
            title={lead.linkedinUrl ? 'Open LinkedIn Profile' : 'No LinkedIn URL'}
            disabled={!lead.linkedinUrl}
          >
            <Linkedin size={16} />
          </button>
        </div>
      ),
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'status',
      label: 'Status',
      render: (lead) => (
        isAdmin ? (
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
            className={`h-8 px-2 text-xs rounded-md border cursor-pointer ${getStatusColor(lead.status)}`}
          >
            {leadStatusOptions.map((status) => (
              <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant="outline" className={getStatusColor(lead.status)}>
            {getStatusLabel(lead.status)}
          </Badge>
        )
      ),
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'pipelineStage',
      label: 'Pipeline Stage',
      render: (lead) => {
        const getPipelineStage = (lead) => {
          if (lead.actualPlanIsActive) return { label: 'Live', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' };
          if (lead.customerAcceptanceAt || lead.installationCompletedAt) return { label: 'Installed', color: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-800' };
          if (lead.customerUsername) return { label: 'At NOC', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' };
          if (lead.pushedToInstallationAt) return { label: 'Push to Delivery', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' };
          if (lead.accountsVerifiedAt && lead.accountsStatus === 'ACCOUNTS_APPROVED') return { label: 'Push to Delivery', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' };
          if (lead.docsVerifiedAt && !lead.docsRejectedReason) return { label: 'Accounts Review', color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800' };
          if (lead.sharedVia?.includes('docs_verification')) return { label: 'Docs Review', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800' };
          if (lead.opsApprovalStatus === 'APPROVED') return { label: 'Docs Upload', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' };
          if (lead.opsApprovalStatus === 'PENDING') return { label: 'Quote Sent', color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800' };
          if (lead.status === 'FEASIBLE' || lead.feasibilityReviewedAt) return { label: 'Feasible', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' };
          if (lead.status === 'DROPPED' || lead.status === 'NOT_FEASIBLE' || lead.opsApprovalStatus === 'REJECTED' || lead.accountsStatus === 'ACCOUNTS_REJECTED') return { label: 'Dropped', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' };
          return { label: 'At BDM', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' };
        };
        const stage = getPipelineStage(lead);
        return (
          <Badge variant="outline" className={`font-medium ${stage.color}`}>
            {stage.label}
          </Badge>
        );
      },
      cellClassName: 'whitespace-nowrap',
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (lead) => (
        isAdmin ? (
          <select
            value={lead.assignedTo?.id || ''}
            onChange={(e) => handleAssignBDM(lead.id, e.target.value)}
            className="h-8 px-2 text-xs rounded-md border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Unassigned</option>
            {bdmUsers.map((bdm) => (
              <option key={bdm.id} value={bdm.id}>
                {bdm.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-slate-600 dark:text-slate-400 text-sm">
            {lead.assignedTo?.name || 'Unassigned'}
          </span>
        )
      ),
      cellClassName: 'whitespace-nowrap',
    },
  ];

  // Filter dropdowns rendered in DataTable header
  const filterControls = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Lead no, company, mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
      </div>

      <div className="relative">
        <select
          value={selectedCampaign}
          onChange={(e) => { setSelectedCampaign(e.target.value); setPage(1); }}
          className="h-9 px-3 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-sm appearance-none cursor-pointer"
        >
          <option value="all">All Campaigns</option>
          {uniqueCampaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>

      {/* Pipeline Stage filter */}
      <div className="relative">
        <select
          value={selectedPipelineStage}
          onChange={(e) => { setSelectedPipelineStage(e.target.value); setPage(1); }}
          className="h-9 px-3 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-sm appearance-none cursor-pointer"
        >
          <option value="all">All Stages</option>
          <option value="feasible">Feasible</option>
          <option value="quoteSent">Quote Sent</option>
          <option value="docsUpload">Docs Upload</option>
          <option value="docsReview">Docs Review</option>
          <option value="accountsReview">Accounts Review</option>
          <option value="pushToDelivery">Push to Delivery</option>
          <option value="atNOC">At NOC</option>
          <option value="installed">Delivered / Installed</option>
          <option value="live">Live</option>
          <option value="dropped">Dropped</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </>
  );

  // Actions column renderer
  const renderActions = (lead) => (
    <div className="flex items-center gap-1">
      {/* View Details */}
      <button
        onClick={() => handleViewDetails(lead)}
        className="p-1.5 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        title="View Details"
      >
        <Eye size={16} />
      </button>

      {/* Delete - Admin only */}
      {isAdmin && (
        <button
          onClick={() => handleDelete(lead.id)}
          disabled={deletingId === lead.id}
          className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {deletingId === lead.id ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Leads</span>
      </div>

      {/* Page Header */}
      <PageHeader title="Leads" description={isAdmin ? 'All leads in the system' : isBDM ? 'Leads assigned to you' : 'Leads you have created'}>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="border-slate-200 dark:border-slate-700"
            disabled={!filteredLeads || filteredLeads.length === 0}
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
          {isBDM && (
            <Button
              onClick={() => setShowAddLeadModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add Lead
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards - BDM View with Tabs */}
      {isBDM ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          <StatCard color="blue" icon={Users} label="All Leads" value={bdmStats.total} onClick={() => setSelectedStatus('all')} selected={selectedStatus === 'all'} />
          <StatCard color="emerald" icon={UserCheck} label="Qualified" value={bdmStats.qualified} onClick={() => setSelectedStatus(selectedStatus === 'QUALIFIED' ? 'all' : 'QUALIFIED')} selected={selectedStatus === 'QUALIFIED'} />
          <StatCard color="teal" icon={FileText} label="Feasible" value={bdmStats.feasible} onClick={() => setSelectedStatus(selectedStatus === 'FEASIBLE' ? 'all' : 'FEASIBLE')} selected={selectedStatus === 'FEASIBLE'} />
          <StatCard color="red" icon={X} label="Not Feasible" value={bdmStats.notFeasible} onClick={() => setSelectedStatus(selectedStatus === 'NOT_FEASIBLE' ? 'all' : 'NOT_FEASIBLE')} selected={selectedStatus === 'NOT_FEASIBLE'} />
          <StatCard color="amber" icon={Clock} label="Follow Up" value={bdmStats.followUp} onClick={() => setSelectedStatus(selectedStatus === 'FOLLOW_UP' ? 'all' : 'FOLLOW_UP')} selected={selectedStatus === 'FOLLOW_UP'} />
          <StatCard color="red" icon={X} label="Dropped" value={bdmStats.dropped} onClick={() => setSelectedStatus(selectedStatus === 'DROPPED' ? 'all' : 'DROPPED')} selected={selectedStatus === 'DROPPED'} />
        </div>
      ) : (isISR || isTL || isFeasibilityTeam) ? (
        /* Stats Cards - ISR View: Track lead progress through BDM pipeline */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          <StatCard color="blue" icon={Users} label="Total Leads" value={leadsStats?.total || 0} onClick={() => { setSelectedStatus('all'); setSelectedPipelineStage('all'); setPage(1); }} selected={selectedStatus === 'all' && selectedPipelineStage === 'all'} />
          <StatCard color="amber" icon={Clock} label="Pending" value={leadsStats?.pending || 0} onClick={() => { setSelectedPipelineStage('all'); setSelectedStatus(selectedStatus === 'NEW' ? 'all' : 'NEW'); setPage(1); }} selected={selectedStatus === 'NEW'} />
          <StatCard color="purple" icon={CalendarCheck} label="Meetings Done" value={leadsStats?.meetingsDone || 0} />
          <StatCard color="emerald" icon={ThumbsUp} label="Interested" value={leadsStats?.qualified || 0} onClick={() => { setSelectedPipelineStage('all'); setSelectedStatus(selectedStatus === 'QUALIFIED' ? 'all' : 'QUALIFIED'); setPage(1); }} selected={selectedStatus === 'QUALIFIED'} />
          <StatCard color="red" icon={ThumbsDown} label="Dropped" value={(leadsStats?.dropped || 0) + (leadsStats?.notFeasible || 0)} onClick={() => { setSelectedStatus('all'); setSelectedPipelineStage(selectedPipelineStage === 'dropped' ? 'all' : 'dropped'); setPage(1); }} selected={selectedPipelineStage === 'dropped'} />
          <StatCard color="green" icon={Wifi} label="Live" value={leadsStats?.live || 0} onClick={() => { setSelectedStatus('all'); setSelectedPipelineStage(selectedPipelineStage === 'live' ? 'all' : 'live'); setPage(1); }} selected={selectedPipelineStage === 'live'} />
        </div>
      ) : (
        /* Stats Cards - Admin View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard color="blue" icon={Users} label="Total Leads" value={leadsStats?.total || 0} onClick={() => { setSelectedPipelineStage('all'); setPage(1); }} selected={selectedPipelineStage === 'all'} />
          <StatCard color="teal" icon={UserCheck} label="Feasible" value={leadsStats?.feasible || 0} onClick={() => { setSelectedPipelineStage(selectedPipelineStage === 'feasible' ? 'all' : 'feasible'); setPage(1); }} selected={selectedPipelineStage === 'feasible'} />
          <StatCard color="emerald" icon={Wifi} label="Live" value={leadsStats?.live || 0} onClick={() => { setSelectedPipelineStage(selectedPipelineStage === 'live' ? 'all' : 'live'); setPage(1); }} selected={selectedPipelineStage === 'live'} />
        </div>
      )}

      {/* Leads Table */}
      <DataTable
        title="Lead List"
        totalCount={leadsPagination?.total || 0}
        columns={columns}
        data={filteredLeads}
        filters={filterControls}
        loading={isLoading}
        actions={renderActions}
        emptyMessage="No leads found"
        emptyIcon={Users}
        emptyFilteredMessage="No leads found"
        serverPagination={leadsPagination ? {
          page: leadsPagination.page,
          totalPages: leadsPagination.totalPages,
          total: leadsPagination.total,
          limit: leadsPagination.limit,
        } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        defaultPageSize={pageSize}
      />

      {/* Push to Presales Modal */}
      {showPushToPresalesModal && pushToPresalesLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Push to Presales</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Assign a BDM to handle this lead
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPushToPresalesModal(false);
                  setPushToPresalesLead(null);
                  setSelectedBDMForPush('');
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Lead Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {pushToPresalesLead.company || 'No Company'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {pushToPresalesLead.name || `${pushToPresalesLead.firstName || ''} ${pushToPresalesLead.lastName || ''}`.trim() || 'Unknown'}
                </p>
              </div>

              {/* BDM Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Assign to BDM <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBDMForPush}
                  onChange={(e) => setSelectedBDMForPush(e.target.value)}
                  className="w-full h-11 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                >
                  <option value="">Select a BDM</option>
                  {bdmUsers.map((bdm) => (
                    <option key={bdm.id} value={bdm.id}>
                      {bdm.name}
                    </option>
                  ))}
                </select>
                {bdmUsers.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    No BDM users available. Please create BDM users first.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => {
                  setShowPushToPresalesModal(false);
                  setPushToPresalesLead(null);
                  setSelectedBDMForPush('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPushToPresales}
                disabled={!selectedBDMForPush || isPushing}
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isPushing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Pushing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={16} className="mr-2" />
                    Push to Presales
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Details Modal */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedLead.company || 'Unknown Company'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lead Details and Actions</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Action Buttons Bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
              {/* Lead Type Badge */}
              <Badge variant="outline" className={`font-medium ${getLeadTypeColor(selectedLead.type || 'QUALIFIED')}`}>
                {getLeadTypeLabel(selectedLead.type)}
              </Badge>

              {/* Edit Details */}
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOpenEditModal(selectedLead);
                }}
                variant="outline"
                className="h-9 text-sm"
              >
                <Eye size={16} className="mr-2" />
                Edit Details
              </Button>

              {/* Share Details */}
              <div className="relative" ref={showShareDropdown === 'modal' ? shareDropdownRef : null}>
                <Button
                  onClick={() => setShowShareDropdown(showShareDropdown === 'modal' ? null : 'modal')}
                  variant="outline"
                  className="h-9 text-sm"
                >
                  <Share2 size={16} className="mr-2" />
                  Share Details
                </Button>
                {showShareDropdown === 'modal' && (
                  <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleShareWhatsApp(selectedLead)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-t-lg"
                    >
                      <MessageSquare size={16} />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleShareEmail(selectedLead)}
                      disabled={!selectedLead.email}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg"
                    >
                      <Mail size={16} />
                      Email
                    </button>
                  </div>
                )}
              </div>

              {/* Push to Presales - Only for QUALIFIED leads */}
              {(selectedLead.type === 'QUALIFIED' || !selectedLead.type) && (
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenPushToPresales(selectedLead);
                  }}
                  className="h-9 text-sm bg-slate-700 hover:bg-slate-800 text-white"
                >
                  <Send size={16} className="mr-2" />
                  Push to Presales
                </Button>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Engagement Status Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Engagement Status</h3>
                <div className="space-y-3">
                  {/* LinkedIn Connection */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Linkedin size={20} className="text-sky-600 dark:text-sky-400" />
                      <span className="text-slate-900 dark:text-slate-100 font-medium">LinkedIn Connection</span>
                    </div>
                    {selectedLead.linkedinUrl ? (
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={14} className="mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                        <Clock size={14} className="mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>

                  {/* Email Shared */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-slate-900 dark:text-slate-100 font-medium">Email Shared</span>
                    </div>
                    {selectedLead.sharedVia?.includes('email') ? (
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={14} className="mr-1" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                        <Clock size={14} className="mr-1" />
                        Not Sent
                      </Badge>
                    )}
                  </div>

                  {/* WhatsApp Shared */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <MessageSquare size={20} className="text-green-600 dark:text-green-400" />
                      <span className="text-slate-900 dark:text-slate-100 font-medium">WhatsApp Shared</span>
                    </div>
                    {selectedLead.sharedVia?.includes('whatsapp') ? (
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={14} className="mr-1" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                        <Clock size={14} className="mr-1" />
                        Not Sent
                      </Badge>
                    )}
                  </div>

                </div>
              </div>

              {/* Contact Information Section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Contact Name</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {selectedLead.name || `${selectedLead.firstName || ''} ${selectedLead.lastName || ''}`.trim() || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Phone</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium font-mono">
                      {selectedLead.phone || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">WhatsApp</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium font-mono">
                      {selectedLead.whatsapp || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Email</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {selectedLead.email || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">LinkedIn</span>
                    {selectedLead.linkedinUrl ? (
                      <button
                        onClick={() => handleOpenLinkedIn(selectedLead.linkedinUrl)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                      >
                        View Profile
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>

                  {selectedLead.title && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600 dark:text-slate-400">Designation</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {selectedLead.title}
                      </span>
                    </div>
                  )}

                  {selectedLead.city && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600 dark:text-slate-400">City</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {selectedLead.city}
                      </span>
                    </div>
                  )}

                  {selectedLead.industry && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600 dark:text-slate-400">Industry</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {selectedLead.industry}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements/Notes */}
              {selectedLead.requirements && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                      Important Notes About This Lead
                    </h3>
                    <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">{selectedLead.requirements}</p>
                  </div>
                </div>
              )}

              {/* Lead Info */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Lead Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Status</span>
                    <Badge variant="outline" className={getStatusColor(selectedLead.status)}>
                      {getStatusLabel(selectedLead.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Campaign</span>
                    {(selectedLead.isSelfGenerated || selectedLead.campaign?.name?.startsWith('[Self]')) ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                          {selectedLead.dataCreatedBy?.name || 'Unknown'}
                        </Badge>
                        {selectedLead.campaign && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedLead.campaign.name?.replace(/^\[Self\]\s*/i, '') || '-'}
                          </span>
                        )}
                      </div>
                    ) : selectedLead.campaign ? (
                      <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                        {selectedLead.campaign.name}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Assigned To</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {selectedLead.assignedTo?.name || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 dark:text-slate-400">Created</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {formatDate(selectedLead.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && editLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Lead Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Update contact and lead information
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditLead(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Contact Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Company
                    </label>
                    <Input
                      type="text"
                      value={editForm.company}
                      onChange={(e) => handleEditFormChange('company', e.target.value)}
                      placeholder="Company name"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Contact Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Contact Name
                    </label>
                    <Input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditFormChange('name', e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Designation
                    </label>
                    <Input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => handleEditFormChange('title', e.target.value)}
                      placeholder="Job title"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleEditFormChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-green-600" />
                        WhatsApp
                      </div>
                    </label>
                    <Input
                      type="tel"
                      value={editForm.whatsapp}
                      onChange={(e) => handleEditFormChange('whatsapp', e.target.value)}
                      placeholder="WhatsApp number"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      City
                    </label>
                    <Input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => handleEditFormChange('city', e.target.value)}
                      placeholder="City"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Industry
                    </label>
                    <Input
                      type="text"
                      value={editForm.industry}
                      onChange={(e) => handleEditFormChange('industry', e.target.value)}
                      placeholder="Industry"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* LinkedIn URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Linkedin size={14} className="text-sky-600" />
                        LinkedIn Profile URL
                      </div>
                    </label>
                    <Input
                      type="url"
                      value={editForm.linkedinUrl}
                      onChange={(e) => handleEditFormChange('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Notes/Requirements Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                  Notes & Requirements
                </h3>
                <textarea
                  value={editForm.requirements}
                  onChange={(e) => handleEditFormChange('requirements', e.target.value)}
                  rows={4}
                  placeholder="Add notes, requirements, or any additional information about this lead..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setEditLead(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal (BDM only) */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <UserPlus size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add New Lead</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Create a self-generated lead
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Required Fields Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                  Required Information
                  <span className="text-red-500 text-xs font-normal normal-case">* mandatory</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={addLeadForm.company}
                      onChange={(e) => handleAddLeadFormChange('company', e.target.value)}
                      placeholder="Enter company name"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Contact Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={addLeadForm.contactName}
                      onChange={(e) => handleAddLeadFormChange('contactName', e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={addLeadForm.phone}
                      onChange={(e) => handleAddLeadFormChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Lead Source */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Lead Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addLeadForm.source}
                      onChange={(e) => handleAddLeadFormChange('source', e.target.value)}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                    >
                      <option value="Self Lead">Self Lead</option>
                      <option value="Referral">Referral</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Website">Website</option>
                      <option value="Cold Call">Cold Call</option>
                      <option value="Event">Event</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={addLeadForm.email}
                      onChange={(e) => handleAddLeadFormChange('email', e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Designation
                    </label>
                    <Input
                      type="text"
                      value={addLeadForm.designation}
                      onChange={(e) => handleAddLeadFormChange('designation', e.target.value)}
                      placeholder="Job title"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      City
                    </label>
                    <Input
                      type="text"
                      value={addLeadForm.city}
                      onChange={(e) => handleAddLeadFormChange('city', e.target.value)}
                      placeholder="City"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Industry
                    </label>
                    <Input
                      type="text"
                      value={addLeadForm.industry}
                      onChange={(e) => handleAddLeadFormChange('industry', e.target.value)}
                      placeholder="Industry"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* LinkedIn URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Linkedin size={14} className="text-sky-600" />
                        LinkedIn Profile URL
                      </div>
                    </label>
                    <Input
                      type="url"
                      value={addLeadForm.linkedinUrl}
                      onChange={(e) => handleAddLeadFormChange('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                  Notes
                </h3>
                <textarea
                  value={addLeadForm.notes}
                  onChange={(e) => handleAddLeadFormChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Add any notes or requirements about this lead..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => setShowAddLeadModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLead}
                disabled={isCreatingLead}
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isCreatingLead ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Create Lead
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
