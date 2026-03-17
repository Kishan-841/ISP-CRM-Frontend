'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatCard from '@/components/StatCard';
import {
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Search,
  IndianRupee,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import DatePeriodFilter from '@/components/DatePeriodFilter';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useExportExcel } from '@/hooks/useExportExcel';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Get first day of current FY (Apr-Mar)
const getFirstDayOfFY = () => {
  const now = new Date();
  const fyStart = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  return `${fyStart}-04-01`;
};

// Get today's date
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

export default function BusinessImpactReportPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();

  const [isLoading, setIsLoading] = useState(true);
  const [businessImpact, setBusinessImpact] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    customersWithUpgrade: 0,
    customersWithDegrade: 0,
    totalInitialArc: 0,
    totalCurrentArc: 0,
    totalUpgradeArc: 0,
    totalDegradeArc: 0,
    netRevenueImpact: 0,
    totalActiveCustomers: 0,
    totalActiveArc: 0
  });

  // Filters
  const [fromDate, setFromDate] = useState(getFirstDayOfFY());
  const [toDate, setToDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const { handleExport, isExporting } = useExportExcel({
    endpoint: '/accounts-reports/business-impact',
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
    mapRow: (item, index) => ({
      'S.No': index + 1,
      'Company Name': item.companyName,
      'User Name': item.userName,
      'Initial Plan': item.initialPlanName,
      'Activation Date': formatDate(item.activationDate),
      'Initial ARC': item.initialArc,
      'Total Changes': item.totalChanges,
      'Upgrades': item.upgradeCount,
      'Downgrades': item.degradeCount,
      'Upgrade ARC Added': item.totalUpgradeArc,
      'Downgrade ARC Reduced': item.totalDegradeArc,
      'Current Plan': item.currentPlanName,
      'Current ARC': item.currentArc,
      'Net ARC Change': item.netArcChange,
      'Change %': item.netChangePercentage + '%',
      'Status': item.isActive ? 'Active' : 'Inactive',
      'Last Change Date': formatDate(item.lastChangeDate)
    }),
    sheetName: 'Business Impact',
    fileName: `Business_Impact_Report_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}`,
    columnWidths: [
      { wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }
    ],
    dataKey: 'businessImpact',
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

      const response = await api.get(`/accounts-reports/business-impact?${params.toString()}`);
      setBusinessImpact(response.data.businessImpact || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setSummary(response.data.summary || {});
    } catch (error) {
      toast.error('Failed to load business impact report');
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

  const toggleRowExpansion = (customerId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleCustomerClick = (item) => {
    if (item.id) {
      router.push(`/dashboard/billing-mgmt/${item.id}`);
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
                <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                Business Impact Report
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-[18px]">
              Track revenue impact from plan upgrades and downgrades
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || businessImpact.length === 0}
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
        <CardContent className="p-3 sm:p-4 space-y-3">
          <DatePeriodFilter
            startDate={fromDate}
            endDate={toDate}
            onDateChange={(start, end) => { setFromDate(start); setToDate(end); }}
          />
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-slate-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by company, plan name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSearch} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard color="blue" icon={IndianRupee} label={`Total Initial ARC (${summary.totalCustomers})`} value={formatCurrency(summary.totalInitialArc)} />
        <StatCard color="emerald" icon={ArrowUpCircle} label={`Upgrade ARC (${summary.customersWithUpgrade})`} value={formatCurrency(summary.totalUpgradeArc)} />
        <StatCard color="orange" icon={ArrowDownCircle} label={`Downgrade ARC (${summary.customersWithDegrade})`} value={formatCurrency(summary.totalDegradeArc)} />
        <StatCard
          color={summary.netRevenueImpact >= 0 ? 'orange' : 'red'}
          icon={summary.netRevenueImpact >= 0 ? TrendingUp : TrendingDown}
          label={`Net Revenue Impact (${summary.impactPercentage}%)`}
          value={formatCurrency(summary.netRevenueImpact)}
        />
      </div>

      {/* Context Card */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Total Active Customers</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{summary.totalActiveCustomers}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:border-l sm:border-slate-300 sm:dark:border-slate-600 sm:pl-6">
              <IndianRupee className="h-5 w-5 text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Total Active ARC</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(summary.totalActiveArc)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:border-l sm:border-slate-300 sm:dark:border-slate-600 sm:pl-6">
              <Activity className="h-5 w-5 text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Customers with Changes</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{summary.totalCustomers}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-2">
          <div className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Business Impact Details
            <Badge className="ml-2 bg-blue-100 text-blue-700">{pagination.total} records</Badge>
          </div>
          <div className="text-xs sm:text-sm text-slate-500">
            {fromDate === toDate ? (
              <span>Changes for {formatDate(fromDate)}</span>
            ) : (
              <span>{formatDate(fromDate)} to {formatDate(toDate)}</span>
            )}
          </div>
        </div>
        {/* Desktop Table */}
        <DataTable
            columns={[
              {
                key: 'expand',
                label: '',
                width: '40px',
                render: (row) => (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRowExpansion(row.id); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {expandedRows.has(row.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ),
              },
              {
                key: 'companyName',
                label: 'Company Name',
                render: (row) => (
                  <div>
                    <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCustomerClick(row); }}>
                      <p className="font-medium text-slate-900 dark:text-white">{row.companyName}</p>
                      <p className="text-xs text-slate-500">{row.userName}</p>
                    </div>
                    {expandedRows.has(row.id) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Plan Change History</h4>
                        {row.planChanges && row.planChanges.length > 0 ? (
                          <div className="space-y-2">
                            {row.planChanges.map((change) => (
                              <div
                                key={change.id}
                                className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                <div className="flex-shrink-0">
                                  <Badge className={change.actionType === 'UPGRADE' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                                    {change.actionType}
                                  </Badge>
                                </div>
                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs text-slate-500">Date</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatDate(change.changeDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">New Plan</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">{change.newPlanName}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Previous ARC</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(change.previousArc)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">New ARC</p>
                                    <p className="font-bold text-blue-600">{formatCurrency(change.newArc)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">ARC Change</p>
                                    <p className={`font-bold ${change.arcChange > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                      {change.arcChange > 0 && '+'}{formatCurrency(change.arcChange)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-500 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-sm">No plan changes in the selected date range</p>
                            <p className="text-xs mt-1">This customer has not upgraded or downgraded during this period</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'initialPlanName',
                label: 'Initial Plan',
              },
              {
                key: 'activationDate',
                label: 'Activation Date',
                render: (row) => (
                  <span className="text-xs">{formatDate(row.activationDate)}</span>
                ),
              },
              {
                key: 'initialArc',
                label: 'Initial ARC',
                cellClassName: 'text-right',
                render: (row) => <span className="font-medium">{formatCurrency(row.initialArc)}</span>,
              },
              {
                key: 'changes',
                label: 'Changes',
                cellClassName: 'text-center',
                render: (row) => (
                  <div className="flex items-center justify-center gap-2">
                    {row.upgradeCount > 0 && (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700">{row.upgradeCount} ↑</Badge>
                    )}
                    {row.degradeCount > 0 && (
                      <Badge className="text-xs bg-orange-100 text-orange-700">{row.degradeCount} ↓</Badge>
                    )}
                  </div>
                ),
              },
              {
                key: 'currentPlanName',
                label: 'Current Plan',
              },
              {
                key: 'currentArc',
                label: 'Current ARC',
                cellClassName: 'text-right',
                render: (row) => <span className="font-bold text-blue-600">{formatCurrency(row.currentArc)}</span>,
              },
              {
                key: 'netArcChange',
                label: 'Net Change',
                cellClassName: 'text-right',
                render: (row) => {
                  const color = row.netArcChange > 0 ? 'text-emerald-600' : row.netArcChange < 0 ? 'text-orange-600' : 'text-slate-400';
                  return (
                    <span className={`font-bold ${color}`}>
                      {row.netArcChange > 0 && '+'}{formatCurrency(row.netArcChange)}
                    </span>
                  );
                },
              },
              {
                key: 'impact',
                label: 'Impact',
                cellClassName: 'text-center',
                render: (row) => {
                  const color = row.netArcChange > 0 ? 'text-emerald-600' : row.netArcChange < 0 ? 'text-orange-600' : 'text-slate-400';
                  return (
                    <span className={`text-xs font-bold ${color}`}>
                      {row.netChangePercentage > 0 && '+'}{row.netChangePercentage}%
                    </span>
                  );
                },
              },
            ]}
            data={businessImpact}
            loading={isLoading}
            pagination={true}
            defaultPageSize={50}
            pageSizeOptions={[50, 100]}
            serverPagination={pagination}
            onPageChange={handlePageChange}
            emptyMessage={
              searchTerm
                ? 'No customers match your search criteria'
                : 'No active customers with plans in the system'
            }
            emptyIcon={BarChart3}
            className="hidden lg:block"
          />

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3">
                  {businessImpact.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between mb-2 cursor-pointer" onClick={() => handleCustomerClick(item)}>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.companyName}</p>
                          <p className="text-xs text-slate-500">{item.userName}</p>
                        </div>
                        <span className={`text-sm font-bold ${
                          item.netArcChange > 0 ? 'text-emerald-600' :
                          item.netArcChange < 0 ? 'text-orange-600' : 'text-slate-400'
                        }`}>
                          {item.netArcChange > 0 && '+'}{formatCurrency(item.netArcChange)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Initial ARC</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(item.initialArc)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Current ARC</p>
                          <p className="font-bold text-blue-600">{formatCurrency(item.currentArc)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Changes</p>
                          <div className="flex items-center gap-1">
                            {item.upgradeCount > 0 && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{item.upgradeCount} up</Badge>}
                            {item.degradeCount > 0 && <Badge className="text-[10px] bg-orange-100 text-orange-700">{item.degradeCount} down</Badge>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Impact</p>
                          <p className={`text-sm font-bold ${item.netArcChange > 0 ? 'text-emerald-600' : item.netArcChange < 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                            {item.netChangePercentage > 0 && '+'}{item.netChangePercentage}%
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleRowExpansion(item.id)}
                        className="text-xs text-blue-600 flex items-center gap-1"
                      >
                        {expandedRows.has(item.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expandedRows.has(item.id) ? 'Hide' : 'Show'} plan changes
                      </button>
                      {expandedRows.has(item.id) && item.planChanges && item.planChanges.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {item.planChanges.map((change) => (
                            <div key={change.id} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-1">
                                <Badge className={`text-[10px] ${change.actionType === 'UPGRADE' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {change.actionType}
                                </Badge>
                                <span className="text-xs text-slate-500">{formatDate(change.changeDate)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div>
                                  <span className="text-slate-500">Plan: </span>
                                  <span className="text-slate-700 dark:text-slate-300">{change.newPlanName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Change: </span>
                                  <span className={change.arcChange > 0 ? 'text-emerald-600' : 'text-orange-600'}>
                                    {change.arcChange > 0 && '+'}{formatCurrency(change.arcChange)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {businessImpact.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No active customers found</p>
                    <p className="text-sm mt-1">
                      {searchTerm ? 'No customers match your search criteria' : 'No active customers with plans in the system'}
                    </p>
                  </div>
                )}

                {/* Mobile Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-4 py-4 border-t border-slate-200 dark:border-slate-700">
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
