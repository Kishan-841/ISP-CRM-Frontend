'use client';

import { useEffect, useState } from 'react';
import { Send, CheckCircle2, AlertTriangle, Clock, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLeadStore } from '@/lib/store';

/**
 * Hand a lead to the MSP CRM, and show what came back.
 *
 * The modal fetches status on open rather than taking it as a prop, so it is
 * always current even if the 5-minute poll moved it since the list was loaded.
 *
 * Statuses are rendered from `statusLabel`, not from the status code: the MSP
 * side says new statuses may be added, so anything keyed off a fixed list of
 * codes would show a blank for a status that is perfectly valid.
 */

const STATUS_TONE = {
  RECEIVED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  IN_DISCUSSION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  QUOTATION_IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  QUOTATION_SENT: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  ORDER_IN_PROGRESS: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  INVOICED: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  CLOSED_WON: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  DROPPED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  REMOVED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};
const toneFor = (code) => STATUS_TONE[code] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-1.5">
    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-sm text-right text-slate-900 dark:text-slate-100">{children}</span>
  </div>
);

export default function SendToMspModal({ lead, open, onClose, onSent }) {
  const { fetchLeadMspStatus, sendLeadToMsp } = useLeadStore();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchLeadMspStatus(lead.id);
    if (res.success) setInfo(res.data);
    else setError(res.error);
    setLoading(false);
  };

  useEffect(() => {
    if (open && lead?.id) { setError(null); load(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  if (!open || !lead) return null;

  const company = lead.company || lead.campaignData?.company || 'this lead';
  const sent = info?.sendStatus === 'SENT';

  const submit = async () => {
    setSending(true);
    setError(null);
    const res = await sendLeadToMsp(lead.id);
    setSending(false);

    if (!res.success) { setError(res.error); return; }
    // 202: unreachable but queued. Say so plainly rather than claiming success.
    if (res.queued) toast(res.message, { icon: '⏳' });
    else toast.success(res.message || 'Sent to MSP CRM.');
    await load();
    onSent?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Send to MSP CRM</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{company}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && <p className="text-sm text-slate-500">Loading…</p>}

          {!loading && info && !info.configured && (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                The MSP CRM integration is not configured on the server. An admin needs to set
                <code className="mx-1 rounded bg-amber-100 px-1 dark:bg-amber-900/40">MSP_CRM_API_URL</code>
                and
                <code className="mx-1 rounded bg-amber-100 px-1 dark:bg-amber-900/40">MSP_CRM_API_KEY</code>.
              </p>
            </div>
          )}

          {/* Already handed over — show where it stands on their side. */}
          {!loading && info && sent && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">Already sent</span>
                {info.statusLabel && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${toneFor(info.status)}`}>
                    {info.statusLabel}
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {info.assignedTo && <Row label="Sales person">{info.assignedTo}</Row>}
                {/* orderNo > 1 is a repeat order, not an error — their words. */}
                {info.orderNo > 1 && <Row label="Order">#{info.orderNo} (repeat order)</Row>}
                {info.dropReason && (
                  <Row label="Drop reason"><span className="text-red-600 dark:text-red-400">{info.dropReason}</span></Row>
                )}
                {info.sentAt && <Row label="Sent">{new Date(info.sentAt).toLocaleString('en-IN')}{info.sentBy ? ` by ${info.sentBy}` : ''}</Row>}
                {info.syncedAt && <Row label="Status checked">{new Date(info.syncedAt).toLocaleString('en-IN')}</Row>}
                {info.removedAt && (
                  <Row label="Removed"><span className="text-red-600 dark:text-red-400">Deleted in the MSP CRM</span></Row>
                )}
              </div>
            </div>
          )}

          {/* Queued after a transient failure. */}
          {!loading && info && info.sendStatus === 'PENDING' && (
            <div className="flex gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
              <Clock size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p>Queued — the MSP CRM could not be reached. It retries automatically every 5 minutes.</p>
                {info.lastError && <p className="mt-1 text-xs opacity-80">Last error: {info.lastError}</p>}
              </div>
            </div>
          )}

          {/* Rejected: a human has to change something. */}
          {!loading && info && info.sendStatus === 'FAILED' && (
            <div className="flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p>The MSP CRM rejected this lead. Fix the data below and send again.</p>
                {info.lastError && <p className="mt-1 text-xs opacity-80">{info.lastError}</p>}
              </div>
            </div>
          )}

          {/* The four fields their API requires. Shown before sending so the
              user fixes the lead instead of reading a rejection afterwards. */}
          {!loading && info && info.missingFields?.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This lead is missing {info.missingFields.join(', ')}. The MSP CRM requires company name,
                contact person, phone and email — add them to the lead first.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 p-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={
              sending || loading || !info?.configured || !info?.canSend ||
              info?.missingFields?.length > 0 || sent
            }
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sent ? <ExternalLink size={15} /> : <Send size={15} />}
            {sending ? 'Sending…' : sent ? 'Already sent' : info?.sendStatus === 'FAILED' ? 'Retry send' : 'Send to MSP CRM'}
          </button>
        </div>
      </div>
    </div>
  );
}
