'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  AlertTriangle,
  Calendar,
  Download,
  Loader2,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';

// Each tab declares the endpoint to hit, the columns to render in the table,
// and the columns to export to Excel. Excel can carry extra columns (like
// the full serial list) that we don't want to crowd the on-screen table with.
const REPORTS = {
  inward: {
    label: 'Inward',
    icon: ArrowDownToLine,
    endpoint: '/store-reports/inward',
    filename: 'store_inward_report',
    sheetName: 'Inward',
    supportsDateFilter: true,
    statCards: (data) => ([
      { label: 'PO Lines', value: data.summary?.totalRows ?? 0, color: 'orange' },
      { label: 'Units Received', value: data.summary?.totalReceivedUnits ?? 0, color: 'emerald' },
      { label: 'Meters Received', value: data.summary?.totalReceivedMeters ?? 0, color: 'blue' },
      { label: 'Damaged', value: data.summary?.totalDamaged ?? 0, color: 'red' }
    ]),
    tableColumns: [
      { key: 'receivedAt', label: 'Received', render: r => r.receivedAt ? formatDate(r.receivedAt) : '—' },
      { key: 'poNumber', label: 'PO #' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'product', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'receivedQty', label: 'Received', render: r => `${r.receivedQty} ${r.unit}` },
      { key: 'inStockQty', label: 'In Stock', render: r => `${r.inStockQty} ${r.unit}` },
      { key: 'dispatchedQty', label: 'Dispatched', render: r => `${r.dispatchedQty} ${r.unit}` },
      { key: 'serialCount', label: 'Serials' },
      { key: 'receivedBy', label: 'Verified By' }
    ],
    excelRow: (r) => ({
      'Received On': r.receivedAt ? formatDate(r.receivedAt) : '',
      'PO Number': r.poNumber || '',
      'PO Status': r.poStatus || '',
      'Vendor': r.vendor,
      'Vendor GSTIN': r.vendorGstin || '',
      'Warehouse': r.warehouse,
      'Product': r.product,
      'Category': r.category,
      'Brand': r.brand,
      'Unit': r.unit,
      'Received Qty': r.receivedQty,
      'In-Stock Qty': r.inStockQty,
      'Dispatched Qty': r.dispatchedQty,
      'Damaged Qty (PO total)': r.damagedQty,
      'Serial Count': r.serialCount,
      'Serial Numbers': (r.serials || []).join(', '),
      'Verified By': r.receivedBy
    })
  },
  outward: {
    label: 'Outward',
    icon: ArrowUpFromLine,
    endpoint: '/store-reports/outward',
    filename: 'store_outward_report',
    sheetName: 'Outward',
    supportsDateFilter: true,
    statCards: (data) => ([
      { label: 'Dispatch Lines', value: data.summary?.totalRows ?? 0, color: 'orange' },
      { label: 'Units Issued', value: data.summary?.totalUnits ?? 0, color: 'emerald' },
      { label: 'Meters Issued', value: data.summary?.totalMeters ?? 0, color: 'blue' },
      { label: 'Customers', value: data.summary?.uniqueLeads ?? 0, color: 'cyan' }
    ]),
    tableColumns: [
      { key: 'assignedAt', label: 'Assigned', render: r => r.assignedAt ? formatDate(r.assignedAt) : '—' },
      { key: 'deliveryRequestNumber', label: 'Delivery #' },
      { key: 'customerName', label: 'Customer' },
      { key: 'company', label: 'Company' },
      { key: 'customerUsername', label: 'Username' },
      { key: 'product', label: 'Product' },
      { key: 'assignedQty', label: 'Qty', render: r => `${r.assignedQty} ${r.unit}` },
      { key: 'serialCount', label: 'Serials' },
      { key: 'sourcePO', label: 'Source PO' },
      { key: 'assignedBy', label: 'Assigned By' }
    ],
    excelRow: (r) => ({
      'Assigned On': r.assignedAt ? formatDate(r.assignedAt) : '',
      'Dispatched On': r.dispatchedAt ? formatDate(r.dispatchedAt) : '',
      'Completed On': r.completedAt ? formatDate(r.completedAt) : '',
      'Delivery Request #': r.deliveryRequestNumber || '',
      'Delivery Status': r.deliveryStatus || '',
      'Lead #': r.leadNumber || '',
      'Customer': r.customerName,
      'Company': r.company,
      'Customer Username': r.customerUsername,
      'Phone': r.phone,
      'Product': r.product,
      'Category': r.category,
      'Brand': r.brand,
      'Unit': r.unit,
      'Assigned Qty': r.assignedQty,
      'Serial Count': r.serialCount,
      'Serial Numbers': (r.serials || []).join(', '),
      'Source PO': r.sourcePO,
      'Source Warehouse': r.sourceWarehouse,
      'Assigned By': r.assignedBy
    })
  },
  stock: {
    label: 'Stock on Hand',
    icon: Boxes,
    endpoint: '/store-reports/stock-on-hand',
    filename: 'store_stock_on_hand',
    sheetName: 'Stock',
    supportsDateFilter: false,
    statCards: (data) => ([
      { label: 'Stock Lots', value: data.summary?.totalLots ?? 0, color: 'orange' },
      { label: 'Units in Stock', value: data.summary?.totalUnits ?? 0, color: 'emerald' },
      { label: 'Meters in Stock', value: data.summary?.totalMeters ?? 0, color: 'blue' },
      { label: 'Warehouses', value: data.summary?.warehouses ?? 0, color: 'cyan' }
    ]),
    tableColumns: [
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'product', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'brand', label: 'Brand' },
      { key: 'quantity', label: 'Qty', render: r => `${r.quantity} ${r.unit}` },
      { key: 'serialCount', label: 'Serials' },
      { key: 'sourcePO', label: 'PO #' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'addedToStoreAt', label: 'Added', render: r => r.addedToStoreAt ? formatDate(r.addedToStoreAt) : '—' }
    ],
    excelRow: (r) => ({
      'Warehouse': r.warehouse,
      'Product': r.product,
      'Category': r.category,
      'Brand': r.brand,
      'Unit': r.unit,
      'Quantity': r.quantity,
      'Serial Count': r.serialCount,
      'Serial Numbers': (r.serials || []).join(', '),
      'Source PO': r.sourcePO,
      'Vendor': r.vendor,
      'Added To Store On': r.addedToStoreAt ? formatDate(r.addedToStoreAt) : ''
    })
  },
  damaged: {
    label: 'Damaged / Rejected',
    icon: AlertTriangle,
    endpoint: '/store-reports/damaged',
    filename: 'store_damaged_rejected',
    sheetName: 'Damaged',
    supportsDateFilter: true,
    statCards: (data) => ([
      { label: 'Batches', value: data.summary?.totalBatches ?? 0, color: 'orange' },
      { label: 'Damaged Units', value: data.summary?.totalDamagedUnits ?? 0, color: 'red' },
      { label: 'Rejected Batches', value: data.summary?.rejectedBatches ?? 0, color: 'amber' },
      { label: 'Vendors Impacted', value: data.summary?.uniqueVendors ?? 0, color: 'cyan' }
    ]),
    tableColumns: [
      { key: 'verifiedAt', label: 'Verified', render: r => r.verifiedAt ? formatDate(r.verifiedAt) : '—' },
      { key: 'poNumber', label: 'PO #' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'batchNumber', label: 'Batch #' },
      { key: 'resultStatus', label: 'Status' },
      { key: 'totalReceived', label: 'Received' },
      { key: 'totalDamaged', label: 'Damaged' },
      { key: 'damagedBreakdown', label: 'Per-Item Damage' },
      { key: 'verifiedBy', label: 'Verified By' }
    ],
    excelRow: (r) => ({
      'Verified On': r.verifiedAt ? formatDate(r.verifiedAt) : '',
      'PO Number': r.poNumber || '',
      'Vendor': r.vendor,
      'Vendor GSTIN': r.vendorGstin || '',
      'Warehouse': r.warehouse,
      'Batch #': r.batchNumber,
      'Result Status': r.resultStatus,
      'Received In Batch': r.totalReceived,
      'Damaged In Batch': r.totalDamaged,
      'Per-Item Damage': r.damagedBreakdown,
      'Remark': r.remark,
      'Verified By': r.verifiedBy
    })
  }
};

export default function StoreReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isMaster = user?.role === 'MASTER';
  const isAdmin = user?.role === 'ADMIN' || isMaster;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || isMaster;
  const isStoreManager = user?.role === 'STORE_MANAGER';
  const canAccess = isAdmin || isSuperAdmin || isStoreManager;

  const [activeTab, setActiveTab] = useState('inward');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataByTab, setDataByTab] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !canAccess) router.push('/dashboard');
  }, [user, canAccess, router]);

  const activeReport = REPORTS[activeTab];
  const activeData = dataByTab[activeTab];

  const fetchReport = async (tabKey = activeTab) => {
    const report = REPORTS[tabKey];
    if (!report) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (report.supportsDateFilter) {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      const url = `${report.endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get(url);
      setDataByTab(prev => ({ ...prev, [tabKey]: res.data }));
    } catch (e) {
      console.error(e);
      toast.error(`Failed to load ${report.label} report`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) fetchReport(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, activeTab]);

  const handleApplyDates = () => fetchReport(activeTab);
  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchReport(activeTab), 0);
  };

  const handleExportExcel = () => {
    const rows = activeData?.rows || [];
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const formatted = rows.map(activeReport.excelRow);
    const ws = XLSX.utils.json_to_sheet(formatted);
    // Auto-size columns based on the longest cell in each.
    const headers = Object.keys(formatted[0]);
    ws['!cols'] = headers.map(h => ({
      wch: Math.min(60, Math.max(h.length, ...formatted.map(row => String(row[h] ?? '').length)) + 2)
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeReport.sheetName);
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${activeReport.filename}_${stamp}.xlsx`);
    toast.success('Excel downloaded');
  };

  const rowsForTable = activeData?.rows || [];

  const tableColumns = useMemo(() => activeReport.tableColumns.map(col => ({
    key: col.key,
    label: col.label,
    render: col.render || ((row) => row[col.key] ?? '—')
  })), [activeReport]);

  if (!user || !canAccess) return null;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <PageHeader title="Store Reports" description="Inward, outward, stock and quality reports — exportable to Excel.">
        <Button
          onClick={() => fetchReport(activeTab)}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        <Button
          onClick={handleExportExcel}
          size="sm"
          className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          disabled={rowsForTable.length === 0}
        >
          <Download className="h-4 w-4" />
          Excel
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(REPORTS).map(([key, report]) => {
          const Icon = report.icon;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {report.label}
            </button>
          );
        })}
      </div>

      {/* Date filter — hidden on stock snapshot */}
      {activeReport.supportsDateFilter && (
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                <Calendar className="h-4 w-4 text-slate-500" />
                Filter by Date
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-44"
                />
                <span className="text-slate-400 text-sm">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-44"
                />
                <Button onClick={handleApplyDates} size="sm" disabled={isLoading}>
                  Apply
                </Button>
                {(startDate || endDate) && (
                  <Button onClick={handleClearDates} variant="outline" size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stat cards */}
      {activeData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {activeReport.statCards(activeData).map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} color={card.color} />
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : rowsForTable.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No records found for this report.
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={rowsForTable}
              pagination
              defaultPageSize={25}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
