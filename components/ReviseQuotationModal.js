'use client';
import { useEffect, useState } from 'react';
import { X, IndianRupee, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadStore } from '@/lib/store';
import toast from 'react-hot-toast';

// Sales Director–only modal to revise ARC / OTC after their own quotation
// approval. Lead must already be SA2-approved; backend enforces both the
// role and the approval guard. A reason is required (audit trail) and
// surfaces in the "Quotation Revised" badge tooltip across the UI.
export default function ReviseQuotationModal({ lead, open, onClose, onSuccess }) {
  const reviseQuotation = useLeadStore(s => s.reviseQuotation);
  const [arc, setArc] = useState('');
  const [otc, setOtc] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasOtc = lead?.hasOtc !== false;

  useEffect(() => {
    if (open && lead) {
      setArc(lead.arcAmount != null ? String(lead.arcAmount) : '');
      setOtc(lead.otcAmount != null ? String(lead.otcAmount) : '');
      setReason('');
    }
  }, [open, lead]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  if (!open || !lead) return null;

  const arcNum = arc === '' ? null : Number(arc);
  const otcNum = otc === '' ? null : Number(otc);
  const arcChanged = arcNum != null && arcNum !== Number(lead.arcAmount || 0);
  const otcChanged = hasOtc && otcNum != null && otcNum !== Number(lead.otcAmount || 0);
  const reasonOk = reason.trim().length >= 3;
  const canSubmit = (arcChanged || otcChanged) && reasonOk && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = { reason: reason.trim() };
    if (arcChanged) payload.arcAmount = arcNum;
    if (otcChanged) payload.otcAmount = otcNum;
    const res = await reviseQuotation(lead.id, payload);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message || 'Quotation revised');
      onSuccess?.(res.lead);
      onClose();
    } else {
      toast.error(res.error || 'Failed to revise quotation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
         onClick={() => !submitting && onClose()}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">Revise Quotation</h3>
          </div>
          <button onClick={onClose} disabled={submitting}
                  className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Context strip — which lead we're revising */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {lead.campaignData?.company || lead.company || lead.leadNumber}
            {lead.leadNumber && <span className="text-slate-400"> · {lead.leadNumber}</span>}
            {(lead.quotationRevisionCount || 0) > 0 && (
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Already revised {lead.quotationRevisionCount} time{lead.quotationRevisionCount === 1 ? '' : 's'}
              </div>
            )}
          </div>

          <div className={hasOtc ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                ARC (Monthly)
              </label>
              <Input
                type="number" inputMode="decimal"
                value={arc}
                onChange={(e) => setArc(e.target.value)}
                placeholder="Enter ARC"
                disabled={submitting}
                className="text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Current: ₹{Number(lead.arcAmount || 0).toLocaleString('en-IN')}
              </p>
            </div>
            {hasOtc && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  OTC (One-time)
                </label>
                <Input
                  type="number" inputMode="decimal"
                  value={otc}
                  onChange={(e) => setOtc(e.target.value)}
                  placeholder="Enter OTC"
                  disabled={submitting}
                  className="text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Current: ₹{Number(lead.otcAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason for revision <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this quotation being revised? (recorded in the audit trail)"
              rows={3}
              disabled={submitting}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Minimum 3 characters. Visible to anyone viewing the lead.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {submitting ? 'Saving…' : 'Save revision'}
          </Button>
        </div>
      </div>
    </div>
  );
}
