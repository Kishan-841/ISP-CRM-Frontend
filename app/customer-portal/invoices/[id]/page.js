'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCustomerBillingStore } from '@/lib/customerStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
};

const fmtCurrency = (amount) => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
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
  const rounded = Math.round(num);
  return 'Rupees ' + convert(rounded) + ' Only';
}

function esc(v) { return v ? String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '-'; }

function buildInvoiceHTML(inv) {
  const pmtRows = (inv.payments || []).map(p => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px 10px">${esc(fmt(p.paymentDate))}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;font-family:monospace;font-size:11px">${esc(p.receiptNumber)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center">${esc(p.paymentMode)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;font-weight:600;color:#047857">${esc(fmtCurrency(p.amount))}</td>
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
    <table style="width:100%;font-size:13px"><tr><td style="padding:3px 0"><strong>INVOICE NO:</strong> ${esc(inv.invoiceNumber)}</td><td><strong>INVOICE DATE:</strong> ${esc(fmt(inv.invoiceDate))}</td></tr>
    <tr><td style="padding:3px 0"><strong>DUE DATE:</strong> ${esc(fmt(inv.dueDate))}</td><td><strong>STATUS:</strong> ${esc(inv.status)}</td></tr></table>
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
      <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-size:11px">${esc(fmt(inv.billingPeriodStart))} To ${esc(fmt(inv.billingPeriodEnd))}</td>
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
    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:10px;text-align:center"><div style="font-size:11px;color:#64748b">Invoice Total</div><div style="font-size:16px;font-weight:700">${esc(fmtCurrency(inv.grandTotal))}</div></div>
    <div style="flex:1;background:#ecfdf5;border-radius:8px;padding:10px;text-align:center"><div style="font-size:11px;color:#059669">Paid</div><div style="font-size:16px;font-weight:700;color:#047857">${esc(fmtCurrency(inv.totalPaidAmount || 0))}</div></div>
    <div style="flex:1;background:#fef2f2;border-radius:8px;padding:10px;text-align:center"><div style="font-size:11px;color:#ef4444">Remaining</div><div style="font-size:16px;font-weight:700;color:#dc2626">${esc(fmtCurrency(inv.remainingAmount || 0))}</div></div>
  </div>
  ${inv.payments?.length ? `<div style="border-top:1px solid #e2e8f0;padding-top:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Payment History</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f1f5f9">
      <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left">Date</th><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left">Receipt #</th>
      <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center">Mode</th><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right">Amount</th>
    </tr></thead><tbody>${pmtRows}</tbody></table></div>` : ''}
  ${inv.notes ? `<div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:16px"><p style="font-size:11px;color:#64748b"><strong>Note:</strong> ${esc(inv.notes)}</p></div>` : ''}
  <div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:16px;text-align:center"><p style="font-size:11px;color:#94a3b8">This is a computer generated invoice and does not require a physical signature.</p></div>
</div></body></html>`;
}

export default function CustomerInvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { fetchInvoiceDetail } = useCustomerBillingStore();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await fetchInvoiceDetail(id);
      if (result.success) setInvoice(result.data);
      setLoading(false);
    })();
  }, [id, fetchInvoiceDetail]);

  const handleDownload = () => {
    if (!invoice || downloading) return;
    setDownloading(true);
    try {
      const html = buildInvoiceHTML(invoice);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.onload = () => URL.revokeObjectURL(url);
      }
    } catch {
      toast.error('Failed to open invoice');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Invoice not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Action Bar - hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push('/customer-portal/invoices')}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer size={15} />
            Print
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={15} />
                Download
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 print:border-0 print:shadow-none print:p-4">
        {/* TAX INVOICE header */}
        <div className="text-center mb-5">
          <div className="inline-block bg-cyan-500 text-white px-8 py-2 text-xl font-bold tracking-wide">
            TAX INVOICE
          </div>
        </div>

        {/* Company Logo + Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-5">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 60 60" className="w-14 h-14 flex-shrink-0">
              <circle cx="20" cy="30" r="8" fill="#F97316" />
              <circle cx="30" cy="18" r="8" fill="#22C55E" />
              <circle cx="40" cy="30" r="8" fill="#3B82F6" />
            </svg>
            <div>
              <p className="text-2xl font-bold text-cyan-600">GAZON</p>
              <p className="text-xs text-slate-500 tracking-widest">COMMUNICATIONS INDIA LTD</p>
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div className="text-sm text-slate-700 mb-5">
          <p className="font-bold">GAZON COMMUNICATIONS INDIA LIMITED</p>
          <p><strong>ADDRESS:</strong> Office No. 1001, 10th Floor, City Avenue, Kolte Patil</p>
          <p>Devlopers, Wakad, Pune 411057.</p>
          <p><strong>STATE:</strong> Maharashtra <strong>STATE CODE:</strong> 27</p>
          <p><strong>TEL:</strong> (+91) 20 4690 6782</p>
          <p><strong>EMAIL:</strong> accounts@gazonindia.com</p>
        </div>

        {/* Invoice Details */}
        <div className="border-t-2 border-b border-slate-300 py-3 mb-3">
          <div className="grid grid-cols-2 gap-x-8">
            <p className="text-sm border-b border-slate-200 py-1"><strong>INVOICE NO:</strong> {invoice.invoiceNumber}</p>
            <p className="text-sm border-b border-slate-200 py-1"><strong>INVOICE DATE:</strong> {fmt(invoice.invoiceDate)}</p>
            <p className="text-sm border-b border-slate-200 py-1"><strong>DUE DATE:</strong> {fmt(invoice.dueDate)}</p>
            <p className="text-sm border-b border-slate-200 py-1"><strong>STATUS:</strong> {invoice.status}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="border-b border-slate-300 py-2 mb-3">
          <p className="text-sm border-b border-slate-200 py-1"><strong>COMPANY NAME:</strong> {invoice.companyName || '-'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <p className="text-sm border-b border-slate-200 py-1"><strong>BILLING ADDRESS:</strong> {invoice.billingAddress || '-'}</p>
            <p className="text-sm border-b border-slate-200 py-1"><strong>INSTALLATION ADDRESS:</strong> {invoice.installationAddress || '-'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <p className="text-sm border-b border-slate-200 py-1"><strong>BUYERS GST NO:</strong> {invoice.buyerGstNo || '-'}</p>
            <p className="text-sm border-b border-slate-200 py-1"><strong>USERNAME:</strong> {invoice.customerUsername || '-'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <p className="text-sm border-b border-slate-200 py-1"><strong>CONTACT:</strong> {invoice.contactPhone || '-'}</p>
            <p className="text-sm border-b border-slate-200 py-1"><strong>EMAIL:</strong> {invoice.contactEmail || '-'}</p>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="text-center py-2 border-b border-slate-300 mb-3">
          <h3 className="font-bold text-slate-800">INVOICE SUMMARY</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse mb-3 text-sm min-w-[600px]">
            <thead>
              <tr className="bg-cyan-500 text-white">
                <th className="border border-cyan-600 px-2 py-2 text-center w-10">Sr</th>
                <th className="border border-cyan-600 px-2 py-2 text-left">Description</th>
                <th className="border border-cyan-600 px-2 py-2 text-center">HSN/SAC</th>
                <th className="border border-cyan-600 px-2 py-2 text-center">Plan Duration</th>
                <th className="border border-cyan-600 px-2 py-2 text-center">Amount</th>
                <th className="border border-cyan-600 px-2 py-2 text-center">Discount</th>
                <th className="border border-cyan-600 px-2 py-2 text-center">GST (18%)</th>
                <th className="border border-cyan-600 px-2 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-2 text-center">1</td>
                <td className="border border-slate-300 px-2 py-2">{invoice.planName}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{invoice.hsnSacCode}</td>
                <td className="border border-slate-300 px-2 py-2 text-center text-xs">
                  {fmt(invoice.billingPeriodStart)} To {fmt(invoice.billingPeriodEnd)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(invoice.baseAmount)}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(invoice.discountAmount || 0)}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(invoice.totalGstAmount)}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(invoice.grandTotal)}</td>
              </tr>
              <tr className="font-bold">
                <td className="border border-slate-300 px-2 py-2" colSpan="7">Grand Total:</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(invoice.grandTotal)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-2" colSpan="8">
                  <strong>Rupees in Words:</strong> {numberToWords(invoice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax Summary */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse mb-5 text-sm min-w-[500px]">
            <thead>
              <tr className="bg-orange-400 text-white">
                <th className="border border-orange-500 px-3 py-2">Tax Summary</th>
                <th className="border border-orange-500 px-3 py-2">HSN/SAC</th>
                <th className="border border-orange-500 px-3 py-2">Taxable Value</th>
                <th className="border border-orange-500 px-3 py-2">SGST ({invoice.sgstRate}%)</th>
                <th className="border border-orange-500 px-3 py-2">CGST ({invoice.cgstRate}%)</th>
                <th className="border border-orange-500 px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-orange-100">
                <td className="border border-orange-300 px-3 py-2 text-center"></td>
                <td className="border border-orange-300 px-3 py-2 text-center">{invoice.hsnSacCode}</td>
                <td className="border border-orange-300 px-3 py-2 text-center">{Math.round(invoice.taxableAmount)}</td>
                <td className="border border-orange-300 px-3 py-2 text-center">{invoice.sgstAmount?.toFixed(1)}</td>
                <td className="border border-orange-300 px-3 py-2 text-center">{invoice.cgstAmount?.toFixed(1)}</td>
                <td className="border border-orange-300 px-3 py-2 text-center">{Math.round(invoice.totalGstAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="border-t border-slate-200 pt-4 mb-5">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <p className="text-slate-500 text-xs mb-1">Invoice Total</p>
              <p className="font-bold text-lg text-slate-900">{fmtCurrency(invoice.grandTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 text-center">
              <p className="text-emerald-600 text-xs mb-1">Paid</p>
              <p className="font-bold text-lg text-emerald-700">{fmtCurrency(invoice.totalPaidAmount || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-center">
              <p className="text-red-500 text-xs mb-1">Remaining</p>
              <p className="font-bold text-lg text-red-600">{fmtCurrency(invoice.remainingAmount || 0)}</p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-bold text-sm text-slate-700 mb-3">Payment History</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 px-3 py-2 text-left">Date</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">Receipt #</th>
                  <th className="border border-slate-200 px-3 py-2 text-center">Mode</th>
                  <th className="border border-slate-200 px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="border border-slate-200 px-3 py-2">{fmt(pmt.paymentDate)}</td>
                    <td className="border border-slate-200 px-3 py-2 font-mono text-xs">{pmt.receiptNumber}</td>
                    <td className="border border-slate-200 px-3 py-2 text-center">{pmt.paymentMode}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-emerald-700">{fmtCurrency(pmt.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer note */}
        {invoice.notes && (
          <div className="border-t border-slate-200 pt-3 mt-5">
            <p className="text-xs text-slate-500"><strong>Note:</strong> {invoice.notes}</p>
          </div>
        )}

        <div className="border-t border-slate-200 pt-3 mt-5 text-center">
          <p className="text-xs text-slate-400">This is a computer generated invoice and does not require a physical signature.</p>
        </div>
      </div>
    </div>
  );
}
