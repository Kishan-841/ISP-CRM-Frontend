'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Users,
  Building2,
  Phone,
  Mail,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  MapPin,
  Wifi,
  CreditCard,
  Clock,
  Eye,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Loader2,
  Heart
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function SAMExecutiveCustomers() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Check authorization
  useEffect(() => {
    if (user && user.role !== 'SAM_EXECUTIVE' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch my customers
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (search) params.append('search', search);

      const response = await api.get(`/sam/my-customers?${params}`);
      setAssignments(response.data.assignments);
      setTotalPages(response.data.totalPages);
      setTotalCustomers(response.data.total || response.data.assignments.length);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (user?.role === 'SAM_EXECUTIVE' || user?.role === 'MASTER') {
      fetchCustomers();
    }
  }, [user, fetchCustomers]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Calculate stats
  const customersWithMeetings = assignments.filter(a => a.customer.samMeetings?.length > 0).length;
  const customersNeedingAttention = assignments.filter(a => {
    const lastMeeting = a.customer.samMeetings?.[0];
    if (!lastMeeting) return true;
    const daysSinceMeeting = Math.floor((new Date() - new Date(lastMeeting.meetingDate)) / (1000 * 60 * 60 * 24));
    return daysSinceMeeting > 30;
  }).length;

  if (!user || user.role !== 'SAM_EXECUTIVE' && user.role !== 'MASTER') {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/sam-executive')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 -ml-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>
      <PageHeader title="My Customers" description="Manage relationships with your assigned customers" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard color="orange" icon={Users} label="Total Customers" value={totalCustomers} />
        <StatCard color="green" icon={CalendarCheck} label="With Meetings" value={customersWithMeetings} />
        <StatCard color="amber" icon={AlertCircle} label="Need Attention" value={customersNeedingAttention} />
      </div>

      {/* Search Bar */}
      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by company name, contact, or username..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-orange-600" />
            Assigned Customers ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No customers assigned</h3>
              <p className="text-slate-600 dark:text-slate-400">Contact your SAM Head to get customers assigned.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const customer = assignment.customer;
                const lastInvoice = customer.invoices?.[0];
                const lastMeeting = customer.samMeetings?.[0];
                const companyName = customer.campaignData?.company || customer.customerUsername || 'Unknown';
                const contactName = customer.campaignData?.name || '-';
                const contactPhone = customer.campaignData?.phone || '-';
                const contactEmail = customer.campaignData?.email || '-';

                // Check if needs attention (no meeting in 30+ days)
                const needsAttention = !lastMeeting ||
                  Math.floor((new Date() - new Date(lastMeeting.meetingDate)) / (1000 * 60 * 60 * 24)) > 30;

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-xl border overflow-hidden transition-all hover:shadow-md ${
                      needsAttention
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    {/* Status indicator bar */}
                    <div className={`h-1 ${
                      needsAttention ? 'bg-amber-500' : 'bg-green-500'
                    }`} />

                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Company Avatar */}
                        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-white font-semibold text-lg ${
                          needsAttention
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                            : 'bg-gradient-to-br from-orange-500 to-orange-600'
                        }`}>
                          {getInitials(companyName)}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                                  {companyName}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  @{customer.customerUsername}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-3"
                                onClick={() => router.push(`/dashboard/sam-executive/customers/${customer.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                View
                              </Button>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            {/* Contact Person */}
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Contact</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {contactName}
                                </p>
                              </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                                <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {contactPhone}
                                </p>
                              </div>
                            </div>

                            {/* Plan */}
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                                <Wifi className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Plan</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {customer.actualPlanName || '-'}
                                </p>
                              </div>
                            </div>

                            {/* Revenue */}
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {customer.actualPlanPrice ? `₹${customer.actualPlanPrice}` : '-'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row - Meeting & Invoice Info */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            {/* Last Meeting */}
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                Last Meeting:
                              </span>
                              {lastMeeting ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {formatDate(lastMeeting.meetingDate)}
                                  </span>
                                  <Badge
                                    className={`text-xs px-2 py-0.5 ${
                                      lastMeeting.status === 'COMPLETED'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : lastMeeting.status === 'SCHEDULED'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                    }`}
                                  >
                                    {lastMeeting.status}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">No meetings yet</span>
                              )}
                            </div>

                            {/* Last Invoice */}
                            {lastInvoice && (
                              <div className="flex items-center gap-2 ml-auto">
                                <CreditCard className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  Last Invoice:
                                </span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {formatDate(lastInvoice.invoiceDate)}
                                </span>
                              </div>
                            )}

                            {/* Needs Attention Badge */}
                            {needsAttention && (
                              <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs px-2 py-0.5">
                                <Clock className="h-3 w-3 mr-1" />
                                Needs Follow-up
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}
