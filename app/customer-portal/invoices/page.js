'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCustomerBillingStore } from '@/lib/customerStore';
import { useRouter } from 'next/navigation';
import DataTable, { StatusBadge } from '@/components/DataTable';
import { FileText, Download, Eye, Loader2, CreditCard, X, IndianRupee, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '@/lib/useModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

const fmtDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
};

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  return 'Rupees ' + convert(Math.round(num)) + ' Only';
}

function esc(v) { return v ? String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '-'; }

function buildInvoiceHTML(inv) {
  const pmtRows = (inv.payments || []).map(p => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px 10px">${esc(fmtDate(p.paymentDate))}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;font-family:monospace;font-size:11px">${esc(p.receiptNumber)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center">${esc(p.paymentMode)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;font-weight:600;color:#047857">${esc(formatCurrency(p.amount))}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.invoiceNumber)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;color:#1e293b;padding:20px}
@media print{body{padding:10px}.no-print{display:none!important}}</style></head><body>
<div class="no-print" style="text-align:right;margin-bottom:16px">
  <button onclick="window.print()" style="background:#2563eb;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:14px">Save as PDF / Print</button>
</div>
<div style="max-width:800px;margin:0 auto">
  <div style="text-align:center;margin-bottom:20px"><div style="display:inline-block;background:#06b6d4;color:white;padding:8px 32px;font-size:20px;font-weight:700;letter-spacing:1px">TAX INVOICE</div></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <svg viewBox="0 0 60 60" width="56" height="56"><circle cx="20" cy="30" r="8" fill="#F97316"/><circle cx="30" cy="18" r="8" fill="#22C55E"/><circle cx="40" cy="30" r="8" fill="#3B82F6"/></svg>
    <div><div style="font-size:24px;font-weight:700;color:#0891b2">GAZON</div><div style="font-size:10px;color:#94a3b8;letter-spacing:3px">COMMUNICATIONS INDIA LTD</div></div>
  </div>
  <div style="font-size:13px;margin-bottom:16px">
    <p style="font-weight:700;margin-bottom:2px">GAZON COMMUNICATIONS INDIA LIMITED</p>
    <p>ADDRESS: Office No. 1001, 10th Floor, City Avenue, Kolte Patil, Wakad, Pune 411057.</p>
    <p>STATE: Maharashtra &nbsp; STATE CODE: 27</p>
    <p>TEL: (+91) 20 4690 6782 &nbsp; EMAIL: accounts@gazonindia.com</p>
  </div>
  <div style="border-top:2px solid #94a3b8;border-bottom:1px solid #cbd5e1;padding:10px 0;margin-bottom:10px">
    <table style="width:100%;font-size:13px"><tr><td style="padding:3px 0"><strong>INVOICE NO:</strong> ${esc(inv.invoiceNumber)}</td><td><strong>INVOICE DATE:</strong> ${esc(fmtDate(inv.invoiceDate))}</td></tr>
    <tr><td style="padding:3px 0"><strong>DUE DATE:</strong> ${esc(fmtDate(inv.dueDate))}</td><td><strong>STATUS:</strong> ${esc(inv.status)}</td></tr></table>
  </div>
  <div style="border-bottom:1px solid #cbd5e1;padding:6px 0;margin-bottom:10px;font-size:13px">
    <p style="margin-bottom:4px"><strong>COMPANY NAME:</strong> ${esc(inv.companyName)}</p>
    <table style="width:100%"><tr><td style="padding:2px 0"><strong>BILLING ADDRESS:</strong> ${esc(inv.billingAddress)}</td><td><strong>INSTALLATION ADDRESS:</strong> ${esc(inv.installationAddress)}</td></tr>
    <tr><td style="padding:2px 0"><strong>BUYERS GST NO:</strong> ${esc(inv.buyerGstNo)}</td><td><strong>USERNAME:</strong> ${esc(inv.customerUsername)}</td></tr>
    <tr><td style="padding:2px 0"><strong>CONTACT:</strong> ${esc(inv.contactPhone)}</td><td><strong>EMAIL:</strong> ${esc(inv.contactEmail)}</td></tr></table>
  </div>
  <div style="text-align:center;font-weight:700;border-bottom:1px solid #cbd5e1;padding:8px 0;margin-bottom:8px">INVOICE SUMMARY</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px">
    <thead><tr style="background:#06b6d4;color:white">
      <th style="border:1px solid #0891b2;padding:6px;width:30px">Sr</th><th style="border:1px solid #0891b2;padding:6px;text-align:left">Description</th>
      <th style="border:1px solid #0891b2;padding:6px">HSN/SAC</th><th style="border:1px solid #0891b2;padding:6px">Plan Duration</th>
      <th style="border:1px solid #0891b2;padding:6px">Amount</th><th style="border:1px solid #0891b2;padding:6px">Discount</th>
      <th style="border:1px solid #0891b2;padding:6px">GST (18%)</th><th style="border:1px solid #0891b2;padding:6px">Total</th>
    </tr></thead><tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:6px;text-align:center">1</td><td style="border:1px solid #cbd5e1;padding:6px">${esc(inv.planName)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${esc(inv.hsnSacCode)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-size:11px">${esc(fmtDate(inv.billingPeriodStart))} To ${esc(fmtDate(inv.billingPeriodEnd))}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${Math.round(inv.baseAmount)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${Math.round(inv.discountAmount || 0)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${Math.round(inv.totalGstAmount)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${Math.round(inv.grandTotal)}</td></tr>
    <tr style="font-weight:700"><td style="border:1px solid #cbd5e1;padding:6px" colspan="7">Grand Total:</td><td style="border:1px solid #cbd5e1;padding:6px;text-align:center">${Math.round(inv.grandTotal)}</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px" colspan="8"><strong>Rupees in Words:</strong> ${numberToWords(inv.grandTotal)}</td></tr>
    </tbody></table>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
    <thead><tr style="background:#fb923c;color:white">
      <th style="border:1px solid #f97316;padding:6px">Tax Summary</th><th style="border:1px solid #f97316;padding:6px">HSN/SAC</th>
      <th style="border:1px solid #f97316;padding:6px">Taxable Value</th><th style="border:1px solid #f97316;padding:6px">SGST (${inv.sgstRate}%)</th>
      <th style="border:1px solid #f97316;padding:6px">CGST (${inv.cgstRate}%)</th><th style="border:1px solid #f97316;padding:6px">Total</th>
    </tr></thead><tbody><tr style="background:#fff7ed">
      <td style="border:1px solid #fed7aa;padding:6px;text-align:center"></td><td style="border:1px solid #fed7aa;padding:6px;text-align:center">${esc(inv.hsnSacCode)}</td>
      <td style="border:1px solid #fed7aa;padding:6px;text-align:center">${Math.round(inv.taxableAmount)}</td>
      <td style="border:1px solid #fed7aa;padding:6px;text-align:center">${inv.sgstAmount?.toFixed(1)}</td>
      <td style="border:1px solid #fed7aa;padding:6px;text-align:center">${inv.cgstAmount?.toFixed(1)}</td>
      <td style="border:1px solid #fed7aa;padding:6px;text-align:center">${Math.round(inv.totalGstAmount)}</td>
    </tr></tbody></table>
  <div style="display:flex;gap:12px;margin-bottom:16px;border-top:1px solid #e2e8f0;padding-top:12px">
    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:10px;text-align:center"><div style="font-size:11px;color:#64748b">Invoice Total</div><div style="font-size:16px;font-weight:700">${esc(formatCurrency(inv.grandTotal))}</div></div>
    <div style="flex:1;background:#ecfdf5;border-radius:8px;padding:10px;text-align:center"><div style="font-size:11px;color:#059669">Paid</div><div style="font-size:16px;font-weight:700;color:#047857">${esc(formatCurrency(inv.totalPaidAmount || 0))}</div></div>
    <div style="flex:1;background:#fef2f2;border-radius:8px;padding:10px;text-align:center"><div style="font-size:11px;color:#ef4444">Remaining</div><div style="font-size:16px;font-weight:700;color:#dc2626">${esc(formatCurrency(inv.remainingAmount || 0))}</div></div>
  </div>
  ${inv.payments?.length ? `<div style="border-top:1px solid #e2e8f0;padding-top:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Payment History</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f1f5f9">
      <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left">Date</th><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left">Receipt #</th>
      <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center">Mode</th><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right">Amount</th>
    </tr></thead><tbody>${pmtRows}</tbody></table></div>` : ''}
  <div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:16px;text-align:center"><p style="font-size:11px;color:#94a3b8">This is a computer generated invoice and does not require a physical signature.</p></div>
</div></body></html>`;
}

const invoiceStatusColors = {
  GENERATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',

  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const statusLabel = {
  GENERATED: 'Unpaid',
  PARTIALLY_PAID: 'Partial',
  PAID: 'Paid',

  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
};

const tabs = [
  { key: 'ALL', label: 'All' },
  { key: 'GENERATED', label: 'Unpaid' },
  { key: 'PARTIALLY_PAID', label: 'Partial' },
  { key: 'PAID', label: 'Paid' },
];

const columns = [
  {
    key: 'invoiceNumber',
    label: 'Invoice #',
    render: (row) => <span className="font-medium text-slate-900 dark:text-white">{row.invoiceNumber}</span>,
  },
  {
    key: 'invoiceDate',
    label: 'Date',
    render: (row) => formatDate(row.invoiceDate),
  },
  {
    key: 'billingPeriod',
    label: 'Billing Period',
    render: (row) => (
      <span className="text-xs">
        {formatDate(row.billingPeriodStart)} – {formatDate(row.billingPeriodEnd)}
      </span>
    ),
  },
  {
    key: 'grandTotal',
    label: 'Amount',
    render: (row) => <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(row.grandTotal)}</span>,
    className: 'text-right',
    cellClassName: 'text-right',
  },
  {
    key: 'remainingAmount',
    label: 'Remaining',
    render: (row) => (
      <span className={row.remainingAmount > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-500'}>
        {formatCurrency(row.remainingAmount)}
      </span>
    ),
    className: 'text-right',
    cellClassName: 'text-right',
  },
  {
    key: 'dueDate',
    label: 'Due Date',
    render: (row) => formatDate(row.dueDate),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <StatusBadge status={statusLabel[row.status] || row.status} colorMap={{ [statusLabel[row.status] || row.status]: invoiceStatusColors[row.status] }} />
    ),
    className: 'text-center',
    cellClassName: 'text-center',
  },
];

// Generate TDS claim year options (current FY + 1 previous)
function getTDSYearOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Indian FY starts April. If before April, current FY = (year-1)-year, else year-(year+1)
  const fyStart = month < 3 ? year - 1 : year;
  return [
    `${fyStart}-${String(fyStart + 1).slice(2)}`,
    `${fyStart - 1}-${String(fyStart).slice(2)}`,
  ];
}

const tdsQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const { invoices, invoicePagination, loading, fetchInvoices, fetchInvoiceDetail } = useCustomerBillingStore();
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [downloadingId, setDownloadingId] = useState(null);

  // Pay modal state
  const [payModal, setPayModal] = useState({ open: false, invoice: null, mode: null }); // mode: null | 'full' | 'tds'
  const [tdsForm, setTdsForm] = useState({ tanNumber: '', claimYear: getTDSYearOptions()[0], claimQuarter: 'Q4', invoiceClaimYear: getTDSYearOptions()[0], invoiceClaimQuarter: 'Q4' });

  useModal(payModal.open, () => setPayModal({ open: false, invoice: null, mode: null }));

  const openPayModal = (invoice) => {
    setPayModal({ open: true, invoice, mode: null });
    setTdsForm({ tanNumber: '', claimYear: getTDSYearOptions()[0], claimQuarter: 'Q4', invoiceClaimYear: getTDSYearOptions()[0], invoiceClaimQuarter: 'Q4' });
  };

  const closePayModal = () => setPayModal({ open: false, invoice: null, mode: null });

  const handleFullPay = () => {
    toast('Payment gateway integration coming soon', { icon: '🚧' });
  };

  const handleTDSNext = () => {
    if (!tdsForm.tanNumber.trim()) {
      toast.error('TAN Number is required');
      return;
    }
    // TAN format: 4 letters + 5 digits + 1 letter (e.g., PDES12345F)
    const tanRegex = /^[A-Z]{4}\d{5}[A-Z]$/;
    if (!tanRegex.test(tdsForm.tanNumber.toUpperCase())) {
      toast.error('Invalid TAN format (e.g., PDES12345F)');
      return;
    }
    toast('TDS payment integration coming soon', { icon: '🚧' });
  };

  useEffect(() => {
    fetchInvoices(page, pageSize, activeTab);
  }, [fetchInvoices, page, pageSize, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleDownload = useCallback(async (row) => {
    setDownloadingId(row.id);
    try {
      const result = await fetchInvoiceDetail(row.id);
      if (!result.success) {
        toast.error('Failed to load invoice');
        return;
      }
      const html = buildInvoiceHTML(result.data);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.onload = () => URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Invoice download error:', err);
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  }, [fetchInvoiceDetail]);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="View all your invoices and payment status" />

      {/* Filter Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.key,
          label: tab.label,
          variant: tab.key === 'PAID' ? 'success' : tab.key === 'GENERATED' ? 'danger' : tab.key === 'PARTIALLY_PAID' ? 'warning' : 'default',
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        pagination={true}
        defaultPageSize={pageSize}
        serverPagination={invoicePagination ? {
          page: invoicePagination.page,
          limit: invoicePagination.limit,
          total: invoicePagination.total,
          totalPages: invoicePagination.totalPages,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        actions={(row) => (
          <div className="flex items-center justify-center gap-1">
            {['GENERATED', 'PARTIALLY_PAID', 'OVERDUE'].includes(row.status) && (
              <div className="relative group">
                <button
                  onClick={() => openPayModal(row)}
                  className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <CreditCard size={16} />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Pay</span>
              </div>
            )}
            <div className="relative group">
              <button
                onClick={() => router.push(`/customer-portal/invoices/${row.id}`)}
                className="p-2 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
              >
                <Eye size={16} />
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">View</span>
            </div>
            <div className="relative group">
              <button
                onClick={() => handleDownload(row)}
                disabled={downloadingId === row.id}
                className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
              >
                {downloadingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Download</span>
            </div>
          </div>
        )}
        emptyMessage="No invoices found"
        emptySubtitle="Your invoices will appear here once generated"
        emptyIcon={FileText}
      />

      {/* Pay Modal */}
      {payModal.open && payModal.invoice && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {payModal.mode === 'tds' ? 'Deduct TDS - TDS Claim Duration' : 'Pay Invoice'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {payModal.invoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={closePayModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[65vh]">
              {/* Mode Selection */}
              {!payModal.mode && (
                <div className="space-y-3">
                  {/* Invoice Summary */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Amount</span>
                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(payModal.invoice.grandTotal)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                        <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(payModal.invoice.remainingAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Choose payment method</p>

                  {/* Full Pay Option */}
                  <button
                    onClick={() => setPayModal(prev => ({ ...prev, mode: 'full' }))}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <IndianRupee size={22} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Pay Full Amount</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Pay {formatCurrency(payModal.invoice.remainingAmount)} via payment gateway</p>
                    </div>
                  </button>

                  {/* TDS Option */}
                  <button
                    onClick={() => setPayModal(prev => ({ ...prev, mode: 'tds' }))}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Receipt size={22} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Pay with TDS Deduction</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Deduct TDS and pay the remaining amount</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Full Pay Confirmation */}
              {payModal.mode === 'full' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <IndianRupee size={20} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Full Payment</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Pay via Razorpay / Stripe</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-emerald-600 dark:text-emerald-400">Invoice</span>
                        <p className="font-mono font-semibold text-slate-900 dark:text-white">{payModal.invoice.invoiceNumber}</p>
                      </div>
                      <div>
                        <span className="text-emerald-600 dark:text-emerald-400">Amount to Pay</span>
                        <p className="font-semibold text-2xl text-slate-900 dark:text-white">{formatCurrency(payModal.invoice.remainingAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Payment gateway integration is coming soon. You will be redirected to a secure payment page.
                    </p>
                  </div>
                </div>
              )}

              {/* TDS Deduction Form */}
              {payModal.mode === 'tds' && (
                <div className="space-y-5">
                  {/* TAN + Claim Period */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Enter TAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tdsForm.tanNumber}
                        onChange={(e) => setTdsForm(prev => ({ ...prev, tanNumber: e.target.value.toUpperCase() }))}
                        placeholder="e.g., PDES12345F"
                        maxLength={10}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                      />
                      {tdsForm.tanNumber && !/^[A-Z]{4}\d{5}[A-Z]$/.test(tdsForm.tanNumber) && (
                        <p className="text-xs text-red-500 mt-1">Invalid TAN format</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          TDS Claim Year
                        </label>
                        <select
                          value={tdsForm.claimYear}
                          onChange={(e) => setTdsForm(prev => ({ ...prev, claimYear: e.target.value }))}
                          className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                        >
                          {getTDSYearOptions().map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          TDS Claim Quarter
                        </label>
                        <select
                          value={tdsForm.claimQuarter}
                          onChange={(e) => setTdsForm(prev => ({ ...prev, claimQuarter: e.target.value }))}
                          className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                        >
                          {tdsQuarters.map(q => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-slate-200 dark:border-slate-700" />

                  {/* Invoice TDS Details */}
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      Enter the duration when you claimed/will claim TDS for each invoice
                    </p>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Invoice ID</span>
                        <p className="font-mono font-bold text-slate-900 dark:text-white">{payModal.invoice.invoiceNumber}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Invoice amount (excl.GST)</span>
                          <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(payModal.invoice.grandTotal - (payModal.invoice.grandTotal * 18 / 118))}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Outstanding</span>
                          <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(payModal.invoice.remainingAmount)}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-slate-400">TDS Claim Year</label>
                          <select
                            value={tdsForm.invoiceClaimYear}
                            onChange={(e) => setTdsForm(prev => ({ ...prev, invoiceClaimYear: e.target.value }))}
                            className="w-full h-9 mt-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-semibold"
                          >
                            {getTDSYearOptions().map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-slate-400">TDS Claim Quarter</label>
                          <select
                            value={tdsForm.invoiceClaimQuarter}
                            onChange={(e) => setTdsForm(prev => ({ ...prev, invoiceClaimQuarter: e.target.value }))}
                            className="w-full h-9 mt-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-semibold"
                          >
                            {tdsQuarters.map(q => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              {payModal.mode ? (
                <>
                  <button
                    onClick={() => {
                      if (payModal.mode) setPayModal(prev => ({ ...prev, mode: null }));
                      else closePayModal();
                    }}
                    className="flex-1 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={payModal.mode === 'full' ? handleFullPay : handleTDSNext}
                    className="flex-1 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  >
                    {payModal.mode === 'full' ? 'Pay Now' : 'Next'}
                  </button>
                </>
              ) : (
                <button
                  onClick={closePayModal}
                  className="w-full h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
