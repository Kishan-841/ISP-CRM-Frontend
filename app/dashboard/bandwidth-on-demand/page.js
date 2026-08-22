'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Gauge, Plus, Clock, RotateCcw, Receipt, Zap, CheckCircle2, XCircle, Search, Pencil, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import DataTable, { StatusBadge } from '@/components/DataTable';
import TabBar from '@/components/TabBar';

const ALLOWED_ROLES = ['BDM', 'BDM_TEAM_LEADER', 'SUPER_ADMIN', 'MASTER'];
const STATUS_COLORS = {
  PENDING_ACCOUNTS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SENT_BACK: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  BILLED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  CANCELLED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};
const TABS = [
  { key: 'PENDING_ACCOUNTS', label: 'Pending', icon: Clock, variant: 'warning' },
  { key: 'SENT_BACK', label: 'Sent Back', icon: RotateCcw, variant: 'danger' },
  { key: 'BILLED', label: 'Billed', icon: Receipt, variant: 'default' },
  { key: 'ACTIVE', label: 'Active', icon: Zap, variant: 'success' },
  { key: 'EXPIRED', label: 'Expired', icon: CheckCircle2, variant: 'default' },
  { key: 'CANCELLED', label: 'Cancelled', icon: XCircle, variant: 'default' },
];
const EMPTY_FORM = { leadId: '', customer: null, requestedBandwidthMbps: '', durationDays: '', startDate: '', price: '', remarks: '' };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d; };
// yyyy-mm-dd in LOCAL time (toISOString would shift IST dates back a day)
const toInputDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export default function BandwidthOnDemandPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const allowed = user && ALLOWED_ROLES.includes(user.role);

  const [tab, setTab] = useState('PENDING_ACCOUNTS');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => { if (user && !allowed) router.replace('/dashboard'); }, [user, allowed, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bod', { params: { status: tab, page, limit } });
      setItems(data.items); setStats(data.stats); setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load requests');
    }
    setLoading(false);
  }, [tab, page, limit]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  // Debounced active-customer search
  useEffect(() => {
    if (!showForm || editingId || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/bod/customers', { params: { q: query.trim() } });
        setResults(data.customers);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, showForm, editingId]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setQuery(''); setResults([]); setShowForm(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      leadId: row.leadId,
      customer: { company: row.lead?.campaignData?.company, leadNumber: row.lead?.leadNumber, planBandwidthMbps: row.currentPlanBandwidth },
      requestedBandwidthMbps: String(row.requestedBandwidthMbps),
      durationDays: String(row.durationDays),
      startDate: row.startDate ? toInputDate(row.startDate) : '',
      price: String(row.price),
      remarks: row.remarks || ''
    });
    setShowForm(true);
  };

  const endDatePreview = form.startDate && Number(form.durationDays) > 0 ? fmtDate(addDays(form.startDate, Number(form.durationDays) - 1)) : '—';
  const gstPreview = Number(form.price) > 0 ? fmtMoney(Number(form.price) * 1.18) : '—';

  const submit = async () => {
    if (!form.leadId) return toast.error('Select a customer');
    setSaving(true);
    try {
      const payload = {
        leadId: form.leadId,
        requestedBandwidthMbps: form.requestedBandwidthMbps,
        durationDays: form.durationDays,
        startDate: form.startDate,
        price: form.price,
        remarks: form.remarks
      };
      const { data } = editingId ? await api.put(`/bod/${editingId}`, payload) : await api.post('/bod', payload);
      toast.success(data.message);
      setShowForm(false);
      setTab('PENDING_ACCOUNTS'); setPage(1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const cancel = async (row) => {
    if (!confirm(`Cancel ${row.bodNumber}?`)) return;
    try {
      const { data } = await api.post(`/bod/${row.id}/cancel`);
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (!allowed) return null;

  const columns = [
    { key: 'bodNumber', label: 'BOD #', render: (r) => <span className="font-mono text-xs">{r.bodNumber}</span> },
    {
      key: 'customer', label: 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{r.lead?.campaignData?.company || '—'}</p>
          <p className="text-xs text-slate-500">{r.lead?.leadNumber} · {r.lead?.customerUsername || r.lead?.campaignData?.phone}</p>
        </div>
      )
    },
    {
      key: 'bandwidth', label: 'Bandwidth',
      render: (r) => <span>{r.currentPlanBandwidth ? `${r.currentPlanBandwidth} → ` : ''}<strong>{r.requestedBandwidthMbps} Mbps</strong></span>
    },
    {
      key: 'window', label: 'Window',
      render: (r) => <span className="whitespace-nowrap">{fmtDate(r.startDate)} – {fmtDate(r.endDate)} <span className="text-slate-500">({r.durationDays}d)</span></span>
    },
    {
      key: 'price', label: 'Price',
      render: (r) => <div><p>{fmtMoney(r.price)}</p><p className="text-xs text-slate-500">{fmtMoney(r.price * 1.18)} incl. GST</p></div>
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} colorMap={STATUS_COLORS} /> },
    {
      key: 'invoice', label: 'Invoice',
      render: (r) => r.invoice ? <div><p className="font-mono text-xs">{r.invoice.invoiceNumber}</p><StatusBadge status={r.invoice.status} /></div> : <span className="text-slate-400">—</span>
    },
    {
      key: 'notes', label: 'Notes',
      render: (r) => (
        <div className="max-w-[220px] text-xs">
          {r.remarks && <p className="truncate" title={r.remarks}>{r.remarks}</p>}
          {r.accountsNote && <p className="text-rose-600 truncate" title={r.accountsNote}>Accounts: {r.accountsNote}</p>}
          {!r.remarks && !r.accountsNote && <span className="text-slate-400">—</span>}
        </div>
      )
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bandwidth on Demand</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Temporary bandwidth boosts for active customers, billed separately from the plan</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New BOD Request
        </Button>
      </div>

      <TabBar
        tabs={TABS.map(t => ({ ...t, count: stats[t.key] || 0 }))}
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
        emptyMessage="No requests in this tab"
        emptyIcon={Gauge}
        actions={(r) => ['PENDING_ACCOUNTS', 'SENT_BACK'].includes(r.status) ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
            <Button size="sm" variant="outline" className="text-rose-600" onClick={() => cancel(r)}><Ban className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          </div>
        ) : null}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingId ? 'Edit BOD Request' : 'New BOD Request'}</h2>
              {editingId && form.customer?.company && <p className="text-xs text-slate-500 mt-0.5">{form.customer.company}</p>}
            </div>
            <div className="p-6 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Customer <span className="text-red-500">*</span></label>
                  {form.customer ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{form.customer.company}</p>
                        <p className="text-xs text-slate-500">{form.customer.leadNumber} · {form.customer.planName || 'plan'}{form.customer.planBandwidthMbps ? ` · ${form.customer.planBandwidthMbps} Mbps` : ''}</p>
                      </div>
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => setForm(f => ({ ...f, leadId: '', customer: null }))}>Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Company, lead number, contact or phone (active customers only)"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                      {results.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                          {results.map(c => (
                            <li key={c.id}
                                onClick={() => { setForm(f => ({ ...f, leadId: c.id, customer: c })); setQuery(''); setResults([]); }}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                              <p className="font-medium">{c.company}</p>
                              <p className="text-xs text-slate-500">{c.leadNumber} · {c.contactName} · {c.phone}{c.planBandwidthMbps ? ` · ${c.planBandwidthMbps} Mbps` : ''}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Requested bandwidth (Mbps)" required>
                  <input type="number" min="1" value={form.requestedBandwidthMbps} onChange={(e) => setForm(f => ({ ...f, requestedBandwidthMbps: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Duration (days)" required>
                  <input type="number" min="1" value={form.durationDays} onChange={(e) => setForm(f => ({ ...f, durationDays: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Start date" required>
                  <input type="date" value={form.startDate} min={toInputDate(new Date())} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="End date">
                  <div className={`${inputCls} flex items-center text-slate-600 dark:text-slate-300`}>{endDatePreview}</div>
                </Field>
                <Field label="Price (₹, before GST)" required>
                  <input type="number" min="1" step="0.01" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Payable incl. 18% GST">
                  <div className={`${inputCls} flex items-center font-semibold text-orange-600`}>{gstPreview}</div>
                </Field>
              </div>
              <Field label="Remarks">
                <textarea rows={3} value={form.remarks} onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))} className={`${inputCls} h-auto py-2 resize-none`} placeholder="Why the customer needs the boost, commitments made, etc." />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
              <Button onClick={submit} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
                {saving ? 'Saving…' : editingId ? 'Resubmit to Accounts' : 'Send to Accounts'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100';
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}
