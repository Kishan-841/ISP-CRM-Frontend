'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Loader2,
  Search,
  Users,
  IndianRupee,
  AlertCircle,
  ChevronRightIcon,
  CheckCircle,
  Clock,
  Pencil,
  X,
  Save,
  CreditCard,
  LayoutGrid,
  CircleDot
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import TabBar from '@/components/TabBar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BillingPageSkeleton } from '@/components/QueueSkeleton';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Check if date is past
const isPastDue = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export default function BillingManagementPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    customerUsername: '',
    companyName: '',
    mobileNumber: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Filter tabs configuration
  const filterTabs = [
    { key: 'all', label: 'All', icon: LayoutGrid, count: stats.allTabCount },
    { key: 'pending', label: 'Pending', icon: Clock, count: stats.pendingTabCount, variant: 'danger' },
    { key: 'partial', label: 'Partial Paid', icon: CircleDot, count: stats.partialTabCount, variant: 'warning' },
    { key: 'paid', label: 'Paid', icon: CheckCircle, count: stats.paidTabCount, variant: 'success' }
  ];

  // Redirect non-authorized users
  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, router]);

  // Fetch customers with invoices
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        filter: activeFilter
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      const response = await api.get(`/invoices/customers/pending?${params}`);
      setCustomers(response.data.customers || []);
      setStats(response.data.stats || {});
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAccountsTeam || isAdmin) {
      fetchCustomers();
    }
  }, [isAccountsTeam, isAdmin, currentPage, searchTerm, activeFilter, dateFrom, dateTo]);

  // Auto-refresh on socket events
  useSocketRefresh(fetchCustomers, { enabled: isAccountsTeam || isAdmin });

  // Handle filter change
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setActiveFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo || searchTerm || activeFilter !== 'all';

  // Navigate to customer detail
  const handleCustomerClick = (leadId) => {
    router.push(`/dashboard/billing-mgmt/${leadId}`);
  };

  // Open edit modal
  const handleEditClick = (e, customer) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setEditForm({
      customerUsername: customer.customerUsername || '',
      companyName: customer.companyName || '',
      mobileNumber: customer.contactPhone || ''
    });
    setEditModalOpen(true);
  };

  // Save customer details
  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;

    setIsSaving(true);
    try {
      const response = await api.patch(`/invoices/customer/${editingCustomer.leadId}/details`, {
        customerUsername: editForm.customerUsername,
        companyName: editForm.companyName,
        mobileNumber: editForm.mobileNumber
      });

      toast.success('Customer details updated successfully');
      setEditModalOpen(false);
      setEditingCustomer(null);

      // Refresh the list
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update customer details');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAccountsTeam && !isAdmin) {
    return null;
  }

  if (isLoading && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Billing Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 ml-[18px]">
            View customers and manage invoices
          </p>
        </div>
        <BillingPageSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Billing Management</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 ml-[18px]">
          View customers and manage invoices
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          color="blue"
          icon={Users}
          label={activeFilter === 'all' ? 'Total Customers' : activeFilter === 'paid' ? 'Paid Customers' : activeFilter === 'partial' ? 'Partial Customers' : 'Pending Customers'}
          value={stats.totalCustomers || 0}
        />
        <StatCard
          color="orange"
          icon={FileText}
          label={activeFilter === 'all' ? 'Total Invoices' : activeFilter === 'paid' ? 'Paid Invoices' : activeFilter === 'partial' ? 'Partial Invoices' : 'Pending Invoices'}
          value={stats.totalInvoices || 0}
        />
        <StatCard
          color={activeFilter === 'paid' || activeFilter === 'all' ? 'emerald' : 'red'}
          icon={IndianRupee}
          label={activeFilter === 'all' ? 'Total Amount' : activeFilter === 'paid' ? 'Paid Amount' : activeFilter === 'partial' ? 'Remaining Amount' : 'Pending Amount'}
          value={formatCurrency(activeFilter === 'paid' ? stats.totalPaidAmount : activeFilter === 'all' ? stats.totalAmount : stats.totalPendingAmount || 0)}
        />
      </div>

      {/* Filter Tabs */}
      <TabBar
        tabs={filterTabs}
        activeTab={activeFilter}
        onTabChange={handleFilterChange}
      />

      {/* Search & Date Range Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by company name or username..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-transparent"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile Card View */}
      {customers.length > 0 && (
        <div className="lg:hidden space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.leadId}
              onClick={() => handleCustomerClick(customer.leadId)}
              className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{customer.companyName}</p>
                  {customer.customerUsername && (
                    <p className="text-xs text-orange-600 font-mono">{customer.customerUsername}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={(e) => handleEditClick(e, customer)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-blue-500">Invoices</p>
                    <p className="text-sm font-bold text-blue-700">{customer.invoiceCount}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-emerald-500">Paid</p>
                    <p className="text-xs font-bold text-emerald-700">{formatCurrency(customer.totalPaidAmount || 0)}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-orange-500">Pending</p>
                    <p className={`text-xs font-bold ${customer.totalPendingAmount > 0 ? 'text-orange-700' : 'text-slate-400'}`}>
                      {customer.totalPendingAmount > 0 ? formatCurrency(customer.totalPendingAmount) : '-'}
                    </p>
                  </div>
                </div>
                {customer.oldestDueDate && isPastDue(customer.oldestDueDate) && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    Overdue: {formatDate(customer.oldestDueDate)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      <DataTable
        className="hidden lg:block"
        columns={[
          {
            key: 'customer',
            label: 'Customer',
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{row.companyName}</p>
                {row.customerUsername && (
                  <p className="text-xs text-orange-600 font-mono">{row.customerUsername}</p>
                )}
                {row.contactPhone && (
                  <p className="text-xs text-slate-500">{row.contactPhone}</p>
                )}
              </div>
            )
          },
          {
            key: 'invoiceCount',
            label: activeFilter === 'all' ? 'Invoices' :
                   activeFilter === 'paid' ? 'Paid Invoices' :
                   activeFilter === 'partial' ? 'Partial Invoices' :
                   'Pending Invoices',
            render: (row) => {
              if (activeFilter === 'all') {
                return (
                  <div className="flex items-center justify-center gap-1">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full font-medium text-sm bg-blue-100 text-blue-700">
                      {row.invoiceCount}
                    </span>
                    {row.pendingCount > 0 && (
                      <span className="text-xs text-orange-600">({row.pendingCount} pending)</span>
                    )}
                  </div>
                );
              }
              const colorClass = activeFilter === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                 activeFilter === 'partial' ? 'bg-amber-100 text-amber-700' :
                                 'bg-orange-100 text-orange-700';
              return (
                <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full font-medium text-sm ${colorClass}`}>
                  {row.invoiceCount}
                </span>
              );
            },
            cellClassName: 'text-center'
          },
          {
            key: 'amount',
            label: activeFilter === 'all' ? 'Total / Pending' :
                   activeFilter === 'paid' ? 'Total Paid' :
                   activeFilter === 'partial' ? 'Remaining' :
                   'Total Pending',
            render: (row) => {
              if (activeFilter === 'all') {
                if (row.invoiceCount === 0) {
                  return <p className="text-sm text-slate-400">No invoices yet</p>;
                }
                return (
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.totalAmount)}</p>
                    {row.totalPendingAmount > 0 ? (
                      <p className="text-xs text-red-600">Pending: {formatCurrency(row.totalPendingAmount)}</p>
                    ) : (
                      <p className="text-xs text-emerald-600">All Paid</p>
                    )}
                  </div>
                );
              }
              if (activeFilter === 'paid') {
                return <p className="font-bold text-lg text-emerald-600">{formatCurrency(row.totalPaidAmount)}</p>;
              }
              if (activeFilter === 'partial') {
                return (
                  <div>
                    <p className="font-bold text-lg text-amber-600">{formatCurrency(row.totalPendingAmount)}</p>
                    <p className="text-xs text-emerald-600">Paid: {formatCurrency(row.totalPaidAmount)}</p>
                  </div>
                );
              }
              return <p className="font-bold text-lg text-red-600">{formatCurrency(row.totalPendingAmount)}</p>;
            },
            cellClassName: 'text-right'
          },
          {
            key: 'dueDate',
            label: activeFilter === 'paid' ? 'Last Paid Date' : 'Next Due Date',
            render: (row) => {
              if (activeFilter === 'paid') {
                return <span className="text-emerald-600 font-medium">{formatDate(row.lastPaidDate)}</span>;
              }
              if (activeFilter === 'all') {
                if (row.invoiceCount === 0) return <span className="text-slate-400 text-sm">-</span>;
                if (!row.oldestDueDate) return <span className="text-emerald-600 text-sm">All Paid</span>;
                return (
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      {isPastDue(row.oldestDueDate) && <AlertCircle className="h-4 w-4 text-red-500" />}
                      <span className={isPastDue(row.oldestDueDate) ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {formatDate(row.oldestDueDate)}
                      </span>
                    </div>
                    {isPastDue(row.oldestDueDate) && <p className="text-xs text-red-500 mt-1">Overdue</p>}
                  </div>
                );
              }
              return (
                <div>
                  <div className="flex items-center justify-center gap-1">
                    {isPastDue(row.oldestDueDate) && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className={isPastDue(row.oldestDueDate) ? 'text-red-600 font-medium' : 'text-slate-600'}>
                      {formatDate(row.oldestDueDate)}
                    </span>
                  </div>
                  {isPastDue(row.oldestDueDate) && <p className="text-xs text-red-500 mt-1">Overdue</p>}
                </div>
              );
            },
            cellClassName: 'text-center'
          },
          {
            key: 'otcInvoice',
            label: 'OTC Invoice',
            render: (row) => {
              if (row.otcInvoiceId) {
                return (
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Generated
                  </span>
                );
              }
              if (row.otcAmount > 0) {
                return (
                  <span className="text-orange-600 text-sm font-medium">
                    {formatCurrency(row.otcAmount)}
                    <p className="text-xs text-slate-400">Pending</p>
                  </span>
                );
              }
              return <span className="text-slate-400 text-sm">N/A</span>;
            },
            cellClassName: 'text-center'
          }
        ]}
        data={customers}
        loading={isLoading}
        emptyMessage={
          activeFilter === 'all' ? 'No customers found' :
          activeFilter === 'pending' ? 'No pending bills found' :
          activeFilter === 'partial' ? 'No partial payments found' :
          'No paid invoices found'
        }
        emptyIcon={CreditCard}
        pagination={true}
        serverPagination={{
          page: currentPage,
          totalPages: totalPages,
          total: stats.totalCustomers || customers.length,
          limit: itemsPerPage
        }}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={() => {}}
        onRowClick={(row) => handleCustomerClick(row.leadId)}
        actions={(row) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8 w-8 p-0"
              onClick={(e) => { e.stopPropagation(); handleEditClick(e, row); }}
              title="Edit customer details"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={(e) => {
                e.stopPropagation();
                handleCustomerClick(row.leadId);
              }}
            >
              View Invoices
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {/* Edit Customer Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              Edit Customer Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerUsername">Username</Label>
              <Input
                id="customerUsername"
                value={editForm.customerUsername}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerUsername: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={editForm.companyName}
                onChange={(e) => setEditForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                value={editForm.mobileNumber}
                onChange={(e) => setEditForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                placeholder="Enter mobile number"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomer}
              disabled={isSaving}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
