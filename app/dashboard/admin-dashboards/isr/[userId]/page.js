'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import TabBar from '@/components/TabBar';
import api from '@/lib/api';
import {
  Phone,
  Users,
  ClipboardList,
  Clock,
  AlertCircle,
  Zap,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Calendar,
  AlertTriangle,
  Filter,
  TrendingUp
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
  Legend
} from 'recharts';

const getStatusColor = (status) => {
  const colors = {
    NEW: '#3b82f6',
    INTERESTED: '#10b981',
    NOT_INTERESTED: '#f43f5e',
    NOT_REACHABLE: '#f59e0b',
    WRONG_NUMBER: '#ef4444',
    CALL_LATER: '#f97316',
    RINGING_NOT_PICKED: '#6b7280'
  };
  return colors[status] || '#64748b';
};

export default function IndividualISRDashboard() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last7days');
  const [isrUser, setIsrUser] = useState(null);

  const [stats, setStats] = useState({
    totalAssigned: 0,
    workingData: 0,
    pendingData: 0,
    convertedToLead: 0
  });

  const [todayCallStats, setTodayCallStats] = useState({
    callsMade: 0,
    convertedToLead: 0,
    outcomes: {
      interested: 0,
      notInterested: 0,
      notReachable: 0,
      callLater: 0,
      wrongNumber: 0
    }
  });

  const [callStats, setCallStats] = useState({
    totalCalls: 0,
    todayCalls: 0,
    avgCallDuration: 0
  });

  const [statusDistribution, setStatusDistribution] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [followUpSchedule, setFollowUpSchedule] = useState({ overdue: 0, upcoming: [] });

  const [activeTab, setActiveTab] = useState('overview');
  const [funnelData, setFunnelData] = useState(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelPeriod, setFunnelPeriod] = useState('this_month');

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'SALES_DIRECTOR' || user?.role === 'MASTER' || user?.role === 'BDM_TEAM_LEADER';

  // Check authorization
  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, router, isAllowed]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Fetch ISR data
  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Fetch user info and dashboard stats
      const [userRes, statsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/users/${userId}/dashboard?period=${dateRange}`)
      ]);

      setIsrUser(userRes.data.user);

      const data = statsRes.data;

      // Set stats
      setStats({
        totalAssigned: data.stats?.totalAssigned || 0,
        workingData: data.stats?.workingData || 0,
        pendingData: data.stats?.pendingData || 0,
        convertedToLead: data.stats?.convertedToLead || 0
      });

      // Set today's call stats
      setTodayCallStats({
        callsMade: data.todayCallStats?.callsMade || 0,
        convertedToLead: data.todayCallStats?.convertedToLead || 0,
        outcomes: {
          interested: data.todayCallStats?.outcomes?.interested || 0,
          notInterested: data.todayCallStats?.outcomes?.notInterested || 0,
          notReachable: data.todayCallStats?.outcomes?.notReachable || 0,
          callLater: data.todayCallStats?.outcomes?.callLater || 0,
          wrongNumber: data.todayCallStats?.outcomes?.wrongNumber || 0
        }
      });

      // Set call stats
      setCallStats({
        totalCalls: data.callStats?.totalCalls || 0,
        todayCalls: data.callStats?.todayCalls || 0,
        avgCallDuration: data.callStats?.avgCallDuration || 0
      });

      // Set status distribution
      const statusData = (data.statusDistribution || [])
        .filter(item => item.status !== 'CALLED')
        .map(item => ({
          status: item.status,
          name: item.status.replace(/_/g, ' '),
          count: item.count,
          color: getStatusColor(item.status)
        }));
      setStatusDistribution(statusData);

      // Set weekly progress
      setWeeklyProgress(data.weeklyProgress || []);

      // Set follow-up schedule
      setFollowUpSchedule({
        overdue: data.followUpSchedule?.overdue || 0,
        upcoming: data.followUpSchedule?.upcoming || []
      });

    } catch (error) {
      console.error('Error fetching ISR dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateRange]);

  useEffect(() => {
    if (isAllowed && userId) {
      fetchData();
    }
  }, [user, userId, fetchData, isAllowed]);

  const fetchFunnelData = useCallback(async () => {
    if (!userId) return;
    setFunnelLoading(true);
    try {
      const res = await api.get(`/campaigns/reports/pipeline-funnel?userId=${userId}&period=${funnelPeriod}`);
      setFunnelData(res.data);
    } catch (error) {
      console.error('Error fetching pipeline funnel data:', error);
    } finally {
      setFunnelLoading(false);
    }
  }, [userId, funnelPeriod]);

  useEffect(() => {
    if (isAllowed && userId && activeTab === 'funnel') {
      fetchFunnelData();
    }
  }, [user, userId, activeTab, fetchFunnelData, isAllowed]);

  if (!user || !isAllowed) {
    return null;
  }

  const mainStats = [
    { label: 'Total Assigned Data', value: stats.totalAssigned, icon: ClipboardList, color: 'orange' },
    { label: 'Working Data', value: stats.workingData, icon: Clock, color: 'blue' },
    { label: 'Pending Data', value: stats.pendingData, icon: AlertCircle, color: 'amber' },
    { label: 'Converted to Lead', value: stats.convertedToLead, icon: Users, color: 'emerald' },
  ];

  const pieData = statusDistribution.map(item => ({
    name: item.name,
    value: item.count,
    color: item.color
  }));

  const periodOptions = [
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isrUser?.name || 'ISR'}'s Dashboard
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm ml-[18px]">
              {isrUser?.email || 'Loading...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabBar
        tabs={[
          { key: 'overview', label: 'Overview', variant: 'default' },
          { key: 'funnel', label: 'Pipeline Funnel', variant: 'default' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'overview' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mainStats.map((stat, index) => (
                  <StatCard key={index} color={stat.color} icon={stat.icon} label={stat.label} value={stat.value.toLocaleString()} />
                ))}
              </div>

              {/* Today's Call Stats */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Phone size={18} className="text-orange-600 dark:text-orange-400" />
                    Today's Call Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CALLS MADE</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayCallStats.callsMade}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CONVERTED</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayCallStats.convertedToLead}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">INTERESTED</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayCallStats.outcomes.interested}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">NOT INTERESTED</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{todayCallStats.outcomes.notInterested}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">NOT REACHABLE</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todayCallStats.outcomes.notReachable}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CALL LATER</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayCallStats.outcomes.callLater}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">WRONG NUMBER</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{todayCallStats.outcomes.wrongNumber}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Phone size={22} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">TOTAL CALLS</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{callStats.totalCalls.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                        <Zap size={22} className="text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">TODAY'S CALLS</p>
                        <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{callStats.todayCalls}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Clock size={22} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">AVG CALL DURATION</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatDuration(callStats.avgCallDuration)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Progress Bar Chart */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weeklyProgress.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={weeklyProgress} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            itemStyle={{ color: '#e2e8f0' }}
                          />
                          <Bar dataKey="total" name="Total" fill="#f97316" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="working" name="Working" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No progress data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status Distribution Pie Chart */}
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Call Outcome Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
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
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => <span className="text-slate-600 dark:text-slate-300 text-xs">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No outcome data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

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
            </>
          )}
        </>
      )}

      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {/* Period Filter */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              {[
                { value: 'today', label: 'Today' },
                { value: 'this_week', label: 'This Week' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'this_quarter', label: 'This Quarter' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFunnelPeriod(opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    funnelPeriod === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {funnelLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : funnelData ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">TOTAL CONVERTED</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{funnelData.totalConverted}</p>
                    <p className="text-xs text-slate-400 mt-1">Leads created by this ISR</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CUSTOMER LIVE</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{funnelData.liveCount}</p>
                    <p className="text-xs text-slate-400 mt-1">Active plan running</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">TRUE CONVERSION RATE</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{funnelData.trueConversionRate}%</p>
                    <p className="text-xs text-slate-400 mt-1">Converted to Live</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">DROPPED</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{funnelData.droppedCount}</p>
                    <p className="text-xs text-slate-400 mt-1">Lost in pipeline</p>
                  </CardContent>
                </Card>
              </div>

              {/* Current Stage Distribution */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Filter size={18} className="text-orange-600 dark:text-orange-400" />
                    Where are {funnelData.totalConverted} leads right now
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Current stage of this ISR's converted leads
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {funnelData.stages.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {funnelData.stages.map((stage) => {
                        const stageColorMap = {
                          assignedBDM: 'bg-blue-500', feasible: 'bg-indigo-500', quoteSent: 'bg-violet-500',
                          docsUpload: 'bg-orange-500', docsReview: 'bg-fuchsia-500', accountsReview: 'bg-pink-500',
                          pushToDelivery: 'bg-orange-500', atNOC: 'bg-amber-500', installed: 'bg-lime-500',
                          live: 'bg-emerald-500', dropped: 'bg-red-500'
                        };
                        return (
                          <div key={stage.stage} className="px-4 py-3 flex items-center gap-4">
                            <div className="w-36 flex-shrink-0">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{stage.label}</span>
                            </div>
                            <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                              <div
                                className={`h-full rounded-full ${stageColorMap[stage.stage] || 'bg-slate-400'} transition-all duration-500`}
                                style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xs font-bold ${stage.percentage > 40 ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                  {stage.count} leads ({stage.percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-6">No leads converted in this period</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No funnel data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
