'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import {
  PackageOpen,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Barcode
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatDate } from '@/lib/formatters';

const CATEGORY_LABELS = {
  SWITCH: 'Switch', SFP: 'SFP', CLOSURE: 'Closure', RF: 'RF',
  PATCH_CORD: 'Patch Cord', FIBER: 'Fiber', MEDIA_CONVERTER: 'Media Converter', ROUTER: 'Router'
};

export default function MaterialReturnApprovalsPage() {
  const { user, isAdmin } = useRoleCheck();

  const [pending, setPending] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  // Reject modal — a reason is mandatory, so it can't be a bare confirm.
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useModal(!!rejectTarget, () => !rejecting && setRejectTarget(null));

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/store/material-returns/pending');
      setPending(res.data.returns || []);
    } catch (err) {
      console.error('Failed to load pending material returns:', err);
      toast.error('Failed to load pending returns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPending();
  }, [isAdmin, fetchPending]);

  useSocketRefresh(() => fetchPending(), { enabled: isAdmin });

  const handleApprove = async (row) => {
    setActioningId(row.id);
    try {
      const res = await api.post(`/store/material-returns/${row.id}/approve`);
      toast.success(res.data.message || 'Return approved');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    setRejecting(true);
    try {
      const res = await api.post(`/store/material-returns/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim()
      });
      toast.success(res.data.message || 'Return rejected');
      setRejectTarget(null);
      setRejectReason('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Return Approvals"
        description="Approve recovered material before it enters the store. Nothing is added to inventory until you approve it."
      />

      <DataTable
        title="Pending Approval"
        totalCount={pending.length}
        data={pending}
        loading={isLoading}
        pagination={true}
        defaultPageSize={10}
        emptyMessage="No material returns are waiting for approval."
        emptyIcon={PackageOpen}
        searchable={true}
        searchPlaceholder="Search serial, company or product..."
        searchKeys={['serialNumber', 'company', 'productModel']}
        columns={[
          {
            key: 'serial',
            label: 'Serial Number',
            render: (row) => (
              <div className="flex items-center gap-1.5">
                <Barcode size={12} className="text-slate-400 flex-shrink-0" />
                <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                  {row.serialNumber}
                </span>
              </div>
            )
          },
          {
            key: 'product',
            label: 'Product',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {row.productModel || '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {CATEGORY_LABELS[row.productCategory] || row.productCategory}
                </p>
              </div>
            )
          },
          {
            key: 'company',
            label: 'Returned From',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {row.company || '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.leadNumber || ''}</p>
              </div>
            )
          },
          {
            key: 'condition',
            label: 'Condition',
            render: (row) => (
              row.condition === 'FAULTY' ? (
                <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0 text-xs gap-1">
                  <AlertTriangle size={10} /> Faulty
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 text-xs gap-1">
                  <CheckCircle2 size={10} /> Good
                </Badge>
              )
            )
          },
          {
            key: 'remark',
            label: 'Reason',
            render: (row) => (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[220px]" title={row.remark}>
                {row.remark}
              </p>
            )
          },
          {
            key: 'submitted',
            label: 'Submitted',
            render: (row) => (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p>{formatDate(row.returnedAt)}</p>
                {row.returnedBy && <p className="text-[10px]">by {row.returnedBy}</p>}
              </div>
            )
          }
        ]}
        actions={(row) => (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              onClick={() => handleApprove(row)}
              disabled={actioningId === row.id}
              className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {actioningId === row.id
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckCircle2 size={12} />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setRejectTarget(row); setRejectReason(''); }}
              disabled={actioningId === row.id}
              className="h-8 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X size={12} />
              Reject
            </Button>
          </div>
        )}
      />

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reject Return</h2>
              <button
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="font-mono font-medium">{rejectTarget.serialNumber}</span>
                {' · '}{rejectTarget.productModel}
                {' · from '}{rejectTarget.company}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The material will not be added to inventory and stays recorded against the customer.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Why is this return being rejected?"
                  className="mt-1.5 w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejecting}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {rejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
