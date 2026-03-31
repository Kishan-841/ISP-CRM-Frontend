'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useComplaintStore } from '@/lib/store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  XCircle,
  X,
  Headphones,
  Inbox,
  AlertTriangle,
  CalendarCheck,
  Building2,
  User,
  Users,
  Tag,
  FileText,
  LayoutGrid,
  Timer,
} from 'lucide-react';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { COMPLAINT_STATUS_CONFIG, PRIORITY_CONFIG, getStatusBadgeClass } from '@/lib/statusConfig';
import TabBar from '@/components/TabBar';

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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ComplaintsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    complaints,
    stats,
    pagination,
    loading,
    fetchComplaints,
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Mobile pagination
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    leadId: '',
    categoryId: '',
    subCategoryId: '',
    priority: 'MEDIUM',
    tatHours: '',
    description: '',
    nocAssigneeId: '',
    opsAssigneeId: '',
    accountsAssigneeId: '',
    complaintDate: new Date().toISOString().split('T')[0],
  });

  // Customer search for create modal
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const customerSearchTimeout = useRef(null);

  // Sub-categories for selected category
  const [subCategories, setSubCategories] = useState([]);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [updateForm, setUpdateForm] = useState({ tatHours: '', categoryId: '', subCategoryId: '', nocAssigneeId: '', opsAssigneeId: '', accountsAssigneeId: '' });
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

  // Customer Requests tab state
  const [customerRequests, setCustomerRequests] = useState([]);
  const [crPagination, setCrPagination] = useState(null);
  const [crLoading, setCrLoading] = useState(false);
  const [crCount, setCrCount] = useState(0);
  const [crPage, setCrPage] = useState(1);

  // Log Complaint modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTarget, setLogTarget] = useState(null);
  const [logForm, setLogForm] = useState({ priority: 'MEDIUM', tatHours: '', nocAssigneeId: '', opsAssigneeId: '', accountsAssigneeId: '', notes: '' });
  const [isLogging, setIsLogging] = useState(false);

  // Permission checks
  const canCreate = ['NOC', 'NOC_HEAD', 'SUPER_ADMIN', 'SUPPORT_TEAM'].includes(user?.role);
  const isOpsUser = user?.role === 'OPS_TEAM';
  const canClose = ['NOC', 'NOC_HEAD', 'SUPER_ADMIN'].includes(user?.role);
  const canUpdateDetails = ['NOC', 'NOC_HEAD', 'SUPER_ADMIN', 'OPS_TEAM'].includes(user?.role);
  const canUpdateClose = canClose; // Backward compat for existing references

  // Map tab to status filter
  const getStatusFilter = useCallback(() => {
    switch (activeTab) {
      case 'open': return 'OPEN';
      case 'closed': return 'CLOSED';
      default: return undefined;
    }
  }, [activeTab]);

  useSocketRefresh(() => {
    const params = { page, limit: pageSize };
    const status = getStatusFilter();
    if (status) params.status = status;
    if (searchTerm) params.search = searchTerm;
    if (priorityFilter) params.priority = priorityFilter;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    fetchComplaints(params);
  });

  // Fetch complaints when filters change
  useEffect(() => {
    const params = { page, limit: pageSize };
    const status = getStatusFilter();
    if (status) params.status = status;
    if (searchTerm) params.search = searchTerm;
    if (priorityFilter) params.priority = priorityFilter;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    fetchComplaints(params);
  }, [activeTab, searchTerm, priorityFilter, categoryFilter, dateFrom, dateTo, page, pageSize, fetchComplaints, getStatusFilter]);

  // Fetch categories, assignable users, and close options on mount
  useEffect(() => {
    fetchCategories();
    fetchAssignableUsers();
    fetchCloseOptions();
  }, [fetchCategories, fetchAssignableUsers, fetchCloseOptions]);

  // Reset pages on filter change
  useEffect(() => {
    setPage(1);
    setMobilePage(1);
  }, [activeTab, searchTerm, priorityFilter, categoryFilter, dateFrom, dateTo]);

  // -----------------------------------------------------------------------
  // Customer search (debounced)
  // -----------------------------------------------------------------------
  const handleCustomerSearch = (term) => {
    setCustomerSearch(term);
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
    if (!term || term.length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearching(true);
    customerSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get(`/complaints/search-customers?q=${encodeURIComponent(term)}`);
        setCustomerResults(res.data?.customers || []);
      } catch {
        setCustomerResults([]);
      }
      setCustomerSearching(false);
    }, 400);
  };

  const selectCustomer = (lead) => {
    setSelectedCustomer(lead);
    setCreateForm((prev) => ({ ...prev, leadId: lead.id }));
    setCustomerSearch('');
    setCustomerResults([]);
  };

  // -----------------------------------------------------------------------
  // Category change => load sub-categories
  // -----------------------------------------------------------------------
  // Categories that should be assigned to Accounts team instead of NOC/Feasibility
  const ACCOUNTS_CATEGORY_NAMES = ['Billing & Payments', 'Account & Documentation'];
  const isAccountsCategory = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? ACCOUNTS_CATEGORY_NAMES.includes(cat.name) : false;
  };

  const handleCategoryChange = (catId) => {
    setCreateForm((prev) => ({ ...prev, categoryId: catId, subCategoryId: '', tatHours: '', nocAssigneeId: '', opsAssigneeId: '', accountsAssigneeId: '' }));
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const total = selectedFiles.length + files.length;
    if (total > 5) {
      toast.error(`Maximum 5 files allowed. You already have ${selectedFiles.length}.`);
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Only PDF, DOC, DOCX, JPG, PNG allowed`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return;
      }
    }
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // -----------------------------------------------------------------------
  // Submit create complaint
  // -----------------------------------------------------------------------
  const handleCreateComplaint = async () => {
    if (!createForm.leadId) { toast.error('Please select a customer'); return; }
    if (!createForm.categoryId) { toast.error('Please select a category'); return; }
    if (!createForm.description.trim()) { toast.error('Description is required'); return; }
    const isAccCat = isAccountsCategory(createForm.categoryId);
    if (isAccCat && !createForm.accountsAssigneeId) { toast.error('Please select an Accounts assignee'); return; }
    if (!isAccCat && !createForm.nocAssigneeId) { toast.error('Please select a NOC assignee'); return; }

    setIsSubmitting(true);
    const payload = {
      leadId: createForm.leadId,
      categoryId: createForm.categoryId,
      subCategoryId: createForm.subCategoryId || undefined,
      priority: createForm.priority,
      tatHours: createForm.tatHours ? Number(createForm.tatHours) : undefined,
      description: createForm.description,
      complaintDate: createForm.complaintDate || undefined,
    };
    if (isAccCat) {
      payload.accountsAssigneeId = createForm.accountsAssigneeId;
    } else {
      payload.nocAssigneeId = createForm.nocAssigneeId;
      payload.opsAssigneeId = createForm.opsAssigneeId || undefined;
    }

    const result = await createComplaint(payload);
    if (result.success) {
      if (selectedFiles.length > 0 && result.data?.id) {
        const uploadResult = await uploadAttachments(result.data.id, selectedFiles);
        if (!uploadResult.success) {
          toast.error('Complaint created but some files failed to upload');
        }
      }
      toast.success('Complaint created successfully');
      setShowCreateModal(false);
      resetCreateForm();
      const params = { page: 1, limit: pageSize };
      const status = getStatusFilter();
      if (status) params.status = status;
      fetchComplaints(params);
    } else {
      toast.error(result.error || 'Failed to create complaint');
    }
    setIsSubmitting(false);
  };

  const resetCreateForm = () => {
    setCreateForm({ leadId: '', categoryId: '', subCategoryId: '', priority: 'MEDIUM', tatHours: '', description: '', nocAssigneeId: '', opsAssigneeId: '', accountsAssigneeId: '', complaintDate: new Date().toISOString().split('T')[0] });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setSubCategories([]);
    setSelectedFiles([]);
  };

  useModal(showCreateModal, () => {
    if (!isSubmitting) {
      setShowCreateModal(false);
      resetCreateForm();
    }
  });

  useModal(showUpdateModal, () => {
    if (!isUpdating) {
      setShowUpdateModal(false);
      setUpdateTarget(null);
    }
  });

  useModal(showCloseModal, () => {
    if (!isClosing) {
      setShowCloseModal(false);
      setCloseTarget(null);
    }
  });

  useModal(showLogModal, () => {
    if (!isLogging) {
      setShowLogModal(false);
      setLogTarget(null);
    }
  });

  // -----------------------------------------------------------------------
  // Open Update modal
  // -----------------------------------------------------------------------
  const openUpdateModal = (complaint) => {
    setUpdateTarget(complaint);
    const cat = categories.find(c => c.id === complaint.category?.id);
    setUpdateSubCategories(cat?.subCategories || []);
    const nocAssignee = complaint.assignments?.find(a => ['NOC', 'NOC_HEAD'].includes(a.user?.role))?.user;
    const opsAssignee = complaint.assignments?.find(a => a.user?.role === 'OPS_TEAM')?.user;
    const accAssignee = complaint.assignments?.find(a => a.user?.role === 'ACCOUNTS_TEAM')?.user;
    setUpdateForm({
      tatHours: complaint.tatHours?.toString() || '',
      categoryId: complaint.category?.id || '',
      subCategoryId: complaint.subCategory?.id || '',
      nocAssigneeId: nocAssignee?.id || '',
      opsAssigneeId: opsAssignee?.id || '',
      accountsAssigneeId: accAssignee?.id || '',
      remark: '',
    });
    setUpdateFiles([]);
    setShowUpdateModal(true);
  };

  const handleUpdateCategoryChange = (catId) => {
    setUpdateForm(prev => ({ ...prev, categoryId: catId, subCategoryId: '', nocAssigneeId: '', opsAssigneeId: '', accountsAssigneeId: '' }));
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
    if (updateForm.remark?.trim()) payload.remark = updateForm.remark.trim();
    // OPS cannot reassign — only NOC/NOC_HEAD/admin can
    if (!isOpsUser) {
      const isAccCatUpdate = isAccountsCategory(updateForm.categoryId);
      if (isAccCatUpdate) {
        if (updateForm.accountsAssigneeId) payload.accountsAssigneeId = updateForm.accountsAssigneeId;
      } else {
        if (updateForm.nocAssigneeId) payload.nocAssigneeId = updateForm.nocAssigneeId;
        if (updateForm.opsAssigneeId) payload.opsAssigneeId = updateForm.opsAssigneeId;
      }
    }

    const result = await updateComplaintDetails(updateTarget.id, payload);
    if (result.success) {
      if (updateFiles.length > 0) {
        await uploadAttachments(updateTarget.id, updateFiles);
      }
      toast.success('Complaint updated successfully');
      setShowUpdateModal(false);
      setUpdateTarget(null);
      fetchComplaints({ page, limit: pageSize });
    } else {
      toast.error(result.error || 'Failed to update complaint');
    }
    setIsUpdating(false);
  };

  // -----------------------------------------------------------------------
  // Open Close modal
  // -----------------------------------------------------------------------
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
      if (closeFiles.length > 0) {
        await uploadAttachments(closeTarget.id, closeFiles);
      }
      toast.success('Complaint closed successfully');
      setShowCloseModal(false);
      setCloseTarget(null);
      fetchComplaints({ page, limit: pageSize });
    } else {
      toast.error(result.error || 'Failed to close complaint');
    }
    setIsClosing(false);
  };

  // -----------------------------------------------------------------------
  // Customer Requests fetch + Log Complaint
  // -----------------------------------------------------------------------
  const fetchCustomerRequests = useCallback(async (pg = 1) => {
    setCrLoading(true);
    try {
      const res = await api.get(`/complaints/customer-requests?page=${pg}&limit=10&status=PENDING`);
      setCustomerRequests(res.data?.data || []);
      setCrPagination(res.data?.pagination || null);
      setCrCount(res.data?.pagination?.total || 0);
    } catch {
      setCustomerRequests([]);
    }
    setCrLoading(false);
  }, []);

  // Fetch customer requests count on mount (for tab badge)
  useEffect(() => {
    if (canCreate) {
      api.get('/complaints/customer-requests?page=1&limit=1&status=PENDING')
        .then(res => setCrCount(res.data?.pagination?.total || 0))
        .catch(() => {});
    }
  }, [canCreate]);

  // Fetch customer requests data when tab is active
  useEffect(() => {
    if (activeTab === 'requests') {
      fetchCustomerRequests(crPage);
    }
  }, [activeTab, crPage, fetchCustomerRequests]);

  const [logSubCategories, setLogSubCategories] = useState([]);

  const openLogModal = (request) => {
    setLogTarget(request);
    // Pre-populate sub-categories from the request's category
    const cat = categories.find(c => c.id === request.categoryId);
    setLogSubCategories(cat?.subCategories || []);
    setLogForm({
      priority: 'MEDIUM',
      tatHours: request.subCategory?.defaultTATHours?.toString() || '',
      nocAssigneeId: '',
      opsAssigneeId: '',
      accountsAssigneeId: '',
      notes: '',
      categoryId: request.categoryId || '',
      subCategoryId: request.subCategoryId || '',
    });
    setShowLogModal(true);
  };

  const handleLogCategoryChange = (catId) => {
    const cat = categories.find(c => c.id === catId);
    setLogSubCategories(cat?.subCategories || []);
    setLogForm(p => ({ ...p, categoryId: catId, subCategoryId: '', tatHours: '', nocAssigneeId: '', opsAssigneeId: '', accountsAssigneeId: '' }));
  };

  const handleLogSubCategoryChange = (subId) => {
    const sub = logSubCategories.find(s => s.id === subId);
    setLogForm(p => ({ ...p, subCategoryId: subId, tatHours: sub?.defaultTATHours?.toString() || p.tatHours }));
  };

  const handleLogComplaint = async () => {
    const isAccCatLog = isAccountsCategory(logForm.categoryId);
    if (isAccCatLog && !logForm.accountsAssigneeId) { toast.error('Please select an Accounts assignee'); return; }
    if (!isAccCatLog && !logForm.nocAssigneeId) { toast.error('Please select a NOC assignee'); return; }

    setIsLogging(true);
    try {
      const payload = {
        priority: logForm.priority,
        tatHours: logForm.tatHours ? Number(logForm.tatHours) : undefined,
        notes: logForm.notes || undefined,
        categoryId: logForm.categoryId || undefined,
        subCategoryId: logForm.subCategoryId || undefined,
      };
      if (isAccCatLog) {
        payload.accountsAssigneeId = logForm.accountsAssigneeId;
      } else {
        payload.nocAssigneeId = logForm.nocAssigneeId;
        payload.opsAssigneeId = logForm.opsAssigneeId || undefined;
      }
      await api.post(`/complaints/customer-requests/${logTarget.id}/log`, payload);
      toast.success('Complaint logged successfully');
      setShowLogModal(false);
      setLogTarget(null);
      fetchCustomerRequests(crPage);
      // Refresh main complaint list too
      const params = { page, limit: pageSize };
      const status = getStatusFilter();
      if (status) params.status = status;
      fetchComplaints(params);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log complaint');
    }
    setIsLogging(false);
  };

  // -----------------------------------------------------------------------
  // Stats helpers
  // -----------------------------------------------------------------------
  const byStatus = stats?.byStatus || {};
  const totalOpen = byStatus.OPEN || 0;
  const tatBreached = stats?.tatBreached || 0;
  const closedToday = stats?.closedToday || 0;

  // -----------------------------------------------------------------------
  // Tabs
  // -----------------------------------------------------------------------
  const tabs = [
    { key: 'all', label: 'All', count: stats?.total || complaints.length, icon: LayoutGrid, color: 'teal' },
    { key: 'open', label: 'Open', count: byStatus.OPEN || 0, icon: AlertCircle, color: 'blue' },
    { key: 'closed', label: 'Closed', count: byStatus.CLOSED || 0, icon: XCircle, color: 'gray' },
    ...(canCreate ? [{ key: 'requests', label: 'Customer Requests', count: crCount, icon: Inbox, color: 'amber' }] : []),
  ];


  // Add serial numbers
  const complaintsWithIndex = (complaints || []).map((c, i) => ({ ...c, _sno: ((page - 1) * pageSize) + i + 1 }));

  // Mobile pagination
  const mobileTotalPages = Math.ceil((complaints?.length || 0) / mobilePageSize);
  const mobileStartIndex = (mobilePage - 1) * mobilePageSize;
  const mobileEndIndex = mobileStartIndex + mobilePageSize;
  const mobilePaginatedComplaints = complaints?.slice(mobileStartIndex, mobileEndIndex) || [];

  // Common input class
  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Headphones className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Complaints
              {stats?.total !== undefined && (
                <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                  ({stats.total})
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 ml-[18px]">
            Manage customer complaints and service requests
          </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="blue" icon={AlertCircle} label="Total Open" value={totalOpen} />
        <StatCard color="red" icon={AlertTriangle} label="TAT Breached" value={tatBreached} />
        <StatCard color="green" icon={CalendarCheck} label="Closed Today" value={closedToday} />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.key,
          label: tab.label,
          count: tab.count,
          icon: tab.icon,
          variant: tab.key === 'open' ? 'info' : tab.key === 'closed' ? 'danger' : tab.key === 'requests' ? 'warning' : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab !== 'requests' ? (
      <>
      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-64 md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search complaint #, customer, username..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {(categories || []).map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Clear filters */}
        {(searchTerm || priorityFilter || categoryFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearchTerm(''); setPriorityFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); }}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Desktop DataTable */}
      <DataTable
        columns={[
          {
            key: 'sno',
            label: 'S.No',
            width: '60px',
            render: (row) => (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {row._sno}
              </span>
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
            key: 'customer',
            label: 'Customer',
            render: (row) => (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {row.lead?.campaignData?.company || row.lead?.customerUsername || '-'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {row.lead?.campaignData?.name || ''}
                    {row.lead?.customerUsername && <span className="text-slate-400"> · {row.lead.customerUsername}</span>}
                  </p>
                </div>
              </div>
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
        loading={loading}
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
        emptyMessage="No complaints found"
        emptyIcon={Headphones}
        emptyFilteredMessage="No complaints match your filters"
        className="hidden lg:block"
        actions={(row) => (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => router.push(`/dashboard/complaints/${row.id}`)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 hover:bg-teal-100 dark:hover:bg-teal-950/50 transition-colors"
            >
              <Eye size={13} />
              View
            </button>
            {canUpdateDetails && row.status !== 'CLOSED' && (
              <button
                onClick={() => openUpdateModal(row)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
            {canClose && row.status !== 'CLOSED' && (
              <button
                onClick={() => openCloseModal(row)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                <XCircle size={13} />
                Close
              </button>
            )}
          </div>
        )}
      />

      {/* Mobile Card View */}
      <Card className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : mobilePaginatedComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Headphones size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No complaints found</p>
              <p className="text-sm mt-1">
                {searchTerm || priorityFilter || categoryFilter ? 'Try different filters' : 'No complaints yet'}
              </p>
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
                      {/* Card Header */}
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
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {complaint.lead?.campaignData?.company || complaint.lead?.customerUsername || '-'}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-slate-400 flex-shrink-0">#{mobileStartIndex + index + 1}</span>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      {complaint.category?.name && (
                        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-600 dark:text-slate-400">
                          <Tag size={12} className="flex-shrink-0" />
                          <span className="truncate">{complaint.category.name}{complaint.subCategory?.name ? ` / ${complaint.subCategory.name}` : ''}</span>
                        </div>
                      )}

                      {/* Badges */}
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

                      {/* Assignees */}
                      {complaint.assignments?.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500 dark:text-slate-400">
                          <Users size={12} className="flex-shrink-0" />
                          <span className="truncate">
                            {complaint.assignments.map((a) => a.user?.name || a.assignee?.name).filter(Boolean).join(', ') || '-'}
                          </span>
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => router.push(`/dashboard/complaints/${complaint.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        {canUpdateDetails && complaint.status !== 'CLOSED' && (
                          <button
                            onClick={() => openUpdateModal(complaint)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        )}
                        {canClose && complaint.status !== 'CLOSED' && (
                          <button
                            onClick={() => openCloseModal(complaint)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                          >
                            <XCircle size={13} />
                            Close
                          </button>
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
                    Showing <span className="font-medium">{mobileStartIndex + 1}</span> to <span className="font-medium">{Math.min(mobileEndIndex, complaints.length)}</span> of <span className="font-medium">{complaints.length}</span> complaints
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMobilePage((p) => Math.max(1, p - 1))}
                      disabled={mobilePage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    {Array.from({ length: Math.min(mobileTotalPages, 5) }, (_, i) => {
                      let pg;
                      if (mobileTotalPages <= 5) {
                        pg = i + 1;
                      } else if (mobilePage <= 3) {
                        pg = i + 1;
                      } else if (mobilePage >= mobileTotalPages - 2) {
                        pg = mobileTotalPages - 4 + i;
                      } else {
                        pg = mobilePage - 2 + i;
                      }
                      return (
                        <button
                          key={pg}
                          onClick={() => setMobilePage(pg)}
                          className={`h-8 w-8 text-sm rounded-md font-medium transition-colors ${
                            pg === mobilePage
                              ? 'bg-teal-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMobilePage((p) => Math.min(mobileTotalPages, p + 1))}
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
      </>
      ) : (
      <>
      {/* Customer Requests View */}
      <DataTable
        columns={[
          {
            key: 'requestNumber',
            label: 'Request #',
            render: (row) => (
              <span className="font-semibold text-sm text-slate-900 dark:text-white font-mono">
                {row.requestNumber}
              </span>
            ),
          },
          {
            key: 'customer',
            label: 'Customer',
            render: (row) => (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {row.lead?.campaignData?.company || row.lead?.customerUsername || '-'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {row.lead?.campaignData?.name || ''}
                    {row.lead?.customerUsername && <span className="text-slate-400"> · {row.lead.customerUsername}</span>}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'category',
            label: 'Category / Sub-Category',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{row.category?.name || '-'}</p>
                {row.subCategory?.name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.subCategory.name}</p>
                )}
              </div>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            render: (row) => (
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[300px]">{row.description}</p>
            ),
          },
          {
            key: 'attachments',
            label: 'Files',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => {
              const count = row.attachments?.length || 0;
              if (count === 0) return <span className="text-xs text-slate-400">-</span>;
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <FileText size={11} />
                  {count}
                </span>
              );
            },
          },
          {
            key: 'created',
            label: 'Submitted',
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
        data={customerRequests}
        loading={crLoading}
        pagination={true}
        serverPagination={crPagination ? {
          page: crPagination.page || crPage,
          limit: crPagination.limit || 10,
          total: crPagination.total || 0,
          totalPages: crPagination.totalPages || 1,
        } : undefined}
        onPageChange={(newPage) => setCrPage(newPage)}
        emptyMessage="No pending customer requests"
        emptyIcon={Inbox}
        className="hidden lg:block"
        actions={(row) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() => openLogModal(row)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
            >
              <Headphones size={13} />
              Log Complaint
            </button>
          </div>
        )}
      />

      {/* Customer Requests Mobile Cards */}
      <Card className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {crLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : customerRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Inbox size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No pending requests</p>
              <p className="text-sm mt-1">All customer requests have been processed</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {customerRequests.map((req) => (
                <div key={req.id} className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Inbox className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white font-mono truncate">{req.requestNumber}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {req.lead?.campaignData?.company || req.lead?.customerUsername || '-'}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                  {req.category?.name && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-600 dark:text-slate-400">
                      <Tag size={12} className="flex-shrink-0" />
                      <span className="truncate">{req.category.name}{req.subCategory?.name ? ` / ${req.subCategory.name}` : ''}</span>
                    </div>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">{req.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {req.attachments?.length > 0 && (
                        <span className="flex items-center gap-1"><FileText size={11} /> {req.attachments.length}</span>
                      )}
                    </div>
                    <button
                      onClick={() => openLogModal(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
                    >
                      <Headphones size={13} />
                      Log Complaint
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customer Requests Mobile Pagination */}
          {crPagination && crPagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Page {crPagination.page} of {crPagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCrPage(p => Math.max(1, p - 1))} disabled={crPage <= 1} className="h-8 w-8 p-0">
                  <ChevronLeft size={16} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCrPage(p => Math.min(crPagination.totalPages, p + 1))} disabled={crPage >= crPagination.totalPages} className="h-8 w-8 p-0">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* Create Complaint Modal */}
      {showCreateModal && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Customer Search */}
              <div>
                <label className={labelClass}>
                  Customer <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                    <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {selectedCustomer.company || selectedCustomer.campaignData?.company || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {selectedCustomer.name || selectedCustomer.campaignData?.name || ''}
                        {selectedCustomer.customerUsername && (
                          <span className="text-slate-400"> · {selectedCustomer.customerUsername}</span>
                        )}
                        {selectedCustomer.circuitId && (
                          <span className="text-blue-500"> · {selectedCustomer.circuitId}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedCustomer(null); setCreateForm((p) => ({ ...p, leadId: '' })); }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      placeholder="Search by company, username, circuit ID, name, phone..."
                      className={`${inputClass} pl-10`}
                    />
                    {customerSearching && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-teal-500" />
                    )}
                    {/* Dropdown results */}
                    {(customerResults.length > 0 || (customerSearch.length >= 2 && !customerSearching)) && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {customerResults.length > 0 ? customerResults.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => selectCustomer(lead)}
                            className="w-full text-left px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30">
                                <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {lead.company || lead.campaignData?.company || 'N/A'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {lead.name || lead.campaignData?.name || ''}
                                  {lead.customerUsername && <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono">{lead.customerUsername}</span>}
                                  {lead.circuitId && <span className="ml-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] font-mono text-blue-600 dark:text-blue-400">{lead.circuitId}</span>}
                                  {lead.phone && <span className="ml-1 text-slate-400">· {lead.phone}</span>}
                                </p>
                              </div>
                            </div>
                          </button>
                        )) : (
                          <div className="px-4 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                            <Search size={16} className="mx-auto mb-1 opacity-50" />
                            No customers found for &ldquo;{customerSearch}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

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

              {/* Assignees - conditional based on category type */}
              {isAccountsCategory(createForm.categoryId) ? (
                <div>
                  <label className={labelClass}>
                    Accounts Assignee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.accountsAssigneeId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, accountsAssigneeId: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select Accounts User</option>
                    {(assignableUsers.accounts || []).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
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
              )}

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
                        <button
                          onClick={() => removeFile(i)}
                          className="ml-0.5 text-slate-400 hover:text-red-500"
                        >
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Drop files here or click to browse
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PDF, DOC, DOCX, JPG, PNG
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
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
                disabled={isSubmitting || !createForm.leadId || !createForm.categoryId || !createForm.description.trim() || (isAccountsCategory(createForm.categoryId) ? !createForm.accountsAssigneeId : !createForm.nocAssigneeId)}
                size="sm"
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-1" />
                    Create Complaint
                  </>
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
            {/* Header */}
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

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* TAT */}
              <div>
                <label className={labelClass}>TAT Hours</label>
                <input type="number" min="1" value={updateForm.tatHours} onChange={(e) => setUpdateForm(p => ({ ...p, tatHours: e.target.value }))} placeholder="e.g. 24" className={inputClass} />
              </div>

              {/* Category & Sub-Category */}
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

              {/* Remark */}
              <div>
                <label className={labelClass}>Remark</label>
                <textarea
                  value={updateForm.remark}
                  onChange={(e) => setUpdateForm(p => ({ ...p, remark: e.target.value }))}
                  placeholder="Add a remark or note about this update..."
                  rows={3}
                  className={inputClass}
                />
              </div>

              {/* Assignees - conditional based on category type (hidden for OPS users) */}
              {!isOpsUser && (
                isAccountsCategory(updateForm.categoryId) ? (
                  <div>
                    <label className={labelClass}>Accounts Assignee</label>
                    <select value={updateForm.accountsAssigneeId} onChange={(e) => setUpdateForm(p => ({ ...p, accountsAssigneeId: e.target.value }))} className={inputClass}>
                      <option value="">Select Accounts User</option>
                      {(assignableUsers.accounts || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                ) : (
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
                )
              )}

              {/* File Upload */}
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

            {/* Footer */}
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
            {/* Header */}
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

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Reason for Outage */}
              <div>
                <label className={labelClass}>Reason for Outage <span className="text-red-500">*</span></label>
                <select value={closeForm.reasonForOutage} onChange={(e) => setCloseForm(p => ({ ...p, reasonForOutage: e.target.value }))} className={inputClass}>
                  <option value="">Select Reason</option>
                  {(categories || []).map(cat => (
                    <optgroup key={cat.id} label={cat.name}>
                      {(cat.subCategories || []).map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Resolution & Resolution Type */}
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

              {/* Remark */}
              <div>
                <label className={labelClass}>Remark</label>
                <textarea value={closeForm.closeRemark} onChange={(e) => setCloseForm(p => ({ ...p, closeRemark: e.target.value }))} rows={3} placeholder="Additional remarks..." className={`${inputClass} resize-none`} />
              </div>

              {/* File Upload */}
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
                    {/* ISP Impact Time */}
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

                    {/* Customer Impact Time */}
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

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button type="button" onClick={() => { setShowCloseModal(false); setCloseTarget(null); }} variant="outline" size="sm" className="flex-1">Cancel</Button>
              <Button onClick={handleSubmitClose} disabled={isClosing || !closeForm.reasonForOutage || !closeForm.resolution || !closeForm.resolutionType} size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {isClosing ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Closing...</> : <><XCircle size={16} className="mr-1" />Close Complaint</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Complaint from Customer Request Modal */}
      {showLogModal && logTarget && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Headphones size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Log Complaint</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">From customer request {logTarget.requestNumber}</p>
                </div>
              </div>
              <button onClick={() => { setShowLogModal(false); setLogTarget(null); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Request Summary */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {logTarget.lead?.campaignData?.company || logTarget.lead?.customerUsername || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Tag size={12} />
                <span>{logTarget.category?.name}{logTarget.subCategory?.name ? ` / ${logTarget.subCategory.name}` : ''}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">{logTarget.description}</p>
              {logTarget.attachments?.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                  <FileText size={11} />
                  <span>{logTarget.attachments.length} attachment{logTarget.attachments.length > 1 ? 's' : ''} (will be copied)</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Category & Sub-Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category <span className="text-red-500">*</span></label>
                  <select value={logForm.categoryId} onChange={(e) => handleLogCategoryChange(e.target.value)} className={inputClass}>
                    <option value="">Select Category</option>
                    {(categories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sub-Category <span className="text-red-500">*</span></label>
                  <select value={logForm.subCategoryId} onChange={(e) => handleLogSubCategoryChange(e.target.value)} className={inputClass} disabled={!logForm.categoryId || logSubCategories.length === 0}>
                    <option value="">Select Sub-Category</option>
                    {logSubCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority & TAT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Priority</label>
                  <select value={logForm.priority} onChange={(e) => setLogForm(p => ({ ...p, priority: e.target.value }))} className={inputClass}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>TAT Hours</label>
                  <input type="number" min="1" value={logForm.tatHours} onChange={(e) => setLogForm(p => ({ ...p, tatHours: e.target.value }))} placeholder="Auto from sub-cat" className={inputClass} />
                </div>
              </div>

              {/* Assignees - conditional based on category type */}
              {isAccountsCategory(logForm.categoryId) ? (
                <div>
                  <label className={labelClass}>Accounts Assignee <span className="text-red-500">*</span></label>
                  <select value={logForm.accountsAssigneeId} onChange={(e) => setLogForm(p => ({ ...p, accountsAssigneeId: e.target.value }))} className={inputClass}>
                    <option value="">Select Accounts User</option>
                    {(assignableUsers.accounts || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>NOC Assignee <span className="text-red-500">*</span></label>
                    <select value={logForm.nocAssigneeId} onChange={(e) => setLogForm(p => ({ ...p, nocAssigneeId: e.target.value }))} className={inputClass}>
                      <option value="">Select NOC User</option>
                      {(assignableUsers.noc || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>OPS Assignee</label>
                    <select value={logForm.opsAssigneeId} onChange={(e) => setLogForm(p => ({ ...p, opsAssigneeId: e.target.value }))} className={inputClass}>
                      <option value="">None (Optional)</option>
                      {(assignableUsers.ops || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea value={logForm.notes} onChange={(e) => setLogForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Any additional notes for the team..." className={`${inputClass} resize-none`} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <Button type="button" onClick={() => { setShowLogModal(false); setLogTarget(null); }} variant="outline" size="sm" className="flex-1">Cancel</Button>
              <Button onClick={handleLogComplaint} disabled={isLogging || !logForm.categoryId || !logForm.subCategoryId || (isAccountsCategory(logForm.categoryId) ? !logForm.accountsAssigneeId : !logForm.nocAssigneeId)} size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                {isLogging ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Logging...</> : <><Headphones size={16} className="mr-1" />Log Complaint</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
