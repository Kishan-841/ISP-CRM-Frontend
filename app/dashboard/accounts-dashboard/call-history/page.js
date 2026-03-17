'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Phone,
  PhoneCall,
  Clock,
  Search,
  User,
  FileText,
  History,
  Filter,
  X
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';

// Format duration in mm:ss
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Call outcome options
const CALL_OUTCOMES = [
  { value: 'RINGING_NOT_PICKED', label: 'Ringing - Not Picked', color: 'bg-slate-100 text-slate-700' },
  { value: 'PROMISE_TO_PAY', label: 'Promise to Pay', color: 'bg-blue-100 text-blue-700' },
  { value: 'ALREADY_PAID', label: 'Already Paid', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'PAYMENT_INITIATED', label: 'Payment Initiated', color: 'bg-green-100 text-green-700' },
  { value: 'DISPUTE', label: 'Dispute', color: 'bg-red-100 text-red-700' },
  { value: 'CALL_BACK_LATER', label: 'Call Back Later', color: 'bg-amber-100 text-amber-700' },
  { value: 'NOT_REACHABLE', label: 'Not Reachable', color: 'bg-gray-100 text-gray-700' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'bg-rose-100 text-rose-700' },
  { value: 'OTHER', label: 'Other', color: 'bg-orange-100 text-orange-700' }
];

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

export default function CallHistoryPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch call history
  const fetchCallHistory = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (search) params.append('search', search);
      if (outcomeFilter) params.append('outcome', outcomeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/accounts-dashboard/call-history?${params.toString()}`);
      setCalls(response.data.calls || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error('Failed to load call history');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [search, outcomeFilter, startDate, endDate]);

  useEffect(() => {
    if (user && (isAccountsTeam || isAdmin)) {
      fetchCallHistory(1);
    }
  }, [user, isAccountsTeam, isAdmin]);

  const handlePageChange = (newPage) => {
    fetchCallHistory(newPage);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCallHistory(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setOutcomeFilter('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchCallHistory(1), 0);
  };

  const handleInvoiceClick = (leadId) => {
    if (leadId) {
      router.push(`/dashboard/billing-mgmt/${leadId}`);
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
                <History className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                Call History
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              View all collection calls made by the team
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`gap-2 w-full sm:w-auto ${showFilters ? 'bg-orange-50 border-orange-300' : ''}`}
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-3 sm:p-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Company or Invoice..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Outcome Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Outcome</label>
                  <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Outcomes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Outcomes</SelectItem>
                      {CALL_OUTCOMES.map((outcome) => (
                        <SelectItem key={outcome.value} value={outcome.value}>
                          {outcome.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">From Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">To Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                  <Search className="h-4 w-4" />
                  Apply Filters
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <>
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Collection Calls</h3>
          <Badge className="ml-2 bg-orange-100 text-orange-700">{pagination.total} calls</Badge>
        </div>
        {/* Desktop Table */}
        <DataTable
            columns={[
              {
                key: 'startTime',
                label: 'Date & Time',
                render: (row) => <p className="font-medium text-slate-900 dark:text-white">{formatDateTime(row.startTime)}</p>,
              },
              {
                key: 'companyName',
                label: 'Company Name',
                render: (row) => (
                  <button
                    onClick={() => handleInvoiceClick(row.leadId)}
                    className="font-medium text-slate-900 dark:text-white hover:text-orange-600 text-left"
                  >
                    {row.companyName}
                  </button>
                ),
              },
              {
                key: 'invoiceNo',
                label: 'Invoice',
                render: (row) => (
                  <button
                    onClick={() => handleInvoiceClick(row.leadId)}
                    className="font-mono text-sm text-orange-600 hover:underline"
                  >
                    {row.invoiceNo}
                  </button>
                ),
              },
              {
                key: 'invoiceAmount',
                label: 'Invoice Amount',
                cellClassName: 'text-right',
                render: (row) => <span className="font-bold text-orange-600">{formatCurrency(row.invoiceAmount)}</span>,
              },
              {
                key: 'duration',
                label: 'Duration',
                cellClassName: 'text-center',
                render: (row) => <span className="font-mono text-slate-600">{formatDuration(row.duration)}</span>,
              },
              {
                key: 'outcome',
                label: 'Outcome',
                cellClassName: 'text-center',
                render: (row) => (
                  <Badge className={getOutcomeColor(row.outcome)}>
                    {getOutcomeLabel(row.outcome)}
                  </Badge>
                ),
              },
              {
                key: 'promiseDate',
                label: 'Promise Date',
                cellClassName: 'text-center',
                render: (row) => row.promiseDate
                  ? <span className="text-blue-600 font-medium">{formatDate(row.promiseDate)}</span>
                  : <span className="text-slate-400">-</span>,
              },
              {
                key: 'calledBy',
                label: 'Called By',
              },
              {
                key: 'remark',
                label: 'Remarks',
                render: (row) => (
                  <p className="max-w-[200px] truncate" title={row.remark}>
                    {row.remark || '-'}
                  </p>
                ),
              },
            ]}
            data={calls}
            loading={isLoading}
            pagination={true}
            defaultPageSize={20}
            pageSizeOptions={[20, 50, 100]}
            serverPagination={pagination}
            onPageChange={handlePageChange}
            emptyMessage="No call records found."
            emptyIcon={Phone}
            className="hidden lg:block"
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
                  {calls.map((call) => (
                    <div
                      key={call.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <button
                            onClick={() => handleInvoiceClick(call.leadId)}
                            className="font-medium text-slate-900 dark:text-white hover:text-orange-600 text-left"
                          >
                            {call.companyName}
                          </button>
                          <p className="text-xs text-slate-500">{formatDateTime(call.startTime)}</p>
                        </div>
                        <Badge className={getOutcomeColor(call.outcome)}>
                          {getOutcomeLabel(call.outcome)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <p className="text-xs text-slate-500">Invoice</p>
                          <p className="font-mono text-xs text-orange-600">{call.invoiceNo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Amount</p>
                          <p className="font-bold text-orange-600">{formatCurrency(call.invoiceAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Duration</p>
                          <p className="font-mono text-slate-600">{formatDuration(call.duration)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Called By</p>
                          <p className="text-slate-600">{call.calledBy}</p>
                        </div>
                      </div>
                      {call.promiseDate && (
                        <p className="text-xs text-blue-600">Promise: {formatDate(call.promiseDate)}</p>
                      )}
                      {call.remark && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{call.remark}</p>
                      )}
                    </div>
                  ))}
                </div>

                {calls.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No call records found.</p>
                    {(search || outcomeFilter || startDate || endDate) && (
                      <p className="text-sm mt-2">Try adjusting your filters.</p>
                    )}
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
      </>
    </div>
  );
}
