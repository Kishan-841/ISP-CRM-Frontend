'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MailOpen, Inbox, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable';
import TabBar from '@/components/TabBar';

const ALLOWED_ROLES = ['MASTER', 'ADMIN', 'SALES_DIRECTOR', 'SUPER_ADMIN'];
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN') : '—');

export default function ContactMessagesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const allowed = user && ALLOWED_ROLES.includes(user.role);

  const [tab, setTab] = useState('unread');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ unread: 0, all: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (user && !allowed) router.replace('/dashboard'); }, [user, allowed, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/contact-messages/list', { params: { read: tab, page, limit } });
      setItems(data.items); setStats(data.stats); setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load messages');
    }
    setLoading(false);
  }, [tab, page, limit]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const markRead = async (row) => {
    try {
      await api.post(`/contact-messages/${row.id}/read`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const openMessage = (row) => {
    setSelected(row);
    if (!row.isRead) markRead(row);
  };

  if (!allowed) return null;

  const columns = [
    {
      key: 'status', label: '', width: '40px',
      render: (r) => r.isRead
        ? <MailOpen className="w-4 h-4 text-slate-400" />
        : <Mail className="w-4 h-4 text-orange-600" />
    },
    {
      key: 'name', label: 'From',
      render: (r) => (
        <div>
          <p className={`${r.isRead ? '' : 'font-semibold'} text-slate-900 dark:text-white`}>{r.name}</p>
          {r.company && <p className="text-xs text-slate-500">{r.company}</p>}
        </div>
      )
    },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    {
      key: 'subject', label: 'Subject',
      render: (r) => <span className={`block max-w-[200px] truncate ${r.isRead ? '' : 'font-medium'}`} title={r.subject || ''}>{r.subject || '—'}</span>
    },
    {
      key: 'message', label: 'Message',
      render: (r) => <span className="block max-w-[260px] truncate text-slate-500" title={r.message}>{r.message}</span>
    },
    { key: 'receivedAt', label: 'Received', render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-6 h-6 text-orange-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contact Messages</h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        "Send us a message" submissions from the website contact page
      </p>

      <TabBar
        tabs={[
          { key: 'unread', label: 'Unread', icon: Inbox, count: stats.unread, variant: 'warning' },
          { key: 'all', label: 'All', icon: CheckCircle2, count: stats.all, variant: 'default' },
        ]}
        activeTab={tab}
        onTabChange={(k) => { setTab(k); setPage(1); }}
      />

      <DataTable
        className="mt-4"
        columns={columns}
        data={items}
        loading={loading}
        serverPagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setLimit(n); setPage(1); }}
        onRowClick={openMessage}
        emptyMessage={tab === 'unread' ? 'No unread messages' : 'No messages yet'}
        emptySubtitle="Contact form submissions from the website will appear here"
        emptyIcon={Mail}
      />

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selected.subject || 'Contact message'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{fmtDateTime(selected.createdAt)}</p>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500">Name</p><p className="font-medium">{selected.name}</p></div>
                <div><p className="text-xs text-slate-500">Company</p><p>{selected.company || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Phone</p><p>{selected.phone || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Email</p><p className="break-all">{selected.email || '—'}</p></div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Message</p>
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-800 p-3">{selected.message}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
