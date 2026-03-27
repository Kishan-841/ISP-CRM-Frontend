'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCampaignStore, useLeadStore, useProductStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  Plus,
  Upload,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  PhoneCall,
  Clock,
  CheckCircle,
  X,
  Timer,
  MessageSquare,
  Calendar,
  UserPlus,
  Trash2,
  Database,
  AlertTriangle,
  Users
} from 'lucide-react';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

export default function SAMDataPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    assignedCampaigns,
    campaignData,
    isLoading,
    fetchAssignedCampaigns,
    fetchCampaignData,
    createSelfCampaign,
    deleteSelfCampaign,
    deleteCampaignData,
    startCall,
    endCall,
    updateDataStatus,
    addRemark
  } = useCampaignStore();
  const { products, fetchProducts } = useProductStore();
  const { bdmUsers, fetchBDMUsers, convertToLead } = useLeadStore();

  // Tab state
  const [activeTab, setActiveTab] = useState('add');

  // Form state
  const [addMode, setAddMode] = useState('single'); // 'single' or 'bulk'
  const [dataSetName, setDataSetName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    title: '',
    email: '',
    industry: '',
    city: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk upload state
  const [bulkData, setBulkData] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // Self campaigns state
  const [selfCampaigns, setSelfCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // Calling state
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [callTimerInterval, setCallTimerInterval] = useState(null);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [isDisposing, setIsDisposing] = useState(false);

  // Call Later state
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');

  // Interested state - assign to BDM
  const [selectedBDM, setSelectedBDM] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [requirements, setRequirements] = useState('');

  // Manage data tab state
  const [manageCampaignId, setManageCampaignId] = useState('');
  const [isLoadingManageData, setIsLoadingManageData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSAM = user?.role === 'SAM' || user?.role === 'MASTER';

  // Redirect non-SAM users
  useEffect(() => {
    if (user && !isSAM) {
      router.push('/dashboard');
    }
  }, [user, isSAM, router]);

  // Fetch initial data
  useEffect(() => {
    if (isSAM) {
      fetchAssignedCampaigns();
      fetchProducts();
      fetchBDMUsers();
    }
  }, [isSAM, fetchAssignedCampaigns, fetchProducts, fetchBDMUsers]);

  // Filter self campaigns
  useEffect(() => {
    const filtered = assignedCampaigns.filter(c =>
      c.type === 'SELF' && c.name.startsWith('[SAM Self]')
    );
    setSelfCampaigns(filtered);

    if (filtered.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(filtered[0].id);
    }
  }, [assignedCampaigns]);

  // Fetch campaign data when selection changes
  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignData(selectedCampaignId, 1, 500);
    }
  }, [selectedCampaignId, fetchCampaignData]);

  // Call timer effect
  useEffect(() => {
    return () => {
      if (callTimerInterval) {
        clearInterval(callTimerInterval);
      }
    };
  }, [callTimerInterval]);

  // Get pending and called data
  const pendingData = campaignData.filter(d => d.status === 'NEW');
  const calledData = campaignData.filter(d => d.status !== 'NEW');

  // Stats
  const stats = {
    total: campaignData.length,
    pending: pendingData.length,
    called: calledData.length
  };

  // Format timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const mappedData = data.map(row => ({
          name: row.name || row.Name || row.NAME || row['Full Name'] || '',
          company: row.company || row.Company || row.COMPANY || row['Company Name'] || '',
          phone: String(row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || row['Phone Number'] || ''),
          title: row.title || row.Title || row.TITLE || row.designation || row.Designation || row['Job Title'] || '',
          email: row.email || row.Email || row.EMAIL || '',
          industry: row.industry || row.Industry || row.INDUSTRY || '',
          city: row.city || row.City || row.CITY || ''
        }));

        setBulkData(mappedData);
        setFormError('');
      } catch (err) {
        setFormError('Failed to parse file. Please check the format.');
        setBulkData([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      if (!dataSetName.trim()) {
        setFormError('Data Set Name is required.');
        setIsSubmitting(false);
        return;
      }

      // Validate single entry
      if (addMode === 'single') {
        if (!formData.name?.trim()) {
          setFormError('Full Name is required.');
          setIsSubmitting(false);
          return;
        }
        if (!formData.company?.trim()) {
          setFormError('Company is required.');
          setIsSubmitting(false);
          return;
        }
        if (!formData.phone?.trim()) {
          setFormError('Phone number is required.');
          setIsSubmitting(false);
          return;
        }
        if (!formData.title?.trim()) {
          setFormError('Designation is required.');
          setIsSubmitting(false);
          return;
        }
      }

      const dataToSubmit = addMode === 'single'
        ? [{
            name: formData.name.trim(),
            company: formData.company.trim(),
            phone: formData.phone.trim(),
            title: formData.title.trim(),
            email: formData.email?.trim() || '',
            industry: formData.industry?.trim() || '',
            city: formData.city?.trim() || ''
          }]
        : bulkData;

      if (dataToSubmit.length === 0) {
        setFormError('No data to submit.');
        setIsSubmitting(false);
        return;
      }

      const result = await createSelfCampaign(dataSetName.trim(), 'Self Generated', dataToSubmit);

      if (result.success) {
        setFormSuccess(`Successfully added ${dataToSubmit.length} contact(s)!`);
        setFormData({ name: '', company: '', phone: '', title: '', email: '', industry: '', city: '' });
        setBulkData([]);
        setFileName('');
        setDataSetName('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (result.campaign?.id) {
          setSelectedCampaignId(result.campaign.id);
          setSelfCampaigns(prev => {
            if (!prev.find(c => c.id === result.campaign.id)) {
              return [result.campaign, ...prev];
            }
            return prev;
          });
        }

        setTimeout(() => {
          router.push('/dashboard/sam-calling-queue');
        }, 1500);
      } else {
        setFormError(result.error || 'Failed to add data.');
      }
    } catch (err) {
      console.error('Add data error:', err);
      setFormError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start call
  const handleStartCall = async (dataItem) => {
    try {
      const result = await startCall(dataItem.id);
      if (result.success) {
        setActiveCall({
          ...dataItem,
          callLogId: result.callLog.id,
          fullPhone: result.phone
        });
        setCallTimer(0);

        const interval = setInterval(() => {
          setCallTimer(prev => prev + 1);
        }, 1000);
        setCallTimerInterval(interval);
      } else {
        toast.error(result.error || 'Failed to start call');
      }
    } catch (err) {
      toast.error('Failed to start call');
    }
  };

  // End call - show disposition
  const handleEndCall = () => {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      setCallTimerInterval(null);
    }
    setShowDispositionModal(true);
  };

  // Submit disposition
  const handleDisposition = async () => {
    if (!selectedStatus) {
      toast.error('Please select a status');
      return;
    }

    if (selectedStatus === 'CALL_LATER' && (!callLaterDate || !callLaterTime)) {
      toast.error('Please select date and time for callback');
      return;
    }

    if (selectedStatus === 'INTERESTED') {
      if (!selectedBDM) {
        toast.error('Please select a BDM to assign');
        return;
      }
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product');
        return;
      }
    }

    setIsDisposing(true);

    try {
      // End the call first
      // Build callLaterAt datetime if CALL_LATER is selected
      const callLaterAt = selectedStatus === 'CALL_LATER' && callLaterDate && callLaterTime
        ? new Date(`${callLaterDate}T${callLaterTime}`).toISOString()
        : null;

      await endCall(activeCall.callLogId, selectedStatus, remark, callLaterAt);

      // Add remark if present
      if (remark.trim()) {
        await addRemark(activeCall.id, remark);
      }

      // If interested, convert to lead and assign to BDM
      if (selectedStatus === 'INTERESTED') {
        const leadResult = await convertToLead({
          campaignDataId: activeCall.id,
          assignedToId: selectedBDM,
          productIds: selectedProducts,
          requirements: requirements,
          type: 'PUSHED_TO_PRESALES'
        });

        if (leadResult.success) {
          toast.success('Lead created and assigned to BDM!');
        } else {
          toast.error(leadResult.error || 'Failed to create lead');
        }
      } else {
        toast.success('Call completed');
      }

      // Refresh data
      await fetchCampaignData(selectedCampaignId, 1, 500);

      // Reset state
      setActiveCall(null);
      setCallTimer(0);
      setShowDispositionModal(false);
      setSelectedStatus('');
      setRemark('');
      setCallLaterDate('');
      setCallLaterTime('');
      setSelectedBDM('');
      setSelectedProducts([]);
      setRequirements('');
    } catch (err) {
      console.error('Disposition error:', err);
      toast.error('Failed to save disposition');
    } finally {
      setIsDisposing(false);
    }
  };

  // Handle campaign change for manage tab
  const handleManageCampaignChange = async (campaignId) => {
    setManageCampaignId(campaignId);
    if (campaignId) {
      setIsLoadingManageData(true);
      await fetchCampaignData(campaignId, 1, 500);
      setIsLoadingManageData(false);
    }
  };

  // Handle tab change
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if ((tab === 'queue' || tab === 'called') && selectedCampaignId && manageCampaignId && manageCampaignId !== selectedCampaignId) {
      await fetchCampaignData(selectedCampaignId, 1, 500);
    }
  };

  // Handle delete campaign
  const handleDeleteCampaign = async () => {
    if (!showDeleteConfirm || showDeleteConfirm.type !== 'campaign') return;

    setIsDeleting(true);
    const result = await deleteSelfCampaign(showDeleteConfirm.id);

    if (result.success) {
      toast.success('Data set deleted successfully');
      setSelfCampaigns(prev => prev.filter(c => c.id !== showDeleteConfirm.id));
      if (manageCampaignId === showDeleteConfirm.id) {
        setManageCampaignId('');
      }
      if (selectedCampaignId === showDeleteConfirm.id) {
        const remaining = selfCampaigns.filter(c => c.id !== showDeleteConfirm.id);
        setSelectedCampaignId(remaining.length > 0 ? remaining[0].id : '');
      }
      await fetchAssignedCampaigns();
    } else {
      toast.error(result.error || 'Failed to delete data set');
    }

    setIsDeleting(false);
    setShowDeleteConfirm(null);
  };

  // Handle delete single data
  const handleDeleteData = async () => {
    if (!showDeleteConfirm || showDeleteConfirm.type !== 'data') return;

    setIsDeleting(true);
    const result = await deleteCampaignData(showDeleteConfirm.id);

    if (result.success) {
      toast.success('Contact deleted successfully');
      if (manageCampaignId) {
        await fetchCampaignData(manageCampaignId, 1, 500);
      }
    } else {
      toast.error(result.error || 'Failed to delete contact');
    }

    setIsDeleting(false);
    setShowDeleteConfirm(null);
  };

  // Status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'CALLED': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
      case 'INTERESTED': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'NOT_INTERESTED': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'NOT_REACHABLE': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'WRONG_NUMBER': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'CALL_LATER': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  if (!isSAM) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="SAM Self Data" description="Add contacts, call them, and assign interested leads to BDM" />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Contacts</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <PhoneCall className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Called</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.called}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'add', label: 'Add Data', icon: Plus },
          { key: 'called', label: 'Called', count: calledData.length, icon: CheckCircle, variant: 'success' },
          { key: 'manage', label: 'Manage Data', icon: Database, variant: 'info' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Add Data Tab */}
      {activeTab === 'add' && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add New Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAddMode('single')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'single'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <User size={16} className="inline mr-2" />
                Single Entry
              </button>
              <button
                onClick={() => setAddMode('bulk')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'bulk'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Upload size={16} className="inline mr-2" />
                Bulk Upload
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Data Set Name */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Data Set Name *</Label>
                <Input
                  value={dataSetName}
                  onChange={(e) => setDataSetName(e.target.value)}
                  placeholder="e.g., January Cold Calls"
                  className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              {addMode === 'single' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter full name"
                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">Company <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Company name"
                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">Phone <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Phone number"
                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">Designation <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Manager, Director"
                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">Industry</Label>
                    <Input
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g., IT, Manufacturing"
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Upload Excel/CSV File</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 transition-colors"
                  >
                    <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                    {fileName ? (
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">{fileName}</p>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Click to upload Excel or CSV file
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Columns: name, company, phone, title, email, industry, city
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  {bulkData.length > 0 && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                      {bulkData.length} contacts ready to upload
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Add {addMode === 'single' ? 'Contact' : `${bulkData.length || 0} Contacts`}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calling Queue Tab */}
      {activeTab === 'queue' && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Pending Calls ({pendingData.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingData.length === 0 ? (
              <div className="text-center py-12">
                <PhoneCall className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No pending calls</p>
                <p className="text-slate-400 text-xs mt-1">Add some contacts to start calling</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Contact</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Company</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Phone</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Location</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingData.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{item.name || '-'}</p>
                          {item.email && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.email}</p>
                          )}
                        </td>
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">{item.company || '-'}</span>
                        </td>
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">{item.phone?.slice(0, -4)}****</span>
                        </td>
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">{item.city || '-'}</span>
                        </td>
                        <td className="py-5 px-6">
                          {activeCall?.id === item.id ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <Timer className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
                                <span className="font-mono text-red-600 dark:text-red-400">{formatTime(callTimer)}</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={handleEndCall}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                End Call
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleStartCall(item)}
                              disabled={!!activeCall}
                              className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white disabled:opacity-50"
                            >
                              Call Now
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Called Tab */}
      {activeTab === 'called' && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Called Contacts ({calledData.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {calledData.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No calls made yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Contact</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Company</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Remarks</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calledData.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{item.name || '-'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.phone}</p>
                        </td>
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">{item.company || '-'}</span>
                        </td>
                        <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700 max-w-xs">
                          <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {item.remarks?.[0]?.text || '-'}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          <Badge className={`${getStatusBadgeColor(item.status)} border-0`}>
                            {item.status?.replace(/_/g, ' ') || 'CALLED'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manage Data Tab */}
      {activeTab === 'manage' && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Manage Your Data Sets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selfCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No data sets found</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1 max-w-md">
                    <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Select Data Set</Label>
                    <select
                      value={manageCampaignId}
                      onChange={(e) => handleManageCampaignChange(e.target.value)}
                      className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                    >
                      <option value="">Choose a data set...</option>
                      {selfCampaigns.map(campaign => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name.replace('[SAM Self] ', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                  {manageCampaignId && (
                    <Button
                      onClick={() => {
                        const campaign = selfCampaigns.find(c => c.id === manageCampaignId);
                        setShowDeleteConfirm({
                          type: 'campaign',
                          id: manageCampaignId,
                          name: campaign?.name.replace('[SAM Self] ', '') || 'this data set'
                        });
                      }}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete Entire Set
                    </Button>
                  )}
                </div>

                {manageCampaignId && (
                  <div className="mt-6">
                    {isLoadingManageData ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                      </div>
                    ) : campaignData.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No contacts in this data set</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Name</th>
                              <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Company</th>
                              <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Phone</th>
                              <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Action</th>
                              <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaignData.map((item) => (
                              <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.name || '-'}</span>
                                </td>
                                <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                                  <span className="text-slate-600 dark:text-slate-400">{item.company || '-'}</span>
                                </td>
                                <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                                  <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">{item.phone}</span>
                                </td>
                                <td className="py-5 px-6 border-r border-slate-200 dark:border-slate-700">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowDeleteConfirm({
                                      type: 'data',
                                      id: item.id,
                                      name: item.name || item.company || 'this contact'
                                    })}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </td>
                                <td className="py-5 px-6">
                                  <Badge className={`${getStatusBadgeColor(item.status)} border-0`}>
                                    {item.status?.replace(/_/g, ' ') || 'NEW'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {showDeleteConfirm.type === 'campaign' ? 'Delete Data Set' : 'Delete Contact'}
                  </h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-slate-700 dark:text-slate-300 mb-6">
                {showDeleteConfirm.type === 'campaign'
                  ? `Are you sure you want to delete "${showDeleteConfirm.name}" and all its contacts?`
                  : `Are you sure you want to delete "${showDeleteConfirm.name}"?`
                }
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={showDeleteConfirm.type === 'campaign' ? handleDeleteCampaign : handleDeleteData}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disposition Modal */}
      {showDispositionModal && activeCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Call Disposition</h3>
                  <p className="text-sm text-slate-500 mt-1">{activeCall.name || activeCall.company || 'Contact'}</p>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatTime(callTimer)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Selection */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300 mb-3 block">Select Outcome *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'INTERESTED', label: 'Interested', color: 'emerald' },
                    { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
                    { value: 'CALL_LATER', label: 'Call Later', color: 'orange' },
                    { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'amber' },
                    { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'red' },
                    { value: 'DND', label: 'DND', color: 'slate' }
                  ].map(status => (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedStatus === status.value
                          ? `border-${status.color}-500 bg-${status.color}-50 dark:bg-${status.color}-900/20 text-${status.color}-700 dark:text-${status.color}-400`
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Later Options */}
              {selectedStatus === 'CALL_LATER' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">Date *</Label>
                    <Input
                      type="date"
                      value={callLaterDate}
                      onChange={(e) => setCallLaterDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">Time *</Label>
                    <Input
                      type="time"
                      value={callLaterTime}
                      onChange={(e) => setCallLaterTime(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Interested - BDM Assignment */}
              {selectedStatus === 'INTERESTED' && (
                <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <UserPlus size={18} />
                    <span className="font-medium">Assign to BDM</span>
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">Select BDM *</Label>
                    <select
                      value={selectedBDM}
                      onChange={(e) => setSelectedBDM(e.target.value)}
                      className="mt-1 w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Choose BDM...</option>
                      {bdmUsers.map(bdm => (
                        <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">Products *</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProducts(prev =>
                              prev.includes(product.id)
                                ? prev.filter(id => id !== product.id)
                                : [...prev, product.id]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedProducts.includes(product.id)
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {product.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300">Requirements</Label>
                    <textarea
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="Enter customer requirements..."
                      rows={2}
                      className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Remark */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Remark</Label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add notes about the call..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDispositionModal(false);
                  setSelectedStatus('');
                  setRemark('');
                }}
                className="flex-1"
                disabled={isDisposing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisposition}
                disabled={!selectedStatus || isDisposing}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isDisposing ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
