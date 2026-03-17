'use client';

import { useState } from 'react';
import { Search, SearchX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

/**
 * Unified DataTable component for consistent table UI across the app.
 *
 * Usage:
 * <DataTable
 *   title="Lead List"
 *   columns={[
 *     { key: 'company', label: 'Company' },
 *     { key: 'contact', label: 'Contact', render: (row) => <span>{row.name}</span> },
 *     { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
 *   ]}
 *   data={leads}
 *   searchable={true}
 *   searchPlaceholder="Search leads..."
 *   searchKeys={['company', 'name', 'phone']}
 *   filters={<> your filter dropdowns </>}
 *   pagination={true}
 *   defaultPageSize={10}
 *   onRowClick={(row) => handleClick(row)}
 *   emptyMessage="No leads found"
 *   actions={(row) => <button>View</button>}
 *   loading={false}
 * />
 */
export default function DataTable({
  title,
  totalCount,
  columns = [],
  data = [],
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  onSearch,
  filters,
  pagination = false,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  emptyMessage = 'No data found',
  emptySubtitle,
  emptyFilteredMessage = 'No results match your search',
  emptyIcon,
  actions,
  loading = false,
  headerExtra,
  serverPagination,
  onPageChange,
  onPageSizeChange,
  selectedRows,
  onSelectRow,
  onSelectAll,
  bulkActions,
  className = '',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Client-side search
  const filteredData = searchable && searchKeys.length > 0 && !onSearch
    ? data.filter(row => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return searchKeys.some(key => {
          const keys = key.split('.');
          let value = row;
          for (const k of keys) {
            value = value?.[k];
          }
          return value?.toString().toLowerCase().includes(term);
        });
      })
    : data;

  // Pagination calculations
  const isServerPaginated = !!serverPagination;
  const totalItems = isServerPaginated ? serverPagination.total : filteredData.length;
  const totalPages = isServerPaginated
    ? serverPagination.totalPages
    : Math.ceil(filteredData.length / pageSize);
  const activePage = isServerPaginated ? serverPagination.page : currentPage;

  // Client-side pagination
  const paginatedData = pagination && !isServerPaginated
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

  const startItem = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endItem = Math.min(activePage * pageSize, totalItems);

  const handlePageChange = (newPage) => {
    if (isServerPaginated && onPageChange) {
      onPageChange(newPage);
    } else {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    if (isServerPaginated && onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setPageSize(newSize);
      setCurrentPage(1);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (onSearch) onSearch(value);
  };

  const displayCount = totalCount !== undefined ? totalCount : totalItems;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {title && (
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
              {displayCount !== undefined && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({displayCount})
                </span>
              )}
            </h3>
          )}
          {headerExtra}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={onSearch ? undefined : searchTerm}
                defaultValue={onSearch ? '' : undefined}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 pl-9 pr-3 w-56 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
          {filters}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkActions && selectedRows?.size > 0 && (
        <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 flex items-center gap-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedRows.size} selected
          </span>
          {bulkActions}
        </div>
      )}

      {/* Page Size Selector */}
      {(pagination || isServerPaginated) && (
        <div className="px-6 py-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <span>Show</span>
          <select
            value={isServerPaginated ? serverPagination.limit || pageSize : pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span>entries</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 divide-x divide-slate-200 dark:divide-slate-700">
              {onSelectAll && (
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows?.size === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:text-slate-900 dark:hover:text-white select-none' : ''}`}
                  style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  onClick={col.onSort}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortIcon}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              // Skeleton rows
              Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="divide-x divide-slate-200 dark:divide-slate-700">
                  {onSelectAll && <td className="py-4 px-4"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ width: `${40 + Math.random() * 60}%` }} />
                    </td>
                  ))}
                  {actions && <td className="py-4 px-4"><div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ml-auto" /></td>}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0) + (onSelectAll ? 1 : 0)}
                >
                  <EmptyState
                    icon={searchTerm ? SearchX : (emptyIcon || Inbox)}
                    title={searchTerm ? emptyFilteredMessage : emptyMessage}
                    subtitle={searchTerm ? 'Try adjusting your search or filters' : emptySubtitle}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`
                    divide-x divide-slate-200 dark:divide-slate-700
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${selectedRows?.has(row.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                    hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {onSelectAll && (
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows?.has(row.id)}
                        onChange={() => onSelectRow?.(row.id)}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`py-4 px-4 text-sm text-slate-700 dark:text-slate-300 ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row, index) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      {(pagination || isServerPaginated) && totalItems > 0 && (
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Showing {startItem} to {endItem} of {totalItems} results
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={activePage <= 1}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage <= 1}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {activePage} / {totalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={activePage >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Status badge component for consistent status display in tables
 */
export function StatusBadge({ status, colorMap = {} }) {
  const defaultColors = {
    // Lead statuses
    'NEW': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'QUALIFIED': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'FOLLOW_UP': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'MEETING_SCHEDULED': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'DROPPED': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'FEASIBLE': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'NOT_FEASIBLE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    // Invoice statuses
    'GENERATED': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'PAID': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'PARTIALLY_PAID': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'OVERDUE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'CANCELLED': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    'DRAFT': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    // Approval statuses
    'APPROVED': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'REJECTED': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'PENDING': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'PENDING_APPROVAL': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    // Delivery statuses
    'DISPATCHED': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'COMPLETED': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'ASSIGNED': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    // Active/Inactive
    'ACTIVE': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'INACTIVE': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  };

  const colors = { ...defaultColors, ...colorMap };
  const colorClass = colors[status] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
  const displayStatus = status?.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {displayStatus}
    </span>
  );
}

/**
 * Role badge for user roles
 */
export function RoleBadge({ role }) {
  const roleColors = {
    'SUPER_ADMIN': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'BDM': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'ISR': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'FEASIBILITY_TEAM': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'DOCS_TEAM': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'OPS_TEAM': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'ACCOUNTS_TEAM': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'DELIVERY_TEAM': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'NOC_TEAM': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    'SAM_EXECUTIVE': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    'STORE_ADMIN': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  };

  const colorClass = roleColors[role] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
  const displayRole = role?.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {displayRole}
    </span>
  );
}
