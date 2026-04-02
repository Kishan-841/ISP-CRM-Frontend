'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Award,
  Eye,
  Filter,
  TrendingUp,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  UserCheck,
  UserX,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  HelpCircle
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

const STATUS_COLORS = {
  NEW: '#f97316',
  INTERESTED: '#10b981',
  NOT_INTERESTED: '#f43f5e',
  NOT_REACHABLE: '#f59e0b',
  WRONG_NUMBER: '#ef4444',
  CALL_LATER: '#f97316',
  RINGING_NOT_PICKED: '#6b7280',
  OTHERS: '#8b5cf6'
};

const getStatusColor = (status) => STATUS_COLORS[status] || '#64748b';

const STAGE_COLORS = {
  assignedBDM: 'bg-blue-500', feasible: 'bg-indigo-500', quoteSent: 'bg-violet-500',
  docsUpload: 'bg-orange-500', docsReview: 'bg-fuchsia-500', accountsReview: 'bg-pink-500',
  pushToDelivery: 'bg-orange-500', atNOC: 'bg-amber-500', installed: 'bg-lime-500',
  live: 'bg-emerald-500', dropped: 'bg-red-500'
};

const PERIOD_OPTIONS = [
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const FUNNEL_PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
];

export default function ISROverallDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last7days');

  const [stats, setStats] = useState({
    totalAssigned: 0, workingData: 0, pendingData: 0, convertedToLead: 0
  });

  const [todayCallStats, setTodayCallStats] = useState({
    callsMade: 0, convertedToLead: 0,
    outcomes: { interested: 0, notInterested: 0, notReachable: 0, callLater: 0, wrongNumber: 0, others: 0 }
  });

  const [callStats, setCallStats] = useState({ totalCalls: 0, todayCalls: 0, avgCallDuration: 0 });
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [isrList, setIsrList] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [funnelData, setFunnelData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelPeriod, setFunnelPeriod] = useState('this_month');

  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'SALES_DIRECTOR' || user?.role === 'MASTER' || user?.role === 'BDM_TEAM_LEADER';

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersRes = await api.get('/users/by-role?role=ISR');
      const isrUsers = (usersRes.data.users || []).filter(u => u.role === 'ISR');
      setIsrList(isrUsers);

      let aggregatedStats = { totalAssigned: 0, workingData: 0, pendingData: 0, convertedToLead: 0 };
      let aggregatedTodayStats = {
        callsMade: 0, convertedToLead: 0,
        outcomes: { interested: 0, notInterested: 0, notReachable: 0, callLater: 0, wrongNumber: 0, others: 0 }
      };
      let aggregatedCallStats = { totalCalls: 0, todayCalls: 0, totalDuration: 0 };
      let statusCounts = {};
      let isrPerformance = [];
      let dailyDataMap = {};

      for (const isr of isrUsers) {
        try {
          const isrDashRes = await api.get(`/users/${isr.id}/dashboard?period=${dateRange}`).catch(() => ({ data: null }));
          if (isrDashRes.data) {
            const data = isrDashRes.data;
            const isrStats = data.stats || {};
            const isrTodayStats = data.todayCallStats || {};
            const isrCallStats = data.callStats || {};

            aggregatedStats.totalAssigned += isrStats.totalAssigned || 0;
            aggregatedStats.workingData += isrStats.workingData || 0;
            aggregatedStats.pendingData += isrStats.pendingData || 0;
            aggregatedStats.convertedToLead += isrStats.convertedToLead || 0;

            aggregatedTodayStats.callsMade += isrTodayStats.callsMade || 0;
            aggregatedTodayStats.convertedToLead += isrTodayStats.convertedToLead || 0;
            if (isrTodayStats.outcomes) {
              aggregatedTodayStats.outcomes.interested += isrTodayStats.outcomes.interested || 0;
              aggregatedTodayStats.outcomes.notInterested += isrTodayStats.outcomes.notInterested || 0;
              aggregatedTodayStats.outcomes.notReachable += isrTodayStats.outcomes.notReachable || 0;
              aggregatedTodayStats.outcomes.callLater += isrTodayStats.outcomes.callLater || 0;
              aggregatedTodayStats.outcomes.wrongNumber += isrTodayStats.outcomes.wrongNumber || 0;
              aggregatedTodayStats.outcomes.others += isrTodayStats.outcomes.others || 0;
            }

            aggregatedCallStats.totalCalls += isrCallStats.totalCalls || 0;
            aggregatedCallStats.todayCalls += isrCallStats.todayCalls || 0;
            aggregatedCallStats.totalDuration += (isrCallStats.avgCallDuration || 0) * (isrCallStats.totalCalls || 0);

            if (data.statusDistribution) {
              data.statusDistribution.forEach(item => {
                statusCounts[item.status] = (statusCounts[item.status] || 0) + item.count;
              });
            }

            if (data.weeklyProgress) {
              data.weeklyProgress.forEach(day => {
                if (!dailyDataMap[day.label]) {
                  dailyDataMap[day.label] = { label: day.label, total: 0, working: 0, converted: 0 };
                }
                dailyDataMap[day.label].total += day.total || 0;
                dailyDataMap[day.label].working += day.working || 0;
                dailyDataMap[day.label].converted += day.converted || 0;
              });
            }

            isrPerformance.push({
              id: isr.id, name: isr.name,
              totalAssigned: isrStats.totalAssigned || 0,
              workingData: isrStats.workingData || 0,
              converted: isrStats.convertedToLead || 0,
              totalCalls: isrCallStats.totalCalls || 0,
              todayCalls: isrCallStats.todayCalls || 0
            });
          }
        } catch (err) {
          console.error(`Error fetching stats for ISR ${isr.id}:`, err);
        }
      }

      setStats(aggregatedStats);
      setTodayCallStats(aggregatedTodayStats);
      setCallStats({
        totalCalls: aggregatedCallStats.totalCalls,
        todayCalls: aggregatedCallStats.todayCalls,
        avgCallDuration: aggregatedCallStats.totalCalls > 0
          ? Math.round(aggregatedCallStats.totalDuration / aggregatedCallStats.totalCalls) : 0
      });

      const statusData = Object.entries(statusCounts)
        .filter(([status]) => status !== 'CALLED')
        .map(([status, count]) => ({ status, name: status.replace(/_/g, ' '), count, color: getStatusColor(status) }));
      setStatusDistribution(statusData);

      const weeklyData = Object.values(dailyDataMap).sort((a, b) => new Date(a.label) - new Date(b.label));
      setWeeklyProgress(weeklyData);

      isrPerformance.sort((a, b) => b.converted - a.converted);
      setLeaderboard(isrPerformance);
    } catch (error) {
      console.error('Error fetching ISR dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (isAllowed) fetchData();
  }, [user, fetchData, isAllowed]);

  const fetchFunnelData = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const [funnelRes, comparisonRes] = await Promise.all([
        api.get(`/campaigns/reports/pipeline-funnel?period=${funnelPeriod}`),
        api.get(`/campaigns/reports/pipeline-comparison?period=${funnelPeriod}`)
      ]);
      setFunnelData(funnelRes.data);
      setComparisonData(comparisonRes.data);
    } catch (error) {
      console.error('Error fetching pipeline funnel data:', error);
    } finally {
      setFunnelLoading(false);
    }
  }, [funnelPeriod]);

  useEffect(() => {
    if (isAllowed) fetchFunnelData();
  }, [user, fetchFunnelData, isAllowed]);

  if (!user || !isAllowed) return null;

  const pieData = statusDistribution.map(item => ({ name: item.name, value: item.count, color: item.color }));
  const totalOutcomes = todayCallStats.callsMade || 1;

  const outcomeItems = [
    { label: 'Interested', value: todayCallStats.outcomes.interested, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Not Interested', value: todayCallStats.outcomes.notInterested, icon: UserX, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Not Reachable', value: todayCallStats.outcomes.notReachable, icon: PhoneMissed, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Call Later', value: todayCallStats.outcomes.callLater, icon: Timer, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Wrong Number', value: todayCallStats.outcomes.wrongNumber, icon: PhoneOff, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Others', value: todayCallStats.outcomes.others, icon: HelpCircle, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/admin-dashboards')} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <h1 className="text-xl font-semibold">ISR Team Performance</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-[18px]">
              {isrList.length} active ISR{isrList.length !== 1 ? 's' : ''} across all campaigns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  dateRange === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="rounded-xl h-9 w-9">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ── Section: Overview Stats ── */}
          <div className="grid grid-cols-12 gap-4">
            {/* Stat Cards */}
            {[
              { label: 'Total Assigned', value: stats.totalAssigned, icon: ClipboardList, color: 'bg-orange-500/10', iconColor: 'text-orange-500' },
              { label: 'Working Data', value: stats.workingData, icon: Clock, color: 'bg-blue-500/10', iconColor: 'text-blue-500' },
              { label: 'Pending Data', value: stats.pendingData, icon: AlertCircle, color: 'bg-amber-500/10', iconColor: 'text-amber-500' },
              { label: 'Converted to Lead', value: stats.convertedToLead, icon: Users, color: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
            ].map((stat, i) => (
              <Card key={i} className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl shadow-sm hover:shadow-md transition">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Section: Today's Call Activity + Quick Stats ── */}
          <div className="grid grid-cols-12 gap-6">
            {/* Today's Call Activity — col-span-8 */}
            <Card className="col-span-12 lg:col-span-8 rounded-2xl shadow-sm hover:shadow-md transition">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-orange-500" />
                  </div>
                  Today's Call Activity
                </CardTitle>
                <CardDescription>
                  {todayCallStats.callsMade} calls made today by all ISRs
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <PhoneCall className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{todayCallStats.callsMade}</p>
                      <p className="text-xs text-muted-foreground">Calls Made</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{todayCallStats.convertedToLead}</p>
                      <p className="text-xs text-muted-foreground">Converted</p>
                    </div>
                  </div>
                </div>
                {/* Outcome breakdown as progress bars */}
                <div className="space-y-3">
                  {outcomeItems.map((item) => {
                    const pct = totalOutcomes > 0 ? Math.round((item.value / totalOutcomes) * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                          <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                            <span className="text-xs font-bold">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${item.color.replace('text-', 'bg-')}`}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Call Stats — col-span-4 */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {[
                { label: 'Total Calls', value: callStats.totalCalls.toLocaleString(), icon: Phone, color: 'bg-blue-500/10', iconColor: 'text-blue-500' },
                { label: "Today's Calls", value: callStats.todayCalls, icon: Zap, color: 'bg-cyan-500/10', iconColor: 'text-cyan-500' },
                { label: 'Avg Call Duration', value: formatDuration(callStats.avgCallDuration), icon: Clock, color: 'bg-orange-500/10', iconColor: 'text-orange-500' },
              ].map((item, i) => (
                <Card key={i} className="rounded-2xl shadow-sm hover:shadow-md transition">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg ${item.color} flex items-center justify-center`}>
                        <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-bold">{item.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Section: Analytics ── */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Analytics</h2>
            <div className="grid grid-cols-12 gap-6">
              {/* Data Status Bar Chart — col-span-6 */}
              <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Data Status</CardTitle>
                  <CardDescription>Progress over {PERIOD_OPTIONS.find(p => p.value === dateRange)?.label?.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-4">
                    {[
                      { label: 'Total Data', val: stats.totalAssigned, dot: 'bg-blue-500' },
                      { label: 'Working', val: stats.workingData, dot: 'bg-rose-500' },
                      { label: 'Converted', val: stats.convertedToLead, dot: 'bg-amber-500' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xl font-bold">{s.val.toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-56">
                    {weeklyProgress.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyProgress} barGap={1} barCategoryGap="15%">
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" iconSize={8} />
                          <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="working" name="Working" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="converted" name="Converted" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No data available for selected period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution Donut — col-span-6 */}
              <Card className="col-span-12 lg:col-span-6 rounded-2xl shadow-sm hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Status Distribution</CardTitle>
                  <CardDescription>Breakdown of all data statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                            }}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: '16px' }}
                            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                      No status distribution data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Section: ISR Performance Leaderboard ── */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Performance Leaderboard</h2>
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden">
              <CardContent className="p-0">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No performance data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ISR Name</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Working</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Converted</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Calls</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</th>
                          <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leaderboard.map((isr, index) => (
                          <tr key={isr.id} className="hover:bg-muted/50 transition cursor-pointer" onClick={() => router.push(`/dashboard/admin-dashboards/isr/${isr.id}`)}>
                            <td className="px-5 py-3.5">
                              {index < 3 ? (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                  index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                  index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' :
                                  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                }`}>
                                  {index + 1}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground pl-2">{index + 1}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-sm">{isr.name}</p>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-sm font-semibold">{isr.totalAssigned}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{isr.workingData}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{isr.converted}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-sm text-muted-foreground">{isr.totalCalls}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Badge variant="secondary" className="text-xs">{isr.todayCalls}</Badge>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Section: Pipeline Funnel ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pipeline Funnel</h2>
              <div className="flex items-center bg-muted rounded-lg p-1">
                {FUNNEL_PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFunnelPeriod(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      funnelPeriod === opt.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {funnelLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : funnelData ? (
              <div className="space-y-6">
                {/* Funnel Stat Cards */}
                <div className="grid grid-cols-12 gap-4">
                  {[
                    { label: 'Total Converted', value: funnelData.totalConverted, sub: 'All ISR conversions', icon: TrendingUp, color: 'bg-blue-500/10', iconColor: 'text-blue-500' },
                    { label: 'Customer Live', value: funnelData.liveCount, sub: 'Active plan running', icon: Zap, color: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
                    { label: 'True Conversion', value: `${funnelData.trueConversionRate}%`, sub: 'Converted to Live', icon: Award, color: 'bg-orange-500/10', iconColor: 'text-orange-500' },
                    { label: 'Dropped', value: funnelData.droppedCount, sub: 'Lost in pipeline', icon: ArrowDownRight, color: 'bg-red-500/10', iconColor: 'text-red-500' },
                  ].map((stat, i) => (
                    <Card key={i} className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl shadow-sm hover:shadow-md transition">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <p className="text-3xl font-bold mt-1">{stat.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                          </div>
                          <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Stage Distribution */}
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Filter className="h-4 w-4 text-orange-500" />
                      </div>
                      Where are {funnelData.totalConverted} leads right now
                    </CardTitle>
                    <CardDescription>Current stage of all ISR-converted leads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {funnelData.stages.length > 0 ? (
                      <div className="space-y-3">
                        {funnelData.stages.map((stage) => (
                          <div key={stage.stage} className="flex items-center gap-4">
                            <div className="w-32 flex-shrink-0">
                              <span className="text-sm font-medium">{stage.label}</span>
                            </div>
                            <div className="flex-1 h-7 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className={`h-full rounded-full ${STAGE_COLORS[stage.stage] || 'bg-muted-foreground'} transition-all duration-500`}
                                style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xs font-semibold ${stage.percentage > 40 ? 'text-white' : ''}`}>
                                  {stage.count} ({stage.percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">No leads converted in this period</p>
                    )}
                  </CardContent>
                </Card>

                {/* ISR True Conversion Leaderboard */}
                {comparisonData?.isrs?.length > 0 && (
                  <Card className="rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        True Conversion Leaderboard
                      </CardTitle>
                      <CardDescription>Which ISRs generate leads that actually become live customers</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ISR Name</th>
                              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Converted</th>
                              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Live</th>
                              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">True Conv%</th>
                              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Dropped</th>
                              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {comparisonData.isrs.map((isr, index) => (
                              <tr
                                key={isr.userId}
                                className="hover:bg-muted/50 transition cursor-pointer"
                                onClick={() => router.push(`/dashboard/admin-dashboards/isr/${isr.userId}`)}
                              >
                                <td className="px-5 py-3.5">
                                  {index < 3 ? (
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                      index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                      index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' :
                                      'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                    }`}>
                                      {index + 1}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground pl-2">{index + 1}</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  <p className="font-medium text-sm">{isr.name}</p>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{isr.converted}</span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{isr.live}</span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <Badge className={`text-xs ${
                                    isr.trueConversionRate >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                    isr.trueConversionRate >= 25 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                                    'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                  }`}>
                                    {isr.trueConversionRate}%
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <span className="text-sm text-red-500">{isr.dropped}</span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <span className="text-sm text-muted-foreground">{isr.inProgress}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No funnel data available
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
