'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import DataTable from '@/components/DataTable';

const ALLOWED_ROLES = ['MASTER', 'ADMIN', 'SALES_DIRECTOR', 'SUPER_ADMIN'];

export default function BdmLeadsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, byBdm: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [bdmId, setBdmId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [detailLead, setDetailLead] = useState(null);

  const allowed = user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (user && !allowed) router.replace('/dashboard');
  }, [user, allowed, router]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leads/bdm-leads/list', {
        params: {
          page,
          limit,
          ...(bdmId ? { bdmId } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {})
        }
      });
      setLeads(data.leads);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load BDM leads');
    }
    setLoading(false);
  }, [page, limit, bdmId, dateFrom, dateTo]);

  useEffect(() => {
    if (allowed) loadLeads();
  }, [allowed, loadLeads]);

  const openMap = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (!allowed) return null;

  const columns = [
    { key: 'leadNumber', label: 'Lead ID', render: (row) => <span className="font-mono">{row.leadNumber || '—'}</span> },
    { key: 'customer', label: 'Customer', render: (row) => row.campaignData?.name || '—' },
    { key: 'company', label: 'Company', render: (row) => row.campaignData?.company || '—' },
    { key: 'contact', label: 'Contact', render: (row) => row.campaignData?.phone || '—' },
    { key: 'bdm', label: 'BDM', render: (row) => row.createdBy?.name || '—' },
    {
      key: 'created', label: 'Created',
      render: (row) => (
        <span className="whitespace-nowrap">
          {new Date(row.locationCapturedAt || row.createdAt).toLocaleString('en-IN')}
        </span>
      )
    },
    { key: 'lat', label: 'Latitude', render: (row) => <span className="font-mono">{row.createdLatitude?.toFixed(6)}</span> },
    { key: 'lng', label: 'Longitude', render: (row) => <span className="font-mono">{row.createdLongitude?.toFixed(6)}</span> },
    {
      key: 'map', label: 'Map',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); openMap(row.createdLatitude, row.createdLongitude); }}
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ExternalLink className="w-4 h-4" /> Open Map
        </button>
      )
    },
  ];

  const filterControls = (
    <>
      <select
        value={bdmId}
        onChange={(e) => { setBdmId(e.target.value); setPage(1); }}
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      >
        <option value="">All BDMs</option>
        {stats.byBdm.map(b => (
          <option key={b.bdmId} value={b.bdmId}>{b.bdmName} ({b.count})</option>
        ))}
      </select>
      <input
        type="date" value={dateFrom}
        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      />
      <input
        type="date" value={dateTo}
        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      />
      {(bdmId || dateFrom || dateTo) && (
        <button
          onClick={() => { setBdmId(''); setDateFrom(''); setDateTo(''); setPage(1); }}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear
        </button>
      )}
    </>
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BDM Leads</h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Leads created from the field with captured GPS location
      </p>

      <DataTable
        title="Field Leads"
        totalCount={stats.total}
        columns={columns}
        data={leads}
        loading={loading}
        filters={filterControls}
        serverPagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setLimit(newSize); setPage(1); }}
        onRowClick={(row) => setDetailLead(row)}
        emptyMessage="No location-captured leads found"
        emptySubtitle="Leads created by BDMs from the field will appear here"
        emptyIcon={MapPin}
      />

      {/* Detail modal */}
      {detailLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
             onClick={() => setDetailLead(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl"
               onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
              {detailLead.campaignData?.company || 'Lead'} — {detailLead.leadNumber || ''}
            </h2>
            <dl className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between"><dt className="text-slate-500">Customer</dt><dd>{detailLead.campaignData?.name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Contact</dt><dd>{detailLead.campaignData?.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">BDM</dt><dd>{detailLead.createdBy?.name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Lead created</dt><dd>{new Date(detailLead.createdAt).toLocaleString('en-IN')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Location captured</dt><dd>{detailLead.locationCapturedAt ? new Date(detailLead.locationCapturedAt).toLocaleString('en-IN') : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Latitude</dt><dd className="font-mono">{detailLead.createdLatitude?.toFixed(6)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Longitude</dt><dd className="font-mono">{detailLead.createdLongitude?.toFixed(6)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Accuracy</dt><dd>{detailLead.locationAccuracy ? `±${Math.round(detailLead.locationAccuracy)} m` : '—'}</dd></div>
            </dl>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setDetailLead(null)}
                className="px-4 py-2 text-sm border rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Close</button>
              <button onClick={() => openMap(detailLead.createdLatitude, detailLead.createdLongitude)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md inline-flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> Open Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
