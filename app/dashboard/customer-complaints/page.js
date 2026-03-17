'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useComplaintStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import {
  Search,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  AlertCircle,
  CheckCircle,
  CalendarDays,
  Wifi,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';

export default function CustomerComplaintsPage() {
  const router = useRouter();

  const {
    customerList,
    customerPagination,
    loading,
    fetchCustomerList,
  } = useComplaintStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;
  const searchTimeout = useRef(null);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
      setMobilePage(1);
    }, 400);
  };

  const load = useCallback(() => {
    const params = { page, limit: pageSize };
    if (debouncedSearch) params.search = debouncedSearch;
    fetchCustomerList(params);
  }, [page, pageSize, debouncedSearch, fetchCustomerList]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setMobilePage(1); }, [page, debouncedSearch]);

  const totalCustomers = customerPagination?.total ?? 0;
  const customersOnPage = customerList || [];
  const totalComplaints = customersOnPage.reduce((sum, c) => sum + (c.totalComplaints || 0), 0);
  const openComplaints = customersOnPage.reduce((sum, c) => sum + (c.openComplaints || 0), 0);
  const withOpenCount = customersOnPage.filter(c => (c.openComplaints || 0) > 0).length;

  const dataWithIndex = customersOnPage.map((c, i) => ({
    ...c,
    _sno: (page - 1) * pageSize + i + 1,
  }));

  const mobileTotalPages = Math.ceil(customersOnPage.length / mobilePageSize);
  const mobileStartIndex = (mobilePage - 1) * mobilePageSize;
  const mobileEndIndex = mobileStartIndex + mobilePageSize;
  const mobilePaginated = customersOnPage.slice(mobileStartIndex, mobileEndIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Customer Complaints
              {totalCustomers > 0 && (
                <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                  ({totalCustomers})
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 ml-[18px]">
            View complaint history for all active customers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="teal" icon={Wifi} label="Total Customers" value={totalCustomers} />
        <StatCard color="blue" icon={AlertCircle} label="Open Complaints" value={openComplaints} />
        <StatCard color="amber" icon={Users} label="Customers w/ Open" value={withOpenCount} />
        <StatCard color="slate" icon={CheckCircle} label="Total Complaints" value={totalComplaints} />
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-72 md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search company, username, circuit ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setPage(1); }}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Desktop DataTable */}
      <DataTable
        columns={[
          {
            key: 'sno',
            label: 'S.No',
            width: '60px',
            render: (row) => (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{row._sno}</span>
            ),
          },
          {
            key: 'customer',
            label: 'Customer Name',
            render: (row) => (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {row.company || row.customerUsername || '-'}
                  </p>
                  {row.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.name}</p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'customerUsername',
            label: 'Username',
            render: (row) => (
              <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {row.customerUsername || '-'}
              </span>
            ),
          },
          {
            key: 'circuitId',
            label: 'Circuit ID',
            render: (row) => (
              <span className="font-mono text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                {row.circuitId || '-'}
              </span>
            ),
          },
          {
            key: 'totalComplaints',
            label: 'Total',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-w-[2rem]">
                {row.totalComplaints ?? 0}
              </span>
            ),
          },
          {
            key: 'openComplaints',
            label: 'Open',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => {
              const count = row.openComplaints ?? 0;
              return (
                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold min-w-[2rem] ${
                  count > 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              );
            },
          },
          {
            key: 'lastComplaintDate',
            label: 'Last Complaint',
            className: 'text-center',
            cellClassName: 'text-center',
            render: (row) => (
              <div className="flex items-center justify-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                {row.lastComplaintDate ? (
                  <>
                    <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
                    {formatDate(row.lastComplaintDate)}
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">-</span>
                )}
              </div>
            ),
          },
        ]}
        data={dataWithIndex}
        loading={loading}
        pagination={true}
        defaultPageSize={pageSize}
        serverPagination={customerPagination ? {
          page: customerPagination.page || page,
          limit: customerPagination.limit || pageSize,
          total: customerPagination.total || 0,
          totalPages: customerPagination.totalPages || 1,
        } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        emptyMessage="No active customers found"
        emptyIcon={Users}
        emptyFilteredMessage="No customers match your search"
        className="hidden lg:block"
        actions={(row) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => router.push(`/dashboard/customer-complaints/${row.id}`)}
              className="p-1.5 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors"
              title="View Complaints"
            >
              <Eye size={16} />
            </button>
          </div>
        )}
      />

      {/* Mobile Card View */}
      <Card className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : mobilePaginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Users size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No customers found</p>
              <p className="text-sm mt-1">{debouncedSearch ? 'Try a different search term' : 'No active customers yet'}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {mobilePaginated.map((customer, index) => {
                  const openCount = customer.openComplaints ?? 0;
                  const sno = (page - 1) * pageSize + mobileStartIndex + index + 1;
                  return (
                    <div key={customer.id} className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {customer.company || customer.customerUsername || '-'}
                              </p>
                              {customer.name && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{customer.name}</p>
                              )}
                            </div>
                            <span className="text-xs font-medium text-slate-400 flex-shrink-0">#{sno}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {customer.customerUsername && (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {customer.customerUsername}
                          </span>
                        )}
                        {customer.circuitId && (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                            {customer.circuitId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Total:</span>
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {customer.totalComplaints ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Open:</span>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            openCount > 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {openCount}
                          </span>
                        </div>
                        {customer.lastComplaintDate && (
                          <div className="flex items-center gap-1 ml-auto text-xs text-slate-400 dark:text-slate-500">
                            <CalendarDays size={12} />
                            {formatDate(customer.lastComplaintDate)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => router.push(`/dashboard/customer-complaints/${customer.id}`)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors"
                        >
                          <Eye size={14} />
                          View Complaints
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {mobileTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Showing <span className="font-medium">{mobileStartIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(mobileEndIndex, customersOnPage.length)}</span> of{' '}
                    <span className="font-medium">{customersOnPage.length}</span> on this page
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMobilePage(p => Math.max(1, p - 1))} disabled={mobilePage === 1} className="h-8 w-8 p-0">
                      <ChevronLeft size={16} />
                    </Button>
                    {Array.from({ length: Math.min(mobileTotalPages, 5) }, (_, i) => {
                      let pg;
                      if (mobileTotalPages <= 5) pg = i + 1;
                      else if (mobilePage <= 3) pg = i + 1;
                      else if (mobilePage >= mobileTotalPages - 2) pg = mobileTotalPages - 4 + i;
                      else pg = mobilePage - 2 + i;
                      return (
                        <button
                          key={pg}
                          onClick={() => setMobilePage(pg)}
                          className={`h-8 w-8 text-sm rounded-md font-medium transition-colors ${
                            pg === mobilePage ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <Button size="sm" variant="outline" onClick={() => setMobilePage(p => Math.min(mobileTotalPages, p + 1))} disabled={mobilePage === mobileTotalPages} className="h-8 w-8 p-0">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
