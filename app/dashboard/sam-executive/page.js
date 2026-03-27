'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  Users,
  Calendar,
  Clock,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Loader2,
  Award,
  Activity,
  Mail,
  MailWarning,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RotateCw,
  XCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { formatCompactCurrency, formatDate } from '@/lib/formatters';

const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'custom', label: 'Custom' },
];

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function SAMExecutiveDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalAssignedCustomers: 0,
    pendingMomEmails: 0,
    meetingsThisWeek: 0,
    completedMeetings: 0,
    totalArc: 0,
    originalArc: 0,
    activeCustomers: 0,
    orderStats: {}
  });
  const [customers, setCustomers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'SAM_EXECUTIVE' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'all':
        return { startDate: null, endDate: null };
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        endDate = new Date(now);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        return { startDate: null, endDate: null };
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
    }

    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const dateParams = startDate && endDate ? `startDate=${startDate}&endDate=${endDate}` : '';
      const meetingsUrl = dateParams ? `/sam/meetings?${dateParams}` : '/sam/meetings';

      const [statsRes, customersRes, meetingsRes, ordersRes] = await Promise.all([
        api.get('/sam/executive/dashboard'),
        api.get('/sam/my-customers?limit=100'),
        api.get(meetingsUrl),
        api.get('/service-orders?limit=100'),
      ]);

      setStats(statsRes.data);
      setCustomers(customersRes.data.assignments || []);
      setMeetings(meetingsRes.data.meetings || []);
      setOrders(ordersRes.data.data?.orders || ordersRes.data.orders || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    if (user?.role === 'SAM_EXECUTIVE' || user?.role === 'MASTER') {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const getLocalDateKey = (dateString) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Meeting trend chart data
  const getMeetingChartData = () => {
    if (meetings.length === 0) return [];

    const { startDate, endDate } = getDateRange();
    const data = [];

    if (!startDate || !endDate) {
      const allDates = {};
      meetings.forEach(m => {
        const key = getLocalDateKey(m.meetingDate);
        if (!allDates[key]) allDates[key] = 0;
        allDates[key]++;
      });
      Object.entries(allDates).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, count]) => {
        data.push({
          name: new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          Meetings: count
        });
      });
      return data;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
      const weeks = {};
      meetings.forEach(m => {
        const date = new Date(m.meetingDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = getLocalDateKey(weekStart);
        if (!weeks[key]) weeks[key] = 0;
        weeks[key]++;
      });
      Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, count]) => {
        data.push({
          name: new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          Meetings: count
        });
      });
    } else {
      const days = {};
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days[getLocalDateKey(d)] = 0;
      }
      meetings.forEach(m => {
        const key = getLocalDateKey(m.meetingDate);
        if (days[key] !== undefined) days[key]++;
      });
      Object.entries(days).forEach(([date, count]) => {
        data.push({
          name: new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          Meetings: count
        });
      });
    }

    return data;
  };

  const MEETING_STATUS_LABELS = {
    'SCHEDULED': 'Scheduled',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'RESCHEDULED': 'Rescheduled'
  };

  const getMeetingStatusData = () => {
    const statusCounts = {};
    meetings.forEach(m => {
      const status = m.status || 'SCHEDULED';
      const label = MEETING_STATUS_LABELS[status] || status;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  };

  const getCustomerArcData = () => {
    return customers
      .filter(c => c.customer.arcAmount > 0)
      .sort((a, b) => (b.customer.arcAmount || 0) - (a.customer.arcAmount || 0))
      .slice(0, 10)
      .map(c => ({
        name: (c.customer.campaignData?.company || c.customer.customerUsername || '').substring(0, 15),
        ARC: c.customer.arcAmount || 0
      }));
  };

  const getOrderTypeData = () => {
    const types = { UPGRADE: 0, DOWNGRADE: 0, RATE_REVISION: 0, DISCONNECTION: 0 };
    orders.forEach(o => {
      if (types[o.orderType] !== undefined) types[o.orderType]++;
    });
    const labels = { UPGRADE: 'Upgrades', DOWNGRADE: 'Downgrades', RATE_REVISION: 'Rate Revision', DISCONNECTION: 'Disconnection' };
    return Object.entries(types)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: labels[key], value }));
  };

  const completedMeetingsInPeriod = meetings.filter(m => m.status === 'COMPLETED').length;
  const pendingMomInPeriod = meetings.filter(m => m.status === 'COMPLETED' && !m.momEmailSentAt).length;
  const scheduledMeetings = meetings.filter(m => m.status === 'SCHEDULED').length;
  const totalOrders = orders.length;
  const upgradeCount = orders.filter(o => o.orderType === 'UPGRADE').length;
  const downgradeCount = orders.filter(o => o.orderType === 'DOWNGRADE').length;
  const rateRevisionCount = orders.filter(o => o.orderType === 'RATE_REVISION').length;
  const disconnectionCount = orders.filter(o => o.orderType === 'DISCONNECTION').length;

  if (!user || user.role !== 'SAM_EXECUTIVE' && user.role !== 'MASTER') {
    return null;
  }

  const meetingChartData = getMeetingChartData();
  const meetingStatusData = getMeetingStatusData();
  const customerArcData = getCustomerArcData();
  const orderTypeData = getOrderTypeData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome, {user.name}!</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-[18px]">Your performance dashboard</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 overflow-x-auto">
            {DATE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                  dateFilter === f.value
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="shrink-0 ml-1"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-400 text-sm shrink-0">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard color="orange" icon={Users} label="Total Customers" value={stats.totalAssignedCustomers} />
        <StatCard color="blue" icon={Calendar} label="Meetings" value={meetings.length} />
        <StatCard color="emerald" icon={ClipboardList} label="Total Orders" value={totalOrders} />
        <StatCard color="indigo" icon={DollarSign} label="Original ARC" value={formatCompactCurrency(stats.originalArc)} />
        <StatCard color="teal" icon={DollarSign} label="Current ARC" value={formatCompactCurrency(stats.totalArc)} />
        <StatCard color="green" icon={ArrowUpRight} label="Upgrades" value={upgradeCount} />
        <StatCard color="orange" icon={ArrowDownRight} label="Downgrades" value={downgradeCount} />
        <StatCard color="cyan" icon={RotateCw} label="Rate Revisions" value={rateRevisionCount} />
        <StatCard color="red" icon={XCircle} label="Disconnections" value={disconnectionCount} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          onClick={() => router.push('/dashboard/sam-executive/customers')}
          className="h-12 bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Users className="w-5 h-5 mr-2" />
          My Customers
        </Button>
        <Button
          onClick={() => router.push('/dashboard/sam-executive/meetings')}
          className="h-12 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Meeting MOM
        </Button>
        <Button
          onClick={() => router.push('/dashboard/sam-executive/orders')}
          className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <ClipboardList className="w-5 h-5 mr-2" />
          Order Mgmt
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Trend */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Meeting Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={meetingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Meetings" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p>No meeting data for selected period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer ARC */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Customer ARC
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerArcData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={customerArcData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'ARC']} />
                  <Bar dataKey="ARC" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p>No ARC data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status + Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Order Breakdown Pie */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Order Breakdown
              <Badge variant="outline" className="ml-auto">{totalOrders}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={orderTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ value }) => `${value}`}
                    labelLine={false}
                  >
                    {orderTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#3b82f6', '#ef4444'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                <p className="text-sm">No orders yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Summary */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              Work Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Completed Meetings</span>
                  <span className="text-sm font-bold text-blue-600">{completedMeetingsInPeriod}/{meetings.length}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${meetings.length > 0 ? (completedMeetingsInPeriod / meetings.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Meetings This Week</span>
                  <span className="font-semibold text-blue-600">{stats.meetingsThisWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Upgrades</span>
                  <span className="font-semibold text-emerald-600">{upgradeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Downgrades</span>
                  <span className="font-semibold text-orange-600">{downgradeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Customers</span>
                  <span className="font-semibold text-orange-600">{stats.totalAssignedCustomers}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent MOMs */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Recent MOMs
              </CardTitle>
              {pendingMomInPeriod > 0 && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{pendingMomInPeriod} pending</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[280px] overflow-y-auto">
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No MOMs recorded</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {meetings.slice(0, 8).map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/sam-executive/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                          {meeting.customer?.campaignData?.company || meeting.title}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(meeting.meetingDate)}</p>
                      </div>
                      {meeting.momEmailSentAt ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shrink-0">
                          <Mail className="w-3 h-3 mr-1" />Sent
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 shrink-0">
                          <MailWarning className="w-3 h-3 mr-1" />Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {meetings.length > 8 && (
                  <div
                    className="p-3 text-center text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer transition-colors"
                    onClick={() => router.push('/dashboard/sam-executive/meetings')}
                  >
                    <span className="text-sm font-medium flex items-center justify-center gap-1">
                      View all {meetings.length} meetings
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
