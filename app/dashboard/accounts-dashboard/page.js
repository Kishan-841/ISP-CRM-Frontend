'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  IndianRupee,
  TrendingUp,
  Calendar,
  RefreshCw,
  Loader2,
  Clock,
  AlertTriangle,
  Building2,
  ChevronRight,
  BarChart3,
  LineChart as LineChartIcon,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  FileText,
  Receipt,
  TrendingDown
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
  AreaChart,
  Area,
  Cell
} from 'recharts';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Get first day of current month in YYYY-MM-DD format
const getFirstDayOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split('T')[0];
};

// Colors for charts and ageing buckets
const AGEING_COLORS = {
  '1-30': '#10b981',   // Green - recent
  '31-60': '#f59e0b',  // Amber - warning
  '61-90': '#f97316',  // Orange - concern
  '90+': '#ef4444'     // Red - critical
};

export default function AccountsDashboardPage() {
  const router = useRouter();
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState('alltime');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getTodayDate());

  // Redirect non-authorized users
  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, router]);

  // Fetch dashboard data
  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/accounts-dashboard?timeFilter=${timeFilter}&fromDate=${fromDate}&toDate=${toDate}`);
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update date range when period changes
  useEffect(() => {
    const now = new Date();
    const today = getTodayDate();
    if (selectedPeriod === 'alltime') {
      setFromDate('2020-01-01');
      setToDate(today);
    } else if (selectedPeriod === 'last7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split('T')[0]);
      setToDate(today);
    } else if (selectedPeriod === 'lastMonth') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      setFromDate(d.toISOString().split('T')[0]);
      setToDate(today);
    } else if (selectedPeriod === 'lastYear') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      setFromDate(d.toISOString().split('T')[0]);
      setToDate(today);
    }
    // 'custom' - don't change dates, user picks manually
  }, [selectedPeriod]);

  useEffect(() => {
    if (user && (isAccountsTeam || isAdmin)) {
      fetchDashboard();
    }
  }, [user, isAccountsTeam, isAdmin, timeFilter, fromDate, toDate]);

  const handleCardClick = (filter) => {
    router.push(`/dashboard/accounts-dashboard/customers?filter=${filter}`);
  };

  const handleAgeingClick = (bucket) => {
    router.push(`/dashboard/accounts-dashboard/ageing-report?bucket=${encodeURIComponent(bucket)}&fromDate=${fromDate}&toDate=${toDate}`);
  };

  const handleCustomerClick = (customerId) => {
    router.push(`/dashboard/billing-mgmt/${customerId}`);
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

  const { summary, customers, trends, acp, outstanding, ageing, newUsers } = dashboardData || {};

  // Filter customers based on search
  const filteredCustomers = (customers || []).filter(customer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.companyName?.toLowerCase().includes(search) ||
      customer.mobileNo?.toLowerCase().includes(search) ||
      customer.emailId?.toLowerCase().includes(search)
    );
  }).slice(0, 15);

  return (
    <div className="p-4 md:p-8 bg-gray-50/80 dark:bg-background min-h-screen space-y-6 md:space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-1.5 bg-orange-500 rounded-full" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-0.5 tracking-wide">Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Accounts Overview
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Track billing progress and collection efficiency</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex items-center bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm">
            {[
              { value: 'last7days', label: 'Last 7 Days' },
              { value: 'lastMonth', label: 'Last Month' },
              { value: 'lastYear', label: 'Last Year' },
              { value: 'alltime', label: 'All Time' },
              { value: 'custom', label: 'Custom' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  selectedPeriod === opt.value
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
          <Button onClick={fetchDashboard} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Top Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5">
        {[
          { label: 'Total Users', value: summary?.totalUsers || 0, icon: Users, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400', filter: 'all' },
          { label: 'Active Users', value: summary?.activeUsers || 0, icon: UserCheck, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400', filter: 'active' },
          { label: 'Deactivated Users', value: summary?.deactivatedUsers || 0, icon: UserX, borderColor: 'border-l-slate-500', iconBg: 'bg-slate-100 dark:bg-slate-800', iconText: 'text-slate-600 dark:text-slate-400', filter: 'deactivated' },
        ].map((stat, i) => (
          <Card
            key={i}
            className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group`}
            onClick={() => handleCardClick(stat.filter)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-bold mt-0.5 md:mt-1 tracking-tight">{(stat.value || 0).toLocaleString()}</p>
                </div>
                <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconText}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Total Outstanding Snapshot ── */}
      <Card className="bg-white dark:bg-card border-2 border-orange-200 dark:border-orange-900 rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {/* Date Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full sm:w-36 h-9"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full sm:w-36 h-9"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <Button
              onClick={(e) => { e.stopPropagation(); fetchDashboard(); }}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white self-start sm:self-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>

          {/* Outstanding Data - Clickable */}
          <div
            className="flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push(`/dashboard/accounts-dashboard/outstanding-report?fromDate=${fromDate}&toDate=${toDate}`)}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <IndianRupee className="h-10 w-10 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Outstanding</p>
                <p className="text-2xl sm:text-4xl font-bold text-orange-600">{formatCurrency(outstanding?.totalOutstanding || 0)}</p>
                <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                  Click to view outstanding report <ChevronRight className="h-3 w-3" />
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
              <div>
                <p className="text-xs text-slate-500">Bills Generated</p>
                <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(outstanding?.totalBillGenerated || 0)}</p>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3 sm:pl-6">
                <p className="text-xs text-slate-500">Received</p>
                <p className="text-base sm:text-xl font-bold text-emerald-600">{formatCurrency(outstanding?.totalReceived || 0)}</p>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3 sm:pl-6">
                <p className="text-xs text-slate-500">Collection Rate</p>
                <p className="text-base sm:text-xl font-bold text-blue-600">
                  {outstanding?.totalBillGenerated > 0
                    ? Math.round((outstanding.totalReceived / outstanding.totalBillGenerated) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── Sales & Collection Trends ── */}
      <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
            <div className="h-5 w-1 bg-orange-500 rounded-full" />
            Sales & Collection Trends
          </CardTitle>
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly'].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={timeFilter === filter ? 'default' : 'outline'}
                onClick={() => setTimeFilter(filter)}
                className={`text-xs sm:text-sm ${timeFilter === filter ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-60 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₹${(value/100000).toFixed(0)}L`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="billsGenerated"
                  name="Bills Generated"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="amountCollected"
                  name="Amount Collected"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 2: ACP and Ageing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Average Collection Period */}
        <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
              <div className="h-5 w-1 bg-blue-500 rounded-full" />
              Average Collection Period (ACP)
            </CardTitle>
            <p className="text-sm text-slate-500">Average days to collect payment after bill generation</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={acp || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value} days`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} days`, 'Avg Collection Period']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDaysToCollect"
                    name="Days to Collect"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Average Summary */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-slate-500">Average Collection Period:</span>
              <span className="text-2xl font-bold text-blue-600">
                {(() => {
                  const validMonths = (acp || []).filter(m => m.avgDaysToCollect > 0);
                  if (validMonths.length === 0) return '0';
                  const totalDays = validMonths.reduce((sum, m) => sum + m.avgDaysToCollect, 0);
                  return Math.round(totalDays / validMonths.length);
                })()}
              </span>
              <span className="text-lg font-medium text-slate-600">days</span>
            </div>
          </CardContent>
        </Card>

        {/* Ageing Report */}
        <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
              <div className="h-5 w-1 bg-red-500 rounded-full" />
              Receivables Ageing
            </CardTitle>
            <p className="text-sm text-slate-500">Outstanding amounts by age bucket</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageing || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="bucket" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar
                    dataKey="amount"
                    name="Outstanding"
                    radius={[0, 4, 4, 0]}
                  >
                    {(ageing || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={AGEING_COLORS[entry.bucket] || '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Ageing Buckets - Clickable */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {(ageing || []).map((bucket) => (
                <div
                  key={bucket.bucket}
                  onClick={() => handleAgeingClick(bucket.bucket)}
                  className="p-3 rounded-lg cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: `${AGEING_COLORS[bucket.bucket]}15` }}
                >
                  <p className="text-xs font-medium" style={{ color: AGEING_COLORS[bucket.bucket] }}>
                    {bucket.bucket} Days
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className="text-xs text-slate-500">{bucket.count} invoices</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Users Added Per Month */}
      <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
            <div className="h-5 w-1 bg-emerald-500 rounded-full" />
            New Users Added
          </CardTitle>
          <p className="text-sm text-slate-500">Customer acquisition over the last 12 months</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newUsers?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} users`, 'New Users']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar
                  dataKey="count"
                  name="New Users"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-slate-500">Total New Users (Last 12 Months):</span>
            <span className="text-2xl font-bold text-emerald-600">{newUsers?.total || 0}</span>
          </div>
        </CardContent>
      </Card>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── Quick Reports Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-1 bg-orange-500 rounded-full" />
          <h2 className="text-sm md:text-base font-bold text-foreground">Quick Reports</h2>
          <span className="text-xs text-muted-foreground ml-1">Access detailed reports with one click</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Outstanding Report', desc: 'Unpaid & partial invoices', icon: AlertTriangle, color: 'orange', link: `/dashboard/accounts-dashboard/outstanding-report?fromDate=${fromDate}&toDate=${toDate}` },
            { label: 'Daily Collection', desc: 'Payment transactions', icon: Receipt, color: 'emerald', link: '/dashboard/accounts-dashboard/daily-collection' },
            { label: 'Invoice Report', desc: 'All invoices generated', icon: FileText, color: 'blue', link: '/dashboard/accounts-dashboard/invoice-report' },
            { label: 'Credit Note Report', desc: 'All credit notes issued', icon: Receipt, color: 'purple', link: '/dashboard/accounts-dashboard/credit-note-report' },
            { label: 'Tax Report (TDS)', desc: 'TDS deductions summary', icon: IndianRupee, color: 'amber', link: '/dashboard/accounts-dashboard/tax-report' },
            { label: 'Ageing Report', desc: 'Outstanding by age', icon: Clock, color: 'red', link: `/dashboard/accounts-dashboard/ageing-report?fromDate=${fromDate}&toDate=${toDate}` },
            { label: 'Business Impact', desc: 'Revenue from upgrades/downgrades', icon: TrendingDown, color: 'teal', link: '/dashboard/accounts-dashboard/business-impact' },
          ].map((report, i) => {
            const colorMap = {
              orange: { border: 'border-orange-200 dark:border-orange-800', bg: 'bg-orange-50 dark:bg-orange-950/30', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600', chevron: 'text-orange-400' },
              emerald: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconText: 'text-emerald-600', chevron: 'text-emerald-400' },
              blue: { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-950/30', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconText: 'text-blue-600', chevron: 'text-blue-400' },
              purple: { border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-950/30', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconText: 'text-purple-600', chevron: 'text-purple-400' },
              amber: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/30', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconText: 'text-amber-600', chevron: 'text-amber-400' },
              red: { border: 'border-red-200 dark:border-red-800', bg: 'bg-red-50 dark:bg-red-950/30', iconBg: 'bg-red-100 dark:bg-red-900/40', iconText: 'text-red-600', chevron: 'text-red-400' },
              teal: { border: 'border-teal-200 dark:border-teal-800', bg: 'bg-teal-50 dark:bg-teal-950/30', iconBg: 'bg-teal-100 dark:bg-teal-900/40', iconText: 'text-teal-600', chevron: 'text-teal-400' },
            };
            const c = colorMap[report.color];
            const Icon = report.icon;
            return (
              <div
                key={i}
                onClick={() => router.push(report.link)}
                className={`p-4 rounded-xl border-2 ${c.border} ${c.bg} hover:shadow-md cursor-pointer transition-all group`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 ${c.iconBg} rounded-lg transition-colors`}>
                    <Icon className={`h-5 w-5 ${c.iconText}`} />
                  </div>
                  <ChevronRight className={`h-4 w-4 ${c.chevron} ml-auto`} />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{report.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{report.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── Customer Billing Table ── */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-1 bg-orange-500 rounded-full" />
        <h2 className="text-sm md:text-base font-bold text-foreground">Customer Billing</h2>
      </div>

      {/* Mobile Card View */}
          <div className="lg:hidden space-y-3 p-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleCustomerClick(customer.id)}
                className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{customer.companyName}</p>
                    {customer.isActive && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 shrink-0">Active</Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{customer.userName}</span>
                    <span className="text-slate-500">{formatDate(customer.customerCreatedAt)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-blue-500">ARC</p>
                      <p className="text-xs font-bold text-blue-700">{formatCurrency(customer.arc)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-emerald-500">Received</p>
                      <p className="text-xs font-bold text-emerald-700">{formatCurrency(customer.totalReceived)}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-orange-500">Due</p>
                      <p className={`text-xs font-bold ${customer.outstanding > 0 ? 'text-orange-700' : 'text-slate-400'}`}>
                        {customer.outstanding > 0 ? formatCurrency(customer.outstanding) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No customers found matching your search.
              </div>
            )}
            {customers?.length > 15 && (
              <div className="text-center py-3">
                <Button variant="link" onClick={() => handleCardClick('all')} className="text-orange-600 text-sm">
                  View all {customers.length} customers
                </Button>
              </div>
            )}
          </div>

      {/* Desktop Table View */}
      <DataTable
            columns={[
              {
                key: 'companyName',
                label: 'Company Name',
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
                render: (row) => formatDate(row.customerCreatedAt),
              },
              {
                key: 'arc',
                label: 'ARC',
                cellClassName: 'text-right',
                render: (row) => <span className="font-medium text-blue-600">{formatCurrency(row.arc)}</span>,
              },
              {
                key: 'totalBillGenerated',
                label: 'Bill Generated',
                cellClassName: 'text-right',
                render: (row) => <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(row.totalBillGenerated)}</span>,
              },
              {
                key: 'totalReceived',
                label: 'Received',
                cellClassName: 'text-right',
                render: (row) => <span className="font-medium text-emerald-600">{formatCurrency(row.totalReceived)}</span>,
              },
              {
                key: 'outstanding',
                label: 'Outstanding',
                cellClassName: 'text-right',
                render: (row) => (
                  <span className={`font-bold ${row.outstanding > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {row.outstanding > 0 ? formatCurrency(row.outstanding) : '-'}
                  </span>
                ),
              },
            ]}
            data={filteredCustomers}
            onRowClick={(row) => handleCustomerClick(row.id)}
            pagination={true}
            defaultPageSize={10}
            emptyMessage="No customers found matching your search."
            emptyIcon={Users}
            className="hidden lg:block"
            headerExtra={
              customers?.length > 15 && (
                <Button variant="link" onClick={() => handleCardClick('all')} className="text-orange-600">
                  View all {customers.length} customers
                </Button>
              )
            }
      />
    </div>
  );
}
