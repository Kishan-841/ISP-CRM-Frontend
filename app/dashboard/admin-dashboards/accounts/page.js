'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import StatCard from '@/components/StatCard';
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  IndianRupee,
  TrendingUp,
  Loader2,
  RefreshCw,
  ChevronRight,
  LayoutDashboard,
  Clock,
  UserPlus,
  FileText
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';

export default function AccountsOverallDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalUsers: 0,
      activeUsers: 0,
      deactivatedUsers: 0
    },
    outstanding: {
      totalBillGenerated: 0,
      totalReceived: 0,
      totalOutstanding: 0
    },
    trends: [],
    acp: [],
    ageing: [],
    newUsers: { monthly: [], total: 0 }
  });

  // Check authorization
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'SALES_DIRECTOR' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/accounts-dashboard?timeFilter=${timeFilter}`);
      setDashboardData(res.data);
    } catch (error) {
      console.error('Error fetching accounts dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'SALES_DIRECTOR' || user?.role === 'MASTER') {
      fetchData();
    }
  }, [user, fetchData]);

  if (!user || user.role !== 'SUPER_ADMIN' && user.role !== 'SALES_DIRECTOR' && user.role !== 'MASTER') {
    return null;
  }

  const { summary, outstanding, trends } = dashboardData;

  // Map backend data to frontend expected format
  const acp = (dashboardData.acp || []).map(item => ({
    ...item,
    days: item.avgDaysToCollect || 0
  }));

  // Ageing data - backend returns flat array with 'bucket' field
  const ageingRaw = Array.isArray(dashboardData.ageing) ? dashboardData.ageing : [];
  const ageing = {
    buckets: ageingRaw.map(item => ({
      label: item.bucket,
      amount: item.amount || 0
    })),
    summary: ageingRaw.map(item => ({
      label: item.bucket,
      amount: item.amount || 0,
      count: item.count || 0
    }))
  };

  // New users - backend returns { monthly: [...], total }
  const newUsers = (dashboardData.newUsers?.monthly || dashboardData.newUsers || []);

  // Calculate collection rate
  const collectionRate = outstanding.totalBillGenerated > 0
    ? Math.round((outstanding.totalReceived / outstanding.totalBillGenerated) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/admin-dashboards')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <LayoutDashboard className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Accounts Dashboard
                </h1>
              </div>
              <p className="text-sm text-slate-500 ml-[18px]">
                Track billing progress and collection efficiency
              </p>
            </div>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard color="orange" icon={Users} label="Total Users" value={summary.totalUsers} />
            <StatCard color="emerald" icon={UserCheck} label="Active Users" value={summary.activeUsers} />
            <StatCard color="slate" icon={UserX} label="Deactivated Users" value={summary.deactivatedUsers} />
          </div>

          {/* Financial Summary Card with Orange Border */}
          <Card className="bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Total Outstanding */}
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <IndianRupee className="h-8 w-8 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Outstanding</p>
                    <p className="text-3xl font-bold text-orange-500">{formatCurrency(outstanding.totalOutstanding)}</p>
                    <p className="text-sm text-orange-400 flex items-center gap-1 cursor-pointer hover:underline">
                      Click to view outstanding report
                      <ChevronRight className="h-4 w-4" />
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-16 bg-slate-200 dark:bg-slate-700" />

                {/* Other Stats */}
                <div className="flex flex-wrap gap-8 lg:gap-12">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Bills Generated</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(outstanding.totalBillGenerated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Amount Received</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(outstanding.totalReceived)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Collection Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{collectionRate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales & Collection Trends Chart */}
          <Card className="bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Sales & Collection Trends
              </CardTitle>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {['daily', 'weekly', 'monthly'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors capitalize ${
                      timeFilter === filter
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {trends && trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <defs>
                        <linearGradient id="colorBills" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="billsGenerated"
                        name="Bills Generated"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#colorBills)"
                      />
                      <Area
                        type="monotone"
                        dataKey="amountCollected"
                        name="Amount Collected"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#colorCollected)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No trend data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ACP and Receivables Ageing Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Average Collection Period Chart */}
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Average Collection Period (ACP)
                </CardTitle>
                <p className="text-sm text-slate-500">Average days to collect payment after bill generation</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {acp && acp.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={acp}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `${v}d`}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} days`, 'ACP']}
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                          }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="days"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <div className="text-center">
                        <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No ACP data available</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">Average Collection Period: <span className="font-semibold text-blue-600">{acp && acp.length > 0 ? Math.round(acp.reduce((acc, item) => acc + (item.days || 0), 0) / acp.length) : 0} days</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Receivables Ageing Chart */}
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Receivables Ageing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  {ageing?.buckets && ageing.buckets.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageing.buckets} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                          width={60}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                          }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                          {ageing.buckets.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.label === '1-30' ? '#10b981' :
                                entry.label === '31-60' ? '#64748b' :
                                entry.label === '61-90' ? '#f59e0b' :
                                '#ef4444'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <div className="text-center">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No ageing data available</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Ageing Summary Cards */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { label: '1-30 Days', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', key: '1-30' },
                    { label: '31-60 Days', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', key: '31-60' },
                    { label: '61-90 Days', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: '61-90' },
                    { label: '90+ Days', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: '90+' }
                  ].map((bucket) => {
                    const data = ageing?.summary?.find(s => s.label === bucket.key) || { amount: 0, count: 0 };
                    return (
                      <div key={bucket.key} className={`p-2 rounded-lg ${bucket.color} text-center`}>
                        <p className="text-xs font-medium">{bucket.label}</p>
                        <p className="text-sm font-bold">{formatCurrency(data.amount)}</p>
                        <p className="text-xs">{data.count} invoices</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Users Added Chart */}
          <Card className="bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                New Users Added
              </CardTitle>
              <p className="text-sm text-slate-500">Customer acquisition over the last 12 months</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {newUsers && newUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={newUsers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} users`, 'New Users']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No new user data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
