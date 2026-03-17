'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCampaignStore, useProductStore, useLeadStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Phone, PhoneOff, Building2, User, Briefcase, Mail, MessageSquare, MapPin, Clock, Send, Calendar, UserPlus, Share2, CheckCircle, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';

export default function SAMCallingQueuePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    assignedCampaigns,
    fetchAssignedCampaigns,
    campaignData,
    fetchCampaignData,
    startCall,
    endCall,
    updateDataStatus,
    addRemark
  } = useCampaignStore();
  const { products, fetchProducts } = useProductStore();
  const { fetchTeamLeaders, teamLeaders, convertToLead } = useLeadStore();

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
  const [isSaving, setIsSaving] = useState(false);

  // Interested flow state
  const [showInterestedOptions, setShowInterestedOptions] = useState(false);
  const [selectedParentProduct, setSelectedParentProduct] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [followUpAction, setFollowUpAction] = useState('');
  const [selectedBDM, setSelectedBDM] = useState('');

  // Share tracking
  const [sharedViaWhatsApp, setSharedViaWhatsApp] = useState(false);
  const [sharedViaEmail, setSharedViaEmail] = useState(false);

  // Call Later state
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');

  const isSAM = user?.role === 'SAM';

  // Filter to only SAM Self campaigns
  const samCampaigns = assignedCampaigns.filter(c =>
    c.type === 'SELF' && c.name.startsWith('[SAM Self]')
  );

  // Redirect non-SAM users
  useEffect(() => {
    if (user && !isSAM) {
      router.push('/dashboard');
    }
  }, [user, isSAM, router]);

  // Fetch assigned campaigns and BDM users
  useEffect(() => {
    if (isSAM) {
      fetchAssignedCampaigns();
      fetchProducts();
      fetchTeamLeaders();
    }
  }, [isSAM, fetchAssignedCampaigns, fetchProducts, fetchTeamLeaders]);

  // Set first campaign as default
  useEffect(() => {
    if (samCampaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(samCampaigns[0].id);
    }
  }, [samCampaigns, selectedCampaignId]);

  // Fetch campaign data when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignData();
    }
  }, [selectedCampaignId]);

  const loadCampaignData = async () => {
    setIsLoading(true);
    await fetchCampaignData(selectedCampaignId, 1, 500);
    setIsLoading(false);
  };

  // Process queue data when campaignData changes
  useEffect(() => {
    if (campaignData && campaignData.length > 0) {
      // Filter for pending (NEW status only)
      const pending = campaignData.filter(d => d.status === 'NEW');
      setQueueData(pending);

      // Calculate stats
      const totalAssigned = campaignData.length;
      const called = campaignData.filter(d => d.status !== 'NEW').length;
      const pendingCount = campaignData.filter(d => d.status === 'NEW').length;
      const leadsGenerated = campaignData.filter(d => d.isConverted).length;

      setStats({
        totalAssigned,
        called,
        pending: pendingCount,
        leadsGenerated
      });

      // Select first item if none selected
      if (!selectedData && pending.length > 0) {
        setSelectedData(pending[0]);
      }
    } else {
      setQueueData([]);
      setStats({ totalAssigned: 0, called: 0, pending: 0, leadsGenerated: 0 });
    }
  }, [campaignData]);

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
    setShowInterestedOptions(false);
    setSelectedParentProduct('');
    setSelectedProducts([]);
    setFollowUpAction('');
    setSelectedBDM('');
    setSharedViaWhatsApp(false);
    setSharedViaEmail(false);
    setCallLaterDate('');
    setCallLaterTime('');
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
      // Meeting scheduled requires BDM
      if (followUpAction === 'meeting' && !selectedBDM) {
        toast.error('Please assign a Team Leader for the meeting');
        return;
      }
      // Share Details requires at least one share action
      if (followUpAction === 'share' && !sharedViaWhatsApp && !sharedViaEmail) {
        toast.error('Please share details via WhatsApp or Email first');
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

      if (followUpAction === 'meeting') {
        const tlName = teamLeaders.find(b => b.id === selectedBDM)?.name || 'Not assigned';
        finalNotes = `Products: ${productNames}\nFollow-up: Meeting Scheduled\nAssigned Team Leader: ${tlName}\n${notes}`;
      } else {
        finalNotes = `Products: ${productNames}\nFollow-up: Share Details\nShared via: ${getSharedVia()}\n${notes}`;
      }
    }

    // Build callLaterAt datetime if CALL_LATER is selected
    const callLaterAt = callOutcome === 'CALL_LATER' && callLaterDate && callLaterTime
      ? new Date(`${callLaterDate}T${callLaterTime}`).toISOString()
      : null;

    const result = await endCall(activeCall.callLogId, callOutcome, finalNotes, callLaterAt);

    if (result.success) {
      // Create lead if interested
      if (callOutcome === 'INTERESTED') {
        const leadType = followUpAction === 'meeting' ? 'PUSHED_TO_PRESALES' : 'QUALIFIED';
        const leadResult = await convertToLead({
          campaignDataId: selectedData.id,
          requirements: finalNotes,
          productIds: selectedProducts,
          assignedToId: followUpAction === 'meeting' ? selectedBDM : null,
          type: leadType,
          sharedVia: followUpAction === 'share' ? getSharedVia() : null
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

    const message = encodeURIComponent(
      `Hi ${selectedData.name || 'there'},\n\nThank you for your interest in our products!\n\nProducts of interest: ${productNames}\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`
    );

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

    const subject = encodeURIComponent('Thank you for your interest - Product Information');
    const body = encodeURIComponent(
      `Hi ${selectedData.name || 'there'},\n\nThank you for your interest in our products!\n\nProducts of interest:\n- ${productNames.split(', ').join('\n- ')}\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`
    );

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
    } else if (outcome === 'CALL_LATER') {
      setShowInterestedOptions(false);
      setSelectedParentProduct('');
      setSelectedProducts([]);
      setFollowUpAction('');
      setSelectedBDM('');
      setSharedViaWhatsApp(false);
      setSharedViaEmail(false);
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
    // Reset sharing and BDM when switching
    if (action === 'share') {
      setSelectedBDM('');
    } else {
      setSharedViaWhatsApp(false);
      setSharedViaEmail(false);
    }
  };

  const selectedCampaign = samCampaigns.find(c => c.id === selectedCampaignId);
  const progress = stats.totalAssigned > 0
    ? ((stats.called / stats.totalAssigned) * 100).toFixed(1)
    : 0;

  const statusOptions = [
    { value: 'INTERESTED', label: 'Interested', color: 'emerald' },
    { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
    { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'amber' },
    { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'red' },
    { value: 'CALL_LATER', label: 'Call Later', color: 'blue' },
    { value: 'RINGING_NOT_PICKED', label: 'Ringing Not Picked', color: 'orange' },
  ];

  if (!isSAM) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Campaign Filter */}
      <PageHeader title="SAM Calling Queue" description="Make calls and track dispositions">
        {/* Campaign Filter Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Data Set:
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
            className="h-10 px-4 pr-10 min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent cursor-pointer"
          >
            {samCampaigns.length === 0 ? (
              <option value="">No data sets found</option>
            ) : (
              samCampaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name.replace('[SAM Self] ', '')}
                </option>
              ))
            )}
          </select>
        </div>
      </PageHeader>

      {/* Stats Bar */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Assigned</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalAssigned}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Called</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.called}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pending</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Leads Generated</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.leadsGenerated}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Progress</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{progress}%</p>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queue List - Left */}
        <div className="lg:col-span-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Queue <span className="text-orange-600 dark:text-orange-400">({queueData.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {selectedCampaign?.name?.replace('[SAM Self] ', '') || 'Select a data set'}
              </p>
            </div>

            <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : queueData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Phone className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No pending calls</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Great job! All caught up.</p>
                </div>
              ) : (
                queueData.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectData(item)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedData?.id === item.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {item.company || 'No Company'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                          {item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown'}
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium">
                        new
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
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
                    </div>
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                      new
                    </Badge>
                  </div>

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
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white py-6 text-base font-medium rounded-xl transition-all"
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
                    <div className="font-mono text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
                      <p>
                        Hi, this is <span className="text-orange-600 dark:text-orange-400 font-semibold">{user?.name || 'Agent'}</span> calling from [Company Name]. May I speak with <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedData.name || `${selectedData.firstName || ''} ${selectedData.lastName || ''}`.trim() || 'the concerned person'}</span>?
                      </p>
                      <p>
                        We're reaching out to businesses like <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedData.company || 'yours'}</span> to help them with our connectivity solutions that can improve operations and reduce costs.
                      </p>
                      <p>
                        Would you be interested in learning more about how we can help your business?
                      </p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Call Disposition</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedData?.company || 'Unknown'} - {formatTimer(callTimer)}
                </p>
              </div>
              <button
                onClick={() => setShowDispositionDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Call Outcome */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Call Outcome <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOutcomeChange(option.value)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                        callOutcome === option.value
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interested Options */}
              {showInterestedOptions && (
                <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Interest Details</h4>

                  {/* Products - Hierarchical Selection */}
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      Select Product Category <span className="text-red-500">*</span>
                    </label>
                    {/* Parent Products Selection */}
                    <div className="space-y-2 mb-3">
                      {products.filter(p => p.status === 'ACTIVE' && !p.parentId).length === 0 ? (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 italic">No parent products available</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {products.filter(p => p.status === 'ACTIVE' && !p.parentId).map((parent) => {
                            const hasChildren = parent._count?.children > 0;
                            return (
                              <button
                                key={parent.id}
                                type="button"
                                onClick={() => {
                                  setSelectedParentProduct(parent.id);
                                  // If no children, select the parent product directly
                                  if (!hasChildren) {
                                    setSelectedProducts([parent.id]);
                                  } else {
                                    setSelectedProducts([]);
                                  }
                                }}
                                className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all text-left ${
                                  selectedParentProduct === parent.id
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                                }`}
                              >
                                {parent.title}
                                {hasChildren ? (
                                  <span className={`block text-xs mt-0.5 ${selectedParentProduct === parent.id ? 'text-orange-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {parent._count.children} sub-products
                                  </span>
                                ) : (
                                  <span className={`block text-xs mt-0.5 ${selectedParentProduct === parent.id ? 'text-orange-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                    No sub-products
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sub-Products Selection (shown when parent is selected and has children) */}
                    {selectedParentProduct && (() => {
                      const subProducts = products.filter(p => p.status === 'ACTIVE' && p.parentId === selectedParentProduct);
                      const parentProduct = products.find(p => p.id === selectedParentProduct);
                      const hasNoChildren = subProducts.length === 0;

                      if (hasNoChildren) {
                        // Parent product selected directly (no sub-products)
                        return (
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg border-2 border-emerald-400 dark:border-emerald-600">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                {parentProduct?.title} selected
                              </span>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                              This product has no sub-products and will be added directly.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div>
                          <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                            Select Sub-Products <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                            {subProducts.map((product) => (
                              <label
                                key={product.id}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                  selectedProducts.includes(product.id)
                                    ? 'bg-emerald-100 dark:bg-emerald-800/50 border-2 border-emerald-400 dark:border-emerald-600'
                                    : 'bg-white dark:bg-slate-800 border-2 border-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.includes(product.id)}
                                  onChange={() => handleProductToggle(product.id)}
                                  className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{product.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Follow-up Action */}
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      Follow-up Action <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleFollowUpChange('share')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                          followUpAction === 'share'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                        }`}
                      >
                        <Share2 size={18} />
                        <div className="text-left">
                          <span className="font-medium block">Share Details</span>
                          <span className={`text-xs ${followUpAction === 'share' ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>Send via WhatsApp/Email</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFollowUpChange('meeting')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                          followUpAction === 'meeting'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                        }`}
                      >
                        <Calendar size={18} />
                        <div className="text-left">
                          <span className="font-medium block">Meeting Scheduled</span>
                          <span className={`text-xs ${followUpAction === 'meeting' ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>Assign to Team Leader</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Share Details - WhatsApp/Email buttons */}
                  {followUpAction === 'share' && selectedProducts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                        Share via <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleShareWhatsApp}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            sharedViaWhatsApp
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {sharedViaWhatsApp && <Check size={16} />}
                          <MessageSquare size={18} />
                          <span className="font-medium">WhatsApp</span>
                        </button>
                        <button
                          onClick={handleShareEmail}
                          disabled={!selectedData?.email}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            sharedViaEmail
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {sharedViaEmail && <Check size={16} />}
                          <Mail size={18} />
                          <span className="font-medium">Email</span>
                        </button>
                      </div>
                      {(sharedViaWhatsApp || sharedViaEmail) && (
                        <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Shared via: {[sharedViaWhatsApp && 'WhatsApp', sharedViaEmail && 'Email'].filter(Boolean).join(' & ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meeting Scheduled - Team Leader Assignment */}
                  {followUpAction === 'meeting' && (
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                        Assign to Team Leader <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedBDM}
                        onChange={(e) => setSelectedBDM(e.target.value)}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Select Team Leader (Required)</option>
                        {teamLeaders.map((tl) => (
                          <option key={tl.id} value={tl.id}>
                            {tl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Call Later Options */}
              {callOutcome === 'CALL_LATER' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <Calendar size={18} />
                    Schedule Callback
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

                  {callLaterDate && callLaterTime && (
                    <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <Clock size={12} />
                      Scheduled for: {new Date(`${callLaterDate}T${callLaterTime}`).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes {callOutcome === 'CALL_LATER' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add call notes, requirements, or comments..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Dialog Footer */}
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
                  !callOutcome ||
                  isSaving ||
                  (callOutcome === 'INTERESTED' && !followUpAction) ||
                  (callOutcome === 'INTERESTED' && selectedProducts.length === 0) ||
                  (callOutcome === 'INTERESTED' && followUpAction === 'meeting' && !selectedBDM) ||
                  (callOutcome === 'INTERESTED' && followUpAction === 'share' && !sharedViaWhatsApp && !sharedViaEmail) ||
                  (callOutcome === 'CALL_LATER' && (!callLaterDate || !callLaterTime || !notes.trim()))
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
