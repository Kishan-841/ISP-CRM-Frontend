'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Briefcase,
  Mail,
  MapPin,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  X,
  CalendarClock,
  CalendarCheck,
  XCircle,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

export default function BDMFollowUpsPage() {
  const router = useRouter();
  const { user, isBDM, isBDMTeamLeader, isSuperAdmin: isAdmin } = useRoleCheck();
  const canAccessBDM = isBDM || isBDMTeamLeader;
  const {
    fetchBDMFollowUps,
    updateLeadLocation,
    bdmDisposition,
    addMOM,
    getLeadMOMs,
    isLoading,
    // Feasibility Team
    feasibilityTeamUsers,
    fetchFeasibilityTeamUsers
  } = useLeadStore();

  const [followUps, setFollowUps] = useState([]);
  const [categorized, setCategorized] = useState({ overdue: [], dueToday: [], upcoming: [] });
  const [activeTab, setActiveTab] = useState('overdue');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
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
  const [meetingAgenda, setMeetingAgenda] = useState('');

  // Feasibility Team assignment state (no longer needed for direct QUALIFIED)
  const [assignToFT, setAssignToFT] = useState(false);
  const [selectedFTUser, setSelectedFTUser] = useState('');

  // MOM state
  const [momData, setMomData] = useState({
    meetingDate: new Date().toISOString().split('T')[0],
    attendees: '',
    agenda: '',
    discussion: '',
    nextSteps: '',
    followUpDate: ''
  });


  // Redirect non-BDM users
  useEffect(() => {
    if (user && !canAccessBDM) {
      router.push('/dashboard');
    }
  }, [user, canAccessBDM, router]);

  // Fetch data
  const loadFollowUps = async () => {
    const result = await fetchBDMFollowUps();
    if (result.success) {
      setFollowUps(result.followUps || []);
      setCategorized(result.categorized || { overdue: [], dueToday: [], upcoming: [] });
    }
  };

  useEffect(() => {
    if (canAccessBDM) {
      loadFollowUps();
      fetchFeasibilityTeamUsers();
    }
  }, [canAccessBDM, fetchFeasibilityTeamUsers]);

  useSocketRefresh(loadFollowUps, { enabled: canAccessBDM });

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
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Categorize follow-ups
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const categorizedFollowUps = {
    overdue: followUps.filter(f => {
      if (!f.callLaterAt) return true;
      return new Date(f.callLaterAt) < today;
    }),
    dueToday: followUps.filter(f => {
      if (!f.callLaterAt) return false;
      const callDate = new Date(f.callLaterAt);
      return callDate >= today && callDate < tomorrow;
    }),
    upcoming: followUps.filter(f => {
      if (!f.callLaterAt) return false;
      return new Date(f.callLaterAt) >= tomorrow;
    })
  };

  const currentList = categorizedFollowUps[activeTab] || [];

  const resetDisposition = () => {
    setDisposition('');
    setNotes('');
    setDropReason('');
    setCallLaterDate('');
    setCallLaterTime('');
    setMeetingDate('');
    setMeetingTime('');
    setMeetingPlace('');
    setMeetingAgenda('');
    setAssignToFT(false);
    setSelectedFTUser('');
  };

  const handleCallNow = (lead) => {
    setSelectedLead(lead);
    setLocation(lead.location || '');
    setShowCallModal(true);
    resetDisposition();
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

    if (disposition === 'MEETING_SCHEDULED' && (!meetingDate || !meetingTime || !meetingPlace.trim())) {
      toast.error('Please fill meeting date, time and place');
      return;
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

    // Build meeting date/time if scheduling a meeting
    const meetingDateTime = disposition === 'MEETING_SCHEDULED' && meetingDate && meetingTime
      ? new Date(`${meetingDate}T${meetingTime}`).toISOString()
      : null;

    const result = await bdmDisposition(selectedLead.id, {
      disposition: actualDisposition,
      notes: isNotReachable ? (notes ? `Not Reachable/Ringing. ${notes}` : 'Not Reachable/Ringing') : notes,
      callLaterAt,
      dropReason: disposition === 'DROPPED' ? dropReason : null,
      location: location.trim() || null,
      // Meeting fields
      meetingDate: meetingDateTime,
      meetingPlace: disposition === 'MEETING_SCHEDULED' ? meetingPlace.trim() : null,
      meetingNotes: disposition === 'MEETING_SCHEDULED' ? meetingAgenda.trim() : null
    });

    if (result.success) {
      setActiveCall(null);
      setCallTimer(0);
      setShowDispositionDialog(false);
      setShowCallModal(false);
      setSelectedLead(null);
      toast.success(isNotReachable ? 'Marked as not reachable. Follow-up scheduled in 1 hour.' : (result.message || 'Disposition saved'));
      loadFollowUps();
    } else {
      toast.error(result.error || 'Failed to save disposition');
    }

    setIsSaving(false);
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
    { value: 'MEETING_SCHEDULED', label: 'Schedule Meeting', icon: CalendarCheck, color: 'emerald' },
    { value: 'DROPPED', label: 'Drop', icon: XCircle, color: 'red' },
    { value: 'FOLLOW_UP', label: 'Follow Up', icon: CalendarClock, color: 'blue' },
    { value: 'NOT_REACHABLE', label: 'Not Reachable / Ringing', icon: PhoneOff, color: 'amber' },
  ];

  if (!canAccessBDM) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="BDM Follow-Ups" description="Manage scheduled follow-ups for your leads" />

      {/* Alert Banner */}
      {categorizedFollowUps.overdue.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">
                {categorizedFollowUps.overdue.length} overdue follow-up{categorizedFollowUps.overdue.length > 1 ? 's' : ''} require immediate attention
              </p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
                SLA breach detected
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'dueToday', label: 'Due Today', count: categorizedFollowUps.dueToday.length, variant: 'warning' },
          { key: 'overdue', label: 'Overdue', count: categorizedFollowUps.overdue.length, variant: 'danger' },
          { key: 'upcoming', label: 'Upcoming', count: categorizedFollowUps.upcoming.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Follow-up Table */}
      <DataTable
        columns={[
          {
            key: 'company',
            label: 'Company',
            render: (lead) => (
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {lead.company || 'No Company'}
              </span>
            ),
          },
          {
            key: 'contact',
            label: 'Contact',
            render: (lead) => {
              const displayName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown';
              return (
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead.phone}</p>
                </div>
              );
            },
          },
          {
            key: 'scheduled',
            label: 'Scheduled',
            render: (lead) => (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {formatDate(lead.callLaterAt)}
              </span>
            ),
          },
          {
            key: 'location',
            label: 'Location',
            cellClassName: 'max-w-[180px]',
            render: (lead) => (
              <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {lead.location || '-'}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (lead) => {
              const isOverdue = lead.callLaterAt && new Date(lead.callLaterAt) < today;
              if (isOverdue) {
                return (
                  <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                    Overdue
                  </Badge>
                );
              }
              return (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                  Scheduled
                </Badge>
              );
            },
          },
        ]}
        data={currentList}
        loading={isLoading}
        pagination
        defaultPageSize={10}
        emptyMessage="No follow-ups in this category"
        emptyIcon={Clock}
        actions={(lead) => (
          <Button
            onClick={() => handleCallNow(lead)}
            size="sm"
            className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white"
          >
            Call Now
          </Button>
        )}
      />

      {/* Call Modal */}
      {showCallModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Follow-Up Call
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedLead.company || 'No Company'} - {selectedLead.name || 'Unknown'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (activeCall) {
                    toast.error('Please end the call first');
                    return;
                  }
                  setShowCallModal(false);
                  setSelectedLead(null);
                  resetDisposition();
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Details */}
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
                      <span className="text-sm">{selectedLead.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Status & Buttons */}
              <div>
                {activeCall ? (
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
                    <div className="flex gap-3">
                      <Button
                        onClick={handleOpenMOM}
                        variant="outline"
                        className="flex-1 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                      >
                        <FileText size={18} className="mr-2" />
                        Add MOM
                      </Button>
                      <Button
                        onClick={handleOpenDispositionDialog}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <PhoneOff size={18} className="mr-2" />
                        End Call
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleStartCall}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white py-6 text-base font-medium rounded-xl"
                  >
                    <Phone size={20} className="mr-2" />
                    Start Call
                  </Button>
                )}
              </div>

              {/* Previous Notes */}
              {selectedLead.requirements && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                    Important Notes About This Lead
                  </h3>
                  <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {selectedLead.requirements}
                  </div>
                </div>
              )}

              {/* Products of Interest */}
              {selectedLead.products && selectedLead.products.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Products of Interest</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.products.map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0">
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disposition Dialog */}
      {showDispositionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
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
                            ? option.value === 'MEETING_SCHEDULED' ? 'bg-emerald-600 text-white border-emerald-600'
                              : option.value === 'DROPPED' ? 'bg-red-600 text-white border-red-600'
                              : 'bg-blue-600 text-white border-blue-600'
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

              {/* Meeting Scheduling - For MEETING_SCHEDULED */}
              {disposition === 'MEETING_SCHEDULED' && (
                <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CalendarCheck size={18} />
                    Schedule Physical Meeting
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
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
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
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
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      Meeting Place <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={meetingPlace}
                      onChange={(e) => setMeetingPlace(e.target.value)}
                      placeholder="Office address or meeting location..."
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      Meeting Agenda (Optional)
                    </label>
                    <textarea
                      value={meetingAgenda}
                      onChange={(e) => setMeetingAgenda(e.target.value)}
                      rows={2}
                      placeholder="Topics to discuss..."
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
                  (disposition === 'MEETING_SCHEDULED' && (!meetingDate || !meetingTime || !meetingPlace.trim())) ||
                  (disposition === 'DROPPED' && !dropReason.trim())
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
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
    </div>
  );
}
