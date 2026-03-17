'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Target, Calendar, Clock,
  CheckCircle, XCircle, AlertTriangle, BarChart3, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';

const COLORS = ['#f97316', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

export default function BDMReportsPage() {
  const router = useRouter();
  const { user, isBDM, isBDMTeamLeader } = useRoleCheck();
  const canAccessBDM = isBDM || isBDMTeamLeader;
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState(null);
  const [selectedBDM, setSelectedBDM] = useState('');
  const [teamBDMs, setTeamBDMs] = useState([]);

  useEffect(() => {
    if (user && !canAccessBDM) {
      router.push('/dashboard');
    }
  }, [user, canAccessBDM, router]);

  // Fetch team BDMs for TL
  useEffect(() => {
    if (isBDMTeamLeader) {
      api.get('/users').then(res => {
        setTeamBDMs(res.data.users || []);
      }).catch(() => {});
    }
  }, [isBDMTeamLeader]);

  useEffect(() => {
    if (canAccessBDM) {
      fetchReports();
    }
  }, [canAccessBDM, period, selectedBDM]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let url = `/leads/bdm/reports?period=${period}`;
      if (selectedBDM) url += `&bdmId=${selectedBDM}`;
      const response = await api.get(url);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canAccessBDM) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  const { summary, followUps, statusDistribution, performanceData, periodType, productPerformance, sourceDistribution } = data;

  // Get chart title based on period type
  const getPerformanceChartTitle = () => {
    switch (periodType) {
      case 'daily':
        return 'Daily Performance (Last 7 Days)';
      case 'weekly':
        return `Weekly Performance (Last ${performanceData?.length || 4} Weeks)`;
      case 'monthly':
        return 'Monthly Performance (Last 12 Months)';
      default:
        return 'Performance Trend';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Performance Reports" description={selectedBDM ? `Viewing ${teamBDMs.find(b => b.id === selectedBDM)?.name || 'BDM'}'s reports` : 'Track your sales performance and lead conversions'}>
        {isBDMTeamLeader && teamBDMs.length > 0 && (
          <select
            value={selectedBDM}
            onChange={(e) => setSelectedBDM(e.target.value)}
            className="h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600"
          >
            <option value="">My Reports</option>
            {teamBDMs.map(bdm => (
              <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
            ))}
          </select>
        )}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
        <Button
          onClick={fetchReports}
          variant="outline"
          size="sm"
          className="border-slate-200 dark:border-slate-700"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Leads</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.totalLeads}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qualified</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.qualifiedLeads}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conversion</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{summary.conversionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meetings</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{summary.meetingsScheduled}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Self Leads</p>
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{summary.selfLeadsCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups Alert */}
      {(followUps.overdue > 0 || followUps.today > 0) && (
        <Card className={`border-2 ${followUps.overdue > 0 ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${followUps.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
                <div>
                  <p className={`font-medium ${followUps.overdue > 0 ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                    Follow-up Reminder
                  </p>
                  <p className={`text-sm ${followUps.overdue > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {followUps.overdue > 0 && `${followUps.overdue} overdue`}
                    {followUps.overdue > 0 && followUps.today > 0 && ' | '}
                    {followUps.today > 0 && `${followUps.today} due today`}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/dashboard/bdm-follow-ups')}
                size="sm"
                className={followUps.overdue > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
              >
                View Follow-ups
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend - Area Chart */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {getPerformanceChartTitle()} - Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: periodType === 'daily' ? 10 : 12 }}
                    stroke="#94a3b8"
                    angle={periodType === 'daily' ? -45 : 0}
                    textAnchor={periodType === 'daily' ? 'end' : 'middle'}
                    height={periodType === 'daily' ? 60 : 30}
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#f97316" fillOpacity={1} fill="url(#colorLeads)" />
                  <Area type="monotone" dataKey="qualified" name="Qualified" stroke="#10b981" fillOpacity={1} fill="url(#colorQualified)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Bar Chart */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {getPerformanceChartTitle()} - Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: periodType === 'daily' ? 10 : 12 }}
                    stroke="#94a3b8"
                    angle={periodType === 'daily' ? -45 : 0}
                    textAnchor={periodType === 'daily' ? 'end' : 'middle'}
                    height={periodType === 'daily' ? 60 : 30}
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="qualified" name="Qualified" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meetings" name="Meetings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Lead Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution.filter(s => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => count > 0 ? `${status}: ${count}` : ''}
                    labelLine={false}
                  >
                    {statusDistribution.filter(s => s.count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusDistribution.filter(s => s.count > 0).map((item, index) => (
                <div key={item.status} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-400">{item.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {sourceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {sourceDistribution.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Performance */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productPerformance.length > 0 ? (
              <div className="space-y-4">
                {productPerformance.map((product, index) => {
                  const maxCount = productPerformance[0]?.count || 1;
                  const percentage = (product.count / maxCount) * 100;
                  return (
                    <div key={product.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{product.name}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{product.count}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                <p className="text-sm">No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard color="orange" icon={Users} label="Active Leads" value={summary.activeLeads} />
        <StatCard color="cyan" icon={TrendingUp} label="Self Qualified" value={summary.selfQualified} />
      </div>
    </div>
  );
}
