'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Loader2,
  FileText,
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

// Get first day of current month in YYYY-MM-DD format
const getFirstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

export default function InvoiceReportPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({
    totalInvoices: 0,
    totalBaseAmount: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalGst: 0,
    totalAmount: 0
  });

  // Filters - default to current month
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const { handleExport, isExporting } = useExportExcel({
    endpoint: '/accounts-reports/invoices',
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
    mapRow: (invoice, index) => ({
      'S.No': index + 1,
      'User Name': invoice.userName,
      'Company Name': invoice.companyName || '-',
      'Billing Address': invoice.billingAddress || '-',
      'Billing Pincode': invoice.billingPincode || '-',
      'Installation Address': invoice.installationAddress || '-',
      'Installation Pincode': invoice.installationPincode || '-',
      'Invoice Number': invoice.invoiceNumber,
      'Invoice Date': formatDate(invoice.invoiceDate),
      'ARC': invoice.arc,
      'OTC': invoice.otc,
      'Plan Name': invoice.planName,
      'Plan Amount (Excl. GST)': invoice.planAmount,
      'CGST': invoice.cgst,
      'SGST': invoice.sgst,
      'Total Invoice Amount': invoice.totalAmount
    }),
    sheetName: 'Invoice Report',
    fileName: `Invoice_Report_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}`,
    columnWidths: [
      { wch: 6 },   // S.No
      { wch: 25 },  // User Name
      { wch: 30 },  // Company Name
      { wch: 40 },  // Billing Address
      { wch: 12 },  // Billing Pincode
      { wch: 40 },  // Installation Address
      { wch: 15 },  // Installation Pincode
      { wch: 18 },  // Invoice Number
      { wch: 14 },  // Invoice Date
      { wch: 12 },  // ARC
      { wch: 12 },  // OTC
      { wch: 20 },  // Plan Name
      { wch: 20 },  // Plan Amount
      { wch: 12 },  // CGST
      { wch: 12 },  // SGST
      { wch: 18 }   // Total Amount
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

      const response = await api.get(`/accounts-reports/invoices?${params.toString()}`);
      setInvoices(response.data.invoices || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setSummary(response.data.summary || {
        totalInvoices: 0,
        totalBaseAmount: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalGst: 0,
        totalAmount: 0
      });
    } catch (error) {
      toast.error('Failed to load invoice report');
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
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                Invoice Report
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Complete invoice-level view of all generated bills
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || invoices.length === 0}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
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
                  placeholder="Search by user name, invoice number, plan..."
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
        <StatCard color="blue" icon={FileText} label="Total Invoices" value={summary.totalInvoices} />
        <StatCard color="orange" icon={IndianRupee} label="Base Amount" value={formatCurrency(summary.totalBaseAmount)} />
        <StatCard color="amber" icon={IndianRupee} label="Total GST" value={formatCurrency(summary.totalGst)} />
        <StatCard color="emerald" icon={IndianRupee} label="Total Invoice Amount" value={formatCurrency(summary.totalAmount)} />
      </div>

      {/* Desktop Table */}
      <DataTable
        className="hidden lg:block"
        title="Invoice Details"
        totalCount={pagination.total}
        columns={[
          { key: 'userName', label: 'User Name', render: (row) => (
            <p className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={row.userName}>
              {row.userName}
            </p>
          )},
          { key: 'companyName', label: 'Company', render: (row) => (
            <p className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={row.companyName}>
              {row.companyName || '-'}
            </p>
          )},
          { key: 'invoiceNumber', label: 'Invoice No', render: (row) => (
            <span className="font-mono text-sm text-blue-600">{row.invoiceNumber}</span>
          )},
          { key: 'invoiceDate', label: 'Date', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(row.invoiceDate)}</span>
          )},
          { key: 'arc', label: 'ARC', cellClassName: 'text-right', render: (row) => (
            <span className="text-slate-700 dark:text-slate-300">{row.arc > 0 ? formatCurrency(row.arc) : '-'}</span>
          )},
          { key: 'otc', label: 'OTC', cellClassName: 'text-right', render: (row) => (
            <span className="text-slate-700 dark:text-slate-300">{row.otc > 0 ? formatCurrency(row.otc) : '-'}</span>
          )},
          { key: 'planName', label: 'Plan Name', render: (row) => (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px] block" title={row.planName}>
              {row.planName}
            </span>
          )},
          { key: 'planAmount', label: 'Plan Amt', cellClassName: 'text-right', render: (row) => (
            <span className="font-medium text-orange-600">{formatCurrency(row.planAmount)}</span>
          )},
          { key: 'cgst', label: 'CGST', cellClassName: 'text-right', render: (row) => (
            <span className="text-amber-600">{formatCurrency(row.cgst)}</span>
          )},
          { key: 'sgst', label: 'SGST', cellClassName: 'text-right', render: (row) => (
            <span className="text-amber-600">{formatCurrency(row.sgst)}</span>
          )},
          { key: 'totalAmount', label: 'Total', cellClassName: 'text-right', render: (row) => (
            <span className="font-bold text-emerald-600">{formatCurrency(row.totalAmount)}</span>
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
        emptyMessage="No invoices found"
        emptyIcon={FileText}
        headerExtra={
          <span className="text-xs sm:text-sm text-slate-500">
            {formatDate(fromDate)} to {formatDate(toDate)}
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
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No invoices found</p>
            <p className="text-sm mt-1">Try adjusting your date range or search criteria</p>
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
                    <p className="font-medium text-slate-900 dark:text-white">{invoice.userName}</p>
                    <p className="text-xs text-slate-500">{invoice.companyName || '-'}</p>
                  </div>
                  <span className="font-mono text-xs text-blue-600">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{formatDate(invoice.invoiceDate)}</span>
                  <span>|</span>
                  <span>{invoice.planName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Plan Amount</p>
                    <p className="font-medium text-orange-600">{formatCurrency(invoice.planAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(invoice.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CGST</p>
                    <p className="text-amber-600">{formatCurrency(invoice.cgst)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">SGST</p>
                    <p className="text-amber-600">{formatCurrency(invoice.sgst)}</p>
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
