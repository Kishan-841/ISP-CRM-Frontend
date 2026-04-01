'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { formatDate, formatCurrency } from '@/lib/formatters';
import StatCard from '@/components/StatCard';
import {
  Search,
  Handshake,
  TrendingUp,
  DollarSign,
  Users,
  Percent,
} from 'lucide-react';

const STAGE_COLORS = {
  'New': 'bg-slate-100 text-slate-700',
  'Follow Up': 'bg-blue-100 text-blue-700',
  'Meeting': 'bg-amber-100 text-amber-700',
  'Qualified': 'bg-cyan-100 text-cyan-700',
  'Feasible': 'bg-teal-100 text-teal-700',
  'OPS Pending': 'bg-orange-100 text-orange-700',
  'OPS Approved': 'bg-emerald-100 text-emerald-700',
  'Installation': 'bg-indigo-100 text-indigo-700',
  'Delivery Completed': 'bg-green-100 text-green-700',
  'Active Plan': 'bg-emerald-200 text-emerald-800',
  'Dropped': 'bg-red-100 text-red-700',
};

export default function CPLeadsPage() {
  const { user } = useAuthStore();
  const { hasAnyRole } = useRoleCheck();

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalARC: 0, totalCommission: 0 });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch CP vendors for filter
  const [cpVendors, setCPVendors] = useState([]);
  const [selectedCP, setSelectedCP] = useState('');

  const canAccess = hasAnyRole('SUPER_ADMIN', 'SALES_DIRECTOR', 'BDM_TEAM_LEADER', 'MASTER');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.append('search', search);
      if (selectedCP) params.append('cpVendorId', selectedCP);
      const res = await api.get(`/leads/cp-leads?${params}`);
      setLeads(res.data.leads || []);
      setStats(res.data.stats || {});
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error('Failed to fetch CP leads:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCP]);

  const fetchCPVendors = async () => {
    try {
      const res = await api.get('/vendors/channel-partners');
      setCPVendors(Array.isArray(res.data) ? res.data : res.data.vendors || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (canAccess) { fetchData(); fetchCPVendors(); }
  }, [canAccess, fetchData]);

  useEffect(() => { setPage(1); }, [search, selectedCP]);

  if (!canAccess) return null;

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{row.company}</p>
          <p className="text-xs text-slate-500">{row.name} {row.phone && `| ${row.phone}`}</p>
        </div>
      )
    },
    {
      key: 'cpVendor',
      label: 'Channel Partner',
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
          {row.cpVendor}
        </span>
      )
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (row) => (
        <Badge className={`${STAGE_COLORS[row.stage] || 'bg-slate-100 text-slate-700'} border-0 text-[11px]`}>
          {row.stage}
        </Badge>
      )
    },
    {
      key: 'arcAmount',
      label: 'ARC',
      render: (row) => <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.arcAmount ? formatCurrency(row.arcAmount) : '-'}</span>
    },
    {
      key: 'cpPercent',
      label: 'CP %',
      render: (row) => (
        <span className="inline-flex items-center gap-0.5 text-sm font-bold text-purple-700 dark:text-purple-400">
          {row.cpPercent}%
        </span>
      )
    },
    {
      key: 'cpCommission',
      label: 'CP Commission',
      render: (row) => (
        <span className={`text-sm font-semibold ${row.cpCommission > 0 ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400'}`}>
          {row.cpCommission > 0 ? formatCurrency(row.cpCommission) : '-'}
        </span>
      )
    },
    {
      key: 'capex',
      label: 'CAPEX',
      render: (row) => <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{row.capex > 0 ? `₹${row.capex.toLocaleString('en-IN')}` : '-'}</span>
    },
    {
      key: 'opex',
      label: 'OPEX',
      render: (row) => <span className="text-xs text-orange-700 dark:text-orange-400 font-medium">{row.opex > 0 ? `₹${row.opex.toLocaleString('en-IN')}` : '-'}</span>
    },
    {
      key: 'netMargin',
      label: 'Net Margin',
      render: (row) => (
        <span className={`text-sm font-bold ${row.netMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {row.arcAmount ? `₹${row.netMargin.toLocaleString('en-IN')}` : '-'}
        </span>
      )
    },
    {
      key: 'assignedTo',
      label: 'BDM',
      render: (row) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.assignedTo}</span>
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Channel Partner Leads"
        subtitle="Track all CP-sourced leads, their stage, and commission breakdown"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard color="blue" icon={Users} label="Total CP Leads" value={stats.total} />
        <StatCard color="emerald" icon={DollarSign} label="Total ARC" value={formatCurrency(stats.totalARC)} />
        <StatCard color="brand" icon={Percent} label="Total CP Commission" value={formatCurrency(stats.totalCommission)} />
        <StatCard color="teal" icon={TrendingUp} label="Net After CP" value={formatCurrency(stats.totalARC - stats.totalCommission)} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, name, phone..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          />
        </div>
        <select
          value={selectedCP}
          onChange={(e) => setSelectedCP(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
        >
          <option value="">All Channel Partners</option>
          {cpVendors.map(cp => (
            <option key={cp.id} value={cp.id}>{cp.companyName} ({cp.commissionPercentage || 0}%)</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        emptyMessage="No channel partner leads found"
        emptyIcon={Handshake}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  );
}
