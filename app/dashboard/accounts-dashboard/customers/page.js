'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserCheck,
  UserX,
  ArrowLeft,
  Search,
  Loader2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  Calendar
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';

const FILTER_CONFIG = {
  all: { label: 'All Users', icon: Users, color: 'orange' },
  active: { label: 'Active Users', icon: UserCheck, color: 'emerald' },
  deactivated: { label: 'Deactivated Users', icon: UserX, color: 'slate' }
};

export default function CustomerBillingTablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('outstanding');
  const [sortOrder, setSortOrder] = useState('desc');

  const filter = searchParams.get('filter') || 'all';
  const filterConfig = FILTER_CONFIG[filter] || FILTER_CONFIG.all;
  const FilterIcon = filterConfig.icon;

  const isAccountsTeam = user?.role === 'ACCOUNTS_TEAM';
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch customers
  const fetchCustomers = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder
      });
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/accounts-dashboard/customers?${params.toString()}`);
      setCustomers(response.data.customers || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error('Failed to load customer data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    if (user && (isAccountsTeam || isAdmin)) {
      fetchCustomers(1);
    }
  }, [user, isAccountsTeam, isAdmin, filter, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && (isAccountsTeam || isAdmin)) {
        fetchCustomers(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handlePageChange = (newPage) => {
    fetchCustomers(newPage);
  };

  const handleCustomerClick = (customerId) => {
    router.push(`/dashboard/billing-mgmt/${customerId}`);
  };

  const handleExport = () => {
    toast.success('Export feature coming soon');
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
                <FilterIcon className={`h-6 w-6 sm:h-7 sm:w-7 text-${filterConfig.color}-600`} />
                {filterConfig.label}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Customer billing details sorted by outstanding amount
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={handleExport} className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="overflow-x-auto">
              {/* Filter Tabs */}
              <div className="flex gap-2">
                {Object.entries(FILTER_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={filter === key ? 'default' : 'outline'}
                      onClick={() => router.push(`/dashboard/accounts-dashboard/customers?filter=${key}`)}
                      className={`whitespace-nowrap flex-shrink-0 ${filter === key ? `bg-${config.color}-600 text-white hover:bg-${config.color}-700` : ''}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by company, mobile, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80"
              />
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
                sortable: true,
                onSort: () => handleSort('companyName'),
                sortIcon: sortBy === 'companyName' ? <ArrowUpDown className="h-3 w-3" /> : null,
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{row.companyName}</p>
                    {row.isActive && (
                      <Badge className="text-[10px] px-1 py-0 bg-emerald-100 text-emerald-700">Active</Badge>
                    )}
                  </div>
                ),
              },
              { key: 'userName', label: 'User Name' },
              {
                key: 'mobileNo',
                label: 'Mobile No',
                render: (row) => (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {row.mobileNo}
                  </span>
                ),
              },
              {
                key: 'emailId',
                label: 'Email ID',
                render: (row) => (
                  <span className="flex items-center gap-1 text-xs">
                    <Mail className="h-3 w-3" />
                    {row.emailId}
                  </span>
                ),
              },
              {
                key: 'customerCreatedAt',
                label: 'Created Date',
                render: (row) => (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(row.customerCreatedAt)}
                  </div>
                ),
              },
              {
                key: 'arc',
                label: 'ARC',
                cellClassName: 'text-right',
                render: (row) => <span className="font-medium text-blue-600">{formatCurrency(row.arc)}</span>,
              },
              {
                key: 'totalBillGenerated',
                label: 'Total Bill Generated',
                cellClassName: 'text-right',
                sortable: true,
                onSort: () => handleSort('totalBillGenerated'),
                sortIcon: sortBy === 'totalBillGenerated' ? <ArrowUpDown className="h-3 w-3" /> : null,
                render: (row) => <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(row.totalBillGenerated)}</span>,
              },
              {
                key: 'totalReceived',
                label: 'Total Received',
                cellClassName: 'text-right',
                render: (row) => <span className="font-medium text-emerald-600">{formatCurrency(row.totalReceived)}</span>,
              },
              {
                key: 'outstanding',
                label: 'Outstanding',
                cellClassName: 'text-right',
                sortable: true,
                onSort: () => handleSort('outstanding'),
                sortIcon: sortBy === 'outstanding' ? <ArrowUpDown className="h-3 w-3" /> : null,
                render: (row) => (
                  <span className={`font-bold ${row.outstanding > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {row.outstanding > 0 ? formatCurrency(row.outstanding) : '-'}
                  </span>
                ),
              },
            ]}
            data={customers}
            loading={isLoading}
            onRowClick={(row) => handleCustomerClick(row.id)}
            pagination={true}
            defaultPageSize={20}
            pageSizeOptions={[20, 50, 100]}
            serverPagination={pagination}
            onPageChange={handlePageChange}
            emptyMessage="No customers found matching your criteria."
            emptyIcon={Users}
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
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800 cursor-pointer active:bg-slate-50"
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{customer.companyName}</p>
                          <p className="text-xs text-slate-500">{customer.userName}</p>
                        </div>
                        {customer.isActive && (
                          <Badge className="text-[10px] px-1 py-0 bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.mobileNo}</span>
                        <span>{formatDate(customer.customerCreatedAt)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">ARC</p>
                          <p className="font-medium text-blue-600">{formatCurrency(customer.arc)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Billed</p>
                          <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(customer.totalBillGenerated)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Received</p>
                          <p className="font-medium text-emerald-600">{formatCurrency(customer.totalReceived)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Outstanding</p>
                          <p className={`font-bold ${customer.outstanding > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                            {customer.outstanding > 0 ? formatCurrency(customer.outstanding) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {customers.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No customers found matching your criteria.
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
    </div>
  );
}
