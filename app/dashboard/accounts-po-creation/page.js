'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  User,
  MapPin,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Search,
  Plus,
  Clock,
  Ruler,
  Receipt,
  ArrowLeft,
  Cable,
  ShieldCheck,
  Hash,
  CalendarDays,
  Truck,
  CircleDot,
  Eye,
  Printer,
  Percent,
  Wifi,
  ToggleLeft,
  ToggleRight,
  Send,
  Mail,
  AtSign,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import TabBar from '@/components/TabBar';
import { formatCurrency } from '@/lib/formatters';

const getStatusBadge = (status) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'APPROVED':
      return <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getLeadVendor = (lead) => {
  if (lead.vendor) return lead.vendor;
  if (lead.vendorsCreatedFor?.length > 0) return lead.vendorsCreatedFor[0];
  if (lead.feasibilityNotes) {
    try {
      const notes = JSON.parse(lead.feasibilityNotes);
      if (notes.vendorType || notes.vendorDetails) {
        return {
          id: null,
          companyName: notes.vendorDetails?.vendorName || notes.vendorType || 'Vendor',
          category: notes.vendorDetails?.vendorCategory || notes.vendorType || null,
          gstNumber: null,
          contactPerson: null
        };
      }
    } catch {}
  }
  return null;
};

export default function AccountsPOCreationPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();
  const {
    poEligibleLeads,
    vendorPOs,
    fetchPOEligibleLeads,
    createVendorPO,
    fetchVendorPOs,
    getVendorPOById,
    sendVendorPOEmail,
    isLoading
  } = useLeadStore();

  const [activeTab, setActiveTab] = useState('eligible');
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligiblePagination, setEligiblePagination] = useState(null);
  const [posPage, setPosPage] = useState(1);
  const [posPagination, setPosPagination] = useState(null);
  const [posStatusFilter, setPosStatusFilter] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // PO detail view
  const [viewingPO, setViewingPO] = useState(null);
  const [showPODetail, setShowPODetail] = useState(false);
  const [isLoadingPO, setIsLoadingPO] = useState(false);

  const [validityMonths, setValidityMonths] = useState('12');
  // Fiber-specific fields
  const [distance, setDistance] = useState('');
  const [rate, setRate] = useState('');
  // Commission/Channel Partner specific fields
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [arcAmount, setArcAmount] = useState('');
  const [bandwidthSpeed, setBandwidthSpeed] = useState('');
  const [gstToggle, setGstToggle] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  // Third Party specific fields
  const [paymentTerms, setPaymentTerms] = useState('');
  const [lockInPeriod, setLockInPeriod] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [thirdPartyRate, setThirdPartyRate] = useState('');

  // Send PO email state
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendingPO, setSendingPO] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const resolvedVendor = selectedLead ? getLeadVendor(selectedLead) : null;
  const isCommissionType = resolvedVendor?.category === 'COMMISSION' || resolvedVendor?.category === 'CHANNEL_PARTNER';
  const isThirdParty = resolvedVendor?.category === 'THIRD_PARTY';

  // Calculate amounts based on vendor type
  const baseAmount = isCommissionType
    ? (arcAmount && commissionPercentage ? (parseFloat(arcAmount) * parseFloat(commissionPercentage) / 100) : 0)
    : isThirdParty
      ? (thirdPartyRate ? parseFloat(thirdPartyRate) : 0)
      : (distance && rate ? parseFloat(distance) * parseFloat(rate) : 0);
  const gstApplicable = (isCommissionType || isThirdParty) ? gstToggle : (resolvedVendor?.gstNumber ? true : false);
  const gstPercentage = gstApplicable ? 18 : 0;
  const gstAmount = gstApplicable ? baseAmount * 0.18 : 0;
  const totalAmount = baseAmount + gstAmount;

  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, router]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadEligibleLeads = useCallback(async () => {
    const result = await fetchPOEligibleLeads(eligiblePage, 10, searchDebounce);
    if (result.success) {
      setEligiblePagination(result.data.pagination);
    }
  }, [eligiblePage, searchDebounce, fetchPOEligibleLeads]);

  const loadVendorPOs = useCallback(async () => {
    const result = await fetchVendorPOs(posPage, 10, posStatusFilter);
    if (result.success) {
      setPosPagination(result.data.pagination);
    }
  }, [posPage, posStatusFilter, fetchVendorPOs]);

  useEffect(() => {
    if (!user || (!isAccountsTeam && !isAdmin)) return;
    if (activeTab === 'eligible') {
      loadEligibleLeads();
    } else if (activeTab === 'pos') {
      loadVendorPOs();
    }
  }, [activeTab, user, isAccountsTeam, isAdmin, loadEligibleLeads, loadVendorPOs]);

  useEffect(() => {
    setEligiblePage(1);
    setPosPage(1);
  }, [activeTab]);

  const handleViewPO = async (poId) => {
    setIsLoadingPO(true);
    setShowPODetail(true);
    const result = await getVendorPOById(poId);
    if (result.success) {
      setViewingPO(result.po);
    } else {
      toast.error(result.error || 'Failed to load PO details');
      setShowPODetail(false);
    }
    setIsLoadingPO(false);
  };

  const handlePrintPO = () => {
    window.print();
  };

  const handleOpenSendEmail = async (po) => {
    // If we only have basic data, fetch full PO details
    let fullPO = po;
    if (!po.vendor) {
      const result = await getVendorPOById(po.id);
      if (result.success) {
        fullPO = result.po;
      }
    }
    setSendingPO(fullPO);
    setEmailTo(fullPO.vendor?.email || '');
    setEmailCc('');
    setEmailSubject(`Purchase Order ${fullPO.poNumber} - Gazon Communications India Ltd.`);

    const isComm = fullPO.vendorCategory === 'COMMISSION' || fullPO.vendorCategory === 'CHANNEL_PARTNER';
    const isTP = fullPO.vendorCategory === 'THIRD_PARTY';
    const details = isComm
      ? `Customer: ${fullPO.customerName || '-'}\nARC Amount: ${fullPO.arcAmount ? formatCurrency(fullPO.arcAmount) : '-'}\nCommission: ${fullPO.commissionPercentage || '-'}%\nBandwidth: ${fullPO.bandwidthSpeed || '-'}`
      : isTP
        ? `Customer: ${fullPO.customerName || '-'}\nRate: ${fullPO.rate ? formatCurrency(fullPO.rate) : '-'}${fullPO.arcAmount ? `\nARC Amount: ${formatCurrency(fullPO.arcAmount)}` : ''}${fullPO.bandwidthSpeed ? `\nBandwidth: ${fullPO.bandwidthSpeed}` : ''}${fullPO.paymentTerms ? `\nPayment Terms: ${fullPO.paymentTerms}` : ''}${fullPO.lockInPeriod ? `\nLock-in Period: ${fullPO.lockInPeriod} months` : ''}${fullPO.noticePeriod ? `\nNotice Period: ${fullPO.noticePeriod} months` : ''}`
        : `Customer: ${fullPO.customerName || '-'}\nDistance: ${fullPO.distance || '-'} meters\nRate: ${fullPO.rate ? formatCurrency(fullPO.rate) : '-'}`;

    setEmailMessage(
      `Dear ${fullPO.vendor?.contactPerson || fullPO.vendor?.companyName || 'Vendor'},\n\nPlease find the Purchase Order details below for your reference.\n\n${details}\n\nBase Amount: ${formatCurrency(fullPO.baseAmount)}${fullPO.gstApplicable ? `\nGST (${fullPO.gstPercentage}%): ${formatCurrency(fullPO.gstAmount)}` : ''}\nTotal Amount: ${formatCurrency(fullPO.totalAmount)}\nValidity: ${fullPO.validityMonths} months\n\nPlease review and confirm.\n\nRegards,\nGazon Communications India Ltd.`
    );
    setShowSendEmail(true);
  };

  const handleConfirmSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error('Recipient email is required.');
      return;
    }
    setIsSendingEmail(true);
    const ccList = emailCc.split(',').map(e => e.trim()).filter(Boolean);
    const result = await sendVendorPOEmail(sendingPO.id, {
      to: emailTo.trim(),
      cc: ccList,
      subject: emailSubject,
      message: emailMessage
    });
    setIsSendingEmail(false);
    if (result.success) {
      toast.success('PO email sent successfully!');
      setShowSendEmail(false);
      setSendingPO(null);
      // Refresh data so "PO Sent" shows immediately
      if (activeTab === 'eligible') loadEligibleLeads();
      else loadVendorPOs();
    } else {
      toast.error(result.error || 'Failed to send email.');
    }
  };

  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    const getHundreds = (n) => {
      let str = '';
      if (n >= 100) { str += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
      if (n >= 20) { str += tens[Math.floor(n / 10)] + ' '; n %= 10; }
      if (n > 0) str += ones[n] + ' ';
      return str.trim();
    };

    const intPart = Math.floor(num);
    const decimal = Math.round((num - intPart) * 100);
    let remaining = intPart;
    const parts = [];

    // Indian numbering: first 3 digits, then groups of 2
    parts.push(remaining % 1000); remaining = Math.floor(remaining / 1000);
    while (remaining > 0) { parts.push(remaining % 100); remaining = Math.floor(remaining / 100); }

    let result = '';
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === 0) continue;
      result += getHundreds(parts[i]) + ' ' + scales[i] + ' ';
    }
    result = 'INR ' + result.trim();
    if (decimal > 0) result += ' and ' + getHundreds(decimal) + 'Paise';
    result += ' Only';
    return result;
  };

  const handleCreatePO = (lead) => {
    setSelectedLead(lead);
    setShowCreateForm(true);
    setValidityMonths('12');
    setDistance('');
    setRate('');
    // Pre-fill commission/third-party fields from lead data
    setArcAmount(lead.arcAmount ? String(lead.arcAmount) : '');
    setBandwidthSpeed(lead.bandwidthRequirement || '');
    setCommissionPercentage(lead.vendorCommissionPercentage ? String(lead.vendorCommissionPercentage) : '');
    const vendor = getLeadVendor(lead);
    setGstToggle(vendor?.gstNumber ? true : false);
    setTermsAndConditions('');
    // Third party fields
    setPaymentTerms('');
    setLockInPeriod('');
    setNoticePeriod('');
    setThirdPartyRate('');
  };

  const handleSubmitPO = async () => {
    if (isCommissionType) {
      if (!arcAmount || !commissionPercentage) {
        toast.error('Please fill ARC amount and commission percentage.');
        return;
      }
    } else if (isThirdParty) {
      if (!thirdPartyRate) {
        toast.error('Please fill the rate.');
        return;
      }
    } else {
      if (!distance || !rate) {
        toast.error('Please fill distance and rate.');
        return;
      }
    }
    if (!validityMonths || parseInt(validityMonths) < 1) {
      toast.error('Please enter a valid validity period.');
      return;
    }
    if (!resolvedVendor?.id) {
      toast.error('No vendor linked to this lead.');
      return;
    }

    setIsCreating(true);
    const poData = {
      leadId: selectedLead.id,
      vendorId: resolvedVendor.id,
      vendorCategory: resolvedVendor.category || 'FIBER',
      validityMonths: parseInt(validityMonths),
      customerName: selectedLead.campaignData?.name || selectedLead.campaignData?.company || '',
      popLocation: selectedLead.fromAddress || selectedLead.location || '',
      installationLocation: selectedLead.installationAddress || '',
      baseAmount,
      gstApplicable,
      gstPercentage: gstApplicable ? 18 : null,
      gstAmount: gstApplicable ? gstAmount : null,
      totalAmount,
      termsAndConditions: termsAndConditions || null
    };

    if (isCommissionType) {
      poData.commissionPercentage = parseFloat(commissionPercentage);
      poData.arcAmount = parseFloat(arcAmount);
      poData.bandwidthSpeed = bandwidthSpeed || null;
    } else if (isThirdParty) {
      poData.rate = parseFloat(thirdPartyRate);
      poData.arcAmount = arcAmount ? parseFloat(arcAmount) : null;
      poData.bandwidthSpeed = bandwidthSpeed || null;
      poData.paymentTerms = paymentTerms || null;
      poData.lockInPeriod = lockInPeriod ? parseInt(lockInPeriod) : null;
      poData.noticePeriod = noticePeriod ? parseInt(noticePeriod) : null;
    } else {
      poData.distance = parseFloat(distance);
      poData.rate = parseFloat(rate);
    }

    const result = await createVendorPO(poData);

    setIsCreating(false);
    if (result.success) {
      toast.success(result.message || 'PO created successfully!');
      setShowCreateForm(false);
      setSelectedLead(null);
      loadEligibleLeads();
    } else {
      toast.error(result.error || 'Failed to create PO.');
    }
  };

  if (!user) return null;

  // ── Stats for My POs tab ─────────────────────
  const pendingCount = vendorPOs.filter(po => po.status === 'PENDING_APPROVAL').length;
  const approvedCount = vendorPOs.filter(po => po.status === 'APPROVED').length;
  const rejectedCount = vendorPOs.filter(po => po.status === 'REJECTED').length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ── Page Header ── */}
      <PageHeader title="Vendor PO Creation" description="Create and manage purchase orders for approved vendors" />

      {/* ── Tab Navigation ── */}
      {!showCreateForm && (
        <TabBar
          tabs={[
            { key: 'eligible', label: 'Eligible Leads', icon: Package, count: eligiblePagination?.total, variant: 'default' },
            { key: 'pos', label: 'My POs', icon: Receipt, count: posPagination?.total, variant: 'info' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* ══════════════════════════════════════════════
          ELIGIBLE LEADS TAB
         ══════════════════════════════════════════════ */}
      {activeTab === 'eligible' && !showCreateForm && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, company, GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : poEligibleLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Package size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No eligible leads found</p>
              <p className="text-sm mt-1">Leads need accounts verification and vendor verification to appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <DataTable
                className="hidden lg:block"
                data={poEligibleLeads}
                loading={isLoading}
                pagination={true}
                defaultPageSize={10}
                emptyMessage="No eligible leads found"
                emptyIcon={ShoppingCart}
                serverPagination={eligiblePagination ? {
                  page: eligiblePage,
                  totalPages: eligiblePagination.totalPages,
                  total: eligiblePagination.total,
                  limit: 10
                } : undefined}
                onPageChange={(page) => setEligiblePage(page)}
                columns={[
                  {
                    key: 'customer',
                    label: 'Customer',
                    render: (lead) => (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{lead.campaignData?.name || '-'}</span>
                      </div>
                    )
                  },
                  {
                    key: 'company',
                    label: 'Company',
                    render: (lead) => (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{lead.campaignData?.company || '-'}</span>
                      </div>
                    )
                  },
                  {
                    key: 'vendor',
                    label: 'Vendor',
                    render: (lead) => {
                      const vendor = getLeadVendor(lead);
                      return <span className="font-medium text-slate-700 dark:text-slate-300">{vendor?.companyName || '-'}</span>;
                    }
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    render: (lead) => {
                      const vendor = getLeadVendor(lead);
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold">
                          <Cable size={11} />
                          {vendor?.category || '-'}
                        </span>
                      );
                    }
                  },
                  {
                    key: 'popLocation',
                    label: 'POP Location',
                    cellClassName: 'max-w-[140px]',
                    render: (lead) => (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <MapPin size={13} className="flex-shrink-0 text-slate-400" />
                        <span className="truncate text-sm" title={lead.fromAddress || lead.location || ''}>
                          {lead.fromAddress || lead.location || '-'}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: 'installation',
                    label: 'Installation',
                    cellClassName: 'max-w-[140px]',
                    render: (lead) => (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <MapPin size={13} className="flex-shrink-0 text-slate-400" />
                        <span className="truncate text-sm" title={lead.installationAddress || ''}>
                          {lead.installationAddress || '-'}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: 'products',
                    label: 'Products',
                    render: (lead) => lead.products?.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md text-xs font-medium">
                        {lead.products.map(p => p.product?.title).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )
                  },
                  {
                    key: 'existingPOs',
                    label: 'Existing POs',
                    render: (lead) => lead.vendorPurchaseOrders?.length > 0 ? (
                      <div className="space-y-1.5">
                        {lead.vendorPurchaseOrders.map(po => (
                          <div key={po.id} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{po.poNumber}</span>
                            {getStatusBadge(po.status)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )
                  }
                ]}
                actions={(lead) => lead.vendorPurchaseOrders?.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewPO(lead.vendorPurchaseOrders[0].id)}
                      className="h-8 px-3 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View PO
                    </Button>
                    {lead.vendorPurchaseOrders[0].status === 'APPROVED' && lead.vendorPurchaseOrders[0].vendorCategory !== 'COMMISSION' && lead.vendorPurchaseOrders[0].vendorCategory !== 'CHANNEL_PARTNER' && (
                      lead.vendorPurchaseOrders[0].emailSentAt ? (
                        <span className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md">
                          <CheckCircle className="h-3.5 w-3.5" />
                          PO Sent
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenSendEmail(lead.vendorPurchaseOrders[0])}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Send PO
                        </Button>
                      )
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCreatePO(lead)}
                    className="bg-orange-600 hover:bg-orange-700 text-white h-8 px-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create PO
                  </Button>
                )}
              />

              {/* Mobile Card View */}
              <div className="lg:hidden p-3 space-y-3">
                {poEligibleLeads.map((lead) => {
                  const vendor = getLeadVendor(lead);
                  return (
                    <div key={lead.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {/* Card Header */}
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.campaignData?.company || '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.campaignData?.name || '-'}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold flex-shrink-0">
                          <Cable size={11} />
                          {vendor?.category || '-'}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-2.5">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Vendor</p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{vendor?.companyName || '-'}</p>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2.5">
                            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold uppercase">Products</p>
                            <p className="text-sm font-medium text-orange-800 dark:text-orange-200 truncate">
                              {lead.products?.length > 0 ? lead.products.map(p => p.product?.title).join(', ') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-start gap-1.5">
                            <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] text-slate-400 font-medium">POP</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{lead.fromAddress || lead.location || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] text-slate-400 font-medium">Installation</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{lead.installationAddress || '-'}</p>
                            </div>
                          </div>
                        </div>
                        {lead.vendorPurchaseOrders?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {lead.vendorPurchaseOrders.map(po => (
                              <div key={po.id} className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-slate-500">{po.poNumber}</span>
                                {getStatusBadge(po.status)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        {lead.vendorPurchaseOrders?.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPO(lead.vendorPurchaseOrders[0].id)}
                              className="flex-1 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View PO
                            </Button>
                            {lead.vendorPurchaseOrders[0].status === 'APPROVED' && lead.vendorPurchaseOrders[0].vendorCategory !== 'COMMISSION' && lead.vendorPurchaseOrders[0].vendorCategory !== 'CHANNEL_PARTNER' && (
                              lead.vendorPurchaseOrders[0].emailSentAt ? (
                                <span className="flex-1 inline-flex items-center justify-center gap-1 h-8 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  PO Sent
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenSendEmail(lead.vendorPurchaseOrders[0])}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <Send className="h-3.5 w-3.5 mr-1" />
                                  Send PO
                                </Button>
                              )
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleCreatePO(lead)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Create PO
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CREATE PO FORM
         ══════════════════════════════════════════════ */}
      {activeTab === 'eligible' && showCreateForm && selectedLead && (
        <div className="space-y-6">
          {/* Back + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowCreateForm(false); setSelectedLead(null); }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Vendor PO</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">For {selectedLead.campaignData?.name} — {selectedLead.campaignData?.company}</p>
            </div>
          </div>

          {/* Lead Info Summary */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Lead Details</h3>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Customer</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.campaignData?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Company</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.campaignData?.company || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Vendor</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{resolvedVendor?.companyName || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cable size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Vendor Type</p>
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold mt-0.5">
                      {resolvedVendor?.category || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2 - Commission/Channel Partner specific info */}
              {isCommissionType && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IndianRupee size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">ARC Amount</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.arcAmount ? formatCurrency(selectedLead.arcAmount) : 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wifi size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Bandwidth</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.bandwidthRequirement || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Percent size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Commission %</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedLead.vendorCommissionPercentage ? `${selectedLead.vendorCommissionPercentage}%` : 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Vendor GST</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{resolvedVendor?.gstNumber || 'N/A (No GST)'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 2 - Fiber / general location info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">POP Location</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedLead.fromAddress || selectedLead.location || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Installation</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedLead.installationAddress || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CircleDot size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Products</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedLead.products?.length > 0
                        ? selectedLead.products.map(p => p.product?.title).join(', ')
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                {!isCommissionType && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Vendor GST</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{resolvedVendor?.gstNumber || 'N/A (No GST)'}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PO Fields */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              {isCommissionType ? (
                <>
                  <Percent size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {resolvedVendor?.category === 'CHANNEL_PARTNER' ? 'Channel Partner' : 'Commission'} PO Details
                  </h3>
                </>
              ) : isThirdParty ? (
                <>
                  <Building2 size={16} className="text-orange-600" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Third Party PO Details</h3>
                </>
              ) : (
                <>
                  <Cable size={16} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Fiber PO Details</h3>
                </>
              )}
            </div>
            <CardContent className="p-5 space-y-5">
              {/* Common field: Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="validityMonths" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                    Validity (Months) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="validityMonths"
                    type="number"
                    min="1"
                    value={validityMonths}
                    onChange={(e) => setValidityMonths(e.target.value)}
                    placeholder="12"
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {isCommissionType ? (
                  <>
                    {/* Commission/Channel Partner fields */}
                    <div className="space-y-1.5">
                      <Label htmlFor="arcAmount" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        ARC Amount (₹) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="arcAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={arcAmount}
                        onChange={(e) => setArcAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="commissionPercentage" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        Commission % <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="commissionPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={commissionPercentage}
                        onChange={(e) => setCommissionPercentage(e.target.value)}
                        placeholder="e.g. 10"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </>
                ) : isThirdParty ? (
                  <>
                    {/* Third Party fields */}
                    <div className="space-y-1.5">
                      <Label htmlFor="thirdPartyRate" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        Rate (₹) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="thirdPartyRate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={thirdPartyRate}
                        onChange={(e) => setThirdPartyRate(e.target.value)}
                        placeholder="e.g. 15000"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="arcAmount" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        ARC Amount (₹)
                      </Label>
                      <Input
                        id="arcAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={arcAmount}
                        onChange={(e) => setArcAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Fiber fields */}
                    <div className="space-y-1.5">
                      <Label htmlFor="distance" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        Distance (Meters) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="distance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        placeholder="e.g. 500"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rate" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        Rate per Meter <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="e.g. 25"
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Additional fields for Commission / Third Party */}
              {(isCommissionType || isThirdParty) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bandwidthSpeed" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                      Bandwidth / Speed
                    </Label>
                    <div className="relative">
                      <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="bandwidthSpeed"
                        value={bandwidthSpeed}
                        onChange={(e) => setBandwidthSpeed(e.target.value)}
                        placeholder="e.g. 100 Mbps"
                        className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">GST Applicable</Label>
                    <button
                      type="button"
                      onClick={() => setGstToggle(!gstToggle)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all w-full ${
                        gstToggle
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {gstToggle ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span className="text-sm font-medium">{gstToggle ? 'Yes — 18% GST' : 'No GST'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Third Party extra fields: Payment Terms, Lock-in, Notice Period */}
              {isThirdParty && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="paymentTerms" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                      Payment Terms
                    </Label>
                    <Input
                      id="paymentTerms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="e.g. Net 30 Days"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lockInPeriod" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                      Lock-in Period (Months)
                    </Label>
                    <Input
                      id="lockInPeriod"
                      type="number"
                      min="0"
                      value={lockInPeriod}
                      onChange={(e) => setLockInPeriod(e.target.value)}
                      placeholder="e.g. 12"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="noticePeriod" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                      Notice Period (Months)
                    </Label>
                    <Input
                      id="noticePeriod"
                      type="number"
                      min="0"
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                      placeholder="e.g. 3"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Amount Breakdown */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Breakdown</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
                  <div className="p-4">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">
                      {isCommissionType ? 'Commission Amount' : isThirdParty ? 'Rate Amount' : 'Base Amount'}
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(baseAmount)}</p>
                    {isCommissionType ? (
                      arcAmount && commissionPercentage && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatCurrency(parseFloat(arcAmount))} &times; {commissionPercentage}%
                        </p>
                      )
                    ) : isThirdParty ? (
                      thirdPartyRate && (
                        <p className="text-xs text-slate-400 mt-0.5">Third party rate</p>
                      )
                    ) : (
                      distance && rate && (
                        <p className="text-xs text-slate-400 mt-0.5">{distance}m &times; {formatCurrency(parseFloat(rate))}/m</p>
                      )
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">
                      GST {gstApplicable ? `(${gstPercentage}%)` : '(N/A)'}
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{gstApplicable ? formatCurrency(gstAmount) : '-'}</p>
                    <p className="text-xs mt-0.5">
                      {gstApplicable ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{(isCommissionType || isThirdParty) ? 'GST enabled' : 'Vendor has GST'}</span>
                      ) : (
                        <span className="text-slate-400">No GST applicable</span>
                      )}
                    </p>
                  </div>
                  <div className="p-4 col-span-2 bg-orange-50/50 dark:bg-orange-900/10">
                    <p className="text-[11px] text-orange-500 dark:text-orange-400 font-semibold uppercase mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-1.5">
                <Label htmlFor="terms" className="text-slate-700 dark:text-slate-300 font-medium text-sm">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Enter terms and conditions..."
                  rows={4}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={handleSubmitPO}
                  disabled={isCreating || (isCommissionType ? (!arcAmount || !commissionPercentage) : isThirdParty ? !thirdPartyRate : (!distance || !rate))}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isCreating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    <><FileText className="h-4 w-4 mr-2" />Create PO & Send for Approval</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowCreateForm(false); setSelectedLead(null); }}
                  className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MY POs TAB
         ══════════════════════════════════════════════ */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: '', label: 'All', icon: Receipt, color: 'slate' },
              { key: 'PENDING_APPROVAL', label: 'Pending', icon: Clock, color: 'amber' },
              { key: 'APPROVED', label: 'Approved', icon: CheckCircle, color: 'emerald' },
              { key: 'REJECTED', label: 'Rejected', icon: XCircle, color: 'red' }
            ].map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => { setPosStatusFilter(key); setPosPage(1); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-all flex-shrink-0 whitespace-nowrap ${
                  posStatusFilter === key
                    ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 border border-${color}-300 dark:border-${color}-700`
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : vendorPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Receipt size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No POs found</p>
              <p className="text-sm mt-1">
                {posStatusFilter ? `No ${posStatusFilter === 'PENDING_APPROVAL' ? 'pending' : posStatusFilter.toLowerCase()} POs` : 'Create your first PO from the Eligible Leads tab'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <DataTable
                className="hidden lg:block"
                data={vendorPOs}
                loading={isLoading}
                pagination={true}
                defaultPageSize={10}
                emptyMessage={posStatusFilter ? `No ${posStatusFilter === 'PENDING_APPROVAL' ? 'pending' : posStatusFilter.toLowerCase()} POs` : 'Create your first PO from the Eligible Leads tab'}
                emptyIcon={ShoppingCart}
                serverPagination={posPagination ? {
                  page: posPage,
                  totalPages: posPagination.totalPages,
                  total: posPagination.total,
                  limit: 10
                } : undefined}
                onPageChange={(page) => setPosPage(page)}
                columns={[
                  {
                    key: 'poNumber',
                    label: 'PO Number',
                    render: (po) => (
                      <div className="flex items-center gap-2">
                        <Hash size={13} className="text-slate-400" />
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{po.poNumber}</span>
                      </div>
                    )
                  },
                  {
                    key: 'customer',
                    label: 'Customer',
                    render: (po) => (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{po.customerName || po.lead?.campaignData?.name || '-'}</p>
                        <p className="text-xs text-slate-400">{po.lead?.campaignData?.company || ''}</p>
                      </div>
                    )
                  },
                  {
                    key: 'vendor',
                    label: 'Vendor',
                    render: (po) => <span className="text-slate-700 dark:text-slate-300">{po.vendor?.companyName || '-'}</span>
                  },
                  {
                    key: 'category',
                    label: 'Category',
                    render: (po) => (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold">
                        <Cable size={11} />
                        {po.vendorCategory}
                      </span>
                    )
                  },
                  {
                    key: 'totalAmount',
                    label: 'Total Amount',
                    render: (po) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(po.totalAmount)}</span>
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (po) => getStatusBadge(po.status)
                  },
                  {
                    key: 'created',
                    label: 'Created',
                    render: (po) => (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <CalendarDays size={13} />
                        <span className="text-xs">{new Date(po.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    )
                  },
                  {
                    key: 'actionBy',
                    label: 'Action By',
                    render: (po) => {
                      if (po.approvedBy?.name) {
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle size={12} />
                            {po.approvedBy.name}
                          </span>
                        );
                      }
                      if (po.rejectedBy?.name) {
                        return (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                              <XCircle size={12} />
                              {po.rejectedBy.name}
                            </span>
                            {po.rejectionReason && (
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={po.rejectionReason}>
                                {po.rejectionReason}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return <span className="text-xs text-slate-400">-</span>;
                    }
                  }
                ]}
                actions={(po) => (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleViewPO(po.id)}
                      className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                      title="View PO"
                    >
                      <Eye size={16} />
                    </button>
                    {po.status === 'APPROVED' && po.vendorCategory !== 'COMMISSION' && po.vendorCategory !== 'CHANNEL_PARTNER' && (
                      po.emailSentAt ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded" title={`Sent on ${new Date(po.emailSentAt).toLocaleString('en-IN')}`}>
                          <CheckCircle size={12} />
                          Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenSendEmail(po)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                          title="Send PO to Vendor"
                        >
                          <Send size={16} />
                        </button>
                      )
                    )}
                  </div>
                )}
              />

              {/* Mobile Card View */}
              <div className="lg:hidden p-3 space-y-3">
                {vendorPOs.map((po) => (
                  <div key={po.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-slate-400" />
                        <span className="font-mono text-xs font-semibold">{po.poNumber}</span>
                      </div>
                      {getStatusBadge(po.status)}
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-slate-400 font-semibold uppercase">Customer</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{po.customerName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-semibold uppercase">Vendor</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{po.vendor?.companyName || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Amount</p>
                          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(po.totalAmount)}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Category</p>
                          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{po.vendorCategory}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-400">{new Date(po.createdAt).toLocaleDateString('en-IN')}</span>
                      <div className="flex items-center gap-2">
                        {po.approvedBy?.name && (
                          <span className="text-xs text-emerald-600 font-medium">{po.approvedBy.name}</span>
                        )}
                        {po.rejectedBy?.name && (
                          <span className="text-xs text-red-600 font-medium">{po.rejectedBy.name}</span>
                        )}
                        <button
                          onClick={() => handleViewPO(po.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        {po.status === 'APPROVED' && po.vendorCategory !== 'COMMISSION' && po.vendorCategory !== 'CHANNEL_PARTNER' && (
                          po.emailSentAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
                              <CheckCircle size={12} />
                              Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenSendEmail(po)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                            >
                              <Send size={13} />
                              Send
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {/* ══════════════════════════════════════════════
          PO DOCUMENT VIEW MODAL
         ══════════════════════════════════════════════ */}
      {showPODetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPODetail(false); setViewingPO(null); } }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FileText size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Purchase Order</h2>
                  {viewingPO && <p className="text-xs text-slate-500 font-mono">{viewingPO.poNumber}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingPO?.status === 'APPROVED' && viewingPO?.vendorCategory !== 'COMMISSION' && viewingPO?.vendorCategory !== 'CHANNEL_PARTNER' && (
                  viewingPO.emailSentAt ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg print:hidden">
                      <CheckCircle size={14} />
                      PO Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => { setShowPODetail(false); handleOpenSendEmail(viewingPO); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors print:hidden"
                    >
                      <Send size={14} />
                      Send PO
                    </button>
                  )
                )}
                {viewingPO && (
                  <button
                    onClick={handlePrintPO}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors print:hidden"
                  >
                    <Printer size={14} />
                    Print
                  </button>
                )}
                <button
                  onClick={() => { setShowPODetail(false); setViewingPO(null); }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors print:hidden"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto" id="po-document">
              {isLoadingPO ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <p className="text-sm text-slate-500">Loading purchase order...</p>
                </div>
              ) : viewingPO ? (
                <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {/* PO Title */}
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-bold tracking-wide uppercase">Purchase Order</h1>
                    <div className="mt-2">
                      {viewingPO.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold">
                          <CheckCircle size={12} /> Approved
                        </span>
                      )}
                      {viewingPO.status === 'PENDING_APPROVAL' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">
                          <Clock size={12} /> Pending Approval
                        </span>
                      )}
                      {viewingPO.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Two Column Header Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden mb-6">
                    {/* Left Column - Invoice To & Supplier */}
                    <div className="border-r border-slate-300 dark:border-slate-600">
                      {/* Invoice To */}
                      <div className="border-b border-slate-300 dark:border-slate-600 p-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Invoice To</p>
                        <p className="font-bold text-sm">Gazon Communications India Ltd.</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                          Office No. 1001, 10th Floor, City Avenue,<br />
                          Kolte Patil Developers, Wakad,<br />
                          Pune - 411057
                        </p>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-xs"><span className="text-slate-400">GSTIN/UIN:</span> <span className="font-mono font-medium">27AAECG8392G1Z9</span></p>
                          <p className="text-xs"><span className="text-slate-400">State:</span> Maharashtra, Code: 27</p>
                          <p className="text-xs"><span className="text-slate-400">CIN:</span> <span className="font-mono">U72300MH2012PLC234237</span></p>
                          <p className="text-xs"><span className="text-slate-400">E-Mail:</span> accounts@gazonindia.com</p>
                        </div>
                      </div>
                      {/* Supplier */}
                      <div className="p-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Supplier (Bill From)</p>
                        <p className="font-bold text-sm">{viewingPO.vendor?.companyName || '-'}</p>
                        {(viewingPO.vendor?.address || viewingPO.vendor?.city) && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                            {viewingPO.vendor?.address}
                            {viewingPO.vendor?.city && <><br />{viewingPO.vendor.city}{viewingPO.vendor?.state ? `, ${viewingPO.vendor.state}` : ''}</>}
                          </p>
                        )}
                        <div className="mt-2 space-y-0.5">
                          {viewingPO.vendor?.gstNumber && (
                            <p className="text-xs"><span className="text-slate-400">GSTIN/UIN:</span> <span className="font-mono font-medium">{viewingPO.vendor.gstNumber}</span></p>
                          )}
                          {viewingPO.vendor?.panNumber && (
                            <p className="text-xs"><span className="text-slate-400">PAN:</span> <span className="font-mono font-medium">{viewingPO.vendor.panNumber}</span></p>
                          )}
                          {viewingPO.vendor?.state && (
                            <p className="text-xs"><span className="text-slate-400">State:</span> {viewingPO.vendor.state}</p>
                          )}
                          {viewingPO.vendor?.contactPerson && (
                            <p className="text-xs"><span className="text-slate-400">Contact:</span> {viewingPO.vendor.contactPerson}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - PO Details */}
                    <div>
                      <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Voucher No.</p>
                          <p className="text-sm font-bold font-mono mt-1">{viewingPO.poNumber}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Dated</p>
                          <p className="text-sm font-medium mt-1">
                            {new Date(viewingPO.poDate || viewingPO.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Mode/Terms of Payment</p>
                          <p className="text-sm font-medium mt-1">{viewingPO.paymentTerms || `${viewingPO.validityMonths} Months`}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Other References</p>
                          <p className="text-sm font-medium mt-1">{viewingPO.vendorCategory || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Customer Name</p>
                          <p className="text-sm font-medium mt-1">{viewingPO.customerName || '-'}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Company</p>
                          <p className="text-sm font-medium mt-1">{viewingPO.lead?.campaignData?.company || '-'}</p>
                        </div>
                      </div>
                      {(viewingPO.vendorCategory === 'COMMISSION' || viewingPO.vendorCategory === 'CHANNEL_PARTNER') ? (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">ARC Amount</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.arcAmount ? formatCurrency(viewingPO.arcAmount) : '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Commission %</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.commissionPercentage ? `${viewingPO.commissionPercentage}%` : '-'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Bandwidth / Speed</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.bandwidthSpeed || '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Products</p>
                              <p className="text-sm font-medium mt-1">
                                {viewingPO.lead?.products?.length > 0
                                  ? viewingPO.lead.products.map(p => p.product?.title).join(', ')
                                  : '-'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : viewingPO.vendorCategory === 'THIRD_PARTY' ? (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">ARC Amount</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.arcAmount ? formatCurrency(viewingPO.arcAmount) : '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Bandwidth / Speed</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.bandwidthSpeed || '-'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Payment Terms</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.paymentTerms || '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Products</p>
                              <p className="text-sm font-medium mt-1">
                                {viewingPO.lead?.products?.length > 0
                                  ? viewingPO.lead.products.map(p => p.product?.title).join(', ')
                                  : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Lock-in Period</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.lockInPeriod ? `${viewingPO.lockInPeriod} Months` : '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Notice Period</p>
                              <p className="text-sm font-medium mt-1">{viewingPO.noticePeriod ? `${viewingPO.noticePeriod} Months` : '-'}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-600 border-b border-slate-300 dark:border-slate-600">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">POP Location</p>
                              <p className="text-xs font-medium mt-1 leading-relaxed">{viewingPO.popLocation || viewingPO.lead?.fromAddress || '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Installation</p>
                              <p className="text-xs font-medium mt-1 leading-relaxed">{viewingPO.installationLocation || viewingPO.lead?.installationAddress || '-'}</p>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase">Products</p>
                            <p className="text-sm font-medium mt-1">
                              {viewingPO.lead?.products?.length > 0
                                ? viewingPO.lead.products.map(p => p.product?.title).join(', ')
                                : '-'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600">
                          <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-10 border-r border-slate-300 dark:border-slate-600">Sl No.</th>
                          <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-300 dark:border-slate-600">Description of Services</th>
                          <th className="py-2.5 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-20 border-r border-slate-300 dark:border-slate-600">Qty</th>
                          <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-24 border-r border-slate-300 dark:border-slate-600">Rate</th>
                          <th className="py-2.5 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-16 border-r border-slate-300 dark:border-slate-600">Per</th>
                          <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-28">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Main Line Item */}
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 font-medium">1</td>
                          <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
                            {(viewingPO.vendorCategory === 'COMMISSION' || viewingPO.vendorCategory === 'CHANNEL_PARTNER') ? (
                              <>
                                <p className="font-semibold">{viewingPO.vendorCategory === 'CHANNEL_PARTNER' ? 'Channel Partner Commission' : 'Commission on ARC'}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {viewingPO.customerName}
                                  {viewingPO.bandwidthSpeed && ` — Bandwidth: ${viewingPO.bandwidthSpeed}`}
                                </p>
                                {viewingPO.arcAmount && (
                                  <p className="text-xs text-slate-500">ARC: {formatCurrency(viewingPO.arcAmount)} @ {viewingPO.commissionPercentage}%</p>
                                )}
                              </>
                            ) : viewingPO.vendorCategory === 'THIRD_PARTY' ? (
                              <>
                                <p className="font-semibold">Third Party Services</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {viewingPO.customerName}
                                  {viewingPO.bandwidthSpeed && ` — Bandwidth: ${viewingPO.bandwidthSpeed}`}
                                </p>
                                {viewingPO.arcAmount && (
                                  <p className="text-xs text-slate-500">ARC: {formatCurrency(viewingPO.arcAmount)}</p>
                                )}
                                {viewingPO.paymentTerms && (
                                  <p className="text-xs text-slate-500">Payment Terms: {viewingPO.paymentTerms}</p>
                                )}
                                {(viewingPO.lockInPeriod || viewingPO.noticePeriod) && (
                                  <p className="text-xs text-slate-500">
                                    {viewingPO.lockInPeriod && `Lock-in: ${viewingPO.lockInPeriod}M`}
                                    {viewingPO.lockInPeriod && viewingPO.noticePeriod && ' | '}
                                    {viewingPO.noticePeriod && `Notice: ${viewingPO.noticePeriod}M`}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="font-semibold">Fiber Laying Services</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {viewingPO.customerName}
                                  {viewingPO.distance && ` — Distance: ${viewingPO.distance}m`}
                                </p>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 font-mono">
                            {(viewingPO.vendorCategory === 'COMMISSION' || viewingPO.vendorCategory === 'CHANNEL_PARTNER')
                              ? (viewingPO.commissionPercentage ? `${viewingPO.commissionPercentage}%` : '1')
                              : viewingPO.vendorCategory === 'THIRD_PARTY' ? '1'
                              : (viewingPO.distance || 1)}
                          </td>
                          <td className="py-3 px-3 text-right border-r border-slate-200 dark:border-slate-700 font-mono">
                            {(viewingPO.vendorCategory === 'COMMISSION' || viewingPO.vendorCategory === 'CHANNEL_PARTNER')
                              ? (viewingPO.arcAmount ? formatCurrency(viewingPO.arcAmount) : '-')
                              : (viewingPO.rate ? formatCurrency(viewingPO.rate) : '-')}
                          </td>
                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700">
                            {(viewingPO.vendorCategory === 'COMMISSION' || viewingPO.vendorCategory === 'CHANNEL_PARTNER') ? '%'
                              : viewingPO.vendorCategory === 'THIRD_PARTY' ? 'Nos'
                              : (viewingPO.distance ? 'Mtr' : 'Nos')}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold font-mono">{formatCurrency(viewingPO.baseAmount)}</td>
                        </tr>

                        {/* GST Rows */}
                        {viewingPO.gstApplicable && (
                          <>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 pl-6">
                                Input SGST - {viewingPO.gstPercentage / 2}%
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 text-xs">{viewingPO.gstPercentage / 2} %</td>
                              <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(viewingPO.gstAmount / 2)}</td>
                            </tr>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 pl-6">
                                Input CGST - {viewingPO.gstPercentage / 2}%
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 text-xs">{viewingPO.gstPercentage / 2} %</td>
                              <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(viewingPO.gstAmount / 2)}</td>
                            </tr>
                          </>
                        )}

                        {/* Total Row */}
                        <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-400 dark:border-slate-500">
                          <td colSpan={5} className="py-3 px-3 border-r border-slate-300 dark:border-slate-600">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">Amount Chargeable (in words)</p>
                              <p className="text-xs font-semibold mt-1 italic">{numberToWords(viewingPO.totalAmount)}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase">Total</p>
                            <p className="text-lg font-bold text-orange-700 dark:text-orange-300 font-mono">{formatCurrency(viewingPO.totalAmount)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">E & O.E</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left - PAN & Terms */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Company's PAN</p>
                        <p className="text-sm font-mono font-semibold mt-0.5">AAECG8392G</p>
                      </div>
                      {viewingPO.termsAndConditions && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Terms & Conditions</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            {viewingPO.termsAndConditions}
                          </p>
                        </div>
                      )}
                      {viewingPO.rejectionReason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-[10px] font-semibold text-red-500 uppercase">Rejection Reason</p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">{viewingPO.rejectionReason}</p>
                          {viewingPO.rejectedBy?.name && (
                            <p className="text-[10px] text-red-400 mt-1">By {viewingPO.rejectedBy.name}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right - Signatures */}
                    <div className="flex flex-col items-end justify-between text-right">
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">for Gazon Communications India Ltd.</p>
                      </div>
                      <div className="mt-10">
                        <div className="border-t border-slate-300 dark:border-slate-600 pt-2 min-w-[180px]">
                          <p className="text-xs font-semibold text-slate-500">Authorised Signatory</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                    <span>Created by {viewingPO.createdBy?.name || '-'} on {new Date(viewingPO.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {viewingPO.approvedBy?.name && (
                      <span className="text-emerald-600 font-medium">Approved by {viewingPO.approvedBy.name}{viewingPO.approvedAt ? ` on ${new Date(viewingPO.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SEND PO EMAIL MODAL
         ══════════════════════════════════════════════ */}
      {showSendEmail && sendingPO && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSendEmail(false); setSendingPO(null); } }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Mail size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Send Purchase Order</h2>
                  <p className="text-xs text-muted-foreground font-mono">{sendingPO.poNumber}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowSendEmail(false); setSendingPO(null); }}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {/* PO Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">PO Summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Customer</p>
                    <p className="font-medium">{sendingPO.customerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Vendor</p>
                    <p className="font-medium">{sendingPO.vendor?.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Category</p>
                    <p className="font-medium">{sendingPO.vendorCategory}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Base Amount</p>
                    <p className="font-medium">{formatCurrency(sendingPO.baseAmount)}</p>
                  </div>
                  {sendingPO.gstApplicable && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">GST ({sendingPO.gstPercentage}%)</p>
                      <p className="font-medium">{formatCurrency(sendingPO.gstAmount)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(sendingPO.totalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Email Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emailTo" className="text-sm font-medium flex items-center gap-1.5">
                    <AtSign size={14} className="text-muted-foreground" />
                    To <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emailTo"
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="vendor@example.com"
                    className="h-9"
                  />
                  {!emailTo && sendingPO.vendor?.email === null && (
                    <p className="text-xs text-amber-600">Vendor has no email on file. Please enter manually.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emailCc" className="text-sm font-medium text-muted-foreground">CC (comma separated)</Label>
                  <Input
                    id="emailCc"
                    type="text"
                    value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                    placeholder="cc1@example.com, cc2@example.com"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emailSubject" className="text-sm font-medium">Subject <span className="text-red-500">*</span></Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Purchase Order Subject"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emailMessage" className="text-sm font-medium">Message</Label>
                  <Textarea
                    id="emailMessage"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Email body..."
                    rows={10}
                    className="resize-none text-sm leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex-shrink-0">
              <Button
                onClick={handleConfirmSendEmail}
                disabled={isSendingEmail || !emailTo.trim() || !emailSubject.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
              <Button
                variant="outline"
                className="ml-auto"
                onClick={() => { setShowSendEmail(false); setSendingPO(null); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
