'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useLeadStore } from '@/lib/store';
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
  CalendarCheck,
  CalendarRange,
  DollarSign,
  AlertTriangle,
  Building2,
  MapPin,
  ArrowRight,
  LogIn,
  Receipt,
  Wrench,
  UserCheck,
  Banknote,
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
  const [period, setPeriod] = useState('mtd');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [bdmUser, setBdmUser] = useState(null);
  const [bdmMeetings, setBdmMeetings] = useState([]);
  const [bdmMeetingStats, setBdmMeetingStats] = useState({ upcoming: 0, today: 0 });
  const [dashboardData, setDashboardData] = useState(null);

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER' || user?.role === 'BDM_TEAM_LEADER';

  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, router, isAllowed]);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      let extraParams = '';
      if (period === 'custom' && fromDate && toDate) {
        extraParams = `&fromDate=${fromDate}&toDate=${toDate}`;
      }

      const [userRes, statsRes, meetingsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/leads/bdm/dashboard-stats?userId=${userId}&period=${period}${extraParams}`),
        api.get(`/leads/bdm/meetings?userId=${userId}`).catch(() => ({ data: { meetings: [] } }))
      ]);

      setBdmUser(userRes.data.user);
      setDashboardData(statsRes.data);

      const meetings = meetingsRes.data?.meetings || [];
      setBdmMeetings(meetings);

      // Calculate meeting stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      let upcoming = 0, today = 0;
      meetings.forEach(m => {
        const mDate = new Date(m.meetingDate);
        if (mDate >= todayStart) upcoming++;
        if (mDate >= todayStart && mDate < tomorrowStart) today++;
      });
      setBdmMeetingStats({ upcoming, today });
    } catch (error) {
      console.error('Error fetching BDM dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, period, fromDate, toDate]);

  useEffect(() => {
    if (isAllowed && userId) {
      fetchData();
    }
  }, [user, userId, fetchData, isAllowed]);

  if (!user || !isAllowed) {
    return null;
  }

  const stats = dashboardData?.summary || {};
  const todayStats = dashboardData?.todayStats || {};
  const followUpSchedule = dashboardData?.followUpSchedule || { overdue: 0, upcoming: [] };
  const dashStats = dashboardData?.dashboardStats || {};

  // Status distribution for pie chart
  const statusData = [
    { name: 'New', value: stats.newLeads || 0, color: '#3b82f6' },
    { name: 'Qualified', value: stats.qualified || 0, color: '#10b981' },
    { name: 'Feasible', value: stats.feasible || 0, color: '#14b8a6' },
    { name: 'Not Feasible', value: stats.notFeasible || 0, color: '#f97316' },
    { name: 'Follow Up', value: stats.followUp || 0, color: '#f59e0b' },
    { name: 'Dropped', value: stats.dropped || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Format currency for stat cards
  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (!num || isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin-dashboards/bdm')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-0.5 tracking-wide">Dashboard</p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {bdmUser?.name ? `${bdmUser.name.split(' ')[0]}'s Dashboard` : 'BDM Dashboard'}
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Viewing team member&apos;s performance</p>
          </div>
        </div>

        {/* Mobile: dropdown select */}
        <select
          value={period}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setShowCustomDatePicker(true);
              setPeriod('custom');
            } else {
              setPeriod(e.target.value);
              setShowCustomDatePicker(false);
            }
          }}
          className="md:hidden bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {[
            { value: 'mtd', label: 'MTD' },
            { value: 'ytd', label: 'YTD' },
            { value: 'allTime', label: 'All Time' },
            { value: 'custom', label: 'Custom' },
          ].map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Desktop: button group */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm">
            {[
              { value: 'mtd', label: 'MTD' },
              { value: 'ytd', label: 'YTD' },
              { value: 'allTime', label: 'All Time' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setPeriod(opt.value);
                  setShowCustomDatePicker(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  period === opt.value && !showCustomDatePicker
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
                if (!showCustomDatePicker) setPeriod('custom');
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${
                showCustomDatePicker || period === 'custom'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <CalendarRange size={14} />
              Custom
            </button>
          </div>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline Stats (Row 1) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: `Login (${dashStats.loginCount || 0})`, value: formatCurrency(dashStats.loginAmount), icon: LogIn, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-950/40', iconText: 'text-cyan-600 dark:text-cyan-400', stage: 'login' },
          { label: `PO Received (${dashStats.poReceivedCount || 0})`, value: formatCurrency(dashStats.poReceivedAmount), icon: Receipt, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400', stage: 'po' },
          { label: `Installation Done (${dashStats.installDoneCount || 0})`, value: formatCurrency(dashStats.installDoneAmount), icon: Wrench, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-950/40', iconText: 'text-amber-600 dark:text-amber-400', stage: 'install' },
          { label: `Customer Accept (${dashStats.custAcceptCount || 0})`, value: formatCurrency(dashStats.custAcceptAmount), icon: UserCheck, borderColor: 'border-l-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400', stage: 'accept' },
          { label: `FTB Received (${dashStats.ftbCount || 0})`, value: formatCurrency(dashStats.ftbAmount), icon: Banknote, borderColor: 'border-l-green-500', iconBg: 'bg-green-100 dark:bg-green-950/40', iconText: 'text-green-600 dark:text-green-400', stage: 'ftb' },
        ].map((stat, i) => (
          <Card
            key={i}
            className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group`}
            onClick={() => router.push(`/dashboard/pipeline-arc?stage=${stat.stage}&userId=${userId}`)}
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

      {/* ── Other Stats (Row 2) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
        {[
          { label: 'Total Leads', value: dashStats.totalLeads || 0, icon: Users, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
          { label: 'Meetings Done', value: dashStats.meetingsDone || 0, icon: CalendarCheck, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconText: 'text-cyan-600 dark:text-cyan-400' },
          { label: 'Funnel Value', value: formatCurrency(dashStats.totalFunnelValue), icon: DollarSign, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: 'UPCOMING MEETINGS', value: bdmMeetingStats?.upcoming || 0, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'FEASIBLE', value: todayStats.feasible || 0, color: 'text-orange-600 dark:text-orange-400' },
            { label: 'FOLLOW UP', value: todayStats.followUp || 0, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'DROPPED', value: todayStats.dropped || 0, color: 'text-red-600 dark:text-red-400' },
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
            {bdmMeetingStats?.today > 0 && (
              <Badge className="ml-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                {bdmMeetingStats.today} Today
              </Badge>
            )}
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
            {followUpSchedule.overdue > 0 && (
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
                  {followUpSchedule.upcoming?.map((item, index) => (
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

    </div>
  );
}
