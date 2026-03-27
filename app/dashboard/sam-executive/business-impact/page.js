'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { TrendingDown, TrendingUp, IndianRupee, Users, UserPlus, UserCheck, ChevronDown, ChevronRight } from 'lucide-react';
import StatCard from '@/components/StatCard';
import DatePeriodFilter from '@/components/DatePeriodFilter';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatCurrency } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const getDefaultDates = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  const start = `${fyStartYear}-04-01`;
  const end = now.toISOString().split('T')[0];
  return { start, end };
};

export default function SAMExecutiveBusinessImpact() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { start: defaultStart, end: defaultEnd } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [customerTab, setCustomerTab] = useState('NEW');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (user && user.role !== 'SAM_EXECUTIVE' && user.role !== 'SAM' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, page: page.toString(), limit: pageSize.toString(), customerType: customerTab });
      const response = await api.get(`/sam/business-impact?${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching business impact:', error);
      toast.error('Failed to load business impact data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, customerTab, page, pageSize]);

  useEffect(() => {
    if (user && (user.role === 'SAM_EXECUTIVE' || user.role === 'SAM' || user.role === 'SUPER_ADMIN' || user.role === 'MASTER')) {
      fetchData();
    }
  }, [user, fetchData]);

  useSocketRefresh(() => { fetchData(); }, { enabled: user?.role === 'SAM_EXECUTIVE' || user?.role === 'SAM' || user?.role === 'MASTER' });

  const toggleRow = (leadId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  if (!user || (user.role !== 'SAM_EXECUTIVE' && user.role !== 'SAM' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER')) return null;

  const summary = data?.summary || {};
  const customers = data?.customers || [];
  const pagination = data?.pagination || {};
  const typeCounts = data?.typeCounts || { new: 0, existing: 0 };

  return (
    <div className="space-y-6">
      <PageHeader title="Business Impact" description="Your ARC changes across customers" />

      {/* Filters */}
      <DatePeriodFilter
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start, end) => { setStartDate(start); setEndDate(end); setPage(1); }}
      />

      {/* Customer Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setCustomerTab('NEW'); setPage(1); }}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            customerTab === 'NEW'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-1.5 -mt-0.5" />
          <span className="hidden sm:inline">New Customers</span>
          <span className="sm:hidden">New</span>
          <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs ${customerTab === 'NEW' ? 'bg-green-500/30 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>{typeCounts.new}</span>
        </button>
        <button
          onClick={() => { setCustomerTab('EXISTING'); setPage(1); }}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            customerTab === 'EXISTING'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-1.5 -mt-0.5" />
          <span className="hidden sm:inline">Existing Customers</span>
          <span className="sm:hidden">Existing</span>
          <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs ${customerTab === 'EXISTING' ? 'bg-blue-500/30 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>{typeCounts.existing}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard color="blue" icon={IndianRupee} label="Total Current ARC" value={formatCurrency(summary.totalCurrentArc)} />
        <StatCard
          color={summary.totalBusinessImpact < 0 ? 'red' : 'green'}
          icon={summary.totalBusinessImpact < 0 ? TrendingDown : TrendingUp}
          label="Business Impact"
          value={`${summary.totalBusinessImpact > 0 ? '+' : summary.totalBusinessImpact < 0 ? '-' : ''}${formatCurrency(Math.abs(summary.totalBusinessImpact))}`}
        />
        <StatCard color="emerald" icon={IndianRupee} label="Total Final ARC" value={formatCurrency(summary.totalFinalArc)} />
      </div>

      {/* Customer Detail Table */}
      <Card className="bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            {customerTab === 'NEW' ? 'New' : 'Existing'} Customer Details
            {!isLoading && <span className="text-sm font-normal text-slate-500 ml-2">({pagination.total || 0})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No {customerTab === 'NEW' ? 'new' : 'existing'} customers found</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400 w-8"></th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Company</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Username</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Current ARC</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Impact</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Final ARC</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <Fragment key={customer.leadId}>
                        <tr
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          onClick={() => customer.planChanges.length > 0 && toggleRow(customer.leadId)}
                        >
                          <td className="py-3 px-4">
                            {customer.planChanges.length > 0 && (
                              expandedRows.has(customer.leadId)
                                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                                : <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{customer.companyName}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{customer.customerUsername || '-'}</td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatCurrency(customer.currentArc)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${customer.businessImpact > 0 ? 'text-green-600 dark:text-green-400' : customer.businessImpact < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {customer.businessImpact > 0 ? '+' : customer.businessImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(customer.businessImpact))}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(customer.finalArc)}</td>
                          <td className="py-3 px-4 text-center">
                            {customer.isChurned ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Churned</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                            )}
                          </td>
                        </tr>
                        {expandedRows.has(customer.leadId) && customer.planChanges.length > 0 && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50 dark:bg-slate-800/50 px-8 py-3">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Plan Change History ({startDate} to {endDate})</div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-2 px-3 font-medium text-slate-500">Date</th>
                                    <th className="text-center py-2 px-3 font-medium text-slate-500">Type</th>
                                    <th className="text-left py-2 px-3 font-medium text-slate-500">Previous Plan</th>
                                    <th className="text-left py-2 px-3 font-medium text-slate-500">New Plan</th>
                                    <th className="text-right py-2 px-3 font-medium text-slate-500">Previous ARC</th>
                                    <th className="text-right py-2 px-3 font-medium text-slate-500">New ARC</th>
                                    <th className="text-right py-2 px-3 font-medium text-slate-500">Change</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customer.planChanges.map((change) => (
                                    <tr key={change.id} className="border-b border-slate-100 dark:border-slate-700">
                                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                                        {new Date(change.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <Badge variant="outline" className={
                                          change.type === 'RATE_REVISION' ? 'text-orange-600 border-orange-300'
                                          : change.type === 'UPGRADE' ? 'text-green-600 border-green-300'
                                          : 'text-red-600 border-red-300'
                                        }>
                                          {change.type === 'RATE_REVISION' ? 'RATE REVISION' : change.type}
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{change.previousPlanName || '-'}</td>
                                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{change.newPlanName || '-'}</td>
                                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(change.previousArc)}</td>
                                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(change.newArc)}</td>
                                      <td className={`py-2 px-3 text-right font-medium ${change.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change.change > 0 ? '+' : ''}{formatCurrency(change.change)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {customers.map((customer) => (
                  <div
                    key={customer.leadId}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{customer.companyName}</p>
                        <p className="text-xs text-slate-500">{customer.customerUsername || '-'}</p>
                      </div>
                      {customer.isChurned ? (
                        <Badge variant="destructive" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Churned</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <p className="text-slate-500">Current ARC</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(customer.currentArc)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Impact</p>
                        <p className={`font-semibold ${customer.businessImpact > 0 ? 'text-green-600' : customer.businessImpact < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {customer.businessImpact > 0 ? '+' : customer.businessImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(customer.businessImpact))}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Final ARC</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(customer.finalArc)}</p>
                      </div>
                    </div>
                    {customer.planChanges.length > 0 && (
                      <>
                        <button
                          onClick={() => toggleRow(customer.leadId)}
                          className="text-xs text-blue-600 flex items-center gap-1"
                        >
                          {expandedRows.has(customer.leadId) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {expandedRows.has(customer.leadId) ? 'Hide' : 'Show'} plan changes ({customer.planChanges.length})
                        </button>
                        {expandedRows.has(customer.leadId) && (
                          <div className="mt-2 space-y-2">
                            {customer.planChanges.map((change) => (
                              <div key={change.id} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge variant="outline" className={`text-[10px] ${
                                    change.type === 'UPGRADE' && change.newArc < change.previousArc ? 'text-orange-600 border-orange-300'
                                    : change.type === 'UPGRADE' ? 'text-green-600 border-green-300'
                                    : 'text-red-600 border-red-300'
                                  }`}>
                                    {change.type === 'UPGRADE' && change.newArc < change.previousArc ? 'RATE REVISION' : change.type}
                                  </Badge>
                                  <span className="text-[10px] text-slate-500">{new Date(change.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[10px]">
                                  <div>
                                    <span className="text-slate-500">Prev: </span>
                                    <span className="text-slate-700 dark:text-slate-300">{formatCurrency(change.previousArc)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">New: </span>
                                    <span className="text-slate-700 dark:text-slate-300">{formatCurrency(change.newArc)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Change: </span>
                                    <span className={change.change > 0 ? 'text-green-600' : 'text-red-600'}>
                                      {change.change > 0 ? '+' : ''}{formatCurrency(change.change)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {[10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size} / page</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Previous
                  </button>
                  <span className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
