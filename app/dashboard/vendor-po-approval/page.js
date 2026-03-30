'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2,
  IndianRupee,
  Clock,
  Ruler,
  Receipt,
  AlertCircle,
  Eye,
  Package,
  CalendarDays,
  Hash,
  Printer,
  Cable,
  Send,
  Mail,
  AtSign,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { formatCurrency } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const getStatusBadge = (status) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'APPROVED':
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getCategoryBadge = (category) => {
  const map = {
    FIBER: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    SWITCH: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    MEDIA_CONVERTER: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
    ROUTER: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
    SFP: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
    RF: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    COMMISSION: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    CHANNEL_PARTNER: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
    THIRD_PARTY: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  };
  const style = map[category] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' };
  const labels = { CHANNEL_PARTNER: 'Channel Partner', THIRD_PARTY: 'Third Party' };
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} text-xs font-medium`}>
      {labels[category] || category}
    </Badge>
  );
};

export default function VendorPOApprovalPage() {
  const router = useRouter();
  const { user, isSuperAdmin: isAdmin } = useRoleCheck();
  const {
    vendorPOs,
    vendorPOStats,
    fetchVendorPOApprovalQueue,
    approveVendorPO,
    rejectVendorPO,
    getVendorPOById,
    sendVendorPOEmail,
    isLoading
  } = useLeadStore();

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState(''); // '' = all, 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'

  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isLoadingPO, setIsLoadingPO] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Send PO email state
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendingPO, setSendingPO] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router]);

  const loadQueue = useCallback(async () => {
    const result = await fetchVendorPOApprovalQueue(page, 10, statusFilter);
    if (result.success) {
      setPagination(result.data.pagination);
    }
  }, [page, statusFilter, fetchVendorPOApprovalQueue]);

  useEffect(() => {
    if (user && isAdmin) {
      loadQueue();
    }
  }, [user, isAdmin, loadQueue]);

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const handleViewPO = async (po) => {
    setIsLoadingPO(true);
    setShowDetail(true);
    setSelectedPO(po); // show basic data immediately
    const result = await getVendorPOById(po.id);
    if (result.success) {
      setSelectedPO(result.po);
    }
    setIsLoadingPO(false);
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
    parts.push(remaining % 1000); remaining = Math.floor(remaining / 1000);
    while (remaining > 0) { parts.push(remaining % 100); remaining = Math.floor(remaining / 100); }
    let result = '';
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === 0) continue;
      result += getHundreds(parts[i]) + ' ' + scales[i] + ' ';
    }
    result = 'INR ' + result.trim();
    if (decimal > 0) result += ' and ' + getHundreds(decimal) + ' Paise';
    result += ' Only';
    return result;
  };

  const handleApprove = async (po) => {
    setIsProcessing(true);
    const result = await approveVendorPO(po.id);
    setIsProcessing(false);
    if (result.success) {
      toast.success(result.message || 'PO approved!');
      setShowDetail(false);
      setSelectedPO(null);
      loadQueue();
    } else {
      toast.error(result.error || 'Failed to approve PO.');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsProcessing(true);
    const result = await rejectVendorPO(selectedPO.id, rejectReason.trim());
    setIsProcessing(false);
    if (result.success) {
      toast.success(result.message || 'PO rejected.');
      setShowRejectDialog(false);
      setShowDetail(false);
      setSelectedPO(null);
      setRejectReason('');
      loadQueue();
    } else {
      toast.error(result.error || 'Failed to reject PO.');
    }
  };

  const handleOpenSendEmail = async (po) => {
    let fullPO = po;
    if (!po.vendor?.email && po.vendor?.email !== null) {
      const result = await getVendorPOById(po.id);
      if (result.success) fullPO = result.po;
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
      loadQueue();
    } else {
      toast.error(result.error || 'Failed to send email.');
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader title="Vendor PO Approval" description="Review and approve vendor purchase orders">
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{vendorPOStats.pending + vendorPOStats.approved + vendorPOStats.rejected} total POs</span>
        </div>
      </PageHeader>

      {/* Stats Cards - Clickable Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={`border-l-4 border-l-amber-500 hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'PENDING_APPROVAL' ? 'ring-2 ring-amber-500 shadow-md' : ''
          }`}
          onClick={() => handleFilterChange(statusFilter === 'PENDING_APPROVAL' ? '' : 'PENDING_APPROVAL')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-3xl font-bold mt-1">{vendorPOStats.pending}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                statusFilter === 'PENDING_APPROVAL' ? 'bg-amber-200 dark:bg-amber-800/50' : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-l-4 border-l-emerald-500 hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'APPROVED' ? 'ring-2 ring-emerald-500 shadow-md' : ''
          }`}
          onClick={() => handleFilterChange(statusFilter === 'APPROVED' ? '' : 'APPROVED')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-3xl font-bold mt-1">{vendorPOStats.approved}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                statusFilter === 'APPROVED' ? 'bg-emerald-200 dark:bg-emerald-800/50' : 'bg-emerald-100 dark:bg-emerald-900/30'
              }`}>
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-l-4 border-l-red-500 hover:shadow-md transition-all cursor-pointer ${
            statusFilter === 'REJECTED' ? 'ring-2 ring-red-500 shadow-md' : ''
          }`}
          onClick={() => handleFilterChange(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejected</p>
                <p className="text-3xl font-bold mt-1">{vendorPOStats.rejected}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                statusFilter === 'REJECTED' ? 'bg-red-200 dark:bg-red-800/50' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Showing:</span>
          <Badge variant="outline" className="text-xs font-medium">
            {statusFilter === 'PENDING_APPROVAL' ? 'Pending' : statusFilter === 'APPROVED' ? 'Approved' : 'Rejected'} POs
          </Badge>
          <button
            onClick={() => handleFilterChange('')}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Show all
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        title="Vendor Purchase Orders"
        totalCount={pagination?.total}
        columns={[
          {
            key: 'poNumber',
            label: 'PO Number',
            render: (po) => (
              <span className="font-mono text-xs font-semibold text-primary/80 whitespace-nowrap">{po.poNumber}</span>
            ),
          },
          {
            key: 'customerName',
            label: 'Customer',
            render: (po) => (
              <span className="font-medium whitespace-nowrap">{po.customerName}</span>
            ),
          },
          {
            key: 'vendor',
            label: 'Vendor',
            render: (po) => (
              <span className="text-muted-foreground whitespace-nowrap">{po.vendor?.companyName || '-'}</span>
            ),
          },
          {
            key: 'vendorCategory',
            label: 'Category',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (po) => getCategoryBadge(po.vendorCategory),
          },
          {
            key: 'totalAmount',
            label: 'Amount',
            className: 'text-right',
            cellClassName: 'text-right',
            render: (po) => (
              <span className="font-semibold tabular-nums whitespace-nowrap">{formatCurrency(po.totalAmount)}</span>
            ),
          },
          {
            key: 'createdBy',
            label: 'Created By',
            render: (po) => (
              <span className="text-muted-foreground text-xs whitespace-nowrap">{po.createdBy?.name || '-'}</span>
            ),
          },
          {
            key: 'createdAt',
            label: 'Date',
            render: (po) => (
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (po) => (
              <div className="inline-flex flex-col items-center gap-0.5">
                {getStatusBadge(po.status)}
                {po.approvedBy?.name && (
                  <span className="text-[10px] text-muted-foreground">by {po.approvedBy.name}</span>
                )}
                {po.rejectedBy?.name && (
                  <span className="text-[10px] text-muted-foreground">by {po.rejectedBy.name}</span>
                )}
              </div>
            ),
          },
        ]}
        data={vendorPOs}
        loading={isLoading}
        pagination
        defaultPageSize={10}
        serverPagination={pagination ? { page, limit: 10, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setPage(1); }}
        emptyMessage={
          statusFilter === 'APPROVED' ? 'No approved POs'
            : statusFilter === 'REJECTED' ? 'No rejected POs'
            : 'No vendor POs found.'
        }
        emptyIcon={ShoppingCart}
        actions={(po) => (
          <div className="flex items-center justify-end gap-1">
            <button
              title="View PO"
              onClick={() => handleViewPO(po)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
            {po.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={() => handleApprove(po)}
                  disabled={isProcessing}
                  className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => { setSelectedPO(po); setShowRejectDialog(true); }}
                  disabled={isProcessing}
                  className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            )}
            {po.status === 'APPROVED' && po.vendorCategory !== 'COMMISSION' && po.vendorCategory !== 'CHANNEL_PARTNER' && (
              po.emailSentAt ? (
                <span className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" title={`Sent on ${new Date(po.emailSentAt).toLocaleString('en-IN')}`}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  PO Sent
                </span>
              ) : (
                <button
                  onClick={() => handleOpenSendEmail(po)}
                  className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send PO
                </button>
              )
            )}
          </div>
        )}
      />

      {/* PO Document View Modal */}
      {showDetail && selectedPO && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDetail(false); setSelectedPO(null); } }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Purchase Order</h2>
                  <p className="text-xs text-muted-foreground font-mono">{selectedPO.poNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedPO.status === 'APPROVED' && selectedPO.vendorCategory !== 'COMMISSION' && selectedPO.vendorCategory !== 'CHANNEL_PARTNER' && (
                  selectedPO.emailSentAt ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg print:hidden">
                      <CheckCircle size={14} />
                      PO Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => { setShowDetail(false); handleOpenSendEmail(selectedPO); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors print:hidden"
                    >
                      <Send size={14} />
                      Send PO
                    </button>
                  )
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors print:hidden"
                >
                  <Printer size={14} />
                  Print
                </button>
                <button
                  onClick={() => { setShowDetail(false); setSelectedPO(null); }}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors print:hidden"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {isLoadingPO ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading purchase order...</p>
                </div>
              ) : (
                <div className="p-6 sm:p-8">
                  {/* PO Title */}
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-bold tracking-wide uppercase">Purchase Order</h1>
                    <div className="mt-2">
                      {getStatusBadge(selectedPO.status)}
                    </div>
                  </div>

                  {/* Two Column Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden mb-6">
                    {/* Left - Invoice To & Supplier */}
                    <div className="border-r border-border">
                      <div className="border-b border-border p-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice To</p>
                        <p className="font-bold text-sm">Gazon Communications India Ltd.</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                          Office No. 1001, 10th Floor, City Avenue,<br />
                          Kolte Patil Developers, Wakad, Pune - 411057
                        </p>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-xs"><span className="text-muted-foreground">GSTIN/UIN:</span> <span className="font-mono font-medium">27AAECG8392G1Z9</span></p>
                          <p className="text-xs"><span className="text-muted-foreground">State:</span> Maharashtra, Code: 27</p>
                          <p className="text-xs"><span className="text-muted-foreground">CIN:</span> <span className="font-mono">U72300MH2012PLC234237</span></p>
                          <p className="text-xs"><span className="text-muted-foreground">E-Mail:</span> accounts@gazonindia.com</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Supplier (Bill From)</p>
                        <p className="font-bold text-sm">{selectedPO.vendor?.companyName || '-'}</p>
                        {(selectedPO.vendor?.address || selectedPO.vendor?.city) && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            {selectedPO.vendor?.address}
                            {selectedPO.vendor?.city && <><br />{selectedPO.vendor.city}{selectedPO.vendor?.state ? `, ${selectedPO.vendor.state}` : ''}</>}
                          </p>
                        )}
                        <div className="mt-2 space-y-0.5">
                          {selectedPO.vendor?.gstNumber && (
                            <p className="text-xs"><span className="text-muted-foreground">GSTIN/UIN:</span> <span className="font-mono font-medium">{selectedPO.vendor.gstNumber}</span></p>
                          )}
                          {selectedPO.vendor?.panNumber && (
                            <p className="text-xs"><span className="text-muted-foreground">PAN:</span> <span className="font-mono font-medium">{selectedPO.vendor.panNumber}</span></p>
                          )}
                          {selectedPO.vendor?.contactPerson && (
                            <p className="text-xs"><span className="text-muted-foreground">Contact:</span> {selectedPO.vendor.contactPerson}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right - PO Details */}
                    <div>
                      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Voucher No.</p>
                          <p className="text-sm font-bold font-mono mt-1">{selectedPO.poNumber}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Dated</p>
                          <p className="text-sm font-medium mt-1">
                            {new Date(selectedPO.poDate || selectedPO.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Mode/Terms of Payment</p>
                          <p className="text-sm font-medium mt-1">{selectedPO.paymentTerms || `${selectedPO.validityMonths} Months`}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Category</p>
                          <div className="mt-1">{getCategoryBadge(selectedPO.vendorCategory)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Customer Name</p>
                          <p className="text-sm font-medium mt-1">{selectedPO.customerName || '-'}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Company</p>
                          <p className="text-sm font-medium mt-1">{selectedPO.lead?.campaignData?.company || '-'}</p>
                        </div>
                      </div>
                      {(selectedPO.vendorCategory === 'COMMISSION' || selectedPO.vendorCategory === 'CHANNEL_PARTNER') ? (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">ARC Amount</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.arcAmount ? formatCurrency(selectedPO.arcAmount) : '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Commission %</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.commissionPercentage ? `${selectedPO.commissionPercentage}%` : '-'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-border">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Bandwidth / Speed</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.bandwidthSpeed || '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Products</p>
                              <p className="text-sm font-medium mt-1">
                                {selectedPO.lead?.products?.length > 0
                                  ? selectedPO.lead.products.map(p => p.product?.title).join(', ')
                                  : '-'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : selectedPO.vendorCategory === 'THIRD_PARTY' ? (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">ARC Amount</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.arcAmount ? formatCurrency(selectedPO.arcAmount) : '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Bandwidth / Speed</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.bandwidthSpeed || '-'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Payment Terms</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.paymentTerms || '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Products</p>
                              <p className="text-sm font-medium mt-1">
                                {selectedPO.lead?.products?.length > 0
                                  ? selectedPO.lead.products.map(p => p.product?.title).join(', ')
                                  : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-border">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Lock-in Period</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.lockInPeriod ? `${selectedPO.lockInPeriod} Months` : '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Notice Period</p>
                              <p className="text-sm font-medium mt-1">{selectedPO.noticePeriod ? `${selectedPO.noticePeriod} Months` : '-'}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">POP Location</p>
                              <p className="text-xs font-medium mt-1 leading-relaxed">{selectedPO.popLocation || selectedPO.lead?.fromAddress || '-'}</p>
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Installation</p>
                              <p className="text-xs font-medium mt-1 leading-relaxed">{selectedPO.installationLocation || selectedPO.lead?.installationAddress || '-'}</p>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Products</p>
                            <p className="text-sm font-medium mt-1">
                              {selectedPO.lead?.products?.length > 0
                                ? selectedPO.lead.products.map(p => p.product?.title).join(', ')
                                : '-'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-border rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10 border-r border-border">Sl No.</th>
                          <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Description of Services</th>
                          <th className="py-2.5 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-20 border-r border-border">Qty</th>
                          <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24 border-r border-border">Rate</th>
                          <th className="py-2.5 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 border-r border-border">Per</th>
                          <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/60">
                          <td className="py-3 px-3 text-center border-r border-border/60 font-medium">1</td>
                          <td className="py-3 px-3 border-r border-border/60">
                            {(selectedPO.vendorCategory === 'COMMISSION' || selectedPO.vendorCategory === 'CHANNEL_PARTNER') ? (
                              <>
                                <p className="font-semibold">{selectedPO.vendorCategory === 'CHANNEL_PARTNER' ? 'Channel Partner Commission' : 'Commission on ARC'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {selectedPO.customerName}
                                  {selectedPO.bandwidthSpeed && ` — Bandwidth: ${selectedPO.bandwidthSpeed}`}
                                </p>
                                {selectedPO.arcAmount && (
                                  <p className="text-xs text-muted-foreground">ARC: {formatCurrency(selectedPO.arcAmount)} @ {selectedPO.commissionPercentage}%</p>
                                )}
                              </>
                            ) : selectedPO.vendorCategory === 'THIRD_PARTY' ? (
                              <>
                                <p className="font-semibold">Third Party Services</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {selectedPO.customerName}
                                  {selectedPO.bandwidthSpeed && ` — Bandwidth: ${selectedPO.bandwidthSpeed}`}
                                </p>
                                {selectedPO.arcAmount && (
                                  <p className="text-xs text-muted-foreground">ARC: {formatCurrency(selectedPO.arcAmount)}</p>
                                )}
                                {selectedPO.paymentTerms && (
                                  <p className="text-xs text-muted-foreground">Payment Terms: {selectedPO.paymentTerms}</p>
                                )}
                                {(selectedPO.lockInPeriod || selectedPO.noticePeriod) && (
                                  <p className="text-xs text-muted-foreground">
                                    {selectedPO.lockInPeriod && `Lock-in: ${selectedPO.lockInPeriod}M`}
                                    {selectedPO.lockInPeriod && selectedPO.noticePeriod && ' | '}
                                    {selectedPO.noticePeriod && `Notice: ${selectedPO.noticePeriod}M`}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="font-semibold">Fiber Laying Services</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {selectedPO.customerName}
                                  {selectedPO.distance && ` — Distance: ${selectedPO.distance}m`}
                                </p>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center border-r border-border/60 font-mono">
                            {(selectedPO.vendorCategory === 'COMMISSION' || selectedPO.vendorCategory === 'CHANNEL_PARTNER')
                              ? (selectedPO.commissionPercentage ? `${selectedPO.commissionPercentage}%` : '1')
                              : selectedPO.vendorCategory === 'THIRD_PARTY' ? '1'
                              : (selectedPO.distance || 1)}
                          </td>
                          <td className="py-3 px-3 text-right border-r border-border/60 font-mono">
                            {(selectedPO.vendorCategory === 'COMMISSION' || selectedPO.vendorCategory === 'CHANNEL_PARTNER')
                              ? (selectedPO.arcAmount ? formatCurrency(selectedPO.arcAmount) : '-')
                              : (selectedPO.rate ? formatCurrency(selectedPO.rate) : '-')}
                          </td>
                          <td className="py-3 px-3 text-center border-r border-border/60">
                            {(selectedPO.vendorCategory === 'COMMISSION' || selectedPO.vendorCategory === 'CHANNEL_PARTNER') ? '%'
                              : selectedPO.vendorCategory === 'THIRD_PARTY' ? 'Nos'
                              : (selectedPO.distance ? 'Mtr' : 'Nos')}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold font-mono">{formatCurrency(selectedPO.baseAmount)}</td>
                        </tr>
                        {selectedPO.gstApplicable && (
                          <>
                            <tr className="border-b border-border/60 bg-muted/20">
                              <td className="py-2 px-3 border-r border-border/60"></td>
                              <td className="py-2 px-3 border-r border-border/60 text-xs text-muted-foreground pl-6">Input SGST - {selectedPO.gstPercentage / 2}%</td>
                              <td className="py-2 px-3 border-r border-border/60"></td>
                              <td className="py-2 px-3 border-r border-border/60"></td>
                              <td className="py-2 px-3 text-center border-r border-border/60 text-xs">{selectedPO.gstPercentage / 2} %</td>
                              <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(selectedPO.gstAmount / 2)}</td>
                            </tr>
                            <tr className="border-b border-border/60 bg-muted/20">
                              <td className="py-2 px-3 border-r border-border/60"></td>
                              <td className="py-2 px-3 border-r border-border/60 text-xs text-muted-foreground pl-6">Input CGST - {selectedPO.gstPercentage / 2}%</td>
                              <td className="py-2 px-3 border-r border-border/60"></td>
                              <td className="py-2 px-3 border-r border-border/60"></td>
                              <td className="py-2 px-3 text-center border-r border-border/60 text-xs">{selectedPO.gstPercentage / 2} %</td>
                              <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(selectedPO.gstAmount / 2)}</td>
                            </tr>
                          </>
                        )}
                        <tr className="bg-muted/40 border-t-2 border-border">
                          <td colSpan={5} className="py-3 px-3 border-r border-border">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Amount Chargeable (in words)</p>
                            <p className="text-xs font-semibold mt-1 italic">{numberToWords(selectedPO.totalAmount)}</p>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total</p>
                            <p className="text-lg font-bold text-primary font-mono">{formatCurrency(selectedPO.totalAmount)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">E & O.E</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Company's PAN</p>
                        <p className="text-sm font-mono font-semibold mt-0.5">AAECG8392G</p>
                      </div>
                      {selectedPO.termsAndConditions && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Terms & Conditions</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-lg border">{selectedPO.termsAndConditions}</p>
                        </div>
                      )}
                      {selectedPO.rejectionReason && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-[10px] font-semibold text-red-500 uppercase">Rejection Reason</p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">{selectedPO.rejectionReason}</p>
                          {selectedPO.rejectedBy?.name && <p className="text-[10px] text-red-400 mt-1">By {selectedPO.rejectedBy.name}</p>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between text-right">
                      <p className="text-xs font-medium text-muted-foreground">for Gazon Communications India Ltd.</p>
                      <div className="mt-10">
                        <div className="border-t border-border pt-2 min-w-[180px]">
                          <p className="text-xs font-semibold text-muted-foreground">Authorised Signatory</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Created by {selectedPO.createdBy?.name || '-'} on {new Date(selectedPO.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {selectedPO.approvedBy?.name && (
                      <span className="text-emerald-600 font-medium">Approved by {selectedPO.approvedBy.name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex-shrink-0 print:hidden">
              {selectedPO.status === 'PENDING_APPROVAL' ? (
                <>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(selectedPO)} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve PO
                  </Button>
                  <Button variant="destructive" onClick={() => setShowRejectDialog(true)} disabled={isProcessing}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject PO
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedPO.status)}
                  {selectedPO.approvedBy?.name && <span className="text-xs text-muted-foreground">by {selectedPO.approvedBy.name}</span>}
                  {selectedPO.rejectedBy?.name && <span className="text-xs text-muted-foreground">by {selectedPO.rejectedBy.name}</span>}
                </div>
              )}
              <Button variant="outline" className="ml-auto" onClick={() => { setShowDetail(false); setSelectedPO(null); }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowRejectDialog(false); setRejectReason(''); } }}>
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Reject Purchase Order</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedPO.poNumber}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="rejectReason" className="text-sm font-medium">Rejection Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()} className="flex-1">
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Confirm Rejection
                </Button>
                <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send PO Email Modal */}
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
                  {!emailTo && (
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
