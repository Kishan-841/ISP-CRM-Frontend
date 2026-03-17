'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  User,
  Clock,
  FileText,
  X,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Wifi,
  Hash,
  Plus,
  Power,
  PowerOff,
  Copy,
  EyeOff,
  Network,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Calendar,
  AlertCircle,
  Info,
  ClipboardList,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import TabBar from '@/components/TabBar';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';

// Format bandwidth for display
const formatBandwidth = (mbps) => {
  if (!mbps) return '-';
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(1)} Gbps`;
  }
  return `${mbps} Mbps`;
};

// Generate new plan name by replacing bandwidth in existing name
const generateNewPlanName = (currentName, newBandwidthMbps) => {
  if (!currentName || !newBandwidthMbps) return currentName || '';
  const bw = parseInt(newBandwidthMbps);
  const newBwStr = bw >= 1000 ? `${bw / 1000}gbps` : `${bw}mbps`;
  // Replace existing bandwidth pattern (e.g., 100mbps, 1gbps)
  const replaced = currentName.replace(/\d+(mbps|gbps|kbps)/i, newBwStr);
  if (replaced !== currentName) return replaced;
  // If no pattern found, append bandwidth
  return `${currentName}_${newBwStr}`;
};

// Get billing cycle label from days
const getBillingCycleLabel = (days) => {
  if (!days) return '-';
  switch (days) {
    case 30: return 'Monthly';
    case 90: return 'Quarterly';
    case 180: return 'Half Yearly';
    case 360:
    case 365: return 'Yearly';
    default: return `${days} days`;
  }
};

// Get billing type label
const getBillingTypeLabel = (type) => {
  if (!type) return '-';
  return type === 'MONTHLY' ? 'Month End' : 'Day to Day';
};

// Calculate GST pricing
const calculatePricing = (basePrice) => {
  if (!basePrice || isNaN(basePrice)) return { base: 0, gst: 0, total: 0 };
  const base = parseFloat(basePrice);
  const gst = base * 0.18;
  const total = base + gst;
  return { base, gst, total };
};

// Calculate price from ARC based on billing cycle (using 360 days for yearly)
const calculatePriceFromArc = (arcAmount, billingCycleDays) => {
  if (!arcAmount || isNaN(arcAmount)) return 0;
  const arc = parseFloat(arcAmount);
  const days = parseInt(billingCycleDays);
  // ARC is annual (360 days), calculate proportionally
  return Math.round((arc / 360) * days);
};

// Calculate price from ARC for specific number of days
const calculatePriceForDays = (arcAmount, days) => {
  if (!arcAmount || isNaN(arcAmount) || !days) return 0;
  const arc = parseFloat(arcAmount);
  return Math.round((arc / 360) * days);
};

// Get billing cycle label
const getBillingCycleDaysLabel = (days) => {
  switch(parseInt(days)) {
    case 30: return 'Monthly';
    case 90: return 'Quarterly';
    case 180: return 'Half Yearly';
    case 360: return 'Yearly';
    default: return `${days} days`;
  }
};

// Calculate days between two dates
const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Icon Button with Tooltip Component
const IconButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false }) => {
  const baseClasses = "relative group p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    default: "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800",
    primary: "bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-800",
    success: "bg-emerald-100 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-800",
    warning: "bg-amber-100 hover:bg-amber-200 text-amber-600 hover:text-amber-800",
    danger: "bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <Icon size={16} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </span>
    </button>
  );
};

export default function AccountsCreatePlanPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ pending: 0, created: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Service orders state
  const [serviceOrders, setServiceOrders] = useState([]);
  const [serviceOrdersCount, setServiceOrdersCount] = useState(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  // Track which service order is being acted on
  const [activeServiceOrderId, setActiveServiceOrderId] = useState(null);

  // Modal states
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'upgrade', 'degrade', 'rate_revision'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Plan form
  const [planForm, setPlanForm] = useState({
    planName: '',
    bandwidth: '',
    uploadBandwidth: '',
    billingCycle: '30',
    billingType: 'DAY_TO_DAY',
    price: '',
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Upgrade form
  const [upgradeForm, setUpgradeForm] = useState({
    planName: '',
    bandwidth: '',
    uploadBandwidth: '',
    newArc: '',
    upgradeDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Degrade form
  const [degradeForm, setDegradeForm] = useState({
    planName: '',
    bandwidth: '',
    uploadBandwidth: '',
    degradeArc: '', // Now stores the NEW target ARC (not the difference)
    degradeDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Rate revision form
  const [rateRevisionForm, setRateRevisionForm] = useState({
    planName: '',
    newArc: '',
    revisionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showModal, () => !isSubmitting && setShowModal(false));

  // Redirect non-Accounts Team users
  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, router]);

  useSocketRefresh(() => { fetchQueue(); }, { enabled: isAccountsTeam || isAdmin });

  // Fetch queue
  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/leads/accounts-team/actual-plan/queue?status=${activeTab}`);
      setLeads(response.data.leads || []);
      setStats(response.data.stats || { pending: 0, created: 0 });
    } catch (error) {
      toast.error('Failed to fetch queue');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch approved service orders for the orders tab
  const fetchServiceOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await api.get('/service-orders?status=PENDING_ACCOUNTS&limit=100');
      setServiceOrders(response.data.orders || []);
      setServiceOrdersCount(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching service orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Auto-process a service order after upgrade/downgrade is done
  const processServiceOrder = async (orderId) => {
    try {
      await api.post(`/service-orders/${orderId}/accounts-process`, {
        processNotes: 'Processed via Create Plan - upgrade/downgrade applied.'
      });
    } catch (error) {
      console.error('Error processing service order:', error);
    }
  };

  useEffect(() => {
    if (isAccountsTeam || isAdmin) {
      if (activeTab === 'orders') {
        fetchServiceOrders();
      } else {
        fetchQueue();
      }
    }
  }, [isAccountsTeam, isAdmin, activeTab]);

  // Always fetch orders count for the badge
  useEffect(() => {
    if (isAccountsTeam || isAdmin) {
      api.get('/service-orders?status=PENDING_ACCOUNTS&limit=1').then(res => {
        setServiceOrdersCount(res.data.pagination?.total || 0);
      }).catch(() => {});
    }
  }, [isAccountsTeam, isAdmin]);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Calculate upgrade billing breakdown
  // Logic: Original invoice stays unchanged. Upgrade invoice is ONLY for additional ARC for remaining days.
  const upgradeCalculation = useMemo(() => {
    if (!selectedLead || modalMode !== 'upgrade') return null;

    const planStartDate = selectedLead.actualPlanStartDate;
    const planEndDate = selectedLead.actualPlanEndDate;
    const oldArc = selectedLead.arcAmount || 0;
    const newArc = parseFloat(upgradeForm.newArc) || 0; // Now this is the NEW target ARC
    const additionalArc = newArc - oldArc; // Calculate the additional amount automatically
    const newTotalArc = newArc; // This is already the new ARC
    const upgradeDate = upgradeForm.upgradeDate;

    if (!planStartDate || !planEndDate || !upgradeDate) return null;

    const upgradeDateObj = new Date(upgradeDate);
    const planStartObj = new Date(planStartDate);
    const planEndObj = new Date(planEndDate);

    // Validate upgrade date
    if (upgradeDateObj < planStartObj) {
      return { error: 'Upgrade date cannot be before plan start date' };
    }
    if (upgradeDateObj > planEndObj) {
      return { error: 'Upgrade date cannot be after current billing period end' };
    }

    // Validate new ARC - must be greater than current ARC
    if (newArc <= oldArc) {
      return { error: `New ARC must be greater than current ARC (${formatCurrency(oldArc)})` };
    }

    // Calculate days
    const daysFromStart = daysBetween(planStartDate, upgradeDate);
    const daysRemaining = daysBetween(upgradeDate, planEndDate) + 1; // +1 to include both start and end
    const totalDays = daysBetween(planStartDate, planEndDate);

    // Upgrade invoice calculation: (additionalArc / 360) * daysRemaining
    const upgradeBaseAmount = Math.round((additionalArc / 360) * daysRemaining);
    const upgradeGst = Math.round(upgradeBaseAmount * 0.18);
    const upgradeTotal = upgradeBaseAmount + upgradeGst;

    return {
      planStartDate,
      planEndDate,
      upgradeDate,
      oldArc,
      additionalArc,
      newTotalArc,
      daysFromStart,
      daysRemaining,
      totalDays,
      upgradeBaseAmount,
      upgradeGst,
      upgradeTotal
    };
  }, [selectedLead, modalMode, upgradeForm.newArc, upgradeForm.upgradeDate]);

  // Calculate degrade (downgrade) billing breakdown
  // Logic: Creates a credit note for remaining days at the degrade ARC
  const degradeCalculation = useMemo(() => {
    if (!selectedLead || modalMode !== 'degrade') return null;

    const planStartDate = selectedLead.actualPlanStartDate;
    const planEndDate = selectedLead.actualPlanEndDate;
    const oldArc = selectedLead.arcAmount || 0;
    const newArc = parseFloat(degradeForm.degradeArc) || 0; // Now this is the NEW target ARC
    const degradeAmount = oldArc - newArc; // Calculate the difference automatically
    const newTotalArc = newArc; // This is already the new ARC
    const degradeDate = degradeForm.degradeDate;

    if (!planStartDate || !planEndDate || !degradeDate) return null;

    const degradeDateObj = new Date(degradeDate);
    const planStartObj = new Date(planStartDate);
    const planEndObj = new Date(planEndDate);

    // Validate degrade date
    if (degradeDateObj < planStartObj) {
      return { error: 'Degrade date cannot be before plan start date' };
    }
    if (degradeDateObj > planEndObj) {
      return { error: 'Degrade date cannot be after current billing period end' };
    }

    // Validate new ARC - must be less than current ARC (can't reduce to 0)
    if (newArc >= oldArc) {
      const maxNewArc = oldArc - 1;
      return { error: `New ARC must be less than current ARC (₹${oldArc}). Max: ₹${maxNewArc}` };
    }

    if (newArc <= 0) {
      return { error: 'New ARC must be greater than 0' };
    }

    if (newTotalArc < 0) {
      return { error: 'New total ARC cannot be negative' };
    }

    // Calculate days
    const daysFromStart = daysBetween(planStartDate, degradeDate);
    const daysRemaining = daysBetween(degradeDate, planEndDate) + 1; // +1 to include both start and end
    const totalDays = daysBetween(planStartDate, planEndDate);

    // Credit note calculation: (degradeAmount / 360) * daysRemaining
    const creditBaseAmount = Math.round((degradeAmount / 360) * daysRemaining);
    const creditGst = Math.round(creditBaseAmount * 0.18);
    const creditTotal = creditBaseAmount + creditGst;

    return {
      planStartDate,
      planEndDate,
      degradeDate,
      oldArc,
      degradeArc: degradeAmount, // This is the difference amount for backend
      degradeAmount, // Store separately for clarity
      newTotalArc,
      daysFromStart,
      daysRemaining,
      totalDays,
      creditBaseAmount,
      creditGst,
      creditTotal
    };
  }, [selectedLead, modalMode, degradeForm.degradeArc, degradeForm.degradeDate]);

  // Generate plan name from username and bandwidth
  const generatePlanName = (username, bandwidth) => {
    // Clean username: lowercase, replace spaces with underscore
    const cleanUsername = (username || 'customer')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Clean bandwidth: lowercase, remove spaces
    const cleanBandwidth = (bandwidth || '100mbps')
      .toLowerCase()
      .replace(/\s+/g, '');

    // Format: username_speed (without demo for regular plans)
    return `${cleanUsername}_${cleanBandwidth}`;
  };

  // Open modal for view
  const handleOpenViewModal = (lead) => {
    setSelectedLead(lead);
    setModalMode('view');

    let billingCycle = '30';
    if (lead.actualPlanValidityDays === 90) billingCycle = '90';
    else if (lead.actualPlanValidityDays === 180) billingCycle = '180';
    else if (lead.actualPlanValidityDays === 360 || lead.actualPlanValidityDays === 365) billingCycle = '360';

    const calculatedPrice = lead.actualPlanPrice || calculatePriceFromArc(lead.arcAmount, billingCycle);

    setPlanForm({
      planName: lead.actualPlanName || generatePlanName(lead.customerUsername, lead.bandwidthRequirement),
      bandwidth: lead.actualPlanBandwidth || lead.demoPlanBandwidth || '',
      uploadBandwidth: lead.actualPlanUploadBandwidth || lead.demoPlanUploadBandwidth || '',
      billingCycle: billingCycle,
      billingType: lead.actualPlanBillingType || 'DAY_TO_DAY',
      price: calculatedPrice,
      isActive: lead.actualPlanIsActive ?? true,
      startDate: lead.actualPlanStartDate ? new Date(lead.actualPlanStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: lead.actualPlanNotes || ''
    });
    setShowModal(true);
  };

  // Open modal for create
  const handleOpenCreateModal = (lead) => {
    setSelectedLead(lead);
    setModalMode('create');

    let billingCycle = '30';
    if (lead.actualPlanValidityDays === 90) billingCycle = '90';
    else if (lead.actualPlanValidityDays === 180) billingCycle = '180';
    else if (lead.actualPlanValidityDays === 360 || lead.actualPlanValidityDays === 365) billingCycle = '360';

    const calculatedPrice = lead.actualPlanPrice || calculatePriceFromArc(lead.arcAmount, billingCycle);

    setPlanForm({
      planName: lead.actualPlanName || generatePlanName(lead.customerUsername, lead.bandwidthRequirement),
      bandwidth: lead.actualPlanBandwidth || lead.demoPlanBandwidth || '',
      uploadBandwidth: lead.actualPlanUploadBandwidth || lead.demoPlanUploadBandwidth || '',
      billingCycle: billingCycle,
      billingType: lead.actualPlanBillingType || 'DAY_TO_DAY',
      price: calculatedPrice,
      isActive: lead.actualPlanIsActive ?? true,
      startDate: lead.actualPlanStartDate ? new Date(lead.actualPlanStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: lead.actualPlanNotes || ''
    });
    setShowModal(true);
  };

  // Open modal for upgrade
  const handleOpenUpgradeModal = (lead) => {
    setSelectedLead(lead);
    setModalMode('upgrade');

    // Set upgrade form with current plan details
    // Note: newArc is empty because user enters the NEW target ARC (system calculates additional amount)
    setUpgradeForm({
      planName: lead.actualPlanName || '',
      bandwidth: lead.actualPlanBandwidth || '',
      uploadBandwidth: lead.actualPlanUploadBandwidth || '',
      newArc: '', // Empty - user enters the NEW target ARC
      upgradeDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowModal(true);
  };

  // Open modal for degrade (downgrade)
  const handleOpenDegradeModal = (lead) => {
    setSelectedLead(lead);
    setModalMode('degrade');

    // Set degrade form with current plan details
    // Note: degradeArc is empty because user enters the NEW target ARC
    setDegradeForm({
      planName: lead.actualPlanName || '',
      bandwidth: lead.actualPlanBandwidth || '',
      uploadBandwidth: lead.actualPlanUploadBandwidth || '',
      degradeArc: '', // Empty - user enters the NEW target ARC (not the difference)
      degradeDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setModalMode('view');
    setActiveServiceOrderId(null);
    setPlanForm({
      planName: '',
      bandwidth: '',
      uploadBandwidth: '',
      billingCycle: '30',
      billingType: 'DAY_TO_DAY',
      price: '',
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setUpgradeForm({
      planName: '',
      bandwidth: '',
      uploadBandwidth: '',
      newArc: '',
      upgradeDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setDegradeForm({
      planName: '',
      bandwidth: '',
      uploadBandwidth: '',
      degradeArc: '',
      degradeDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  // Handle form change
  const handleFormChange = (field, value) => {
    setPlanForm(prev => {
      const newForm = { ...prev, [field]: value };

      // Auto-calculate price when billing cycle changes
      if (field === 'billingCycle' && selectedLead?.arcAmount) {
        newForm.price = calculatePriceFromArc(selectedLead.arcAmount, value);
      }

      return newForm;
    });
  };

  // Handle upgrade form change
  const handleUpgradeFormChange = (field, value) => {
    setUpgradeForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle degrade form change
  const handleDegradeFormChange = (field, value) => {
    setDegradeForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle rate revision form change
  const handleRateRevisionFormChange = (field, value) => {
    setRateRevisionForm(prev => ({ ...prev, [field]: value }));
  };

  // Create plan
  const handleCreatePlan = async () => {
    if (!selectedLead || !planForm.planName || !planForm.bandwidth) {
      toast.error('Plan name and bandwidth are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert days to billing cycle enum
      const getBillingCycleEnum = (days) => {
        switch (days) {
          case '30': return 'MONTHLY';
          case '90': return 'QUARTERLY';
          case '180': return 'HALF_YEARLY';
          case '360': return 'YEARLY';
          default: return 'MONTHLY';
        }
      };

      const response = await api.post(`/leads/accounts-team/${selectedLead.id}/actual-plan`, {
        planName: planForm.planName,
        bandwidth: parseInt(planForm.bandwidth),
        uploadBandwidth: planForm.uploadBandwidth ? parseInt(planForm.uploadBandwidth) : null,
        validityDays: parseInt(planForm.billingCycle),
        billingCycle: getBillingCycleEnum(planForm.billingCycle), // Send the enum value
        billingType: planForm.billingType,
        price: planForm.price ? parseFloat(planForm.price) : null,
        isActive: planForm.isActive,
        startDate: planForm.startDate || null,
        notes: planForm.notes || null
      });

      if (response.data) {
        toast.success('Plan created successfully!');
        handleCloseModal();
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upgrade plan
  const handleUpgradePlan = async () => {
    if (!selectedLead || !upgradeForm.planName || !upgradeForm.bandwidth || !upgradeForm.newArc) {
      toast.error('Plan name, bandwidth, and new ARC are required');
      return;
    }

    if (upgradeCalculation?.error) {
      toast.error(upgradeCalculation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/leads/accounts-team/${selectedLead.id}/actual-plan/upgrade`, {
        planName: upgradeForm.planName,
        bandwidth: parseInt(upgradeForm.bandwidth),
        uploadBandwidth: upgradeForm.uploadBandwidth ? parseInt(upgradeForm.uploadBandwidth) : null,
        newArc: upgradeCalculation.additionalArc, // Send the calculated ADDITIONAL amount, not the new target ARC
        upgradeDate: upgradeForm.upgradeDate,
        notes: upgradeForm.notes || null,
        // Send calculated amounts for backend verification
        oldPlanDays: upgradeCalculation.daysOldPlan,
        newPlanDays: upgradeCalculation.daysNewPlan,
        oldPlanAmount: upgradeCalculation.oldPlanAmount,
        newPlanAmount: upgradeCalculation.newPlanAmount
      });

      if (response.data) {
        toast.success('Plan upgraded successfully!');
        // Auto-process the service order if upgrade was triggered from orders tab
        if (activeServiceOrderId) {
          await processServiceOrder(activeServiceOrderId);
          setActiveServiceOrderId(null);
          fetchServiceOrders();
        }
        handleCloseModal();
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upgrade plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Degrade (downgrade) plan - creates a credit note
  const handleDegradePlan = async () => {
    if (!selectedLead || !degradeForm.planName || !degradeForm.bandwidth || !degradeForm.degradeArc) {
      toast.error('Plan name, bandwidth, and degrade ARC are required');
      return;
    }

    if (degradeCalculation?.error) {
      toast.error(degradeCalculation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/leads/accounts-team/${selectedLead.id}/actual-plan/degrade`, {
        planName: degradeForm.planName,
        bandwidth: parseInt(degradeForm.bandwidth),
        uploadBandwidth: degradeForm.uploadBandwidth ? parseInt(degradeForm.uploadBandwidth) : null,
        degradeArc: degradeCalculation.degradeAmount, // Send the calculated DIFFERENCE, not the new target ARC
        degradeDate: degradeForm.degradeDate,
        notes: degradeForm.notes || null
      });

      if (response.data) {
        toast.success(`Plan downgraded successfully! Credit note: ${response.data.creditNote?.creditNoteNumber}`);
        // Auto-process the service order if degrade was triggered from orders tab
        if (activeServiceOrderId) {
          await processServiceOrder(activeServiceOrderId);
          setActiveServiceOrderId(null);
          fetchServiceOrders();
        }
        handleCloseModal();
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to degrade plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rate revision - ARC reduces, bandwidth stays the same
  const handleRateRevision = async () => {
    if (!selectedLead || !rateRevisionForm.newArc) {
      toast.error('New ARC is required');
      return;
    }

    const newArc = parseFloat(rateRevisionForm.newArc);
    const currentArc = selectedLead.arcAmount || selectedLead.actualPlanPrice || 0;
    if (newArc >= currentArc) {
      toast.error('New ARC must be less than current ARC');
      return;
    }

    setIsSubmitting(true);
    try {
      const degradeArc = currentArc - newArc;
      const response = await api.post(`/leads/accounts-team/${selectedLead.id}/actual-plan/degrade`, {
        planName: rateRevisionForm.planName || selectedLead.actualPlanName,
        bandwidth: selectedLead.actualPlanBandwidth,
        uploadBandwidth: selectedLead.actualPlanUploadBandwidth || null,
        degradeArc,
        degradeDate: rateRevisionForm.revisionDate,
        notes: rateRevisionForm.notes || `Rate revision - ARC reduced from ${formatCurrency(currentArc)} to ${formatCurrency(newArc)}, bandwidth unchanged`,
        isRateRevision: true
      });

      if (response.data) {
        toast.success('Rate revision applied successfully!');
        if (activeServiceOrderId) {
          await processServiceOrder(activeServiceOrderId);
          setActiveServiceOrderId(null);
          fetchServiceOrders();
        }
        handleCloseModal();
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply rate revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle plan status
  const handleTogglePlanStatus = async (lead) => {
    try {
      const response = await api.patch(`/leads/accounts-team/${lead.id}/actual-plan/toggle`, {
        isActive: !lead.actualPlanIsActive
      });

      if (response.data) {
        toast.success(`Plan ${!lead.actualPlanIsActive ? 'activated' : 'deactivated'}`);
        fetchQueue();
      }
    } catch (error) {
      toast.error('Failed to toggle plan status');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Pagination
  const totalPages = Math.ceil((leads?.length || 0) / itemsPerPage);
  const paginatedLeads = leads?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  if (!isAccountsTeam && !isAdmin) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader title="Create Plan" description="Create actual plans for customers after acceptance" />

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard color="blue" icon={Clock} label="Pending" value={stats.pending} />
          <StatCard color="emerald" icon={CheckCircle} label="Created" value={stats.created} />
          <StatCard color="amber" icon={ClipboardList} label="Order Requests" value={serviceOrdersCount} />
        </div>

        {/* Tab Buttons */}
        <TabBar
          tabs={[
            { key: 'pending', label: 'Pending', icon: Clock, count: stats.pending, variant: 'warning' },
            { key: 'created', label: 'Created', icon: CheckCircle, count: stats.created, variant: 'success' },
            { key: 'orders', label: 'Order Requests', icon: ClipboardList, count: serviceOrdersCount, variant: 'default' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <DataTable
            title="Order Requests"
            totalCount={serviceOrdersCount}
            columns={[
              {
                key: 'orderNumber', label: 'Order #',
                render: (row) => (
                  <div>
                    <span className="font-mono text-xs">{row.orderNumber}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(row.createdAt)}</p>
                  </div>
                )
              },
              {
                key: 'customer', label: 'Customer',
                render: (row) => (
                  <div>
                    <p className="font-medium">{row.customer?.campaignData?.company || '-'}</p>
                    <p className="text-xs text-slate-500">{row.customer?.customerUsername || '-'}</p>
                  </div>
                )
              },
              {
                key: 'orderType', label: 'Type',
                render: (row) => {
                  const colors = { UPGRADE: 'bg-blue-100 text-blue-700', DOWNGRADE: 'bg-orange-100 text-orange-700', RATE_REVISION: 'bg-teal-100 text-teal-700' };
                  const icons = { UPGRADE: ArrowUpCircle, DOWNGRADE: ArrowDownCircle, RATE_REVISION: TrendingUp };
                  const TypeIcon = icons[row.orderType] || ArrowUpCircle;
                  return (
                    <Badge className={`border-0 ${colors[row.orderType] || 'bg-slate-100 text-slate-700'}`}>
                      <TypeIcon size={12} className="mr-1" />
                      {row.orderType.replace(/_/g, ' ')}
                    </Badge>
                  );
                }
              },
              {
                key: 'currentPlan', label: 'Current Plan',
                render: (row) => (
                  <div>
                    <p className="text-sm">{row.currentPlanName || '-'}</p>
                    <p className="text-xs text-slate-500">
                      {row.currentBandwidth ? formatBandwidth(row.currentBandwidth) : '-'} / {row.currentArc ? formatCurrency(row.currentArc) : '-'}
                    </p>
                  </div>
                )
              },
              {
                key: 'requestedChange', label: 'Requested Change',
                render: (row) => (
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                      {row.newBandwidth ? `${row.newBandwidth} Mbps` : '-'} / {row.newArc ? formatCurrency(row.newArc) : '-'}
                    </p>
                    {row.orderType === 'RATE_REVISION' && <p className="text-xs text-teal-600">Bandwidth unchanged</p>}
                    {row.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{row.notes}</p>}
                  </div>
                )
              },
              {
                key: 'attachments', label: 'Attachments',
                render: (row) => {
                  const files = Array.isArray(row.attachments) ? row.attachments : [];
                  if (files.length === 0) return <span className="text-slate-400 text-sm">-</span>;
                  return (
                    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {files.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-orange-600 hover:text-orange-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title={att.originalName}
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[60px] truncate">{att.originalName || `File ${idx + 1}`}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </a>
                      ))}
                    </div>
                  );
                }
              },
              {
                key: 'activationDate', label: 'Effective Date',
                render: (row) => row.activationDate ? (
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{formatDate(row.activationDate)}</p>
                    <p className="text-xs text-slate-400">Set by {row.activationSetBy?.name || '-'}</p>
                  </div>
                ) : <span className="text-slate-400 text-sm">Not set</span>
              },
              {
                key: 'createdBy', label: 'Created By',
                render: (row) => row.createdBy?.name || '-'
              },
            ]}
            data={serviceOrders}
            loading={isLoadingOrders}
            emptyMessage="No approved order requests"
            emptyIcon={ClipboardList}
            pagination
            defaultPageSize={10}
            actions={(order) => {
              const handleOrderAction = async (order, mode) => {
                try {
                  const leadId = order.customerId || order.customer?.id;
                  const res = await api.get(`/leads/${leadId}`);
                  const raw = res.data.lead;
                  if (!raw) { toast.error('Customer not found.'); return; }
                  const lead = {
                    id: raw.id,
                    company: raw.campaignData?.company || '-',
                    name: raw.campaignData?.name || '-',
                    customerUsername: raw.customerUsername,
                    circuitId: raw.circuitId,
                    arcAmount: raw.arcAmount,
                    bandwidthRequirement: raw.bandwidthRequirement,
                    actualPlanName: raw.actualPlanName,
                    actualPlanBandwidth: raw.actualPlanBandwidth,
                    actualPlanUploadBandwidth: raw.actualPlanUploadBandwidth,
                    actualPlanPrice: raw.actualPlanPrice,
                    actualPlanIsActive: raw.actualPlanIsActive,
                    actualPlanStartDate: raw.actualPlanStartDate,
                    actualPlanEndDate: raw.actualPlanEndDate,
                    actualPlanValidityDays: raw.actualPlanValidityDays,
                    actualPlanBillingType: raw.actualPlanBillingType,
                    actualPlanNotes: raw.actualPlanNotes,
                  };
                  const effectiveDateStr = order.activationDate ? new Date(order.activationDate).toISOString().split('T')[0] : (order.effectiveDate ? new Date(order.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                  setActiveServiceOrderId(order.id);
                  setSelectedLead(lead);
                  if (mode === 'rate_revision') {
                    setModalMode('rate_revision');
                    setRateRevisionForm({
                      planName: lead.actualPlanName || '',
                      newArc: order.newArc || '',
                      revisionDate: effectiveDateStr,
                      notes: order.notes || ''
                    });
                  } else if (mode === 'upgrade') {
                    setModalMode('upgrade');
                    setUpgradeForm({
                      planName: generateNewPlanName(lead.actualPlanName, order.newBandwidth),
                      bandwidth: order.newBandwidth || lead.actualPlanBandwidth || '',
                      uploadBandwidth: lead.actualPlanUploadBandwidth || '',
                      newArc: order.newArc || '',
                      upgradeDate: effectiveDateStr,
                      notes: order.notes || ''
                    });
                  } else {
                    setModalMode('degrade');
                    setDegradeForm({
                      planName: generateNewPlanName(lead.actualPlanName, order.newBandwidth),
                      bandwidth: order.newBandwidth || lead.actualPlanBandwidth || '',
                      uploadBandwidth: lead.actualPlanUploadBandwidth || '',
                      degradeArc: order.newArc || '',
                      degradeDate: effectiveDateStr,
                      notes: order.notes || ''
                    });
                  }
                  setShowModal(true);
                } catch (err) {
                  toast.error('Failed to load customer data');
                }
              };

              if (order.orderType === 'RATE_REVISION') {
                return (
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3" onClick={() => handleOrderAction(order, 'rate_revision')}>
                    <TrendingUp size={12} className="mr-1" /> Revise
                  </Button>
                );
              }
              if (order.orderType === 'UPGRADE') {
                return (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3" onClick={() => handleOrderAction(order, 'upgrade')}>
                    <ArrowUpCircle size={12} className="mr-1" /> Upgrade
                  </Button>
                );
              }
              return (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3" onClick={() => handleOrderAction(order, 'degrade')}>
                  <ArrowDownCircle size={12} className="mr-1" /> Downgrade
                </Button>
              );
            }}
          />
        )}

        {/* Leads Table */}
        {activeTab !== 'orders' && (
        <>
            {/* Mobile Loading/Empty/Card View */}
            <div className="lg:hidden">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : paginatedLeads.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {activeTab === 'pending' ? 'No leads pending plan creation' : 'No plans created yet'}
                  </p>
                </div>
              ) : (
                <>
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3 p-3">
                  {paginatedLeads.map((lead) => (
                    <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{lead.company}</p>
                          <p className="text-xs text-slate-500">{lead.name || '-'} {lead.city ? `• ${lead.city}` : ''}</p>
                        </div>
                        {lead.bandwidthRequirement && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs shrink-0 ml-2">
                            <Wifi size={10} className="mr-1" />
                            {lead.bandwidthRequirement}
                          </Badge>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        {lead.customerUsername ? (
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-slate-400" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lead.customerUsername}</span>
                              <button onClick={() => copyToClipboard(lead.customerUsername)} className="p-1 hover:bg-slate-200 rounded">
                                <Copy className="h-3 w-3 text-slate-400" />
                              </button>
                            </div>
                            {lead.circuitId && (
                              <div className="flex items-center gap-1 mt-1">
                                <Network className="h-3 w-3 text-orange-500" />
                                <span className="text-xs text-orange-600 font-mono">{lead.circuitId}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-red-500">No user created</p>
                        )}
                        {activeTab === 'created' && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 space-y-1">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{lead.actualPlanName}</p>
                            <p className="text-xs text-slate-500">{formatBandwidth(lead.actualPlanBandwidth)} • {getBillingCycleLabel(lead.actualPlanValidityDays)}</p>
                            {lead.actualPlanPrice && (
                              <p className="text-xs text-emerald-600 font-medium">{formatCurrency(lead.actualPlanPrice)} + GST</p>
                            )}
                            {lead.actualPlanStartDate && (
                              <p className="text-xs text-slate-400">{formatDate(lead.actualPlanStartDate)} - {formatDate(lead.actualPlanEndDate)}</p>
                            )}
                            <Badge className={`text-[10px] ${lead.actualPlanIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {lead.actualPlanIsActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        {activeTab === 'pending' ? (
                          <Button size="sm" onClick={() => handleOpenCreateModal(lead)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            <Plus size={12} className="mr-1" /> Create Plan
                          </Button>
                        ) : (
                          <>
                            <IconButton icon={Eye} label="View" variant="default" onClick={() => handleOpenViewModal(lead)} />
                            <IconButton icon={lead.actualPlanIsActive ? PowerOff : Power} label={lead.actualPlanIsActive ? 'Off' : 'On'} variant={lead.actualPlanIsActive ? 'danger' : 'success'} onClick={() => handleTogglePlanStatus(lead)} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>

            {/* Desktop Table View */}
            <DataTable
              className="hidden lg:block"
              data={leads}
              loading={isLoading}
              pagination={true}
              defaultPageSize={10}
              emptyMessage={activeTab === 'pending' ? 'No leads pending plan creation' : 'No plans created yet'}
              emptyIcon={FileText}
              columns={[
                {
                  key: 'company',
                  label: 'Company',
                  render: (lead) => (
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{lead.company}</p>
                        <p className="text-xs text-slate-500">{lead.name || '-'}</p>
                        <p className="text-xs text-slate-400">{lead.city || '-'}</p>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'customerUser',
                  label: 'Customer User',
                  render: (lead) => lead.customerUsername ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{lead.customerUsername}</span>
                        <button onClick={() => copyToClipboard(lead.customerUsername)} className="p-1 hover:bg-slate-100 rounded">
                          <Copy className="h-3 w-3 text-slate-400" />
                        </button>
                      </div>
                      {lead.circuitId && (
                        <div className="flex items-center gap-1 mt-1">
                          <Network className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-orange-600 font-mono">{lead.circuitId}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-red-500">No user created</span>
                  )
                },
                {
                  key: 'bandwidth',
                  label: 'Bandwidth',
                  render: (lead) => (
                    <div className="space-y-1">
                      {lead.bandwidthRequirement && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          <Wifi size={10} className="mr-1" />
                          {lead.bandwidthRequirement}
                        </Badge>
                      )}
                      {lead.numberOfIPs && (
                        <Badge className="bg-cyan-100 text-cyan-700 text-xs ml-1">
                          <Hash size={10} className="mr-1" />
                          {lead.numberOfIPs} IPs
                        </Badge>
                      )}
                    </div>
                  )
                },
                ...(activeTab === 'created' ? [{
                  key: 'actualPlan',
                  label: 'Actual Plan',
                  render: (lead) => (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">{lead.actualPlanName}</p>
                      <p className="text-xs text-slate-500">
                        {formatBandwidth(lead.actualPlanBandwidth)}
                        {lead.actualPlanUploadBandwidth && ` / ${formatBandwidth(lead.actualPlanUploadBandwidth)} up`}
                      </p>
                      {lead.actualPlanPrice && (
                        <p className="text-xs text-emerald-600 font-medium">
                          {formatCurrency(lead.actualPlanPrice)} + 18% GST = {formatCurrency(lead.actualPlanPrice * 1.18)} / {getBillingCycleLabel(lead.actualPlanValidityDays)}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">{getBillingTypeLabel(lead.actualPlanBillingType)}</p>
                      {lead.actualPlanStartDate && (
                        <p className="text-xs text-slate-400">{formatDate(lead.actualPlanStartDate)} - {formatDate(lead.actualPlanEndDate)}</p>
                      )}
                      <Badge className={lead.actualPlanIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {lead.actualPlanIsActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  )
                }] : [])
              ]}
              actions={(lead) => activeTab === 'pending' ? (
                <Button size="sm" onClick={() => handleOpenCreateModal(lead)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus size={14} className="mr-1" /> Create Plan
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <IconButton icon={Eye} label="View Details" variant="default" onClick={() => handleOpenViewModal(lead)} />
                  <IconButton icon={lead.actualPlanIsActive ? PowerOff : Power} label={lead.actualPlanIsActive ? 'Deactivate' : 'Activate'} variant={lead.actualPlanIsActive ? 'danger' : 'success'} onClick={() => handleTogglePlanStatus(lead)} />
                </div>
              )}
            />
        </>
        )}
      </div>

      {/* View/Create Plan Modal */}
      {showModal && selectedLead && (modalMode === 'view' || modalMode === 'create') && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {modalMode === 'create' ? 'Create Actual Plan' : 'Plan Details'}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-600 truncate">{selectedLead.company}</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Customer Info */}
              <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Username</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-medium">{selectedLead.customerUsername || '-'}</p>
                      {selectedLead.customerUsername && (
                        <button onClick={() => copyToClipboard(selectedLead.customerUsername)} className="p-1 hover:bg-slate-200 rounded">
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Circuit ID</p>
                    <p className="text-sm font-mono text-orange-600">{selectedLead.circuitId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">ARC Amount</p>
                    <p className="text-sm font-medium text-emerald-600">{formatCurrency(selectedLead.arcAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Customer Accepted</p>
                    <p className="text-sm font-medium">{formatDate(selectedLead.customerAcceptanceAt)}</p>
                  </div>
                </div>
              </div>

              {/* Demo Plan Info (if exists) */}
              {selectedLead.demoPlanName && (
                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <h3 className="text-sm font-semibold text-pink-700 dark:text-pink-300 mb-2">Previous Demo Plan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-xs text-pink-500">Plan Name</p>
                      <p className="font-medium">{selectedLead.demoPlanName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-pink-500">Bandwidth</p>
                      <p className="font-medium">{formatBandwidth(selectedLead.demoPlanBandwidth)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-pink-500">Status</p>
                      <Badge className={selectedLead.demoPlanIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {selectedLead.demoPlanIsActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plan Configuration</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="planName">Plan Name *</Label>
                    <Input
                      id="planName"
                      value={planForm.planName}
                      onChange={(e) => handleFormChange('planName', e.target.value)}
                      placeholder="e.g. Enterprise 100Mbps"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bandwidth">Download Bandwidth (Mbps) *</Label>
                    <Input
                      id="bandwidth"
                      type="number"
                      value={planForm.bandwidth}
                      onChange={(e) => handleFormChange('bandwidth', e.target.value)}
                      placeholder="e.g. 100"
                      disabled={modalMode === 'view'}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {planForm.bandwidth ? `${planForm.bandwidth} Mbps` : 'Enter speed in Mbps'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="uploadBandwidth">Upload Bandwidth (Mbps)</Label>
                    <Input
                      id="uploadBandwidth"
                      type="number"
                      value={planForm.uploadBandwidth}
                      onChange={(e) => handleFormChange('uploadBandwidth', e.target.value)}
                      placeholder="Optional"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingCycle">Billing Cycle *</Label>
                    <select
                      id="billingCycle"
                      value={planForm.billingCycle}
                      onChange={(e) => handleFormChange('billingCycle', e.target.value)}
                      disabled={modalMode === 'view'}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="30">Monthly (30 days)</option>
                      <option value="90">Quarterly (90 days)</option>
                      <option value="180">Half Yearly (180 days)</option>
                      <option value="360">Yearly (360 days)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="billingType">Billing Type *</Label>
                    <select
                      id="billingType"
                      value={planForm.billingType}
                      onChange={(e) => handleFormChange('billingType', e.target.value)}
                      disabled={modalMode === 'view'}
                      className="w-full h-10 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="DAY_TO_DAY">Day to Day</option>
                      <option value="MONTHLY">Monthly (Month End)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      {planForm.billingType === 'DAY_TO_DAY'
                        ? 'Bill ends exactly after billing cycle days'
                        : 'Bill ends at month end after billing cycle'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="price">Price (₹) <span className="text-xs text-slate-400 font-normal">(Auto-calculated from ARC)</span></Label>
                    <Input
                      id="price"
                      type="number"
                      value={planForm.price}
                      onChange={(e) => handleFormChange('price', e.target.value)}
                      placeholder="Amount for billing cycle"
                      disabled={modalMode === 'view'}
                      className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    />
                    {selectedLead?.arcAmount && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Based on ARC: {formatCurrency(selectedLead.arcAmount)} ÷ 360 × {planForm.billingCycle} days
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={planForm.startDate}
                      onChange={(e) => handleFormChange('startDate', e.target.value)}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Label htmlFor="isActive" className="cursor-pointer">Active Status</Label>
                    <button
                      type="button"
                      onClick={() => modalMode === 'create' && handleFormChange('isActive', !planForm.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        planForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      } ${modalMode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={modalMode === 'view'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          planForm.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm ${planForm.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {planForm.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={planForm.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="Any notes about the plan..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    disabled={modalMode === 'view'}
                  />
                </div>

                {/* Price Calculation Display */}
                {selectedLead?.arcAmount && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Price Calculation (Based on ARC)</h4>

                    {/* ARC Reference */}
                    <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Annual Recurring Charge (ARC)</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(selectedLead.arcAmount)}</span>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                        = {formatCurrency(selectedLead.arcAmount / 360)} per day (360 days)
                      </p>
                    </div>

                    {/* All billing cycle prices reference */}
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded ${planForm.billingCycle === '30' ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <span className="text-slate-600 dark:text-slate-400">Monthly (30d):</span>
                        <span className="ml-1 font-medium">{formatCurrency(calculatePriceFromArc(selectedLead.arcAmount, 30))}</span>
                      </div>
                      <div className={`p-2 rounded ${planForm.billingCycle === '90' ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <span className="text-slate-600 dark:text-slate-400">Quarterly (90d):</span>
                        <span className="ml-1 font-medium">{formatCurrency(calculatePriceFromArc(selectedLead.arcAmount, 90))}</span>
                      </div>
                      <div className={`p-2 rounded ${planForm.billingCycle === '180' ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <span className="text-slate-600 dark:text-slate-400">Half Yearly (180d):</span>
                        <span className="ml-1 font-medium">{formatCurrency(calculatePriceFromArc(selectedLead.arcAmount, 180))}</span>
                      </div>
                      <div className={`p-2 rounded ${planForm.billingCycle === '360' ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <span className="text-slate-600 dark:text-slate-400">Yearly (360d):</span>
                        <span className="ml-1 font-medium">{formatCurrency(calculatePriceFromArc(selectedLead.arcAmount, 360))}</span>
                      </div>
                    </div>

                    {/* Selected billing cycle calculation */}
                    {planForm.price && (
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Base Price ({getBillingCycleDaysLabel(planForm.billingCycle)})</span>
                          <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calculatePricing(planForm.price).base)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">GST (18%)</span>
                          <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(calculatePricing(planForm.price).gst)}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount (incl. GST)</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(calculatePricing(planForm.price).total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Created Info (for view mode) */}
              {modalMode === 'view' && selectedLead.actualPlanCreatedAt && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-xs text-emerald-600">
                    Created on {formatDateTime(selectedLead.actualPlanCreatedAt)}
                    {selectedLead.actualPlanCreatedBy && ` by ${selectedLead.actualPlanCreatedBy.name}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Billing: {getBillingCycleLabel(selectedLead.actualPlanValidityDays)}
                    {selectedLead.actualPlanStartDate && ` | Started: ${formatDate(selectedLead.actualPlanStartDate)}`}
                    {selectedLead.actualPlanEndDate && ` | Ends: ${formatDate(selectedLead.actualPlanEndDate)}`}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {modalMode === 'create' && (
              <div className="flex-shrink-0 flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
                <Button onClick={handleCloseModal} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  disabled={isSubmitting || !planForm.planName || !planForm.bandwidth}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Plan
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {showModal && selectedLead && modalMode === 'upgrade' && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-white">Upgrade Plan</h2>
                  <p className="text-xs sm:text-sm text-blue-100 truncate">{selectedLead.company}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg text-white shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Current Plan Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border-l-4 border-l-slate-400">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  Current Plan Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Plan Name</p>
                    <p className="text-sm font-medium">{selectedLead.actualPlanName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Bandwidth</p>
                    <p className="text-sm font-medium">{formatBandwidth(selectedLead.actualPlanBandwidth)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Current ARC</p>
                    <p className="text-sm font-medium text-emerald-600">{formatCurrency(selectedLead.arcAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Billing Cycle</p>
                    <p className="text-sm font-medium">{getBillingCycleLabel(selectedLead.actualPlanValidityDays)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Plan Start Date</p>
                    <p className="text-sm font-medium">{formatDate(selectedLead.actualPlanStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Billing Period End</p>
                    <p className="text-sm font-medium">{formatDate(selectedLead.actualPlanEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Daily Rate</p>
                    <p className="text-sm font-medium text-blue-600">{formatCurrency(selectedLead.arcAmount / 360)}/day</p>
                  </div>
                </div>
              </div>

              {/* Upgrade Form */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                  <ArrowUpCircle size={16} />
                  New Plan Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="upgradePlanName">Plan Name *</Label>
                    <Input
                      id="upgradePlanName"
                      value={upgradeForm.planName}
                      onChange={(e) => handleUpgradeFormChange('planName', e.target.value)}
                      placeholder="e.g. Enterprise 100Mbps"
                    />
                  </div>
                  <div>
                    <Label htmlFor="upgradeBandwidth">New Bandwidth (Mbps) *</Label>
                    <Input
                      id="upgradeBandwidth"
                      type="number"
                      value={upgradeForm.bandwidth}
                      onChange={(e) => handleUpgradeFormChange('bandwidth', e.target.value)}
                      placeholder="e.g. 100"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {upgradeForm.bandwidth ? `${upgradeForm.bandwidth} Mbps` : 'Enter speed in Mbps'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="upgradeUploadBandwidth">Upload Bandwidth (Mbps)</Label>
                    <Input
                      id="upgradeUploadBandwidth"
                      type="number"
                      value={upgradeForm.uploadBandwidth}
                      onChange={(e) => handleUpgradeFormChange('uploadBandwidth', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newArc" className="flex items-center gap-1">
                      New ARC (₹) *
                      <span className="text-xs text-blue-600 font-normal">(Enter the new target ARC)</span>
                    </Label>
                    <Input
                      id="newArc"
                      type="number"
                      value={upgradeForm.newArc}
                      onChange={(e) => handleUpgradeFormChange('newArc', e.target.value)}
                      placeholder="e.g. 90000"
                      className="bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                    />
                    {upgradeForm.newArc && selectedLead?.arcAmount && (
                      <div className="text-xs mt-1 space-y-1">
                        <p className="text-slate-500">
                          Current ARC: {formatCurrency(selectedLead.arcAmount)}
                        </p>
                        <p className="text-slate-500">
                          New ARC: {formatCurrency(parseFloat(upgradeForm.newArc))}
                        </p>
                        <p className="text-blue-600 font-medium">
                          Additional Amount: {formatCurrency(parseFloat(upgradeForm.newArc) - selectedLead.arcAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="upgradeDate" className="flex items-center gap-1">
                      <Calendar size={14} />
                      Upgrade Effective Date *
                    </Label>
                    <Input
                      id="upgradeDate"
                      type="date"
                      value={upgradeForm.upgradeDate}
                      onChange={(e) => handleUpgradeFormChange('upgradeDate', e.target.value)}
                      min={selectedLead.actualPlanStartDate?.split('T')[0]}
                      max={selectedLead.actualPlanEndDate?.split('T')[0]}
                      className="max-w-xs"
                      readOnly={!!activeServiceOrderId}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {activeServiceOrderId ? 'Effective date set by SAM team' : 'Select the date from which the new plan should be effective'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="upgradeNotes">Notes</Label>
                    <textarea
                      id="upgradeNotes"
                      value={upgradeForm.notes}
                      onChange={(e) => handleUpgradeFormChange('notes', e.target.value)}
                      placeholder="Reason for upgrade, customer request details..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Calculation Preview */}
              {upgradeCalculation && !upgradeCalculation.error && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-4 flex items-center gap-2">
                    <Info size={16} />
                    Billing Breakdown for Current Period
                  </h3>

                  {/* Timeline Visualization */}
                  <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-600">{formatDate(upgradeCalculation.planStartDate)}</span>
                      <span className="text-blue-600 font-medium">{formatDate(upgradeCalculation.upgradeDate)}</span>
                      <span className="text-slate-600">{formatDate(upgradeCalculation.planEndDate)}</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 flex items-center justify-center"
                        style={{ width: `${(upgradeCalculation.daysFromStart / upgradeCalculation.totalDays) * 100}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">{upgradeCalculation.daysFromStart}d</span>
                      </div>
                      <div
                        className="bg-blue-500 flex items-center justify-center"
                        style={{ width: `${(upgradeCalculation.daysRemaining / upgradeCalculation.totalDays) * 100}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">{upgradeCalculation.daysRemaining}d</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-400 rounded"></div>
                        <span className="text-xs text-slate-600">Before Upgrade</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-xs text-slate-600">Upgrade Period</span>
                      </div>
                    </div>
                  </div>

                  {/* ARC Summary */}
                  <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-500">Current ARC</p>
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(upgradeCalculation.oldArc)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">+ Additional</p>
                        <p className="text-sm font-bold text-blue-600">{formatCurrency(upgradeCalculation.additionalArc)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-500">= New ARC</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(upgradeCalculation.newTotalArc)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade Invoice Breakdown */}
                  <div className="space-y-3">
                    {/* Original Invoice Info */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Original Invoice</p>
                        <p className="text-xs text-slate-500">Already generated for full billing period</p>
                        <p className="text-xs text-slate-400">
                          {formatDate(upgradeCalculation.planStartDate)} to {formatDate(upgradeCalculation.planEndDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">No changes</p>
                        <p className="text-xs text-slate-400">(Invoice remains unchanged)</p>
                      </div>
                    </div>

                    {/* NEW Upgrade Invoice */}
                    <div className="flex items-center justify-between p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                      <div>
                        <p className="text-sm font-medium text-blue-700">NEW Upgrade Invoice</p>
                        <p className="text-xs text-blue-600">
                          {formatDate(upgradeCalculation.upgradeDate)} to {formatDate(upgradeCalculation.planEndDate)} ({upgradeCalculation.daysRemaining} days)
                        </p>
                        <p className="text-xs text-blue-500">
                          Additional Amount: {formatCurrency(upgradeCalculation.additionalArc)} @ {formatCurrency(upgradeCalculation.additionalArc / 360)}/day
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(upgradeCalculation.upgradeTotal)}</p>
                        <p className="text-xs text-blue-500">Base: {formatCurrency(upgradeCalculation.upgradeBaseAmount)} + GST: {formatCurrency(upgradeCalculation.upgradeGst)}</p>
                      </div>
                    </div>

                    {/* Future Billing Note */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-700 font-medium mb-1">Future Billing (Next Cycle Onwards)</p>
                      <p className="text-xs text-emerald-600">
                        After this billing period, all future invoices will be based on the new total ARC of <strong>{formatCurrency(upgradeCalculation.newTotalArc)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {upgradeCalculation?.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle size={16} />
                    <p className="text-sm font-medium">{upgradeCalculation.error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 hidden sm:block">
                {upgradeCalculation && !upgradeCalculation.error && (
                  <span>
                    Effective from <strong>{formatDate(upgradeForm.upgradeDate)}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <Button onClick={handleCloseModal} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleUpgradePlan}
                  disabled={isSubmitting || !upgradeForm.planName || !upgradeForm.bandwidth || !upgradeForm.newArc || upgradeCalculation?.error}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Confirm Upgrade
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Revision Modal */}
      {showModal && selectedLead && modalMode === 'rate_revision' && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-white">Rate Revision</h2>
                <p className="text-xs sm:text-sm text-teal-100 truncate">
                  {selectedLead.company || selectedLead.campaignData?.company || 'Unknown Company'} — ARC reduction, bandwidth unchanged
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors shrink-0 p-2">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Current Plan Info */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Current Plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Plan Name:</span>
                    <span className="ml-2 font-medium">{selectedLead.actualPlanName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Bandwidth:</span>
                    <span className="ml-2 font-medium">{formatBandwidth(selectedLead.actualPlanBandwidth)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ARC:</span>
                    <span className="ml-2 font-medium text-teal-600">{formatCurrency(selectedLead.arcAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Billing Period:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(selectedLead.actualPlanStartDate)} - {formatDate(selectedLead.actualPlanEndDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* New ARC Configuration */}
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} />
                  New ARC Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="revisionPlanName">Plan Name</Label>
                    <Input
                      id="revisionPlanName"
                      value={rateRevisionForm.planName}
                      onChange={(e) => handleRateRevisionFormChange('planName', e.target.value)}
                      placeholder={selectedLead.actualPlanName || 'Plan name'}
                    />
                    <p className="text-xs text-slate-500 mt-1">Leave as-is if plan name unchanged</p>
                  </div>
                  <div>
                    <Label htmlFor="revisionNewArc">New ARC (INR) *</Label>
                    <Input
                      id="revisionNewArc"
                      type="number"
                      value={rateRevisionForm.newArc}
                      onChange={(e) => handleRateRevisionFormChange('newArc', e.target.value)}
                      placeholder="e.g. 40000"
                    />
                    {rateRevisionForm.newArc && selectedLead.arcAmount && (
                      <p className={`text-xs mt-1 ${parseFloat(rateRevisionForm.newArc) < selectedLead.arcAmount ? 'text-teal-600' : 'text-red-500'}`}>
                        {formatCurrency(selectedLead.arcAmount)} → {formatCurrency(parseFloat(rateRevisionForm.newArc))}
                        {parseFloat(rateRevisionForm.newArc) >= selectedLead.arcAmount && ' (must be less than current ARC)'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-500">Bandwidth</Label>
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-teal-600">
                      {formatBandwidth(selectedLead.actualPlanBandwidth)} <span className="text-xs text-slate-400 font-normal">(no change)</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="revisionDate" className="flex items-center gap-1">
                      <Calendar size={14} />
                      Revision Effective Date *
                    </Label>
                    <Input
                      id="revisionDate"
                      type="date"
                      value={rateRevisionForm.revisionDate}
                      onChange={(e) => handleRateRevisionFormChange('revisionDate', e.target.value)}
                      readOnly={!!activeServiceOrderId}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {activeServiceOrderId ? 'Effective date set by SAM team' : 'Select the date from which the revised rate should be effective'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="revisionNotes">Notes</Label>
                    <textarea
                      id="revisionNotes"
                      value={rateRevisionForm.notes}
                      onChange={(e) => handleRateRevisionFormChange('notes', e.target.value)}
                      placeholder="Reason for rate revision..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="text-xs text-teal-700 dark:text-teal-300 flex items-center gap-2">
                  <Info size={14} />
                  ARC will be reduced while bandwidth remains at {formatBandwidth(selectedLead.actualPlanBandwidth)}.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 hidden sm:block">
                Effective from <strong>{formatDate(rateRevisionForm.revisionDate)}</strong>
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <Button onClick={handleCloseModal} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleRateRevision}
                  disabled={isSubmitting || !rateRevisionForm.planName || !rateRevisionForm.newArc || (selectedLead.arcAmount && parseFloat(rateRevisionForm.newArc) >= selectedLead.arcAmount)}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Confirm Rate Revision
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Degrade Plan Modal */}
      {showModal && selectedLead && modalMode === 'degrade' && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-white">Degrade Plan</h2>
                <p className="text-xs sm:text-sm text-amber-100 truncate">
                  {selectedLead.campaignData?.company || 'Unknown Company'}
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors shrink-0 p-2">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Current Plan Info */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Current Plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Plan Name:</span>
                    <span className="ml-2 font-medium">{selectedLead.actualPlanName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Bandwidth:</span>
                    <span className="ml-2 font-medium">{formatBandwidth(selectedLead.actualPlanBandwidth)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Current ARC:</span>
                    <span className="ml-2 font-medium text-amber-600">{formatCurrency(selectedLead.arcAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Billing Period:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(selectedLead.actualPlanStartDate)} - {formatDate(selectedLead.actualPlanEndDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Plan Configuration */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2">
                  <ArrowDownCircle size={16} />
                  Downgraded Plan Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="degradePlanName">Plan Name *</Label>
                    <Input
                      id="degradePlanName"
                      value={degradeForm.planName}
                      onChange={(e) => handleDegradeFormChange('planName', e.target.value)}
                      placeholder="e.g. Basic 50Mbps"
                    />
                  </div>
                  <div>
                    <Label htmlFor="degradeBandwidth">New Bandwidth (Mbps) *</Label>
                    <Input
                      id="degradeBandwidth"
                      type="number"
                      value={degradeForm.bandwidth}
                      onChange={(e) => handleDegradeFormChange('bandwidth', e.target.value)}
                      placeholder="e.g. 50"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {degradeForm.bandwidth ? `${degradeForm.bandwidth} Mbps` : 'Enter speed in Mbps'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="degradeUploadBandwidth">Upload Bandwidth (Mbps)</Label>
                    <Input
                      id="degradeUploadBandwidth"
                      type="number"
                      value={degradeForm.uploadBandwidth}
                      onChange={(e) => handleDegradeFormChange('uploadBandwidth', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="degradeArc" className="flex items-center gap-1">
                      New ARC (₹) *
                      <span className="text-xs text-emerald-600 font-normal">(Enter the new target ARC)</span>
                    </Label>
                    <Input
                      id="degradeArc"
                      type="number"
                      value={degradeForm.degradeArc}
                      onChange={(e) => handleDegradeFormChange('degradeArc', e.target.value)}
                      placeholder="e.g. 56000"
                      className="bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                    />
                    {degradeForm.degradeArc && selectedLead?.arcAmount && (
                      <div className="text-xs mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Current ARC:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(selectedLead.arcAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">New ARC:</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(parseFloat(degradeForm.degradeArc))}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Difference (to deduct):</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(selectedLead.arcAmount - parseFloat(degradeForm.degradeArc))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="degradeDate" className="flex items-center gap-1">
                      <Calendar size={14} />
                      Degrade Effective Date *
                    </Label>
                    <Input
                      id="degradeDate"
                      type="date"
                      value={degradeForm.degradeDate}
                      onChange={(e) => handleDegradeFormChange('degradeDate', e.target.value)}
                      min={selectedLead.actualPlanStartDate?.split('T')[0]}
                      max={selectedLead.actualPlanEndDate?.split('T')[0]}
                      className="max-w-xs"
                      readOnly={!!activeServiceOrderId}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {activeServiceOrderId ? 'Effective date set by SAM team' : 'Select the date from which the downgraded plan should be effective'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="degradeNotes">Notes</Label>
                    <textarea
                      id="degradeNotes"
                      value={degradeForm.notes}
                      onChange={(e) => handleDegradeFormChange('notes', e.target.value)}
                      placeholder="Reason for downgrade, customer request details..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Credit Note Calculation Preview */}
              {degradeCalculation && !degradeCalculation.error && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2">
                    <Info size={16} />
                    Credit Note Calculation
                  </h3>

                  {/* Timeline Visualization */}
                  <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-600">{formatDate(degradeCalculation.planStartDate)}</span>
                      <span className="text-amber-600 font-medium">{formatDate(degradeCalculation.degradeDate)}</span>
                      <span className="text-slate-600">{formatDate(degradeCalculation.planEndDate)}</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 flex items-center justify-center"
                        style={{ width: `${(degradeCalculation.daysFromStart / degradeCalculation.totalDays) * 100}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">{degradeCalculation.daysFromStart}d</span>
                      </div>
                      <div
                        className="bg-amber-500 flex items-center justify-center"
                        style={{ width: `${(degradeCalculation.daysRemaining / degradeCalculation.totalDays) * 100}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">{degradeCalculation.daysRemaining}d</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-400 rounded"></div>
                        <span className="text-xs text-slate-600">Before Degrade</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-500 rounded"></div>
                        <span className="text-xs text-slate-600">Credit Period</span>
                      </div>
                    </div>
                  </div>

                  {/* ARC Summary */}
                  <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-500">Current ARC</p>
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(degradeCalculation.oldArc)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-500">- Difference</p>
                        <p className="text-sm font-bold text-amber-600">{formatCurrency(degradeCalculation.degradeAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-500">= New ARC</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(degradeCalculation.newTotalArc)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Credit Note Breakdown */}
                  <div className="space-y-3">
                    {/* Credit Note Info */}
                    <div className="flex items-center justify-between p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                      <div>
                        <p className="text-sm font-medium text-amber-700">Credit Note (Will be created)</p>
                        <p className="text-xs text-amber-600">
                          {formatDate(degradeCalculation.degradeDate)} to {formatDate(degradeCalculation.planEndDate)} ({degradeCalculation.daysRemaining} days)
                        </p>
                        <p className="text-xs text-amber-500">
                          Difference Amount: {formatCurrency(degradeCalculation.degradeAmount)} @ {formatCurrency(degradeCalculation.degradeAmount / 360)}/day
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-700">{formatCurrency(degradeCalculation.creditTotal)}</p>
                        <p className="text-xs text-amber-500">Base: {formatCurrency(degradeCalculation.creditBaseAmount)} + GST: {formatCurrency(degradeCalculation.creditGst)}</p>
                      </div>
                    </div>

                    {/* Future Billing Note */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-700 font-medium mb-1">Future Billing (Next Cycle Onwards)</p>
                      <p className="text-xs text-emerald-600">
                        After this billing period, all future invoices will be based on the new total ARC of <strong>{formatCurrency(degradeCalculation.newTotalArc)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {degradeCalculation?.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle size={16} />
                    <p className="text-sm font-medium">{degradeCalculation.error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 hidden sm:block">
                {degradeCalculation && !degradeCalculation.error && (
                  <span>
                    Effective from <strong>{formatDate(degradeForm.degradeDate)}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <Button onClick={handleCloseModal} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleDegradePlan}
                  disabled={isSubmitting || !degradeForm.planName || !degradeForm.bandwidth || !degradeForm.degradeArc || degradeCalculation?.error}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Confirm Degrade & Create Credit Note</span>
                      <span className="sm:hidden">Confirm Degrade</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
