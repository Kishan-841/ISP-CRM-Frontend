'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCampaignStore, useProductStore, useLeadStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/StatCard';
import TabBar from '@/components/TabBar';
import DataTable from '@/components/DataTable';
import {
  Phone,
  PhoneOff,
  PhoneMissed,
  PhoneForwarded,
  Building2,
  User,
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Calendar,
  Share2,
  CheckCircle,
  Check,
  AlertCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Ban,
  X,
  FileText,
  RefreshCw,
  RotateCcw,
  History,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';

export default function RetryCallsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    fetchUnansweredCalls,
    unansweredCalls,
    unansweredCallsStats,
    startCall,
    endCall
  } = useCampaignStore();
  const { products, fetchProducts } = useProductStore();
  const { fetchBDMUsers, bdmUsers, fetchTeamLeaders, teamLeaders, convertToLead } = useLeadStore();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedData, setSelectedData] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);

  // Call state
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);

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

  // Share tracking
  const [sharedViaWhatsApp, setSharedViaWhatsApp] = useState(false);
  const [sharedViaEmail, setSharedViaEmail] = useState(false);

  // Call Later state
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');

  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));

  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Redirect admin
  useEffect(() => {
    if (isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, router]);

  // Fetch data
  useEffect(() => {
    if (!isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUnansweredCalls(),
      fetchProducts(),
      fetchBDMUsers(),
      fetchTeamLeaders()
    ]);
    setIsLoading(false);
  };

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  // Filter data based on active tab
  const filteredData = unansweredCalls;

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
  };

  const handleRetryCall = (data) => {
    setSelectedData(data);
    setShowCallModal(true);
    resetDisposition();
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
      setSelectedData(prev => ({ ...prev, phone: result.phone }));
      toast.success('Call started');
    } else {
      toast.error(result.error || 'Failed to start call');
    }
  };

  const handleOpenDispositionDialog = () => {
    setShowDispositionDialog(true);
  };

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

    // Validations
    if (callOutcome === 'INTERESTED') {
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product');
        return;
      }
      if (!followUpAction) {
        toast.error('Please select a follow-up action');
        return;
      }
      if (followUpAction === 'meeting' && !selectedBDM) {
        toast.error('Please assign a BDM for the meeting');
        return;
      }
      if (followUpAction === 'share' && !sharedViaWhatsApp && !sharedViaEmail) {
        toast.error('Please share details via WhatsApp or Email first');
        return;
      }
    }

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

    if (callOutcome === 'OTHERS' && !otherReason.trim()) {
      toast.error('Please specify a reason for Others');
      return;
    }

    setIsSaving(true);

    let finalNotes = notes;
    if (callOutcome === 'INTERESTED') {
      const productNames = products
        .filter(p => selectedProducts.includes(p.id))
        .map(p => p.title)
        .join(', ');

      if (followUpAction === 'meeting') {
        const bdmName = bdmUsers.find(b => b.id === selectedBDM)?.name || 'Not assigned';
        finalNotes = `Products: ${productNames}\nFollow-up: Meeting Scheduled\nAssigned BDM: ${bdmName}\n${notes}`;
      } else {
        finalNotes = `Products: ${productNames}\nFollow-up: Share Details\nShared via: ${getSharedVia()}\n${notes}`;
      }
    }

    const callLaterAt = callOutcome === 'CALL_LATER' && callLaterDate && callLaterTime
      ? new Date(`${callLaterDate}T${callLaterTime}`).toISOString()
      : null;

    const result = await endCall(activeCall.callLogId, callOutcome, finalNotes, callLaterAt, callOutcome === 'OTHERS' ? otherReason.trim() : null);

    if (result.success) {
      if (callOutcome === 'INTERESTED') {
        const leadType = followUpAction === 'meeting' ? 'PUSHED_TO_PRESALES' : 'QUALIFIED';
        const leadResult = await convertToLead({
          campaignDataId: selectedData.id,
          requirements: finalNotes,
          productIds: selectedProducts,
          assignedToId: selectedData?.assignedByBdm?.id || selectedBDM || null,
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
      setShowCallModal(false);
      setSelectedData(null);
      toast.success('Call saved successfully');
      loadData();
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
    if (action === 'share') {
      setSelectedBDM('');
    } else {
      setSharedViaWhatsApp(false);
      setSharedViaEmail(false);
    }
  };

  const statusOptions = [
    { value: 'INTERESTED', label: 'Interested', icon: ThumbsUp, activeColor: 'bg-emerald-500 border-emerald-500 text-white shadow-sm' },
    { value: 'NOT_INTERESTED', label: 'Not Interested', icon: ThumbsDown, activeColor: 'bg-red-500 border-red-500 text-white shadow-sm' },
    { value: 'CALL_LATER', label: 'Call Later', icon: PhoneForwarded, activeColor: 'bg-blue-500 border-blue-500 text-white shadow-sm' },
    { value: 'NOT_REACHABLE', label: 'No Answer', icon: PhoneMissed, activeColor: 'bg-amber-500 border-amber-500 text-white shadow-sm' },
    { value: 'WRONG_NUMBER', label: 'Wrong No.', icon: Ban, activeColor: 'bg-rose-500 border-rose-500 text-white shadow-sm' },
    { value: 'RINGING_NOT_PICKED', label: 'Ringing', icon: AlertTriangle, activeColor: 'bg-orange-500 border-orange-500 text-white shadow-sm' },
    { value: 'OTHERS', label: 'Others', icon: HelpCircle, activeColor: 'bg-violet-500 border-violet-500 text-white shadow-sm' },
  ];

  const getAttemptBadgeColor = (count) => {
    if (count >= 5) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    if (count >= 3) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
  };

  if (isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Retry Queue" description="Unanswered & unreachable calls waiting for retry">
        <Button
          onClick={loadData}
          variant="outline"
          className="border-slate-200 dark:border-slate-700"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard color="red" icon={PhoneMissed} label="Total Pending" value={unansweredCallsStats.total} />
      </div>

      {/* Info Banner */}
      {unansweredCallsStats.total > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-300">
                {unansweredCallsStats.total} contact{unansweredCallsStats.total > 1 ? 's' : ''} need{unansweredCallsStats.total === 1 ? 's' : ''} a retry
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
                Includes calls that rang but weren't picked up and contacts that were not reachable. Try calling at different times for better reach.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        title="Retry Queue"
        totalCount={filteredData.length}
        columns={[
          {
            key: 'contact',
            label: 'Contact',
            render: (row) => {
              const displayName = row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown';
              return (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{displayName}</p>
                    {row.title && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.title}</p>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'company',
            label: 'Company',
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{row.company || '-'}</p>
                {row.city && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} />
                    {row.city}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'campaign',
            label: 'Campaign',
            render: (row) => (
              <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0 text-xs">
                {row.campaign?.name || '-'}
              </Badge>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <Badge className={`border-0 text-xs ${
                row.status === 'RINGING_NOT_PICKED'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}>
                {row.status === 'RINGING_NOT_PICKED' ? 'Ringing' : 'Not Reachable'}
              </Badge>
            ),
          },
          {
            key: 'attemptCount',
            label: 'Attempts',
            render: (row) => (
              <Badge className={`${getAttemptBadgeColor(row.attemptCount)} border-0 text-xs font-semibold`}>
                {row.attemptCount} {row.attemptCount === 1 ? 'try' : 'tries'}
              </Badge>
            ),
          },
          {
            key: 'lastAttempt',
            label: 'Last Attempt',
            render: (row) => (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Clock size={14} />
                <span className="text-sm">{formatRelativeTime(row.lastAttempt)}</span>
              </div>
            ),
          },
        ]}
        data={filteredData}
        pagination={true}
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage="No pending retry calls in this category"
        emptyIcon={PhoneOff}
        actions={(row) => (
          <Button
            onClick={() => handleRetryCall(row)}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <RotateCcw size={14} className="mr-1.5" />
            Retry
          </Button>
        )}
      />

      {/* Call Modal */}
      {showCallModal && selectedData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Retry Call</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Attempt #{selectedData.attemptCount + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (activeCall) {
                    toast.error('Please end the call first');
                    return;
                  }
                  setShowCallModal(false);
                  setSelectedData(null);
                  resetDisposition();
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedData.name || `${selectedData.firstName || ''} ${selectedData.lastName || ''}`.trim() || 'Unknown'}
                  </h3>
                  <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0">
                    {selectedData.attemptCount} previous {selectedData.attemptCount === 1 ? 'attempt' : 'attempts'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedData.company && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Building2 size={14} className="flex-shrink-0" />
                      <span className="text-sm truncate">{selectedData.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone size={14} className="flex-shrink-0" />
                    <span className="text-sm font-mono">{selectedData.phone}</span>
                  </div>
                  {selectedData.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail size={14} className="flex-shrink-0" />
                      <span className="text-sm truncate">{selectedData.email}</span>
                    </div>
                  )}
                  {selectedData.city && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span className="text-sm">{selectedData.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous Notes */}
              {selectedData.notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={14} />
                    Previous Notes
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">{selectedData.notes}</p>
                </div>
              )}

              {/* Call Actions */}
              <div>
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
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-6"
                    >
                      <PhoneOff size={20} className="mr-2" />
                      End Call
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleStartCall}
                    disabled={!!activeCall}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-base font-medium rounded-xl"
                  >
                    <Phone size={20} className="mr-2" />
                    Start Call
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disposition Dialog */}
      {showDispositionDialog && (
        <div data-modal className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
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
                  {statusOptions.map((option) => {
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

                  {/* Team Leader / BDM Assignment (for both Meeting and Share flows) */}
                  {(followUpAction === 'meeting' || followUpAction === 'share') && (
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
                  (callOutcome === 'INTERESTED' && (followUpAction === 'meeting' || followUpAction === 'share') && !selectedData?.assignedByBdm?.id && !selectedBDM) ||
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
