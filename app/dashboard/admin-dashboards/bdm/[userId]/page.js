'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  Users,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Calendar,
  CalendarCheck,
  CalendarRange,
  Send,
  Receipt,
  FileCheck,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  Zap,
  Building2,
  MapPin,
  ArrowRight
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function IndividualBDMDashboard() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [bdmUser, setBdmUser] = useState(null);
  const [bdmMeetings, setBdmMeetings] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalLeads: 0,
      newLeads: 0,
      qualified: 0,
      feasible: 0,
      notFeasible: 0,
      followUp: 0,
      dropped: 0
    },
    dashboardStats: {
      totalLeads: 0,
      meetingsDone: 0,
      totalFunnelValue: 0,
      quotationCount: 0,
      totalQuotationAmount: 0,
      poReceived: 0,
      totalPOAmount: 0,
      pendingInstallation: 0,
      pendingInstallationAmount: 0,
      totalDelivered: 0,
      totalDeliveredAmount: 0
    },
    todayStats: {
      dispositions: 0,
      qualified: 0,
      feasible: 0,
      followUp: 0,
      dropped: 0
    },
    followUpSchedule: {
      overdue: 0,
      upcoming: []
    }
  });

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'BDM_TEAM_LEADER';

  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, router, isAllowed]);

  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (!num || isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const periodMap = {
        '7days': 'last7days',
        'month': 'lastMonth',
        'year': 'lastYear'
      };
      let apiPeriod = periodMap[dateRange] || 'last7days';
      let extraParams = '';
      if (dateRange === 'custom' && customFromDate && customToDate) {
        apiPeriod = 'custom';
        extraParams = `&fromDate=${customFromDate}&toDate=${customToDate}`;
      }

      const [userRes, statsRes, meetingsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/leads/bdm/dashboard-stats?userId=${userId}&period=${apiPeriod}${extraParams}`),
        api.get(`/leads/bdm/meetings?userId=${userId}`).catch(() => ({ data: { meetings: [] } }))
      ]);

      setBdmUser(userRes.data.user);
      setDashboardData(statsRes.data);
      setBdmMeetings(meetingsRes.data?.meetings || []);
    } catch (error) {
      console.error('Error fetching BDM dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateRange, customFromDate, customToDate]);

  useEffect(() => {
    if (isAllowed && userId) {
      fetchData();
    }
  }, [user, userId, fetchData, isAllowed]);

  if (!user || !isAllowed) {
    return null;
  }

  const { summary, dashboardStats, todayStats, followUpSchedule } = dashboardData;

  // Status distribution for pie chart
  const statusData = [
    { name: 'New', value: summary?.newLeads || 0, color: '#3b82f6' },
    { name: 'Qualified', value: summary?.qualified || 0, color: '#10b981' },
    { name: 'Feasible', value: summary?.feasible || 0, color: '#14b8a6' },
    { name: 'Not Feasible', value: summary?.notFeasible || 0, color: '#f97316' },
    { name: 'Follow Up', value: summary?.followUp || 0, color: '#f59e0b' },
    { name: 'Dropped', value: summary?.dropped || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin-dashboards')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-0.5 tracking-wide">Dashboard</p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Welcome back, {bdmUser?.name?.split(' ')[0] || 'BDM'}
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Here&apos;s your performance overview</p>
          </div>
        </div>

        {/* Mobile: dropdown select */}
        <select
          value={dateRange}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setShowCustomDatePicker(true);
              setDateRange('custom');
            } else {
              setDateRange(e.target.value);
              setShowCustomDatePicker(false);
            }
          }}
          className="md:hidden bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {[
            { value: '7days', label: 'Last 7 Days' },
            { value: 'month', label: 'Last Month' },
            { value: 'year', label: 'Last Year' },
            { value: 'custom', label: 'Custom' },
          ].map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Desktop: button group */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm">
            {[
              { value: '7days', label: 'Last 7 Days' },
              { value: 'month', label: 'Last Month' },
              { value: 'year', label: 'Last Year' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setDateRange(opt.value);
                  setShowCustomDatePicker(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  dateRange === opt.value && !showCustomDatePicker
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => {
                setShowCustomDatePicker(!showCustomDatePicker);
                if (!showCustomDatePicker) setDateRange('custom');
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${
                showCustomDatePicker || dateRange === 'custom'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <CalendarRange size={14} />
              Custom
            </button>
          </div>

          {showCustomDatePicker && (
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          {/* ── Key Performance Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
            {[
              { label: 'Total Leads', value: dashboardStats?.totalLeads || summary?.totalLeads || 0, icon: Users, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
              { label: 'Meetings Done', value: dashboardStats?.meetingsDone || 0, icon: CalendarCheck, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconText: 'text-cyan-600 dark:text-cyan-400' },
              { label: 'Funnel Value', value: formatCurrency(dashboardStats?.totalFunnelValue), icon: DollarSign, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
              { label: `Quotation Sent (${dashboardStats?.quotationCount || 0})`, value: formatCurrency(dashboardStats?.totalQuotationAmount), icon: Send, borderColor: 'border-l-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400' },
              { label: `PO Received (${dashboardStats?.poReceived || 0})`, value: formatCurrency(dashboardStats?.totalPOAmount), icon: Receipt, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400' },
              { label: `Pending Install (${dashboardStats?.pendingInstallation || 0})`, value: formatCurrency(dashboardStats?.pendingInstallationAmount), icon: Package, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-950/40', iconText: 'text-amber-600 dark:text-amber-400' },
              { label: `Delivered (${dashboardStats?.totalDelivered || 0})`, value: formatCurrency(dashboardStats?.totalDeliveredAmount), icon: Truck, borderColor: 'border-l-teal-500', iconBg: 'bg-teal-100 dark:bg-teal-950/40', iconText: 'text-teal-600 dark:text-teal-400' },
            ].map((stat, i) => (
              <Card
                key={i}
                className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200`}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-xl md:text-2xl font-bold mt-0.5 md:mt-1 tracking-tight">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                    </div>
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconText}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <hr className="my-6 md:my-8 border-slate-200 dark:border-slate-800" />

          {/* ── Today's Activity Section ── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 bg-orange-500 rounded-full" />
              <h2 className="text-sm md:text-base font-bold text-foreground">Today&apos;s Activity</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
              {[
                { label: 'DISPOSITIONS', value: todayStats?.dispositions || 0, color: '' },
                { label: 'QUALIFIED', value: todayStats?.qualified || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'FEASIBLE', value: todayStats?.feasible || 0, color: 'text-orange-600 dark:text-orange-400' },
                { label: 'FOLLOW UP', value: todayStats?.followUp || 0, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'DROPPED', value: todayStats?.dropped || 0, color: 'text-red-600 dark:text-red-400' },
              ].map((item, i) => (
                <Card key={i} className="rounded-lg bg-white dark:bg-card border shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className={`text-xl md:text-2xl font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <hr className="my-6 md:my-8 border-slate-200 dark:border-slate-800" />

          {/* ── Upcoming Meetings ── */}
          <Card className="mb-6 bg-white dark:bg-card border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                <div className="h-5 w-1 bg-orange-500 rounded-full" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bdmMeetings && bdmMeetings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bdmMeetings.slice(0, 5).map((meeting) => {
                        const meetingDate = new Date(meeting.meetingDate);
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const isToday = meetingDate >= today && meetingDate < tomorrow;
                        const isPast = meetingDate < today;

                        return (
                          <tr
                            key={meeting.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{meeting.company}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-slate-600 dark:text-slate-400">{meeting.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm ${isToday ? 'font-semibold text-cyan-600 dark:text-cyan-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                {meetingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {meetingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                <MapPin size={12} className="text-slate-400" />
                                <span className="truncate max-w-[150px]">{meeting.meetingPlace || '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isPast ? (
                                <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Overdue</Badge>
                              ) : isToday ? (
                                <Badge className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">Today</Badge>
                              ) : (
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Upcoming</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CalendarCheck size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No scheduled meetings</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Meetings will appear here when scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts & Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Lead Status Distribution Pie Chart */}
            <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                  <div className="h-5 w-1 bg-orange-500 rounded-full" />
                  Lead Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="h-56 w-56 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            dataKey="value"
                            label={false}
                            labelLine={false}
                            strokeWidth={2}
                            stroke="#fff"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              borderRadius: '8px',
                            }}
                            itemStyle={{ color: '#e2e8f0' }}
                            formatter={(value, name) => [`${value} leads`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2.5 min-w-0">
                      {statusData.map((item, i) => {
                        const total = statusData.reduce((sum, d) => sum + d.value, 0);
                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">{item.name}</span>
                            <span className="text-sm font-bold text-foreground">{item.value}</span>
                            <span className="text-xs text-muted-foreground">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    No leads yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Follow-up Schedule */}
            <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                  <div className="h-5 w-1 bg-orange-500 rounded-full" />
                  Follow-up Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Overdue Alert */}
                {followUpSchedule?.overdue > 0 && (
                  <div className="mx-4 mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">Overdue</span>
                      </div>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">{followUpSchedule.overdue}</span>
                    </div>
                  </div>
                )}
                {/* 7-Day Schedule */}
                <div className="overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {followUpSchedule?.upcoming?.map((item, index) => (
                        <tr
                          key={index}
                          className={`${
                            index !== (followUpSchedule.upcoming?.length || 0) - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <span className={`text-sm ${
                              item.day === 'Today'
                                ? 'font-semibold text-orange-600 dark:text-orange-400'
                                : item.day === 'Tomorrow'
                                ? 'font-medium text-slate-700 dark:text-slate-300'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {item.day}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-medium ${
                              item.count > 0
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                            }`}>
                              {item.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
