'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Search,
  IndianRupee,
  RefreshCw,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useExportExcel } from '@/hooks/useExportExcel';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Get first day of current month in YYYY-MM-DD format
const getFirstDayOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split('T')[0];
};

// Reason labels
const REASON_LABELS = {
  'SERVICE_DOWNTIME': 'Service Downtime',
  'OVERPAYMENT': 'Overpayment',
  'PRICE_ADJUSTMENT': 'Price Adjustment',
  'CANCELLATION': 'Cancellation',
  'ERROR_CORRECTION': 'Error Correction',
  'PLAN_DOWNGRADE': 'Plan Downgrade'
};

// Status colors
const STATUS_COLORS = {
  'ISSUED': 'bg-blue-100 text-blue-700',
  'ADJUSTED': 'bg-green-100 text-green-700',
  'REFUNDED': 'bg-orange-100 text-orange-700'
};

export default function CreditNoteReportPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [creditNotes, setCreditNotes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({
    totalCreditNotes: 0,
    totalBaseAmount: 0,
    totalGstAmount: 0,
    totalCreditAmount: 0
  });

  // Filters
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const { handleExport, isExporting } = useExportExcel({
    endpoint: '/accounts-reports/credit-notes',
    getParams: () => {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: '1',
        limit: '10000'
      });
      if (searchTerm) params.append('search', searchTerm);
      return params;
    },
    mapRow: (cn, index) => ({
      'S.No': index + 1,
      'Credit Note Number': cn.creditNoteNumber,
      'Credit Note Date': formatDate(cn.creditNoteDate),
      'Invoice Number': cn.invoiceNumber,
      'Invoice Date': formatDate(cn.invoiceDate),
      'Customer Name': cn.customerName,
      'User Name': cn.userName,
      'Base Amount': cn.baseAmount,
      'SGST': cn.sgstAmount,
      'CGST': cn.cgstAmount,
      'Total GST': cn.totalGstAmount,
      'Total Credit Amount': cn.totalAmount,
      'Reason': REASON_LABELS[cn.reason] || cn.reason,
      'Status': cn.status,
      'Remarks': cn.remarks,
      'Adjusted Against Invoice': cn.adjustedAgainstInvoice || '-',
      'Adjusted Date': cn.adjustedAt ? formatDate(cn.adjustedAt) : '-',
      'Refund Reference': cn.refundReference || '-',
      'Refund Mode': cn.refundMode || '-',
      'Refunded Date': cn.refundedAt ? formatDate(cn.refundedAt) : '-',
      'Created By': cn.createdBy
    }),
    sheetName: 'Credit Notes',
    fileName: `Credit_Note_Report_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}`,
    columnWidths: [
      { wch: 6 },   // S.No
      { wch: 20 },  // Credit Note Number
      { wch: 15 },  // Credit Note Date
      { wch: 18 },  // Invoice Number
      { wch: 15 },  // Invoice Date
      { wch: 25 },  // Customer Name
      { wch: 20 },  // User Name
      { wch: 12 },  // Base Amount
      { wch: 10 },  // SGST
      { wch: 10 },  // CGST
      { wch: 12 },  // Total GST
      { wch: 15 },  // Total Credit Amount
      { wch: 18 },  // Reason
      { wch: 12 },  // Status
      { wch: 30 },  // Remarks
      { wch: 20 },  // Adjusted Against Invoice
      { wch: 15 },  // Adjusted Date
      { wch: 18 },  // Refund Reference
      { wch: 12 },  // Refund Mode
      { wch: 15 },  // Refunded Date
      { wch: 15 }   // Created By
    ],
    dataKey: 'creditNotes',
  });

  // Fetch report data
  const fetchReport = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: page.toString(),
        limit: '50'
      });
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/accounts-reports/credit-notes?${params.toString()}`);
      setCreditNotes(response.data.creditNotes || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setSummary(response.data.summary || {
        totalCreditNotes: 0,
        totalBaseAmount: 0,
        totalGstAmount: 0,
        totalCreditAmount: 0
      });
    } catch (error) {
      toast.error('Failed to load credit note report');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, searchTerm]);

  useEffect(() => {
    if (user && (isAccountsTeam || isAdmin)) {
      fetchReport(1);
    }
  }, [user, isAccountsTeam, isAdmin]);

  const handleSearch = () => {
    fetchReport(1);
  };

  const handlePageChange = (newPage) => {
    fetchReport(newPage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCreditNoteClick = (creditNote) => {
    if (creditNote.leadId) {
      router.push(`/dashboard/billing-mgmt/${creditNote.leadId}`);
    }
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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                Credit Note Report
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Comprehensive view of all credit notes issued
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || creditNotes.length === 0}
          className="gap-2 bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 sm:flex-none">
                <Label className="text-xs text-slate-500 mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full sm:w-40"
                />
              </div>
              <div className="flex-1 sm:flex-none">
                <Label className="text-xs text-slate-500 mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full sm:w-40"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-slate-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by credit note, invoice, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSearch} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="orange" icon={FileText} label="Total Credit Notes" value={summary.totalCreditNotes} />
        <StatCard color="blue" icon={IndianRupee} label="Base Amount" value={formatCurrency(summary.totalBaseAmount)} />
        <StatCard color="amber" icon={IndianRupee} label="Total GST" value={formatCurrency(summary.totalGstAmount)} />
        <StatCard color="emerald" icon={IndianRupee} label="Total Credit Amount" value={formatCurrency(summary.totalCreditAmount)} />
      </div>

      {/* Desktop Table */}
      <DataTable
        className="hidden lg:block"
        title="Credit Note Details"
        totalCount={pagination.total}
        columns={[
          { key: 'creditNoteNumber', label: 'Credit Note No', render: (row) => (
            <span className="font-mono text-sm text-orange-600">{row.creditNoteNumber}</span>
          )},
          { key: 'creditNoteDate', label: 'CN Date', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(row.creditNoteDate)}</span>
          )},
          { key: 'invoiceNumber', label: 'Invoice No', render: (row) => (
            <span className="font-mono text-sm text-blue-600">{row.invoiceNumber}</span>
          )},
          { key: 'invoiceDate', label: 'Invoice Date', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(row.invoiceDate)}</span>
          )},
          { key: 'customerName', label: 'Customer Name', render: (row) => (
            <div>
              <p className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={row.customerName}>
                {row.customerName}
              </p>
              <p className="text-xs text-slate-500">{row.userName}</p>
            </div>
          )},
          { key: 'baseAmount', label: 'Base Amt', cellClassName: 'text-right', render: (row) => (
            <span className="text-slate-700 dark:text-slate-300">{formatCurrency(row.baseAmount)}</span>
          )},
          { key: 'totalGstAmount', label: 'GST', cellClassName: 'text-right', render: (row) => (
            <span className="text-amber-600">{formatCurrency(row.totalGstAmount)}</span>
          )},
          { key: 'totalAmount', label: 'Total', cellClassName: 'text-right', render: (row) => (
            <span className="font-bold text-emerald-600">{formatCurrency(row.totalAmount)}</span>
          )},
          { key: 'reason', label: 'Reason', cellClassName: 'text-center', render: (row) => (
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {REASON_LABELS[row.reason] || row.reason}
            </span>
          )},
          { key: 'status', label: 'Status', cellClassName: 'text-center', render: (row) => (
            <Badge className={`text-xs ${STATUS_COLORS[row.status] || 'bg-slate-100 text-slate-700'}`}>
              {row.status}
            </Badge>
          )},
          { key: 'remarks', label: 'Remarks', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[200px] block" title={row.remarks}>
              {row.remarks}
            </span>
          )},
        ]}
        data={creditNotes}
        loading={isLoading}
        onRowClick={handleCreditNoteClick}
        pagination={true}
        defaultPageSize={50}
        pageSizeOptions={[25, 50, 100]}
        serverPagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No credit notes found"
        emptyIcon={FileText}
        headerExtra={
          <span className="text-xs sm:text-sm text-slate-500">
            {fromDate === toDate
              ? `For ${formatDate(fromDate)}`
              : `${formatDate(fromDate)} to ${formatDate(toDate)}`}
          </span>
        }
      />

      {/* Mobile Card View */}
      <div className="lg:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No credit notes found</p>
            <p className="text-sm mt-1">Try adjusting your date range or search criteria</p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {creditNotes.map((cn) => (
              <div
                key={cn.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800 cursor-pointer active:bg-slate-50"
                onClick={() => handleCreditNoteClick(cn)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{cn.customerName}</p>
                    <p className="text-xs text-slate-500">{cn.userName}</p>
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[cn.status] || 'bg-slate-100 text-slate-700'}`}>
                    {cn.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                  <span className="font-mono text-orange-600">{cn.creditNoteNumber}</span>
                  <span>|</span>
                  <span>{formatDate(cn.creditNoteDate)}</span>
                  <span>|</span>
                  <span>{REASON_LABELS[cn.reason] || cn.reason}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Base Amt</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(cn.baseAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Credit</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(cn.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Invoice</p>
                    <p className="font-mono text-xs text-blue-600">{cn.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">GST</p>
                    <p className="text-amber-600">{formatCurrency(cn.totalGstAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
