'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Download,
  Phone,
  PhoneOff,
  PhoneCall,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Format time for timer
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Mask phone number (show only last 4 digits)
const maskPhoneNumber = (phone) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  return '******' + cleaned.slice(-4);
};

// Ageing bucket colors
const BUCKET_COLORS = {
  '1-30': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500' },
  '31-60': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-500' },
  '61-90': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-500' },
  '90+': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' }
};

const BUCKET_LABELS = {
  '1-30': '1-30 Days',
  '31-60': '31-60 Days',
  '61-90': '61-90 Days',
  '90+': '90+ Days'
};

// Call outcome options
const CALL_OUTCOMES = [
  { value: 'RINGING_NOT_PICKED', label: 'Ringing - Not Picked Up', color: 'bg-slate-100 text-slate-700' },
  { value: 'PROMISE_TO_PAY', label: 'Promise to Pay', color: 'bg-blue-100 text-blue-700', hasDate: true },
  { value: 'ALREADY_PAID', label: 'Already Paid / Payment Done', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'PAYMENT_INITIATED', label: 'Payment Initiated', color: 'bg-green-100 text-green-700' },
  { value: 'DISPUTE', label: 'Dispute / Issue Raised', color: 'bg-red-100 text-red-700' },
  { value: 'CALL_BACK_LATER', label: 'Call Back Later', color: 'bg-amber-100 text-amber-700' },
  { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'bg-gray-100 text-gray-700' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'bg-rose-100 text-rose-700' },
  { value: 'OTHER', label: 'Other', color: 'bg-orange-100 text-orange-700' }
];

export default function AgeingReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Call state
  const [activeCall, setActiveCall] = useState(null); // { invoiceId, startTime }
  const [callDuration, setCallDuration] = useState(0);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callInvoice, setCallInvoice] = useState(null);
  const [callOutcome, setCallOutcome] = useState('');
  const [callRemark, setCallRemark] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState({}); // Track which phones are revealed

  const timerRef = useRef(null);

  // Decode bucket to handle URL encoding (e.g., "90%2B" -> "90+")
  const rawBucket = searchParams.get('bucket') || '';
  const bucket = rawBucket ? decodeURIComponent(rawBucket) : '';
  const bucketStyle = BUCKET_COLORS[bucket] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-500' };

  // Fetch ageing report
  const fetchAgeingReport = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (bucket) params.append('bucket', bucket);

      const response = await api.get(`/accounts-dashboard/ageing-report?${params.toString()}`);
      setInvoices(response.data.invoices || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error('Failed to load ageing report');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    if (user && (isAccountsTeam || isAdmin)) {
      fetchAgeingReport(1);
    }
  }, [user, isAccountsTeam, isAdmin, bucket]);

  // Call timer effect
  useEffect(() => {
    if (activeCall) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeCall.startTime) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeCall]);

  const handlePageChange = (newPage) => {
    fetchAgeingReport(newPage);
  };

  const handleBucketChange = (newBucket) => {
    if (newBucket === bucket) {
      router.push('/dashboard/accounts-dashboard/ageing-report');
    } else {
      router.push(`/dashboard/accounts-dashboard/ageing-report?bucket=${encodeURIComponent(newBucket)}`);
    }
  };

  const handleInvoiceClick = (invoice) => {
    // Navigate to customer billing page using leadId
    if (invoice.leadId) {
      router.push(`/dashboard/billing-mgmt/${invoice.leadId}`);
    }
  };

  const handleExport = () => {
    toast.success('Export feature coming soon');
  };

  // Toggle phone number visibility
  const togglePhoneVisibility = (invoiceId, e) => {
    e.stopPropagation();
    setRevealedPhones(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  // Start a call
  const handleStartCall = (invoice, e) => {
    e.stopPropagation();
    if (!invoice.phoneNumber) {
      toast.error('No phone number available');
      return;
    }

    setActiveCall({
      invoiceId: invoice.id,
      invoice: invoice,
      startTime: Date.now()
    });

    toast.success('Call started');
  };

  // Stop a call and open dialog
  const handleStopCall = (e) => {
    e.stopPropagation();
    if (!activeCall) return;

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Open dialog to record outcome
    setCallInvoice(activeCall.invoice);
    setShowCallDialog(true);
  };

  // Save call log
  const handleSaveCall = async () => {
    if (!callOutcome) {
      toast.error('Please select a call outcome');
      return;
    }

    if (callOutcome === 'PROMISE_TO_PAY' && !promiseDate) {
      toast.error('Please select a promise date');
      return;
    }

    setIsSavingCall(true);
    try {
      await api.post('/accounts-dashboard/collection-calls', {
        invoiceId: callInvoice.id,
        leadId: callInvoice.leadId,
        startTime: new Date(activeCall.startTime).toISOString(),
        endTime: new Date().toISOString(),
        outcome: callOutcome,
        promiseDate: promiseDate || null,
        remark: callRemark || null
      });

      toast.success('Call log saved successfully');

      // Reset state
      setActiveCall(null);
      setShowCallDialog(false);
      setCallInvoice(null);
      setCallOutcome('');
      setCallRemark('');
      setPromiseDate('');
      setCallDuration(0);

      // Refresh data to show updated last call info
      fetchAgeingReport(pagination.page);
    } catch (error) {
      toast.error('Failed to save call log');
      console.error(error);
    } finally {
      setIsSavingCall(false);
    }
  };

  // Cancel call dialog
  const handleCancelCallDialog = () => {
    setShowCallDialog(false);
    setCallInvoice(null);
    setCallOutcome('');
    setCallRemark('');
    setPromiseDate('');
    setActiveCall(null);
    setCallDuration(0);
  };

  // Get outcome label
  const getOutcomeLabel = (outcome) => {
    const found = CALL_OUTCOMES.find(o => o.value === outcome);
    return found ? found.label : outcome;
  };

  // Get outcome color
  const getOutcomeColor = (outcome) => {
    const found = CALL_OUTCOMES.find(o => o.value === outcome);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  if (!user || (!isAccountsTeam && !isAdmin)) {
    return null;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/accounts-dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="border-l border-slate-300 h-6 hidden sm:block" />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                Ageing Report
                {bucket && (
                  <Badge className={`ml-2 ${bucketStyle.bg} ${bucketStyle.text}`}>
                    {BUCKET_LABELS[bucket]}
                  </Badge>
                )}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Detailed view of outstanding invoices by age
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Active Call Indicator */}
          {activeCall && (
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-green-50 border-2 border-green-400 rounded-lg shadow-md w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <span className="font-semibold text-green-700 text-sm">
                <span className="hidden sm:inline">Call in progress: </span><span className="font-mono">{formatTime(callDuration)}</span>
              </span>
              <Button
                size="sm"
                onClick={handleStopCall}
                className="ml-auto sm:ml-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                End
              </Button>
            </div>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={handleExport} className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Bucket Filters */}
      <Card className="bg-white dark:bg-slate-900">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-sm font-medium text-slate-600">Filter by Age:</span>
            <div className="flex gap-2 overflow-x-auto">
              <Button
                size="sm"
                variant={!bucket ? 'default' : 'outline'}
                onClick={() => router.push('/dashboard/accounts-dashboard/ageing-report')}
                className={`whitespace-nowrap flex-shrink-0 ${!bucket ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
              >
                All
              </Button>
              {Object.entries(BUCKET_LABELS).map(([key, label]) => {
                const style = BUCKET_COLORS[key];
                return (
                  <Button
                    key={key}
                    size="sm"
                    variant={bucket === key ? 'default' : 'outline'}
                    onClick={() => handleBucketChange(key)}
                    className={`whitespace-nowrap flex-shrink-0 ${bucket === key ? `${style.bg} ${style.text} border ${style.border}` : ''}`}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
            columns={[
              {
                key: 'companyName',
                label: 'Company Name',
                render: (row) => <p className="font-medium text-slate-900 dark:text-white">{row.companyName}</p>,
              },
              {
                key: 'phoneNumber',
                label: 'Phone',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-600">
                      {revealedPhones[row.id] ? row.phoneNumber : maskPhoneNumber(row.phoneNumber)}
                    </span>
                    {row.phoneNumber && (
                      <button
                        onClick={(e) => togglePhoneVisibility(row.id, e)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        {revealedPhones[row.id] ? (
                          <EyeOff className="h-3 w-3 text-slate-500" />
                        ) : (
                          <Eye className="h-3 w-3 text-slate-500" />
                        )}
                      </button>
                    )}
                  </div>
                ),
              },
              {
                key: 'invoiceNo',
                label: 'Invoice No',
                render: (row) => <span className="font-mono text-sm text-orange-600">{row.invoiceNo}</span>,
              },
              {
                key: 'invoiceDate',
                label: 'Invoice Date',
                render: (row) => formatDate(row.invoiceDate),
              },
              {
                key: 'dueDate',
                label: 'Due Date',
                render: (row) => formatDate(row.dueDate),
              },
              {
                key: 'outstanding',
                label: 'Outstanding',
                cellClassName: 'text-right',
                render: (row) => <span className="font-bold text-orange-600">{formatCurrency(row.outstanding)}</span>,
              },
              {
                key: 'ageDays',
                label: 'Age (Days)',
                cellClassName: 'text-center',
                render: (row) => (
                  <span className={`font-bold ${row.ageDays > 90 ? 'text-red-600' : row.ageDays > 60 ? 'text-orange-600' : row.ageDays > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {row.ageDays}
                  </span>
                ),
              },
              {
                key: 'lastCall',
                label: 'Last Call',
                cellClassName: 'text-center',
                render: (row) => row.lastCall ? (
                  <div className="flex flex-col items-center">
                    <Badge className={`text-[10px] ${getOutcomeColor(row.lastCall.outcome)}`}>
                      {getOutcomeLabel(row.lastCall.outcome)}
                    </Badge>
                    <span className="text-[10px] text-slate-500 mt-1">
                      {formatDate(row.lastCall.calledAt)}
                    </span>
                    {row.lastCall.promiseDate && (
                      <span className="text-[10px] text-blue-600">
                        Promise: {formatDate(row.lastCall.promiseDate)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">No calls</span>
                ),
              },
            ]}
            data={invoices}
            loading={isLoading}
            onRowClick={(row) => handleInvoiceClick(row)}
            pagination={true}
            defaultPageSize={20}
            pageSizeOptions={[20, 50, 100]}
            serverPagination={pagination}
            onPageChange={handlePageChange}
            emptyMessage="No outstanding invoices found in this bucket."
            emptyIcon={Clock}
            className="hidden lg:block"
            actions={(row) => {
              const isActiveCallRow = activeCall?.invoiceId === row.id;
              return isActiveCallRow ? (
                <Button
                  size="sm"
                  onClick={handleStopCall}
                  className="gap-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <PhoneOff className="h-3 w-3" />
                  End
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleStartCall(row, e)}
                  disabled={!row.phoneNumber || activeCall !== null}
                  className="gap-1 hover:bg-green-50 hover:border-green-500 hover:text-green-700"
                >
                  <Phone className="h-3 w-3" />
                  Call
                </Button>
              );
            }}
          />

      {/* Mobile Card View */}
      <div className="lg:hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3">
                  {invoices.map((invoice) => {
                    const isActiveCallRow = activeCall?.invoiceId === invoice.id;
                    const isPhoneRevealed = revealedPhones[invoice.id];

                    return (
                      <div
                        key={invoice.id}
                        className={`border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800 ${isActiveCallRow ? 'border-green-400 bg-green-50' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2" onClick={() => handleInvoiceClick(invoice)}>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{invoice.companyName}</p>
                            <p className="text-xs text-slate-500 font-mono">{invoice.invoiceNo}</p>
                          </div>
                          <span className={`font-bold text-sm ${invoice.ageDays > 90 ? 'text-red-600' : invoice.ageDays > 60 ? 'text-orange-600' : invoice.ageDays > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {invoice.ageDays} days
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3" onClick={() => handleInvoiceClick(invoice)}>
                          <div>
                            <p className="text-xs text-slate-500">Outstanding</p>
                            <p className="font-bold text-orange-600">{formatCurrency(invoice.outstanding)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Due Date</p>
                            <p className="text-slate-600">{formatDate(invoice.dueDate)}</p>
                          </div>
                        </div>
                        {invoice.lastCall && (
                          <div className="mb-3 flex items-center gap-2">
                            <Badge className={`text-[10px] ${getOutcomeColor(invoice.lastCall.outcome)}`}>
                              {getOutcomeLabel(invoice.lastCall.outcome)}
                            </Badge>
                            <span className="text-[10px] text-slate-500">{formatDate(invoice.lastCall.calledAt)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-600">
                              {isPhoneRevealed ? invoice.phoneNumber : maskPhoneNumber(invoice.phoneNumber)}
                            </span>
                            {invoice.phoneNumber && (
                              <button onClick={(e) => togglePhoneVisibility(invoice.id, e)} className="p-1">
                                {isPhoneRevealed ? <EyeOff className="h-3 w-3 text-slate-500" /> : <Eye className="h-3 w-3 text-slate-500" />}
                              </button>
                            )}
                          </div>
                          {isActiveCallRow ? (
                            <Button size="sm" onClick={handleStopCall} className="gap-1 bg-red-600 hover:bg-red-700 text-white">
                              <PhoneOff className="h-3 w-3" /> End
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleStartCall(invoice, e)}
                              disabled={!invoice.phoneNumber || activeCall !== null}
                              className="gap-1 hover:bg-green-50 hover:border-green-500 hover:text-green-700"
                            >
                              <Phone className="h-3 w-3" /> Call
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {invoices.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No outstanding invoices found in this bucket.
                  </div>
                )}

                {/* Mobile Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 px-3 sm:px-0">
                    <p className="text-xs sm:text-sm text-slate-500">
                      Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <span className="text-sm text-slate-600">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
      </div>

      {/* Call Outcome Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-600" />
              Log Call Outcome
            </DialogTitle>
            <DialogDescription>
              Record the outcome of your call with {callInvoice?.companyName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Call Duration */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">Call Duration:</span>
              </div>
              <span className="font-mono font-bold text-lg">{formatTime(callDuration)}</span>
            </div>

            {/* Invoice Info */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Invoice:</span>
                <span className="font-mono text-orange-600">{callInvoice?.invoiceNo}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">Outstanding:</span>
                <span className="font-bold text-orange-600">{formatCurrency(callInvoice?.outstanding)}</span>
              </div>
            </div>

            {/* Call Outcome */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Call Outcome *</label>
              <Select value={callOutcome} onValueChange={setCallOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="Select call outcome" />
                </SelectTrigger>
                <SelectContent>
                  {CALL_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${outcome.color}`}>
                          {outcome.label}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Promise Date (only for Promise to Pay) */}
            {callOutcome === 'PROMISE_TO_PAY' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Promise Date *</label>
                <Input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {/* Remark */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Remark / Notes</label>
              <Textarea
                value={callRemark}
                onChange={(e) => setCallRemark(e.target.value)}
                placeholder="Enter any additional notes about the call..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelCallDialog}
              className="border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCall}
              disabled={isSavingCall}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSavingCall ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Call Log'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
