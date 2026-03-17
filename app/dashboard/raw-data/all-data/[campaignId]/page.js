'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useCampaignStore } from '@/lib/store';
import DataTable from '@/components/DataTable';
import EditCampaignDataModal from '@/components/EditCampaignDataModal';
import { Badge } from '@/components/ui/badge';
import { Pencil, Phone, Mail, MapPin, Building2, User, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const STATUS_COLORS = {
  NEW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  CALLED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INTERESTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NOT_INTERESTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NOT_REACHABLE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  WRONG_NUMBER: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  CALL_LATER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  RINGING_NOT_PICKED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DND: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  DISCONNECTED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function CampaignDataDetailPage() {
  const { campaignId } = useParams();
  const { user } = useAuthStore();

  const [campaign, setCampaign] = useState(null);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch campaign info
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await api.get(`/campaigns/${campaignId}`);
        setCampaign(res.data.campaign);
      } catch (error) {
        console.error('Failed to fetch campaign:', error);
        toast.error('Failed to load campaign');
      }
    };
    fetchCampaign();
  }, [campaignId]);

  const canEdit = isAdmin || (campaign?.createdBy?.id === user?.id || campaign?.createdById === user?.id);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await api.get(`/campaigns/${campaignId}/data?${params}`);
      setData(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
      toast.error('Failed to load data');
      setData([]);
    }
    setIsLoading(false);
  }, [campaignId, page, pageSize, statusFilter]);

  useEffect(() => {
    loadData();
  }, [page, pageSize, statusFilter]);

  const formatStatus = (status) => (status || 'NEW').replace(/_/g, ' ');

  const columns = [
    {
      key: 'srNo',
      label: '#',
      render: (row, index) => {
        const start = pagination ? (pagination.page - 1) * pagination.limit : 0;
        return <span className="text-slate-500 dark:text-slate-400 text-sm">{start + index + 1}</span>;
      },
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => {
        const displayName = row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown';
        return (
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{displayName}</p>
            {row.title && <p className="text-xs text-slate-500 dark:text-slate-400">{row.title}</p>}
          </div>
        );
      },
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{row.phone || '-'}</span>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-900 dark:text-slate-100">{row.company || '-'}</p>
          {row.city && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {row.city}{row.state ? `, ${row.state}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[180px] block">{row.email || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge className={`border-0 text-xs ${STATUS_COLORS[row.status] || STATUS_COLORS.NEW}`}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px] block">
          {row.notes || '-'}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <Link href="/dashboard/raw-data/all-data" className="hover:text-orange-600 dark:hover:text-orange-400">All Data</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">{campaign?.name || 'Campaign Data'}</span>
      </div>

      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/raw-data/all-data"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {campaign?.name || 'Campaign Data'}
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 ml-[18px]">
              {campaign?.code && <span className="mr-2">{campaign.code}</span>}
              {canEdit && <span className="text-emerald-600 dark:text-emerald-400">You can edit this data</span>}
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="INTERESTED">Interested</option>
          <option value="NOT_INTERESTED">Not Interested</option>
          <option value="NOT_REACHABLE">Not Reachable</option>
          <option value="WRONG_NUMBER">Wrong Number</option>
          <option value="CALL_LATER">Call Later</option>
          <option value="RINGING_NOT_PICKED">Ringing Not Picked</option>
          <option value="DND">DND</option>
          <option value="DISCONNECTED">Disconnected</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        title="Campaign Data"
        totalCount={pagination?.total || 0}
        columns={columns}
        data={data}
        loading={isLoading}
        emptyMessage="No data found in this campaign"
        emptyIcon={User}
        emptyFilteredMessage="No data matches the selected filter"
        serverPagination={pagination ? {
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
        } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        defaultPageSize={pageSize}
        actions={canEdit ? (row) => (
          <button
            onClick={() => { setEditingData(row); setShowEditModal(true); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-colors"
            title="Edit contact details"
          >
            <Pencil size={14} />
          </button>
        ) : undefined}
      />

      {/* Edit Data Modal */}
      <EditCampaignDataModal
        data={editingData}
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingData(null); }}
        onSaved={() => loadData()}
      />
    </>
  );
}
