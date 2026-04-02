'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  PhoneIncoming,
  Clock,
  PhoneForwarded,
  Eye,
  X,
  Building2,
  User,
  Briefcase,
  Calendar,
  FileText,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';

export default function CallHistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [callLogs, setCallLogs] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    connectedCalls: 0,
    avgDuration: 0,
    callbacks: 0,
    outcomeDistribution: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  });
  const [selectedCall, setSelectedCall] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [specificDate, setSpecificDate] = useState('');

  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Redirect admin (optional - remove if admin should see this)
  // useEffect(() => {
  //   if (isAdmin) {
  //     router.push('/dashboard');
  //   }
  // }, [isAdmin, router]);

  // Fetch call history
  useEffect(() => {
    loadCallHistory();
  }, [pagination.page, pagination.limit, searchQuery, dateFilter, specificDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'specific':
        if (specificDate) {
          startDate = new Date(specificDate);
          endDate = new Date(specificDate);
          endDate.setHours(23, 59, 59);
        }
        break;
      default:
        break;
    }

    return { startDate, endDate };
  };

  const loadCallHistory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const { startDate, endDate } = getDateRange();
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }

      const response = await api.get(`/campaigns/call-history?${params}`);
      setCallLogs(response.data.callLogs || []);
      setStats(response.data.stats || {
        totalCalls: 0,
        connectedCalls: 0,
        avgDuration: 0,
        callbacks: 0,
        outcomeDistribution: {}
      });
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Failed to load call history:', error);
      toast.error('Failed to load call history');
    }
    setIsLoading(false);
  };

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    if (value !== 'specific') {
      setSpecificDate('');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'last7days': return 'Last 7 days';
      case 'last30days': return 'Last 30 days';
      case 'thisMonth': return 'This month';
      case 'thisYear': return 'This year';
      case 'specific': return specificDate || 'Selected date';
      default: return 'All time';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const outcomeConfig = {
    'INTERESTED': { label: 'Interested', color: 'bg-emerald-600', lightBg: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-400' },
    'NOT_INTERESTED': { label: 'Not Interested', color: 'bg-slate-500', lightBg: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-600 dark:text-slate-400' },
    'NOT_REACHABLE': { label: 'Not Reachable', color: 'bg-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
    'WRONG_NUMBER': { label: 'Wrong Number', color: 'bg-red-600', lightBg: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
    'CALL_LATER': { label: 'Callback', color: 'bg-teal-600', lightBg: 'bg-teal-100 dark:bg-teal-900/30', textColor: 'text-teal-700 dark:text-teal-400' },
    'RINGING_NOT_PICKED': { label: 'Ringing Not Picked', color: 'bg-orange-500', lightBg: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-400' },
    'OTHERS': { label: 'Others', color: 'bg-violet-600', lightBg: 'bg-violet-100 dark:bg-violet-900/30', textColor: 'text-violet-700 dark:text-violet-400' }
  };

  const getOutcomeBadge = (outcome) => {
    const badges = {
      'INTERESTED': { label: 'connected interested', className: 'bg-emerald-600 text-white' },
      'NOT_INTERESTED': { label: 'not interested', className: 'bg-slate-500 text-white' },
      'NOT_REACHABLE': { label: 'not reachable', className: 'bg-amber-600 text-white' },
      'WRONG_NUMBER': { label: 'wrong number', className: 'bg-red-600 text-white' },
      'CALL_LATER': { label: 'callback', className: 'bg-teal-600 text-white' },
      'CALLED': { label: 'called', className: 'bg-blue-600 text-white' },
      'RINGING_NOT_PICKED': { label: 'ringing not picked', className: 'bg-orange-500 text-white' },
      'OTHERS': { label: 'others', className: 'bg-violet-600 text-white' },
      'DND': { label: 'dnd', className: 'bg-rose-600 text-white' },
      'DISCONNECTED': { label: 'disconnected', className: 'bg-slate-600 text-white' },
      'NEW': { label: 'new', className: 'bg-orange-600 text-white' }
    };
    const badge = badges[outcome] || { label: outcome?.toLowerCase() || 'unknown', className: 'bg-slate-400 text-white' };
    return (
      <Badge className={`${badge.className} text-xs font-medium px-2 py-1`}>
        {badge.label}
      </Badge>
    );
  };

  const callHistoryColumns = [
    {
      key: 'company',
      label: 'Company',
      width: '160px',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{row.company}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '130px',
      render: (row) => (
        <span className="font-mono whitespace-nowrap">{row.phone}</span>
      ),
    },
    {
      key: 'campaign',
      label: 'Campaign',
      width: '160px',
    },
    {
      key: 'outcome',
      label: 'Outcome',
      width: '140px',
      render: (row) => getOutcomeBadge(row.outcome),
    },
    {
      key: 'products',
      label: 'Products Pitched',
      width: '200px',
      render: (row) =>
        row.products && row.products.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {row.products.map((product, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 whitespace-nowrap"
              >
                {product.title}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'duration',
      label: 'Duration',
      width: '80px',
      render: (row) => (
        <span className="whitespace-nowrap">{formatDuration(row.duration)}</span>
      ),
    },
    {
      key: 'isrName',
      label: 'ISR Name',
      width: '120px',
      render: (row) => (
        <span className="whitespace-nowrap">{row.isrName}</span>
      ),
    },
    {
      key: 'dateTime',
      label: 'Date & Time',
      width: '160px',
      render: (row) => (
        <span className="whitespace-nowrap">{formatDateTime(row.dateTime)}</span>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (row) => (
        <div className="space-y-0.5">
          {row.outcome === 'OTHERS' && row.otherReason && (
            <span className="block text-xs font-medium text-violet-600 dark:text-violet-400">Reason: {row.otherReason}</span>
          )}
          <span className="line-clamp-2" title={row.notes}>
            {row.notes || (row.outcome !== 'OTHERS' ? '-' : '')}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Call History" description="View all call records and dispositions">
        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="specific">Specific Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === 'specific' && (
            <Input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Calls</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.totalCalls}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{getDateFilterLabel()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Phone className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Connected</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.connectedCalls}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Successful connections</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <PhoneIncoming className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Duration</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.avgDuration}s
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Per call</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Callbacks</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.callbacks}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Follow-ups scheduled</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <PhoneForwarded className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Distribution */}
      {stats.totalCalls > 0 && Object.keys(stats.outcomeDistribution || {}).length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-5 w-1 bg-orange-500 rounded-full" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Outcome Distribution</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Breakdown of call outcomes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stats.outcomeDistribution)
                .filter(([outcome]) => outcome !== 'CALLED')
                .sort((a, b) => b[1] - a[1])
                .map(([outcome, count]) => {
                  const config = outcomeConfig[outcome] || {
                    label: outcome,
                    color: 'bg-slate-500',
                    lightBg: 'bg-slate-100 dark:bg-slate-800',
                    textColor: 'text-slate-600 dark:text-slate-400'
                  };
                  const percentage = ((count / stats.totalCalls) * 100).toFixed(1);

                  return (
                    <div
                      key={outcome}
                      className={`p-4 rounded-xl ${config.lightBg} transition-all hover:scale-[1.01]`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${config.textColor}`}>
                          {config.label}
                        </span>
                        <span className={`text-sm font-semibold ${config.textColor}`}>
                          {count} <span className="text-xs font-normal opacity-75">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-white/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Records Table */}
      <DataTable
        title="Call Records"
        totalCount={pagination.total}
        columns={callHistoryColumns}
        data={callLogs}
        searchable
        searchPlaceholder="Search call history..."
        onSearch={(value) => {
          setSearchQuery(value);
          setPagination(prev => ({ ...prev, page: 1 }));
        }}
        pagination
        defaultPageSize={pagination.limit}
        pageSizeOptions={[15, 25, 50, 100]}
        serverPagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
        }}
        onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
        onPageSizeChange={(newSize) => setPagination(prev => ({ ...prev, limit: newSize, page: 1 }))}
        actions={(log) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCall(log);
              setShowViewModal(true);
            }}
            className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
          >
            <Eye className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </Button>
        )}
        loading={isLoading}
        emptyMessage="No call records found"
        emptyIcon={Phone}
      />

      {/* View Call Details Modal */}
      {showViewModal && selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Call Details
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Complete information about this call
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCall(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Company & Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Company</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedCall.company}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Contact Name</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{selectedCall.name || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number</p>
                      <p className="font-mono text-slate-900 dark:text-slate-100">{selectedCall.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Campaign</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{selectedCall.campaign}</p>
                      {selectedCall.campaignCode && (
                        <p className="text-xs text-slate-500">{selectedCall.campaignCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">ISR Name</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{selectedCall.isrName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Date & Time</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(selectedCall.dateTime)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call Outcome & Duration */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Call Outcome</p>
                  {getOutcomeBadge(selectedCall.outcome)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Call Duration</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {formatDuration(selectedCall.duration)}
                  </p>
                </div>
              </div>

              {/* Products Pitched */}
              {selectedCall.products && selectedCall.products.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Products Pitched</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCall.products.map((product, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                      >
                        {product.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Notes
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedCall.notes || 'No notes recorded for this call.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCall(null);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
