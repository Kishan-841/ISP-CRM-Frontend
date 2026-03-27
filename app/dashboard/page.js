'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useCampaignStore, useUserStore, useLeadStore } from '@/lib/store';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/StatCard';
import {
  ClipboardList,
  Clock,
  AlertCircle,
  Users,
  Calendar,
  Zap,
  Phone,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Target,
  AlertTriangle,
  Send,
  CalendarCheck,
  MapPin,
  Building2,
  DollarSign,
  Receipt,
  Truck,
  Package,
  CalendarRange,
  CheckCircle,
  Filter,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  PhoneOff,
  PhoneMissed,
  LogIn,
  Wrench,
  Banknote,
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { LEAD_STATUS_CONFIG, getStatusBadgeClass as _getStatusBadgeClass } from '@/lib/statusConfig';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { fetchDashboardStats } = useCampaignStore();
  const { fetchUsersByRole, fetchUserDashboardStats } = useUserStore();
  const { fetchBDMDashboardStats, bdmDashboardStats, bdmDashboardLoading, fetchBDMMeetings, bdmMeetings, bdmMeetingStats, fetchFeasibilityQueue, feasibilityQueue, feasibilityStats, fetchBDMUsers, bdmUsers } = useLeadStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('alltime');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [funnelData, setFunnelData] = useState(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelPeriod, setFunnelPeriod] = useState('this_month');

  // Admin-specific state
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [businessOverview, setBusinessOverview] = useState(null);
  const [businessOverviewLoading, setBusinessOverviewLoading] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isTL = user?.role === 'BDM_TEAM_LEADER';
  const isBDM = user?.role === 'BDM' || isTL;
  const isFeasibilityTeam = user?.role === 'FEASIBILITY_TEAM';
  // Redirect roles that don't have a dashboard on /dashboard to their first sidebar page
  useEffect(() => {
    if (!user?.role) return;
    const redirectMap = {
      OPS_TEAM: '/dashboard/ops-approval',
      DOCS_TEAM: '/dashboard/docs-verification',
      ACCOUNTS_TEAM: '/dashboard/accounts-dashboard',
      DELIVERY_TEAM: '/dashboard/delivery-queue',
      STORE_MANAGER: '/dashboard/product-management',
      NOC: '/dashboard/noc-queue',
      SAM_HEAD: '/dashboard/sam-head',
      SAM_EXECUTIVE: '/dashboard/sam-executive',
      SUPPORT_TEAM: '/dashboard/complaints',
      SUPER_ADMIN_2: '/dashboard/super-admin2-approval',
      SAM: '/dashboard/sam-data',
      AREA_HEAD: '/dashboard/delivery-request-approval',
    };
    const target = redirectMap[user.role];
    if (target) router.replace(target);
  }, [user?.role, router]);

  // Feasibility Dashboard Filter State
  const [ftPeriod, setFtPeriod] = useState(null);
  const [ftFromDate, setFtFromDate] = useState('');
  const [ftToDate, setFtToDate] = useState('');
  const [showFtCustomDatePicker, setShowFtCustomDatePicker] = useState(false);

  // BDM Dashboard Filter State
  const [bdmPeriod, setBdmPeriod] = useState('mtd');
  const [bdmFromDate, setBdmFromDate] = useState('');
  const [bdmToDate, setBdmToDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [selectedBDMUser, setSelectedBDMUser] = useState(''); // TL: view a specific BDM's dashboard

  const periodOptions = [
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'monthly', label: 'Monthly (Last 30 Days)' },
    { value: 'yearly', label: 'Yearly (Last 12 Months)' },
    { value: 'alltime', label: 'All Time' },
    { value: 'custom', label: 'Custom' },
  ];

  const roleOptions = [
    { value: 'ALL', label: 'All Users' },
    { value: 'ISR', label: 'ISR' },
    { value: 'BDM', label: 'BDM' },
  ];

  // Handle URL params for direct user access (from Team Dashboards)
  const urlUserId = searchParams.get('userId');
  const urlRole = searchParams.get('role');

  // Load business overview for admin
  useEffect(() => {
    const loadBusinessOverview = async () => {
      if (!isAdmin) return;
      setBusinessOverviewLoading(true);
      try {
        const res = await api.get('/accounts-dashboard/business-overview');
        setBusinessOverview(res.data);
      } catch (error) {
        console.error('Error loading business overview:', error);
      } finally {
        setBusinessOverviewLoading(false);
      }
    };
    loadBusinessOverview();
  }, [isAdmin]);

  // Load users by role for admin
  useEffect(() => {
    const loadUsers = async () => {
      if (isAdmin) {
        setLoadingUsers(true);
        // Use URL role if present, otherwise use selected role
        const roleToFetch = urlRole || selectedRole;
        if (urlRole && selectedRole !== urlRole) {
          setSelectedRole(urlRole);
        }
        const result = await fetchUsersByRole(roleToFetch);
        if (result.success) {
          setUsersList(result.users);
          // Only reset selected user if no URL param
          if (!urlUserId) {
            setSelectedUserId('');
            setSelectedUserInfo(null);
            setDashboardData(null);
          }
        }
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isAdmin, selectedRole, fetchUsersByRole, urlRole, urlUserId]);

  // Auto-select user from URL params
  useEffect(() => {
    if (isAdmin && urlUserId && usersList.length > 0) {
      const userFromUrl = usersList.find(u => u.id === urlUserId);
      if (userFromUrl && selectedUserId !== urlUserId) {
        setSelectedUserId(urlUserId);
      }
    }
  }, [isAdmin, urlUserId, usersList, selectedUserId]);

  // Fetch BDM users list for TL dropdown
  useEffect(() => {
    if (isTL) {
      fetchBDMUsers();
    }
  }, [isTL, fetchBDMUsers]);

  // Load BDM dashboard stats and meetings
  useEffect(() => {
    if (isBDM) {
      const options = { period: bdmPeriod };
      if (bdmPeriod === 'custom' && bdmFromDate && bdmToDate) {
        options.fromDate = bdmFromDate;
        options.toDate = bdmToDate;
      }
      if (isTL && selectedBDMUser) {
        options.userId = selectedBDMUser;
      }
      fetchBDMDashboardStats(options);
      fetchBDMMeetings();
    }
  }, [isBDM, isTL, selectedBDMUser, fetchBDMDashboardStats, fetchBDMMeetings, bdmPeriod, bdmFromDate, bdmToDate]);

  // Load Feasibility Team dashboard data
  useEffect(() => {
    if (isFeasibilityTeam) {
      const options = {};
      if (ftPeriod) options.period = ftPeriod;
      if (ftPeriod === 'custom' && ftFromDate && ftToDate) {
        options.fromDate = ftFromDate;
        options.toDate = ftToDate;
      }
      fetchFeasibilityQueue(options);
    }
  }, [isFeasibilityTeam, fetchFeasibilityQueue, ftPeriod, ftFromDate, ftToDate]);

  // Load dashboard stats (ISR/Admin)
  useEffect(() => {
    const loadStats = async () => {
      // Don't fetch if custom period is selected but dates are incomplete
      if (selectedPeriod === 'custom' && (!customFromDate || !customToDate)) return;

      setIsLoading(true);

      if (isAdmin && selectedUserId) {
        // Find the selected user to determine their role
        const selectedUser = usersList.find(u => u.id === selectedUserId);

        if (selectedUser?.role === 'BDM') {
          // Admin viewing a BDM's dashboard - fetch BDM stats
          const result = await fetchBDMDashboardStats(selectedUserId);
          if (result.success) {
            setDashboardData(result.data);
            setSelectedUserInfo(selectedUser);
          }
        } else {
          // Admin viewing an ISR's dashboard
          const result = await fetchUserDashboardStats(selectedUserId, selectedPeriod);
          if (result.success) {
            setDashboardData(result.data);
            setSelectedUserInfo(result.data.user);
          }
        }
      } else if (!isAdmin && !isBDM && !isFeasibilityTeam) {
        // ISR viewing their own dashboard
        const result = await fetchDashboardStats(selectedPeriod, customFromDate, customToDate);
        if (result.success) {
          setDashboardData(result.data);
        }
      }

      setIsLoading(false);
    };

    if (isBDM || isFeasibilityTeam) {
      setIsLoading(false);
    } else if (!isAdmin || selectedUserId) {
      loadStats();
    } else {
      setIsLoading(false);
    }
  }, [fetchDashboardStats, fetchUserDashboardStats, fetchBDMDashboardStats, isAdmin, isBDM, isFeasibilityTeam, selectedPeriod, selectedUserId, usersList, customFromDate, customToDate]);

  // Load pipeline funnel data (ISR only)
  useEffect(() => {
    const loadFunnel = async () => {
      if (!user || (user.role !== 'ISR' && !isAdmin)) return;
      setFunnelLoading(true);
      try {
        const res = await api.get(`/campaigns/reports/pipeline-funnel?period=${funnelPeriod}`);
        setFunnelData(res.data);
      } catch (error) {
        console.error('Error loading pipeline funnel:', error);
      } finally {
        setFunnelLoading(false);
      }
    };
    loadFunnel();
  }, [user, isAdmin, funnelPeriod]);

  const formatBusinessAmount = (amount) => {
    const num = Number(amount);
    if (!num || isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      NEW: '#3b82f6',          // Bright Blue
      INTERESTED: '#22c55e',   // Bright Green
      NOT_INTERESTED: '#ef4444', // Bright Red
      NOT_REACHABLE: '#f59e0b', // Bright Amber
      WRONG_NUMBER: '#ec4899',  // Bright Pink
      CALL_LATER: '#f97316'    // Bright Orange
    };
    return colors[status] || '#64748b';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'INTERESTED':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'NOT_INTERESTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'NOT_REACHABLE':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'WRONG_NUMBER':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'CALL_LATER':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Admin dashboard - View user dashboards
  if (isAdmin) {
    // If a user is selected and data is loaded, show their dashboard
    const showUserDashboard = selectedUserId && dashboardData && !isLoading;

    return (
      <div>
        {/* Header with dropdowns */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-[18px]">View team dashboards by selecting a user below.</p>
        </div>

        {/* Business Overview Section */}
        {businessOverviewLoading ? (
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
                  <CardContent className="p-5">
                    <div className="animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-3"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : businessOverview && (
          <div className="mb-8 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                color="teal"
                icon={Truck}
                label="Delivered Amount"
                value={formatBusinessAmount(businessOverview.totalDeliveredAmount)}
              />
              <StatCard
                color="amber"
                icon={Receipt}
                label="Total Bills Generated"
                value={formatBusinessAmount(businessOverview.totalBillsGenerated)}
              />
              <StatCard
                color="emerald"
                icon={DollarSign}
                label="Total Amount Collected"
                value={formatBusinessAmount(businessOverview.totalCollected)}
              />
            </div>

            {/* Customer Breakdown Table */}
            <DataTable
              title="Business Pipeline"
              totalCount={businessOverview.customers?.length}
              columns={[
                { key: 'company', label: 'Customer' },
                { key: 'contactName', label: 'Contact' },
                { key: 'phone', label: 'Phone' },
                {
                  key: 'deliveredAmount',
                  label: 'Delivered Amount',
                  render: (row) => row.isDelivered ? (
                    <span className="font-medium text-teal-600 dark:text-teal-400">
                      {formatBusinessAmount(row.quotationAmount)}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-sm">Not delivered</span>
                  )
                },
                {
                  key: 'billsGenerated',
                  label: 'Bills Generated',
                  render: (row) => (
                    <span className={`font-medium ${row.billsGenerated > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {row.billsGenerated > 0 ? formatBusinessAmount(row.billsGenerated) : '-'}
                    </span>
                  )
                },
                {
                  key: 'amountCollected',
                  label: 'Collected',
                  render: (row) => (
                    <span className={`font-medium ${row.amountCollected > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {row.amountCollected > 0 ? formatBusinessAmount(row.amountCollected) : '-'}
                    </span>
                  )
                },
                {
                  key: 'outstanding',
                  label: 'Outstanding',
                  render: (row) => {
                    const outstanding = row.billsGenerated - row.amountCollected;
                    return (
                      <span className={`font-medium ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {outstanding > 0 ? formatBusinessAmount(outstanding) : '-'}
                      </span>
                    );
                  }
                },
              ]}
              data={businessOverview.customers || []}
              searchable
              searchPlaceholder="Search by company, contact or phone..."
              searchKeys={['company', 'contactName', 'phone']}
              pagination
              defaultPageSize={10}
              emptyMessage="No quotations found"
            />
          </div>
        )}

      </div>
    );
  }

  // BDM Dashboard
  if (isBDM) {
    const stats = bdmDashboardStats?.summary || {};
    const todayStats = bdmDashboardStats?.todayStats || {};
    const weekStats = bdmDashboardStats?.weekStats || {};
    const monthStats = bdmDashboardStats?.monthStats || {};
    const followUpSchedule = bdmDashboardStats?.followUpSchedule || { overdue: 0, upcoming: [] };
    const recentActivity = bdmDashboardStats?.recentActivity || [];
    const campaignStats = bdmDashboardStats?.campaignStats || [];

    // Status distribution for pie chart
    const statusData = [
      { name: 'New', value: stats.newLeads || 0, color: '#3b82f6' },
      { name: 'Qualified', value: stats.qualified || 0, color: '#10b981' },
      { name: 'Feasible', value: stats.feasible || 0, color: '#14b8a6' },
      { name: 'Not Feasible', value: stats.notFeasible || 0, color: '#f97316' },
      { name: 'Follow Up', value: stats.followUp || 0, color: '#f59e0b' },
      { name: 'Dropped', value: stats.dropped || 0, color: '#ef4444' },
    ].filter(item => item.value > 0);

    const getStatusBadgeClass = (status) => _getStatusBadgeClass(status, LEAD_STATUS_CONFIG);

    if (bdmDashboardLoading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      );
    }

    // Get dashboard stats from API response
    const dashStats = bdmDashboardStats?.dashboardStats || {};

    // Format currency for stat cards
    const formatCurrency = (amount) => {
      const num = Number(amount);
      if (!num || isNaN(num)) return '₹0';
      if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
      if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
      if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
      return `₹${num.toLocaleString('en-IN')}`;
    };

    const selectedBDMName = selectedBDMUser
      ? bdmUsers.find(u => u.id === selectedBDMUser)?.name
      : null;

    return (
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-0.5 tracking-wide">Dashboard</p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedBDMName ? `${selectedBDMName}'s Dashboard` : `Welcome back, ${user?.name?.split(' ')[0] || 'BDM'}`}
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {selectedBDMName ? 'Viewing team member\'s performance' : 'Here\'s your performance overview'}
            </p>
            {/* BDM Selector for Team Leader */}
            {isTL && (
              <div className="mt-2">
                <select
                  value={selectedBDMUser}
                  onChange={(e) => setSelectedBDMUser(e.target.value)}
                  className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[200px]"
                >
                  <option value="">My Dashboard</option>
                  {bdmUsers.map((bdm) => (
                    <option key={bdm.id} value={bdm.id}>{bdm.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mobile: dropdown select */}
          <select
            value={bdmPeriod}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setShowCustomDatePicker(true);
                setBdmPeriod('custom');
              } else {
                setBdmPeriod(e.target.value);
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
                    setBdmPeriod(opt.value);
                    setShowCustomDatePicker(false);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                    bdmPeriod === opt.value && !showCustomDatePicker
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
                  if (!showCustomDatePicker) setBdmPeriod('custom');
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${
                  showCustomDatePicker || bdmPeriod === 'custom'
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
                  value={bdmFromDate}
                  onChange={(e) => setBdmFromDate(e.target.value)}
                  className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={bdmToDate}
                  onChange={(e) => setBdmToDate(e.target.value)}
                  className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Pipeline Stats (Row 1) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {[
            { label: `Login (${dashStats.loginCount || 0})`, value: formatCurrency(dashStats.loginAmount), icon: LogIn, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-950/40', iconText: 'text-cyan-600 dark:text-cyan-400', link: '/dashboard/pipeline-arc?stage=login' },
            { label: `PO Received (${dashStats.poReceivedCount || 0})`, value: formatCurrency(dashStats.poReceivedAmount), icon: Receipt, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400', link: '/dashboard/pipeline-arc?stage=po' },
            { label: `Installation Done (${dashStats.installDoneCount || 0})`, value: formatCurrency(dashStats.installDoneAmount), icon: Wrench, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-950/40', iconText: 'text-amber-600 dark:text-amber-400', link: '/dashboard/pipeline-arc?stage=install' },
            { label: `Customer Accept (${dashStats.custAcceptCount || 0})`, value: formatCurrency(dashStats.custAcceptAmount), icon: UserCheck, borderColor: 'border-l-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400', link: '/dashboard/pipeline-arc?stage=accept' },
            { label: `FTB Received (${dashStats.ftbCount || 0})`, value: formatCurrency(dashStats.ftbAmount), icon: Banknote, borderColor: 'border-l-green-500', iconBg: 'bg-green-100 dark:bg-green-950/40', iconText: 'text-green-600 dark:text-green-400', link: '/dashboard/pipeline-arc?stage=ftb' },
          ].map((stat, i) => (
            <Card
              key={i}
              className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group`}
              onClick={() => router.push(stat.link)}
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
            { label: 'Meetings Done', value: dashStats.meetingsDone || 0, icon: CalendarCheck, borderColor: 'border-l-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconText: 'text-cyan-600 dark:text-cyan-400', link: '/dashboard/bdm-meetings' },
            { label: 'Funnel Value', value: formatCurrency(dashStats.totalFunnelValue), icon: DollarSign, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
          ].map((stat, i) => (
            <Card
              key={i}
              className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 ${stat.link ? 'cursor-pointer group' : ''}`}
              onClick={stat.link ? () => router.push(stat.link) : undefined}
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
            {bdmMeetings && bdmMeetings.length > 5 && (
              <button
                onClick={() => router.push('/dashboard/bdm-meetings')}
                className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors flex items-center gap-1"
              >
                View More
                <ArrowRight size={14} />
              </button>
            )}
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
                          onClick={() => router.push('/dashboard/bdm-meetings')}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
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
                <div
                  onClick={() => router.push('/dashboard/bdm-follow-ups?filter=overdue')}
                  className="mx-4 mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
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
                        onClick={() => router.push(`/dashboard/bdm-follow-ups?date=${item.date}`)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
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
              {/* View All Link */}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => router.push('/dashboard/bdm-follow-ups')}
                  className="w-full text-center text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                >
                  View All Follow-ups →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    );
  }

  // Feasibility Team Dashboard
  if (isFeasibilityTeam) {
    const fStats = feasibilityStats || {};
    const pendingLeads = feasibilityQueue || [];
    const totalReviewed = fStats.totalReviewed ?? ((fStats.totalApproved || 0) + (fStats.totalRejected || 0));
    const hasFilter = !!ftPeriod;

    const getTimeAgo = (dateString) => {
      if (!dateString) return '-';
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    function getInterestBadgeClass(interestLevel) {
      switch (interestLevel) {
        case 'HOT': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        case 'WARM': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      }
    }

    const pendingQueueColumns = [
      {
        key: 'company',
        label: 'Company',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-400 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.company}</span>
              {row.name && <p className="text-xs text-slate-500 dark:text-slate-400">{row.name}</p>}
            </div>
          </div>
        ),
      },
      {
        key: 'location',
        label: 'Location',
        render: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[180px] block">
            {row.fullAddress || row.location || row.city || '-'}
          </span>
        ),
      },
      {
        key: 'bandwidth',
        label: 'Bandwidth',
        render: (row) => row.bandwidthRequirement ? (
          <Badge className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs">
            {row.bandwidthRequirement}
          </Badge>
        ) : <span className="text-xs text-slate-400">-</span>,
      },
      {
        key: 'interest',
        label: 'Interest',
        render: (row) => row.interestLevel ? (
          <Badge className={`text-xs font-medium ${getInterestBadgeClass(row.interestLevel)}`}>
            {row.interestLevel}
          </Badge>
        ) : <span className="text-xs text-slate-400">-</span>,
      },
      {
        key: 'assigned',
        label: 'Assigned',
        render: (row) => <span className="text-sm text-slate-600 dark:text-slate-400">{getTimeAgo(row.updatedAt)}</span>,
      },
    ];

    return (
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-0.5 tracking-wide">Dashboard</p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'}
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Feasibility review progress and insights</p>
          </div>

          {/* Mobile: dropdown select */}
          <select
            value={ftPeriod || 'alltime'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'alltime') { setFtPeriod(null); setShowFtCustomDatePicker(false); }
              else if (val === 'custom') { setFtPeriod('custom'); setShowFtCustomDatePicker(true); }
              else { setFtPeriod(val); setShowFtCustomDatePicker(false); }
            }}
            className="md:hidden bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="alltime">All Time</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="last90days">Last 90 Days</option>
            <option value="custom">Custom</option>
          </select>

          {/* Desktop: button group */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => { setFtPeriod(null); setShowFtCustomDatePicker(false); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  !ftPeriod && !showFtCustomDatePicker
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                All Time
              </button>
              {[
                { value: 'last7days', label: 'Last 7 Days' },
                { value: 'last30days', label: 'Last 30 Days' },
                { value: 'last90days', label: 'Last 90 Days' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setFtPeriod(opt.value); setShowFtCustomDatePicker(false); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                    ftPeriod === opt.value && !showFtCustomDatePicker
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowFtCustomDatePicker(!showFtCustomDatePicker);
                  if (!showFtCustomDatePicker) setFtPeriod('custom');
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${
                  showFtCustomDatePicker || ftPeriod === 'custom'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <CalendarRange size={14} />
                Custom
              </button>
            </div>

            {showFtCustomDatePicker && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                <input
                  type="date"
                  value={ftFromDate}
                  onChange={(e) => setFtFromDate(e.target.value)}
                  className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={ftToDate}
                  onChange={(e) => setFtToDate(e.target.value)}
                  className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Overview Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
          {[
            { label: 'Pending Reviews', value: fStats.pending || 0, icon: Clock, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400', link: '/dashboard/feasibility-queue?tab=pending' },
            { label: hasFilter ? 'Reviewed' : 'Total Reviewed', value: totalReviewed, icon: FileText, borderColor: 'border-l-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400', link: '/dashboard/feasibility-queue?tab=approved' },
            { label: hasFilter ? 'Approved' : 'Total Approved', value: fStats.totalApproved || 0, icon: CheckCircle2, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400', link: '/dashboard/feasibility-queue?tab=approved' },
            { label: hasFilter ? 'Rejected' : 'Total Rejected', value: fStats.totalRejected || 0, icon: XCircle, borderColor: 'border-l-red-500', iconBg: 'bg-red-100 dark:bg-red-950/40', iconText: 'text-red-600 dark:text-red-400', link: '/dashboard/feasibility-queue?tab=rejected' },
            { label: 'Approval Rate', value: `${fStats.approvalRate || 0}%`, icon: TrendingUp, borderColor: 'border-l-teal-500', iconBg: 'bg-teal-100 dark:bg-teal-950/40', iconText: 'text-teal-600 dark:text-teal-400', link: '/dashboard/feasibility-queue' },
          ].map((stat, i) => (
            <Card
              key={i}
              className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 ${stat.link ? 'cursor-pointer group' : ''}`}
              onClick={stat.link ? () => router.push(stat.link) : undefined}
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

        {/* ── Today's Activity ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-1 bg-orange-500 rounded-full" />
            <h2 className="text-sm md:text-base font-bold text-foreground">Today&apos;s Activity</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[
              { label: 'REVIEWED', value: fStats.reviewedToday || 0, color: '' },
              { label: 'APPROVED', value: fStats.approvedToday || 0, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'REJECTED', value: fStats.rejectedToday || 0, color: 'text-red-600 dark:text-red-400' },
              { label: 'PENDING', value: fStats.pending || 0, color: 'text-orange-600 dark:text-orange-400' },
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

        {/* ── Pending Queue Preview ── */}
        <Card className="bg-white dark:bg-card border shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
              <div className="h-5 w-1 bg-orange-500 rounded-full" />
              Pending Queue
              {pendingLeads.length > 0 && (
                <Badge className="ml-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                  {fStats.pending || pendingLeads.length} pending
                </Badge>
              )}
            </CardTitle>
            <button
              onClick={() => router.push('/dashboard/feasibility-queue')}
              className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              View All
              <ArrowRight size={14} />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={pendingQueueColumns}
              data={pendingLeads.slice(0, 5)}
              onRowClick={() => router.push('/dashboard/feasibility-queue')}
              emptyMessage="All caught up! No pending feasibility reviews"
              emptyIcon={CheckCircle}
              className="border-0 shadow-none rounded-none bg-transparent dark:bg-transparent [&>div:first-child]:hidden"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to render the dashboard (shared between admin view and ISR view)
  // Render BDM Dashboard (for admin viewing a BDM's dashboard)
  function renderBDMDashboard() {
    // When admin views BDM, data is in dashboardData; when BDM views own, data is in bdmDashboardStats
    const bdmData = dashboardData || bdmDashboardStats || {};
    const stats = bdmData?.summary || {};
    const todayStats = bdmData?.todayStats || {};
    const followUpSchedule = bdmData?.followUpSchedule || { overdue: 0, upcoming: [] };

    // Status distribution for pie chart
    const statusData = [
      { name: 'New', value: stats.newLeads || 0, color: '#3b82f6' },
      { name: 'Qualified', value: stats.qualified || 0, color: '#10b981' },
      { name: 'Feasible', value: stats.feasible || 0, color: '#14b8a6' },
      { name: 'Not Feasible', value: stats.notFeasible || 0, color: '#f97316' },
      { name: 'Follow Up', value: stats.followUp || 0, color: '#f59e0b' },
      { name: 'Dropped', value: stats.dropped || 0, color: '#ef4444' },
    ].filter(item => item.value > 0);

    return (
      <>
        {/* Key Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard color="orange" icon={Users} label="Total Leads" value={stats.totalLeads || 0} />
          <StatCard color="emerald" icon={UserCheck} label="Qualified" value={stats.qualified || 0} />
          <StatCard color="blue" icon={Send} label="Quotations Sent" value={stats.quotationsSent || 0} />
          <StatCard color="cyan" icon={CheckCircle2} label="Feasible" value={stats.feasible || 0} />
          <StatCard color="amber" icon={FileText} label="Pending with FT" value={stats.pendingWithFT || 0} />
          <StatCard color="red" icon={AlertTriangle} label="Overdue" value={followUpSchedule.overdue || 0} />
        </div>

        {/* Lead Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <Card
            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => router.push('/dashboard/bdm-queue')}
          >
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{stats.newLeads || 0}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">In Queue</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.qualified || 0}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">Qualified</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{stats.feasible || 0}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">Feasible</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{stats.notFeasible || 0}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">Not Feasible</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{stats.followUp || 0}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">Follow Up</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">{stats.dropped || 0}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">Dropped</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Activity */}
        <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-orange-600 dark:text-orange-400" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 tracking-wide">DISPOSITIONS</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{todayStats.dispositions || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 tracking-wide">QUALIFIED</p>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{todayStats.qualified || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 tracking-wide">FEASIBLE</p>
                <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{todayStats.feasible || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 tracking-wide">FOLLOW UP</p>
                <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{todayStats.followUp || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 tracking-wide">DROPPED</p>
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">{todayStats.dropped || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Lead Status Distribution Pie Chart */}
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
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
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
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
    );
  }

  function renderUserDashboard() {
    const stats = dashboardData?.stats || {};
    const todayCallStats = dashboardData?.todayCallStats || { callsMade: 0, convertedToLead: 0, outcomes: {} };
    const statusDistribution = dashboardData?.statusDistribution || [];
    const recentActivity = dashboardData?.recentActivity || [];
    const callStats = dashboardData?.callStats || {};
    const weeklyProgress = dashboardData?.weeklyProgress || [];
    const followUpSchedule = dashboardData?.followUpSchedule || { overdue: 0, upcoming: [] };

    const mainStats = [
      { label: 'Total Data', value: stats.totalAssigned || 0, icon: ClipboardList, color: 'orange' },
      { label: 'Data Contacted', value: stats.workingData || 0, icon: Clock, color: 'blue' },
      { label: 'Pending Data', value: stats.pendingData || 0, icon: AlertCircle, color: 'amber' },
      { label: 'Converted to Lead', value: stats.convertedToLead || 0, icon: Users, color: 'emerald' },
    ];

    const pieData = statusDistribution
      .filter(item => item.status !== 'CALLED')
      .map(item => ({
        name: item.status.replace('_', ' '),
        value: item.count,
        color: getStatusColor(item.status)
      }));

    return (
      <>
        {/* Stats Grid - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {mainStats.map((stat, index) => (
            <StatCard key={index} color={stat.color} icon={stat.icon} label={stat.label} value={stat.value} />
          ))}
        </div>

        {/* Today's Call Stats */}
        <Card className="mb-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Phone size={18} className="text-orange-600 dark:text-orange-400" />
              Today's Call Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Calls Made Today */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CALLS MADE</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayCallStats.callsMade}</p>
              </div>

              {/* Converted to Lead */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CONVERTED</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayCallStats.convertedToLead}</p>
              </div>

              {/* Interested */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">INTERESTED</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayCallStats.outcomes?.interested || 0}</p>
              </div>

              {/* Not Interested */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NOT INTERESTED</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{todayCallStats.outcomes?.notInterested || 0}</p>
              </div>

              {/* Not Reachable */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NOT REACHABLE</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todayCallStats.outcomes?.notReachable || 0}</p>
              </div>

              {/* Call Later */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CALL LATER</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayCallStats.outcomes?.callLater || 0}</p>
              </div>

              {/* Wrong Number */}
              <div className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">WRONG NUMBER</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{todayCallStats.outcomes?.wrongNumber || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Phone size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">TOTAL CALLS</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{callStats.totalCalls || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <Zap size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">TODAY'S CALLS</p>
                  <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{callStats.todayCalls || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Clock size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">AVG CALL DURATION</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatDuration(callStats.avgCallDuration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Data Status Chart with Grouped Bars */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-slate-900 dark:text-white text-sm font-bold">Data Status</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {/* Summary Stats */}
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-blue-600">{stats.totalAssigned || 0}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Total Data</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-rose-600">{stats.workingData || 0}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Working</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-amber-600">{stats.convertedToLead || 0}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Converted</span>
                  </div>
                </div>
              </div>

              {/* Grouped Bar Chart */}
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyProgress} barGap={1} barCategoryGap="15%">
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={false}
                      interval={0}
                      angle={(selectedPeriod === 'yearly' || selectedPeriod === 'alltime') ? -45 : 0}
                      textAnchor={selectedPeriod === 'yearly' ? 'end' : 'middle'}
                      height={selectedPeriod === 'yearly' ? 60 : 25}
                    />
                    <YAxis
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={false}
                      allowDecimals={false}
                      width={35}
                      label={{ value: 'Records', angle: -90, position: 'insideLeft', style: { fill: '#475569', fontSize: 10, fontWeight: 600 } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                      }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '4px', fontSize: '11px', fontWeight: 600 }}
                      iconType="square"
                      iconSize={8}
                    />
                    <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="working" name="Working" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="converted" name="Converted" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {periodOptions.find(p => p.value === selectedPeriod)?.label || 'Last 7 Days'}
              </p>
            </CardContent>
          </Card>

          {/* Data Status Distribution Pie Chart */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-slate-900 dark:text-white text-sm font-bold">Data Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {pieData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                        style={{ fontSize: '11px', fontWeight: 700 }}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                        formatter={(value, name) => [`${value} records`, name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={30}
                        iconSize={8}
                        formatter={(value) => <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-slate-600 dark:text-slate-400 font-semibold text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar Chart */}
        <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 mb-8">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white text-lg">
              {selectedPeriod === 'yearly' || selectedPeriod === 'alltime' ? 'Monthly Activity Overview' : selectedPeriod === 'monthly' ? 'Weekly Activity Overview' : 'Daily Activity Overview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyProgress.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyProgress} barGap={1} barCategoryGap="15%">
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                      interval={0}
                      angle={(selectedPeriod === 'yearly' || selectedPeriod === 'alltime') ? -45 : 0}
                      textAnchor={selectedPeriod === 'yearly' ? 'end' : 'middle'}
                      height={selectedPeriod === 'yearly' ? 60 : 30}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} allowDecimals={false} label={{ value: 'Records', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 500 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="square" iconSize={10} />
                    <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="working" name="Working" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="converted" name="Converted" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown, Recent Activity, and Follow-up Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white text-lg">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusDistribution.filter(item => item.status !== 'CALLED').length > 0 ? (
                statusDistribution.filter(item => item.status !== 'CALLED').map((item, index) => {
                  const total = stats.totalAssigned || 1;
                  const percentage = Math.round((item.count / total) * 100);
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm w-28 truncate">{item.status.replace('_', ' ')}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: getStatusColor(item.status) }} />
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 text-sm w-12 text-right">{item.count}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-white text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 bg-orange-600">
                      <AvatarFallback className="bg-transparent text-white font-semibold text-sm">{activity.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{activity.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{activity.company || 'No company'}</p>
                    </div>
                    <Badge className={getStatusBadgeClass(activity.status)}>{activity.status?.replace('_', ' ')}</Badge>
                    <span className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{formatDate(activity.updatedAt)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>

          {/* Follow-up Schedule */}
          <Card className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Calendar size={18} className="text-orange-600 dark:text-orange-400" />
                Follow-up Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Overdue Alert */}
              {followUpSchedule.overdue > 0 && (
                <div
                  onClick={() => router.push('/dashboard/follow-ups?filter=overdue')}
                  className="mx-4 mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Overdue</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{followUpSchedule.overdue}</span>
                  </div>
                </div>
              )}
              {/* 7-Day Schedule Table */}
              <div className="overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {followUpSchedule.upcoming.map((item, index) => (
                      <tr
                        key={index}
                        onClick={() => router.push(`/dashboard/follow-ups?date=${item.date}`)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
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
              {/* View All Link */}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => router.push('/dashboard/follow-ups')}
                  className="w-full text-center text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                >
                  View All Follow-ups →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // ISR Dashboard
  const stats = dashboardData?.stats || {};
  const todayCallStats = dashboardData?.todayCallStats || { callsMade: 0, convertedToLead: 0, outcomes: {} };
  const statusDistribution = dashboardData?.statusDistribution || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const callStats = dashboardData?.callStats || {};
  const weeklyProgress = dashboardData?.weeklyProgress || [];
  const followUpSchedule = dashboardData?.followUpSchedule || { overdue: 0, upcoming: [] };

  const mainStats = [
    { label: 'Total Assigned Data', value: stats.totalAssigned || 0, icon: ClipboardList, color: 'orange' },
    { label: 'Working Data', value: stats.workingData || 0, icon: Clock, color: 'blue' },
    { label: 'Pending Data', value: stats.pendingData || 0, icon: AlertCircle, color: 'amber' },
    { label: 'Converted to Lead', value: stats.convertedToLead || 0, icon: Users, link: '/dashboard/leads', color: 'emerald' },
  ];

  // Prepare pie chart data
  const pieData = statusDistribution
    .filter(item => item.status !== 'CALLED')
    .map(item => ({
      name: item.status.replace('_', ' '),
      value: item.count,
      color: getStatusColor(item.status)
    }));

  const totalOutcomes = todayCallStats.callsMade || 1;

  const outcomeItems = [
    { label: 'Interested', value: todayCallStats.outcomes?.interested || 0, dotBg: 'bg-emerald-500/10', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
    { label: 'Not Interested', value: todayCallStats.outcomes?.notInterested || 0, dotBg: 'bg-red-500/10', dot: 'bg-red-500', bar: 'bg-red-500' },
    { label: 'Not Reachable', value: todayCallStats.outcomes?.notReachable || 0, dotBg: 'bg-amber-500/10', dot: 'bg-amber-500', bar: 'bg-amber-500' },
    { label: 'Call Later', value: todayCallStats.outcomes?.callLater || 0, dotBg: 'bg-orange-500/10', dot: 'bg-orange-500', bar: 'bg-orange-500' },
    { label: 'Wrong Number', value: todayCallStats.outcomes?.wrongNumber || 0, dotBg: 'bg-red-400/10', dot: 'bg-red-400', bar: 'bg-red-400' },
  ];

  const stageColorMap = {
    assignedBDM: 'bg-blue-500', feasible: 'bg-indigo-500', quoteSent: 'bg-violet-500',
    docsUpload: 'bg-orange-500', docsReview: 'bg-fuchsia-500', accountsReview: 'bg-pink-500',
    pushToDelivery: 'bg-orange-500', atNOC: 'bg-amber-500', installed: 'bg-lime-500',
    live: 'bg-emerald-500', dropped: 'bg-red-500'
  };

  const totalAssigned = stats.totalAssigned || 0;
  const working = stats.workingData || 0;
  const pending = stats.pendingData || 0;
  const converted = stats.convertedToLead || 0;
  const _todayCalls = callStats.todayCalls || 0;
  const todayConverted = todayCallStats.convertedToLead || 0;
  const workingPct = totalAssigned > 0 ? Math.round((working / totalAssigned) * 100) : 0;
  const convPct = totalAssigned > 0 ? Math.round((converted / totalAssigned) * 100) : 0;
  const pendingPct = totalAssigned > 0 ? Math.round((pending / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-0.5 tracking-wide">Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Welcome back, {user?.name?.split(' ')[0] || 'ISR'}
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Here&apos;s your work progress and insights.</p>
        </div>
        {/* Mobile: dropdown select */}
        <div className="md:hidden flex flex-col gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} className="flex-1 bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 text-xs text-foreground" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} className="flex-1 bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 text-xs text-foreground" />
            </div>
          )}
        </div>
        {/* Desktop: button group */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm">
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  selectedPeriod === opt.value
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Overview Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {[
          { label: 'Total Data', value: totalAssigned, icon: ClipboardList, color: 'orange', borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
          { label: 'Data Contacted', value: working, icon: Clock, color: 'blue', borderColor: 'border-l-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400' },
          { label: 'Pending Data', value: pending, icon: AlertCircle, color: 'amber', borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-950/40', iconText: 'text-amber-600 dark:text-amber-400' },
          { label: 'Converted to Lead', value: converted, icon: Users, link: '/dashboard/leads', color: 'emerald', borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400' },
        ].map((stat, i) => (
          <Card
            key={i}
            className={`rounded-xl md:rounded-2xl bg-white dark:bg-card border border-l-4 ${stat.borderColor} shadow-sm hover:shadow-lg transition-all duration-200 ${stat.link ? 'cursor-pointer group' : ''}`}
            onClick={stat.link ? () => router.push(stat.link) : undefined}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-bold mt-0.5 md:mt-1 tracking-tight">{(stat.value || 0).toLocaleString()}</p>
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

      {/* ── Call Activity Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-1 bg-orange-500 rounded-full" />
          <h2 className="text-sm md:text-base font-bold text-foreground">Today&apos;s Call Activity</h2>
        </div>

        {/* Top row: Calls Made, Avg Duration */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3">
          <Card className="rounded-lg bg-white dark:bg-card border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Calls Made</p>
                  <p className="text-xl md:text-2xl font-bold mt-0.5">{todayCallStats.callsMade}</p>
                </div>
                <div className="h-7 w-7 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                  <Phone className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg bg-white dark:bg-card border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg Duration</p>
                  <p className="text-xl md:text-2xl font-bold mt-0.5">{formatDuration(callStats.avgCallDuration)}</p>
                </div>
                <div className="h-7 w-7 rounded-lg bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outcome stat boxes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-3">
          {[
            { label: 'Interested', value: todayCallStats.outcomes?.interested || 0, icon: CheckCircle2, bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Not Interested', value: todayCallStats.outcomes?.notInterested || 0, icon: XCircle, bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
            { label: 'Not Reachable', value: todayCallStats.outcomes?.notReachable || 0, icon: PhoneOff, bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
            { label: 'Call Later', value: todayCallStats.outcomes?.callLater || 0, icon: Clock, bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400' },
            { label: 'Wrong Number', value: todayCallStats.outcomes?.wrongNumber || 0, icon: PhoneMissed, bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-500 dark:text-red-400' },
          ].map((item) => (
            <Card key={item.label} className="rounded-lg bg-white dark:bg-card border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className={`text-xl md:text-2xl font-bold mt-0.5 ${item.text}`}>{item.value}</p>
                  </div>
                  <div className={`h-7 w-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`h-3.5 w-3.5 ${item.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Outcome breakdown — compact horizontal bars */}
        <Card className="rounded-lg bg-white dark:bg-card border shadow-sm">
          <CardContent className="p-3 md:p-4">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Call Outcomes</p>
            <div className="border-t border-border mb-3" />
            <div className="flex gap-3">
              {/* Labels column */}
              <div className="w-1/3 flex-shrink-0 space-y-2">
                {outcomeItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 h-6">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.dot}`} />
                    <span className="text-base font-bold text-foreground truncate">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              {/* Bars column */}
              <div className="flex-1 space-y-2">
                {outcomeItems.map((item) => {
                  const pct = totalOutcomes > 0 ? Math.round((item.value / totalOutcomes) * 100) : 0;
                  return (
                    <div key={item.label} className="flex items-center h-6">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.bar} transition-all duration-700`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              {/* Values column */}
              <div className="flex-shrink-0 space-y-2">
                {outcomeItems.map((item) => {
                  const pct = totalOutcomes > 0 ? Math.round((item.value / totalOutcomes) * 100) : 0;
                  return (
                    <div key={item.label} className="flex items-center gap-2 h-6">
                      <span className="text-sm font-bold w-8 text-right">{item.value}</span>
                      <span className="text-xs font-medium text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <hr className="my-6 md:my-8 border-slate-200 dark:border-slate-800" />

      {/* ── Analytics ── */}
      <div>
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
          <div className="h-6 md:h-8 w-1 bg-orange-500 rounded-full" />
          <h2 className="text-base md:text-xl font-bold text-foreground">Analytics</h2>
        </div>
        <div className="grid grid-cols-12 gap-3 md:gap-5">
          {/* Data Status Bar Chart */}
          <Card className="col-span-12 lg:col-span-6 rounded-xl md:rounded-2xl bg-white dark:bg-card border shadow-sm hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-0 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg font-bold">Data Status</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{periodOptions.find(p => p.value === selectedPeriod)?.label}</p>
                </div>
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-3 md:pt-4">
              <div className="h-[220px] md:h-[300px]">
                {weeklyProgress.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyProgress} barGap={2} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#1f2937', fontSize: 14, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={(selectedPeriod === 'yearly' || selectedPeriod === 'alltime') ? -45 : 0}
                        textAnchor={selectedPeriod === 'yearly' ? 'end' : 'middle'}
                        height={selectedPeriod === 'yearly' ? 60 : 35}
                      />
                      <YAxis tick={{ fill: '#1f2937', fontSize: 14, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255,255,255,0.98)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px -5px rgb(0 0 0 / 0.12)',
                          padding: '12px 16px',
                        }}
                        cursor={{ fill: 'rgba(139,92,246,0.06)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '14px', fontWeight: 700, fontSize: '15px' }} iconType="circle" iconSize={12} />
                      <Bar dataKey="total" name="Total" fill="#f97316" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="working" name="Working" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution Donut */}
          <Card className="col-span-12 lg:col-span-6 rounded-xl md:rounded-2xl bg-white dark:bg-card border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
            <CardHeader className="pb-0 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg font-bold">Status Distribution</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Breakdown of all data statuses</p>
                </div>
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                  <Target className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-3 md:pt-4">
              {pieData.length > 0 ? (
                <div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                    <div className="h-[180px] md:h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius="45%"
                            outerRadius="75%"
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255,255,255,0.98)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 10px 40px -5px rgb(0 0 0 / 0.12)',
                              padding: '12px 16px',
                            }}
                            formatter={(value, name) => [`${value} records`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Custom legend outside the box */}
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4 md:mt-5">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[180px] md:h-[240px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <hr className="my-6 md:my-8 border-slate-200 dark:border-slate-800" />

      {/* ── Activity: Status / Recent / Follow-ups ── */}
      <div>
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
          <div className="h-6 md:h-8 w-1 bg-orange-500 rounded-full" />
          <h2 className="text-base md:text-xl font-bold text-foreground">Activity</h2>
        </div>
        <div className="grid grid-cols-12 gap-3 md:gap-5">
          {/* Recent Activity */}
          <Card className="col-span-12 lg:col-span-6 rounded-xl md:rounded-2xl bg-white dark:bg-card border shadow-sm hover:shadow-lg transition-all duration-200">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg font-bold">Recent Activity</CardTitle>
                <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg md:rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-1 md:pt-2 space-y-0.5 md:space-y-1">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between px-2 md:px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <Avatar className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white font-semibold text-[10px] md:text-xs">
                          {activity.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs md:text-sm font-semibold truncate">{activity.name}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{activity.company || 'No company'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 md:gap-1 flex-shrink-0 ml-2 md:ml-3">
                      <Badge className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 ${getStatusBadgeClass(activity.status)}`}>
                        {activity.status?.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] md:text-xs text-muted-foreground">{formatDate(activity.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6 md:py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>

          {/* Follow-up Schedule */}
          <Card className="col-span-12 lg:col-span-6 rounded-xl md:rounded-2xl bg-white dark:bg-card border shadow-sm hover:shadow-lg transition-all duration-200">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg font-bold">Follow-up Schedule</CardTitle>
                <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg md:rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                  <CalendarCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {followUpSchedule.overdue > 0 && (
                <div
                  onClick={() => router.push('/dashboard/follow-ups?filter=overdue')}
                  className="mx-4 md:mx-6 mb-2 md:mb-3 p-2.5 md:p-3.5 rounded-lg md:rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 md:h-8 md:w-8 rounded-md md:rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-red-600 dark:text-red-400">Overdue</span>
                    </div>
                    <span className="text-base md:text-lg font-bold text-red-600 dark:text-red-400">{followUpSchedule.overdue}</span>
                  </div>
                </div>
              )}
              <div className="overflow-hidden">
                {followUpSchedule.upcoming.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => router.push(`/dashboard/follow-ups?date=${item.date}`)}
                    className={`flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors ${
                      index !== followUpSchedule.upcoming.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <span className={`text-xs md:text-sm ${
                      item.day === 'Today' ? 'font-bold text-orange-600 dark:text-orange-400' :
                      item.day === 'Tomorrow' ? 'font-semibold text-foreground' : 'text-muted-foreground font-medium'
                    }`}>
                      {item.day}
                    </span>
                    <span className={`inline-flex items-center justify-center min-w-[22px] md:min-w-[28px] h-6 md:h-7 px-1.5 md:px-2 rounded-full text-[10px] md:text-xs font-bold ${
                      item.count > 0
                        ? item.day === 'Today'
                          ? 'bg-orange-600 text-white shadow-sm shadow-orange-200'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        : 'bg-gray-100 dark:bg-muted text-muted-foreground'
                    }`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 md:px-6 py-2.5 md:py-3.5 border-t">
                <button
                  onClick={() => router.push('/dashboard/follow-ups')}
                  className="w-full text-center text-xs md:text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                >
                  View All Follow-ups →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <hr className="my-6 md:my-8 border-slate-200 dark:border-slate-800" />

      {/* ── Lead Pipeline ── */}
      <div>
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-6 md:h-8 w-1 bg-orange-500 rounded-full" />
            <h2 className="text-base md:text-xl font-bold text-foreground">Lead Pipeline</h2>
          </div>
          {/* Mobile: dropdown */}
          <select
            value={funnelPeriod}
            onChange={(e) => setFunnelPeriod(e.target.value)}
            className="md:hidden bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="this_week">Week</option>
            <option value="this_month">Month</option>
            <option value="this_quarter">Quarter</option>
          </select>
          {/* Desktop: button group */}
          <div className="hidden md:flex items-center bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-sm">
            {[
              { value: 'this_week', label: 'Week' },
              { value: 'this_month', label: 'Month' },
              { value: 'this_quarter', label: 'Quarter' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFunnelPeriod(opt.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  funnelPeriod === opt.value
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {funnelLoading ? (
          <div className="flex items-center justify-center h-24 md:h-32">
            <div className="h-6 w-6 md:h-8 md:w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
          </div>
        ) : funnelData ? (
          <Card className="rounded-xl md:rounded-2xl bg-white dark:bg-card border shadow-sm hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Pipeline Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                {[
                  { label: 'Converted', value: funnelData.totalConverted, icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-950/40', iconText: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Live', value: funnelData.liveCount, icon: CheckCircle, iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'True Conv%', value: `${funnelData.trueConversionRate}%`, icon: Target, iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconText: 'text-orange-600 dark:text-orange-400' },
                  { label: 'Dropped', value: funnelData.droppedCount, icon: XCircle, iconBg: 'bg-red-100 dark:bg-red-950/40', iconText: 'text-red-600 dark:text-red-400' },
                ].map((stat, i) => (
                  <div key={i} className="p-3 md:p-4 rounded-lg md:rounded-xl bg-gray-50/80 dark:bg-muted/30 border">
                    <div className="flex items-start justify-between">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <div className={`h-7 w-7 md:h-10 md:w-10 rounded-lg md:rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                        <stat.icon className={`h-3.5 w-3.5 md:h-5 md:w-5 ${stat.iconText}`} />
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold mt-0.5 md:mt-1 tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Pipeline Distribution */}
              {funnelData.stages.length > 0 && (
                <div className="border-t pt-4 md:pt-6">
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 md:mb-4">
                    Where are {funnelData.totalConverted} leads right now
                  </p>
                  <div className="space-y-2.5 md:space-y-3.5">
                    {funnelData.stages.map((stage) => (
                      <div key={stage.stage} className="flex items-center gap-2 md:gap-4">
                        <div className="w-20 md:w-28 flex-shrink-0">
                          <span className="text-xs md:text-sm font-semibold">{stage.label}</span>
                        </div>
                        <div className="flex-1 h-4 md:h-5 bg-gray-100 dark:bg-muted rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full ${stageColorMap[stage.stage] || 'bg-gray-400'} transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max(stage.percentage, 3)}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-[10px] md:text-xs font-bold ${stage.percentage > 35 ? 'text-white' : 'text-foreground'}`}>
                              {stage.count} ({stage.percentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl md:rounded-2xl bg-white dark:bg-card border shadow-sm">
            <CardContent className="py-8 md:py-12 text-center text-muted-foreground text-sm">
              No pipeline data available for this period
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
