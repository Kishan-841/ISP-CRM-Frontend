'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import {
  MessageSquare,
  Plus,
  Send,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  MessageCircle,
  X,
  FileText,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const COMMUNICATION_TYPES = {
  INITIAL_OUTAGE: { label: 'Initial Outage', color: 'bg-red-100 text-red-800' },
  INTERIM_UPDATE: { label: 'Interim Update', color: 'bg-orange-100 text-orange-800' },
  ETR_UPDATE: { label: 'ETR Update', color: 'bg-yellow-100 text-yellow-800' },
  RESTORATION_CONFIRMED: { label: 'Restoration Confirmed', color: 'bg-green-100 text-green-800' },
  GENERAL_UPDATE: { label: 'General Update', color: 'bg-blue-100 text-blue-800' },
  SERVICE_NOTIFICATION: { label: 'Service Notification', color: 'bg-orange-100 text-orange-800' },
  BILLING_REMINDER: { label: 'Billing Reminder', color: 'bg-indigo-100 text-indigo-800' },
  CONTRACT_RENEWAL: { label: 'Contract Renewal', color: 'bg-pink-100 text-pink-800' }
};

const COMMUNICATION_CHANNELS = {
  EMAIL: { label: 'Email', icon: Mail },
  SMS: { label: 'SMS', icon: MessageCircle },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare },
  PHONE_CALL: { label: 'Phone Call', icon: Phone }
};

const COMMUNICATION_STATUS = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  SENT: { label: 'Sent', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' }
};

export default function CommunicationsPage() {
  const { user } = useAuthStore();
  const [communications, setCommunications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterOutage, setFilterOutage] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    communicationType: 'GENERAL_UPDATE',
    subject: '',
    content: '',
    channel: 'EMAIL',
    ticketNumber: '',
    isOutageRelated: false,
    etaRestoration: '',
    sentTo: '',
    ccTo: ''
  });

  const fetchCommunications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('communicationType', filterType);
      if (filterOutage) params.append('isOutageRelated', 'true');

      const response = await api.get(`/sam/communications?${params}`);
      setCommunications(response.data.communications || []);
    } catch (error) {
      console.error('Fetch communications error:', error);
      toast.error('Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterOutage]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await api.get('/sam/my-customers?limit=100');
      setCustomers(response.data.assignments || []);
    } catch (error) {
      console.error('Fetch customers error:', error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/sam/communications/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Fetch templates error:', error);
    }
  }, []);

  useEffect(() => {
    fetchCommunications();
    fetchCustomers();
    fetchTemplates();
  }, [fetchCommunications, fetchCustomers, fetchTemplates]);

  const handleCreateCommunication = async (e) => {
    e.preventDefault();

    if (!formData.customerId || !formData.subject || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        sentTo: formData.sentTo ? formData.sentTo.split(',').map(e => e.trim()).filter(Boolean) : [],
        ccTo: formData.ccTo ? formData.ccTo.split(',').map(e => e.trim()).filter(Boolean) : [],
        etaRestoration: formData.etaRestoration || null
      };

      await api.post('/sam/communications', payload);
      toast.success('Communication created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchCommunications();
    } catch (error) {
      console.error('Create communication error:', error);
      toast.error(error.response?.data?.message || 'Failed to create communication');
    }
  };

  const handleSendCommunication = async (id) => {
    try {
      await api.post(`/sam/communications/${id}/send`, { sendEmail: true });
      toast.success('Communication sent successfully');
      fetchCommunications();
      setShowViewModal(false);
    } catch (error) {
      console.error('Send communication error:', error);
      toast.error(error.response?.data?.message || 'Failed to send communication');
    }
  };

  const handleDeleteCommunication = async (id) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      await api.delete(`/sam/communications/${id}`);
      toast.success('Communication deleted successfully');
      fetchCommunications();
    } catch (error) {
      console.error('Delete communication error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete communication');
    }
  };

  const applyTemplate = (templateType) => {
    const template = templates.find(t => t.type === templateType);
    if (template) {
      setFormData(prev => ({
        ...prev,
        communicationType: templateType,
        subject: template.subject,
        content: template.content,
        isOutageRelated: ['INITIAL_OUTAGE', 'INTERIM_UPDATE', 'ETR_UPDATE', 'RESTORATION_CONFIRMED'].includes(templateType)
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      communicationType: 'GENERAL_UPDATE',
      subject: '',
      content: '',
      channel: 'EMAIL',
      ticketNumber: '',
      isOutageRelated: false,
      etaRestoration: '',
      sentTo: '',
      ccTo: ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const totalCommunications = communications.length;
  const draftCount = communications.filter(c => c.status === 'DRAFT').length;
  const sentCount = communications.filter(c => c.status === 'SENT').length;
  const outageCount = communications.filter(c => c.isOutageRelated).length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Communication History" description="Track and manage customer communications">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Communication
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCommunications}</p>
                <p className="text-xs text-slate-500">Total Communications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{draftCount}</p>
                <p className="text-xs text-slate-500">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sentCount}</p>
                <p className="text-xs text-slate-500">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{outageCount}</p>
                <p className="text-xs text-slate-500">Outage Related</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters:</span>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="">All Types</option>
              {Object.entries(COMMUNICATION_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filterOutage}
                onChange={(e) => setFilterOutage(e.target.checked)}
                className="rounded"
              />
              Outage Related Only
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCommunications}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Communications List */}
      <Card>
        <CardHeader>
          <CardTitle>Communications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : communications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No communications found. Create your first communication!
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => {
                const typeInfo = COMMUNICATION_TYPES[comm.communicationType] || COMMUNICATION_TYPES.GENERAL_UPDATE;
                const statusInfo = COMMUNICATION_STATUS[comm.status] || COMMUNICATION_STATUS.DRAFT;
                const ChannelIcon = COMMUNICATION_CHANNELS[comm.channel]?.icon || Mail;

                return (
                  <div
                    key={comm.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          {comm.isOutageRelated && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Outage
                            </Badge>
                          )}
                          <ChannelIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {comm.subject}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {comm.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>Customer: {comm.customer?.campaignData?.company || comm.customer?.customerUsername}</span>
                          <span>Created: {formatDate(comm.createdAt)}</span>
                          {comm.sentAt && <span>Sent: {formatDate(comm.sentAt)}</span>}
                          {comm.ticketNumber && <span>Ticket: {comm.ticketNumber}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCommunication(comm);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {comm.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleSendCommunication(comm.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteCommunication(comm.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Communication Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
              <h3 className="text-lg font-semibold">New Communication</h3>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateCommunication} className="p-4 space-y-4">
              {/* Customer Selection */}
              <div>
                <Label>Customer *</Label>
                <select
                  value={formData.customerId}
                  onChange={(e) => {
                    const customer = customers.find(c => c.customer.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      customerId: e.target.value,
                      sentTo: customer?.customer?.campaignData?.email || ''
                    }));
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.customer.id} value={c.customer.id}>
                      {c.customer.campaignData?.company || c.customer.customerUsername}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div>
                <Label>Use Template</Label>
                <select
                  onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">Select Template (optional)</option>
                  {templates.map((t) => (
                    <option key={t.type} value={t.type}>
                      {COMMUNICATION_TYPES[t.type]?.label || t.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Communication Type */}
                <div>
                  <Label>Type *</Label>
                  <select
                    value={formData.communicationType}
                    onChange={(e) => setFormData(prev => ({ ...prev, communicationType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                  >
                    {Object.entries(COMMUNICATION_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                {/* Channel */}
                <div>
                  <Label>Channel</Label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData(prev => ({ ...prev, channel: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                  >
                    {Object.entries(COMMUNICATION_CHANNELS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter subject"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter message content"
                  rows={6}
                  required
                />
              </div>

              {/* Outage Related */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isOutageRelated}
                    onChange={(e) => setFormData(prev => ({ ...prev, isOutageRelated: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Outage Related</span>
                </label>
              </div>

              {formData.isOutageRelated && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ticket Number</Label>
                    <Input
                      value={formData.ticketNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticketNumber: e.target.value }))}
                      placeholder="Enter ticket number"
                    />
                  </div>
                  <div>
                    <Label>ETA Restoration</Label>
                    <Input
                      type="datetime-local"
                      value={formData.etaRestoration}
                      onChange={(e) => setFormData(prev => ({ ...prev, etaRestoration: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {formData.channel === 'EMAIL' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Send To (comma separated)</Label>
                    <Input
                      value={formData.sentTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, sentTo: e.target.value }))}
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </div>
                  <div>
                    <Label>CC (comma separated)</Label>
                    <Input
                      value={formData.ccTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, ccTo: e.target.value }))}
                      placeholder="cc1@example.com, cc2@example.com"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                  Save as Draft
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Communication Modal */}
      {showViewModal && selectedCommunication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
              <h3 className="text-lg font-semibold">Communication Details</h3>
              <button onClick={() => { setShowViewModal(false); setSelectedCommunication(null); }}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={COMMUNICATION_TYPES[selectedCommunication.communicationType]?.color}>
                  {COMMUNICATION_TYPES[selectedCommunication.communicationType]?.label}
                </Badge>
                <Badge className={COMMUNICATION_STATUS[selectedCommunication.status]?.color}>
                  {COMMUNICATION_STATUS[selectedCommunication.status]?.label}
                </Badge>
                {selectedCommunication.isOutageRelated && (
                  <Badge className="bg-red-100 text-red-800">Outage Related</Badge>
                )}
              </div>

              <div>
                <Label className="text-slate-500">Customer</Label>
                <p className="font-medium">
                  {selectedCommunication.customer?.campaignData?.company || selectedCommunication.customer?.customerUsername}
                </p>
              </div>

              <div>
                <Label className="text-slate-500">Subject</Label>
                <p className="font-medium">{selectedCommunication.subject}</p>
              </div>

              <div>
                <Label className="text-slate-500">Content</Label>
                <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-pre-wrap">
                  {selectedCommunication.content}
                </div>
              </div>

              {selectedCommunication.ticketNumber && (
                <div>
                  <Label className="text-slate-500">Ticket Number</Label>
                  <p>{selectedCommunication.ticketNumber}</p>
                </div>
              )}

              {selectedCommunication.etaRestoration && (
                <div>
                  <Label className="text-slate-500">ETA Restoration</Label>
                  <p>{formatDate(selectedCommunication.etaRestoration)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-500">Channel</Label>
                  <p>{COMMUNICATION_CHANNELS[selectedCommunication.channel]?.label}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Created At</Label>
                  <p>{formatDate(selectedCommunication.createdAt)}</p>
                </div>
              </div>

              {selectedCommunication.sentTo?.length > 0 && (
                <div>
                  <Label className="text-slate-500">Sent To</Label>
                  <p>{selectedCommunication.sentTo.join(', ')}</p>
                </div>
              )}

              {selectedCommunication.sentAt && (
                <div>
                  <Label className="text-slate-500">Sent At</Label>
                  <p>{formatDate(selectedCommunication.sentAt)}</p>
                </div>
              )}

              {selectedCommunication.status === 'DRAFT' && (
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteCommunication(selectedCommunication.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleSendCommunication(selectedCommunication.id)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
