'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore, useComplaintStore } from '@/lib/store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import toast from 'react-hot-toast';
import {
  Plus,
  Eye,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Headphones,
  AlertTriangle,
  Building2,
  User,
  Users,
  Tag,
  FileText,
  Timer,
  ArrowLeft,
  Wifi,
} from 'lucide-react';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { COMPLAINT_STATUS_CONFIG, PRIORITY_CONFIG, getStatusBadgeClass } from '@/lib/statusConfig';

// ---------------------------------------------------------------------------
// Status / Priority config
// ---------------------------------------------------------------------------
const STATUS_ICON_MAP = {
  OPEN: AlertCircle,
  CLOSED: XCircle,
};

const STATUS_CONFIG = Object.fromEntries(
  Object.entries(COMPLAINT_STATUS_CONFIG).map(([key, val]) => [key, { ...val, icon: STATUS_ICON_MAP[key] }])
);

// ---------------------------------------------------------------------------
// TAT helper
// ---------------------------------------------------------------------------
const getTATDisplay = (tatDeadline) => {
  if (!tatDeadline) return { text: '-', isBreached: false };
  const now = new Date();
  const deadline = new Date(tatDeadline);
  const diff = deadline - now;

  if (diff <= 0) {
    const overdueMins = Math.abs(diff) / 60000;
    if (overdueMins < 60) return { text: `Overdue ${Math.floor(overdueMins)}m`, isBreached: true };
    const overdueHrs = overdueMins / 60;
    if (overdueHrs < 24) return { text: `Overdue ${Math.floor(overdueHrs)}h`, isBreached: true };
    return { text: `Overdue ${Math.floor(overdueHrs / 24)}d`, isBreached: true };
  }

  const remainMins = diff / 60000;
  if (remainMins < 60) return { text: `${Math.floor(remainMins)}m left`, isBreached: false };
  const remainHrs = remainMins / 60;
  if (remainHrs < 24) return { text: `${Math.floor(remainHrs)}h left`, isBreached: false };
  return { text: `${Math.floor(remainHrs / 24)}d left`, isBreached: false };
};

const getTimeDuration = (from, to) => {
  if (!from || !to) return '';
  const diff = new Date(to) - new Date(from);
  if (diff <= 0) return '0m';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CustomerComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId;
  const { user } = useAuthStore();
  const {
    fetchCategories,
    categories,
    createComplaint,
    fetchAssignableUsers,
    assignableUsers,
    uploadAttachments,
    fetchCloseOptions,
    closeOptions,
    updateComplaintDetails,
    closeComplaint,
  } = useComplaintStore();

  // Local state for complaints data (avoids shared store loading race)
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    categoryId: '',
    subCategoryId: '',
    priority: 'MEDIUM',
    tatHours: '',
    description: '',
    nocAssigneeId: '',
    opsAssigneeId: '',
    complaintDate: new Date().toISOString().split('T')[0],
  });
  const [subCategories, setSubCategories] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [updateForm, setUpdateForm] = useState({ tatHours: '', categoryId: '', subCategoryId: '', nocAssigneeId: '', opsAssigneeId: '' });
  const [updateSubCategories, setUpdateSubCategories] = useState([]);
  const [updateFiles, setUpdateFiles] = useState([]);
  const updateFileInputRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [closeForm, setCloseForm] = useState({
    reasonForOutage: '',
    resolution: '',
    resolutionType: '',
    closeRemark: '',
    serviceImpact: false,
    ispImpactFrom: '',
    ispImpactTo: '',
    customerImpactFrom: '',
    customerImpactTo: '',
  });
  const [closeFiles, setCloseFiles] = useState([]);
  const closeFileInputRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  // Permission checks
  const canCreate = ['NOC', 'SUPER_ADMIN', 'SUPPORT_TEAM'].includes(user?.role);
  const canUpdateClose = ['NOC', 'SUPER_ADMIN'].includes(user?.role);

  // Load complaints via direct API call (local state)
  const fetchData = useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/complaints/customer/${leadId}?page=${page}&limit=${pageSize}`);
      setComplaints(res.data.complaints || []);
      setPagination(res.data.pagination || null);
    } catch (error) {
      console.error('Failed to load customer complaints:', error);
      toast.error('Failed to load complaints');
    }
    setIsLoading(false);
  }, [leadId, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSocketRefresh(() => { fetchData(); });

  // Fetch reference data on mount
  useEffect(() => {
    fetchCategories();
    fetchAssignableUsers();
    fetchCloseOptions();
  }, [fetchCategories, fetchAssignableUsers, fetchCloseOptions]);

  useEffect(() => { setMobilePage(1); }, [page]);

  // Customer info from first complaint
  const firstComplaint = complaints?.[0];
  const customerInfo = firstComplaint?.lead ? {
    company: firstComplaint.lead.campaignData?.company || '',
    name: firstComplaint.lead.campaignData?.name || '',
    username: firstComplaint.lead.customerUsername || '',
    phone: firstComplaint.lead.campaignData?.phone || '',
    email: firstComplaint.lead.campaignData?.email || '',
  } : null;

  // Stats
  const totalComplaints = pagination?.total ?? 0;
  const openCount = (complaints || []).filter(c => c.status === 'OPEN').length;
  const closedCount = (complaints || []).filter(c => c.status === 'CLOSED').length;
  const tatBreachedCount = (complaints || []).filter(c => {
    if (c.status === 'CLOSED') return false;
    if (!c.tatDeadline) return false;
    return new Date(c.tatDeadline) < new Date();
  }).length;

  // ---------------------------------------------------------------------------
  // Category change
  // ---------------------------------------------------------------------------
  const handleCategoryChange = (catId) => {
    setCreateForm((prev) => ({ ...prev, categoryId: catId, subCategoryId: '', tatHours: '' }));
    const cat = categories.find((c) => c.id === catId);
    setSubCategories(cat?.subCategories || []);
  };

  const handleSubCategoryChange = (subId) => {
    const sub = subCategories.find((s) => s.id === subId);
    setCreateForm((prev) => ({
      ...prev,
      subCategoryId: subId,
      tatHours: sub?.defaultTATHours?.toString() || prev.tatHours,
    }));
  };

  // ---------------------------------------------------------------------------
  // File helpers
  // ---------------------------------------------------------------------------
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const total = selectedFiles.length + files.length;
    if (total > 5) { toast.error(`Maximum 5 files allowed. You already have ${selectedFiles.length}.`); return; }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) { toast.error(`${file.name}: Only PDF, DOC, DOCX, JPG, PNG allowed`); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: File too large (max 10MB)`); return; }
    }
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------------
  // Create complaint
  // ---------------------------------------------------------------------------
  const handleCreateComplaint = async () => {
    if (!createForm.categoryId) { toast.error('Please select a category'); return; }
    if (!createForm.description.trim()) { toast.error('Description is required'); return; }
    if (!createForm.nocAssigneeId) { toast.error('Please select a NOC assignee'); return; }

    setIsSubmitting(true);
    const payload = {
      leadId,
      categoryId: createForm.categoryId,
      subCategoryId: createForm.subCategoryId || undefined,
      priority: createForm.priority,
      tatHours: createForm.tatHours ? Number(createForm.tatHours) : undefined,
      description: createForm.description,
      nocAssigneeId: createForm.nocAssigneeId,
      opsAssigneeId: createForm.opsAssigneeId || undefined,
      complaintDate: createForm.complaintDate || undefined,
    };

    const result = await createComplaint(payload);
    if (result.success) {
      if (selectedFiles.length > 0 && result.data?.id) {
        const uploadResult = await uploadAttachments(result.data.id, selectedFiles);
        if (!uploadResult.success) toast.error('Complaint created but some files failed to upload');
      }
      toast.success('Complaint created successfully');
      setShowCreateModal(false);
      resetCreateForm();
      fetchData();
      setPage(1);
    } else {
      toast.error(result.error || 'Failed to create complaint');
    }
    setIsSubmitting(false);
  };

  const resetCreateForm = () => {
    setCreateForm({ categoryId: '', subCategoryId: '', priority: 'MEDIUM', tatHours: '', description: '', nocAssigneeId: '', opsAssigneeId: '', complaintDate: new Date().toISOString().split('T')[0] });
    setSubCategories([]);
    setSelectedFiles([]);
  };

  useModal(showCreateModal, () => {
    if (!isSubmitting) { setShowCreateModal(false); resetCreateForm(); }
  });

  useModal(showUpdateModal, () => {
    if (!isUpdating) { setShowUpdateModal(false); setUpdateTarget(null); }
  });

  useModal(showCloseModal, () => {
    if (!isClosing) { setShowCloseModal(false); setCloseTarget(null); }
  });

  // ---------------------------------------------------------------------------
  // Update modal
  // ---------------------------------------------------------------------------
  const openUpdateModal = (complaint) => {
    setUpdateTarget(complaint);
    const cat = categories.find(c => c.id === complaint.category?.id);
    setUpdateSubCategories(cat?.subCategories || []);
    const nocAssignee = complaint.assignments?.find(a => ['NOC', 'NOC_TEAM'].includes(a.user?.role))?.user;
    const opsAssignee = complaint.assignments?.find(a => a.user?.role === 'OPS_TEAM')?.user;
    setUpdateForm({
      tatHours: complaint.tatHours?.toString() || '',
      categoryId: complaint.category?.id || '',
      subCategoryId: complaint.subCategory?.id || '',
      nocAssigneeId: nocAssignee?.id || '',
      opsAssigneeId: opsAssignee?.id || '',
    });
    setUpdateFiles([]);
    setShowUpdateModal(true);
  };

  const handleUpdateCategoryChange = (catId) => {
    setUpdateForm(prev => ({ ...prev, categoryId: catId, subCategoryId: '' }));
    const cat = categories.find(c => c.id === catId);
    setUpdateSubCategories(cat?.subCategories || []);
  };

  const handleUpdateFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const total = updateFiles.length + files.length;
    if (total > 5) { toast.error('Maximum 5 files allowed.'); return; }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) { toast.error(`${file.name}: Only PDF, DOC, DOCX, JPG, PNG allowed`); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: File too large (max 10MB)`); return; }
    }
    setUpdateFiles(prev => [...prev, ...files]);
    if (updateFileInputRef.current) updateFileInputRef.current.value = '';
  };

  const handleSubmitUpdate = async () => {
    setIsUpdating(true);
    const payload = {};
    if (updateForm.tatHours) payload.tatHours = Number(updateForm.tatHours);
    if (updateForm.categoryId) payload.categoryId = updateForm.categoryId;
    if (updateForm.subCategoryId) payload.subCategoryId = updateForm.subCategoryId;
    if (updateForm.nocAssigneeId) payload.nocAssigneeId = updateForm.nocAssigneeId;
    if (updateForm.opsAssigneeId) payload.opsAssigneeId = updateForm.opsAssigneeId;

    const result = await updateComplaintDetails(updateTarget.id, payload);
    if (result.success) {
      if (updateFiles.length > 0) await uploadAttachments(updateTarget.id, updateFiles);
      toast.success('Complaint updated successfully');
      setShowUpdateModal(false);
      setUpdateTarget(null);
      fetchData();
    } else {
      toast.error(result.error || 'Failed to update complaint');
    }
    setIsUpdating(false);
  };

  // ---------------------------------------------------------------------------
  // Close modal
  // ---------------------------------------------------------------------------
  const openCloseModal = (complaint) => {
    setCloseTarget(complaint);
    const now = new Date();
    const complaintDate = complaint.complaintDate ? new Date(complaint.complaintDate) : new Date(complaint.createdAt);
    setCloseForm({
      reasonForOutage: '',
      resolution: '',
      resolutionType: '',
      closeRemark: '',
      serviceImpact: false,
      ispImpactFrom: complaintDate.toISOString().slice(0, 16),
      ispImpactTo: now.toISOString().slice(0, 16),
      customerImpactFrom: '',
      customerImpactTo: '',
    });
    setCloseFiles([]);
    setShowCloseModal(true);
  };

  const handleCloseFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const total = closeFiles.length + files.length;
    if (total > 5) { toast.error('Maximum 5 files allowed.'); return; }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) { toast.error(`${file.name}: Only PDF, DOC, DOCX, JPG, PNG allowed`); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: File too large (max 10MB)`); return; }
    }
    setCloseFiles(prev => [...prev, ...files]);
    if (closeFileInputRef.current) closeFileInputRef.current.value = '';
  };

  const handleSubmitClose = async () => {
    if (!closeForm.reasonForOutage) { toast.error('Reason for outage is required'); return; }
    if (!closeForm.resolution) { toast.error('Resolution is required'); return; }
    if (!closeForm.resolutionType) { toast.error('Resolution type is required'); return; }

    setIsClosing(true);
    const payload = {
      reasonForOutage: closeForm.reasonForOutage,
      resolution: closeForm.resolution,
      resolutionType: closeForm.resolutionType,
      closeRemark: closeForm.closeRemark || undefined,
      serviceImpact: closeForm.serviceImpact,
    };
    if (closeForm.serviceImpact) {
      if (closeForm.ispImpactFrom) payload.ispImpactFrom = new Date(closeForm.ispImpactFrom).toISOString();
      if (closeForm.ispImpactTo) payload.ispImpactTo = new Date(closeForm.ispImpactTo).toISOString();
      if (closeForm.customerImpactFrom) payload.customerImpactFrom = new Date(closeForm.customerImpactFrom).toISOString();
      if (closeForm.customerImpactTo) payload.customerImpactTo = new Date(closeForm.customerImpactTo).toISOString();
    }

    const result = await closeComplaint(closeTarget.id, payload);
    if (result.success) {
      if (closeFiles.length > 0) await uploadAttachments(closeTarget.id, closeFiles);
      toast.success('Complaint closed successfully');
      setShowCloseModal(false);
      setCloseTarget(null);
      fetchData();
    } else {
      toast.error(result.error || 'Failed to close complaint');
    }
    setIsClosing(false);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const complaintsWithIndex = (complaints || []).map((c, i) => ({ ...c, _sno: ((page - 1) * pageSize) + i + 1 }));
  const mobileTotalPages = Math.ceil((complaints?.length || 0) / mobilePageSize);
  const mobileStartIndex = (mobilePage - 1) * mobilePageSize;
  const mobileEndIndex = mobileStartIndex + mobilePageSize;
  const mobilePaginatedComplaints = complaints?.slice(mobileStartIndex, mobileEndIndex) || [];

  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/customer-complaints')}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Headphones className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                Customer Complaints
                {totalComplaints > 0 && (
                  <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                    ({totalComplaints})
                  </span>
                )}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 ml-[18px]">
              All complaints for this customer
            </p>
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            size="sm"
          >
            <Plus size={16} />
            New Complaint
          </Button>
        )}
      </div>

      {/* Customer Info Card */}
      {customerInfo && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Company / Name</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {customerInfo.company || 'N/A'}
                  </p>
                  {customerInfo.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{customerInfo.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Username</p>
                  <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                    {customerInfo.username || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Contact</p>
                  <p className="text-sm text-slate-900 dark:text-white truncate">
                    {customerInfo.phone || customerInfo.email || '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="teal" icon={Wifi} label="Total" value={totalComplaints} />
        <StatCard color="blue" icon={AlertCircle} label="Open" value={openCount} />
        <StatCard color="green" icon={CheckCircle} label="Closed" value={closedCount} />
        <StatCard color="red" icon={AlertTriangle} label="TAT Breached" value={tatBreachedCount} />
      </div>

      {/* Desktop DataTable */}
      <DataTable
        columns={[
          {
            key: 'sno',
            label: 'S.No',
            width: '60px',
            render: (row) => (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{row._sno}</span>
            ),
          },
          {
            key: 'complaintNumber',
            label: 'Complaint #',
            render: (row) => (
              <span className="font-semibold text-sm text-slate-900 dark:text-white font-mono">
                {row.complaintNumber || `#${row.id?.slice(0, 8)}`}
              </span>
            ),
          },
          {
            key: 'category',
            label: 'Category / Sub-Category',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {row.category?.name || '-'}
                </p>
                {row.subCategory?.name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {row.subCategory.name}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'priority',
            label: 'Priority',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => {
              const cfg = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.MEDIUM;
              return (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  {cfg.label}
                </span>
              );
            },
          },
          {
            key: 'status',
            label: 'Status',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => {
              const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = cfg.icon;
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  <StatusIcon size={12} />
                  {cfg.label}
                </span>
              );
            },
          },
          {
            key: 'tat',
            label: 'TAT',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => {
              if (row.status === 'CLOSED') {
                return <span className="text-xs text-slate-400">-</span>;
              }
              const tat = getTATDisplay(row.tatDeadline);
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  tat.isBreached
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  <Timer size={11} />
                  {tat.text}
                </span>
              );
            },
          },
          {
            key: 'assignees',
            label: 'Assignees',
            render: (row) => {
              const assignees = row.assignments?.map((a) => a.user?.name || a.assignee?.name).filter(Boolean) || [];
              if (assignees.length === 0) return <span className="text-xs text-slate-400">-</span>;
              return (
                <div className="flex items-center gap-1 flex-wrap">
                  {assignees.slice(0, 2).map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <User size={10} />
                      {name.split(' ')[0]}
                    </span>
                  ))}
                  {assignees.length > 2 && (
                    <span className="text-xs text-slate-400">+{assignees.length - 2}</span>
                  )}
                </div>
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
                  {new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ),
          },
        ]}
        data={complaintsWithIndex}
        loading={isLoading}
        pagination={true}
        defaultPageSize={pageSize}
        serverPagination={pagination ? {
          page: pagination.page || page,
          limit: pagination.limit || pageSize,
          total: pagination.total || 0,
          totalPages: pagination.totalPages || 1,
        } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        emptyMessage="No complaints found for this customer"
        emptyIcon={Headphones}
        emptyFilteredMessage="No complaints found"
        className="hidden lg:block"
        actions={(row) => (
          <div className="flex items-center justify-center gap-1.5">
            <div className="relative group">
              <button
                onClick={() => router.push(`/dashboard/complaints/${row.id}`)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
              >
                <Eye size={13} />
                View
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">View Details</span>
            </div>
            {canUpdateClose && row.status !== 'CLOSED' && (
              <>
                <div className="relative group">
                  <button
                    onClick={() => openUpdateModal(row)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Update Complaint</span>
                </div>
                <div className="relative group">
                  <button
                    onClick={() => openCloseModal(row)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 transition-all"
                  >
                    <XCircle size={13} />
                    Close
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Close Complaint</span>
                </div>
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
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : mobilePaginatedComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Headphones size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No complaints found</p>
              <p className="text-sm mt-1">No complaints for this customer yet</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {mobilePaginatedComplaints.map((complaint, index) => {
                  const statusCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.OPEN;
                  const StatusIcon = statusCfg.icon;
                  const priorityCfg = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.MEDIUM;
                  const tat = getTATDisplay(complaint.tatDeadline);
                  const isClosed = complaint.status === 'CLOSED';

                  return (
                    <div key={complaint.id} className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                          <Headphones className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white font-mono truncate">
                                {complaint.complaintNumber || `#${complaint.id?.slice(0, 8)}`}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-slate-400 flex-shrink-0">#{mobileStartIndex + index + 1}</span>
                          </div>
                        </div>
                      </div>

                      {complaint.category?.name && (
                        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-600 dark:text-slate-400">
                          <Tag size={12} className="flex-shrink-0" />
                          <span className="truncate">{complaint.category.name}{complaint.subCategory?.name ? ` / ${complaint.subCategory.name}` : ''}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon size={10} />
                          {statusCfg.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityCfg.color}`}>
                          {priorityCfg.label}
                        </span>
                        {!isClosed && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            tat.isBreached
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <Timer size={10} />
                            {tat.text}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                          {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {complaint.assignments?.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500 dark:text-slate-400">
                          <Users size={12} className="flex-shrink-0" />
                          <span className="truncate">
                            {complaint.assignments.map((a) => a.user?.name || a.assignee?.name).filter(Boolean).join(', ') || '-'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => router.push(`/dashboard/complaints/${complaint.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        {canUpdateClose && complaint.status !== 'CLOSED' && (
                          <>
                            <button
                              onClick={() => openUpdateModal(complaint)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
                            <button
                              onClick={() => openCloseModal(complaint)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                            >
                              <XCircle size={13} />
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {mobileTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Showing <span className="font-medium">{mobileStartIndex + 1}</span> to <span className="font-medium">{Math.min(mobileEndIndex, complaints.length)}</span> of <span className="font-medium">{complaints.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMobilePage((p) => Math.max(1, p - 1))} disabled={mobilePage === 1} className="h-8 w-8 p-0">
                      <ChevronLeft size={16} />
                    </Button>
                    {Array.from({ length: Math.min(mobileTotalPages, 5) }, (_, i) => {
                      let pg;
                      if (mobileTotalPages <= 5) pg = i + 1;
                      else if (mobilePage <= 3) pg = i + 1;
                      else if (mobilePage >= mobileTotalPages - 2) pg = mobileTotalPages - 4 + i;
                      else pg = mobilePage - 2 + i;
                      return (
                        <button
                          key={pg}
                          onClick={() => setMobilePage(pg)}
                          className={`h-8 w-8 text-sm rounded-md font-medium transition-colors ${
                            pg === mobilePage ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <Button size="sm" variant="outline" onClick={() => setMobilePage((p) => Math.min(mobileTotalPages, p + 1))} disabled={mobilePage === mobileTotalPages} className="h-8 w-8 p-0">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Complaint Modal */}
      {showCreateModal && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-teal-50 dark:bg-teal-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <Headphones size={18} className="text-teal-600 dark:text-teal-400" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">New Complaint</h2>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Pre-selected Customer Banner */}
              {customerInfo && (
                <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {customerInfo.company || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {customerInfo.name}
                      {customerInfo.username && (
                        <span className="text-slate-400"> &middot; {customerInfo.username}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-medium flex-shrink-0">Customer</span>
                </div>
              )}

              {/* Category & Sub-Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Category</option>
                    {(categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sub-Category</label>
                  <select
                    value={createForm.subCategoryId}
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    className={inputClass}
                    disabled={!createForm.categoryId || subCategories.length === 0}
                  >
                    <option value="">Select Sub-Category</option>
                    {subCategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & TAT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>TAT Hours</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.tatHours}
                    onChange={(e) => setCreateForm((p) => ({ ...p, tatHours: e.target.value }))}
                    placeholder="e.g. 24"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the complaint in detail..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Complaint Date */}
              <div>
                <label className={labelClass}>Complaint Date</label>
                <input
                  type="date"
                  value={createForm.complaintDate}
                  onChange={(e) => setCreateForm((p) => ({ ...p, complaintDate: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputClass}
                />
              </div>

              {/* NOC & OPS Assignees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    NOC Assignee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.nocAssigneeId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nocAssigneeId: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select NOC User</option>
                    {(assignableUsers.noc || []).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>OPS Assignee</label>
                  <select
                    value={createForm.opsAssigneeId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, opsAssigneeId: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select OPS User (Optional)</option>
                    {(assignableUsers.ops || []).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Attachments */}
              <div>
                <label className={labelClass}>
                  Attachments
                  <span className="text-xs text-slate-400 font-normal ml-1">(optional, max 5 files, 10MB each)</span>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedFiles.map((file, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        <FileText size={12} />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <span className="text-slate-400">({(file.size / 1024).toFixed(0)}KB)</span>
                        <button onClick={() => removeFile(i)} className="ml-0.5 text-slate-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {selectedFiles.length < 5 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-teal-400'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-teal-400'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('ring-2', 'ring-teal-400');
                      const dt = e.dataTransfer;
                      if (dt.files) handleFileSelect({ target: { files: dt.files } });
                    }}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Plus size={20} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Drop files here or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, DOCX, JPG, PNG</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button
                type="button"
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateComplaint}
                disabled={isSubmitting || !createForm.categoryId || !createForm.description.trim() || !createForm.nocAssigneeId}
                size="sm"
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin w-4 h-4 mr-2" />Creating...</>
                ) : (
                  <><Plus size={16} className="mr-1" />Create Complaint</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update Complaint Modal */}
      {showUpdateModal && updateTarget && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Pencil size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Update Complaint</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{updateTarget.complaintNumber}</p>
                </div>
              </div>
              <button onClick={() => { setShowUpdateModal(false); setUpdateTarget(null); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className={labelClass}>TAT Hours</label>
                <input type="number" min="1" value={updateForm.tatHours} onChange={(e) => setUpdateForm(p => ({ ...p, tatHours: e.target.value }))} placeholder="e.g. 24" className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={updateForm.categoryId} onChange={(e) => handleUpdateCategoryChange(e.target.value)} className={inputClass}>
                    <option value="">Select Category</option>
                    {(categories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sub-Category</label>
                  <select value={updateForm.subCategoryId} onChange={(e) => setUpdateForm(p => ({ ...p, subCategoryId: e.target.value }))} className={inputClass} disabled={!updateForm.categoryId || updateSubCategories.length === 0}>
                    <option value="">Select Sub-Category</option>
                    {updateSubCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>NOC Assignee</label>
                  <select value={updateForm.nocAssigneeId} onChange={(e) => setUpdateForm(p => ({ ...p, nocAssigneeId: e.target.value }))} className={inputClass}>
                    <option value="">Select NOC User</option>
                    {(assignableUsers.noc || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>OPS Assignee</label>
                  <select value={updateForm.opsAssigneeId} onChange={(e) => setUpdateForm(p => ({ ...p, opsAssigneeId: e.target.value }))} className={inputClass}>
                    <option value="">None</option>
                    {(assignableUsers.ops || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Upload Files <span className="text-xs text-slate-400 font-normal ml-1">(optional, max 5)</span></label>
                {updateFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {updateFiles.map((file, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
                        <FileText size={12} />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => setUpdateFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-slate-400 hover:text-red-500"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {updateFiles.length < 5 && (
                  <div onClick={() => updateFileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                    <input ref={updateFileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUpdateFileSelect} className="hidden" />
                    <Plus size={18} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Drop files here or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button type="button" onClick={() => { setShowUpdateModal(false); setUpdateTarget(null); }} variant="outline" size="sm" className="flex-1">Cancel</Button>
              <Button onClick={handleSubmitUpdate} disabled={isUpdating} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {isUpdating ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Updating...</> : <><Pencil size={16} className="mr-1" />Update</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Complaint Modal */}
      {showCloseModal && closeTarget && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Close Complaint</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{closeTarget.complaintNumber}</p>
                </div>
              </div>
              <button onClick={() => { setShowCloseModal(false); setCloseTarget(null); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className={labelClass}>Reason for Outage <span className="text-red-500">*</span></label>
                <select value={closeForm.reasonForOutage} onChange={(e) => setCloseForm(p => ({ ...p, reasonForOutage: e.target.value }))} className={inputClass}>
                  <option value="">Select Reason</option>
                  {(closeOptions?.REASON_FOR_OUTAGE || []).map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Resolution <span className="text-red-500">*</span></label>
                  <select value={closeForm.resolution} onChange={(e) => setCloseForm(p => ({ ...p, resolution: e.target.value }))} className={inputClass}>
                    <option value="">Select Resolution</option>
                    {(closeOptions?.RESOLUTION || []).map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Resolution Type <span className="text-red-500">*</span></label>
                  <select value={closeForm.resolutionType} onChange={(e) => setCloseForm(p => ({ ...p, resolutionType: e.target.value }))} className={inputClass}>
                    <option value="">Select Type</option>
                    {(closeOptions?.RESOLUTION_TYPE || []).map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Remark</label>
                <textarea value={closeForm.closeRemark} onChange={(e) => setCloseForm(p => ({ ...p, closeRemark: e.target.value }))} rows={3} placeholder="Additional remarks..." className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className={labelClass}>Upload <span className="text-xs text-slate-400 font-normal ml-1">(optional)</span></label>
                {closeFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {closeFiles.map((file, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
                        <FileText size={12} />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => setCloseFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-slate-400 hover:text-red-500"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {closeFiles.length < 5 && (
                  <div onClick={() => closeFileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                    <input ref={closeFileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleCloseFileSelect} className="hidden" />
                    <Plus size={18} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Drop files here or click to browse</p>
                  </div>
                )}
              </div>

              {/* Service Impact */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Service Impact</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCloseForm(p => ({ ...p, serviceImpact: true }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${closeForm.serviceImpact ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-300 dark:ring-red-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                    >Yes</button>
                    <button
                      onClick={() => setCloseForm(p => ({ ...p, serviceImpact: false }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!closeForm.serviceImpact ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-300 dark:ring-green-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                    >No</button>
                  </div>
                </div>

                {closeForm.serviceImpact && (
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ISP Impact Time <span className="text-xs text-slate-400 font-normal">(auto-filled)</span></p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">From</label>
                          <input type="datetime-local" value={closeForm.ispImpactFrom} onChange={(e) => setCloseForm(p => ({ ...p, ispImpactFrom: e.target.value }))} className={inputClass} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">To</label>
                          <input type="datetime-local" value={closeForm.ispImpactTo} onChange={(e) => setCloseForm(p => ({ ...p, ispImpactTo: e.target.value }))} className={inputClass} />
                        </div>
                      </div>
                      {closeForm.ispImpactFrom && closeForm.ispImpactTo && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium">
                          Duration: {getTimeDuration(closeForm.ispImpactFrom, closeForm.ispImpactTo)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Customer Impact Time <span className="text-xs text-slate-400 font-normal">(manual)</span></p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">From</label>
                          <input type="datetime-local" value={closeForm.customerImpactFrom} onChange={(e) => setCloseForm(p => ({ ...p, customerImpactFrom: e.target.value }))} className={inputClass} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">To</label>
                          <input type="datetime-local" value={closeForm.customerImpactTo} onChange={(e) => setCloseForm(p => ({ ...p, customerImpactTo: e.target.value }))} className={inputClass} />
                        </div>
                      </div>
                      {closeForm.customerImpactFrom && closeForm.customerImpactTo && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium">
                          Duration: {getTimeDuration(closeForm.customerImpactFrom, closeForm.customerImpactTo)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button type="button" onClick={() => { setShowCloseModal(false); setCloseTarget(null); }} variant="outline" size="sm" className="flex-1">Cancel</Button>
              <Button onClick={handleSubmitClose} disabled={isClosing || !closeForm.reasonForOutage || !closeForm.resolution || !closeForm.resolutionType} size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {isClosing ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Closing...</> : <><XCircle size={16} className="mr-1" />Close Complaint</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
