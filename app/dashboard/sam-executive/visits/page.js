'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Calendar,
  MapPin,
  Clock,
  Building2,
  User,
  Phone,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Loader2,
  Filter,
  CalendarDays,
  ClipboardList,
  Target,
  TrendingUp
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const VISIT_TYPES = [
  { value: 'REGULAR', label: 'Regular Visit', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'ESCALATION', label: 'Escalation', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'SALES', label: 'Sales/Upsell', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'INSTALLATION', label: 'Installation Support', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' }
];

const VISIT_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  { value: 'RESCHEDULED', label: 'Rescheduled', color: 'bg-amber-100 text-amber-700' }
];

export default function SAMVisitsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [visits, setVisits] = useState([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    visitsThisMonth: 0,
    visitsThisQuarter: 0,
    completedVisits: 0,
    pendingVisits: 0,
    overdueVisits: 0,
    visitsByType: {},
    upcomingVisits: []
  });
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState({ status: '', startDate: '', endDate: '' });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingVisitId, setCancellingVisitId] = useState(null);

  const [createForm, setCreateForm] = useState({
    customerId: '',
    visitDate: '',
    visitType: 'REGULAR',
    purpose: '',
    location: ''
  });

  const [completeForm, setCompleteForm] = useState({
    outcome: '',
    customerFeedback: '',
    issuesIdentified: '',
    actionRequired: '',
    nextVisitDate: '',
    nextVisitPurpose: '',
    notes: ''
  });

  // Check authorization
  useEffect(() => {
    if (user && user.role !== 'SAM_EXECUTIVE' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch visits
  const fetchVisits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);

      const response = await api.get(`/sam/visits?${params.toString()}`);
      setVisits(response.data.visits || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
  }, [filter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/sam/visits/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await api.get('/sam/my-customers?limit=100');
      setCustomers(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'SAM_EXECUTIVE' || user?.role === 'MASTER') {
      setIsLoading(true);
      Promise.all([fetchVisits(), fetchStats(), fetchCustomers()])
        .finally(() => setIsLoading(false));
    }
  }, [user, fetchVisits, fetchStats, fetchCustomers]);

  // Create visit
  const handleCreateVisit = async (e) => {
    e.preventDefault();
    if (!createForm.customerId || !createForm.visitDate) {
      toast.error('Please select customer and visit date');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/sam/visits', createForm);
      toast.success('Visit scheduled successfully');
      setShowCreateModal(false);
      setCreateForm({
        customerId: '',
        visitDate: '',
        visitType: 'REGULAR',
        purpose: '',
        location: ''
      });
      fetchVisits();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete visit
  const handleCompleteVisit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setIsSubmitting(true);
    try {
      await api.post(`/sam/visits/${selectedVisit.id}/complete`, completeForm);
      toast.success('Visit completed successfully');
      setShowCompleteModal(false);
      setSelectedVisit(null);
      setCompleteForm({
        outcome: '',
        customerFeedback: '',
        issuesIdentified: '',
        actionRequired: '',
        nextVisitDate: '',
        nextVisitPurpose: '',
        notes: ''
      });
      fetchVisits();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel visit
  const handleCancelVisit = async () => {
    if (!cancellingVisitId) return;

    try {
      await api.post(`/sam/visits/${cancellingVisitId}/cancel`);
      toast.success('Visit cancelled');
      setShowCancelConfirm(false);
      setCancellingVisitId(null);
      fetchVisits();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel visit');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVisitTypeBadge = (type) => {
    const found = VISIT_TYPES.find(t => t.value === type);
    return found || VISIT_TYPES[0];
  };

  const getStatusBadge = (status) => {
    const found = VISIT_STATUSES.find(s => s.value === status);
    return found || VISIT_STATUSES[0];
  };

  if (!user || user.role !== 'SAM_EXECUTIVE' && user.role !== 'MASTER') {
    return null;
  }

  return (
    <>
      <PageHeader title="Visit Tracking" description="Manage your customer visits">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Schedule Visit
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard color="orange" icon={CalendarDays} label="This Month" value={stats.visitsThisMonth} />
        <StatCard color="blue" icon={Target} label="This Quarter" value={stats.visitsThisQuarter} />
        <StatCard color="green" icon={CheckCircle} label="Completed" value={stats.completedVisits} />
        <StatCard color="amber" icon={Clock} label="Pending" value={stats.pendingVisits} />
        <StatCard color="red" icon={AlertCircle} label="Overdue" value={stats.overdueVisits} />
        <StatCard color="slate" icon={TrendingUp} label="Total" value={stats.totalVisits} />
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-40 mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                {VISIT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">From Date</Label>
              <Input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">To Date</Label>
              <Input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40 mt-1"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setFilter({ status: '', startDate: '', endDate: '' })}
              className="text-slate-600"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-600" />
            Visits ({visits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No visits found</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Schedule Your First Visit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => {
                const typeBadge = getVisitTypeBadge(visit.visitType);
                const statusBadge = getStatusBadge(visit.status);
                const isOverdue = visit.status === 'SCHEDULED' && new Date(visit.visitDate) < new Date();
                const isCompleted = visit.status === 'COMPLETED';
                const isCancelled = visit.status === 'CANCELLED';

                // Get customer initials for avatar
                const getInitials = (name) => {
                  if (!name) return '?';
                  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                };

                const customerName = visit.customer?.campaignData?.company || visit.customer?.customerUsername || 'Unknown';

                return (
                  <div
                    key={visit.id}
                    className={`rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-md ${
                      isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    {/* Status indicator bar */}
                    <div className={`h-1 ${
                      isOverdue ? 'bg-red-500' :
                      isCompleted ? 'bg-green-500' :
                      isCancelled ? 'bg-gray-400' : 'bg-blue-500'
                    }`} />

                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Customer Avatar */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                          isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600' :
                          isOverdue ? 'bg-gradient-to-br from-red-500 to-red-600' :
                          isCancelled ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          'bg-gradient-to-br from-orange-500 to-orange-600'
                        }`}>
                          {getInitials(customerName)}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                                {customerName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${typeBadge.color} text-xs px-2 py-0.5`}>{typeBadge.label}</Badge>
                                <Badge className={`${statusBadge.color} text-xs px-2 py-0.5`}>{statusBadge.label}</Badge>
                                {isOverdue && (
                                  <Badge className="bg-red-100 text-red-700 text-xs px-2 py-0.5 animate-pulse">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3"
                                onClick={() => {
                                  setSelectedVisit(visit);
                                  setShowViewModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {visit.status === 'SCHEDULED' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      setSelectedVisit(visit);
                                      setShowCompleteModal(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      setCancellingVisitId(visit.id);
                                      setShowCancelConfirm(true);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            {/* Date & Time */}
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Date & Time</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {formatDate(visit.visitDate)} {formatTime(visit.visitDate)}
                                </p>
                              </div>
                            </div>

                            {/* Phone */}
                            {visit.customer?.campaignData?.phone && (
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                                  <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Contact</p>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {visit.customer.campaignData.phone}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Location */}
                            {visit.location && (
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                                  <MapPin className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                    {visit.location}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Purpose & Outcome */}
                          {(visit.purpose || visit.outcome) && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                              {visit.purpose && (
                                <div className="flex items-start gap-2">
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Purpose
                                  </span>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 flex-1">{visit.purpose}</p>
                                </div>
                              )}
                              {visit.outcome && (
                                <div className="flex items-start gap-2">
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs font-medium text-green-600 dark:text-green-400">
                                    Outcome
                                  </span>
                                  <p className="text-sm text-green-600 dark:text-green-400 flex-1">{visit.outcome}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Visit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Visit</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              <div>
                <Label>Customer <span className="text-red-500">*</span></Label>
                <select
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((a) => (
                    <option key={a.customer.id} value={a.customer.id}>
                      {a.customer.campaignData?.company || a.customer.customerUsername}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Visit Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="datetime-local"
                    value={createForm.visitDate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, visitDate: e.target.value }))}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Visit Type</Label>
                  <select
                    value={createForm.visitType}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, visitType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {VISIT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>Purpose</Label>
                <textarea
                  value={createForm.purpose}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, purpose: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Purpose of the visit..."
                />
              </div>

              <div>
                <Label>Location (if different from customer address)</Label>
                <Input
                  value={createForm.location}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Visit location"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Schedule Visit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Visit Modal */}
      {showCompleteModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCompleteModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Complete Visit</h2>
              <button onClick={() => setShowCompleteModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteVisit} className="p-6 space-y-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>{selectedVisit.customer?.campaignData?.company}</strong>
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {formatDate(selectedVisit.visitDate)} - {selectedVisit.visitType}
                </p>
              </div>

              <div>
                <Label>Outcome <span className="text-red-500">*</span></Label>
                <textarea
                  value={completeForm.outcome}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, outcome: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="What was achieved in this visit?"
                  required
                />
              </div>

              <div>
                <Label>Customer Feedback</Label>
                <textarea
                  value={completeForm.customerFeedback}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, customerFeedback: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Any feedback or concerns from customer..."
                />
              </div>

              <div>
                <Label>Issues Identified</Label>
                <textarea
                  value={completeForm.issuesIdentified}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, issuesIdentified: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Any issues identified during visit..."
                />
              </div>

              <div>
                <Label>Action Required</Label>
                <textarea
                  value={completeForm.actionRequired}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, actionRequired: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Follow-up actions needed..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Next Visit Date</Label>
                  <Input
                    type="date"
                    value={completeForm.nextVisitDate}
                    onChange={(e) => setCompleteForm(prev => ({ ...prev, nextVisitDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Next Visit Purpose</Label>
                  <Input
                    value={completeForm.nextVisitPurpose}
                    onChange={(e) => setCompleteForm(prev => ({ ...prev, nextVisitPurpose: e.target.value }))}
                    className="mt-1"
                    placeholder="Purpose of next visit"
                  />
                </div>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <textarea
                  value={completeForm.notes}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Complete Visit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Visit Confirm Dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={(open) => {
          setShowCancelConfirm(open);
          if (!open) setCancellingVisitId(null);
        }}
        title="Cancel Visit"
        description="Are you sure you want to cancel this visit? This action cannot be undone."
        confirmLabel="Cancel Visit"
        variant="destructive"
        onConfirm={handleCancelVisit}
      />

      {/* View Visit Modal */}
      {showViewModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visit Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getVisitTypeBadge(selectedVisit.visitType).color}>
                  {getVisitTypeBadge(selectedVisit.visitType).label}
                </Badge>
                <Badge className={getStatusBadge(selectedVisit.status).color}>
                  {getStatusBadge(selectedVisit.status).label}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customer</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedVisit.customer?.campaignData?.company || selectedVisit.customer?.customerUsername}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Visit Date</p>
                    <p className="text-slate-900 dark:text-white">{formatDate(selectedVisit.visitDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Time</p>
                    <p className="text-slate-900 dark:text-white">{formatTime(selectedVisit.visitDate)}</p>
                  </div>
                </div>

                {selectedVisit.purpose && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Purpose</p>
                    <p className="text-slate-900 dark:text-white">{selectedVisit.purpose}</p>
                  </div>
                )}

                {selectedVisit.location && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                    <p className="text-slate-900 dark:text-white">{selectedVisit.location}</p>
                  </div>
                )}

                {selectedVisit.outcome && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Outcome</p>
                    <p className="text-green-700 dark:text-green-300">{selectedVisit.outcome}</p>
                  </div>
                )}

                {selectedVisit.customerFeedback && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Customer Feedback</p>
                    <p className="text-slate-900 dark:text-white">{selectedVisit.customerFeedback}</p>
                  </div>
                )}

                {selectedVisit.issuesIdentified && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Issues Identified</p>
                    <p className="text-red-700 dark:text-red-300">{selectedVisit.issuesIdentified}</p>
                  </div>
                )}

                {selectedVisit.actionRequired && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Action Required</p>
                    <p className="text-amber-700 dark:text-amber-300">{selectedVisit.actionRequired}</p>
                  </div>
                )}

                {selectedVisit.nextVisitDate && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Next Visit Planned</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {formatDate(selectedVisit.nextVisitDate)}
                      {selectedVisit.nextVisitPurpose && ` - ${selectedVisit.nextVisitPurpose}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
