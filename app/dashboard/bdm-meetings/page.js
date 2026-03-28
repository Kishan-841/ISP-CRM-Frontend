'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useProductStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import DataTable from '@/components/DataTable';
import TabBar from '@/components/TabBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  MapPin,
  Calendar,
  X,
  CheckCircle,
  XCircle,
  Package,
  Loader2,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Phone,
  FileText,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BDMMeetingsPage() {
  const router = useRouter();
  const { user, isBDM: _isBDM, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const isBDM = isMaster ? false : _isBDM;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const canAccessBDM = isBDM || isBDMTeamLeader || isAdmin;
  const {
    bdmMeetings,
    bdmMeetingStats,
    fetchBDMMeetings,
    bdmDisposition,
    fetchFeasibilityTeamUsers,
    isLoading
  } = useLeadStore();
  const { products, fetchProducts } = useProductStore();

  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [ftUsers, setFtUsers] = useState([]);

  // Outcome state
  const [outcome, setOutcome] = useState('');
  const [meetingOutcome, setMeetingOutcome] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [selectedFTUser, setSelectedFTUser] = useState('');
  // Customer Location (To)
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  // Source/POP Location (From)
  const [fromAddress, setFromAddress] = useState('');
  const [fromLatitude, setFromLatitude] = useState('');
  const [fromLongitude, setFromLongitude] = useState('');
  // Other fields
  const [bandwidthRequirement, setBandwidthRequirement] = useState('');
  const [numberOfIPs, setNumberOfIPs] = useState('');
  const [interestLevel, setInterestLevel] = useState('');
  const [selectedParentProduct, setSelectedParentProduct] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [tentativePrice, setTentativePrice] = useState('');
  const [otcAmount, setOtcAmount] = useState('');
  // Billing Address
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPincode, setBillingPincode] = useState('');
  // Expected Delivery Date
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Meeting Later state
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');
  const [newMeetingPlace, setNewMeetingPlace] = useState('');
  const [newMeetingNotes, setNewMeetingNotes] = useState('');

  // Filter state - default to today
  const [filter, setFilter] = useState('today'); // today, upcoming, overdue

  useEffect(() => {
    if (user && !canAccessBDM && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, canAccessBDM, router]);

  useEffect(() => {
    if (canAccessBDM) {
      fetchBDMMeetings();
      loadFTUsers();
      fetchProducts();
    }
  }, [canAccessBDM]);

  const loadFTUsers = async () => {
    const result = await fetchFeasibilityTeamUsers();
    if (result.success) {
      setFtUsers(result.users || []);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMeetingStatus = (meetingDate) => {
    if (!meetingDate) return 'unknown';
    const now = new Date();
    const meeting = new Date(meetingDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (meeting < today) return 'overdue';
    if (meeting >= today && meeting < tomorrow) return 'today';
    return 'upcoming';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'today':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Today</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Upcoming</Badge>;
      default:
        return null;
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailsModal(true);
  };

  const handleOpenOutcome = (meeting) => {
    setSelectedMeeting(meeting);
    setOutcome('');
    setMeetingOutcome('');
    setDropReason('');
    setSelectedFTUser('');
    // Customer Location (To)
    setLatitude('');
    setLongitude('');
    setFullAddress('');
    // Source/POP Location (From)
    setFromAddress('');
    setFromLatitude('');
    setFromLongitude('');
    // Other fields
    setBandwidthRequirement(meeting.bandwidthRequirement || '');
    setNumberOfIPs('');
    setInterestLevel('');
    setSelectedParentProduct('');
    // Pre-select existing products if any
    const existingProductIds = meeting.products?.map(p => p.product?.id || p.id) || [];
    setSelectedProducts(existingProductIds);
    setTentativePrice('');
    // Billing Address
    setBillingAddress('');
    setBillingPincode('');
    // Expected Delivery Date
    setExpectedDeliveryDate('');
    // Reset meeting later fields
    setNewMeetingDate('');
    setNewMeetingTime('');
    setNewMeetingPlace(meeting.meetingPlace || ''); // Pre-fill with current meeting place
    setNewMeetingNotes('');
    setShowOutcomeModal(true);
  };

  const handleSubmitOutcome = async () => {
    if (!outcome) {
      toast.error('Please select an outcome');
      return;
    }

    if (outcome === 'QUALIFIED') {
      if (!interestLevel) {
        toast.error('Please select customer interest level');
        return;
      }
      if (!selectedFTUser) {
        toast.error('Please select a Feasibility Team member');
        return;
      }
      if (!latitude.trim() || !longitude.trim()) {
        toast.error('Please enter location coordinates (Lat/Long)');
        return;
      }
      if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        toast.error('Please enter valid numeric coordinates');
        return;
      }
      if (!fullAddress.trim()) {
        toast.error('Please enter the full address');
        return;
      }
    }

    if (outcome === 'DROPPED' && !dropReason.trim()) {
      toast.error('Please provide a reason for dropping');
      return;
    }

    if (outcome === 'MEETING_LATER') {
      if (!newMeetingDate || !newMeetingTime) {
        toast.error('Please select date and time for the next meeting');
        return;
      }
      if (!newMeetingPlace.trim()) {
        toast.error('Please enter the meeting place');
        return;
      }
    }

    setIsSaving(true);

    // Build disposition data based on outcome
    const dispositionData = {
      disposition: outcome,
      meetingOutcome: meetingOutcome.trim() || null,
      productIds: selectedProducts.length > 0 ? selectedProducts : null
    };

    if (outcome === 'QUALIFIED') {
      dispositionData.feasibilityAssignedToId = selectedFTUser;
      // Customer Location (To)
      dispositionData.latitude = parseFloat(latitude);
      dispositionData.longitude = parseFloat(longitude);
      dispositionData.fullAddress = fullAddress.trim();
      // Source/POP Location (From)
      dispositionData.fromAddress = fromAddress.trim() || null;
      dispositionData.fromLatitude = fromLatitude.trim() ? parseFloat(fromLatitude) : null;
      dispositionData.fromLongitude = fromLongitude.trim() ? parseFloat(fromLongitude) : null;
      // Other fields
      const bwNum = String(bandwidthRequirement).replace(/\D/g, '');
      dispositionData.bandwidthRequirement = bwNum ? `${bwNum} Mbps` : null;
      dispositionData.numberOfIPs = numberOfIPs.trim() ? parseInt(numberOfIPs) : null;
      dispositionData.interestLevel = interestLevel;
      dispositionData.tentativePrice = tentativePrice.trim() ? parseFloat(tentativePrice) : null;
      dispositionData.otcAmount = otcAmount.trim() ? parseFloat(otcAmount) : null;
      // Billing Address
      dispositionData.billingAddress = billingAddress.trim() || null;
      dispositionData.billingPincode = billingPincode.trim() || null;
      // Expected Delivery Date
      dispositionData.expectedDeliveryDate = expectedDeliveryDate || null;
    }

    if (outcome === 'DROPPED') {
      dispositionData.dropReason = dropReason.trim();
    }

    if (outcome === 'MEETING_LATER') {
      // Combine date and time
      const meetingDateTime = new Date(`${newMeetingDate}T${newMeetingTime}`);
      dispositionData.meetingDate = meetingDateTime.toISOString();
      dispositionData.meetingPlace = newMeetingPlace.trim();
      dispositionData.meetingNotes = newMeetingNotes.trim() || null;
    }

    const result = await bdmDisposition(selectedMeeting.id, dispositionData);

    if (result.success) {
      setShowOutcomeModal(false);
      setSelectedMeeting(null);
      toast.success(
        outcome === 'MEETING_LATER'
          ? `Meeting #${(selectedMeeting.meetingCount || 1) + 1} scheduled successfully`
          : result.message || 'Meeting outcome saved'
      );
      fetchBDMMeetings();
    } else {
      toast.error(result.error || 'Failed to save outcome');
    }

    setIsSaving(false);
  };

  // Filter meetings
  const filteredMeetings = (bdmMeetings || []).filter(meeting => {
    if (filter === 'all') return true;
    return getMeetingStatus(meeting.meetingDate) === filter;
  });

  if (!canAccessBDM) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scheduled Meetings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your physical meetings with leads
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {bdmMeetingStats?.total || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Today</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {bdmMeetingStats?.today || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {bdmMeetingStats?.upcoming || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <CalendarX className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {bdmMeetingStats?.overdue || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'today', label: 'Today', count: bdmMeetingStats?.today || 0, icon: CalendarClock, variant: 'warning' },
          { key: 'upcoming', label: 'Upcoming', count: bdmMeetingStats?.upcoming || 0, icon: CalendarCheck, variant: 'info' },
          { key: 'overdue', label: 'Overdue', count: bdmMeetingStats?.overdue || 0, icon: CalendarX, variant: 'danger' },
        ]}
        activeTab={filter}
        onTabChange={setFilter}
      />

      {/* Meetings Table */}
      <DataTable
        columns={[
          {
            key: 'company',
            label: 'Company',
            render: (meeting) => (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{meeting.company}</span>
                {meeting.meetingCount > 1 && (
                  <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                    {meeting.meetingCount === 2 ? '2nd' : meeting.meetingCount === 3 ? '3rd' : `${meeting.meetingCount}th`} Meeting
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: 'contact',
            label: 'Contact',
            render: (meeting) => (
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{meeting.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{meeting.phone}</p>
              </div>
            ),
          },
          {
            key: 'schedule',
            label: 'Schedule',
            render: (meeting) => (
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{formatDate(meeting.meetingDate)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(meeting.meetingDate)}</p>
              </div>
            ),
          },
          {
            key: 'location',
            label: 'Location',
            cellClassName: 'max-w-[200px]',
            render: (meeting) => (
              <span className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{meeting.meetingPlace || '-'}</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (meeting) => getStatusBadge(getMeetingStatus(meeting.meetingDate)),
          },
        ]}
        data={filteredMeetings}
        loading={isLoading}
        pagination
        defaultPageSize={10}
        emptyMessage="No meetings scheduled"
        emptyIcon={Calendar}
        actions={(meeting) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(meeting)}
              className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Details
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenOutcome(meeting)}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white"
            >
              Update Outcome
            </Button>
          </div>
        )}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Meeting Details</h2>
                  {selectedMeeting.meetingCount > 1 && (
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                      {selectedMeeting.meetingCount === 2 ? '2nd' : selectedMeeting.meetingCount === 3 ? '3rd' : `${selectedMeeting.meetingCount}th`} Meeting
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMeeting.company}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Meeting Schedule */}
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-700 dark:text-orange-300">
                    {formatDate(selectedMeeting.meetingDate)} at {formatTime(selectedMeeting.meetingDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                  <MapPin className="w-5 h-5" />
                  <span>{selectedMeeting.meetingPlace}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Contact</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedMeeting.name}</p>
                    <p className="text-sm text-slate-500">{selectedMeeting.title}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-slate-900 dark:text-slate-100">{selectedMeeting.phone}</p>
                    {selectedMeeting.whatsapp && (
                      <p className="text-sm text-slate-500">WA: {selectedMeeting.whatsapp}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products */}
              {selectedMeeting.products?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Package size={16} />
                    Products of Interest
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.products.map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Meeting Notes */}
              {selectedMeeting.meetingNotes && (
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-700">
                  <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-cyan-600 dark:text-cyan-400" />
                    Meeting Notes
                  </h4>
                  <p className="text-sm text-cyan-900 dark:text-cyan-100 leading-relaxed">
                    {selectedMeeting.meetingNotes}
                  </p>
                </div>
              )}

              {/* Requirements */}
              {selectedMeeting.requirements && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                    Important Notes About This Lead
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {selectedMeeting.requirements}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOpenOutcome(selectedMeeting);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Update Outcome
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Modal */}
      {showOutcomeModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Meeting Outcome</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMeeting.company}</p>
              </div>
              <button
                onClick={() => setShowOutcomeModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Row 1: Outcome Options + Interest Level (when QUALIFIED) */}
              <div className={`grid gap-4 ${outcome === 'QUALIFIED' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Outcome Options */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Meeting Result <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setOutcome('QUALIFIED')}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        outcome === 'QUALIFIED'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      <CheckCircle size={20} />
                      <span className="font-medium text-xs">Interested</span>
                    </button>
                    <button
                      onClick={() => setOutcome('MEETING_LATER')}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        outcome === 'MEETING_LATER'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <RefreshCw size={20} />
                      <span className="font-medium text-xs">Reschedule</span>
                    </button>
                    <button
                      onClick={() => setOutcome('DROPPED')}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        outcome === 'DROPPED'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300'
                      }`}
                    >
                      <XCircle size={20} />
                      <span className="font-medium text-xs">Drop</span>
                    </button>
                  </div>
                </div>

                {/* Interest Level - Only show when QUALIFIED */}
                {outcome === 'QUALIFIED' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Interest Level <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setInterestLevel('COLD')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                          interestLevel === 'COLD'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                        }`}
                      >
                        <span className="text-lg">❄️</span>
                        <span className="font-medium text-xs">Cold</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterestLevel('WARM')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                          interestLevel === 'WARM'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                        }`}
                      >
                        <span className="text-lg">🌤️</span>
                        <span className="font-medium text-xs">Warm</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterestLevel('HOT')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                          interestLevel === 'HOT'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300'
                        }`}
                      >
                        <span className="text-lg">🔥</span>
                        <span className="font-medium text-xs">Hot</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Meeting Summary + Products (side by side when not DROPPED) */}
              {outcome !== 'DROPPED' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Meeting Summary */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Meeting Summary
                    </label>
                    <textarea
                      value={meetingOutcome}
                      onChange={(e) => setMeetingOutcome(e.target.value)}
                      rows={4}
                      placeholder="What was discussed..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>

                  {/* Products Selection */}
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h4 className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-1">
                      <Package size={14} />
                      Products Discussed
                    </h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {products.filter(p => p.status === 'ACTIVE' && !p.parentId).map(parent => (
                        <button
                          key={parent.id}
                          type="button"
                          onClick={() => {
                            setSelectedParentProduct(parent.id);
                            setSelectedProducts([]);
                          }}
                          className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                            selectedParentProduct === parent.id
                              ? 'bg-orange-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-orange-300 hover:border-orange-500'
                          }`}
                        >
                          {parent.title}
                        </button>
                      ))}
                    </div>
                    {selectedParentProduct && (
                      <div className="flex flex-wrap gap-1">
                        {products.filter(p => p.status === 'ACTIVE' && p.parentId === selectedParentProduct).map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setSelectedProducts(prev =>
                                prev.includes(product.id)
                                  ? prev.filter(id => id !== product.id)
                                  : [...prev, product.id]
                              );
                            }}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              selectedProducts.includes(product.id)
                                ? 'bg-orange-600 text-white'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300'
                            }`}
                          >
                            {product.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Meeting Later Fields */}
              {outcome === 'MEETING_LATER' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1 mb-2">
                    <CalendarCheck size={14} />
                    Next Meeting (#{(selectedMeeting?.meetingCount || 1) + 1})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <input
                      type="date"
                      value={newMeetingDate}
                      onChange={(e) => setNewMeetingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                    />
                    <input
                      type="time"
                      value={newMeetingTime}
                      onChange={(e) => setNewMeetingTime(e.target.value)}
                      className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                    />
                    <input
                      type="text"
                      value={newMeetingPlace}
                      onChange={(e) => setNewMeetingPlace(e.target.value)}
                      placeholder="Meeting Place *"
                      className="col-span-2 w-full h-9 px-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>
                  <textarea
                    value={newMeetingNotes}
                    onChange={(e) => setNewMeetingNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes for next meeting..."
                    className="w-full px-2 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-slate-900 dark:text-slate-100 text-sm resize-none"
                  />
                </div>
              )}

              {/* Location & FT Assignment (for QUALIFIED) */}
              {outcome === 'QUALIFIED' && (
                <div className="space-y-3">
                  {/* Location Details - From & To */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                      <MapPin size={12} />
                      Customer Location <span className="text-red-500">*</span>
                    </h4>
                    <input
                      type="text"
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      placeholder="Customer Address..."
                      className="w-full h-9 px-2 mb-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="Latitude *"
                        className="w-full h-8 px-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded text-slate-900 dark:text-slate-100 text-xs"
                      />
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="Longitude *"
                        className="w-full h-8 px-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>

                  {/* Service Requirements & FT Assignment - Single Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Bandwidth {bandwidthRequirement && (
                          <span className="text-orange-600 dark:text-orange-400 font-normal">
                            ({(() => { const n = parseInt(String(bandwidthRequirement).replace(/\D/g, '')); return n >= 1000 ? `${(n/1000).toFixed(n%1000===0?0:1)} Gbps` : `${n} Mbps`; })()})
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={String(bandwidthRequirement).replace(/\D/g, '')}
                        onChange={(e) => setBandwidthRequirement(e.target.value)}
                        placeholder="e.g. 200"
                        min="1"
                        className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        No. of IPs
                      </label>
                      <input
                        type="number"
                        value={numberOfIPs}
                        onChange={(e) => setNumberOfIPs(e.target.value)}
                        placeholder="8"
                        min="1"
                        className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={tentativePrice}
                        onChange={(e) => setTentativePrice(e.target.value)}
                        placeholder="50000"
                        className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        OTC (₹)
                      </label>
                      <input
                        type="number"
                        value={otcAmount}
                        onChange={(e) => setOtcAmount(e.target.value)}
                        placeholder="10000"
                        className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Assign FT <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedFTUser}
                        onChange={(e) => setSelectedFTUser(e.target.value)}
                        className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                      >
                        <option value="">Select...</option>
                        {ftUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                    <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-2">
                      <FileText size={12} />
                      Billing Address
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          placeholder="Full billing address..."
                          className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={billingPincode}
                          onChange={(e) => setBillingPincode(e.target.value)}
                          placeholder="Pincode"
                          maxLength={6}
                          className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expected Delivery Date */}
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-700">
                    <h4 className="text-xs font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1 mb-2">
                      <Calendar size={12} />
                      Expected Delivery Date
                    </h4>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full sm:w-auto h-9 px-2 bg-white dark:bg-slate-800 border border-cyan-300 dark:border-cyan-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Drop Reason + Meeting Summary (for DROPPED) */}
              {outcome === 'DROPPED' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Meeting Summary
                    </label>
                    <textarea
                      value={meetingOutcome}
                      onChange={(e) => setMeetingOutcome(e.target.value)}
                      rows={3}
                      placeholder="What was discussed..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Reason for Dropping <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={dropReason}
                      onChange={(e) => setDropReason(e.target.value)}
                      rows={3}
                      placeholder="Why is this lead being dropped..."
                      className="w-full px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3 flex-shrink-0">
              <Button
                onClick={() => setShowOutcomeModal(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOutcome}
                disabled={
                  !outcome ||
                  isSaving ||
                  (outcome === 'QUALIFIED' && (!interestLevel || !selectedFTUser || !latitude.trim() || !longitude.trim() || !fullAddress.trim())) ||
                  (outcome === 'DROPPED' && !dropReason.trim()) ||
                  (outcome === 'MEETING_LATER' && (!newMeetingDate || !newMeetingTime || !newMeetingPlace.trim()))
                }
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : outcome === 'MEETING_LATER' ? (
                  'Schedule Meeting'
                ) : (
                  'Save Outcome'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
