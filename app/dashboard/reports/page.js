'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import TabBar from '@/components/TabBar';
import {
  Phone,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Download
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
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '@/lib/api';

// Custom tooltip for the bar chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom label for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.03) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#64748b"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs"
    >
      {`${name}: ${Math.round(percent * 100)}%`}
    </text>
  );
};

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('campaign-performance');
  const [timeFilter, setTimeFilter] = useState('this_week');
  const [isLoading, setIsLoading] = useState(true);
  const [dispositionLoading, setDispositionLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalCallsChange: 0,
    leadsGenerated: 0,
    leadsChange: 0,
    conversionRate: 0,
    conversionChange: 0,
    avgCallDuration: 0
  });
  const [campaignPerformance, setCampaignPerformance] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dispositionData, setDispositionData] = useState([]);
  const [dispositionTotal, setDispositionTotal] = useState(0);
  const [dataSourceROI, setDataSourceROI] = useState([]);
  const [dataSourceTotals, setDataSourceTotals] = useState({ totalRecords: 0, validRecords: 0, convertedRecords: 0, campaigns: 0 });
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [weeklyTotals, setWeeklyTotals] = useState({ totalCalls: 0, totalLeads: 0 });
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // My Campaign Performance State
  const [myPerformanceData, setMyPerformanceData] = useState([]);
  const [myPerformanceTotals, setMyPerformanceTotals] = useState({});
  const [myPerformanceLoading, setMyPerformanceLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedIsr, setSelectedIsr] = useState('');
  const [campaignsList, setCampaignsList] = useState([]);
  const [isrList, setIsrList] = useState([]);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch reports data
  useEffect(() => {
    loadReportsData();
  }, [timeFilter]);

  // Load disposition data when tab changes
  useEffect(() => {
    if (activeTab === 'call-disposition') {
      loadDispositionData();
    }
    if (activeTab === 'data-source-roi') {
      loadDataSourceROI();
    }
    if (activeTab === 'weekly-trends') {
      loadWeeklyTrends();
    }
    if (activeTab === 'my-performance') {
      loadMyPerformance();
    }
  }, [activeTab, timeFilter]);

  // Reload my performance when filters change
  useEffect(() => {
    if (activeTab === 'my-performance') {
      loadMyPerformance();
    }
  }, [selectedCampaign, selectedIsr]);

  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      const [reportsRes, leaderboardRes] = await Promise.all([
        api.get(`/campaigns/reports?period=${timeFilter}`),
        api.get(`/campaigns/reports/leaderboard?period=${timeFilter}`)
      ]);

      if (reportsRes.data) {
        setStats(reportsRes.data.stats || {
          totalCalls: 0,
          totalCallsChange: 0,
          leadsGenerated: 0,
          leadsChange: 0,
          conversionRate: 0,
          conversionChange: 0,
          avgCallDuration: 0
        });
        setCampaignPerformance(reportsRes.data.campaignPerformance || []);
      }

      if (leaderboardRes.data) {
        setLeaderboard(leaderboardRes.data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports data');
      setStats({
        totalCalls: 0,
        totalCallsChange: 0,
        leadsGenerated: 0,
        leadsChange: 0,
        conversionRate: 0,
        conversionChange: 0,
        avgCallDuration: 0
      });
      setCampaignPerformance([]);
      setLeaderboard([]);
    }
    setIsLoading(false);
  };

  const loadDispositionData = async () => {
    setDispositionLoading(true);
    try {
      const response = await api.get(`/campaigns/reports/disposition?period=${timeFilter}`);
      if (response.data) {
        setDispositionData(response.data.disposition || []);
        setDispositionTotal(response.data.totalCalls || 0);
      }
    } catch (error) {
      console.error('Failed to load disposition data:', error);
      toast.error('Failed to load disposition data');
      setDispositionData([]);
      setDispositionTotal(0);
    }
    setDispositionLoading(false);
  };

  const loadDataSourceROI = async () => {
    setDataSourceLoading(true);
    try {
      const response = await api.get('/campaigns/reports/data-source-roi');
      if (response.data) {
        setDataSourceROI(response.data.dataSourceROI || []);
        setDataSourceTotals(response.data.totals || { totalRecords: 0, validRecords: 0, invalidRecords: 0, convertedRecords: 0, campaigns: 0 });
      }
    } catch (error) {
      console.error('Failed to load data source ROI:', error);
      toast.error('Failed to load data source ROI');
      setDataSourceROI([]);
      setDataSourceTotals({ totalRecords: 0, validRecords: 0, invalidRecords: 0, convertedRecords: 0, campaigns: 0 });
    }
    setDataSourceLoading(false);
  };

  const loadWeeklyTrends = async () => {
    setWeeklyLoading(true);
    try {
      const response = await api.get('/campaigns/reports/weekly-trends');
      if (response.data) {
        setWeeklyTrends(response.data.weeklyData || []);
        setWeeklyTotals(response.data.totals || { totalCalls: 0, totalLeads: 0 });
      }
    } catch (error) {
      console.error('Failed to load weekly trends:', error);
      toast.error('Failed to load weekly trends');
      setWeeklyTrends([]);
      setWeeklyTotals({ totalCalls: 0, totalLeads: 0 });
    }
    setWeeklyLoading(false);
  };

  const loadMyPerformance = async () => {
    setMyPerformanceLoading(true);
    try {
      const params = new URLSearchParams({
        period: timeFilter,
        ...(selectedCampaign && selectedCampaign !== 'all' && { campaignId: selectedCampaign }),
        ...(selectedIsr && { isrId: selectedIsr })
      });

      const response = await api.get(`/campaigns/reports/my-performance?${params}`);
      if (response.data) {
        setMyPerformanceData(response.data.performanceData || []);
        setMyPerformanceTotals(response.data.totals || {});
        setCampaignsList(response.data.campaigns || []);
        setIsrList(response.data.isrList || []);
      }
    } catch (error) {
      console.error('Failed to load my performance:', error);
      toast.error('Failed to load performance data');
      setMyPerformanceData([]);
      setMyPerformanceTotals({});
    }
    setMyPerformanceLoading(false);
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCampaignData = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        period: timeFilter,
        ...(selectedCampaign && selectedCampaign !== 'all' && { campaignId: selectedCampaign }),
        ...(selectedIsr && { isrId: selectedIsr })
      });

      const response = await api.get(`/campaigns/reports/export-campaign-data?${params}`);
      const exportData = response.data?.data || [];

      if (exportData.length === 0) {
        toast.error('No data available to export');
        setExportLoading(false);
        return;
      }

      // Format data for Excel
      const formattedData = exportData.map(item => ({
        'Campaign Name': item.campaignName,
        'Campaign Code': item.campaignCode,
        'Contact Name': item.contactName,
        'Phone': item.phone,
        'Email': item.email,
        'Company': item.company,
        'City': item.city,
        'State': item.state,
        'Status': item.status?.replace(/_/g, ' ') || 'NEW',
        'Last Call Outcome': item.lastCallOutcome?.replace(/_/g, ' ') || 'Not Called',
        'Last Call Duration (sec)': item.lastCallDuration || 0,
        'Last Call Notes': item.lastCallNotes,
        'Last Call Date': item.lastCallDate ? new Date(item.lastCallDate).toLocaleString('en-IN') : '',
        'Notes': item.notes,
        'Assigned To': item.assignedTo,
        'Lead Converted': item.leadConverted,
        'Lead Status': item.leadStatus?.replace(/_/g, ' ') || '',
        'Follow-Up Date': item.callLaterAt ? new Date(item.callLaterAt).toLocaleString('en-IN') : '',
        'Created At': item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '',
        'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-IN') : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 25 }, // Campaign Name
        { wch: 12 }, // Campaign Code
        { wch: 22 }, // Contact Name
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 22 }, // Company
        { wch: 15 }, // City
        { wch: 15 }, // State
        { wch: 18 }, // Status
        { wch: 20 }, // Last Call Outcome
        { wch: 10 }, // Duration
        { wch: 30 }, // Last Call Notes
        { wch: 20 }, // Last Call Date
        { wch: 30 }, // Notes
        { wch: 18 }, // Assigned To
        { wch: 14 }, // Lead Converted
        { wch: 15 }, // Lead Status
        { wch: 20 }, // Follow-Up Date
        { wch: 20 }, // Created At
        { wch: 20 }, // Last Updated
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign Data');

      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      const periodLabel = timeFilter.replace(/_/g, '-');
      XLSX.writeFile(workbook, `Campaign_Data_Export_${periodLabel}_${dateStr}.xlsx`);

      toast.success(`Exported ${exportData.length} records successfully`);
    } catch (error) {
      console.error('Failed to export campaign data:', error);
      toast.error('Failed to export campaign data');
    }
    setExportLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getTimeFilterLabel = () => {
    const option = timeFilterOptions.find(o => o.value === timeFilter);
    return option ? option.label.toLowerCase() : 'this week';
  };

  const tabs = [
    { id: 'campaign-performance', label: 'Campaign Performance' },
    { id: 'my-performance', label: 'My Campaign Performance' },
    { id: 'call-disposition', label: 'Call Disposition' },
    { id: 'weekly-trends', label: 'Weekly Trends' },
    { id: 'data-source-roi', label: 'Data Source ROI' }
  ];

  const timeFilterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' }
  ];

  const chartColors = {
    calls: '#f97316',
    conversions: '#fb923c'
  };

  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-emerald-500 text-white';
      case 2:
        return 'bg-slate-400 text-white';
      case 3:
        return 'bg-amber-600 text-white';
      default:
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Reports" description="Performance analytics and insights">

        {/* Time Filter Dropdown */}
        <div className="relative self-start sm:self-auto">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer w-full"
          >
            {timeFilterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Calls</p>
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Phone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalCalls.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {stats.totalCallsChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${stats.totalCallsChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.totalCallsChange >= 0 ? '+' : ''}{stats.totalCallsChange}% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => router.push('/dashboard/leads')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Leads Generated</p>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.leadsGenerated.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {stats.leadsChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${stats.leadsChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.leadsChange >= 0 ? '+' : ''}{stats.leadsChange}% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Conversion Rate</p>
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.conversionRate}%
            </p>
            <div className="flex items-center gap-1 mt-2">
              {stats.conversionChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${stats.conversionChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.conversionChange >= 0 ? '+' : ''}{stats.conversionChange}% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Avg Call Duration</p>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatDuration(stats.avgCallDuration)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Optimal range
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({ key: tab.id, label: tab.label }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'campaign-performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-1 bg-orange-500 rounded-full" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Campaign-wise Performance
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Calls made and conversions by campaign
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : campaignPerformance.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No campaign data available</p>
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={campaignPerformance}
                      margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                      barGap={8}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                        interval={0}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => value.toLocaleString()} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" iconSize={8} />
                      <Bar yAxisId="left" dataKey="calls" name="Calls Made" fill={chartColors.calls} radius={[6, 6, 0, 0]} maxBarSize={45} />
                      <Bar yAxisId="right" dataKey="conversions" name="Conversions" fill={chartColors.conversions} radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-1 bg-orange-500 rounded-full" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">ISR Productivity Leaderboard</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Team performance comparison</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No leaderboard data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((isr, index) => (
                    <div key={isr.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${getRankBadgeColor(index + 1)}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{isr.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{isr.calls} calls {getTimeFilterLabel()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{isr.leads}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Leads</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">{isr.conversionRate}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Conversion</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'my-performance' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
                {/* ISR Filter (Admin only) */}
                {isAdmin && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ISR:</label>
                    <select
                      value={selectedIsr}
                      onChange={(e) => setSelectedIsr(e.target.value)}
                      className="flex-1 sm:flex-initial bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">All ISRs</option>
                      {isrList.map(isr => (
                        <option key={isr.id} value={isr.id}>{isr.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Campaign Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Campaign:</label>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="flex-1 sm:flex-initial bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Campaigns</option>
                    {campaignsList.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name} ({campaign.code})</option>
                    ))}
                  </select>
                </div>

                {/* Export Button */}
                <div className="sm:ml-auto">
                  <button
                    onClick={handleExportCampaignData}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {exportLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export Data
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Calls</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{myPerformanceTotals.totalCalls || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Leads Generated</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{myPerformanceTotals.leadsGenerated || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{myPerformanceTotals.conversionRate || 0}%</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Duration</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatDuration(myPerformanceTotals.avgDuration || 0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-1 bg-orange-500 rounded-full" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {isAdmin && !selectedIsr ? 'Campaign Performance Overview' : 'My Campaign Performance'}
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Calls and leads by campaign</p>
              </div>

              {myPerformanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : myPerformanceData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No performance data available</p>
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={myPerformanceData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                      barGap={8}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                      <XAxis
                        dataKey="campaignName"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                        interval={0}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" iconSize={8} />
                      <Bar yAxisId="left" dataKey="totalCalls" name="Calls" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={45} />
                      <Bar yAxisId="right" dataKey="leadsGenerated" name="Leads" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Table */}
          {!myPerformanceLoading && myPerformanceData.length > 0 && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="h-5 w-1 bg-orange-500 rounded-full" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Campaign Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Campaign</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Calls</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Leads</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Interested</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Not Interested</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Not Reachable</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Call Later</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {myPerformanceData.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{item.campaignName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.campaignCode}</p>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-medium">{item.totalCalls}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{item.leadsGenerated}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.interested}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.notInterested}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.notReachable}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.callLater}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge className={item.conversionRate >= 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}>
                              {item.conversionRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Total</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">{myPerformanceTotals.totalCalls || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{myPerformanceTotals.leadsGenerated || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{myPerformanceTotals.interested || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{myPerformanceTotals.notInterested || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{myPerformanceTotals.notReachable || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{myPerformanceTotals.callLater || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge className={myPerformanceTotals.conversionRate >= 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}>
                            {myPerformanceTotals.conversionRate || 0}%
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'call-disposition' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-orange-500 rounded-full" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Call Disposition Distribution</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Breakdown of call outcomes</p>
            </div>

            {dispositionLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : dispositionData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No call disposition data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dispositionData} cx="50%" cy="50%" labelLine={true} label={renderCustomizedLabel} outerRadius={120} innerRadius={60} paddingAngle={2} dataKey="value">
                        {dispositionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="mb-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Calls</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{dispositionTotal.toLocaleString()}</p>
                  </div>
                  <div className="space-y-3">
                    {dispositionData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value.toLocaleString()}</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 w-12 text-right">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'weekly-trends' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-orange-500 rounded-full" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Weekly Activity Trends</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daily calls and leads generated this week</p>
            </div>

            {weeklyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : weeklyTrends.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No weekly activity data available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Line Chart */}
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weeklyTrends}
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        className="text-slate-600 dark:text-slate-400"
                        stroke="#94a3b8"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, white)',
                          border: '1px solid var(--tooltip-border, #e2e8f0)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: 'var(--tooltip-text, #1e293b)'
                        }}
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => label}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        name="Calls"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#f97316' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="leads"
                        name="Leads"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Calls This Week</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{weeklyTotals.totalCalls.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Leads This Week</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{weeklyTotals.totalLeads.toLocaleString()}</p>
                  </div>
                </div>

                {/* Daily Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Day</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Calls</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Leads</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {weeklyTrends.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{item.day}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.calls}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{item.leads}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {item.calls > 0 ? Math.round((item.leads / item.calls) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'data-source-roi' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-orange-500 rounded-full" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Data Source Performance</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Record quality by data source</p>
            </div>

            {dataSourceLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : dataSourceROI.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No data source information available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Chart */}
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dataSourceROI}
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="source"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="square" iconSize={12} />
                      <Bar dataKey="totalRecords" name="Total Records" fill="#1e293b" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      <Bar dataKey="invalidRecords" name="Invalid Records" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Records</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dataSourceTotals.totalRecords.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm text-red-500 dark:text-red-400">Invalid Records</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dataSourceTotals.invalidRecords.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Converted</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{dataSourceTotals.convertedRecords.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Campaigns</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dataSourceTotals.campaigns}</p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Source</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Valid</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-red-500 dark:text-red-400 uppercase">Invalid</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Converted</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Valid %</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {dataSourceROI.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{item.source}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.totalRecords.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.validRecords.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">{(item.invalidRecords || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{item.convertedRecords.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{item.validRate}%</td>
                          <td className="py-3 px-4 text-right">
                            <Badge className={item.conversionRate >= 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}>
                              {item.conversionRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
