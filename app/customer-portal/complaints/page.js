'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCustomerComplaintStore } from '@/lib/customerStore';
import DataTable, { StatusBadge } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Paperclip } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { CUSTOMER_COMPLAINT_STATUS_CONFIG } from '@/lib/statusConfig';
import { PageHeader } from '@/components/PageHeader';
import TabBar from '@/components/TabBar';

const complaintStatusColors = Object.fromEntries(
  Object.values(CUSTOMER_COMPLAINT_STATUS_CONFIG).map(v => [v.label, v.color])
);

const statusLabel = Object.fromEntries(
  Object.entries(CUSTOMER_COMPLAINT_STATUS_CONFIG).map(([k, v]) => [k, v.label])
);

const tabs = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'OPEN', label: 'Open' },
  { key: 'CLOSED', label: 'Closed' },
];

const columns = [
  {
    key: 'number',
    label: 'Complaint #',
    render: (row) => <span className="font-medium text-slate-900 dark:text-white">{row.number || row.requestNumber}</span>,
  },
  {
    key: 'category',
    label: 'Category',
    render: (row) => (
      <div className="text-xs">
        <span className="text-slate-700 dark:text-slate-300">{row.category?.name || '-'}</span>
        {row.subCategory?.name && (
          <span className="text-slate-400 dark:text-slate-500"> / {row.subCategory.name}</span>
        )}
      </div>
    ),
  },
  {
    key: 'description',
    label: 'Description',
    render: (row) => (
      <div className="flex items-center gap-2 max-w-[300px]">
        <span className="truncate text-slate-600 dark:text-slate-300">{row.description}</span>
        {row.attachments && row.attachments.length > 0 && (
          <span className="flex-shrink-0 text-slate-400" title={`${row.attachments.length} attachment(s)`}>
            <Paperclip size={13} />
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const label = statusLabel[row.status] || row.status;
      return <StatusBadge status={label} colorMap={complaintStatusColors} />;
    },
    className: 'text-center',
    cellClassName: 'text-center',
  },
  {
    key: 'createdAt',
    label: 'Submitted',
    render: (row) => formatDate(row.createdAt),
  },
];

export default function CustomerComplaintsPage() {
  const { requests, pagination, loading, fetchComplaints } = useCustomerComplaintStore();
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchComplaints(page, pageSize, activeTab);
  }, [fetchComplaints, page, pageSize, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Complaints" description="View all complaints for your account">
        <Link href="/customer-portal/complaints/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus size={16} />
            New Complaint
          </Button>
        </Link>
      </PageHeader>

      {/* Filter Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.key,
          label: tab.label,
          variant: tab.key === 'PENDING' ? 'warning' : tab.key === 'OPEN' ? 'info' : tab.key === 'CLOSED' ? 'danger' : 'default',
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        pagination={true}
        defaultPageSize={pageSize}
        serverPagination={pagination ? {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        emptyMessage="No complaints found"
        emptySubtitle="Submit a new complaint to get started"
        emptyIcon={MessageSquare}
      />
    </div>
  );
}
