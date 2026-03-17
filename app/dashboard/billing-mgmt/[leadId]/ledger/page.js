'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Printer,
  Calendar,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Receipt,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import { formatCurrency, formatDate } from '@/lib/formatters';

// Get entry type icon and color
const getEntryTypeStyles = (type) => {
  switch (type) {
    case 'INVOICE':
      return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Invoice' };
    case 'PAYMENT':
      return { icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Payment' };
    case 'CREDIT_NOTE':
      return { icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Credit Note' };
    case 'REFUND':
      return { icon: RefreshCw, color: 'text-red-600', bg: 'bg-red-50', label: 'Refund' };
    default:
      return { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50', label: type };
  }
};

export default function CustomerLedgerPage({ params }) {
  const resolvedParams = use(params);
  const { leadId } = resolvedParams;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState(null);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  // Fetch ledger data
  const fetchLedger = async () => {
    try {
      setLoading(true);
      let url = `/ledger/customer/${leadId}`;
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      setLedger(response.data);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchLedger();
  }, [leadId]);

  // Apply date filter
  const handleApplyFilter = () => {
    fetchLedger();
  };

  // Clear date filter
  const handleClearFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    fetchLedger();
  };

  // Print ledger
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
        <p className="text-slate-500">Failed to load ledger data</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { customer, summary, entries } = ledger;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-950 dark:to-orange-900/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="print:hidden shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
                  <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 shrink-0" />
                    Customer Ledger
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 truncate ml-[18px]">{customer.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden shrink-0">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Customer Info Card */}
        <Card className="bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-slate-500">Company</span>
                </div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">{customer.companyName}</p>
                {customer.customerUsername && (
                  <p className="text-sm text-orange-600">@{customer.customerUsername}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-slate-500">Contact</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{customer.contactName || '-'}</p>
                <p className="text-sm text-slate-500">{customer.phone || '-'}</p>
                <p className="text-sm text-slate-500">{customer.email || '-'}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-slate-500">Address</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {customer.address || '-'}
                </p>
                {(customer.city || customer.state) && (
                  <p className="text-sm text-slate-500">
                    {[customer.city, customer.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Invoiced</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalDebit)}</p>
                  <p className="text-xs text-slate-400">{summary.invoices.count} invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.payments.total)}</p>
                  <p className="text-xs text-slate-400">{summary.payments.count} payments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Credit Notes</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.creditNotes.total)}</p>
                  <p className="text-xs text-slate-400">{summary.creditNotes.count} notes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-white dark:bg-slate-900 border-l-4 ${
            summary.currentBalance > 0 ? 'border-l-red-500' : summary.currentBalance < 0 ? 'border-l-orange-500' : 'border-l-green-500'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  summary.currentBalance > 0 ? 'bg-red-100' : summary.currentBalance < 0 ? 'bg-orange-100' : 'bg-green-100'
                }`}>
                  {summary.currentBalance > 0 ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : summary.currentBalance < 0 ? (
                    <RefreshCw className="h-5 w-5 text-orange-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Current Balance</p>
                  <p className={`text-lg font-bold ${
                    summary.currentBalance > 0 ? 'text-red-600' : summary.currentBalance < 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.abs(summary.currentBalance))}
                  </p>
                  <p className="text-xs text-slate-400">
                    {summary.balanceStatus === 'RECEIVABLE' ? 'Customer Owes' :
                     summary.balanceStatus === 'PAYABLE' ? 'We Owe' : 'Settled'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Filter by date:</span>
          </div>
          <input
            type="date"
            value={dateFilter.startDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={dateFilter.endDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          />
          <Button size="sm" onClick={handleApplyFilter}>Apply</Button>
          {(dateFilter.startDate || dateFilter.endDate) && (
            <Button size="sm" variant="outline" onClick={handleClearFilter}>Clear</Button>
          )}
        </div>

        {/* Ledger Table */}
        <div id="ledger-content">
          <DataTable
            title="Statement of Account"
            headerExtra={
              <BookOpen className="h-4 w-4 text-orange-600" />
            }
            columns={[
              {
                key: 'entryDate',
                label: 'Date',
                render: (row) => (
                  <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(row.entryDate)}</span>
                )
              },
              {
                key: 'particulars',
                label: 'Particulars',
                render: (row) => {
                  const styles = getEntryTypeStyles(row.entryType);
                  const Icon = styles.icon;
                  return (
                    <div className="flex items-start gap-2">
                      <div className={`p-1 rounded ${styles.bg}`}>
                        <Icon className={`h-3 w-3 ${styles.color}`} />
                      </div>
                      <div>
                        <p className="text-slate-800 dark:text-slate-200">{row.description}</p>
                        <Badge className={`text-[10px] mt-1 ${styles.bg} ${styles.color}`}>
                          {styles.label}
                        </Badge>
                      </div>
                    </div>
                  );
                }
              },
              {
                key: 'referenceNumber',
                label: 'Ref. No.',
                render: (row) => {
                  const styles = getEntryTypeStyles(row.entryType);
                  return <span className={`font-medium ${styles.color}`}>{row.referenceNumber}</span>;
                }
              },
              {
                key: 'debitAmount',
                label: 'Debit (\u20B9)',
                render: (row) => row.debitAmount > 0
                  ? <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(row.debitAmount)}</span>
                  : <span className="text-slate-300">-</span>,
                cellClassName: 'text-right'
              },
              {
                key: 'creditAmount',
                label: 'Credit (\u20B9)',
                render: (row) => row.creditAmount > 0
                  ? <span className="font-medium text-emerald-600">{formatCurrency(row.creditAmount)}</span>
                  : <span className="text-slate-300">-</span>,
                cellClassName: 'text-right'
              },
              {
                key: 'runningBalance',
                label: 'Balance (\u20B9)',
                render: (row) => {
                  const balanceColor = row.runningBalance > 0 ? 'text-red-600' :
                                      row.runningBalance < 0 ? 'text-orange-600' : 'text-green-600';
                  return (
                    <span className={`font-bold ${balanceColor}`}>
                      {formatCurrency(Math.abs(row.runningBalance))}
                      {row.runningBalance !== 0 && (
                        <span className="text-xs ml-1 font-normal">
                          {row.runningBalance > 0 ? 'Dr' : 'Cr'}
                        </span>
                      )}
                    </span>
                  );
                },
                cellClassName: 'text-right'
              }
            ]}
            data={entries}
            pagination={entries.length > 20}
            defaultPageSize={20}
            pageSizeOptions={[20, 50, 100]}
            emptyMessage="No ledger entries found"
            emptyIcon={BookOpen}
            totalCount={entries.length}
          />

          {/* Totals Summary */}
          {entries.length > 0 && (
            <div className="bg-slate-100 dark:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-xl px-6 py-3 flex items-center justify-end gap-8 font-bold text-sm">
              <span className="text-slate-600 dark:text-slate-400">Totals:</span>
              <span className="text-slate-800 dark:text-slate-200 min-w-[100px] text-right">
                {formatCurrency(summary.totalDebit)}
              </span>
              <span className="text-emerald-600 min-w-[100px] text-right">
                {formatCurrency(summary.totalCredit)}
              </span>
              <span className={`min-w-[120px] text-right ${
                summary.currentBalance > 0 ? 'text-red-600' :
                summary.currentBalance < 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {formatCurrency(Math.abs(summary.currentBalance))}
                {summary.currentBalance !== 0 && (
                  <span className="text-xs ml-1 font-normal">
                    {summary.currentBalance > 0 ? 'Dr' : 'Cr'}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-500 py-4 print:py-8">
          <p>This is a computer generated statement and does not require signature.</p>
          <p className="mt-1">Generated on {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #ledger-content, #ledger-content * { visibility: visible; }
          #ledger-content { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        }
      `}</style>
    </div>
  );
}
