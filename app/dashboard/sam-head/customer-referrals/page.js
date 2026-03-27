'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Inbox,
  Users,
  Phone,
  Building2,
  MapPin,
  Clock,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { PageHeader } from '@/components/PageHeader';

export default function SAMHeadCustomerReferralsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isMaster = user?.role === 'MASTER';
  const isSAMHead = user?.role === 'SAM_HEAD';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAllowed = isSAMHead || isSuperAdmin || isMaster;

  const [enquiries, setEnquiries] = useState([]);
  const [isrUsers, setIsrUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedISRs, setSelectedISRs] = useState({});

  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, isAllowed, router]);

  const fetchEnquiries = useCallback(async () => {
    try {
      const res = await api.get('/leads/sam-head/customer-enquiries');
      setEnquiries(res.data.enquiries || []);
    } catch {
      console.error('Failed to fetch enquiries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchISRUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/isr-list');
      setIsrUsers(res.data.users || []);
    } catch {
      console.error('Failed to fetch ISR users');
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchEnquiries();
      fetchISRUsers();
    }
  }, [isAllowed, fetchEnquiries, fetchISRUsers]);

  useSocketRefresh(fetchEnquiries, { enabled: isAllowed });

  const handleAssign = async (enquiryId) => {
    const isrId = selectedISRs[enquiryId];
    if (!isrId) {
      toast.error('Please select an ISR');
      return;
    }

    setAssigningId(enquiryId);
    try {
      const res = await api.post('/leads/sam-head/assign-enquiry-to-isr', {
        enquiryId,
        isrId,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Enquiry assigned to ISR');
        setSelectedISRs(prev => {
          const next = { ...prev };
          delete next[enquiryId];
          return next;
        });
        fetchEnquiries();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign enquiry');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isAllowed) return null;

  const inputClass = 'h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm min-w-[140px]';

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Referrals" description="Assign customer referral enquiries to ISRs for calling">
        {enquiries.length > 0 && (
          <Badge className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-0 text-sm px-3 py-1">
            {enquiries.length} pending
          </Badge>
        )}
      </PageHeader>

      {/* Content */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No pending referral enquiries</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Customer referral enquiries will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {enquiries.map((enquiry) => (
              <div key={enquiry.id} className="px-4 sm:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {enquiry.companyName || 'No Company'}
                      </p>
                      <Badge className="border-0 text-[10px] px-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                        Customer Referral
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {enquiry.contactName}
                      </span>
                      {enquiry.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" />
                          {enquiry.phone}
                        </span>
                      )}
                      {enquiry.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {enquiry.city}{enquiry.state ? `, ${enquiry.state}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">
                        Referred by: {enquiry.referredByLead?.campaignData?.company || 'Unknown Customer'}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {enquiry.enquiryNumber}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(enquiry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {enquiry.requirements && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {enquiry.requirements}
                      </p>
                    )}
                  </div>

                  {/* Assign to ISR */}
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <select
                      value={selectedISRs[enquiry.id] || ''}
                      onChange={(e) => setSelectedISRs(prev => ({ ...prev, [enquiry.id]: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select ISR...</option>
                      {isrUsers.map((isr) => (
                        <option key={isr.id} value={isr.id}>{isr.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={() => handleAssign(enquiry.id)}
                      disabled={assigningId === enquiry.id || !selectedISRs[enquiry.id]}
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-3"
                    >
                      {assigningId === enquiry.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
