'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Gauge, Clock, RotateCcw, Receipt, Zap, CheckCircle2, Send, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import DataTable, { StatusBadge } from '@/components/DataTable';
import TabBar from '@/components/TabBar';

const ALLOWED_ROLES = ['ACCOUNTS_TEAM', 'SUPER_ADMIN', 'MASTER'];
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
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function AccountsBodPage() {
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

  const [billing, setBilling] = useState(null);   // row being billed
  const [billPrice, setBillPrice] = useState('');
  const [returning, setReturning] = useState(null); // row being sent back
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user && !allowed) router.replace('/dashboard'); }, [user, allowed, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bod/accounts/queue', { params: { status: tab, page, limit } });
      setItems(data.items); setStats(data.stats); setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load queue');
    }
    setLoading(false);
  }, [tab, page, limit]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const generateBill = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/bod/${billing.id}/generate-bill`, { price: billPrice });
      toast.success(data.message);
      setBilling(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    }
    setBusy(false);
  };

  const sendBack = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/bod/${returning.id}/send-back`, { note });
      toast.success(data.message);
      setReturning(null); setNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send back');
    }
    setBusy(false);
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
    { key: 'by', label: 'Raised by', render: (r) => r.createdBy?.name || '—' },
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
      render: (r) => r.invoice ? (
        <div><p className="font-mono text-xs">{r.invoice.invoiceNumber}</p><StatusBadge status={r.invoice.status} /><p className="text-xs text-slate-500 mt-0.5">{fmtMoney(r.invoice.grandTotal)}</p></div>
      ) : <span className="text-slate-400">—</span>
    },
    { key: 'remarks', label: 'Remarks', render: (r) => <span className="block max-w-[200px] truncate text-xs" title={r.remarks || ''}>{r.remarks || '—'}</span> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Gauge className="w-6 h-6 text-orange-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BOD Requests</h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Review pricing and generate bills for bandwidth-on-demand requests</p>

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
        actions={(r) => r.status === 'PENDING_ACCOUNTS' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setReturning(r); setNote(''); }}><Undo2 className="h-3.5 w-3.5 mr-1" />Send Back</Button>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { setBilling(r); setBillPrice(String(r.price)); }}><Send className="h-3.5 w-3.5 mr-1" />Generate Bill</Button>
          </div>
        ) : null}
      />

      {billing && (
        <Modal title={`Generate bill — ${billing.bodNumber}`} onClose={() => !busy && setBilling(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong>{billing.lead?.campaignData?.company}</strong> · {billing.requestedBandwidthMbps} Mbps · {fmtDate(billing.startDate)} – {fmtDate(billing.endDate)} ({billing.durationDays} days)
          </p>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Price (₹, before GST)</label>
            <input type="number" min="1" step="0.01" value={billPrice} onChange={(e) => setBillPrice(e.target.value)} className={inputCls} />
            <p className="text-xs text-slate-500 mt-1">BDM proposed {fmtMoney(billing.price)}. Edit if needed — the invoice will use this value.</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm space-y-1">
            <Row k="Base" v={fmtMoney(billPrice)} />
            <Row k="SGST 9%" v={fmtMoney(Number(billPrice) * 0.09)} />
            <Row k="CGST 9%" v={fmtMoney(Number(billPrice) * 0.09)} />
            <Row k="Invoice total" v={fmtMoney(Number(billPrice) * 1.18)} bold />
          </div>
          <p className="text-xs text-slate-500">On confirm: invoice + ledger entry are created, NOC is notified to provision from {fmtDate(billing.startDate)}, and the BDM is informed.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setBilling(null)} disabled={busy}>Cancel</Button>
            <Button onClick={generateBill} disabled={busy || !(Number(billPrice) > 0)} className="bg-orange-600 hover:bg-orange-700 text-white">{busy ? 'Generating…' : 'Generate Bill'}</Button>
          </div>
        </Modal>
      )}

      {returning && (
        <Modal title={`Send back — ${returning.bodNumber}`} onClose={() => !busy && setReturning(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Tell {returning.createdBy?.name || 'the BDM'} what needs to change. They can edit and resubmit.</p>
          <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} h-auto py-2 resize-none`} placeholder="e.g. Price too low for 500 Mbps — minimum ₹3,000/day" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setReturning(null)} disabled={busy}>Cancel</Button>
            <Button onClick={sendBack} disabled={busy || !note.trim()} className="bg-rose-600 hover:bg-rose-700 text-white">{busy ? 'Sending…' : 'Send Back'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100';
function Row({ k, v, bold }) {
  return <div className={`flex justify-between ${bold ? 'font-semibold text-orange-600 border-t border-slate-200 dark:border-slate-700 pt-1' : ''}`}><span>{k}</span><span>{v}</span></div>;
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2></div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}
