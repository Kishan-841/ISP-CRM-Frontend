'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useVendorStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import CreateVendorModal from '@/components/CreateVendorModal';
import { PageHeader } from '@/components/PageHeader';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Handshake,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  Percent,
} from 'lucide-react';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { formatDate } from '@/lib/formatters';

const STATUS_CONFIG = {
  PENDING_ADMIN: { label: 'Pending Admin', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  PENDING_ACCOUNTS: { label: 'Pending Accounts', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function ChannelPartnersPage() {
  const { user } = useAuthStore();
  const { hasAnyRole } = useRoleCheck();
  const { vendors, fetchVendors, isLoading } = useVendorStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCP, setSelectedCP] = useState(null);

  const canAccess = hasAnyRole('SUPER_ADMIN', 'ACCOUNTS_TEAM', 'SALES_DIRECTOR', 'MASTER');

  const loadData = useCallback(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  // Filter to only Channel Partners
  const channelPartners = (vendors || []).filter(v => v.category === 'CHANNEL_PARTNER');

  const filteredPartners = channelPartners.filter(cp => {
    const matchesSearch = !search || [cp.companyName, cp.contactPerson, cp.email, cp.phone]
      .filter(Boolean).some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || cp.approvalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: channelPartners.length,
    approved: channelPartners.filter(c => c.approvalStatus === 'APPROVED').length,
    pending: channelPartners.filter(c => ['PENDING_ADMIN', 'PENDING_ACCOUNTS'].includes(c.approvalStatus)).length,
    rejected: channelPartners.filter(c => c.approvalStatus === 'REJECTED').length,
  };

  if (!canAccess) return null;

  const columns = [
    {
      key: 'companyName',
      label: 'Partner Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            {row.vendorType === 'INDIVIDUAL' ? <User size={14} className="text-purple-600" /> : <Building2 size={14} className="text-purple-600" />}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{row.companyName}</p>
            {row.contactPerson && <p className="text-xs text-slate-500">{row.contactPerson}</p>}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.phone && <p className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><Phone size={11} />{row.phone}</p>}
          {row.email && <p className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><Mail size={11} />{row.email}</p>}
        </div>
      )
    },
    {
      key: 'commissionPercentage',
      label: 'Commission',
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
          <Percent size={11} />
          {row.commissionPercentage || 0}%
        </span>
      )
    },
    {
      key: 'approvalStatus',
      label: 'Status',
      render: (row) => {
        const conf = STATUS_CONFIG[row.approvalStatus] || STATUS_CONFIG.PENDING_ADMIN;
        return <Badge className={`${conf.color} border-0 text-xs`}>{conf.label}</Badge>;
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Channel Partners"
        subtitle="Manage channel partner registrations and approvals"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-medium">Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 uppercase font-medium">Approved</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase font-medium">Pending</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 uppercase font-medium">Rejected</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Create */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partners..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="PENDING_ADMIN">Pending Admin</option>
            <option value="PENDING_ACCOUNTS">Pending Accounts</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          Add Channel Partner
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredPartners}
        loading={isLoading}
        emptyMessage="No channel partners found"
        emptyIcon={Handshake}
      />

      {/* Create Modal */}
      <CreateVendorModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadData}
        defaultCategory="CHANNEL_PARTNER"
      />
    </div>
  );
}
