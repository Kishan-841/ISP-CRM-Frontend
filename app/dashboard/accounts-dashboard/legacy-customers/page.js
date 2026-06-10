'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { useLeadStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Truck,
  Receipt,
  CheckCircle2,
  ArrowLeft,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Status filter tabs for the legacy customer table.
const STATUS_TABS = [
  { key: 'COMPLETED', label: 'Old Imported Customers', icon: CheckCircle2, color: 'blue' },
  { key: 'PENDING_DELIVERY', label: 'Pending Delivery', icon: Truck, color: 'amber' },
  { key: 'PENDING_BILLING', label: 'Pending Billing', icon: Receipt, color: 'orange' },
  { key: 'all', label: 'All', icon: Users, color: 'slate' },
];

const STATUS_BADGE = {
  PENDING_DELIVERY: { label: 'Pending Delivery', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  PENDING_BILLING: { label: 'Pending Billing', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
};

const CYCLE_LABEL = {
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly', YEARLY: 'Yearly',
};

export default function LegacyCustomersPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();
  const { legacyListCustomers, legacyGetStats } = useLeadStore();

  const [statusFilter, setStatusFilter] = useState('COMPLETED');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) router.push('/dashboard');
  }, [user, isAccountsTeam, isAdmin, router]);

  const fetchStats = useCallback(async () => {
    const result = await legacyGetStats();
    if (result.success) setStats(result.data);
  }, [legacyGetStats]);

  const fetchCustomers = useCallback(async (page = 1) => {
    setIsLoading(true);
    const params = { page, limit: 20 };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    const result = await legacyListCustomers(params);
    if (result.success) {
      setCustomers(result.data?.customers || []);
      setPagination(result.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } else {
      toast.error(result.error || 'Failed to load customers');
    }
    setIsLoading(false);
  }, [statusFilter, search, legacyListCustomers]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchCustomers(1); }, [fetchCustomers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const countFor = (key) => {
    if (!stats) return null;
    if (key === 'COMPLETED') return stats.totalCustomers;
    if (key === 'PENDING_DELIVERY') return stats.pendingDelivery;
    if (key === 'PENDING_BILLING') return stats.pendingBilling;
    if (key === 'all') return stats.total;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/accounts-dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Old Imported Customers
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Legacy customers onboarded through the Accounts ↔ Delivery flow.
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {STATUS_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const count = countFor(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
              {count !== null && (
                <Badge variant="outline" className="ml-1">{count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, company, phone, code, username"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No customers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Code</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Company / Name</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Username</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">ARC</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Delivery Date</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Bill Date</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Cycle</th>
                    <th className="px-4 py-3 text-right font-medium whitespace-nowrap">FTB Amount</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">FTB Date</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => {
                    const badge = STATUS_BADGE[c.status] || { label: c.status, cls: '' };
                    return (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{c.customerCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">{c.companyName || c.name}</div>
                          {c.companyName && <div className="text-xs text-muted-foreground">{c.name}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{c.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{c.username || '-'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{c.arcAmount != null ? formatCurrency(c.arcAmount) : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{c.deliveryDate ? formatDate(c.deliveryDate) : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{c.billDate ? formatDate(c.billDate) : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{c.billingCycle ? (CYCLE_LABEL[c.billingCycle] || c.billingCycle) : '-'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{c.ftbAmount != null ? formatCurrency(c.ftbAmount) : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{c.ftbReceivedDate ? formatDate(c.ftbReceivedDate) : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={badge.cls}>{badge.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchCustomers(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchCustomers(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
