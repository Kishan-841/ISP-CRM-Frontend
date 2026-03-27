'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { TrendingDown, TrendingUp, IndianRupee, Users, UserPlus, UserCheck, ChevronDown, ChevronRight, ArrowRightLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import DatePeriodFilter from '@/components/DatePeriodFilter';
import DataTable from '@/components/DataTable';
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

export default function SAMHeadBusinessImpact() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { start: defaultStart, end: defaultEnd } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [customerTab, setCustomerTab] = useState('NEW');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Bulk reassign state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignFrom, setReassignFrom] = useState(null); // { executiveId, executiveName }
  const [reassignTo, setReassignTo] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [samExecutives, setSamExecutives] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, page: page.toString(), limit: pageSize.toString(), customerType: customerTab });
      if (selectedExecutive) params.append('samExecutiveId', selectedExecutive);
      const response = await api.get(`/sam/business-impact?${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching business impact:', error);
      toast.error('Failed to load business impact data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedExecutive, customerTab, page, pageSize]);

  useEffect(() => {
    if (user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER') {
      fetchData();
    }
  }, [user, fetchData]);

  useSocketRefresh(() => { fetchData(); }, { enabled: user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER' });

  const toggleRow = (leadId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const openReassignModal = async (exec) => {
    setReassignFrom({ executiveId: exec.executiveId, executiveName: exec.executiveName, customerCount: exec.totalCustomers });
    setReassignTo('');
    setShowReassignModal(true);
    try {
      const res = await api.get('/sam/executives');
      setSamExecutives((res.data.executives || []).filter(e => e.id !== exec.executiveId));
    } catch { setSamExecutives([]); }
  };

  const handleBulkReassign = async () => {
    if (!reassignTo) { toast.error('Please select a target executive.'); return; }
    setIsReassigning(true);
    try {
      const res = await api.post('/sam/bulk-reassign', { fromExecutiveId: reassignFrom.executiveId, toExecutiveId: reassignTo });
      toast.success(res.data.message);
      setShowReassignModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reassign customers.');
    } finally {
      setIsReassigning(false);
    }
  };

  if (!user || (user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER')) return null;

  const summary = data?.summary || {};
  const executiveBreakdown = data?.executiveBreakdown || [];
  const reassignmentHistory = data?.reassignmentHistory || [];
  const customers = data?.customers || [];
  const pagination = data?.pagination || {};
  const typeCounts = data?.typeCounts || { new: 0, existing: 0 };

  // Get unique executives from breakdown for filter
  const executiveOptions = executiveBreakdown.filter(e => e.executiveId).map(e => ({
    id: e.executiveId,
    name: e.executiveName
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Business Impact" description="ARC changes across SAM executives" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <DatePeriodFilter
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => { setStartDate(start); setEndDate(end); setPage(1); }}
        />
        <div className="min-w-0">
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Executive</label>
          <select
            value={selectedExecutive}
            onChange={(e) => { setSelectedExecutive(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white w-full sm:w-auto"
          >
            <option value="">All Executives</option>
            {executiveOptions.map(exec => (
              <option key={exec.id} value={exec.id}>{exec.name}</option>
            ))}
          </select>
        </div>
      </div>

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

      {/* Executive Breakdown */}
      <Card className="bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Executive Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : executiveBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data available</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Executive</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Current ARC</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Business Impact</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Final ARC</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Customers</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executiveBreakdown.map((exec) => (
                      <tr
                        key={exec.executiveId || 'unassigned'}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => {
                          if (exec.executiveId) {
                            setSelectedExecutive(exec.executiveId);
                            setPage(1);
                          }
                        }}
                      >
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{exec.executiveName}</td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatCurrency(exec.currentArc)}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${exec.businessImpact > 0 ? 'text-green-600 dark:text-green-400' : exec.businessImpact < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {exec.businessImpact > 0 ? '+' : exec.businessImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(exec.businessImpact))}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(exec.finalArc)}</td>
                        <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{exec.totalCustomers}</td>
                        <td className="py-3 px-4 text-center">
                          {exec.executiveId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openReassignModal(exec); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 rounded-lg transition-colors"
                              title="Bulk reassign all customers"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Reassign
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {executiveBreakdown.map((exec) => (
                  <div
                    key={exec.executiveId || 'unassigned'}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                    onClick={() => {
                      if (exec.executiveId) {
                        setSelectedExecutive(exec.executiveId);
                        setPage(1);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{exec.executiveName}</p>
                      <span className="text-xs text-slate-500">{exec.totalCustomers} customers</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Current ARC</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(exec.currentArc)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Impact</p>
                        <p className={`font-semibold ${exec.businessImpact > 0 ? 'text-green-600' : exec.businessImpact < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {exec.businessImpact > 0 ? '+' : exec.businessImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(exec.businessImpact))}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Final ARC</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(exec.finalArc)}</p>
                      </div>
                    </div>
                    {exec.executiveId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openReassignModal(exec); }}
                        className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 rounded-lg transition-colors"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Reassign
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reassignment History */}
      {reassignmentHistory.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-dashed border-amber-300 dark:border-amber-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Reassigned Executives
              <span className="text-xs font-normal text-slate-500 ml-1">(no longer managing these customers)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Executive</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Current ARC</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Business Impact</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Final ARC</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Customers</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Reassigned On</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignmentHistory.map((exec) => (
                    <tr key={exec.executiveId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{exec.executiveName}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{formatCurrency(exec.originalArc)}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${exec.businessImpact > 0 ? 'text-green-600 dark:text-green-400' : exec.businessImpact < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {exec.businessImpact > 0 ? '+' : exec.businessImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(exec.businessImpact))}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(exec.finalArc)}</td>
                      <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{exec.customers}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(exec.reassignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {reassignmentHistory.map((exec) => (
                <div key={exec.executiveId} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-amber-50/50 dark:bg-amber-900/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{exec.executiveName}</p>
                    <span className="text-[10px] text-slate-500">
                      Reassigned {new Date(exec.reassignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Current ARC</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(exec.originalArc)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Impact</p>
                      <p className={`font-semibold ${exec.businessImpact > 0 ? 'text-green-600' : exec.businessImpact < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {exec.businessImpact > 0 ? '+' : exec.businessImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(exec.businessImpact))}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Final ARC</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(exec.finalArc)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">SAM Executive</th>
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
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{customer.samExecutiveName}</td>
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
                            <td colSpan={8} className="bg-slate-50 dark:bg-slate-800/50 px-8 py-3">
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
                        <p className="text-xs text-slate-500">{customer.customerUsername || '-'} &middot; {customer.samExecutiveName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {customer.isChurned ? (
                          <Badge variant="destructive" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Churned</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                        )}
                      </div>
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

      {/* Bulk Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Bulk Reassign Customers</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Reassign all {reassignFrom?.customerCount} customer(s) from <span className="font-medium text-slate-700 dark:text-slate-300">{reassignFrom?.executiveName}</span> to another executive.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-4">
              This will reset the business impact for these customers. The new executive will start with impact = 0.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Assign To *</label>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Select executive...</option>
                {samExecutives.map(exec => (
                  <option key={exec.id} value={exec.id}>{exec.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowReassignModal(false)} className="flex-1" disabled={isReassigning}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkReassign}
                disabled={!reassignTo || isReassigning}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isReassigning ? 'Reassigning...' : 'Reassign All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
