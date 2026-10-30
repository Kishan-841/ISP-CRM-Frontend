'use client';

import { useEffect, useState } from 'react';
import {
  Building2, User, Phone, Mail, Receipt, Cpu, Cloud, Check,
  Send, RefreshCw, AlertTriangle, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { useLeadStore } from '@/lib/store';

/**
 * MSP Lead — capture business for the MSP CRM.
 *
 * These are NOT ISP leads. They go straight to the MSP CRM and never enter the
 * ISP pipeline, so they cannot distort pipeline counts or ARC totals.
 *
 * Only company, contact person, phone and email are required — the MSP CRM's
 * four. Tax details and the requirement are optional on both sides.
 */

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

// Mirrors the server's list. The server validates anyway, so a stale tab
// cannot post "Firewall" under Software.
const CLASSIFICATIONS = [
  { value: 'HARDWARE', label: 'Hardware', description: 'Physical devices', icon: Cpu,
    subcategories: ['Firewall', 'Access Point', 'Servers', 'Switches', 'Routers', 'NAS'] },
  { value: 'SOFTWARE', label: 'Software', description: 'Software & cloud', icon: Cloud,
    subcategories: ['Cloud'] },
];

const EMPTY = {
  companyName: '', contactPerson: '', phone: '', email: '',
  gstin: '', state: '', billingAddress: '', requirement: '',
  classification: 'HARDWARE', subcategories: [],
};

const SEND_TONE = {
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  NOT_SENT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const Section = ({ title, optional, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</span>
      {optional && <span className="text-xs uppercase tracking-wide text-slate-400">Optional</span>}
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
    {children}
  </div>
);

const Field = ({ icon: Icon, ...props }) => (
  <div className="relative">
    {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
    <Input {...props} className={`h-11 ${Icon ? 'pl-10' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700`} />
  </div>
);

export default function MspLeadPage() {
  const { mspLeads, mspLeadsPagination, mspLeadsLoading, fetchMspLeads, createMspLead, resendMspLead } = useLeadStore();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [resendingId, setResendingId] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const active = CLASSIFICATIONS.find((c) => c.value === form.classification);

  const load = () => fetchMspLeads({ search, page, limit: pageSize });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  // Switching classification drops subcategories that belong to the other one,
  // so a Hardware pick cannot survive into a Software submission.
  const pickClassification = (value) => {
    setForm((f) => ({ ...f, classification: value, subcategories: [] }));
  };

  const toggleSub = (name) => {
    setForm((f) => ({
      ...f,
      subcategories: f.subcategories.includes(name)
        ? f.subcategories.filter((s) => s !== name)
        : [...f.subcategories, name],
    }));
  };

  const missing = ['companyName', 'contactPerson', 'phone', 'email'].filter((k) => !form[k].trim());

  const submit = async () => {
    setError(null);
    if (missing.length > 0) { setError('Company name, contact person, phone and email are required.'); return; }
    setSaving(true);
    const res = await createMspLead({
      ...form,
      gstin: form.gstin || undefined,
      state: form.state || undefined,
      billingAddress: form.billingAddress || undefined,
      requirement: form.requirement || undefined,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    // The server returns 201 even when the MSP CRM rejected or was unreachable
    // — the row is saved either way, so the message distinguishes them.
    if (res.data?.sendStatus === 'SENT') toast.success(res.message);
    else toast(res.message, { icon: '⏳' });
    setForm(EMPTY);
    setPage(1);
    load();
  };

  const resend = async (id) => {
    setResendingId(id);
    const res = await resendMspLead(id);
    setResendingId(null);
    if (!res.success) toast.error(res.error);
    else if (res.queued) toast(res.message, { icon: '⏳' });
    else toast.success(res.message);
    load();
  };

  const columns = [
    { key: 'companyName', label: 'Company',
      render: (r) => (
        <div>
          <p className="font-medium">{r.companyName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{r.contactPerson}</p>
        </div>
      ) },
    { key: 'contact', label: 'Contact',
      render: (r) => (
        <div className="text-xs">
          <p>{r.phone}</p>
          <p className="text-slate-500 dark:text-slate-400">{r.email}</p>
        </div>
      ) },
    { key: 'classification', label: 'Requirement',
      render: (r) => (
        <div>
          <p className="text-sm">{r.classification === 'SOFTWARE' ? 'Software' : 'Hardware'}</p>
          {r.subcategories?.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{r.subcategories.join(', ')}</p>
          )}
        </div>
      ) },
    { key: 'sendStatus', label: 'Sent',
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEND_TONE[r.sendStatus] || SEND_TONE.NOT_SENT}`}>
          {r.sendStatus === 'SENT' ? 'Sent' : r.sendStatus === 'PENDING' ? 'Queued' : r.sendStatus === 'FAILED' ? 'Rejected' : 'Not sent'}
        </span>
      ) },
    { key: 'statusLabel', label: 'MSP status',
      // Rendered from statusLabel, never from a fixed list of codes: the MSP
      // side may add statuses and we are told to fall back to the label.
      render: (r) => (
        <div>
          <p className="text-sm">{r.statusLabel || '—'}</p>
          {r.assignedTo && <p className="text-xs text-slate-500 dark:text-slate-400">{r.assignedTo}</p>}
          {r.orderNo > 1 && <p className="text-xs text-slate-500">Order #{r.orderNo}</p>}
          {r.dropReason && <p className="text-xs text-red-600 dark:text-red-400">{r.dropReason}</p>}
        </div>
      ) },
    { key: 'createdAt', label: 'Created',
      render: (r) => (
        <div className="text-xs">
          <p>{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
          {r.createdBy && <p className="text-slate-500 dark:text-slate-400">{r.createdBy}</p>}
        </div>
      ) },
    { key: 'actions', label: '',
      render: (r) => (r.sendStatus === 'SENT' ? null : (
        <button
          onClick={() => resend(r.id)}
          disabled={resendingId === r.id}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 disabled:opacity-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
          title={r.lastError || 'Send again'}
        >
          <RefreshCw size={13} className={resendingId === r.id ? 'animate-spin' : ''} />
          Retry
        </button>
      )) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="MSP Lead" description="Capture a lead for the MSP CRM — these do not enter the ISP pipeline" />

      {/* ── the form ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2 dark:bg-blue-950/40">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New lead</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Capture a potential customer — it is sent to the MSP CRM straight away.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Contact details">
            <Field icon={Building2} placeholder="Company name" value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)} />
            <Field icon={User} placeholder="Contact person" value={form.contactPerson}
              onChange={(e) => set('contactPerson', e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={Phone} placeholder="9876543210" value={form.phone}
                onChange={(e) => set('phone', e.target.value)} />
              <Field icon={Mail} type="email" placeholder="name@company.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} />
            </div>
          </Section>

          <Section title="Tax details" optional>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={Receipt} placeholder="GSTIN" value={form.gstin}
                onChange={(e) => set('gstin', e.target.value)} />
              <select
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">State</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <textarea
              placeholder="Billing address"
              rows={3}
              value={form.billingAddress}
              onChange={(e) => set('billingAddress', e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Section>

          <Section title="Classification">
            <div className="grid gap-3 sm:grid-cols-2">
              {CLASSIFICATIONS.map((c) => {
                const Icon = c.icon;
                const on = form.classification === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => pickClassification(c.value)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      on
                        ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className={`rounded-lg p-2 ${on ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Icon className={`h-5 w-5 ${on ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-slate-900 dark:text-white">{c.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{c.description}</span>
                    </span>
                    {on && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-slate-900 dark:text-white">Subcategories</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{form.subcategories.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {active.subcategories.map((name) => {
                const on = form.subcategories.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSub(name)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      on
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Requirement" optional>
            <textarea
              placeholder="What does the customer need?"
              rows={3}
              value={form.requirement}
              onChange={(e) => set('requirement', e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Section>

          {error && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle size={15} /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => { setForm(EMPTY); setError(null); }}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              onClick={submit}
              disabled={saving || missing.length > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              {saving ? 'Saving…' : 'Create & send to MSP'}
            </button>
          </div>
        </div>
      </div>

      {/* ── what has been sent ────────────────────────────────────────── */}
      <DataTable
        title="MSP Leads"
        columns={columns}
        data={mspLeads}
        loading={mspLeadsLoading}
        emptyMessage="No MSP leads yet"
        emptyIcon={Cloud}
        totalCount={mspLeadsPagination?.total || 0}
        serverPagination={mspLeadsPagination}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        filters={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 w-56 pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              placeholder="Company, contact, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />
    </div>
  );
}
