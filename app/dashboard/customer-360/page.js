'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCustomer360Store } from '@/lib/store';
import { Search, ArrowRight, Download, Loader2 } from 'lucide-react';
import DataTable from '@/components/DataTable';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  CUSTOMER_360_LEAD_STATUS_CONFIG,
  CUSTOMER_360_DELIVERY_STATUS_CONFIG,
  getStatusBadgeClass,
} from '@/lib/statusConfig';

function getLeadStatusStyle(status) {
  return getStatusBadgeClass(status, CUSTOMER_360_LEAD_STATUS_CONFIG);
}

function getDeliveryStatusStyle(status) {
  if (!status) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  return getStatusBadgeClass(status, CUSTOMER_360_DELIVERY_STATUS_CONFIG, 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400');
}

function formatStatus(status) {
  if (!status) return 'N/A';
  return status.replace(/_/g, ' ');
}

export default function Customer360Page() {
  const { searchResults, searchLoading, searchPagination, searchCustomers } = useCustomer360Store();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef(null);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    const t = toast.loading('Preparing export…');
    try {
      const params = searchQuery.trim().length >= 2
        ? `?q=${encodeURIComponent(searchQuery.trim())}`
        : '';
      const response = await api.get(`/customer-360/export${params}`, {
        responseType: 'blob',
      });
      const count = response.headers?.['x-total-count'];

      // Trigger download from the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-360-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(count ? `Exported ${count} customers` : 'Export ready', { id: t });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Export failed';
      toast.error(msg, { id: t });
    } finally {
      setExporting(false);
    }
  };

  // Load all customers on mount
  useEffect(() => {
    searchCustomers('', 1, pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback((query, page, limit) => {
    const result = searchCustomers(query, page, limit);
    result.then((r) => {
      if (!r.success) toast.error(r.error || 'Failed to load customers');
    });
  }, [searchCustomers]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // Only search server-side with 2+ chars, or empty to show all
      if (value.trim().length >= 2 || value.trim().length === 0) {
        fetchData(value.trim(), 1, pageSize);
      }
    }, 300);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchData(searchQuery, page, pageSize);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchData(searchQuery, 1, size);
  };

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.company || '-'}
        </span>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div>
          <div className="text-slate-900 dark:text-slate-100">{row.name || '-'}</div>
          {row.email && (
            <div className="text-xs text-slate-500 dark:text-slate-400">{row.email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-300">{row.phone || '-'}</span>
      ),
    },
    {
      key: 'city',
      label: 'City',
      render: (row) => {
        const parts = [row.city, row.state].filter(Boolean);
        return (
          <span className="text-slate-600 dark:text-slate-300">
            {parts.length > 0 ? parts.join(', ') : '-'}
          </span>
        );
      },
    },
    {
      key: 'deliveryStatus',
      label: 'Delivery Status',
      render: (row) => {
        const ds = row.deliveryStatus;
        if (!ds) return <span className="text-slate-400 text-xs">-</span>;
        const isCompleted = ds === 'COMPLETED';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isCompleted
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            {isCompleted ? 'Completed' : 'Pending'}
          </span>
        );
      },
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-700 dark:text-slate-300 text-sm">
            {row.planName || '-'}
          </span>
          {row.planName && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              row.planActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {row.planActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
      ),
    },
  ];

  const serverPagination = searchPagination
    ? {
        page: searchPagination.page || currentPage,
        limit: searchPagination.limit || pageSize,
        total: searchPagination.total || 0,
        totalPages: searchPagination.totalPages || 1,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Customer 360" description="Search and view complete customer lifecycle" />
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 'Exporting…' : 'Export to Excel'}
        </Button>
      </div>

      <DataTable
        title="Customers"
        totalCount={serverPagination?.total}
        columns={columns}
        data={searchResults}
        loading={searchLoading}
        searchable={true}
        searchPlaceholder="Search by company, name, phone, username, or GST..."
        onSearch={handleSearch}
        pagination={true}
        serverPagination={serverPagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        defaultPageSize={20}
        pageSizeOptions={[20, 50, 100]}
        emptyMessage="No customers found"
        emptySubtitle="Try a different search term"
        emptyIcon={Search}
        actions={(row) => (
          <Link
            href={`/dashboard/customer-360/${row.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
          >
            View
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      />
    </div>
  );
}
