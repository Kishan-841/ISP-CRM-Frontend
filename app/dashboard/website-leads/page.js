'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import DataTable from '@/components/DataTable';

const ALLOWED_ROLES = ['MASTER', 'ADMIN', 'SALES_DIRECTOR', 'SUPER_ADMIN'];

export default function WebsiteLeadsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [formType, setFormType] = useState(''); // '' | 'BUSINESS' | 'ENTERPRISE'

  const allowed = user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (user && !allowed) router.replace('/dashboard');
  }, [user, allowed, router]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/website-leads/list', {
        params: { page, limit, ...(formType ? { type: formType } : {}) }
      });
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load website leads');
    }
    setLoading(false);
  }, [page, limit, formType]);

  useEffect(() => {
    if (allowed) loadLeads();
  }, [allowed, loadLeads]);

  if (!allowed) return null;

  const typeOfRow = (row) => {
    const code = row.campaignData?.campaign?.code;
    if (code === 'WEBSITE_BUSINESS') return 'Business';
    if (code === 'WEBSITE_ENTERPRISE') return 'Enterprise';
    return '—';
  };

  const columns = [
    { key: 'leadNumber', label: 'Lead ID', render: (row) => <span className="font-mono">{row.leadNumber || '—'}</span> },
    {
      key: 'type', label: 'Type',
      render: (row) => {
        const t = typeOfRow(row);
        return t === '—' ? <span className="text-slate-400">—</span> : (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            t === 'Business'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
          }`}>
            {t}
          </span>
        );
      }
    },
    { key: 'name', label: 'Name', render: (row) => row.campaignData?.name || '—' },
    { key: 'company', label: 'Company', render: (row) => row.campaignData?.company || '—' },
    { key: 'email', label: 'Email', render: (row) => row.campaignData?.email || '—' },
    { key: 'mobile', label: 'Mobile', render: (row) => row.campaignData?.phone || '—' },
    { key: 'pincode', label: 'Pincode', render: (row) => row.campaignData?.pincode || '—' },
    {
      key: 'address', label: 'Address',
      render: (row) => (
        <span className="block max-w-[220px] truncate" title={row.campaignData?.address || ''}>
          {row.campaignData?.address || '—'}
        </span>
      )
    },
    {
      key: 'receivedAt', label: 'Received At',
      render: (row) => (
        <span className="whitespace-nowrap">{new Date(row.createdAt).toLocaleString('en-IN')}</span>
      )
    },
    {
      key: 'repeat', label: 'Repeat',
      render: (row) => row.campaignData?.notes?.includes('Repeat enquiry') ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Repeat
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      )
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Website Leads</h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Enquiries submitted through the company website form
      </p>

      <DataTable
        title="Website Enquiries"
        totalCount={pagination.total}
        columns={columns}
        data={leads}
        loading={loading}
        filters={
          <select
            value={formType}
            onChange={(e) => { setFormType(e.target.value); setPage(1); }}
            className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Types</option>
            <option value="BUSINESS">Business</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        }
        serverPagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setLimit(newSize); setPage(1); }}
        emptyMessage="No website leads yet"
        emptySubtitle="Enquiries from the website form will appear here"
        emptyIcon={Globe}
      />
    </div>
  );
}
