'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useCampaignStore, useProductStore, useLeadStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Phone, PhoneOff, Building2, User, Briefcase, Mail, MessageSquare, MapPin, Clock, Send, Calendar, UserPlus, Share2, CheckCircle, Check, X, FileText, ThumbsUp, ThumbsDown, PhoneMissed, AlertTriangle, PhoneForwarded, Ban, Users, BarChart3, Pencil, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';

export default function CallingQueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get('campaignId');
  const { user } = useAuthStore();
  const {
    assignedCampaigns,
    fetchAssignedCampaigns,
    campaignData,
    campaignDataStats,
    fetchCampaignData,
    startCall,
    endCall,
    updateDataStatus,
    addRemark,
    editCampaignData
  } = useCampaignStore();
  const { products, fetchProducts } = useProductStore();
  const { fetchBDMUsers, bdmUsers, fetchTeamLeaders, teamLeaders, convertToLead } = useLeadStore();

  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedData, setSelectedData] = useState(null);
  const [queueData, setQueueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    called: 0,
    pending: 0,
    leadsGenerated: 0
  });

  // Call state
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);

  // Dialog state
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);

  // Disposition state
  const [callOutcome, setCallOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Interested flow state
  const [showInterestedOptions, setShowInterestedOptions] = useState(false);
  const [selectedParentProduct, setSelectedParentProduct] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [followUpAction, setFollowUpAction] = useState('');
  const [selectedBDM, setSelectedBDM] = useState('');

  // Bandwidth
  const [bandwidth, setBandwidth] = useState('');

  // Share tracking
  const [sharedViaWhatsApp, setSharedViaWhatsApp] = useState(false);
  const [sharedViaEmail, setSharedViaEmail] = useState(false);

  // Call Later state
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');

  // Edit contact state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isBDMCP = user?.role === 'BDM_CP';

  // Redirect admin
  useEffect(() => {
    if (isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, router]);

  useSocketRefresh(fetchAssignedCampaigns, { enabled: !isAdmin });

  // Fetch assigned campaigns and BDM users
  useEffect(() => {
    if (!isAdmin) {
      fetchAssignedCampaigns();
      fetchProducts();
      fetchBDMUsers();
      fetchTeamLeaders();
    }
  }, [isAdmin, fetchAssignedCampaigns, fetchProducts, fetchBDMUsers, fetchTeamLeaders]);

  // Set campaign from URL param or first campaign as default
  useEffect(() => {
    if (assignedCampaigns.length > 0) {
      if (campaignIdFromUrl && assignedCampaigns.some(c => c.id === campaignIdFromUrl)) {
        setSelectedCampaignId(campaignIdFromUrl);
      } else if (!selectedCampaignId || !assignedCampaigns.some(c => c.id === selectedCampaignId)) {
        setSelectedCampaignId(assignedCampaigns[0].id);
      }
    }
  }, [assignedCampaigns, campaignIdFromUrl]);

  // Fetch campaign data when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignData();
    }
  }, [selectedCampaignId]);

  const loadCampaignData = async () => {
    setIsLoading(true);
    setSelectedData(null);
    await fetchCampaignData(selectedCampaignId, 1, 50, 'NEW');
    setIsLoading(false);
  };

  // Process queue data when campaignData changes
  useEffect(() => {
    if (campaignData && campaignData.length > 0) {
      // Data is already filtered to NEW by the server
      setQueueData(campaignData);

      // Select first item if none selected, or revalidate current selection
      const currentStillExists = selectedData && campaignData.some(d => d.id === selectedData.id);
      if (!currentStillExists) {
        setSelectedData(campaignData[0]);
      }
    } else {
      setQueueData([]);
      setSelectedData(null);
    }

    // Update stats from server response
    if (campaignDataStats) {
      setStats(campaignDataStats);
    } else {
      setStats({ totalAssigned: 0, called: 0, pending: 0, leadsGenerated: 0 });
    }
  }, [campaignData, campaignDataStats]);

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

  const handleSelectData = (data) => {
    if (activeCall) {
      toast.error('Please end the current call first');
      return;
    }
    setSelectedData(data);
    resetDisposition();
  };

  const resetDisposition = () => {
    setCallOutcome('');
    setNotes('');
    setOtherReason('');
    setShowInterestedOptions(false);
    setSelectedParentProduct('');
    setSelectedProducts([]);
    setFollowUpAction('');
    setSelectedBDM('');
    setSharedViaWhatsApp(false);
    setSharedViaEmail(false);
    setCallLaterDate('');
    setCallLaterTime('');
    setBandwidth('');
  };

  const handleStartCall = async () => {
    if (!selectedData) return;

    const result = await startCall(selectedData.id);
    if (result.success) {
      setActiveCall({
        dataId: selectedData.id,
        callLogId: result.callLog.id,
        phone: result.phone,
        startTime: Date.now()
      });
      setCallTimer(0);
      // Update selected data with revealed phone
      setSelectedData(prev => ({ ...prev, phone: result.phone }));
      toast.success('Call started');
    } else {
      toast.error(result.error || 'Failed to start call');
    }
  };

  const handleOpenDispositionDialog = () => {
    setShowDispositionDialog(true);
  };

  // Get sharedVia value based on what was shared
  const getSharedVia = () => {
    if (sharedViaWhatsApp && sharedViaEmail) return 'whatsapp,email';
    if (sharedViaWhatsApp) return 'whatsapp';
    if (sharedViaEmail) return 'email';
    return null;
  };

  const handleEndCall = async () => {
    if (!activeCall || !callOutcome) {
      toast.error('Please select a call outcome');
      return;
    }

    // Validate for INTERESTED outcome
    if (callOutcome === 'INTERESTED') {
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product');
        return;
      }
      if (!followUpAction) {
        toast.error('Please select a follow-up action');
        return;
      }
      // Both flows require Team Leader / BDM assignment
      if ((followUpAction === 'meeting' || followUpAction === 'share') && !selectedBDM && !isBDMCP) {
        toast.error('Please select a Team Leader');
        return;
      }
      // Share Details requires at least one share action
      if (followUpAction === 'share' && !sharedViaWhatsApp && !sharedViaEmail) {
        toast.error('Please share details via WhatsApp or Email first');
        return;
      }
    }

    // Validate for OTHERS outcome
    if (callOutcome === 'OTHERS') {
      if (!otherReason.trim()) {
        toast.error('Please specify a reason for Others');
        return;
      }
    }

    // Validate for CALL_LATER outcome
    if (callOutcome === 'CALL_LATER') {
      if (!callLaterDate || !callLaterTime) {
        toast.error('Please select date and time for callback');
        return;
      }
      if (!notes.trim()) {
        toast.error('Please add notes for the callback');
        return;
      }
    }

    setIsSaving(true);

    // Build notes with interested details
    let finalNotes = notes;
    if (callOutcome === 'INTERESTED') {
      const productNames = products
        .filter(p => selectedProducts.includes(p.id))
        .map(p => p.title)
        .join(', ');

      const bwText = bandwidth ? `\nBandwidth: ${Number(bandwidth) >= 1000 ? `${(Number(bandwidth) / 1000).toFixed(Number(bandwidth) % 1000 === 0 ? 0 : 1)} Gbps` : `${bandwidth} Mbps`}` : '';
      if (followUpAction === 'meeting') {
        const assigneeName = teamLeaders.find(b => b.id === selectedBDM)?.name || bdmUsers.find(b => b.id === selectedBDM)?.name || 'Not assigned';
        finalNotes = `Products: ${productNames}${bwText}\nFollow-up: Meeting Scheduled\nAssigned to: ${assigneeName}\n${notes}`;
      } else {
        finalNotes = `Products: ${productNames}${bwText}\nFollow-up: Share Details\nShared via: ${getSharedVia()}\n${notes}`;
      }
    }

    // Build callLaterAt datetime if CALL_LATER is selected
    const callLaterAt = callOutcome === 'CALL_LATER' && callLaterDate && callLaterTime
      ? new Date(`${callLaterDate}T${callLaterTime}`).toISOString()
      : null;

    const result = await endCall(activeCall.callLogId, callOutcome, finalNotes, callLaterAt, callOutcome === 'OTHERS' ? otherReason.trim() : null);

    if (result.success) {
      // Create lead if interested
      if (callOutcome === 'INTERESTED') {
        const leadType = followUpAction === 'meeting' ? 'PUSHED_TO_PRESALES' : 'QUALIFIED';
        // Use bound BDM if present, otherwise use selected TL from dropdown (for both meeting and share flows)
        const effectiveBDM = isBDMCP ? user.id : (selectedData?.assignedByBdm?.id || selectedBDM || null);
        const leadResult = await convertToLead({
          campaignDataId: selectedData.id,
          requirements: finalNotes,
          productIds: selectedProducts,
          assignedToId: effectiveBDM,
          type: leadType,
          sharedVia: followUpAction === 'share' ? getSharedVia() : null,
          bandwidthRequirement: bandwidth ? `${bandwidth} Mbps` : null
        });

        if (leadResult.success) {
          toast.success(`Lead created as "${leadType === 'PUSHED_TO_PRESALES' ? 'Pushed to Presales' : 'Qualified'}"`);
        } else {
          toast.error(leadResult.error || 'Failed to create lead');
        }
      }

      setActiveCall(null);
      setCallTimer(0);
      setShowDispositionDialog(false);
      toast.success('Call saved successfully');

      // Move to next in queue
      moveToNext();
    } else {
      toast.error(result.error || 'Failed to save call');
    }

    setIsSaving(false);
  };

  const handleShareWhatsApp = () => {
    const phone = selectedData.phone.replace(/\D/g, '');
    const productNames = products
      .filter(p => selectedProducts.includes(p.id))
      .map(p => p.title)
      .join(', ');

    const message = productNames
      ? encodeURIComponent(
          `Hi ${selectedData.name || 'there'},\n\nThank you for your interest in our products!\n\nProducts of interest: ${productNames}\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`)
      : encodeURIComponent(
          `Hi ${selectedData.name || 'there'},\n\nThank you for your time on the call. We would love to discuss how our solutions can help your business.\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`);

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setSharedViaWhatsApp(true);
    toast.success('WhatsApp opened');
  };

  const handleShareEmail = () => {
    const email = selectedData.email;
    if (!email) {
      toast.error('No email address available');
      return;
    }

    const productNames = products
      .filter(p => selectedProducts.includes(p.id))
      .map(p => p.title)
      .join(', ');

    const subject = encodeURIComponent(productNames ? 'Thank you for your interest - Product Information' : 'Thank you for your time - Follow up');
    const body = productNames
      ? encodeURIComponent(
          `Hi ${selectedData.name || 'there'},\n\nThank you for your interest in our products!\n\nProducts of interest:\n- ${productNames.split(', ').join('\n- ')}\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`)
      : encodeURIComponent(
          `Hi ${selectedData.name || 'there'},\n\nThank you for your time on the call. We would love to discuss how our solutions can help your business.\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`);

    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    setSharedViaEmail(true);
    toast.success('Email client opened');
  };

  const moveToNext = () => {
    // Refresh data
    loadCampaignData();

    // Reset state
    resetDisposition();

    // Find next item
    const currentIndex = queueData.findIndex(d => d.id === selectedData?.id);
    if (currentIndex < queueData.length - 1) {
      setSelectedData(queueData[currentIndex + 1]);
    } else if (queueData.length > 1) {
      setSelectedData(queueData[0]);
    } else {
      setSelectedData(null);
    }
  };

  const handleOutcomeChange = (outcome) => {
    setCallOutcome(outcome);
    if (outcome === 'INTERESTED') {
      setShowInterestedOptions(true);
      setCallLaterDate('');
      setCallLaterTime('');
      setOtherReason('');
    } else if (outcome === 'CALL_LATER') {
      setShowInterestedOptions(false);
      setSelectedParentProduct('');
      setSelectedProducts([]);
      setFollowUpAction('');
      setSelectedBDM('');
      setSharedViaWhatsApp(false);
      setSharedViaEmail(false);
      setOtherReason('');
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCallLaterDate(tomorrow.toISOString().split('T')[0]);
      setCallLaterTime('10:00');
    } else {
      setShowInterestedOptions(false);
      setSelectedParentProduct('');
      setSelectedProducts([]);
      setFollowUpAction('');
      setSelectedBDM('');
      setSharedViaWhatsApp(false);
      setSharedViaEmail(false);
      setCallLaterDate('');
      setCallLaterTime('');
      if (outcome !== 'OTHERS') setOtherReason('');
    }
  };

  const handleProductToggle = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleFollowUpChange = (action) => {
    setFollowUpAction(action);
    // Reset sharing when switching to meeting
    if (action === 'meeting') {
      setSharedViaWhatsApp(false);
      setSharedViaEmail(false);
    }
    // Auto-set BDM if data has BDM binding (for both meeting and share)
    if (selectedData?.assignedByBdm?.id) {
      setSelectedBDM(selectedData.assignedByBdm.id);
    }
  };

  const handleStartEdit = () => {
    if (!selectedData) return;
    setEditForm({
      name: selectedData.name || '',
      company: selectedData.company || '',
      phone: selectedData.phone || '',
      email: selectedData.email || '',
      title: selectedData.title || '',
      city: selectedData.city || '',
      industry: selectedData.industry || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!selectedData) return;
    setIsSavingEdit(true);
    const result = await editCampaignData(selectedData.id, editForm);
    if (result.success) {
      toast.success('Contact updated');
      setSelectedData(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setIsSavingEdit(false);
  };

  const selectedCampaign = assignedCampaigns.find(c => c.id === selectedCampaignId);
  const conversionRate = stats.called > 0
    ? ((stats.leadsGenerated / stats.called) * 100).toFixed(1)
    : 0;

  const statusOptions = [
    { value: 'INTERESTED', label: 'Interested', color: 'emerald' },
    { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
    { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'amber' },
    { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'red' },
    { value: 'CALL_LATER', label: 'Call Later', color: 'blue' },
    { value: 'RINGING_NOT_PICKED', label: 'Ringing Not Picked', color: 'orange' },
  ];

  if (isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Campaign Filter */}
      <PageHeader title="Self Calling Queue" description="Make calls and track dispositions">
        {/* Campaign Filter Dropdown */}
        <div className="flex items-center gap-3">
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
              setSelectedData(null);
            }}
            className="h-10 px-4 pr-10 w-full sm:min-w-[200px] sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent cursor-pointer"
          >
            {assignedCampaigns.length === 0 ? (
              <option value="">No campaigns assigned</option>
            ) : (
              assignedCampaigns.map(campaign => {
                let displayName = campaign.name;
                if (campaign.createdBy?.name && campaign.createdBy.id !== user?.id) {
                  displayName = displayName.replace(/^\[(Self|BDM Self|TL Self|SAM Self)\]\s*/, `[${campaign.createdBy.name}] `);
                }
                return (
                  <option key={campaign.id} value={campaign.id}>
                    {displayName}
                  </option>
                );
              })
            )}
          </select>
        </div>
      </PageHeader>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard color="blue" icon={Users} label="Total Assigned" value={stats.totalAssigned} />
        <StatCard color="emerald" icon={CheckCircle} label="Called" value={stats.called} />
        <StatCard color="amber" icon={Clock} label="Pending" value={stats.pending} />
        <StatCard color="emerald" icon={UserPlus} label="Leads Generated" value={stats.leadsGenerated} />
        <StatCard color="teal" icon={BarChart3} label="Lead Conversion Rate" value={`${conversionRate}%`} />
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queue List - Left */}
        <div className="lg:col-span-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Queue</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedCampaign ? (selectedCampaign.createdBy?.name && selectedCampaign.createdBy.id !== user?.id
                      ? selectedCampaign.name.replace(/^\[(Self|BDM Self|TL Self|SAM Self)\]\s*/, `[${selectedCampaign.createdBy.name}] `)
                      : selectedCampaign.name) : 'Select a campaign'}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {queueData.length} pending
                </Badge>
              </div>
            </div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : queueData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Phone className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">No pending calls</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {queueData.map((data) => (
                    <button
                      key={data.id}
                      onClick={() => handleSelectData(data)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        selectedData?.id === data.id
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-600'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {data.company || 'No Company'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown'}
                          </p>
                          {data.lastEditedBy && (
                            <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5 truncate">
                              Edited by {data.lastEditedBy.name}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium shrink-0">
                          new
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Details - Right */}
        <div className="lg:col-span-8">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {selectedData ? (
              <>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedData.company || 'No Company'}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {selectedData.name || `${selectedData.firstName || ''} ${selectedData.lastName || ''}`.trim() || 'Unknown'}
                      </p>
                      {selectedData.lastEditedBy && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1">
                          <Pencil size={12} />
                          Edited by {selectedData.lastEditedBy.name} ({selectedData.lastEditedBy.role?.replace(/_/g, ' ')})
                          {selectedData.lastEditedAt && (
                            <span className="text-slate-400 dark:text-slate-500 ml-1">
                              &middot; {new Date(selectedData.lastEditedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={handleStartEdit}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                          title="Edit Contact"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                        new
                      </Badge>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'company', label: 'Company', icon: Building2 },
                          { key: 'name', label: 'Name', icon: User },
                          { key: 'phone', label: 'Phone', icon: Phone },
                          { key: 'email', label: 'Email', icon: Mail },
                          { key: 'title', label: 'Designation', icon: Briefcase },
                          { key: 'city', label: 'City', icon: MapPin },
                          { key: 'industry', label: 'Industry', icon: Building2 },
                        ].map(({ key, label, icon: Icon }) => (
                          <div key={key}>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{label}</label>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Icon size={14} className="text-slate-500 dark:text-slate-400" />
                              </div>
                              <input
                                type="text"
                                value={editForm[key] || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                                className="flex-1 h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isSavingEdit}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-orange-600 hover:bg-orange-700 text-white">
                          {isSavingEdit ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Phone size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="font-mono text-sm">{selectedData.phone}</span>
                        </div>
                        {selectedData.title && (
                          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Briefcase size={16} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-sm">{selectedData.title}</span>
                          </div>
                        )}
                        {selectedData.industry && (
                          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Building2 size={16} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-sm">{selectedData.industry}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selectedData.email && (
                          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Mail size={16} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-sm truncate">{selectedData.email}</span>
                          </div>
                        )}
                        {selectedData.city && (
                          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <MapPin size={16} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-sm">{selectedData.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Call Buttons */}
                  <div className="mt-6">
                    {activeCall && activeCall.dataId === selectedData.id ? (
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
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base font-medium rounded-xl transition-all"
                        >
                          <PhoneOff size={20} className="mr-2" />
                          End Call
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleStartCall}
                        disabled={!!activeCall}
                        className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white py-6 text-base font-medium rounded-xl transition-all"
                      >
                        <Phone size={20} className="mr-2" />
                        Start Call
                      </Button>
                    )}
                  </div>
                </div>

                {/* Calling Script */}
                <div className="p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Calling Script</h3>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
                      <p>
                        Hello Sir/Madam, this is <span className="text-orange-600 dark:text-orange-400 font-semibold">{user?.name || 'Agent'}</span> calling from <span className="font-semibold">Gazon Communications India Ltd</span>.
                      </p>
                      <p>
                        We are a <span className="font-semibold">Class-A Internet Service Provider</span>, and we provide <span className="font-semibold">Dedicated Internet Leased Line</span> connectivity and <span className="font-semibold">Managed IT Services</span> for organizations.
                      </p>
                      <p>
                        We help businesses like <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedData.company || 'yours'}</span> get stable internet connectivity with guaranteed uptime and enterprise-grade support.
                      </p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        May I ask a couple of quick questions regarding your current internet connection?
                      </p>

                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Discovery Questions</p>
                        <p>• Which internet provider are you currently using?</p>
                        <p>• What bandwidth are you using at the moment?</p>
                        <p>• Is it broadband or a dedicated leased line?</p>
                        <p>• Do you face any downtime or slow speed issues?</p>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Managed IT Services Pitch</p>
                        <p>Apart from connectivity, we also provide <span className="font-semibold">Managed IT Services</span>, where we take care of:</p>
                        <p>• Firewall & network security</p>
                        <p>• Backup and disaster recovery</p>
                        <p>• Cloud infrastructure (AWS / Azure)</p>
                        <p>• Network monitoring and IT support</p>
                      </div>

                      <p className="text-slate-800 dark:text-slate-200">
                        If you are open to it, we can share a proposal or arrange a quick meeting to understand your requirements and suggest the best bandwidth and IT solution for <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedData.company || 'your organization'}</span>.
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 italic">Thank you for your time.</p>
                    </div>
                  </div>

                  {/* Previous Notes */}
                  {selectedData.notes && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                        Previous Call Notes
                      </h4>
                      <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                        {selectedData.notes}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">Select a contact from the queue to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Disposition Dialog */}
      {showDispositionDialog && (
        <div data-modal className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
            {/* Dialog Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2 size={16} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {selectedData?.company || 'Unknown'}
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{selectedData?.name || ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-mono font-semibold tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {formatTimer(callTimer)}
                  </span>
                  <button
                    onClick={() => setShowDispositionDialog(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Dialog Content */}
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Call Outcome */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Call Outcome
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 'INTERESTED', label: 'Interested', icon: ThumbsUp, activeColor: 'bg-emerald-500 border-emerald-500 text-white shadow-sm' },
                    { value: 'NOT_INTERESTED', label: 'Not Interested', icon: ThumbsDown, activeColor: 'bg-red-500 border-red-500 text-white shadow-sm' },
                    { value: 'CALL_LATER', label: 'Call Later', icon: PhoneForwarded, activeColor: 'bg-blue-500 border-blue-500 text-white shadow-sm' },
                    { value: 'NOT_REACHABLE', label: 'No Answer', icon: PhoneMissed, activeColor: 'bg-amber-500 border-amber-500 text-white shadow-sm' },
                    { value: 'WRONG_NUMBER', label: 'Wrong No.', icon: Ban, activeColor: 'bg-rose-500 border-rose-500 text-white shadow-sm' },
                    { value: 'RINGING_NOT_PICKED', label: 'Ringing', icon: AlertTriangle, activeColor: 'bg-orange-500 border-orange-500 text-white shadow-sm' },
                    { value: 'OTHERS', label: 'Others', icon: HelpCircle, activeColor: 'bg-violet-500 border-violet-500 text-white shadow-sm' },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = callOutcome === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleOutcomeChange(option.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                          isSelected
                            ? option.activeColor
                            : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <Icon size={14} strokeWidth={isSelected ? 2.5 : 1.5} />
                        <span className="text-xs font-medium truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Others Reason */}
              {callOutcome === 'OTHERS' && (
                <div>
                  <label className="block text-[11px] font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wider mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Please specify the reason..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              )}

              {/* Interested Options */}
              {showInterestedOptions && (
                <div className="space-y-3">
                  {/* Product Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Product
                    </label>
                    {products.filter(p => p.status === 'ACTIVE' && !p.parentId).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No products available</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {products.filter(p => p.status === 'ACTIVE' && !p.parentId).map((parent) => {
                          const hasChildren = parent._count?.children > 0;
                          const isSelected = selectedParentProduct === parent.id;
                          return (
                            <button
                              key={parent.id}
                              type="button"
                              onClick={() => {
                                setSelectedParentProduct(parent.id);
                                if (!hasChildren) {
                                  setSelectedProducts([parent.id]);
                                } else {
                                  setSelectedProducts([]);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                              {parent.title}
                              {hasChildren && (
                                <span className={`text-[10px] px-1 py-0.5 rounded ${isSelected ? 'bg-emerald-500 text-emerald-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                  {parent._count.children}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Sub-Products */}
                    {selectedParentProduct && (() => {
                      const subProducts = products.filter(p => p.status === 'ACTIVE' && p.parentId === selectedParentProduct);
                      const parentProduct = products.find(p => p.id === selectedParentProduct);

                      if (subProducts.length === 0) {
                        return (
                          <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={12} />
                            <span className="text-[11px] font-medium">{parentProduct?.title} selected</span>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {subProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleProductToggle(product.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                                selectedProducts.includes(product.id)
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              {selectedProducts.includes(product.id) && <Check size={10} strokeWidth={3} />}
                              {product.title}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bandwidth */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Bandwidth Requirement
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={bandwidth}
                        onChange={(e) => setBandwidth(e.target.value)}
                        placeholder="e.g. 200"
                        min="1"
                        className="flex-1 h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap min-w-[60px]">
                        {bandwidth && Number(bandwidth) >= 1000
                          ? `${(Number(bandwidth) / 1000).toFixed(Number(bandwidth) % 1000 === 0 ? 0 : 1)} Gbps`
                          : 'Mbps'}
                      </span>
                    </div>
                    {bandwidth && (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        {Number(bandwidth) >= 1000
                          ? `${(Number(bandwidth) / 1000).toFixed(Number(bandwidth) % 1000 === 0 ? 0 : 1)} Gbps (${bandwidth} Mbps)`
                          : `${bandwidth} Mbps`}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Follow-up Action */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Next Step
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleFollowUpChange('share')}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                          followUpAction === 'share'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                        }`}
                      >
                        <Share2 size={15} />
                        <div className="text-left">
                          <span className="text-xs font-semibold block leading-tight">Share</span>
                          <span className={`text-[10px] ${followUpAction === 'share' ? 'text-orange-200' : 'text-slate-400'}`}>WhatsApp / Email</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFollowUpChange('meeting')}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                          followUpAction === 'meeting'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                        }`}
                      >
                        <Calendar size={15} />
                        <div className="text-left">
                          <span className="text-xs font-semibold block leading-tight">Meeting</span>
                          <span className={`text-[10px] ${followUpAction === 'meeting' ? 'text-orange-200' : 'text-slate-400'}`}>Assign to BDM</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Share Details - WhatsApp/Email */}
                  {followUpAction === 'share' && selectedProducts.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleShareWhatsApp}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          sharedViaWhatsApp
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-slate-800 text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30'
                        }`}
                      >
                        {sharedViaWhatsApp ? <Check size={13} /> : <MessageSquare size={13} />}
                        WhatsApp
                      </button>
                      <button
                        onClick={handleShareEmail}
                        disabled={!selectedData?.email}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          sharedViaEmail
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {sharedViaEmail ? <Check size={13} /> : <Mail size={13} />}
                        Email
                      </button>
                    </div>
                  )}

                  {/* Team Leader / BDM Assignment (for both Meeting and Share flows) — hidden for BDM_CP (auto-assigned) */}
                  {(followUpAction === 'meeting' || followUpAction === 'share') && !isBDMCP && (
                    selectedData?.assignedByBdm?.id ? (
                      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-800/50 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-800/40 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 block">{selectedData.assignedByBdm.name}</span>
                          <span className="text-[10px] text-orange-500 dark:text-orange-400">Auto-assigned BDM</span>
                        </div>
                        <svg className="w-4 h-4 text-orange-400 dark:text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ) : (
                      <select
                        value={selectedBDM}
                        onChange={(e) => setSelectedBDM(e.target.value)}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Team Leader...</option>
                        {teamLeaders.map((tl) => (
                          <option key={tl.id} value={tl.id}>{tl.name}</option>
                        ))}
                      </select>
                    )
                  )}
                  {/* BDM_CP auto-assignment indicator */}
                  {(followUpAction === 'meeting' || followUpAction === 'share') && isBDMCP && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-purple-50 dark:bg-purple-900/15 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-800/40 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-purple-800 dark:text-purple-300 block">{user?.name}</span>
                        <span className="text-[10px] text-purple-500 dark:text-purple-400">Auto-assigned to you (CP BDM)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Call Later Options */}
              {callOutcome === 'CALL_LATER' && (
                <div className="space-y-2.5 p-3.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                  <label className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Schedule Callback
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={callLaterDate}
                        onChange={(e) => setCallLaterDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={callLaterTime}
                        onChange={(e) => setCallLaterTime(e.target.value)}
                        className="w-full h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {callLaterDate && callLaterTime && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5 bg-blue-100/50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-md">
                      <Clock size={11} />
                      {new Date(`${callLaterDate}T${callLaterTime}`).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Share Details for Call Later (optional) */}
              {callOutcome === 'CALL_LATER' && (
                <div className="space-y-2.5 p-3.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-200/60 dark:border-slate-700/40">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Share Details <span className="text-[10px] font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleShareWhatsApp}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        sharedViaWhatsApp
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white dark:bg-slate-800 text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30'
                      }`}
                    >
                      {sharedViaWhatsApp ? <Check size={13} /> : <MessageSquare size={13} />}
                      WhatsApp
                    </button>
                    <button
                      onClick={handleShareEmail}
                      disabled={!selectedData?.email}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        sharedViaEmail
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {sharedViaEmail ? <Check size={13} /> : <Mail size={13} />}
                      Email
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Notes {callOutcome === 'CALL_LATER' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add call notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex gap-2.5">
              <Button
                onClick={() => setShowDispositionDialog(false)}
                variant="outline"
                className="flex-1 h-10 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEndCall}
                disabled={
                  !callOutcome ||
                  isSaving ||
                  (callOutcome === 'INTERESTED' && !followUpAction) ||
                  (callOutcome === 'INTERESTED' && selectedProducts.length === 0) ||
                  (callOutcome === 'INTERESTED' && (followUpAction === 'meeting' || followUpAction === 'share') && !selectedBDM && !isBDMCP) ||
                  (callOutcome === 'INTERESTED' && followUpAction === 'share' && !sharedViaWhatsApp && !sharedViaEmail) ||
                  (callOutcome === 'CALL_LATER' && (!callLaterDate || !callLaterTime || !notes.trim()))
                }
                className="flex-[1.5] h-10 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PhoneOff size={14} />
                    Save & End Call
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
