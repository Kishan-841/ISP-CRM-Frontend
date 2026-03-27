'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const emptyActionItem = () => ({
  srNo: 1,
  discussionDescription: '',
  actionOwner: '',
  planOfAction: '',
  closureDate: '',
  currentStatus: 'Open'
});

// Parse participants: handles JSON array or legacy comma-separated string
const parseParticipants = (val) => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: comma-separated names
  return val.split(',').map(n => ({ name: n.trim(), position: '' })).filter(p => p.name);
};

const participantsToForm = (val) => {
  const parsed = parseParticipants(val);
  return parsed.length > 0 ? parsed : [{ name: '', position: '' }];
};

export default function MOMDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const meetingId = params.id;

  const [meeting, setMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailDesignation, setEmailDesignation] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [emailBody, setEmailBody] = useState(`Dear Sir,\n\nGreetings from Gazon Communications India Ltd.!\n\nI appreciate you taking the time to meet with us. It was a pleasure to discuss with you about our services, scope of improvement, and future collaboration opportunities.\n\nYour insights and perspectives were incredibly valuable, and we are excited about the potential opportunities and collaborations discussed.\n\nWe look forward to working together and hope to have more productive meetings in the future.\n\nPlease find below the points which were discussed in the meeting.`);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const allowedRoles = ['SAM_EXECUTIVE', 'SAM_HEAD', 'SUPER_ADMIN', 'MASTER'];

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchMeeting = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/sam/meetings/${meetingId}`);
      setMeeting(response.data.meeting);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast.error('Failed to load MOM');
      router.push(user?.role === 'SAM_EXECUTIVE' ? '/dashboard/sam-executive/meetings' : '/dashboard/sam-head/meetings');
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, router]);

  useEffect(() => {
    if (user && allowedRoles.includes(user.role) && meetingId) {
      fetchMeeting();
    }
  }, [user, meetingId, fetchMeeting]);

  // Auto-open send email modal if navigated with ?sendEmail=true
  useEffect(() => {
    if (meeting && !meeting.momEmailSentAt && searchParams.get('sendEmail') === 'true') {
      openEmailModal();
      // Remove the query param so it doesn't re-trigger
      const base = user?.role === 'SAM_EXECUTIVE' ? '/dashboard/sam-executive/meetings' : '/dashboard/sam-head/meetings';
      router.replace(`${base}/${meetingId}`, { scroll: false });
    }
  }, [meeting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit MOM
  const openEditModal = () => {
    const meetingDate = new Date(meeting.meetingDate);
    const actionItems = Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0
      ? meeting.actionItems
      : [emptyActionItem()];

    setEditForm({
      meetingDate: meetingDate.toISOString().split('T')[0],
      meetingTime: meetingDate.toTimeString().slice(0, 5),
      meetingType: meeting.meetingType === 'VIRTUAL' ? 'ONLINE' : meeting.meetingType === 'IN_PERSON' ? 'PHYSICAL' : meeting.meetingType,
      location: meeting.location || '',
      clientParticipants: participantsToForm(meeting.clientParticipants),
      gazonParticipants: participantsToForm(meeting.gazonParticipants),
      actionItems
    });
    setShowEditModal(true);
  };

  const addEditActionItem = () => {
    setEditForm(f => ({
      ...f,
      actionItems: [...f.actionItems, { ...emptyActionItem(), srNo: f.actionItems.length + 1 }]
    }));
  };

  const removeEditActionItem = (index) => {
    setEditForm(f => ({
      ...f,
      actionItems: f.actionItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 }))
    }));
  };

  const updateEditActionItem = (index, field, value) => {
    setEditForm(f => ({
      ...f,
      actionItems: f.actionItems.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleUpdateMOM = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const meetingDateTime = new Date(`${editForm.meetingDate}T${editForm.meetingTime}`);
      const actionItems = editForm.actionItems.filter(item => (item.discussionDescription || item.issueDescription || '').trim());

      const clientP = editForm.clientParticipants.filter(p => p.name.trim());
      const gazonP = editForm.gazonParticipants.filter(p => p.name.trim());

      await api.put(`/sam/meetings/${meetingId}`, {
        meetingDate: meetingDateTime.toISOString(),
        meetingType: editForm.meetingType,
        location: editForm.location || null,
        clientParticipants: clientP.length > 0 ? JSON.stringify(clientP) : null,
        gazonParticipants: gazonP.length > 0 ? JSON.stringify(gazonP) : null,
        actionItems: actionItems.length > 0 ? actionItems : null
      });
      toast.success('MOM updated successfully');
      setShowEditModal(false);
      fetchMeeting();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update MOM');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch email preview
  const fetchEmailPreview = async (desig, ph, body) => {
    setIsLoadingPreview(true);
    try {
      const response = await api.post(`/sam/meetings/${meetingId}/email-preview`, {
        designation: desig || undefined,
        phone: ph || undefined,
        bodyText: body || undefined
      });
      setEmailPreviewHtml(response.data.html);
      if (response.data.subject && !emailSubject) {
        setEmailSubject(response.data.subject);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      setEmailPreviewHtml('<p style="padding:20px;color:#999;">Failed to load preview</p>');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const openEmailModal = () => {
    setEmailTo(meeting.customer?.campaignData?.email || '');
    setEmailCC('');
    setEmailSubject('');
    setEmailPreviewHtml('');
    setShowEmailModal(true);
    fetchEmailPreview(emailDesignation, emailPhone, emailBody);
  };

  const refreshPreview = () => {
    fetchEmailPreview(emailDesignation, emailPhone, emailBody);
  };

  // Send Email
  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    setIsSendingEmail(true);
    try {
      const ccList = emailCC.split(',').map(e => e.trim()).filter(e => e.length > 0);
      await api.post(`/sam/meetings/${meetingId}/send-mom`, {
        to: emailTo.trim(),
        cc: ccList,
        subject: emailSubject.trim() || undefined,
        designation: emailDesignation.trim() || undefined,
        phone: emailPhone.trim() || undefined,
        bodyText: emailBody.trim() || undefined
      });
      toast.success('MOM email sent successfully');
      setShowEmailModal(false);
      fetchMeeting();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMeetingTypeLabel = (type) => {
    const labels = { ONLINE: 'Online', PHYSICAL: 'Physical', VIRTUAL: 'Online', IN_PERSON: 'Physical', PHONE_CALL: 'Phone Call' };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    if (status === 'Closed') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    if (status === 'In Progress') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
  };

  if (!user || !allowedRoles.includes(user.role)) return null;

  const backPath = user.role === 'SAM_EXECUTIVE'
    ? '/dashboard/sam-executive/meetings'
    : '/dashboard/sam-head/meetings';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!meeting) return null;

  const actionItems = Array.isArray(meeting.actionItems) ? meeting.actionItems : [];

  return (
    <>
      {/* Page Header - compact */}
      <div className="mb-4">
        <button
          onClick={() => router.push(backPath)}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-1 inline-flex items-center"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to MOMs
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{meeting.title}</h1>
            {meeting.momEmailSentAt ? (
              <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs">
                Email Sent
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
                Email Pending
              </Badge>
            )}
          </div>
          {!meeting.momEmailSentAt && (
            <Button variant="outline" size="sm" onClick={openEditModal}>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit MOM
            </Button>
          )}
        </div>
      </div>

      {/* Top row: Meeting Details + Customer Info side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">Meeting Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Date</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{formatDate(meeting.meetingDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Time</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{formatTime(meeting.meetingDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{getMeetingTypeLabel(meeting.meetingType)}</p>
                </div>
                {meeting.location && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Venue</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{meeting.location}</p>
                  </div>
                )}
              </div>

              {/* Participants inline */}
              {(meeting.clientParticipants || meeting.gazonParticipants) && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {meeting.clientParticipants && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Client Participants</p>
                      <div className="flex flex-wrap gap-1">
                        {parseParticipants(meeting.clientParticipants).map((p, i) => (
                          <Badge key={i} variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs py-0">
                            {p.name}{p.position ? ` (${p.position})` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {meeting.gazonParticipants && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Gazon Participants</p>
                      <div className="flex flex-wrap gap-1">
                        {parseParticipants(meeting.gazonParticipants).map((p, i) => (
                          <Badge key={i} variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-xs py-0">
                            {p.name}{p.position ? ` (${p.position})` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Info - compact */}
        <div>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-full">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">Customer Info</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Company</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-semibold">{meeting.customer?.campaignData?.company || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Contact</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{meeting.customer?.campaignData?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{meeting.customer?.campaignData?.phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 truncate">{meeting.customer?.campaignData?.email || '-'}</p>
                </div>
                {meeting.customer?.actualPlanName && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Plan</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{meeting.customer.actualPlanName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Items - full width */}
      {actionItems.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Action Items ({actionItems.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-orange-50 dark:bg-orange-900/20 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase w-10">SR</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Discussion Description</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Action Owner</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Plan of Action</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase w-24">Closure Date</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {actionItems.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{item.srNo || i + 1}</td>
                      <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{item.discussionDescription || item.issueDescription}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{item.actionOwner || '-'}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{item.planOfAction || '-'}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{item.closureDate || '-'}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(item.currentStatus)}`}>
                          {item.currentStatus || 'Open'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Email Action */}
      <div className="mt-4 flex items-center justify-end gap-3">
        {meeting.momEmailSentAt && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Sent on {new Date(meeting.momEmailSentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(meeting.momEmailSentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <Button
          size="sm"
          onClick={openEmailModal}
          disabled={!!meeting.momEmailSentAt}
          className={meeting.momEmailSentAt
            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            : 'bg-orange-600 hover:bg-orange-700 text-white'}
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {meeting.momEmailSentAt ? 'Email Sent' : 'Send MOM Email'}
        </Button>
      </div>

      {/* Edit MOM Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-orange-50 dark:bg-orange-900/20">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit MOM</h2>
            </div>

            <div className="p-6">
              <form onSubmit={handleUpdateMOM} className="space-y-6">
                {/* Date/Time/Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={editForm.meetingDate}
                      onChange={(e) => setEditForm(f => ({ ...f, meetingDate: e.target.value }))}
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Time</label>
                    <Input
                      type="time"
                      value={editForm.meetingTime}
                      onChange={(e) => setEditForm(f => ({ ...f, meetingTime: e.target.value }))}
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Type</label>
                    <select
                      value={editForm.meetingType}
                      onChange={(e) => setEditForm(f => ({ ...f, meetingType: e.target.value }))}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                    >
                      <option value="ONLINE">Online</option>
                      <option value="PHYSICAL">Physical</option>
                    </select>
                  </div>
                </div>

                {/* Venue */}
                {editForm.meetingType === 'PHYSICAL' && (
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Venue</label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="Meeting venue/address"
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                )}

                {/* Participants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Client Participants</label>
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, clientParticipants: [...f.clientParticipants, { name: '', position: '' }] }))} className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Add</button>
                    </div>
                    <div className="space-y-2">
                      {editForm.clientParticipants.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={p.name}
                            onChange={(e) => setEditForm(f => ({ ...f, clientParticipants: f.clientParticipants.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item) }))}
                            placeholder="Name"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          <Input
                            value={p.position}
                            onChange={(e) => setEditForm(f => ({ ...f, clientParticipants: f.clientParticipants.map((item, idx) => idx === i ? { ...item, position: e.target.value } : item) }))}
                            placeholder="Position"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          {editForm.clientParticipants.length > 1 && (
                            <button type="button" onClick={() => setEditForm(f => ({ ...f, clientParticipants: f.clientParticipants.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500 shrink-0 text-lg leading-none">&times;</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Gazon Participants</label>
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, gazonParticipants: [...f.gazonParticipants, { name: '', position: '' }] }))} className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Add</button>
                    </div>
                    <div className="space-y-2">
                      {editForm.gazonParticipants.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={p.name}
                            onChange={(e) => setEditForm(f => ({ ...f, gazonParticipants: f.gazonParticipants.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item) }))}
                            placeholder="Name"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          <Input
                            value={p.position}
                            onChange={(e) => setEditForm(f => ({ ...f, gazonParticipants: f.gazonParticipants.map((item, idx) => idx === i ? { ...item, position: e.target.value } : item) }))}
                            placeholder="Position"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          {editForm.gazonParticipants.length > 1 && (
                            <button type="button" onClick={() => setEditForm(f => ({ ...f, gazonParticipants: f.gazonParticipants.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500 shrink-0 text-lg leading-none">&times;</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Action Items</label>
                    <Button type="button" variant="outline" size="sm" onClick={addEditActionItem}>
                      + Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-orange-50 dark:bg-orange-900/20">
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 w-12">SR</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300">Discussion Description</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 w-32">Action Owner</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300">Plan of Action</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 w-32">Closure Date</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 w-24">Status</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {editForm.actionItems.map((item, index) => (
                          <tr key={index}>
                            <td className="py-2 px-3 text-slate-500">{item.srNo}</td>
                            <td className="py-2 px-3">
                              <input
                                value={item.discussionDescription || item.issueDescription || ''}
                                onChange={(e) => updateEditActionItem(index, 'discussionDescription', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                value={item.actionOwner}
                                onChange={(e) => updateEditActionItem(index, 'actionOwner', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                value={item.planOfAction}
                                onChange={(e) => updateEditActionItem(index, 'planOfAction', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="date"
                                value={item.closureDate}
                                onChange={(e) => updateEditActionItem(index, 'closureDate', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.currentStatus}
                                onChange={(e) => updateEditActionItem(index, 'currentStatus', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              {editForm.actionItems.length > 1 && (
                                <button type="button" onClick={() => removeEditActionItem(index)} className="text-red-500 hover:text-red-700">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEmailModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-orange-50 dark:bg-orange-900/20">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Send MOM Email</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Email fields */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400 w-20 pt-2 font-medium">To:</span>
                  <Input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400 w-20 pt-2 font-medium">CC:</span>
                  <Input
                    value={emailCC}
                    onChange={(e) => setEmailCC(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="flex-1 h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400 w-20 pt-2 font-medium">Subject:</span>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject line"
                    className="flex-1 h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Email Body */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Email Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 resize-y"
                  placeholder="Greeting and introduction text..."
                />
              </div>

              {/* Signature fields */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-3">Signature Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Designation</label>
                    <Input
                      value={emailDesignation}
                      onChange={(e) => setEmailDesignation(e.target.value)}
                      placeholder="e.g. AGM Service Assurance"
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Phone</label>
                    <Input
                      value={emailPhone}
                      onChange={(e) => setEmailPhone(e.target.value)}
                      placeholder="e.g. +91 8956238065"
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshPreview}
                  className="mt-3"
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? 'Refreshing...' : 'Refresh Preview'}
                </Button>
              </div>

              {/* Email Preview */}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Email Preview</p>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white">
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                      <span className="ml-3 text-sm text-slate-500">Loading preview...</span>
                    </div>
                  ) : (
                    <iframe
                      srcDoc={emailPreviewHtml}
                      title="Email Preview"
                      className="w-full border-0"
                      style={{ height: '400px' }}
                      sandbox=""
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)}>Cancel</Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !emailTo.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
