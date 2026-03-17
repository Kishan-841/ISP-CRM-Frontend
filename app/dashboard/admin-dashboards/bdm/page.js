'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import api from '@/lib/api';
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
  Zap
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
  const [dateRange, setDateRange] = useState('7days');
  const [bdmList, setBdmList] = useState([]);
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

      // Map period to API format
      const periodMap = {
        '7days': 'last7days',
        'month': 'lastMonth',
        'year': 'lastYear'
      };
      const apiPeriod = periodMap[dateRange] || 'last7days';

      // Fetch BDM dashboard stats for each BDM using the correct endpoint
      const dashboardPromises = bdmUsers.map(bdm =>
        api.get(`/leads/bdm/dashboard-stats?userId=${bdm.id}&period=${apiPeriod}`).catch(() => ({ data: null }))
      );

      const dashboardResults = await Promise.all(dashboardPromises);

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

  const { summary, todayStats, followUpSchedule } = aggregatedData;

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
              { value: 'year', label: 'Last Year' }
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
          {/* Key Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard color="orange" icon={Users} label="Total Leads" value={summary.totalLeads || 0} />
            <StatCard color="teal" icon={Calendar} label="Meetings Done" value={summary.meetingsDone || 0} />
            <StatCard color="indigo" icon={Send} label="Funnel Value" value={formatCompactCurrency(summary.funnelValue || 0)} />
            <StatCard color="blue" icon={Send} label="Quotation Sent" value={formatCompactCurrency(summary.quotationValue || 0)} />
            <StatCard color="green" icon={FileCheck} label="PO Received" value={formatCompactCurrency(summary.poValue || 0)} />
            <StatCard color="orange" icon={Package} label="Pending Install" value={formatCompactCurrency(summary.pendingInstallValue || 0)} />
            <StatCard color="emerald" icon={Truck} label="Delivered" value={formatCompactCurrency(summary.deliveredValue || 0)} />
          </div>

          {/* Lead Status Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.newLeads || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">New</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.qualified || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Qualified</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.feasible || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Feasible</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.notFeasible || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Not Feasible</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.followUp || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Follow Up</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.dropped || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dropped</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Activity */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-orange-600 dark:text-orange-400" />
                Today's Activity (All BDMs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">DISPOSITIONS</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayStats.dispositions || 0}</p>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">QUALIFIED</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayStats.qualified || 0}</p>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">FEASIBLE</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayStats.feasible || 0}</p>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">FOLLOW UP</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todayStats.followUp || 0}</p>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">DROPPED</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{todayStats.dropped || 0}</p>
                </div>
              </div>
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
