'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import api from '@/lib/api';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/DataTable';
import {
  Building2,
  User,
  X,
  CheckCircle,
  Eye,
  Loader2,
  Wifi,
  Hash,
  UserPlus,
  Copy,
  Network,
  Clock,
  MapPin,
  Phone,
  Truck,
  FileText,
  Zap,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatDate } from '@/lib/formatters';
import TabBar from '@/components/TabBar';

export default function NocQueuePage() {
  const router = useRouter();
  const { user, isNOC: _isNOC, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const isNOC = isMaster ? true : (_isNOC || user?.role === 'NOC_HEAD');
  const isNOCHead = user?.role === 'NOC_HEAD' || isMaster;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const {
    nocQueue,
    nocStats,
    fetchNocQueue,
    fetchNocLeadDetails,
    nocCreateCustomerAccount,
    nocAssignIpAddresses,
    nocGenerateCircuitId,
    clearSelectedNocLead,
    isLoading
  } = useLeadStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Step 1: Create Customer Account
  const [customerFormData, setCustomerFormData] = useState({ username: '', password: '' });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Step 2: IP Assignment
  const [ipInputs, setIpInputs] = useState([]);
  const [isAssigningIPs, setIsAssigningIPs] = useState(false);

  // Step 3: Circuit ID
  const [isGeneratingCircuit, setIsGeneratingCircuit] = useState(false);
  const [manualCircuitId, setManualCircuitId] = useState('');

  // NOC Head: Assignment
  const [nocUsers, setNocUsers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLeadId, setAssignLeadId] = useState(null);
  const [selectedNocUser, setSelectedNocUser] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Redirect non-NOC users
  useEffect(() => {
    if (user && !isNOC && !isAdmin && !isBDMTeamLeader) {
      router.push('/dashboard');
    }
  }, [user, isNOC, isAdmin, isBDMTeamLeader, router]);

  // NOC Head: fetch NOC users for assignment
  useEffect(() => {
    if (isNOCHead || isAdmin) {
      api.get('/users/by-role?role=NOC').then(res => setNocUsers(res.data.users || [])).catch(() => {});
    }
  }, [isNOCHead, isAdmin]);

  const handleAssignToNoc = async () => {
    if (!assignLeadId || !selectedNocUser) return;
    setIsAssigning(true);
    try {
      await api.post(`/leads/noc/${assignLeadId}/assign`, { nocUserId: selectedNocUser });
      toast.success('Lead assigned to NOC user');
      setShowAssignModal(false);
      setAssignLeadId(null);
      setSelectedNocUser('');
      fetchNocQueue(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally {
      setIsAssigning(false);
    }
  };

  useSocketRefresh(() => fetchNocQueue(activeTab), { enabled: isNOC || isAdmin || isBDMTeamLeader });

  // Fetch queue based on active tab
  useEffect(() => {
    if (isNOC || isAdmin || isBDMTeamLeader) {
      fetchNocQueue(activeTab);
    }
  }, [activeTab, isNOC, isAdmin, isBDMTeamLeader, fetchNocQueue]);

  // Initialize IP inputs when lead changes
  useEffect(() => {
    if (selectedLead) {
      const numIPs = selectedLead.numberOfIPs || 1;
      const existingIPs = selectedLead.customerIpAddresses || [];
      const inputs = Array.from({ length: numIPs }, (_, i) => existingIPs[i] || '');
      setIpInputs(inputs);
    }
  }, [selectedLead]);

  // Tab change handler
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Handle configure click
  const handleConfigure = async (lead) => {
    const result = await fetchNocLeadDetails(lead.id);
    if (result.success) {
      setSelectedLead(result.lead);
      setCustomerFormData({ username: '', password: '' });
    } else {
      toast.error(result.error || 'Failed to fetch lead details');
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setCustomerFormData({ username: '', password: '' });
    setIpInputs([]);
    clearSelectedNocLead();
  };

  useModal(showModal, handleCloseModal);

  // Step 1: Create customer account
  const handleCreateCustomer = async () => {
    if (!selectedLead) return;

    if (!customerFormData.username.trim() || !customerFormData.password.trim()) {
      toast.error('Username and Password are required');
      return;
    }

    setIsCreatingCustomer(true);
    const result = await nocCreateCustomerAccount(selectedLead.id, {
      username: customerFormData.username.trim(),
      password: customerFormData.password.trim()
    });

    if (result.success) {
      toast.success('Customer account created! Lead moved to IP Assignment.');
      handleCloseModal();
      fetchNocQueue(activeTab);
    } else {
      toast.error(result.error || 'Failed to create customer account');
    }
    setIsCreatingCustomer(false);
  };

  // Step 2: Assign IPs
  const handleAssignIPs = async () => {
    if (!selectedLead) return;

    const validIPs = ipInputs.filter(ip => ip.trim());
    if (validIPs.length === 0) {
      toast.error('Please enter at least one IP address');
      return;
    }

    setIsAssigningIPs(true);
    const result = await nocAssignIpAddresses(selectedLead.id, validIPs);

    if (result.success) {
      toast.success('IP addresses assigned! Lead moved to Circuit Generation.');
      handleCloseModal();
      fetchNocQueue(activeTab);
    } else {
      toast.error(result.error || 'Failed to assign IP addresses');
    }
    setIsAssigningIPs(false);
  };

  // Step 3: Save Circuit ID (manually entered, pushes to delivery)
  const handleGenerateCircuit = async () => {
    if (!selectedLead) return;

    if (!manualCircuitId.trim()) {
      toast.error('Please enter a Circuit ID');
      return;
    }

    setIsGeneratingCircuit(true);
    const result = await nocGenerateCircuitId(selectedLead.id, manualCircuitId.trim());

    if (result.success) {
      toast.success(result.message || `Circuit ID ${result.circuitId} saved and pushed to delivery!`);
      setManualCircuitId('');
      handleCloseModal();
      fetchNocQueue(activeTab);
    } else {
      toast.error(result.error || 'Failed to save circuit ID');
    }
    setIsGeneratingCircuit(false);
  };

  // Get current step for a lead
  const getCurrentStep = (lead) => {
    if (lead.circuitId) return 4;
    if (lead.customerIpAddresses?.length > 0 || lead.customerIpAssigned) return 3;
    if (lead.customerUserId) return 2;
    return 1;
  };

  // Get action button based on current tab
  const getActionButton = (lead) => {
    const step = getCurrentStep(lead);

    if (activeTab === 'pending' && step === 1) {
      return { label: 'Create User', color: 'bg-orange-600 hover:bg-orange-700', icon: UserPlus };
    }
    if (activeTab === 'customer_created' && step === 2) {
      return { label: 'Assign IPs', color: 'bg-blue-600 hover:bg-blue-700', icon: Network };
    }
    if (activeTab === 'ip_assigned' && step === 3) {
      return { label: 'Generate Circuit', color: 'bg-emerald-600 hover:bg-emerald-700', icon: Zap };
    }
    if (activeTab === 'configured' && step === 4) {
      return { label: 'View Details', color: 'bg-slate-600 hover:bg-slate-700', icon: Eye };
    }
    return null;
  };

  // Build columns dynamically based on active tab
  const getNocColumns = () => {
    const columns = [
      {
        key: 'company',
        label: 'Company',
        render: (lead) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-slate-900 dark:text-white">{lead.company}</p>
                {lead.campaign?.code === 'SAM-GENERATED' ? (
                  <span className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] px-1.5 py-0 rounded">
                    SAM Generated {lead.dataCreatedBy?.name ? `(${lead.dataCreatedBy.name})` : ''}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">{lead.name}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        label: 'Contact',
        render: (lead) => (
          <>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">{lead.phone}</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{lead.email}</p>
          </>
        ),
      },
      {
        key: 'service',
        label: 'Service',
        render: (lead) => (
          <div className="flex flex-wrap gap-2">
            {lead.bandwidthRequirement && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                <Wifi className="h-3 w-3" />
                {lead.bandwidthRequirement}
              </span>
            )}
            {lead.numberOfIPs && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                <Hash className="h-3 w-3" />
                {lead.numberOfIPs} IPs
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'delivery',
        label: 'Delivery',
        render: (lead) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Truck className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lead.deliveryAssignedTo?.name || '-'}</span>
          </div>
        ),
      },
    ];

    // NOC Head: show assigned-to column
    if (isNOCHead || isAdmin) {
      columns.push({
        key: 'nocAssignedTo',
        label: 'Assigned To',
        render: (lead) => lead.nocAssignedTo ? (
          <Badge className="bg-blue-100 text-blue-700 text-[10px]">{lead.nocAssignedTo.name}</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 text-[10px]">Unassigned</Badge>
        ),
      });
    }

    if (activeTab !== 'pending') {
      columns.push({
        key: 'customerUserId',
        label: 'Customer ID',
        render: (lead) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 font-mono text-sm text-green-700 dark:text-green-400 font-semibold">
            {lead.customerUserId}
          </span>
        ),
      });
    }

    if (activeTab === 'ip_assigned' || activeTab === 'configured') {
      columns.push({
        key: 'ips',
        label: 'IPs',
        render: (lead) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 font-mono text-sm text-blue-700 dark:text-blue-400 font-medium">
            {lead.customerIpAddresses?.length || 0} assigned
          </span>
        ),
      });
    }

    if (activeTab === 'configured') {
      columns.push({
        key: 'circuitId',
        label: 'Circuit ID',
        render: (lead) => (
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 font-mono text-sm text-emerald-700 dark:text-emerald-400 font-bold">
            {lead.circuitId}
          </span>
        ),
      });
    }

    return columns;
  };

  if (!user || (!isNOC && !isAdmin && !isBDMTeamLeader)) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">NOC Queue</h1>
            {isBDMTeamLeader && (
              <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs">
                Read-Only View
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure customer accounts step by step
          </p>
        </div>

        {/* Pipeline Tabs */}
        <TabBar
          tabs={[
            { key: 'pending', label: 'Pending', count: nocStats.pending, icon: Clock, variant: 'warning' },
            { key: 'customer_created', label: 'User Created', count: nocStats.customerCreated, icon: UserPlus },
            { key: 'ip_assigned', label: 'IPs Assigned', count: nocStats.ipAssigned, icon: Network, variant: 'info' },
            { key: 'configured', label: 'Completed', count: nocStats.configured, icon: CheckCircle, variant: 'success' },
          ]}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Queue Table */}
            <DataTable
              columns={getNocColumns()}
              data={nocQueue}
              loading={isLoading}
              pagination
              defaultPageSize={10}
              searchable
              searchPlaceholder="Search by company, name, phone..."
              searchKeys={['company', 'name', 'phone', 'email']}
              emptyMessage="No leads in this stage"
              emptyIcon={Wifi}
              actions={(lead) => {
                const actionBtn = getActionButton(lead);
                const ActionIcon = actionBtn?.icon;
                const isAssignedToOther = isNOCHead && lead.nocAssignedTo && lead.nocAssignedTo.id !== user?.id;
                const canWork = !isAssignedToOther;
                return (
                  <div className="flex items-center justify-center gap-2">
                    {(isNOCHead || isAdmin) && !lead.nocAssignedTo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAssignLeadId(lead.id); setSelectedNocUser(''); setShowAssignModal(true); }}
                        className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Users className="h-3 w-3 mr-1" />Assign
                      </Button>
                    )}
                    {canWork && !isBDMTeamLeader && actionBtn && activeTab !== 'configured' && (
                      <Button
                        size="sm"
                        onClick={() => handleConfigure(lead)}
                        className={`${actionBtn.color} text-white shadow-sm`}
                      >
                        <ActionIcon className="h-4 w-4 mr-1.5" />
                        {actionBtn.label}
                      </Button>
                    )}
                    {canWork && !isBDMTeamLeader && actionBtn && activeTab === 'configured' && (
                      <div className="relative group">
                        <button
                          onClick={() => handleConfigure(lead)}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <ActionIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
                          {actionBtn.label}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                        </div>
                      </div>
                    )}
                    {activeTab === 'configured' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <Truck className="h-3.5 w-3.5" />
                        Dispatched
                      </span>
                    )}
                  </div>
                );
              }}
              className="hidden lg:block"
            />
      </div>

      {/* Modal - Shows only relevant step based on activeTab */}
      {showModal && selectedLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedLead.company}</h2>
                <p className="text-sm text-slate-500">{selectedLead.name} | {selectedLead.phone}</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lead Info Summary */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <Wifi className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Bandwidth</p>
                  <p className="text-sm font-semibold">{selectedLead.bandwidthRequirement || '-'}</p>
                </div>
                <div>
                  <Hash className="h-4 w-4 text-cyan-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">No. of IPs</p>
                  <p className="text-sm font-semibold">{selectedLead.numberOfIPs || 1}</p>
                </div>
                <div>
                  <Truck className="h-4 w-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Delivery By</p>
                  <p className="text-sm font-semibold truncate">{selectedLead.deliveryAssignedTo?.name || '-'}</p>
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Installation Address</p>
                    <p className="text-sm text-slate-900 dark:text-white">{selectedLead.fullAddress || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Billing Address</p>
                    <p className="text-sm text-slate-900 dark:text-white">{selectedLead.billingAddress || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Pincode</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedLead.billingPincode || '-'}</p>
                  </div>
                </div>
                {selectedLead.expectedDeliveryDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Expected Delivery Date</p>
                      <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">{new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step Content - Only shows relevant step */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* STEP 1: Create User (Pending tab) */}
              {activeTab === 'pending' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Create Customer Account</h3>
                      <p className="text-xs text-slate-500">Enter unique username and password</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={customerFormData.username}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, username: e.target.value })}
                        placeholder="Enter unique username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={customerFormData.password}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                    {!isBDMTeamLeader && (
                      <Button
                        onClick={handleCreateCustomer}
                        disabled={isCreatingCustomer || !customerFormData.username.trim() || !customerFormData.password.trim()}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {isCreatingCustomer ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                        ) : (
                          <><UserPlus className="h-4 w-4 mr-2" />Create Customer Account</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Assign IPs (User Created tab) */}
              {activeTab === 'customer_created' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Network className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Assign IP Addresses</h3>
                      <p className="text-xs text-slate-500">Enter {selectedLead.numberOfIPs || 1} IP address(es)</p>
                    </div>
                  </div>

                  {/* Show Customer ID */}
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 mb-1">Customer ID</p>
                    <p className="font-mono text-lg font-bold text-green-700">{selectedLead.customerUserId}</p>
                  </div>

                  <div className="space-y-3">
                    {ipInputs.map((ip, idx) => (
                      <div key={idx}>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          IP Address {idx + 1} {idx === 0 && <span className="text-red-500">*</span>}
                        </label>
                        <Input
                          value={ip}
                          onChange={(e) => {
                            const newInputs = [...ipInputs];
                            newInputs[idx] = e.target.value;
                            setIpInputs(newInputs);
                          }}
                          placeholder="e.g., 192.168.1.100"
                          className="font-mono"
                        />
                      </div>
                    ))}
                    {!isBDMTeamLeader && (
                      <Button
                        onClick={handleAssignIPs}
                        disabled={isAssigningIPs || ipInputs.every(ip => !ip.trim())}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                      >
                        {isAssigningIPs ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Assigning...</>
                        ) : (
                          <><Network className="h-4 w-4 mr-2" />Assign IP Addresses</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Generate Circuit ID (IP Assigned tab) */}
              {activeTab === 'ip_assigned' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Enter Circuit ID</h3>
                      <p className="text-xs text-slate-500">Assign circuit ID and push to delivery</p>
                    </div>
                  </div>

                  {/* Show Customer ID & IPs */}
                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 mb-1">Customer ID</p>
                      <p className="font-mono text-lg font-bold text-green-700">{selectedLead.customerUserId}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1">Assigned IPs</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedLead.customerIpAddresses?.map((ip, idx) => (
                          <span key={idx} className="font-mono text-sm bg-white px-2 py-1 rounded border border-blue-200">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!isBDMTeamLeader && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Circuit ID *</label>
                        <input
                          type="text"
                          value={manualCircuitId}
                          onChange={(e) => setManualCircuitId(e.target.value)}
                          placeholder="Enter circuit ID (e.g., CKT-001)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <Button
                        onClick={handleGenerateCircuit}
                        disabled={isGeneratingCircuit || !manualCircuitId.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isGeneratingCircuit ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                        ) : (
                          <><Zap className="h-4 w-4 mr-2" />Save Circuit ID</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: View Completed (Configured tab) */}
              {activeTab === 'configured' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Configuration Complete</h3>
                      <p className="text-xs text-slate-500">All steps completed successfully</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 text-center">
                      <p className="text-xs text-green-600 mb-1">Customer ID</p>
                      <p className="font-mono text-xl font-bold text-green-700">{selectedLead.customerUserId}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Username</p>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm font-medium">{selectedLead.customerUsername}</p>
                          <button
                            onClick={() => { navigator.clipboard.writeText(selectedLead.customerUsername); toast.success('Copied!'); }}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            <Copy size={12} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Password</p>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm font-medium">{selectedLead.customerPassword || '••••••'}</p>
                          {selectedLead.customerPassword && (
                            <button
                              onClick={() => { navigator.clipboard.writeText(selectedLead.customerPassword); toast.success('Copied!'); }}
                              className="p-1 hover:bg-slate-200 rounded"
                            >
                              <Copy size={12} className="text-slate-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1">Assigned IPs</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedLead.customerIpAddresses?.map((ip, idx) => (
                          <span key={idx} className="font-mono text-sm bg-white px-2 py-1 rounded border border-blue-200">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 text-center">
                      <p className="text-xs text-emerald-600 mb-1">Circuit ID</p>
                      <p className="font-mono text-2xl font-bold text-emerald-700">{selectedLead.circuitId}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        Completed on {formatDate(selectedLead.nocConfiguredAt)}
                      </p>
                    </div>

                    {/* Delivery Status */}
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-orange-600 mb-1">Delivery Person</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {selectedLead.deliveryAssignedTo?.name || '-'}
                          </p>
                        </div>
                        {selectedLead.nocPushedToDeliveryAt ? (
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pushed
                            </Badge>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(selectedLead.nocPushedToDeliveryAt)}
                            </p>
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex-shrink-0">
              <Button onClick={handleCloseModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* NOC Head: Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assign to NOC User</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NOC User *</label>
                <select
                  value={selectedNocUser}
                  onChange={(e) => setSelectedNocUser(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value="">Select NOC user...</option>
                  {nocUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAssignToNoc} disabled={!selectedNocUser || isAssigning}>
                {isAssigning ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Users size={16} className="mr-1" />}
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
