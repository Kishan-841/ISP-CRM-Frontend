'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore, useCampaignStore } from '@/lib/store';
import DataTable from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Megaphone, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/formatters';

const CAMPAIGN_TYPE_COLORS = {
  CAMPAIGN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  OUTBOUND: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  INBOUND: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'SELF CREATED': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ASSIGNED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'CUSTOMER REF': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'SAM REF': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export default function AllDataPage() {
  const { user } = useAuthStore();
  const { fetchAllCampaignData, allCampaignData, allDataPagination, deleteCampaign } = useCampaignStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [initialLoad, setInitialLoad] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, campaign: null });

  const loadData = useCallback(async () => {
    if (user) {
      await fetchAllCampaignData(page, pageSize, search, 'all');
      if (initialLoad) setInitialLoad(false);
    }
  }, [user, page, pageSize, search, initialLoad]);

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async () => {
    const { campaign } = deleteConfirm;
    if (!campaign) return;
    const result = await deleteCampaign(campaign.id);
    setDeleteConfirm({ open: false, campaign: null });
    if (result.success) {
      toast.success('Campaign deleted successfully');
      loadData();
    } else {
      toast.error(result.error || 'Failed to delete campaign');
    }
  };

  // Only show loading skeleton on the very first load (no data yet)
  const showLoading = initialLoad && allCampaignData.length === 0;

  const columns = [
    {
      key: 'srNo',
      label: 'Sr No',
      render: (row, index) => {
        const startIndex = allDataPagination ? (allDataPagination.page - 1) * allDataPagination.limit : 0;
        return <span className="text-slate-500 dark:text-slate-400 text-sm">{startIndex + index + 1}</span>;
      },
    },
    {
      key: 'name',
      label: 'Campaign Name',
      render: (row) => {
        let displayName = row.name || '-';
        // Replace [Self]/[BDM Self]/[TL Self]/[SAM Self] prefix with creator's name for non-creators
        if (row.createdBy?.name && row.createdBy.id !== user?.id) {
          displayName = displayName.replace(/^\[(Self|BDM Self|TL Self|SAM Self)\]\s*/, `[${row.createdBy.name}] `);
        }
        const canView = isAdmin || row.createdBy?.id === user?.id;
        return canView ? (
          <Link href={`/dashboard/raw-data/all-data/${row.id}`} className="font-medium text-orange-600 dark:text-orange-400 hover:underline">
            {displayName}
          </Link>
        ) : (
          <span className="font-medium text-slate-900 dark:text-slate-100">{displayName}</span>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (row) => {
        let displayType = row.type;
        // Show friendly names for referral campaigns
        if (row.code === 'CUSTOMER-REFERRAL') {
          displayType = 'CUSTOMER REF';
        } else if (row.code === 'SAM-GENERATED') {
          displayType = 'SAM REF';
        } else if (row.type === 'SELF') {
          displayType = row.createdBy?.id === user?.id ? 'SELF CREATED' : 'ASSIGNED';
        }
        const typeClass = CAMPAIGN_TYPE_COLORS[displayType] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeClass}`}>
            {displayType || '-'}
          </span>
        );
      },
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-400 text-sm">{row.createdBy?.name || '-'}</span>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (row) => {
        if (!row.assignedTo || row.assignedTo.length === 0) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {row.assignedTo.map((u) => (
              <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {u.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'dataCount',
      label: 'No. of Data',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
          {row.dataCount || 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created On',
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-400 text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const isCreator = row.createdBy?.id === user?.id;
        return (
          <div className="flex items-center gap-1">
            {(isAdmin || isCreator) && (
              <Link
                href={`/dashboard/raw-data/all-data/${row.id}`}
                className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                title="View & Edit Data"
              >
                <Eye className="w-4 h-4" />
              </Link>
            )}
            {isAdmin && (
              <button
                onClick={() => setDeleteConfirm({ open: true, campaign: row })}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete campaign"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Raw Data - All Data</span>
      </div>

      {/* Page Header */}
      <PageHeader title="All Data" description="View all campaigns with their data counts" />

      {/* Data Table */}
      <DataTable
        title="All Campaigns"
        totalCount={allDataPagination?.total || 0}
        columns={columns}
        data={allCampaignData}
        searchable={true}
        searchPlaceholder="Search by campaign name..."
        onSearch={(term) => setSearch(term)}
        loading={showLoading}
        emptyMessage="No campaigns found"
        emptyIcon={Megaphone}
        emptyFilteredMessage="No campaigns match your search"
        serverPagination={allDataPagination ? {
          page: allDataPagination.page,
          totalPages: allDataPagination.totalPages,
          total: allDataPagination.total,
          limit: allDataPagination.limit,
        } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        defaultPageSize={pageSize}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => !v && setDeleteConfirm({ open: false, campaign: null })}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description={`Are you sure you want to delete "${deleteConfirm.campaign?.name}"? This will also delete all associated data and call logs. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
