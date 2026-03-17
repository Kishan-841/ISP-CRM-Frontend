'use client';

import { useEffect, useState } from 'react';
import { useCustomerBillingStore } from '@/lib/customerStore';
import DataTable, { StatusBadge } from '@/components/DataTable';
import { CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const modeColors = {
  CHEQUE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  NEFT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ONLINE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  TDS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const columns = [
  {
    key: 'paymentDate',
    label: 'Date',
    render: (row) => <span className="font-medium text-slate-900 dark:text-white">{formatDate(row.paymentDate)}</span>,
  },
  {
    key: 'amount',
    label: 'Amount',
    render: (row) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(row.amount)}</span>,
    className: 'text-right',
    cellClassName: 'text-right',
  },
  {
    key: 'paymentMode',
    label: 'Mode',
    render: (row) => (
      <StatusBadge status={row.paymentMode || '-'} colorMap={modeColors} />
    ),
    className: 'text-center',
    cellClassName: 'text-center',
  },
  {
    key: 'receiptNumber',
    label: 'Receipt #',
    render: (row) => <span className="font-mono text-xs">{row.receiptNumber || '-'}</span>,
  },
  {
    key: 'invoice',
    label: 'Invoice',
    render: (row) => row.invoice?.invoiceNumber || '-',
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const status = row.invoice?.status;
      const remaining = row.invoice?.remainingAmount;
      if (status === 'PAID') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Full Paid</span>;
      }
      if (status === 'PARTIALLY_PAID') {
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Partial</span>
            {remaining > 0 && <span className="text-xs text-red-600 dark:text-red-400 font-medium">Due: {formatCurrency(remaining)}</span>}
          </div>
        );
      }
      return <span className="text-xs text-slate-500">-</span>;
    },
    className: 'text-center',
    cellClassName: 'text-center',
  },
];

export default function CustomerPaymentsPage() {
  const { payments, paymentPagination, loading, fetchPayments } = useCustomerBillingStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchPayments(page, pageSize);
  }, [fetchPayments, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payment History" description="All your payment transactions" />

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        pagination={true}
        defaultPageSize={pageSize}
        serverPagination={paymentPagination ? {
          page: paymentPagination.page,
          limit: paymentPagination.limit,
          total: paymentPagination.total,
          totalPages: paymentPagination.totalPages,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        emptyMessage="No payments recorded yet"
        emptySubtitle="Your payment history will appear here"
        emptyIcon={CreditCard}
      />
    </div>
  );
}
