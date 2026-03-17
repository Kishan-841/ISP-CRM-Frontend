'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Search,
  IndianRupee,
  RefreshCw,
  FileSpreadsheet
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


export default function OutstandingReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  // Get URL parameters for initial values
  const urlFromDate = searchParams.get('fromDate');
  const urlToDate = searchParams.get('toDate');

  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({
    totalInvoices: 0,
    totalInvoiceAmount: 0,
    totalReceived: 0,
    totalTds: 0,
    totalOutstanding: 0
  });

  // Filters - use URL params if available, otherwise default to first day of month to today
  const [fromDate, setFromDate] = useState(urlFromDate || getFirstDayOfMonth());
  const [toDate, setToDate] = useState(urlToDate || getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const { handleExport, isExporting } = useExportExcel({
    endpoint: '/accounts-reports/outstanding',
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
    mapRow: (inv, index) => ({
      'S.No': index + 1,
      'Customer Name': inv.customerName,
      'User Name': inv.userName,
      'Invoice Number': inv.invoiceNumber,
      'Invoice Date': formatDate(inv.invoiceDate),
      'Due Date': formatDate(inv.dueDate),
      'Invoice Amount': inv.invoiceAmount,
      'Received Amount': inv.receivedAmount,
      'TDS Amount': inv.tdsAmount,
      'Outstanding Amount': inv.outstandingAmount,
      'Age (Days)': inv.ageDays
    }),
    sheetName: 'Outstanding Report',
    fileName: `Outstanding_Report_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}`,
    columnWidths: [
      { wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
      { wch: 12 }
    ],
    dataKey: 'invoices',
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

      const response = await api.get(`/accounts-reports/outstanding?${params.toString()}`);
      setInvoices(response.data.invoices || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setSummary(response.data.summary || {
        totalInvoices: 0,
        totalInvoiceAmount: 0,
        totalReceived: 0,
        totalTds: 0,
        totalOutstanding: 0
      });
    } catch (error) {
      toast.error('Failed to load outstanding report');
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

  const handleInvoiceClick = (invoice) => {
    if (invoice.leadId) {
      router.push(`/dashboard/billing-mgmt/${invoice.leadId}`);
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
                <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                Outstanding Report
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Current snapshot of unpaid and partially paid invoices
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || invoices.length === 0}
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
                  placeholder="Search by customer, invoice number..."
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
        <StatCard color="slate" icon={AlertTriangle} label="Outstanding Invoices" value={summary.totalInvoices} />
        <StatCard color="blue" icon={IndianRupee} label="Invoice Amount" value={formatCurrency(summary.totalInvoiceAmount)} />
        <StatCard color="emerald" icon={IndianRupee} label="Received" value={formatCurrency(summary.totalReceived)} />
        <StatCard color="orange" icon={IndianRupee} label="Total Outstanding" value={formatCurrency(summary.totalOutstanding)} />
      </div>

      {/* Desktop Table */}
      <DataTable
        className="hidden lg:block"
        title="Outstanding Details"
        totalCount={pagination.total}
        columns={[
          { key: 'customerName', label: 'Customer Name', render: (row) => (
            <p className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={row.customerName}>
              {row.customerName}
            </p>
          )},
          { key: 'userName', label: 'User Name', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px] block">{row.userName}</span>
          )},
          { key: 'invoiceNumber', label: 'Invoice No', render: (row) => (
            <span className="font-mono text-sm text-orange-600">{row.invoiceNumber}</span>
          )},
          { key: 'invoiceDate', label: 'Invoice Date', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(row.invoiceDate)}</span>
          )},
          { key: 'dueDate', label: 'Due Date', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(row.dueDate)}</span>
          )},
          { key: 'invoiceAmount', label: 'Invoice Amt', cellClassName: 'text-right', render: (row) => (
            <span className="text-slate-700 dark:text-slate-300">{formatCurrency(row.invoiceAmount)}</span>
          )},
          { key: 'receivedAmount', label: 'Received', cellClassName: 'text-right', render: (row) => (
            <span className="text-emerald-600">{row.receivedAmount > 0 ? formatCurrency(row.receivedAmount) : '-'}</span>
          )},
          { key: 'tdsAmount', label: 'TDS', cellClassName: 'text-right', render: (row) => (
            <span className="text-amber-600">{row.tdsAmount > 0 ? formatCurrency(row.tdsAmount) : '-'}</span>
          )},
          { key: 'outstandingAmount', label: 'Outstanding', cellClassName: 'text-right', render: (row) => (
            <span className="font-bold text-orange-600">{formatCurrency(row.outstandingAmount)}</span>
          )},
          { key: 'ageDays', label: 'Age (Days)', cellClassName: 'text-center', render: (row) => (
            <span className="font-medium text-slate-700 dark:text-slate-300">{row.ageDays}</span>
          )},
        ]}
        data={invoices}
        loading={isLoading}
        onRowClick={handleInvoiceClick}
        pagination={true}
        defaultPageSize={50}
        pageSizeOptions={[25, 50, 100]}
        serverPagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No outstanding invoices found"
        emptyIcon={AlertCircle}
        headerExtra={
          <span className="text-xs sm:text-sm text-slate-500">
            {fromDate === toDate
              ? `As on ${formatDate(fromDate)}`
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
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No outstanding invoices found</p>
            <p className="text-sm mt-1">All invoices are fully paid or no data matches your filters</p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800 cursor-pointer active:bg-slate-50"
                onClick={() => handleInvoiceClick(invoice)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{invoice.customerName}</p>
                    <p className="text-xs text-slate-500">{invoice.userName}</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 text-xs">{invoice.ageDays} days</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span className="font-mono text-orange-600">{invoice.invoiceNumber}</span>
                  <span>|</span>
                  <span>Due: {formatDate(invoice.dueDate)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Invoice Amt</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(invoice.invoiceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Outstanding</p>
                    <p className="font-bold text-orange-600">{formatCurrency(invoice.outstandingAmount)}</p>
                  </div>
                  {invoice.receivedAmount > 0 && (
                    <div>
                      <p className="text-xs text-slate-500">Received</p>
                      <p className="text-emerald-600">{formatCurrency(invoice.receivedAmount)}</p>
                    </div>
                  )}
                  {invoice.tdsAmount > 0 && (
                    <div>
                      <p className="text-xs text-slate-500">TDS</p>
                      <p className="text-amber-600">{formatCurrency(invoice.tdsAmount)}</p>
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
