'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCustomer360Store } from '@/lib/store';
import { Search, ArrowRight, Download, Loader2, Calendar, X } from 'lucide-react';
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
  // Export modal lets the user pick a date range before kicking off. Empty
  // fields mean "no bound" — user can pick one, both, or neither.
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const debounceRef = useRef(null);

  const runExport = async ({ dateFrom, dateTo } = {}) => {
    if (exporting) return;
    setExporting(true);
    const t = toast.loading('Preparing export…');
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim().length >= 2) params.set('q', searchQuery.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo)   params.set('dateTo',   dateTo);
      const qs = params.toString() ? `?${params.toString()}` : '';

      // Extract filename from Content-Disposition so the user sees the
      // meaningful name the backend generated (e.g. range, company, etc).
      const response = await api.get(`/customer-360/export${qs}`, { responseType: 'blob' });
      const count = response.headers?.['x-total-count'];
      const cd = response.headers?.['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/i);
      const downloadName = m?.[1] || `customer-360-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(count ? `Exported ${count} customer${count === '1' ? '' : 's'}` : 'Export ready', { id: t });
      setShowExportModal(false);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Export failed';
      toast.error(msg, { id: t });
    } finally {
      setExporting(false);
    }
  };

  const handleExportClick = () => {
    // Reset range inputs each time so a previous modal-close doesn't leak
    // stale dates into the next export session.
    setExportDateFrom('');
    setExportDateTo('');
    setShowExportModal(true);
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
          onClick={handleExportClick}
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

      {/* Export modal — pick a date range (optional) then download.
          Skipping the range exports every customer matching the current
          search, same as before. */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !exporting && setShowExportModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Export to Excel</h3>
              </div>
              <button
                onClick={() => !exporting && setShowExportModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Pick a date range to export only customers created in that window, or leave blank to export every customer matching the current search.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    From
                  </label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    max={exportDateTo || undefined}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    To
                  </label>
                  <input
                    type="date"
                    value={exportDateTo}
                    min={exportDateFrom || undefined}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {searchQuery.trim().length >= 2 && (
                <div className="px-3 py-2 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
                  Current search <span className="font-semibold">&quot;{searchQuery.trim()}&quot;</span> will also be applied.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => runExport({ dateFrom: exportDateFrom, dateTo: exportDateTo })}
                disabled={exporting}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? 'Exporting…' : (exportDateFrom || exportDateTo ? 'Export Range' : 'Export All')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
