'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Play,
  Power,
  PowerOff,
  Copy,
  EyeOff,
  Network
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';

// Format bandwidth for display
const formatBandwidth = (kbps) => {
  if (!kbps) return '-';
  if (kbps >= 1000000) {
    return `${(kbps / 1000000).toFixed(1)} Gbps`;
  } else if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(0)} Mbps`;
  }
  return `${kbps} Kbps`;
};

// Icon Button with Tooltip Component
const IconButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false }) => {
  const baseClasses = "relative group p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    default: "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800",
    primary: "bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-800",
    success: "bg-emerald-100 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-800",
    warning: "bg-amber-100 hover:bg-amber-200 text-amber-600 hover:text-amber-800",
    danger: "bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800",
    pink: "bg-pink-100 hover:bg-pink-200 text-pink-600 hover:text-pink-800"
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

export default function AccountsDemoPlanPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ pending: 0, assigned: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Modal states
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Demo plan form (simplified - just plan details)
  const [planForm, setPlanForm] = useState({
    planName: '',
    bandwidth: '',
    uploadBandwidth: '',
    expiryDate: '',
    isActive: true,
    notes: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showAssignModal, () => !isAssigning && setShowAssignModal(false));

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
      const response = await api.get(`/leads/accounts-team/demo-plan/queue?status=${activeTab}`);
      setLeads(response.data.leads || []);
      setStats(response.data.stats || { pending: 0, assigned: 0 });
    } catch (error) {
      toast.error('Failed to fetch demo plan queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAccountsTeam || isAdmin) {
      fetchQueue();
    }
  }, [isAccountsTeam, isAdmin, activeTab]);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Generate plan name from username and bandwidth
  const generatePlanName = (username, bandwidth, isDemo = true) => {
    // Clean username: lowercase, replace spaces with underscore
    const cleanUsername = (username || 'customer')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Clean bandwidth: lowercase, remove spaces
    const cleanBandwidth = (bandwidth || '100mbps')
      .toLowerCase()
      .replace(/\s+/g, '');

    // Format: username_demo_speed or username_speed
    if (isDemo) {
      return `${cleanUsername}_demo_${cleanBandwidth}`;
    }
    return `${cleanUsername}_${cleanBandwidth}`;
  };

  // Open assign modal
  const handleOpenAssignModal = (lead) => {
    setSelectedLead(lead);
    const generatedPlanName = lead.demoPlanName || generatePlanName(
      lead.customerUsername,
      lead.bandwidthRequirement,
      true // isDemo
    );
    setPlanForm({
      planName: generatedPlanName,
      bandwidth: lead.demoPlanBandwidth || '',
      uploadBandwidth: lead.demoPlanUploadBandwidth || '',
      expiryDate: lead.demoPlanEndDate ? new Date(lead.demoPlanEndDate).toISOString().slice(0, 10) : '',
      isActive: lead.demoPlanIsActive ?? true,
      notes: lead.demoPlanNotes || ''
    });
    setShowAssignModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedLead(null);
    setPlanForm({
      planName: '',
      bandwidth: '',
      uploadBandwidth: '',
      expiryDate: '',
      isActive: true,
      notes: ''
    });
  };

  // Handle form change
  const handleFormChange = (field, value) => {
    setPlanForm(prev => ({ ...prev, [field]: value }));
  };

  // Assign demo plan
  const handleAssignPlan = async () => {
    if (!selectedLead || !planForm.planName || !planForm.bandwidth) {
      toast.error('Plan name and bandwidth are required');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await api.post(`/leads/accounts-team/${selectedLead.id}/demo-plan`, {
        planName: planForm.planName,
        bandwidth: parseInt(planForm.bandwidth),
        uploadBandwidth: planForm.uploadBandwidth ? parseInt(planForm.uploadBandwidth) : null,
        expiryDate: planForm.expiryDate || null,
        isActive: planForm.isActive,
        notes: planForm.notes || null
      });

      if (response.data) {
        toast.success('Demo plan assigned successfully!');
        handleCloseModal();
        fetchQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign demo plan');
    } finally {
      setIsAssigning(false);
    }
  };

  // Toggle plan status
  const handleTogglePlanStatus = async (lead) => {
    try {
      const response = await api.patch(`/leads/accounts-team/${lead.id}/demo-plan/toggle`, {
        isActive: !lead.demoPlanIsActive
      });

      if (response.data) {
        toast.success(`Plan ${!lead.demoPlanIsActive ? 'activated' : 'deactivated'}`);
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
        <PageHeader title="Demo Plan Assignment" description="Assign demo plans to customers after installation" />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card
            onClick={() => setActiveTab('pending')}
            className={`bg-white dark:bg-slate-900 border-l-4 cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'pending' ? 'border-l-pink-500 ring-2 ring-pink-100' : 'border-l-pink-500'
            }`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('assigned')}
            className={`bg-white dark:bg-slate-900 border-l-4 cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'assigned' ? 'border-l-emerald-500 ring-2 ring-emerald-100' : 'border-l-emerald-500'
            }`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Assigned</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.assigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <>
            {/* Mobile Loading/Empty/Card View */}
            <div className="lg:hidden">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                </div>
              ) : paginatedLeads.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {activeTab === 'pending' ? 'No leads pending demo plan assignment' : 'No plans assigned yet'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="space-y-3 p-3">
                    {paginatedLeads.map((lead) => (
                      <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="px-3 py-2.5 bg-pink-50 dark:bg-pink-900/20 flex items-center justify-between">
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
                          {activeTab === 'assigned' && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{lead.demoPlanName}</p>
                              <p className="text-xs text-slate-500">DL: {formatBandwidth(lead.demoPlanBandwidth)} {lead.demoPlanUploadBandwidth ? `• UL: ${formatBandwidth(lead.demoPlanUploadBandwidth)}` : ''}</p>
                              <Badge className={`mt-1 text-[10px] ${lead.demoPlanIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {lead.demoPlanIsActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          {activeTab === 'pending' ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenAssignModal(lead)}
                              className="bg-pink-600 hover:bg-pink-700 text-white text-xs"
                              disabled={!lead.customerUsername}
                            >
                              <Play size={12} className="mr-1" />
                              Assign Plan
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <IconButton icon={Eye} label="View" variant="default" onClick={() => handleOpenAssignModal(lead)} />
                              <IconButton
                                icon={lead.demoPlanIsActive ? PowerOff : Power}
                                label={lead.demoPlanIsActive ? 'Deactivate' : 'Activate'}
                                variant={lead.demoPlanIsActive ? 'danger' : 'success'}
                                onClick={() => handleTogglePlanStatus(lead)}
                              />
                            </div>
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
              emptyMessage={activeTab === 'pending' ? 'No leads pending demo plan assignment' : 'No plans assigned yet'}
              emptyIcon={FileText}
              columns={[
                {
                  key: 'company',
                  label: 'Company',
                  render: (lead) => (
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-pink-600" />
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
                      {lead.customerPassword && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Password:</span>
                          <span className="text-xs font-mono">{showPassword ? lead.customerPassword : '••••••••'}</span>
                          <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-slate-100 rounded">
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button onClick={() => copyToClipboard(lead.customerPassword)} className="p-1 hover:bg-slate-100 rounded">
                            <Copy className="h-3 w-3 text-slate-400" />
                          </button>
                        </div>
                      )}
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
                ...(activeTab === 'assigned' ? [{
                  key: 'demoPlan',
                  label: 'Demo Plan',
                  render: (lead) => (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">{lead.demoPlanName}</p>
                      <p className="text-xs text-slate-500">Download: {formatBandwidth(lead.demoPlanBandwidth)}</p>
                      {lead.demoPlanUploadBandwidth && (
                        <p className="text-xs text-slate-500">Upload: {formatBandwidth(lead.demoPlanUploadBandwidth)}</p>
                      )}
                      <Badge className={lead.demoPlanIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {lead.demoPlanIsActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  )
                }] : [])
              ]}
              actions={(lead) => activeTab === 'pending' ? (
                <Button
                  size="sm"
                  onClick={() => handleOpenAssignModal(lead)}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                  disabled={!lead.customerUsername}
                >
                  <Play size={14} className="mr-1" />
                  Assign Plan
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <IconButton icon={Eye} label="View Details" variant="default" onClick={() => handleOpenAssignModal(lead)} />
                  <IconButton
                    icon={lead.demoPlanIsActive ? PowerOff : Power}
                    label={lead.demoPlanIsActive ? 'Deactivate' : 'Activate'}
                    variant={lead.demoPlanIsActive ? 'danger' : 'success'}
                    onClick={() => handleTogglePlanStatus(lead)}
                  />
                </div>
              )}
            />
        </>
      </div>

      {/* Assign Plan Modal */}
      {showAssignModal && selectedLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {activeTab === 'pending' ? 'Assign Demo Plan' : 'Demo Plan Details'}
                </h2>
                <p className="text-xs sm:text-sm text-pink-600 truncate">{selectedLead.company}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
              >
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
                    <p className="text-xs text-slate-500">Password</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono">{showPassword ? (selectedLead.customerPassword || '-') : '••••••••'}</p>
                      {selectedLead.customerPassword && (
                        <>
                          <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-slate-200 rounded">
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button onClick={() => copyToClipboard(selectedLead.customerPassword)} className="p-1 hover:bg-slate-200 rounded">
                            <Copy className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Circuit ID</p>
                    <p className="text-sm font-mono text-orange-600">{selectedLead.circuitId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Required Bandwidth</p>
                    <p className="text-sm font-medium">{selectedLead.bandwidthRequirement || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Plan Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Demo Plan Configuration</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="planName">Plan Name *</Label>
                    <Input
                      id="planName"
                      value={planForm.planName}
                      onChange={(e) => handleFormChange('planName', e.target.value)}
                      placeholder="e.g. Demo 100Mbps"
                      disabled={activeTab === 'assigned'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bandwidth">Download Speed (Mbps) *</Label>
                    <Input
                      id="bandwidth"
                      type="number"
                      value={planForm.bandwidth}
                      onChange={(e) => handleFormChange('bandwidth', e.target.value)}
                      placeholder="e.g. 100"
                      disabled={activeTab === 'assigned'}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {planForm.bandwidth ? `${planForm.bandwidth} Mbps` : 'Enter speed in Mbps'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="uploadBandwidth">Upload Speed (Mbps)</Label>
                    <Input
                      id="uploadBandwidth"
                      type="number"
                      value={planForm.uploadBandwidth}
                      onChange={(e) => handleFormChange('uploadBandwidth', e.target.value)}
                      placeholder="Optional"
                      disabled={activeTab === 'assigned'}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {planForm.uploadBandwidth ? `${planForm.uploadBandwidth} Mbps` : 'Leave empty for same as download'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={planForm.expiryDate}
                      onChange={(e) => handleFormChange('expiryDate', e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      disabled={activeTab === 'assigned'}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {planForm.expiryDate
                        ? `Plan will auto-stop on ${new Date(planForm.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Leave empty for no automatic expiry'}
                    </p>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-4 pt-2">
                    <Label htmlFor="isActive" className="cursor-pointer">Plan Status</Label>
                    <button
                      type="button"
                      onClick={() => handleFormChange('isActive', !planForm.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        planForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          planForm.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${planForm.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
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
                    disabled={activeTab === 'assigned'}
                  />
                </div>
              </div>

              {/* Assigned Info (for assigned tab) */}
              {activeTab === 'assigned' && selectedLead.demoPlanAssignedAt && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-xs text-emerald-600">
                    Assigned on {formatDateTime(selectedLead.demoPlanAssignedAt)}
                    {selectedLead.demoPlanAssignedBy && ` by ${selectedLead.demoPlanAssignedBy.name}`}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {activeTab === 'pending' && (
              <div className="flex-shrink-0 flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
                <Button onClick={handleCloseModal} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignPlan}
                  disabled={isAssigning || !planForm.planName || !planForm.bandwidth}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                  size="sm"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Assign Plan
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
