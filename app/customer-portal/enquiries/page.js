'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCustomerEnquiryStore } from '@/lib/customerStore';
import DataTable, { StatusBadge } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { UserPlus, Plus } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { ENQUIRY_STATUS_CONFIG, getStatusLabel } from '@/lib/statusConfig';
import { PageHeader } from '@/components/PageHeader';
import TabBar from '@/components/TabBar';

const enquiryStatusColors = Object.fromEntries(
  Object.values(ENQUIRY_STATUS_CONFIG).map(v => [v.label, v.color])
);

const statusLabel = Object.fromEntries(
  Object.entries(ENQUIRY_STATUS_CONFIG).map(([k, v]) => [k, v.label])
);

const tabs = [
  { key: 'ALL', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'CONVERTED', label: 'Converted' },
  { key: 'CLOSED', label: 'Closed' },
];

const columns = [
  {
    key: 'enquiryNumber',
    label: 'Enquiry #',
    render: (row) => <span className="font-medium text-slate-900 dark:text-white">{row.enquiryNumber}</span>,
  },
  {
    key: 'companyName',
    label: 'Company',
    render: (row) => <span className="text-slate-700 dark:text-slate-300">{row.companyName}</span>,
  },
  {
    key: 'contactName',
    label: 'Contact',
    render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.contactName}</span>,
  },
  {
    key: 'phone',
    label: 'Phone',
    render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.phone}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const label = statusLabel[row.status] || row.status;
      return <StatusBadge status={label} colorMap={enquiryStatusColors} />;
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

export default function CustomerEnquiriesPage() {
  const { enquiries, pagination, loading, fetchEnquiries } = useCustomerEnquiryStore();
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchEnquiries(page, pageSize, activeTab);
  }, [fetchEnquiries, page, pageSize, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Enquiries" description="Businesses you have referred to us">
        <Link href="/customer-portal/enquiries/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus size={16} />
            New Enquiry
          </Button>
        </Link>
      </PageHeader>

      {/* Filter Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.key,
          label: tab.label,
          variant: tab.key === 'SUBMITTED' ? 'warning' : tab.key === 'UNDER_REVIEW' ? 'info' : tab.key === 'CONVERTED' ? 'success' : tab.key === 'CLOSED' ? 'danger' : 'default',
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <DataTable
        columns={columns}
        data={enquiries}
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
        emptyMessage="No enquiries yet"
        emptySubtitle="Submit a new enquiry to get started"
        emptyIcon={UserPlus}
      />
    </div>
  );
}
