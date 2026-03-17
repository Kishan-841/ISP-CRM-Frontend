'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useCampaignStore } from '@/lib/store';
import DataTable from '@/components/DataTable';
import { Database } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function AssignedSelfDataPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchAllCampaignData, allCampaignData, allDataPagination } = useCampaignStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [initialLoad, setInitialLoad] = useState(true);

  // Only ISR can access this page
  const isISR = user?.role === 'ISR';

  const loadData = useCallback(async () => {
    if (user && isISR) {
      await fetchAllCampaignData(page, pageSize, search, 'assigned_self');
      if (initialLoad) setInitialLoad(false);
    }
  }, [user, isISR, page, pageSize, search, initialLoad]);

  useEffect(() => {
    if (!isISR && user) {
      router.push('/dashboard/raw-data/all-data');
      return;
    }
    loadData();
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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
        // Replace prefix with creator name
        if (row.createdBy?.name) {
          displayName = displayName.replace(/^\[(Self|BDM Self|TL Self|SAM Self)\]\s*/, `[${row.createdBy.name}] `);
        }
        return <span className="font-medium text-slate-900 dark:text-slate-100">{displayName}</span>;
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
  ];

  if (!isISR) return null;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Raw Data - Assigned Data</span>
      </div>

      {/* Page Header */}
      <PageHeader title="Assigned Data" description="Self-generated data assigned to you by BDM or Team Leader" />

      {/* Data Table */}
      <DataTable
        title="Assigned Self Data"
        totalCount={allDataPagination?.total || 0}
        columns={columns}
        data={allCampaignData}
        searchable={true}
        searchPlaceholder="Search by campaign name..."
        onSearch={(term) => setSearch(term)}
        loading={showLoading}
        emptyMessage="No assigned data found"
        emptyIcon={Database}
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
    </>
  );
}
