'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function SAMHeadVisits() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Stats
  const [stats, setStats] = useState({
    totalVisits: 0,
    completedVisits: 0,
    pendingVisits: 0,
    overdueVisits: 0,
  });

  // Data
  const [visits, setVisits] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Check authorization
  useEffect(() => {
    if (user && user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch executives for filter dropdown
  const fetchExecutives = useCallback(async () => {
    try {
      const response = await api.get('/sam/executives');
      setExecutives(response.data.executives);
    } catch (error) {
      console.error('Error fetching executives:', error);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedExecutive) params.append('executiveId', selectedExecutive);
      const response = await api.get(`/sam/visits/stats?${params}`);
      setStats({
        totalVisits: response.data.totalVisits || 0,
        completedVisits: response.data.completedVisits || 0,
        pendingVisits: response.data.pendingVisits || 0,
        overdueVisits: response.data.overdueVisits || 0,
      });
    } catch (error) {
      console.error('Error fetching visit stats:', error);
    }
  }, [selectedExecutive]);

  // Fetch visits
  const fetchVisits = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());
      if (selectedExecutive) params.append('executiveId', selectedExecutive);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/sam/visits?${params}`);
      setVisits(response.data.visits || []);
      setTotal(response.data.total || 0);
      setTotalPages(Math.ceil((response.data.total || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to load visits');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedExecutive, statusFilter, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedExecutive, statusFilter, startDate, endDate]);

  // Initial data fetch
  useEffect(() => {
    if (user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN') {
      fetchExecutives();
    }
  }, [user, fetchExecutives]);

  // Fetch visits and stats when filters/pagination change
  useEffect(() => {
    if (user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN') {
      fetchVisits();
      fetchStats();
    }
  }, [user, fetchVisits, fetchStats]);

  // Real-time refresh on socket events
  useSocketRefresh(
    useCallback(() => {
      fetchVisits();
      fetchStats();
    }, [fetchVisits, fetchStats])
  );

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Badge styles
  const getStatusBadge = (status) => {
    const styles = {
      SCHEDULED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      RESCHEDULED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[status] || styles.SCHEDULED;
  };

  const getVisitTypeBadge = (type) => {
    const styles = {
      REGULAR: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      ESCALATION: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      SALES: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      INSTALLATION: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
      MAINTENANCE: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    };
    const labels = {
      REGULAR: 'Regular',
      ESCALATION: 'Escalation',
      SALES: 'Sales',
      INSTALLATION: 'Installation',
      MAINTENANCE: 'Maintenance',
    };
    return { style: styles[type] || styles.REGULAR, label: labels[type] || type };
  };

  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ') || '-';
  };

  // Table columns
  const columns = [
    {
      key: 'visitDate',
      label: 'Date / Time',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {formatDate(row.visitDate)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatTime(row.visitDate)}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {row.customer?.campaignData?.company || '-'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {row.customer?.campaignData?.name || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'executive',
      label: 'Executive',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100">
          {row.samExecutive?.name || '-'}
        </p>
      ),
    },
    {
      key: 'visitType',
      label: 'Type',
      render: (row) => {
        const typeInfo = getVisitTypeBadge(row.visitType);
        return (
          <Badge variant="outline" className={typeInfo.style}>
            {typeInfo.label}
          </Badge>
        );
      },
    },
    {
      key: 'purpose',
      label: 'Purpose',
      render: (row) => (
        <p className="text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.purpose}>
          {row.purpose || '-'}
        </p>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant="outline" className={getStatusBadge(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
  ];

  // Filter dropdowns for DataTable
  const filterElements = (
    <>
      <select
        value={selectedExecutive}
        onChange={(e) => setSelectedExecutive(e.target.value)}
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      >
        <option value="">All Executives</option>
        {executives.map((exec) => (
          <option key={exec.id} value={exec.id}>{exec.name}</option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      >
        <option value="">All Statuses</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="RESCHEDULED">Rescheduled</option>
      </select>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        placeholder="From"
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        placeholder="To"
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      />
    </>
  );

  if (!user || (user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/sam-head')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
      </div>
      <PageHeader title="All SAM Visits" description="Monitor field visits across all SAM executives" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" icon={MapPin} label="Total Visits" value={stats.totalVisits} />
        <StatCard color="emerald" icon={CheckCircle} label="Completed" value={stats.completedVisits} />
        <StatCard color="amber" icon={Clock} label="Pending" value={stats.pendingVisits} />
        <StatCard color="red" icon={AlertTriangle} label="Overdue" value={stats.overdueVisits} />
      </div>

      {/* Visits Table */}
      <DataTable
        title="Visits"
        totalCount={total}
        columns={columns}
        data={visits}
        loading={isLoading}
        filters={filterElements}
        pagination
        serverPagination={{ page, limit: pageSize, total, totalPages }}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        emptyMessage="No visits found"
        emptySubtitle="No visits match your current filter criteria."
      />
    </>
  );
}
