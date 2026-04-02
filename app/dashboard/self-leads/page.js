'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaignStore, useProductStore, useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Phone,
  PhoneOff,
  Building2,
  User,
  Briefcase,
  Mail,
  MapPin,
  Clock,
  Calendar,
  Share2,
  CheckCircle,
  Check,
  X,
  Plus,
  Upload,
  UserPlus,
  FileText,
  Users,
  MessageSquare,
  PhoneCall,
  Target,
  TrendingUp,
  Trash2,
  Database,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  PhoneForwarded,
  PhoneMissed,
  Ban,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import TabBar from '@/components/TabBar';

export default function SelfLeadsPage() {
  const router = useRouter();
  const { user, isBDM } = useRoleCheck();
  const {
    assignedCampaigns,
    fetchAssignedCampaigns,
    campaignData,
    fetchCampaignData,
    startCall,
    endCall,
    createSelfCampaign,
    deleteSelfCampaign,
    deleteCampaignData
  } = useCampaignStore();
  const { products, fetchProducts } = useProductStore();
  const { fetchBDMUsers, bdmUsers, convertToLead } = useLeadStore();

  // Tab state
  const [activeTab, setActiveTab] = useState('queue'); // 'add', 'queue', 'called'

  // Campaign selection
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selfCampaigns, setSelfCampaigns] = useState([]);

  // Queue data
  const [selectedData, setSelectedData] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [calledData, setCalledData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    called: 0,
    interested: 0,
    notInterested: 0,
    leadsGenerated: 0
  });

  // Add data form state
  const [inputMode, setInputMode] = useState('single');
  const [dataSetName, setDataSetName] = useState('');
  const [singleData, setSingleData] = useState({
    name: '',
    company: '',
    phone: '',
    title: '',
    email: '',
    industry: '',
    city: ''
  });
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Call state
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);

  // Disposition state
  const [callOutcome, setCallOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Interested flow state
  const [showInterestedOptions, setShowInterestedOptions] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedParentProduct, setSelectedParentProduct] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [selectedBDM, setSelectedBDM] = useState('');
  const [sharedViaWhatsApp, setSharedViaWhatsApp] = useState(false);
  const [sharedViaEmail, setSharedViaEmail] = useState(false);

  // Call Later state
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');

  // Manage data tab state
  const [manageCampaignId, setManageCampaignId] = useState('');
  const [isLoadingManageData, setIsLoadingManageData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // { type: 'campaign' | 'data', id: string, name: string }
  const [isDeleting, setIsDeleting] = useState(false);

  // Called tab filter state
  const [calledStatusFilter, setCalledStatusFilter] = useState('all');

  // Redirect non-BDM users
  useEffect(() => {
    if (user && !isBDM) {
      router.push('/dashboard');
    }
  }, [user, isBDM, router]);

  useSocketRefresh(() => { fetchAssignedCampaigns(); }, { enabled: !!isBDM });

  // Fetch initial data
  useEffect(() => {
    if (isBDM) {
      fetchAssignedCampaigns();
      fetchProducts();
      fetchBDMUsers();
    }
  }, [isBDM, fetchAssignedCampaigns, fetchProducts, fetchBDMUsers]);

  // Filter self-campaigns (BDM Self campaigns)
  useEffect(() => {
    if (assignedCampaigns.length > 0) {
      const bdmSelfCampaigns = assignedCampaigns.filter(c =>
        c.name.startsWith('[BDM Self]') || c.type === 'SELF'
      );
      setSelfCampaigns(bdmSelfCampaigns);

      // Default to 'all' to show all data sets combined
      if (bdmSelfCampaigns.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId('all');
      }
    }
  }, [assignedCampaigns, selectedCampaignId]);

  // Fetch campaign data when campaign changes
  useEffect(() => {
    if (selectedCampaignId && selfCampaigns.length > 0) {
      loadCampaignData();
    }
  }, [selectedCampaignId, selfCampaigns]);

  const loadCampaignData = async () => {
    setIsLoading(true);
    if (selectedCampaignId === 'all') {
      // Fetch data from all self campaigns and combine
      try {
        const allDataPromises = selfCampaigns.map(async (campaign) => {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns/${campaign.id}/data?page=1&limit=500`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const result = await response.json();
          return result.data || [];
        });
        const results = await Promise.all(allDataPromises);
        const combinedData = results.flat();
        // Update local state directly since we're combining multiple campaigns
        const pending = combinedData.filter(d => d.status === 'NEW');
        const called = combinedData.filter(d => d.status !== 'NEW');
        setPendingQueue(pending);
        setCalledData(called);
        const interested = combinedData.filter(d => d.status === 'INTERESTED').length;
        const notInterested = combinedData.filter(d => d.status === 'NOT_INTERESTED').length;
        const leadsGenerated = combinedData.filter(d => d.isConverted).length;
        setStats({
          total: combinedData.length,
          pending: pending.length,
          called: called.length,
          interested,
          notInterested,
          leadsGenerated
        });
        if (pending.length > 0 && activeTab === 'queue') {
          setSelectedData(pending[0]);
        }
      } catch (error) {
        console.error('Error fetching all campaign data:', error);
        toast.error('Failed to load data');
      }
    } else {
      await fetchCampaignData(selectedCampaignId, 1, 500);
    }
    setIsLoading(false);
  };

  // Process queue data when campaignData changes (only for single campaign selection)
  useEffect(() => {
    // Skip processing if 'all' is selected - data is set directly in loadCampaignData
    if (selectedCampaignId === 'all') return;

    if (campaignData && campaignData.length > 0) {
      const pending = campaignData.filter(d => d.status === 'NEW');
      const called = campaignData.filter(d => d.status !== 'NEW');

      setPendingQueue(pending);
      setCalledData(called);

      const interested = campaignData.filter(d => d.status === 'INTERESTED').length;
      const notInterested = campaignData.filter(d => d.status === 'NOT_INTERESTED').length;
      const leadsGenerated = campaignData.filter(d => d.isConverted).length;

      setStats({
        total: campaignData.length,
        pending: pending.length,
        called: called.length,
        interested,
        notInterested,
        leadsGenerated
      });

      if (pending.length > 0 && activeTab === 'queue') {
        setSelectedData(prev => prev ? prev : pending[0]);
      }
    } else if (selectedCampaignId !== 'all') {
      setPendingQueue([]);
      setCalledData([]);
      setStats({ total: 0, pending: 0, called: 0, interested: 0, notInterested: 0, leadsGenerated: 0 });
    }
  }, [campaignData, activeTab, selectedCampaignId]);

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

  // ==================== ADD DATA HANDLERS ====================

  const handleSingleDataChange = (field, value) => {
    setSingleData(prev => ({ ...prev, [field]: value }));
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { data: [], headers: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    return { data, headers };
  };

  const parseExcel = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    return { data, headers };
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      setFile(null);
      setParsedData([]);
      setDetectedColumns([]);
      return;
    }

    setFile(selectedFile);
    setFormError('');
    setFormSuccess('');

    const fileName = selectedFile.name.toLowerCase();

    try {
      let result;
      if (fileName.endsWith('.csv')) {
        const text = await selectedFile.text();
        result = parseCSV(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        result = parseExcel(arrayBuffer);
      } else {
        setFormError('Unsupported file format. Please use .csv or .xlsx files.');
        setParsedData([]);
        setDetectedColumns([]);
        return;
      }

      setParsedData(result.data);
      setDetectedColumns(result.headers);
    } catch (err) {
      console.error('File parse error:', err);
      setFormError('Failed to parse file. Please check the format.');
      setParsedData([]);
      setDetectedColumns([]);
    }
  };

  const validateSingleData = () => {
    if (!singleData.name?.trim()) {
      setFormError('Full Name is required.');
      return false;
    }
    if (!singleData.company?.trim()) {
      setFormError('Company is required.');
      return false;
    }
    if (!singleData.phone?.trim()) {
      setFormError('Phone number is required.');
      return false;
    }
    const phoneDigits = singleData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setFormError(`Phone must have exactly 10 digits. Got ${phoneDigits.length}.`);
      return false;
    }
    if (!singleData.title?.trim()) {
      setFormError('Title/Designation is required.');
      return false;
    }
    return true;
  };

  const handleAddDataSubmit = async (e) => {
    e.preventDefault();

    // Validate data set name
    if (!dataSetName.trim()) {
      setFormError('Data Set Name is required.');
      return;
    }

    // Validate data input
    if (inputMode === 'file') {
      if (parsedData.length === 0) {
        setFormError('Please upload a file with data.');
        return;
      }
    } else {
      if (!validateSingleData()) {
        return;
      }
    }

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const dataToSubmit = inputMode === 'file'
        ? parsedData
        : [{
            name: singleData.name.trim(),
            company: singleData.company.trim(),
            phone: singleData.phone.trim(),
            title: singleData.title.trim(),
            email: singleData.email?.trim() || '',
            industry: singleData.industry?.trim() || '',
            city: singleData.city?.trim() || ''
          }];

      // Use the required data set name
      const campaignName = dataSetName.trim();

      const result = await createSelfCampaign(campaignName, 'Self Generated', dataToSubmit);

      if (!result.success) {
        setFormError(result.error || 'Failed to add data.');
        setIsSubmitting(false);
        return;
      }

      setFormSuccess(`Data added successfully with ${result.count} record(s)!`);
      toast.success('Data added successfully!');

      // Reset form
      setDataSetName('');
      setSingleData({ name: '', company: '', phone: '', title: '', email: '', industry: '', city: '' });
      setFile(null);
      setParsedData([]);
      setDetectedColumns([]);

      // Refresh campaigns
      await fetchAssignedCampaigns();

      // Set the newly created campaign as selected and add to selfCampaigns
      if (result.campaign?.id) {
        setSelectedCampaignId(result.campaign.id);
        setSelfCampaigns(prev => {
          // Add new campaign if not already in list
          if (!prev.find(c => c.id === result.campaign.id)) {
            return [result.campaign, ...prev];
          }
          return prev;
        });
      }

      setTimeout(() => {
        handleTabChange('queue');
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Add data error:', err);
      setFormError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== CALL HANDLERS ====================

  const handleSelectData = (data) => {
    if (activeCall) {
      toast.error('Please end the current call first');
      return;
    }
    setSelectedData(data);
    resetDisposition();
  };

  const resetDisposition = () => {
    setCallOutcome('');
    setNotes('');
    setOtherReason('');
    setShowInterestedOptions(false);
    setSelectedProducts([]);
    setFollowUpAction('');
    setSelectedBDM('');
    setSharedViaWhatsApp(false);
    setSharedViaEmail(false);
    setCallLaterDate('');
    setCallLaterTime('');
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
          assignedToId: followUpAction === 'meeting' ? selectedBDM : user.id,
          type: leadType,
          sharedVia: followUpAction === 'share' ? getSharedVia() : null
        });

        if (leadResult.success) {
          toast.success(`Lead created and assigned!`);
        } else {
          toast.error(leadResult.error || 'Failed to create lead');
        }
      }

      setActiveCall(null);
      setCallTimer(0);
      setShowDispositionDialog(false);
      toast.success('Call saved successfully');

      loadCampaignData();
      resetDisposition();

      const currentIndex = pendingQueue.findIndex(d => d.id === selectedData?.id);
      if (currentIndex < pendingQueue.length - 1) {
        setSelectedData(pendingQueue[currentIndex + 1]);
      } else if (pendingQueue.length > 1) {
        setSelectedData(pendingQueue[0]);
      } else {
        setSelectedData(null);
      }
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
      `Hi ${selectedData.name || 'there'},\n\nThank you for your interest!\n\nProducts of interest: ${productNames}\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n${user?.name || 'Team'}`
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
      `Hi ${selectedData.name || 'there'},\n\nThank you for your interest!\n\nProducts of interest:\n- ${productNames.split(', ').join('\n- ')}\n\nPlease feel free to reach out.\n\nBest regards,\n${user?.name || 'Team'}`
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
      setSelectedProducts([]);
      setSelectedParentProduct('');
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
      setSelectedProducts([]);
      setSelectedParentProduct('');
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
    { value: 'INTERESTED', label: 'Interested', color: 'emerald' },
    { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
    { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'amber' },
    { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'red' },
    { value: 'CALL_LATER', label: 'Call Later', color: 'blue' },
    { value: 'RINGING_NOT_PICKED', label: 'Ringing Not Picked', color: 'orange' },
  ];

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'INTERESTED':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'NOT_INTERESTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'NOT_REACHABLE':
      case 'RINGING_NOT_PICKED':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'WRONG_NUMBER':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'CALL_LATER':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  // ==================== MANAGE DATA HANDLERS ====================

  const handleManageCampaignChange = async (campaignId) => {
    setManageCampaignId(campaignId);
    if (campaignId) {
      setIsLoadingManageData(true);
      await fetchCampaignData(campaignId, 1, 500);
      setIsLoadingManageData(false);
    }
  };

  // Refetch correct campaign data when switching back to queue/called tabs
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if ((tab === 'queue' || tab === 'called') && selectedCampaignId && manageCampaignId && manageCampaignId !== selectedCampaignId) {
      // User was viewing different data in manage tab, refetch the correct data
      setIsLoading(true);
      await fetchCampaignData(selectedCampaignId, 1, 500);
      setIsLoading(false);
    }
  };

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

  const handleDeleteData = async () => {
    if (!showDeleteConfirm || showDeleteConfirm.type !== 'data') return;

    setIsDeleting(true);
    const result = await deleteCampaignData(showDeleteConfirm.id);

    if (result.success) {
      toast.success('Contact deleted successfully');
      // Refresh the campaign data to reflect the deletion
      if (manageCampaignId) {
        await fetchCampaignData(manageCampaignId, 1, 500);
      }
    } else {
      toast.error(result.error || 'Failed to delete contact');
    }

    setIsDeleting(false);
    setShowDeleteConfirm(null);
  };

  if (!isBDM) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Self Data</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[18px]">
            Add and call your self-sourced contacts
          </p>
        </div>

        {selfCampaigns.length > 0 && (activeTab === 'queue' || activeTab === 'called') && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Data Set:
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => {
                if (activeCall) {
                  toast.error('Please end the current call first');
                  return;
                }
                setSelectedCampaignId(e.target.value);
                setSelectedData(null);
              }}
              className="h-10 px-4 pr-10 w-full sm:min-w-[200px] sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent cursor-pointer"
            >
              <option value="all">All Data</option>
              {selfCampaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name.replace('[BDM Self] ', '')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        <StatCard color="slate" icon={Database} label="Total" value={stats.total} />
        <StatCard color="blue" icon={Clock} label="Pending" value={stats.pending} />
        <StatCard color="orange" icon={PhoneCall} label="Called" value={stats.called} />
        <StatCard color="emerald" icon={ThumbsUp} label="Interested" value={stats.interested} />
        <StatCard color="red" icon={ThumbsDown} label="Not Interested" value={stats.notInterested} />
        <StatCard color="indigo" icon={UserPlus} label="Leads Created" value={stats.leadsGenerated} />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'add', label: 'Add Data', icon: Plus },
          { key: 'queue', label: 'Pending Queue', count: stats.pending, icon: PhoneCall },
          { key: 'called', label: 'Called', count: stats.called, icon: CheckCircle, variant: 'success' },
          { key: 'manage', label: 'Manage Data', icon: Database, variant: 'info' },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Add Data Tab */}
      {activeTab === 'add' && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add Self Data
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add contacts you've sourced yourself to call and convert
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleAddDataSubmit} className="space-y-6">
              {formError && (
                <div className="p-3 rounded-md text-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-md text-sm bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                  {formSuccess}
                </div>
              )}

              {/* Data Set Name */}
              <div className="space-y-2">
                <Label htmlFor="dataSetName" className="text-slate-700 dark:text-slate-300">
                  Data Set Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dataSetName"
                  type="text"
                  value={dataSetName}
                  onChange={(e) => setDataSetName(e.target.value)}
                  placeholder="e.g., LinkedIn Leads, Event Contacts, Referrals"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Give a name to identify this data set for easy filtering
                </p>
              </div>

              {/* Input Mode Toggle */}
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  How would you like to add data?
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('single')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      inputMode === 'single'
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus size={24} />
                      <span className="text-sm font-medium">Single Entry</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      inputMode === 'file'
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} />
                      <span className="text-sm font-medium">Upload File</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Single Entry Mode */}
              {inputMode === 'single' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={singleData.name}
                        onChange={(e) => handleSingleDataChange('name', e.target.value)}
                        placeholder="Enter full name"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300">Company <span className="text-red-500">*</span></Label>
                      <Input
                        value={singleData.company}
                        onChange={(e) => handleSingleDataChange('company', e.target.value)}
                        placeholder="Company name"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300">Phone <span className="text-red-500">*</span></Label>
                      <Input
                        value={singleData.phone}
                        onChange={(e) => handleSingleDataChange('phone', e.target.value)}
                        placeholder="Phone number"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300">Designation <span className="text-red-500">*</span></Label>
                      <Input
                        value={singleData.title}
                        onChange={(e) => handleSingleDataChange('title', e.target.value)}
                        placeholder="e.g., Manager, Director"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                      <Input
                        type="email"
                        value={singleData.email}
                        onChange={(e) => handleSingleDataChange('email', e.target.value)}
                        placeholder="email@example.com"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300">City</Label>
                      <Input
                        value={singleData.city}
                        onChange={(e) => handleSingleDataChange('city', e.target.value)}
                        placeholder="City"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 dark:text-slate-300">Industry</Label>
                    <Input
                      value={singleData.industry}
                      onChange={(e) => handleSingleDataChange('industry', e.target.value)}
                      placeholder="e.g., IT, Manufacturing"
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* File Upload Mode */}
              {inputMode === 'file' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Upload File <span className="text-red-500">*</span></Label>
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-orange-100 dark:file:bg-orange-900/30 file:text-orange-600 dark:file:text-orange-400"
                    />
                    <p className="text-xs text-slate-500">Required columns: Name, Company, Phone, Title</p>
                  </div>
                  {parsedData.length > 0 && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {parsedData.length} records found
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white w-full"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    Add Data
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Queue List */}
          <div className="lg:col-span-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Pending <span className="text-orange-600">({pendingQueue.length})</span>
                </h2>
              </div>
              <div className="p-3 space-y-2 max-h-[300px] sm:max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : pendingQueue.length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No pending calls</p>
                    <p className="text-slate-400 text-xs mt-1">Add some data to get started</p>
                  </div>
                ) : (
                  pendingQueue.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectData(item)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedData?.id === item.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {item.company || 'No Company'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                        {item.name || 'Unknown'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-8">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              {selectedData ? (
                <>
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {selectedData.company || 'No Company'}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {selectedData.name || 'Unknown'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <Phone size={16} className="text-slate-400" />
                        <span className="font-mono text-sm">{selectedData.phone}</span>
                      </div>
                      {selectedData.email && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <Mail size={16} className="text-slate-400" />
                          <span className="text-sm truncate">{selectedData.email}</span>
                        </div>
                      )}
                      {selectedData.title && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <Briefcase size={16} className="text-slate-400" />
                          <span className="text-sm">{selectedData.title}</span>
                        </div>
                      )}
                      {selectedData.city && (
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                          <MapPin size={16} className="text-slate-400" />
                          <span className="text-sm">{selectedData.city}</span>
                        </div>
                      )}
                    </div>

                    {/* Call Buttons */}
                    <div className="mt-6">
                      {activeCall && activeCall.dataId === selectedData.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 px-4 py-4 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-700 dark:text-red-400 font-medium">Call Active</span>
                            <div className="ml-auto flex items-center gap-2">
                              <Clock size={18} className="text-red-600" />
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
                          className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white py-6"
                        >
                          <Phone size={20} className="mr-2" />
                          Start Call
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Calling Script */}
                  <div className="p-6 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Calling Script</h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <div className="font-mono text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
                        <p>
                          Hi, this is <span className="text-orange-600 dark:text-orange-400 font-semibold">{user?.name || 'Agent'}</span> calling from Gazon communications. May I speak with <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedData?.name || 'the concerned person'}</span>?
                        </p>
                        <p>
                          We're reaching out to businesses like <span className="text-orange-600 dark:text-orange-400 font-semibold">{selectedData?.company || 'yours'}</span> to help them with our connectivity solutions that can improve operations and reduce costs.
                        </p>
                        <p>
                          Would you be interested in learning more about how we can help your business?
                        </p>
                      </div>
                    </div>

                    {/* Previous Notes */}
                    {selectedData?.notes && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Previous Notes</h4>
                        <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                          {selectedData.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <User className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Select a contact to view details</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Called Tab */}
      {activeTab === 'called' && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          {/* Status Filter */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">Filter:</span>
              {[
                { value: 'all', label: 'All', color: 'slate' },
                { value: 'INTERESTED', label: 'Interested', color: 'emerald' },
                { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
                { value: 'CALL_LATER', label: 'Call Later', color: 'blue' },
                { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'amber' },
                { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'red' },
                { value: 'RINGING_NOT_PICKED', label: 'Ringing Not Picked', color: 'orange' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setCalledStatusFilter(filter.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    calledStatusFilter === filter.value
                      ? filter.color === 'emerald' ? 'bg-emerald-600 text-white'
                        : filter.color === 'red' ? 'bg-red-600 text-white'
                        : filter.color === 'blue' ? 'bg-blue-600 text-white'
                        : filter.color === 'amber' ? 'bg-amber-500 text-white'
                        : filter.color === 'orange' ? 'bg-orange-500 text-white'
                        : 'bg-orange-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {filter.label}
                  {filter.value !== 'all' && (
                    <span className="ml-1.5 opacity-75">
                      ({calledData.filter(d => d.status === filter.value).length})
                    </span>
                  )}
                  {filter.value === 'all' && (
                    <span className="ml-1.5 opacity-75">({calledData.length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(() => {
                    const filteredData = calledStatusFilter === 'all'
                      ? calledData
                      : calledData.filter(d => d.status === calledStatusFilter);

                    if (filteredData.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                            {calledStatusFilter === 'all' ? 'No called data yet' : `No ${calledStatusFilter.replace(/_/g, ' ').toLowerCase()} data`}
                          </td>
                        </tr>
                      );
                    }

                    return filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">
                          {item.company || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {item.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-sm">
                          {item.phone}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusBadgeColor(item.status)} border-0`}>
                            {item.status?.replace(/_/g, ' ') || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {item.isConverted ? (
                            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                              <CheckCircle size={12} className="mr-1" />
                              Created
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              View, manage, and delete your self-sourced data
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {selfCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No data sets found</p>
                <p className="text-slate-400 text-xs mt-1">Add some data to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Data Set Selector */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1 max-w-md">
                    <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                      Select Data Set
                    </Label>
                    <select
                      value={manageCampaignId}
                      onChange={(e) => handleManageCampaignChange(e.target.value)}
                      className="w-full h-10 px-4 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                    >
                      <option value="">Choose a data set...</option>
                      {selfCampaigns.map(campaign => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name.replace('[BDM Self] ', '')}
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
                          name: campaign?.name.replace('[BDM Self] ', '') || 'this data set'
                        });
                      }}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete Entire Set
                    </Button>
                  )}
                </div>

                {/* Data Table */}
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
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                              <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Name</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Company</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Phone</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Status</th>
                              <th className="text-right py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-200 uppercase">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {campaignData.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">
                                  {item.name || '-'}
                                </td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                  {item.company || '-'}
                                </td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-sm">
                                  {item.phone}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={`${getStatusBadgeColor(item.status)} border-0`}>
                                    {item.status?.replace(/_/g, ' ') || 'NEW'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowDeleteConfirm({
                                      type: 'data',
                                      id: item.id,
                                      name: item.name || item.company || 'this contact'
                                    })}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="text-slate-700 dark:text-slate-300 mb-6">
                {showDeleteConfirm.type === 'campaign'
                  ? `Are you sure you want to delete "${showDeleteConfirm.name}" and all its contacts? This will also remove any associated call history.`
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
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disposition Dialog */}
      {showDispositionDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
            {/* Dialog Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2 size={18} className="text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {selectedData?.company || 'Unknown'}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedData?.name || ''}</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {formatTimer(callTimer)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDispositionDialog(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Dialog Content */}
            <div className="px-5 pb-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Call Outcome - icon grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Call Outcome
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'INTERESTED', label: 'Interested', icon: ThumbsUp, color: 'emerald', bgActive: 'bg-emerald-500', borderActive: 'border-emerald-500', bgHover: 'hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
                    { value: 'NOT_INTERESTED', label: 'Not Interested', icon: ThumbsDown, color: 'red', bgActive: 'bg-red-500', borderActive: 'border-red-500', bgHover: 'hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30' },
                    { value: 'CALL_LATER', label: 'Call Later', icon: PhoneForwarded, color: 'blue', bgActive: 'bg-blue-500', borderActive: 'border-blue-500', bgHover: 'hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30' },
                    { value: 'NOT_REACHABLE', label: 'No Answer', icon: PhoneMissed, color: 'amber', bgActive: 'bg-amber-500', borderActive: 'border-amber-500', bgHover: 'hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30' },
                    { value: 'WRONG_NUMBER', label: 'Wrong No.', icon: Ban, color: 'rose', bgActive: 'bg-rose-500', borderActive: 'border-rose-500', bgHover: 'hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30' },
                    { value: 'RINGING_NOT_PICKED', label: 'Ringing', icon: AlertTriangle, color: 'orange', bgActive: 'bg-orange-500', borderActive: 'border-orange-500', bgHover: 'hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30' },
                    { value: 'OTHERS', label: 'Others', icon: HelpCircle, color: 'violet', bgActive: 'bg-violet-500', borderActive: 'border-violet-500', bgHover: 'hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30' },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = callOutcome === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleOutcomeChange(option.value)}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? `${option.bgActive} text-white ${option.borderActive} shadow-lg scale-[1.02]`
                            : `bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 ${option.bgHover}`
                        }`}
                      >
                        <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} />
                        <span className="text-[11px] font-medium leading-tight">{option.label}</span>
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
                <div className="space-y-3 p-4 bg-emerald-50/70 dark:bg-emerald-900/10 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50">
                  {/* Product Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                      Product
                    </label>
                    {products.filter(p => p.status === 'ACTIVE' && !p.parentId).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No products available</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
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
                              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              {isSelected && <Check size={14} strokeWidth={3} />}
                              {parent.title}
                              {hasChildren && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-emerald-500 text-emerald-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
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
                          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-100/80 dark:bg-emerald-800/30 rounded-lg text-emerald-700 dark:text-emerald-400">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">{parentProduct?.title} will be added directly</span>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-2 space-y-1.5">
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Sub-products:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {subProducts.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductToggle(product.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                  selectedProducts.includes(product.id)
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                {selectedProducts.includes(product.id) && <Check size={12} strokeWidth={3} />}
                                {product.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Follow-up Action */}
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                      Next Step
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleFollowUpChange('share')}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                          followUpAction === 'share'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <Share2 size={16} />
                        <div className="text-left">
                          <span className="text-sm font-medium block leading-tight">Share</span>
                          <span className={`text-[10px] ${followUpAction === 'share' ? 'text-emerald-200' : 'text-slate-400'}`}>WhatsApp / Email</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFollowUpChange('meeting')}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                          followUpAction === 'meeting'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <Calendar size={16} />
                        <div className="text-left">
                          <span className="text-sm font-medium block leading-tight">Meeting</span>
                          <span className={`text-[10px] ${followUpAction === 'meeting' ? 'text-emerald-200' : 'text-slate-400'}`}>Assign to BDM</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Share Details */}
                  {followUpAction === 'share' && selectedProducts.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleShareWhatsApp}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                          sharedViaWhatsApp
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-slate-800 text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30'
                        }`}
                      >
                        {sharedViaWhatsApp ? <Check size={14} /> : <MessageSquare size={14} />}
                        <span className="text-sm font-medium">WhatsApp</span>
                      </button>
                      <button
                        onClick={handleShareEmail}
                        disabled={!selectedData?.email}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                          sharedViaEmail
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {sharedViaEmail ? <Check size={14} /> : <Mail size={14} />}
                        <span className="text-sm font-medium">Email</span>
                      </button>
                    </div>
                  )}

                  {/* BDM Assignment */}
                  {followUpAction === 'meeting' && (
                    <select
                      value={selectedBDM}
                      onChange={(e) => setSelectedBDM(e.target.value)}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select BDM...</option>
                      <option value={user.id}>{user.name} (Self)</option>
                      {bdmUsers.filter(b => b.id !== user.id).map((bdm) => (
                        <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Call Later Options */}
              {callOutcome === 'CALL_LATER' && (
                <div className="space-y-3 p-4 bg-blue-50/70 dark:bg-blue-900/10 rounded-xl border border-blue-200/80 dark:border-blue-800/50">
                  <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                    Schedule Callback
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={callLaterDate}
                        onChange={(e) => setCallLaterDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Time</label>
                      <input
                        type="time"
                        value={callLaterTime}
                        onChange={(e) => setCallLaterTime(e.target.value)}
                        className="w-full h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {callLaterDate && callLaterTime && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5 bg-blue-100/60 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg">
                      <Clock size={12} />
                      {new Date(`${callLaterDate}T${callLaterTime}`).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Notes {callOutcome === 'CALL_LATER' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add call notes..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <Button
                onClick={() => setShowDispositionDialog(false)}
                variant="outline"
                className="flex-1 h-11 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  (callOutcome === 'INTERESTED' && followUpAction === 'meeting' && !selectedBDM) ||
                  (callOutcome === 'INTERESTED' && followUpAction === 'share' && !sharedViaWhatsApp && !sharedViaEmail) ||
                  (callOutcome === 'CALL_LATER' && (!callLaterDate || !callLaterTime || !notes.trim()))
                }
                className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PhoneOff size={16} />
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
