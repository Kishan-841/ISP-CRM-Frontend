'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { X, Search } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const emptyActionItem = () => ({
  srNo: 1,
  discussionDescription: '',
  actionOwner: '',
  planOfAction: '',
  closureDate: '',
  currentStatus: 'Open'
});

export default function SAMExecutiveMeetings() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [meetings, setMeetings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef(null);

  // Email preview modal
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Add MOM modal
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [momForm, setMomForm] = useState({
    customerId: '',
    meetingDate: '',
    meetingTime: '',
    meetingType: 'ONLINE',
    location: '',
    clientParticipants: [{ name: '', position: '' }],
    gazonParticipants: [{ name: '', position: '' }],
    actionItems: [emptyActionItem()]
  });

  useEffect(() => {
    if (user && user.role !== 'SAM_EXECUTIVE') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);

      const response = await api.get(`/sam/meetings?${params}`);
      setMeetings(response.data.meetings);
      setTotal(response.data.total || response.data.meetings.length);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load MOMs');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await api.get('/sam/my-customers?limit=100');
      setCustomers(response.data.assignments.map(a => a.customer));
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'SAM_EXECUTIVE') {
      fetchMeetings();
      fetchCustomers();
    }
  }, [user, fetchMeetings, fetchCustomers]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      (c.campaignData?.company || '').toLowerCase().includes(q) ||
      (c.customerUsername || '').toLowerCase().includes(q) ||
      (c.circuitId || '').toLowerCase().includes(q)
    );
  });

  const openAddMOM = () => {
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setMomForm({
      customerId: '',
      meetingDate: new Date().toISOString().split('T')[0],
      meetingTime: '',
      meetingType: 'ONLINE',
      location: '',
      clientParticipants: [{ name: '', position: '' }],
      gazonParticipants: [{ name: '', position: '' }],
      actionItems: [emptyActionItem()]
    });
    setShowModal(true);
  };

  const addActionItem = () => {
    setMomForm(f => ({
      ...f,
      actionItems: [...f.actionItems, { ...emptyActionItem(), srNo: f.actionItems.length + 1 }]
    }));
  };

  const removeActionItem = (index) => {
    setMomForm(f => ({
      ...f,
      actionItems: f.actionItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 }))
    }));
  };

  const updateActionItem = (index, field, value) => {
    setMomForm(f => ({
      ...f,
      actionItems: f.actionItems.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleCreateMOM = async (e) => {
    e.preventDefault();
    if (!momForm.customerId || !momForm.meetingDate || !momForm.meetingTime) {
      toast.error('Please fill customer, date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const meetingDateTime = new Date(`${momForm.meetingDate}T${momForm.meetingTime}`);
      const actionItems = momForm.actionItems.filter(item => item.discussionDescription.trim());

      const clientP = momForm.clientParticipants.filter(p => p.name.trim());
      const gazonP = momForm.gazonParticipants.filter(p => p.name.trim());

      await api.post('/sam/meetings', {
        customerId: momForm.customerId,
        meetingDate: meetingDateTime.toISOString(),
        meetingType: momForm.meetingType,
        location: momForm.location || null,
        clientParticipants: clientP.length > 0 ? JSON.stringify(clientP) : null,
        gazonParticipants: gazonP.length > 0 ? JSON.stringify(gazonP) : null,
        actionItems: actionItems.length > 0 ? actionItems : null
      });

      toast.success('MOM created successfully');
      setShowModal(false);
      fetchMeetings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create MOM');
    } finally {
      setIsSubmitting(false);
    }
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

  const viewSentEmail = async (meetingId) => {
    setIsLoadingPreview(true);
    setShowEmailPreview(true);
    try {
      const response = await api.post(`/sam/meetings/${meetingId}/email-preview`, {});
      setEmailPreviewHtml(response.data.html);
    } catch (error) {
      toast.error('Failed to load email preview');
      setShowEmailPreview(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (!user || user.role !== 'SAM_EXECUTIVE') return null;

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/sam-executive')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
      </div>
      <PageHeader title="Meeting MOM" description="Record and manage your meeting minutes">
        <Button
          onClick={openAddMOM}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add MOM
        </Button>
      </PageHeader>

      {/* Meetings Table */}
      <DataTable
        title="MOMs"
        totalCount={total}
        columns={[
          {
            key: 'date',
            label: 'Date',
            render: (row) => (
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatDate(row.meetingDate)}</span>
            )
          },
          {
            key: 'time',
            label: 'Time',
            render: (row) => (
              <span className="text-slate-700 dark:text-slate-300">{formatTime(row.meetingDate)}</span>
            )
          },
          {
            key: 'customer',
            label: 'Customer',
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {row.customer?.campaignData?.company || '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {row.customer?.campaignData?.name || '-'}
                </p>
              </div>
            )
          },
          {
            key: 'type',
            label: 'Type',
            render: (row) => (
              <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {getMeetingTypeLabel(row.meetingType)}
              </Badge>
            )
          },
          {
            key: 'actionItems',
            label: 'Action Items',
            render: (row) => {
              const count = Array.isArray(row.actionItems) ? row.actionItems.length : 0;
              return count > 0 ? (
                <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                  {count} item{count > 1 ? 's' : ''}
                </Badge>
              ) : (
                <span className="text-slate-400">-</span>
              );
            }
          },
          {
            key: 'emailStatus',
            label: 'Email Status',
            render: (row) => row.momEmailSentAt ? (
              <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Sent
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                Pending
              </Badge>
            )
          }
        ]}
        data={meetings}
        loading={isLoading}
        pagination={true}
        defaultPageSize={10}
        searchable={true}
        searchPlaceholder="Search by customer..."
        searchKeys={['customer.campaignData.company', 'customer.campaignData.name']}
        onRowClick={(row) => router.push(`/dashboard/sam-executive/meetings/${row.id}`)}
        emptyMessage="No MOMs found"
        emptySubtitle='Click "Add MOM" to record your first meeting minutes.'
        filters={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
              placeholder="From"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
              placeholder="To"
            />
            {(fromDate || toDate) && (
              <Button variant="outline" size="sm" className="h-9" onClick={() => { setFromDate(''); setToDate(''); }}>
                Clear
              </Button>
            )}
          </div>
        }
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/sam-executive/meetings/${row.id}`)}
            >
              View
            </Button>
            {row.momEmailSentAt ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewSentEmail(row.id)}
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                View Email
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/sam-executive/meetings/${row.id}?sendEmail=true`)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Mail
              </Button>
            )}
          </div>
        )}
      />

      {/* Email Preview Modal */}
      {showEmailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEmailPreview(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sent Email Preview</h2>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <iframe
                  srcDoc={emailPreviewHtml}
                  className="w-full h-[70vh] border border-slate-200 dark:border-slate-700 rounded-lg bg-white"
                  sandbox="allow-same-origin"
                  title="Email Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add MOM Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-orange-50 dark:bg-orange-900/20">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add MOM</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Record minutes of a meeting</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateMOM} className="space-y-6">
                {/* Customer + Date/Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2" ref={customerSearchRef}>
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Customer *</label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                            if (!e.target.value) setMomForm(f => ({ ...f, customerId: '' }));
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          placeholder="Search by company, username, circuit ID..."
                          className="w-full h-10 pl-9 pr-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-sm"
                        />
                        {customerSearch && (
                          <button
                            type="button"
                            onClick={() => { setCustomerSearch(''); setMomForm(f => ({ ...f, customerId: '' })); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {showCustomerDropdown && (
                        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-lg">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500">No customers found</div>
                          ) : (
                            filteredCustomers.slice(0, 50).map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => {
                                  setMomForm(f => ({ ...f, customerId: customer.id }));
                                  setCustomerSearch(customer.campaignData?.company || customer.customerUsername || 'Unknown');
                                  setShowCustomerDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 ${momForm.customerId === customer.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                              >
                                <div className="font-medium text-slate-900 dark:text-slate-100">{customer.campaignData?.company || 'Unknown'}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-3">
                                  {customer.customerUsername && <span>Username: {customer.customerUsername}</span>}
                                  {customer.circuitId && <span>Circuit: {customer.circuitId}</span>}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {momForm.customerId && (
                      <input type="hidden" name="customerId" value={momForm.customerId} required />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Date *</label>
                    <Input
                      type="date"
                      value={momForm.meetingDate}
                      onChange={(e) => setMomForm(f => ({ ...f, meetingDate: e.target.value }))}
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Time *</label>
                    <Input
                      type="time"
                      value={momForm.meetingTime}
                      onChange={(e) => setMomForm(f => ({ ...f, meetingTime: e.target.value }))}
                      className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      required
                    />
                  </div>
                </div>

                {/* Type + Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Meeting Type</label>
                    <select
                      value={momForm.meetingType}
                      onChange={(e) => setMomForm(f => ({ ...f, meetingType: e.target.value }))}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                    >
                      <option value="ONLINE">Online</option>
                      <option value="PHYSICAL">Physical</option>
                    </select>
                  </div>
                  {momForm.meetingType === 'PHYSICAL' && (
                    <div className="space-y-2">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Venue</label>
                      <Input
                        value={momForm.location}
                        onChange={(e) => setMomForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="Meeting venue/address"
                        className="h-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  )}
                </div>

                {/* Participants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Client Participants</label>
                      <button type="button" onClick={() => setMomForm(f => ({ ...f, clientParticipants: [...f.clientParticipants, { name: '', position: '' }] }))} className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Add</button>
                    </div>
                    <div className="space-y-2">
                      {momForm.clientParticipants.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={p.name}
                            onChange={(e) => setMomForm(f => ({ ...f, clientParticipants: f.clientParticipants.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item) }))}
                            placeholder="Name"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          <Input
                            value={p.position}
                            onChange={(e) => setMomForm(f => ({ ...f, clientParticipants: f.clientParticipants.map((item, idx) => idx === i ? { ...item, position: e.target.value } : item) }))}
                            placeholder="Position"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          {momForm.clientParticipants.length > 1 && (
                            <button type="button" onClick={() => setMomForm(f => ({ ...f, clientParticipants: f.clientParticipants.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Gazon Participants</label>
                      <button type="button" onClick={() => setMomForm(f => ({ ...f, gazonParticipants: [...f.gazonParticipants, { name: '', position: '' }] }))} className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Add</button>
                    </div>
                    <div className="space-y-2">
                      {momForm.gazonParticipants.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={p.name}
                            onChange={(e) => setMomForm(f => ({ ...f, gazonParticipants: f.gazonParticipants.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item) }))}
                            placeholder="Name"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          <Input
                            value={p.position}
                            onChange={(e) => setMomForm(f => ({ ...f, gazonParticipants: f.gazonParticipants.map((item, idx) => idx === i ? { ...item, position: e.target.value } : item) }))}
                            placeholder="Position"
                            className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          {momForm.gazonParticipants.length > 1 && (
                            <button type="button" onClick={() => setMomForm(f => ({ ...f, gazonParticipants: f.gazonParticipants.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
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
                    <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
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
                        {momForm.actionItems.map((item, index) => (
                          <tr key={index}>
                            <td className="py-2 px-3 text-slate-500">{item.srNo}</td>
                            <td className="py-2 px-3">
                              <input
                                value={item.discussionDescription}
                                onChange={(e) => updateActionItem(index, 'discussionDescription', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                                placeholder="Describe discussion..."
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                value={item.actionOwner}
                                onChange={(e) => updateActionItem(index, 'actionOwner', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                                placeholder="Owner"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                value={item.planOfAction}
                                onChange={(e) => updateActionItem(index, 'planOfAction', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                                placeholder="Plan..."
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="date"
                                value={item.closureDate}
                                onChange={(e) => updateActionItem(index, 'closureDate', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.currentStatus}
                                onChange={(e) => updateActionItem(index, 'currentStatus', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-sm"
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              {momForm.actionItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeActionItem(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
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
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save MOM'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
