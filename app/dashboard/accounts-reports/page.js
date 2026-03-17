'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Users,
  IndianRupee,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Receipt,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Colors for charts
const COLORS = ['#f97316', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#6366f1'];
const STATUS_COLORS = {
  PAID: '#10b981',
  PARTIALLY_PAID: '#f59e0b',
  GENERATED: '#3b82f6',
  OVERDUE: '#ef4444',
  CANCELLED: '#6b7280'
};

export default function AccountsReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const isAccountsTeam = user?.role === 'ACCOUNTS_TEAM';
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Redirect non-authorized users
  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, router]);

  // Fetch report data
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/accounts-reports?${params.toString()}`);
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to load report data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isAccountsTeam || isAdmin)) {
      fetchReport();
    }
  }, [user, isAccountsTeam, isAdmin]);

  const handleFilter = () => {
    fetchReport();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setTimeout(fetchReport, 100);
  };

  if (!user || (!isAccountsTeam && !isAdmin)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  const { summary, customers, trendData, statusDistribution, billingCycleDistribution } = reportData || {};

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <PageHeader title="Accounts Reports" description="Comprehensive billing and collection analytics">
        <Button onClick={fetchReport} variant="outline" size="sm" className="gap-2 flex-shrink-0">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </PageHeader>

      {/* Date Filter */}
      <Card className="bg-white dark:bg-slate-900">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Filter by Date:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40"
                placeholder="Start Date"
              />
              <span className="text-slate-500 flex-shrink-0">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40"
                placeholder="End Date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleFilter} size="sm" className="bg-orange-600 text-white hover:bg-orange-700">
                Apply
              </Button>
              {(startDate || endDate) && (
                <Button onClick={handleClearFilter} size="sm" variant="outline">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard color="orange" icon={Users} label="Total Customers" value={summary?.totalCustomers || 0} />
        <StatCard color="blue" icon={TrendingUp} label="Total ARC" value={formatCurrency(summary?.totalARC || 0)} />
        <StatCard color="amber" icon={Receipt} label="Total OTC" value={formatCurrency(summary?.totalOTC || 0)} />
        <StatCard color="emerald" icon={FileText} label="Total Invoiced" value={formatCurrency(summary?.totalInvoiced || 0)} />
        <StatCard color="cyan" icon={IndianRupee} label="Total Received" value={formatCurrency(summary?.totalReceived || 0)} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Collection vs Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard color="emerald" icon={CheckCircle} label="Collected" value={formatCurrency(summary?.totalReceived || 0)} />
        <StatCard color="orange" icon={Clock} label="Pending" value={formatCurrency(summary?.totalPending || 0)} />
        <StatCard color="red" icon={AlertCircle} label="Credit Notes" value={formatCurrency(summary?.totalCreditNotes || 0)} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Trend Chart */}
        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Monthly Billing vs Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="h-60 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} width={50} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="invoiced"
                    name="Invoiced"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Received"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status Distribution */}
        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="h-60 sm:h-80 flex flex-col sm:flex-row items-center">
              <ResponsiveContainer width="100%" height="70%" className="sm:!w-[60%] sm:!h-full">
                <RechartsPie>
                  <Pie
                    data={statusDistribution || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, count }) => `${count}`}
                  >
                    {(statusDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex flex-wrap sm:flex-col gap-2 sm:w-40 justify-center">
                {(statusDistribution || []).map((item, index) => (
                  <div key={item.status} className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[item.status] || COLORS[index % COLORS.length] }}
                    />
                    <span className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{item.status}</span>
                    <span className="text-[10px] sm:text-xs font-bold sm:ml-auto">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers with Pending Payments */}
        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              Customers with Pending Payments
            </CardTitle>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Customers with outstanding invoice amounts</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const pendingCustomers = (customers || [])
                .filter(c => c.pendingAmount > 0)
                .sort((a, b) => b.pendingAmount - a.pendingAmount)
                .slice(0, 5);

              if (pendingCustomers.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
                    <p className="font-medium">All Payments Cleared!</p>
                    <p className="text-sm">No pending amounts from customers</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {pendingCustomers.map((customer, index) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors gap-2"
                      onClick={() => router.push(`/dashboard/billing-mgmt/${customer.id}`)}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0 ${
                          index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-amber-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base text-slate-900 dark:text-white truncate">{customer.companyName}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500">{customer.totalInvoices} inv • {customer.collectionRate}%</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm sm:text-lg font-bold text-orange-600">{formatCurrency(customer.pendingAmount)}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500">pending</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Monthly Invoice Count */}
        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Monthly Invoice Count
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="h-60 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={35} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="invoiceCount" name="Invoices Generated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details Table */}
      <div className="space-y-4">
        <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2 px-3 sm:px-0">
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          Customer Billing Details
          <Badge className="ml-2 bg-orange-100 text-orange-700 text-[10px] sm:text-xs">{customers?.length || 0}</Badge>
        </h2>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {(customers || []).slice(0, 50).map((customer) => (
              <div
                key={customer.id}
                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer active:bg-slate-100"
                onClick={() => router.push(`/dashboard/billing-mgmt/${customer.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{customer.companyName}</p>
                      {customer.isActive && (
                        <Badge className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 flex-shrink-0">Active</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">{customer.customerUsername}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {customer.collectionRate >= 80 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : customer.collectionRate >= 50 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={`text-sm font-bold ${
                      customer.collectionRate >= 80 ? 'text-emerald-600' :
                      customer.collectionRate >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {customer.collectionRate}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Invoiced</p>
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{formatCurrency(customer.totalInvoiced)}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Received</p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(customer.totalReceived)}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-orange-600 dark:text-orange-400">Pending</p>
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-300">{customer.pendingAmount > 0 ? formatCurrency(customer.pendingAmount) : '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <DataTable
            className="hidden lg:block"
            data={customers || []}
            columns={[
              {
                key: 'customer',
                label: 'Customer',
                render: (customer) => (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{customer.companyName}</p>
                      {customer.isActive && (
                        <Badge className="text-[10px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{customer.customerUsername}</p>
                  </div>
                ),
              },
              {
                key: 'createdAt',
                label: 'Created Date',
                render: (customer) => (
                  <span className="text-slate-600 dark:text-slate-400">{formatDate(customer.createdAt)}</span>
                ),
              },
              {
                key: 'billingStartDate',
                label: 'Billing Start',
                render: (customer) => (
                  <span className="text-slate-600 dark:text-slate-400">{formatDate(customer.billingStartDate) || '-'}</span>
                ),
              },
              {
                key: 'arc',
                label: 'ARC',
                className: 'text-right',
                cellClassName: 'text-right',
                render: (customer) => (
                  <span className="font-medium text-blue-600">{formatCurrency(customer.arc)}</span>
                ),
              },
              {
                key: 'otcAmount',
                label: 'OTC',
                className: 'text-right',
                cellClassName: 'text-right',
                render: (customer) => (
                  <span className="font-medium text-amber-600">{customer.otcAmount > 0 ? formatCurrency(customer.otcAmount) : '-'}</span>
                ),
              },
              {
                key: 'totalInvoiced',
                label: 'Invoiced',
                className: 'text-right',
                cellClassName: 'text-right',
                render: (customer) => (
                  <span className="font-medium">{formatCurrency(customer.totalInvoiced)}</span>
                ),
              },
              {
                key: 'totalReceived',
                label: 'Received',
                className: 'text-right',
                cellClassName: 'text-right',
                render: (customer) => (
                  <span className="font-medium text-emerald-600">{formatCurrency(customer.totalReceived)}</span>
                ),
              },
              {
                key: 'pendingAmount',
                label: 'Pending',
                className: 'text-right',
                cellClassName: 'text-right',
                render: (customer) => (
                  <span className="font-medium text-orange-600">{customer.pendingAmount > 0 ? formatCurrency(customer.pendingAmount) : '-'}</span>
                ),
              },
              {
                key: 'collectionRate',
                label: 'Collection %',
                className: 'text-center',
                cellClassName: 'text-center',
                render: (customer) => {
                  let IconComponent = ArrowDownRight;
                  let iconColor = 'text-red-500';
                  let textColor = 'text-red-600';
                  if (customer.collectionRate >= 80) {
                    IconComponent = ArrowUpRight;
                    iconColor = 'text-emerald-500';
                    textColor = 'text-emerald-600';
                  } else if (customer.collectionRate >= 50) {
                    IconComponent = ArrowUpRight;
                    iconColor = 'text-amber-500';
                    textColor = 'text-amber-600';
                  }
                  return (
                    <div className="flex items-center justify-center gap-1">
                      <IconComponent className={`h-4 w-4 ${iconColor}`} />
                      <span className={`font-bold ${textColor}`}>
                        {customer.collectionRate}%
                      </span>
                    </div>
                  );
                },
              },
            ]}
            onRowClick={(customer) => router.push(`/dashboard/billing-mgmt/${customer.id}`)}
            pagination={true}
            defaultPageSize={25}
            searchable={true}
            searchPlaceholder="Search customers..."
            searchKeys={['companyName', 'customerUsername']}
            emptyMessage="No customer data available"
            emptyIcon={BarChart3}
          />
      </div>
    </div>
  );
}
