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
  Search,
  IndianRupee,
  RefreshCw,
  FileSpreadsheet,
  Receipt,
  Users
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

export default function TaxReportPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalTdsCollected: 0
  });

  // Filters - default to current month
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const { handleExport, isExporting } = useExportExcel({
    endpoint: '/accounts-reports/tax',
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
    mapRow: (customer, index) => ({
      'S.No': index + 1,
      'User Name': customer.userName,
      'Mobile Number': customer.mobileNumber,
      'Email ID': customer.emailId,
      'GST Number': customer.gstNumber,
      'TAN Number': customer.tanNumber,
      'Total TDS Collected': customer.totalTdsCollected
    }),
    sheetName: 'Tax Report',
    fileName: `Tax_Report_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}`,
    columnWidths: [
      { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 30 },
      { wch: 18 }, { wch: 15 }, { wch: 18 }
    ],
    dataKey: 'customers',
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

      const response = await api.get(`/accounts-reports/tax?${params.toString()}`);
      setCustomers(response.data.customers || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setSummary(response.data.summary || {
        totalCustomers: 0,
        totalTdsCollected: 0
      });
    } catch (error) {
      toast.error('Failed to load tax report');
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

  const handleCustomerClick = (customer) => {
    if (customer.leadId) {
      router.push(`/dashboard/billing-mgmt/${customer.leadId}`);
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
                <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600 dark:text-orange-400" />
                Tax Report (TDS)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Customer-wise summary of TDS deductions
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || customers.length === 0}
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
                  placeholder="Search by name, mobile, email, GST..."
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard color="brand" icon={Users} label="Customers with TDS" value={summary.totalCustomers} />
        <StatCard color="amber" icon={IndianRupee} label="Total TDS Collected" value={formatCurrency(summary.totalTdsCollected)} />
      </div>

      {/* Desktop Table */}
      <DataTable
        className="hidden lg:block"
        title="TDS Details by Customer"
        totalCount={pagination.total}
        columns={[
          { key: 'userName', label: 'User Name', render: (row) => (
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{row.userName}</p>
              <p className="text-xs text-slate-500">{row.companyName}</p>
            </div>
          )},
          { key: 'mobileNumber', label: 'Mobile Number' },
          { key: 'emailId', label: 'Email ID', render: (row) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs">{row.emailId}</span>
          )},
          { key: 'gstNumber', label: 'GST Number', render: (row) => (
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.gstNumber}</span>
          )},
          { key: 'tanNumber', label: 'TAN Number', render: (row) => (
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.tanNumber}</span>
          )},
          { key: 'totalTdsCollected', label: 'Total TDS Collected', cellClassName: 'text-right', render: (row) => (
            <span className="font-bold text-amber-600">{formatCurrency(row.totalTdsCollected)}</span>
          )},
        ]}
        data={customers}
        loading={isLoading}
        onRowClick={handleCustomerClick}
        pagination={true}
        defaultPageSize={50}
        pageSizeOptions={[25, 50, 100]}
        serverPagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No TDS data found"
        emptyIcon={Receipt}
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
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No TDS data found</p>
            <p className="text-sm mt-1">No customers have TDS deductions in the selected period</p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {customers.map((customer, index) => (
              <div
                key={customer.leadId || index}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800 cursor-pointer active:bg-slate-50"
                onClick={() => handleCustomerClick(customer)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{customer.userName}</p>
                    <p className="text-xs text-slate-500">{customer.companyName}</p>
                  </div>
                  <p className="font-bold text-amber-600">{formatCurrency(customer.totalTdsCollected)}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>{customer.mobileNumber} | {customer.emailId}</p>
                  {customer.gstNumber && <p>GST: <span className="font-mono">{customer.gstNumber}</span></p>}
                  {customer.tanNumber && <p>TAN: <span className="font-mono">{customer.tanNumber}</span></p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
