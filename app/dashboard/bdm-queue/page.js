'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useProductStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Building2,
  User,
  Users,
  Briefcase,
  Mail,
  MapPin,
  Clock,
  Calendar,
  FileText,
  X,
  CheckCircle,
  XCircle,
  CalendarClock,
  Plus,
  Search,
  UserPlus,
  ChevronRight,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { QueuePageSkeleton } from '@/components/QueueSkeleton';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';

export default function BDMQueuePage() {
  const router = useRouter();
  const { user, isBDM: _isBDM, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  // MASTER should behave as admin, not as BDM/TL (to avoid user-scoped views)
  const isBDM = isMaster ? false : _isBDM;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const {
    bdmQueue,
    bdmStats,
    bdmCampaigns,
    fetchBDMQueue,
    updateLeadLocation,
    bdmDisposition,
    addMOM,
    getLeadMOMs,
    isLoading,
    // Feasibility Team
    feasibilityTeamUsers,
    fetchFeasibilityTeamUsers,
    // Team Leader
    bdmUsers,
    fetchBDMUsers,
    reassignLeadToBDM,
    bulkReassignLeadsToBDM,
    transferAllLeads,
  } = useLeadStore();
  const { products, fetchProducts } = useProductStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showMOMDialog, setShowMOMDialog] = useState(false);
  const [leadMOMs, setLeadMOMs] = useState([]);

  // Call state
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);

  // Location state
  const [location, setLocation] = useState('');

  // Disposition state
  const [disposition, setDisposition] = useState('');
  const [notes, setNotes] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Meeting scheduling state
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  // MOM state
  const [momData, setMomData] = useState({
    meetingDate: new Date().toISOString().split('T')[0],
    attendees: '',
    agenda: '',
    discussion: '',
    nextSteps: '',
    followUpDate: ''
  });

  // Reassign state (team leader)
  const [reassignBDMId, setReassignBDMId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [tlTab, setTlTab] = useState('unassigned');

  // Bulk assign state (team leader)
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkBDMId, setBulkBDMId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Transfer all leads state (team leader / admin)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromBdmId, setTransferFromBdmId] = useState('');
  const [transferToBdmId, setTransferToBdmId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferConfirmText, setTransferConfirmText] = useState('');

  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));
  useModal(showMOMDialog, () => setShowMOMDialog(false));
  useModal(showTransferModal, () => !isTransferring && setShowTransferModal(false));

  const canAccess = isBDM || isBDMTeamLeader || isAdmin;

  // Redirect users who cannot access
  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, canAccess, router]);

  useSocketRefresh(fetchBDMQueue, { enabled: canAccess });

  // Fetch data
  useEffect(() => {
    if (canAccess) {
      fetchBDMQueue();
      fetchProducts();
      fetchFeasibilityTeamUsers();
      if (isBDMTeamLeader || isAdmin) {
        fetchBDMUsers();
      }
    }
  }, [canAccess, isBDMTeamLeader, isAdmin, fetchProducts, fetchFeasibilityTeamUsers, fetchBDMUsers]);

  // Fetch when campaign changes
  useEffect(() => {
    if (canAccess) {
      fetchBDMQueue(selectedCampaignId || null);
      setSelectedLead(null);
    }
  }, [selectedCampaignId, canAccess]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (activeCall) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeCall.startTime) / 1000);
        setCallTimer(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectLead = (lead) => {
    if (activeCall) {
      toast.error('Please end the current call first');
      return;
    }
    setSelectedLead(lead);
    setLocation(lead.location || '');
    resetDisposition();
  };

  const resetDisposition = () => {
    setDisposition('');
    setNotes('');
    setDropReason('');
    setCallLaterDate('');
    setCallLaterTime('');
    setMeetingDate('');
    setMeetingTime('');
    setMeetingPlace('');
    setMeetingNotes('');
  };

  const handleStartCall = () => {
    if (!selectedLead) return;

    setActiveCall({
      leadId: selectedLead.id,
      startTime: Date.now()
    });
    setCallTimer(0);
    toast.success('Call started');
  };

  const handleOpenDispositionDialog = () => {
    setShowDispositionDialog(true);
  };

  const handleSaveLocation = async () => {
    if (!selectedLead || !location.trim()) return;

    const result = await updateLeadLocation(selectedLead.id, location);
    if (result.success) {
      toast.success('Location saved');
      setSelectedLead(prev => ({ ...prev, location }));
    } else {
      toast.error(result.error || 'Failed to save location');
    }
  };

  const handleEndCall = async () => {
    if (!activeCall || !disposition) {
      toast.error('Please select a disposition');
      return;
    }

    if (disposition === 'FOLLOW_UP' && (!callLaterDate || !callLaterTime)) {
      toast.error('Please select follow-up date and time');
      return;
    }

    if (disposition === 'MEETING_SCHEDULED') {
      if (!meetingDate || !meetingTime) {
        toast.error('Please select meeting date and time');
        return;
      }
      if (!meetingPlace.trim()) {
        toast.error('Please enter meeting place');
        return;
      }
    }

    if (disposition === 'DROPPED' && !dropReason.trim()) {
      toast.error('Please provide a reason for dropping');
      return;
    }

    setIsSaving(true);

    // NOT_REACHABLE: auto-schedule 1hr follow-up, send as FOLLOW_UP
    const isNotReachable = disposition === 'NOT_REACHABLE';
    const actualDisposition = isNotReachable ? 'FOLLOW_UP' : disposition;

    const callLaterAt = isNotReachable
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : disposition === 'FOLLOW_UP' && callLaterDate && callLaterTime
        ? new Date(`${callLaterDate}T${callLaterTime}`).toISOString()
        : null;

    const meetingDateTime = disposition === 'MEETING_SCHEDULED' && meetingDate && meetingTime
      ? new Date(`${meetingDate}T${meetingTime}`).toISOString()
      : null;

    const result = await bdmDisposition(selectedLead.id, {
      disposition: actualDisposition,
      notes: isNotReachable ? (notes ? `Not Reachable/Ringing. ${notes}` : 'Not Reachable/Ringing') : notes,
      callLaterAt,
      dropReason: disposition === 'DROPPED' ? dropReason : null,
      location: location.trim() || null,
      meetingDate: meetingDateTime,
      meetingPlace: disposition === 'MEETING_SCHEDULED' ? meetingPlace.trim() : null,
      meetingNotes: disposition === 'MEETING_SCHEDULED' ? meetingNotes.trim() : null
    });

    if (result.success) {
      setActiveCall(null);
      setCallTimer(0);
      setShowDispositionDialog(false);
      toast.success(isNotReachable ? 'Marked as not reachable. Follow-up scheduled in 1 hour.' : (result.message || 'Disposition saved'));

      if (isNotReachable) {
        router.push('/dashboard/bdm-follow-ups');
        return;
      }

      // Move to next or clear
      moveToNext();
    } else {
      toast.error(result.error || 'Failed to save disposition');
    }

    setIsSaving(false);
  };

  const moveToNext = () => {
    fetchBDMQueue();
    resetDisposition();
    setLocation('');

    const currentIndex = bdmQueue.findIndex(l => l.id === selectedLead?.id);
    if (currentIndex < bdmQueue.length - 1) {
      setSelectedLead(bdmQueue[currentIndex + 1]);
    } else if (bdmQueue.length > 1) {
      setSelectedLead(bdmQueue[0]);
    } else {
      setSelectedLead(null);
    }
  };

  // MOM functions
  const handleOpenMOM = async () => {
    if (!selectedLead) return;

    const result = await getLeadMOMs(selectedLead.id);
    if (result.success) {
      setLeadMOMs(result.moms);
    }
    setShowMOMDialog(true);
  };

  const handleSaveMOM = async () => {
    if (!momData.discussion.trim()) {
      toast.error('Discussion points are required');
      return;
    }

    const result = await addMOM(selectedLead.id, {
      ...momData,
      meetingDate: momData.meetingDate || new Date().toISOString(),
      followUpDate: momData.followUpDate || null
    });

    if (result.success) {
      toast.success('MOM added successfully');
      setLeadMOMs(prev => [result.mom, ...prev]);
      setMomData({
        meetingDate: new Date().toISOString().split('T')[0],
        attendees: '',
        agenda: '',
        discussion: '',
        nextSteps: '',
        followUpDate: ''
      });
    } else {
      toast.error(result.error || 'Failed to add MOM');
    }
  };

  const dispositionOptions = [
    { value: 'MEETING_SCHEDULED', label: 'Schedule Meeting', icon: Calendar, color: 'emerald' },
    { value: 'FOLLOW_UP', label: 'Follow Up Call', icon: CalendarClock, color: 'blue' },
    { value: 'NOT_REACHABLE', label: 'Not Reachable / Ringing', icon: PhoneOff, color: 'amber' },
    { value: 'DROPPED', label: 'Drop', icon: XCircle, color: 'red' },
  ];

  const filteredLeads = (isBDMTeamLeader && tlTab === 'myLeads'
    ? bdmQueue.filter(l => l.assignedToId === user?.id && l.status !== 'NEW')
    : bdmQueue
  ).filter(lead => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const cd = lead.campaignData;
    return (
      cd?.company?.toLowerCase().includes(term) ||
      cd?.name?.toLowerCase().includes(term) ||
      cd?.firstName?.toLowerCase().includes(term) ||
      cd?.lastName?.toLowerCase().includes(term) ||
      cd?.phone?.includes(term) ||
      cd?.email?.toLowerCase().includes(term) ||
      lead.company?.toLowerCase().includes(term) ||
      lead.name?.toLowerCase().includes(term) ||
      lead.phone?.includes(term)
    );
  });

  // Handle reassign (team leader)
  const handleReassign = async (leadId) => {
    if (!reassignBDMId) {
      toast.error('Please select a BDM');
      return;
    }
    setIsReassigning(true);
    const result = await reassignLeadToBDM(leadId, reassignBDMId);
    if (result.success) {
      toast.success('Lead reassigned successfully');
      setReassignBDMId('');
      fetchBDMQueue(selectedCampaignId || null);
      setSelectedLead(null);
    } else {
      toast.error(result.error || 'Failed to reassign lead');
    }
    setIsReassigning(false);
  };

  // Handle bulk assign (team leader)
  const handleBulkAssign = async () => {
    if (!bulkBDMId) {
      toast.error('Please select a BDM');
      return;
    }
    if (selectedLeadIds.size === 0) {
      toast.error('No leads selected');
      return;
    }
    setIsBulkAssigning(true);
    const result = await bulkReassignLeadsToBDM(Array.from(selectedLeadIds), bulkBDMId);
    if (result.success) {
      toast.success(result.data?.message || `${selectedLeadIds.size} lead(s) assigned`);
      setSelectedLeadIds(new Set());
      setBulkBDMId('');
      fetchBDMQueue(selectedCampaignId || null);
    } else {
      toast.error(result.error || 'Failed to assign leads');
    }
    setIsBulkAssigning(false);
  };

  // Handle transfer all leads
  const handleTransferAll = async () => {
    if (!transferFromBdmId || !transferToBdmId) {
      toast.error('Please select both source and target BDM');
      return;
    }
    if (transferFromBdmId === transferToBdmId) {
      toast.error('Source and target BDM cannot be the same');
      return;
    }
    const fromBdm = bdmUsers.find(b => b.id === transferFromBdmId);
    if (transferConfirmText !== fromBdm?.name) {
      toast.error(`Please type "${fromBdm?.name}" to confirm`);
      return;
    }
    setIsTransferring(true);
    const result = await transferAllLeads(transferFromBdmId, transferToBdmId);
    if (result.success) {
      toast.success(result.data?.message || 'Leads transferred successfully');
      setShowTransferModal(false);
      setTransferFromBdmId('');
      setTransferToBdmId('');
      setTransferConfirmText('');
      fetchBDMQueue(selectedCampaignId || null);
    } else {
      toast.error(result.error || 'Failed to transfer leads');
    }
    setIsTransferring(false);
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleSelectAll = (leads) => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
    }
  };

  if (!canAccess) {
    return null;
  }

  // Split leads for Team Leader view
  // "My Leads" = assigned to TL and being worked on (status changed from NEW via self-assign or disposition)
  const myLeads = bdmQueue.filter(l => l.assignedToId === user?.id && l.status !== 'NEW');
  // "Unassigned" = assigned to TL but still NEW (came from ISR, needs assignment or self-work)
  const unassignedLeads = bdmQueue.filter(l => l.assignedToId === user?.id && l.status === 'NEW');
  // "Team Leads" = assigned to other BDMs
  const assignedLeads = bdmQueue.filter(l => l.assignedToId !== user?.id);

  // Filter for TL tabs
  const filterLeads = (leads) => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => {
      const cd = lead.campaignData;
      return (
        cd?.company?.toLowerCase().includes(term) ||
        cd?.name?.toLowerCase().includes(term) ||
        cd?.firstName?.toLowerCase().includes(term) ||
        cd?.phone?.includes(term) ||
        cd?.email?.toLowerCase().includes(term) ||
        lead.company?.toLowerCase().includes(term) ||
        lead.name?.toLowerCase().includes(term) ||
        lead.phone?.includes(term) ||
        lead.assignedTo?.name?.toLowerCase().includes(term)
      );
    });
  };

  // Transfer All Leads Modal (shared between TL and Admin views)
  const transferModal = (isBDMTeamLeader || isAdmin) && showTransferModal && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ArrowRightLeft size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Transfer All Leads</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Move all leads from one BDM to another</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">From BDM</label>
            <select
              value={transferFromBdmId}
              onChange={(e) => { setTransferFromBdmId(e.target.value); setTransferConfirmText(''); }}
              className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="">Select source BDM...</option>
              {bdmUsers.map((bdm) => (
                <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">To BDM</label>
            <select
              value={transferToBdmId}
              onChange={(e) => setTransferToBdmId(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="">Select target BDM...</option>
              {bdmUsers.filter(b => b.id !== transferFromBdmId).map((bdm) => (
                <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
              ))}
            </select>
          </div>

          {transferFromBdmId && transferToBdmId && transferFromBdmId !== transferToBdmId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    This will transfer ALL leads (every status) and unconverted campaign data from{' '}
                    <span className="font-bold">{bdmUsers.find(b => b.id === transferFromBdmId)?.name}</span> to{' '}
                    <span className="font-bold">{bdmUsers.find(b => b.id === transferToBdmId)?.name}</span>.
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Type <span className="font-mono font-bold">{bdmUsers.find(b => b.id === transferFromBdmId)?.name}</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={transferConfirmText}
                    onChange={(e) => setTransferConfirmText(e.target.value)}
                    placeholder="Type BDM name to confirm..."
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <Button
            onClick={() => {
              setShowTransferModal(false);
              setTransferFromBdmId('');
              setTransferToBdmId('');
              setTransferConfirmText('');
            }}
            variant="outline"
            className="flex-1 border-slate-200 dark:border-slate-700"
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransferAll}
            disabled={
              isTransferring ||
              !transferFromBdmId ||
              !transferToBdmId ||
              transferFromBdmId === transferToBdmId ||
              transferConfirmText !== bdmUsers.find(b => b.id === transferFromBdmId)?.name
            }
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isTransferring ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <ArrowRightLeft size={16} className="mr-2" />
            )}
            {isTransferring ? 'Transferring...' : 'Transfer All'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ============ TEAM LEADER VIEW (Unassigned & Team tabs only) ============
  if (isBDMTeamLeader && tlTab !== 'myLeads') {
    const filteredMyLeads = filterLeads(myLeads);
    const filteredUnassigned = filterLeads(unassignedLeads);
    const filteredAssigned = filterLeads(assignedLeads);

    if (isLoading && bdmQueue.length === 0) {
      return (
        <div className="space-y-6">
          <PageHeader title="Team Dashboard" description="Manage and assign leads to your BDMs" />
          <QueuePageSkeleton statsColumns={4} tableColumns={5} tableRows={6} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader title="Team Dashboard" description="Manage and assign leads to your BDMs">
          <Button
            onClick={() => setShowTransferModal(true)}
            variant="outline"
            className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            <ArrowRightLeft size={16} className="mr-2" />
            Transfer All Leads
          </Button>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <StatCard color="orange" icon={User} label="My Leads" value={myLeads.length} />
          <StatCard color="amber" icon={Clock} label="Unassigned" value={unassignedLeads.length} />
          <StatCard color="emerald" icon={CheckCircle} label="Team Leads" value={assignedLeads.length} />
          <StatCard color="slate" icon={Briefcase} label="Total" value={bdmStats.total} />
          <StatCard color="indigo" icon={Users} label="My BDMs" value={bdmUsers.length} />
        </div>

        {/* Tabs + Search */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-4 sm:px-6">
              <div className="flex">
                <button
                  onClick={() => setTlTab('myLeads')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tlTab === 'myLeads'
                      ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  My Leads
                  {myLeads.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                      {myLeads.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTlTab('unassigned')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tlTab === 'unassigned'
                      ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Unassigned
                  {unassignedLeads.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      {unassignedLeads.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTlTab('assigned')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tlTab === 'assigned'
                      ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Team Leads
                  {assignedLeads.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      {assignedLeads.length}
                    </span>
                  )}
                </button>
              </div>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border rounded-lg text-sm bg-background border-slate-200 dark:border-slate-700 w-56"
                />
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Unassigned Tab */}
          {tlTab === 'unassigned' && (
            <div className="p-0">
              {/* Bulk Action Bar */}
              {selectedLeadIds.size > 0 && (
                <div className="px-4 sm:px-6 py-3 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-900 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <select
                      value={bulkBDMId}
                      onChange={(e) => setBulkBDMId(e.target.value)}
                      className="h-9 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm min-w-[160px]"
                    >
                      <option value="">Select BDM...</option>
                      {bdmUsers.map((bdm) => (
                        <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleBulkAssign}
                      disabled={isBulkAssigning || !bulkBDMId}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-4"
                    >
                      {isBulkAssigning ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />
                      ) : (
                        <UserPlus size={14} className="mr-2" />
                      )}
                      Assign All
                    </Button>
                    <button
                      onClick={() => setSelectedLeadIds(new Set())}
                      className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">All leads assigned</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">No pending leads to assign</p>
                </div>
              ) : (
                <div>
                  {/* Select All Header */}
                  <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.size === filteredUnassigned.length && filteredUnassigned.length > 0}
                      onChange={() => toggleSelectAll(filteredUnassigned)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Select All ({filteredUnassigned.length})
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUnassigned.map((lead) => (
                      <div key={lead.id} className={`px-4 sm:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selectedLeadIds.has(lead.id) ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''
                      }`}>
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                          />
                          {/* Lead info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                                {lead.company || 'No Company'}
                              </p>
                              <Badge className={`border-0 text-[10px] px-1.5 ${
                                lead.status === 'NEW'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              }`}>
                                {lead.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>{lead.name || 'Unknown'}</span>
                              {lead.phone && <span className="font-mono">{lead.phone}</span>}
                              {lead.products?.length > 0 && (
                                <span className="text-orange-600 dark:text-orange-400">
                                  {lead.products.map(p => p.title).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Individual Assign dropdown (hidden when bulk selected) */}
                          {selectedLeadIds.size === 0 && (
                            <div className="flex items-center gap-2 sm:flex-shrink-0">
                              <select
                                value={selectedLead?.id === lead.id ? reassignBDMId : ''}
                                onChange={(e) => {
                                  setSelectedLead(lead);
                                  setReassignBDMId(e.target.value);
                                }}
                                className="h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm min-w-[140px]"
                              >
                                <option value="">Select BDM...</option>
                                {bdmUsers.map((bdm) => (
                                  <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
                                ))}
                              </select>
                              <Button
                                onClick={() => {
                                  if (!selectedLead || selectedLead.id !== lead.id || !reassignBDMId) {
                                    toast.error('Select a BDM first');
                                    return;
                                  }
                                  handleReassign(lead.id);
                                }}
                                disabled={isReassigning || selectedLead?.id !== lead.id || !reassignBDMId}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-3"
                              >
                                {isReassigning && selectedLead?.id === lead.id ? (
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                                ) : (
                                  <UserPlus size={14} />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assigned Tab */}
          {tlTab === 'assigned' && (
            <div className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : filteredAssigned.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No assigned leads</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Assign leads from the Unassigned tab</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                        <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                        <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned To</th>
                        <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAssigned.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 sm:px-6">
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{lead.company || 'No Company'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden mt-0.5">{lead.name}</p>
                          </td>
                          <td className="py-3 px-4 sm:px-6 hidden sm:table-cell">
                            <p className="text-sm text-slate-700 dark:text-slate-300">{lead.name || '-'}</p>
                            {lead.phone && <p className="text-xs text-slate-400 font-mono mt-0.5">{lead.phone}</p>}
                          </td>
                          <td className="py-3 px-4 sm:px-6">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 dark:text-orange-400">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                              {lead.assignedTo?.name || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4 sm:px-6">
                            <Badge className={`border-0 text-[10px] px-1.5 ${
                              lead.status === 'NEW'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : lead.status === 'QUALIFIED'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                : lead.status === 'FOLLOW_UP'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : lead.status === 'MEETING_SCHEDULED'
                                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
                                : lead.status === 'FEASIBLE'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {lead.status?.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </Card>
        {transferModal}
      </div>
    );
  }

  // ============ REGULAR BDM VIEW (also used for TL "My Leads" tab) ============
  if (isLoading && bdmQueue.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isBDMTeamLeader ? 'My Leads' : 'New Lead Assigned'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">
            {isBDMTeamLeader ? 'Work on leads assigned to you' : 'Manage leads assigned to you'}
          </p>
        </div>
        <QueuePageSkeleton statsColumns={8} tableColumns={4} tableRows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TL Tab Switcher - shown when TL is on My Leads tab to allow switching back */}
      {isBDMTeamLeader && (
        <div className="flex gap-2">
          <button
            onClick={() => setTlTab('myLeads')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tlTab === 'myLeads'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            My Leads ({myLeads.length})
          </button>
          <button
            onClick={() => setTlTab('unassigned')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tlTab === 'unassigned'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Unassigned ({unassignedLeads.length})
          </button>
          <button
            onClick={() => setTlTab('assigned')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tlTab === 'assigned'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Team Leads ({assignedLeads.length})
          </button>
        </div>
      )}

      {/* Header with Campaign Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isBDMTeamLeader ? 'My Leads' : 'New Lead Assigned'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">
            {isBDMTeamLeader ? 'Work on leads assigned to you' : 'Manage leads assigned to you'}
          </p>
        </div>

        {/* Campaign Filter + Transfer Button */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              onClick={() => setShowTransferModal(true)}
              variant="outline"
              size="sm"
              className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <ArrowRightLeft size={14} className="mr-1.5" />
              Transfer All
            </Button>
          )}
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Campaign:
          </label>
          <select
            value={selectedCampaignId}
            onChange={(e) => {
              if (activeCall) {
                toast.error('Please end the current call first');
                return;
              }
              setSelectedCampaignId(e.target.value);
            }}
            className="h-10 px-4 pr-10 w-full sm:min-w-[200px] sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent cursor-pointer"
          >
            <option value="">All Campaigns</option>
            {bdmCampaigns.map(campaign => {
              const isSelfCampaign = campaign.name?.includes('[Self]') ||
                                     campaign.name?.includes('[SAM Self]') ||
                                     campaign.name?.includes('[BDM Self]');
              let displayName = campaign.name;
              if (isSelfCampaign && campaign.createdBy?.name) {
                displayName = campaign.name
                  .replace('[Self]', `[${campaign.createdBy.name}]`)
                  .replace('[SAM Self]', `[SAM: ${campaign.createdBy.name}]`)
                  .replace('[BDM Self]', `[BDM: ${campaign.createdBy.name}]`);
              }
              return (
                <option key={campaign.id} value={campaign.id}>
                  {displayName}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bdmStats.total}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pending</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bdmStats.pending}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Meetings</p>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{bdmStats.meetingsDone || 0}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Qualified</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{bdmStats.qualified}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Follow Up</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bdmStats.followUp}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Feasible</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{bdmStats.feasible || 0}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Not Feasible</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{bdmStats.notFeasible || 0}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Dropped</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{bdmStats.dropped}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queue List - Left */}
        <div className="lg:col-span-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Leads Queue <span className="text-orange-600 dark:text-orange-400">({filteredLeads.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search company, name, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="max-h-[300px] sm:max-h-[500px] overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {searchTerm ? 'No leads match your search' : 'No leads in queue'}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                    {searchTerm ? 'Try a different search term.' : 'Great job! All caught up.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`w-full text-left px-4 py-3 transition-all ${
                        selectedLead?.id === lead.id
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-l-[3px] border-l-orange-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                              {lead.company || 'No Company'}
                            </p>
                            {lead.campaign?.code === 'SAM-GENERATED' ? (
                              <span className="bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-[10px] px-1.5 py-0 rounded">
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
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {lead.name || 'Unknown'}
                            {lead.products && lead.products.length > 0 && (
                              <span className="text-orange-600 dark:text-orange-400 ml-2">
                                {lead.products.map(p => p.title).join(', ')}
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge className={`${
                          lead.status === 'NEW'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        } border-0 text-[10px] px-1.5 font-medium shrink-0`}>
                          {lead.status === 'NEW' ? 'new' : 'follow up'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Lead Details - Right */}
        <div className="lg:col-span-8">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {selectedLead ? (
              <>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {selectedLead.company || 'No Company'}
                        </h2>
                        {selectedLead.campaign?.code === 'SAM-GENERATED' ? (
                          <span className="bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 rounded">
                            SAM Generated {selectedLead.dataCreatedBy?.name ? `(${selectedLead.dataCreatedBy.name})` : ''}
                          </span>
                        ) : selectedLead.isCustomerReferral ? (
                          <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs px-2 py-0.5 rounded">
                            Customer Referral
                          </span>
                        ) : (selectedLead.isSelfGenerated || selectedLead.campaign?.name?.startsWith('[Self]')) && (
                          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded">
                            {selectedLead.dataCreatedBy?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {selectedLead.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${
                        selectedLead.status === 'NEW'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      } border-0`}>
                        {selectedLead.status}
                      </Badge>
                      <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0">
                        {selectedLead.type}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Phone size={16} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <span className="font-mono text-sm">{selectedLead.phone}</span>
                      </div>
                      {selectedLead.title && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Briefcase size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="text-sm">{selectedLead.title}</span>
                        </div>
                      )}
                      {selectedLead.industry && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Building2 size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="text-sm">{selectedLead.industry}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {selectedLead.email && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Mail size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="text-sm truncate">{selectedLead.email}</span>
                        </div>
                      )}
                      {selectedLead.city && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <MapPin size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="text-sm">{selectedLead.city}{selectedLead.state ? `, ${selectedLead.state}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call Buttons - BDM, TL, and Admin/MASTER */}
                  {(isBDM || isBDMTeamLeader || isAdmin) && <div className="mt-6">
                    {activeCall && activeCall.leadId === selectedLead.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 px-4 py-4 rounded-xl border border-red-200 dark:border-red-800">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-red-700 dark:text-red-400 font-medium">Call Active</span>
                          <div className="ml-auto flex items-center gap-2">
                            <Clock size={18} className="text-red-600 dark:text-red-400" />
                            <span className="text-2xl font-mono font-bold text-red-700 dark:text-red-400">
                              {formatTimer(callTimer)}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={handleOpenDispositionDialog}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          <PhoneOff size={18} className="mr-2" />
                          End Call
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleStartCall}
                        disabled={!!activeCall}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white py-6 text-base font-medium rounded-xl"
                      >
                        <Phone size={20} className="mr-2" />
                        Start Call
                      </Button>
                    )}
                  </div>}
                </div>

                {/* Script & Info */}
                <div className="p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">BDM Script</h3>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="font-mono text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
                      <p>
                        Hi <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedLead.name || 'Sir/Madam'}</span>, this is <span className="text-orange-600 dark:text-orange-400 font-semibold">{user?.name || 'BDM'}</span>.
                      </p>
                      <p>
                        I'm following up on your interest in our solutions. My colleague mentioned you were interested in:
                      </p>
                      {selectedLead.products && selectedLead.products.length > 0 && (
                        <ul className="list-disc list-inside text-orange-600 dark:text-orange-400">
                          {selectedLead.products.map(p => (
                            <li key={p.id}>{p.title}</li>
                          ))}
                        </ul>
                      )}
                      <p>
                        I'd like to schedule a meeting to discuss how we can help <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedLead.company || 'your organization'}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Previous Requirements/Notes */}
                  {selectedLead.requirements && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                        Important Notes About This Lead
                      </h4>
                      <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                        {selectedLead.requirements}
                      </div>
                    </div>
                  )}

                  {/* ISR Info */}
                  {selectedLead.createdBy && (
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lead generated by: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedLead.createdBy.name}</span>
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">Select a lead from the queue to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Disposition Dialog */}
      {showDispositionDialog && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Call Disposition</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLead?.company || 'Unknown'} - {formatTimer(callTimer)}
                </p>
              </div>
              <button
                onClick={() => setShowDispositionDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Disposition Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Outcome <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {dispositionOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setDisposition(option.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                          disposition === option.value
                            ? `bg-${option.color}-600 text-white border-${option.color}-600`
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Follow Up Date/Time */}
              {disposition === 'FOLLOW_UP' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <Calendar size={18} />
                    Schedule Follow Up
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={callLaterDate}
                        onChange={(e) => setCallLaterDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                        Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={callLaterTime}
                        onChange={(e) => setCallLaterTime(e.target.value)}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Drop Reason */}
              {disposition === 'DROPPED' && (
                <div className="space-y-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <label className="block text-sm font-medium text-red-700 dark:text-red-400">
                    Reason for Dropping <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="">Select reason...</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Budget Constraints">Budget Constraints</option>
                    <option value="Already Using Competitor">Already Using Competitor</option>
                    <option value="Not the Right Contact">Not the Right Contact</option>
                    <option value="Company Closed">Company Closed</option>
                    <option value="Wrong Number">Wrong Number</option>
                    <option value="DND">DND</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Meeting Scheduling - Only for MEETING_SCHEDULED */}
              {disposition === 'MEETING_SCHEDULED' && (
                <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Calendar size={16} />
                    Schedule Physical Meeting
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                        Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                      Meeting Place <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={meetingPlace}
                      onChange={(e) => setMeetingPlace(e.target.value)}
                      placeholder="Enter meeting location/address..."
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                      Meeting Agenda (Optional)
                    </label>
                    <textarea
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      rows={2}
                      placeholder="Topics to discuss in the meeting..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this call..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                onClick={() => setShowDispositionDialog(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEndCall}
                disabled={
                  !disposition ||
                  isSaving ||
                  (disposition === 'FOLLOW_UP' && (!callLaterDate || !callLaterTime)) ||
                  (disposition === 'DROPPED' && !dropReason.trim()) ||
                  (disposition === 'MEETING_SCHEDULED' && (!meetingDate || !meetingTime || !meetingPlace.trim()))
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save & End Call'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MOM Dialog */}
      {showMOMDialog && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Minutes of Meeting</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLead?.company || 'Unknown'}
                </p>
              </div>
              <button
                onClick={() => setShowMOMDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Add New MOM */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-4 flex items-center gap-2">
                  <Plus size={18} />
                  Add New MOM
                </h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                        Meeting Date
                      </label>
                      <input
                        type="date"
                        value={momData.meetingDate}
                        onChange={(e) => setMomData(prev => ({ ...prev, meetingDate: e.target.value }))}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                        Attendees
                      </label>
                      <input
                        type="text"
                        value={momData.attendees}
                        onChange={(e) => setMomData(prev => ({ ...prev, attendees: e.target.value }))}
                        placeholder="Names of attendees..."
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                      Agenda
                    </label>
                    <input
                      type="text"
                      value={momData.agenda}
                      onChange={(e) => setMomData(prev => ({ ...prev, agenda: e.target.value }))}
                      placeholder="Meeting agenda..."
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                      Discussion Points <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={momData.discussion}
                      onChange={(e) => setMomData(prev => ({ ...prev, discussion: e.target.value }))}
                      rows={3}
                      placeholder="Key discussion points..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                      Next Steps / Action Items
                    </label>
                    <textarea
                      value={momData.nextSteps}
                      onChange={(e) => setMomData(prev => ({ ...prev, nextSteps: e.target.value }))}
                      rows={2}
                      placeholder="Action items and next steps..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={momData.followUpDate}
                      onChange={(e) => setMomData(prev => ({ ...prev, followUpDate: e.target.value }))}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>

                  <Button
                    onClick={handleSaveMOM}
                    disabled={!momData.discussion.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    Add MOM
                  </Button>
                </div>
              </div>

              {/* Previous MOMs */}
              {leadMOMs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Previous MOMs</h4>
                  <div className="space-y-3">
                    {leadMOMs.map((mom) => (
                      <div key={mom.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {new Date(mom.meetingDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {mom.attendees && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Attendees: {mom.attendees}
                            </span>
                          )}
                        </div>
                        {mom.agenda && (
                          <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
                            <strong>Agenda:</strong> {mom.agenda}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                          {mom.discussion}
                        </p>
                        {mom.nextSteps && (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                            <strong>Next Steps:</strong> {mom.nextSteps}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => setShowMOMDialog(false)}
                variant="outline"
                className="w-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {transferModal}
    </div>
  );
}
