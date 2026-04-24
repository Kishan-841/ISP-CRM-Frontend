'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Calendar,
  Send,
  FileCheck,
  Package,
  Truck,
  AlertTriangle,
  Zap,
  LogIn,
  Receipt,
  Wrench,
  UserCheck,
  Banknote,
  CalendarCheck,
  Building2,
  MapPin,
  ArrowRight
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCompactCurrency } from '@/lib/formatters';

export default function BDMOverallDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('alltime');
  const [bdmList, setBdmList] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [meetingStats, setMeetingStats] = useState({ upcoming: 0, today: 0 });
  const [aggregatedData, setAggregatedData] = useState({
    summary: {
      totalLeads: 0,
      meetingsDone: 0,
      funnelValue: 0,
      quotationSent: 0,
      quotationValue: 0,
      poReceived: 0,
      poValue: 0,
      pendingInstall: 0,
      pendingInstallValue: 0,
      delivered: 0,
      deliveredValue: 0,
      newLeads: 0,
      qualified: 0,
      feasible: 0,
      notFeasible: 0,
      followUp: 0,
      dropped: 0
    },
    pipelineStats: {
      loginCount: 0,
      loginAmount: 0,
      poReceivedCount: 0,
      poReceivedAmount: 0,
      installDoneCount: 0,
      installDoneAmount: 0,
      custAcceptCount: 0,
      custAcceptAmount: 0,
      ftbCount: 0,
      ftbAmount: 0,
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

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'SALES_DIRECTOR' || user?.role === 'MASTER' || user?.role === 'BDM_TEAM_LEADER';

  // Check authorization
  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, router, isAllowed]);

  // Fetch all BDM data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get BDM users - API already filters for active users only
      const usersRes = await api.get('/users/by-role?role=BDM');
      const bdmUsers = (usersRes.data.users || []).filter(u => u.role === 'BDM');
      setBdmList(bdmUsers);

      // Map period to API format. 'alltime' omits the period param entirely —
      // the backend returns unbounded stats when no period is supplied.
      const periodMap = {
        '7days': 'last7days',
        'month': 'lastMonth',
        'year': 'lastYear',
        'alltime': null,
      };
      const apiPeriod = dateRange in periodMap ? periodMap[dateRange] : 'last7days';
      const periodQuery = apiPeriod ? `&period=${apiPeriod}` : '';

      // Fetch BDM dashboard stats for each BDM using the correct endpoint
      const dashboardPromises = bdmUsers.map(bdm =>
        api.get(`/leads/bdm/dashboard-stats?userId=${bdm.id}${periodQuery}`).catch(() => ({ data: null }))
      );

      const dashboardResults = await Promise.all(dashboardPromises);

      // Fetch meetings for all BDMs
      const meetingPromises = bdmUsers.map(bdm =>
        api.get(`/leads/bdm/meetings?userId=${bdm.id}`).catch(() => ({ data: null }))
      );
      const meetingResults = await Promise.all(meetingPromises);

      // Combine all meetings and sort by date
      const combinedMeetings = [];
      let upcomingCount = 0;
      let todayCount = 0;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      meetingResults.forEach(result => {
        if (result.data) {
          const meetings = Array.isArray(result.data) ? result.data : (result.data.meetings || []);
          meetings.forEach(m => {
            combinedMeetings.push(m);
            const mDate = new Date(m.meetingDate);
            if (mDate >= todayStart) upcomingCount++;
            if (mDate >= todayStart && mDate < tomorrowStart) todayCount++;
          });
        }
      });

      combinedMeetings.sort((a, b) => new Date(a.meetingDate) - new Date(b.meetingDate));
      setAllMeetings(combinedMeetings);
      setMeetingStats({ upcoming: upcomingCount, today: todayCount });

      // Aggregate data from all BDMs
      const aggregated = {
        summary: {
          totalLeads: 0,
          meetingsDone: 0,
          funnelValue: 0,
          quotationSent: 0,
          quotationValue: 0,
          poReceived: 0,
          poValue: 0,
          pendingInstall: 0,
          pendingInstallValue: 0,
          delivered: 0,
          deliveredValue: 0,
          newLeads: 0,
          qualified: 0,
          feasible: 0,
          notFeasible: 0,
          followUp: 0,
          dropped: 0
        },
        pipelineStats: {
          loginCount: 0,
          loginAmount: 0,
          poReceivedCount: 0,
          poReceivedAmount: 0,
          installDoneCount: 0,
          installDoneAmount: 0,
          custAcceptCount: 0,
          custAcceptAmount: 0,
          ftbCount: 0,
          ftbAmount: 0,
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
      };

      dashboardResults.forEach(result => {
        if (result.data) {
          const data = result.data;
          const summary = data.summary || {};
          const dashboardStats = data.dashboardStats || {};
          const todayStats = data.todayStats || {};
          const followUpSchedule = data.followUpSchedule || {};

          // Aggregate summary stats from both summary and dashboardStats
          aggregated.summary.totalLeads += summary.totalLeads || dashboardStats.totalLeads || 0;
          aggregated.summary.meetingsDone += dashboardStats.meetingsDone || 0;
          aggregated.summary.funnelValue += dashboardStats.totalFunnelValue || 0;
          aggregated.summary.quotationSent += dashboardStats.quotationCount || summary.quotationsSent || 0;
          aggregated.summary.quotationValue += dashboardStats.totalQuotationAmount || 0;
          aggregated.summary.poReceived += dashboardStats.poReceived || 0;
          aggregated.summary.poValue += dashboardStats.totalPOAmount || 0;
          aggregated.summary.pendingInstall += dashboardStats.pendingInstallation || 0;
          aggregated.summary.pendingInstallValue += dashboardStats.pendingInstallationAmount || 0;
          aggregated.summary.delivered += dashboardStats.totalDelivered || 0;
          aggregated.summary.deliveredValue += dashboardStats.totalDeliveredAmount || 0;
          aggregated.summary.newLeads += summary.newLeads || 0;
          aggregated.summary.qualified += summary.qualified || 0;
          aggregated.summary.feasible += summary.feasible || 0;
          aggregated.summary.notFeasible += summary.notFeasible || 0;
          aggregated.summary.followUp += summary.followUp || 0;
          aggregated.summary.dropped += summary.dropped || 0;

          // Aggregate pipeline stats
          aggregated.pipelineStats.loginCount += dashboardStats.loginCount || 0;
          aggregated.pipelineStats.loginAmount += dashboardStats.loginAmount || 0;
          aggregated.pipelineStats.poReceivedCount += dashboardStats.poReceivedCount || dashboardStats.poReceived || 0;
          aggregated.pipelineStats.poReceivedAmount += dashboardStats.poReceivedAmount || dashboardStats.totalPOAmount || 0;
          aggregated.pipelineStats.installDoneCount += dashboardStats.installDoneCount || 0;
          aggregated.pipelineStats.installDoneAmount += dashboardStats.installDoneAmount || 0;
          aggregated.pipelineStats.custAcceptCount += dashboardStats.custAcceptCount || 0;
          aggregated.pipelineStats.custAcceptAmount += dashboardStats.custAcceptAmount || 0;
          aggregated.pipelineStats.ftbCount += dashboardStats.ftbCount || 0;
          aggregated.pipelineStats.ftbAmount += dashboardStats.ftbAmount || 0;

          // Aggregate today stats
          aggregated.todayStats.dispositions += todayStats.dispositions || 0;
          aggregated.todayStats.qualified += todayStats.qualified || 0;
          aggregated.todayStats.feasible += todayStats.feasible || 0;
          aggregated.todayStats.followUp += todayStats.followUp || 0;
          aggregated.todayStats.dropped += todayStats.dropped || 0;

          // Aggregate follow-up schedule
          aggregated.followUpSchedule.overdue += followUpSchedule.overdue || 0;
        }
      });

      // Aggregate upcoming follow-up schedule from all BDMs
      const upcomingByDay = {};
      dashboardResults.forEach(result => {
        if (result.data?.followUpSchedule?.upcoming) {
          result.data.followUpSchedule.upcoming.forEach(item => {
            const dayKey = item.day;
            if (!upcomingByDay[dayKey]) {
              upcomingByDay[dayKey] = { day: dayKey, count: 0 };
            }
            upcomingByDay[dayKey].count += item.count || 0;
          });
        }
      });

      // If no data, generate default days
      if (Object.keys(upcomingByDay).length === 0) {
        const days = ['Today', 'Tomorrow'];
        for (let i = 2; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          days.push(date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
        }
        days.forEach(day => {
          upcomingByDay[day] = { day, count: 0 };
        });
      }
      aggregated.followUpSchedule.upcoming = Object.values(upcomingByDay);

      setAggregatedData(aggregated);
    } catch (error) {
      console.error('Error fetching BDM dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (isAllowed) {
      fetchData();
    }
  }, [user, fetchData, isAllowed]);

  if (!user || !isAllowed) {
    return null;
  }

  const { summary, pipelineStats, todayStats, followUpSchedule } = aggregatedData;

  // Format currency for stat cards
  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (!num || isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Status distribution for pie chart
  const statusData = [
    { name: 'New', value: summary.newLeads || 0, color: '#3b82f6' },
    { name: 'Qualified', value: summary.qualified || 0, color: '#10b981' },
    { name: 'Feasible', value: summary.feasible || 0, color: '#f97316' },
    { name: 'Not Feasible', value: summary.notFeasible || 0, color: '#ffffff' },
    { name: 'Follow Up', value: summary.followUp || 0, color: '#f59e0b' },
    { name: 'Dropped', value: summary.dropped || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin-dashboards')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BDM Team Dashboard</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm ml-[18px]">Overall performance overview • {bdmList.length} BDMs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            {[
              { value: '7days', label: 'Last 7 Days' },
              { value: 'month', label: 'Last Month' },
              { value: 'year', label: 'Last Year' },
              { value: 'alltime', label: 'All Time' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                  dateRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : (
        <>
          {/* ── Pipeline Stats (Row 1) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {[
              { label: `Login (${pipelineStats.loginCount || 0})`, value: formatCurrency(pipelineStats.loginAmount), icon: LogIn, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-950/40', iconText: 'text-cyan-600 dark:text-cyan-400', stage: 'login' },
              { label: `PO Received (${pipelineStats.poReceivedCount || 0})`, value: formatCurrency(pipelineStats.poReceivedAmount), icon: Receipt, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400', stage: 'po' },
              { label: `Installation Done (${pipelineStats.installDoneCount || 0})`, value: formatCurrency(pipelineStats.installDoneAmount), icon: Wrench, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-950/40', iconText: 'text-amber-600 dark:text-amber-400', stage: 'install' },
              { label: `Customer Accept (${pipelineStats.custAcceptCount || 0})`, value: formatCurrency(pipelineStats.custAcceptAmount), icon: UserCheck, borderColor: 'border-l-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400', stage: 'accept' },
              { label: `FTB Received (${pipelineStats.ftbCount || 0})`, value: formatCurrency(pipelineStats.ftbAmount), icon: Banknote, borderColor: 'border-l-green-500', iconBg: 'bg-green-100 dark:bg-green-950/40', iconText: 'text-green-600 dark:text-green-400', stage: 'ftb' },
            ].map((stat, i) => (
              <Card
                key={i}
                className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                onClick={() => router.push(`/dashboard/pipeline-arc?stage=${stat.stage}`)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-xl md:text-2xl font-bold mt-0.5 md:mt-1 tracking-tight">{stat.value}</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {[
              { label: 'Total Leads', value: summary.totalLeads || 0, icon: Users, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
              { label: 'Meetings Done', value: summary.meetingsDone || 0, icon: Calendar, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconText: 'text-cyan-600 dark:text-cyan-400' },
              { label: 'Funnel Value', value: formatCurrency(summary.funnelValue), icon: Send, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
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
              <h2 className="text-sm md:text-base font-bold text-foreground">Today&apos;s Activity (All BDMs)</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
              {[
                { label: 'UPCOMING MEETINGS', value: meetingStats?.upcoming || 0, color: 'text-blue-600 dark:text-blue-400' },
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

          {/* ── Upcoming Meetings (All BDMs) ── */}
          <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                <div className="h-5 w-1 bg-orange-500 rounded-full" />
                Upcoming Meetings (All BDMs)
                {meetingStats.today > 0 && (
                  <Badge className="ml-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                    {meetingStats.today} Today
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allMeetings && allMeetings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">BDM</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMeetings.slice(0, 10).map((meeting) => {
                        const meetingDate = new Date(meeting.meetingDate);
                        const nowDate = new Date();
                        const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
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
                              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{meeting.bdmName || meeting.assignedTo?.name || '-'}</span>
                            </td>
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Status Distribution Pie Chart */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Lead Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
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
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => <span className="text-slate-600 dark:text-slate-300 text-xs">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    No leads yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Follow-up Schedule */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={18} className="text-orange-600 dark:text-orange-400" />
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
                            index !== followUpSchedule.upcoming.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
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
