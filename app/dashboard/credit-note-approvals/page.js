'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRoleCheck } from '@/lib/useRoleCheck';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  ChevronRight,
  X,
  IndianRupee,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/formatters';
import { useSocketRefresh } from '@/lib/useSocketRefresh';

const REASON_LABELS = {
  SERVICE_DOWNTIME: 'Service Downtime',
  OVERPAYMENT: 'Overpayment',
  PRICE_ADJUSTMENT: 'Price Adjustment',
  CANCELLATION: 'Cancellation',
  ERROR_CORRECTION: 'Error Correction',
  PLAN_DOWNGRADE: 'Plan Downgrade'
};

export default function CreditNoteApprovalsPage() {
  const { isSuperAdmin } = useRoleCheck();
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/credit-notes/admin/pending-approval');
      setCreditNotes(res.data.creditNotes || []);
    } catch {
      toast.error('Failed to load pending credit notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useSocketRefresh(() => { fetchPending(); });

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/credit-notes/${id}/approve`);
      toast.success('Credit note approved and applied');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActionLoading(rejectId);
    try {
      await api.post(`/credit-notes/${rejectId}/reject`, { rejectionReason: rejectReason });
      toast.success('Credit note rejected');
      setRejectId(null);
      setRejectReason('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isSuperAdmin) {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-500">Access denied.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Dashboard</span> <ChevronRight size={12} /> <span>Credit Note Approvals</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-1 h-7 bg-amber-500 rounded-full" />
              Credit Note Approvals
            </h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve credit notes before they are applied</p>
          </div>
          {creditNotes.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">
              {creditNotes.length} Pending
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : creditNotes.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <CheckCircle size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No credit notes pending approval</p>
        </div>
      ) : (
        <div className="space-y-3">
          {creditNotes.map((cn) => (
            <div key={cn.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <FileText size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{cn.creditNoteNumber}</p>
                      <p className="text-xs text-slate-500">
                        Against Invoice: {cn.invoice?.invoiceNumber || '-'} | Created by: {cn.createdBy?.name || '-'} ({cn.createdBy?.role})
                      </p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Customer</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{cn.invoice?.lead?.campaignData?.company || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Base Amount</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(cn.baseAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">GST (18%)</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(cn.totalGstAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total Credit</p>
                      <p className="font-bold text-red-600">{formatCurrency(cn.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Reason</p>
                      <Badge className="bg-slate-100 text-slate-600 text-[10px]">{REASON_LABELS[cn.reason] || cn.reason}</Badge>
                    </div>
                  </div>

                  {cn.remarks && (
                    <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">Remarks: {cn.remarks}</p>
                  )}

                  {/* Invoice context */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Invoice Total: {formatCurrency(cn.invoice?.grandTotal)}</span>
                    <span>Already Credited: {formatCurrency(cn.invoice?.totalCreditAmount || 0)}</span>
                    <span>Invoice Status: {cn.invoice?.status}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(cn.id)}
                    disabled={actionLoading === cn.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4"
                  >
                    {actionLoading === cn.id ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} className="mr-1" /> Approve</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setRejectId(cn.id); setRejectReason(''); }}
                    disabled={actionLoading === cn.id}
                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-9 px-4"
                  >
                    <XCircle size={14} className="mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reject Credit Note</h3>
              <button onClick={() => setRejectId(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={16} />
                This will reject the credit note. It will not be applied to the invoice.
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this credit note being rejected?"
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={actionLoading === rejectId}>
                {actionLoading === rejectId ? <Loader2 size={16} className="mr-1 animate-spin" /> : <XCircle size={16} className="mr-1" />}
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
