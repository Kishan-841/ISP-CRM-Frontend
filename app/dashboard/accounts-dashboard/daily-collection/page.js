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
  Search,
  IndianRupee,
  Receipt,
  RefreshCw,
  CreditCard,
  FileSpreadsheet,
  Wallet
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useExportExcel } from '@/hooks/useExportExcel';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Get day from date
const getDay = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit'
  });
};

// Get month name from date
const getMonthName = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    month: 'long'
  });
};

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

// Payment mode badge colors
const PAYMENT_MODE_COLORS = {
  'NEFT': 'bg-blue-100 text-blue-700',
  'RTGS': 'bg-indigo-100 text-indigo-700',
  'UPI': 'bg-orange-100 text-orange-700',
  'CHEQUE': 'bg-amber-100 text-amber-700',
  'CASH': 'bg-green-100 text-green-700',
  'ONLINE': 'bg-cyan-100 text-cyan-700',
  'TDS': 'bg-orange-100 text-orange-700'
};

export default function DailyCollectionReportPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({ totalPayments: 0, totalReceived: 0, totalTds: 0, totalCollection: 0 });

  // Filters
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const { handleExport, isExporting } = useExportExcel({
    endpoint: '/accounts-reports/daily',
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
    mapRow: (payment, index) => ({
      'S.No': index + 1,
      'Customer Name': payment.customerName,
      'User Name': payment.userName,
      'Invoice Number': payment.invoiceNumber,
      'Payment Mode': payment.paymentMode,
      'Receipt Number': payment.receiptNumber,
      'Transaction ID': payment.transactionId || '-',
      'Date of Payment': formatDate(payment.paymentDate),
      'Date': getDay(payment.paymentDate),
      'Month Name': getMonthName(payment.paymentDate),
      'Invoice Amount': payment.invoiceAmount,
      'Received Amount': payment.receivedAmount,
      'TDS Amount': payment.tdsAmount,
      'Pending Amount': payment.pendingAmount
    }),
    sheetName: 'Daily Collection',
    fileName: `Daily_Collection_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}`,
    columnWidths: [
      { wch: 6 },   // S.No
      { wch: 25 },  // Customer Name
      { wch: 20 },  // User Name
      { wch: 18 },  // Invoice Number
      { wch: 12 },  // Payment Mode
      { wch: 18 },  // Receipt Number
      { wch: 20 },  // Transaction ID
      { wch: 15 },  // Date of Payment
      { wch: 8 },   // Date
      { wch: 12 },  // Month Name
      { wch: 15 },  // Invoice Amount
      { wch: 15 },  // Received Amount
      { wch: 12 },  // TDS Amount
      { wch: 15 }   // Pending Amount
    ],
    dataKey: 'payments',
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

      const response = await api.get(`/accounts-reports/daily?${params.toString()}`);
      setPayments(response.data.payments || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setSummary(response.data.summary || { totalPayments: 0, totalReceived: 0, totalTds: 0, totalCollection: 0 });
    } catch (error) {
      toast.error('Failed to load collection report');
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

  const handleInvoiceClick = (payment) => {
    if (payment.leadId) {
      router.push(`/dashboard/billing-mgmt/${payment.leadId}`);
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
                <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
                Daily Collection Report
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Transaction-level view of payments received
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || payments.length === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
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
                  placeholder="Search by customer, invoice, receipt..."
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard color="orange" icon={Receipt} label="Total Payments" value={summary.totalPayments} />
        <StatCard color="emerald" icon={IndianRupee} label="Amount Received" value={formatCurrency(summary.totalReceived)} />
        <StatCard color="orange" icon={CreditCard} label="TDS Deducted" value={formatCurrency(summary.totalTds)} />
      </div>

      {/* Desktop Table */}
      <DataTable
        className="hidden lg:block"
        title="Collection Details"
        totalCount={pagination.total}
        columns={[
          { key: 'customerName', label: 'Customer Name', render: (row) => (
            <p className="font-medium text-slate-900 dark:text-white">{row.customerName}</p>
          )},
          { key: 'userName', label: 'User Name' },
          { key: 'invoiceNumber', label: 'Invoice No', render: (row) => (
            <span className="font-mono text-sm text-orange-600">{row.invoiceNumber}</span>
          )},
          { key: 'paymentMode', label: 'Payment Mode', render: (row) => (
            <Badge className={`text-xs ${PAYMENT_MODE_COLORS[row.paymentMode?.toUpperCase()] || 'bg-slate-100 text-slate-700'}`}>
              {row.paymentMode}
            </Badge>
          )},
          { key: 'receiptNumber', label: 'Receipt No', render: (row) => (
            <span className="font-mono text-sm text-emerald-600">{row.receiptNumber}</span>
          )},
          { key: 'transactionId', label: 'Transaction ID', render: (row) => (
            <span className="text-slate-500 dark:text-slate-400">{row.transactionId || '-'}</span>
          )},
          { key: 'paymentDate', label: 'Payment Date', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400">{formatDate(row.paymentDate)}</span>
          )},
          { key: 'day', label: 'Date', render: (row) => (
            <span className="font-semibold text-slate-700 dark:text-slate-300">{getDay(row.paymentDate)}</span>
          )},
          { key: 'monthName', label: 'Month Name', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400">{getMonthName(row.paymentDate)}</span>
          )},
          { key: 'invoiceAmount', label: 'Invoice Amt', cellClassName: 'text-right', render: (row) => (
            <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(row.invoiceAmount)}</span>
          )},
          { key: 'receivedAmount', label: 'Received Amt', cellClassName: 'text-right', render: (row) => (
            <span className="font-bold text-emerald-600">{formatCurrency(row.receivedAmount)}</span>
          )},
          { key: 'tdsAmount', label: 'TDS', cellClassName: 'text-right', render: (row) => (
            <span className="text-orange-600">{row.tdsAmount > 0 ? formatCurrency(row.tdsAmount) : '-'}</span>
          )},
          { key: 'pendingAmount', label: 'Pending Amt', cellClassName: 'text-right', render: (row) => (
            <span className={`font-medium ${row.pendingAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {row.pendingAmount > 0 ? formatCurrency(row.pendingAmount) : '-'}
            </span>
          )},
        ]}
        data={payments}
        loading={isLoading}
        onRowClick={handleInvoiceClick}
        pagination={true}
        defaultPageSize={50}
        pageSizeOptions={[25, 50, 100]}
        serverPagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No payments found"
        emptyIcon={Wallet}
        headerExtra={
          <span className="text-xs sm:text-sm text-slate-500">
            {fromDate === toDate
              ? `Payments for ${formatDate(fromDate)}`
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
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No payments found</p>
            <p className="text-sm mt-1">Try adjusting your date range or search criteria</p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800 cursor-pointer active:bg-slate-50"
                onClick={() => handleInvoiceClick(payment)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{payment.customerName}</p>
                    <p className="text-xs text-slate-500">{payment.userName}</p>
                  </div>
                  <Badge className={`text-xs ${PAYMENT_MODE_COLORS[payment.paymentMode?.toUpperCase()] || 'bg-slate-100 text-slate-700'}`}>
                    {payment.paymentMode}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                  <span className="font-mono text-orange-600">{payment.invoiceNumber}</span>
                  <span>|</span>
                  <span>{formatDate(payment.paymentDate)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Invoice Amt</p>
                    <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(payment.invoiceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Received</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(payment.receivedAmount)}</p>
                  </div>
                  {payment.tdsAmount > 0 && (
                    <div>
                      <p className="text-xs text-slate-500">TDS</p>
                      <p className="text-orange-600">{formatCurrency(payment.tdsAmount)}</p>
                    </div>
                  )}
                  {payment.pendingAmount > 0 && (
                    <div>
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="font-medium text-red-600">{formatCurrency(payment.pendingAmount)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
