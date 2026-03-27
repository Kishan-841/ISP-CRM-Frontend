'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { ArrowLeft, CheckCircle2, XCircle, FileText, ExternalLink, Clock, Check, Calendar } from 'lucide-react';
import { SERVICE_ORDER_TYPE_CONFIG, SERVICE_ORDER_STATUS_CONFIG } from '@/lib/statusConfig';

const typeBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

const statusBadgeColors = Object.fromEntries(
  Object.entries(SERVICE_ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.color])
);

// Pipeline stages for non-disconnection orders
const UPGRADE_PIPELINE = [
  { key: 'PENDING_DOCS_REVIEW', label: 'Docs Review' },
  { key: 'PENDING_NOC', label: 'NOC Processing' },
  { key: 'PENDING_SAM_ACTIVATION', label: 'SAM Activation' },
  { key: 'PENDING_ACCOUNTS', label: 'Accounts Billing' },
  { key: 'COMPLETED', label: 'Completed' },
];

// Pipeline stages for disconnection orders
const DISCONNECTION_PIPELINE = [
  { key: 'PENDING_APPROVAL', label: 'Admin Approval' },
  { key: 'APPROVED', label: 'NOC/Accounts Processing' },
  { key: 'COMPLETED', label: 'Completed' },
];

function getStageIndex(pipeline, status) {
  // DOCS_REJECTED maps to the docs review stage
  if (status === 'DOCS_REJECTED') return 0;
  const idx = pipeline.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

function PipelineProgressBar({ pipeline, currentStatus }) {
  const currentIdx = getStageIndex(pipeline, currentStatus);
  const isRejected = currentStatus === 'REJECTED' || currentStatus === 'DOCS_REJECTED' || currentStatus === 'CANCELLED';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 className="text-sm font-semibold text-slate-500 uppercase mb-4">Pipeline Progress</h2>
      <div className="flex items-center w-full">
        {pipeline.map((stage, idx) => {
          const isCompleted = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          const isFuture = currentIdx < idx;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    isCompleted
                      ? 'bg-orange-600 text-white'
                      : isCurrent
                        ? isRejected
                          ? 'border-2 border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
                          : 'border-2 border-orange-600 text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent && !isRejected ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-600" />
                    </span>
                  ) : isCurrent && isRejected ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 text-center whitespace-nowrap ${
                    isCompleted
                      ? 'text-orange-600 dark:text-orange-400 font-medium'
                      : isCurrent
                        ? isRejected
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-orange-600 dark:text-orange-400 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connecting line */}
              {idx < pipeline.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                    isCompleted
                      ? 'bg-orange-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ServiceOrderDetail() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Approval/Rejection modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processNotes, setProcessNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Activation date modal
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationDate, setActivationDate] = useState('');

  // Speed test image viewer
  const [showSpeedTest, setShowSpeedTest] = useState(false);

  // Determine back link based on route path
  const getBackPath = () => {
    if (pathname.includes('/sam-head/')) return '/dashboard/sam-head/orders';
    if (pathname.includes('/order-approvals')) return '/dashboard/order-approvals';
    if (pathname.includes('/accounts-order-requests')) return '/dashboard/accounts-order-requests';
    if (pathname.includes('/accounts-dashboard/')) return '/dashboard/accounts-dashboard/order-requests';
    return '/dashboard/sam-executive/orders';
  };

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/service-orders/${params.id}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load service order');
      router.push(getBackPath());
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${params.id}/approve`);
      toast.success('Service order approved!');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${params.id}/reject`, { rejectionReason });
      toast.success('Service order rejected.');
      setShowRejectModal(false);
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcess = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${params.id}/process`, { processNotes });
      toast.success('Service order processed!');
      setShowProcessModal(false);
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActivationDate = async () => {
    if (!activationDate) {
      toast.error('Please select an activation date.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/service-orders/${params.id}/set-activation-date`, { activationDate });
      toast.success('Activation date set successfully!');
      setShowActivationModal(false);
      setActivationDate('');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set activation date');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!order) return null;

  const isMaster = user?.role === 'MASTER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || isMaster;
  const isAccountsOrNOC = user?.role === 'ACCOUNTS_TEAM' || user?.role === 'NOC';
  const isSAM = user?.role === 'SAM_EXECUTIVE' || user?.role === 'SAM_HEAD' || isMaster;
  const attachments = Array.isArray(order.attachments) ? order.attachments : [];
  const isNonDisconnection = ['UPGRADE', 'DOWNGRADE', 'RATE_REVISION'].includes(order.orderType);
  const pipeline = isNonDisconnection ? UPGRADE_PIPELINE : DISCONNECTION_PIPELINE;

  // Disconnection countdown
  const getDaysRemaining = () => {
    if (!order.disconnectionDate) return null;
    const diff = new Date(order.disconnectionDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(getBackPath())} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl font-bold">{order.orderNumber}</h1>
          </div>
          <p className="text-sm text-slate-500 ml-[18px]">
            Created {formatDate(order.createdAt)} by {order.createdBy?.name}
          </p>
        </div>
        <Badge className={`${typeBadgeColors[order.orderType]} border-0 text-sm`}>
          {order.orderType.replace(/_/g, ' ')}
        </Badge>
        <Badge className={`${statusBadgeColors[order.status]} border-0 text-sm`}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Pipeline Progress Bar */}
      <PipelineProgressBar pipeline={pipeline} currentStatus={order.status} />

      {/* Customer Info */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Customer Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Company</span>
            <p className="font-medium">{order.customer?.campaignData?.company || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">Contact</span>
            <p className="font-medium">{order.customer?.campaignData?.name || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">Username</span>
            <p className="font-medium">{order.customer?.customerUsername || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">Phone</span>
            <p className="font-medium">{order.customer?.campaignData?.phone || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">Email</span>
            <p className="font-medium">{order.customer?.campaignData?.email || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">Circuit ID</span>
            <p className="font-medium">{order.customer?.circuitId || '-'}</p>
          </div>
        </div>
      </div>

      {/* Effective Date */}
      {order.effectiveDate && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Effective Date</h2>
          <p className="text-lg font-semibold">{formatDate(order.effectiveDate)}</p>
        </div>
      )}

      {/* Plan Comparison (for upgrade/downgrade/rate revision) */}
      {isNonDisconnection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Plan Change</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Current Plan</p>
              <p className="font-medium">{order.currentPlanName || '-'}</p>
              <p className="text-sm text-slate-500 mt-1">Bandwidth: {order.currentBandwidth ? `${order.currentBandwidth} Mbps` : '-'}</p>
              <p className="text-sm text-slate-500">ARC: {order.currentArc ? `INR ${order.currentArc.toLocaleString()}` : '-'}</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
              <p className="text-xs font-semibold text-orange-500 uppercase mb-2">New Plan</p>
              <p className="font-medium">{order.orderType.replace(/_/g, ' ')}</p>
              <p className="text-sm text-slate-500 mt-1">Bandwidth: {order.newBandwidth ? `${order.newBandwidth} Mbps` : '-'}</p>
              <p className="text-sm text-slate-500">ARC: {order.newArc ? `INR ${order.newArc.toLocaleString()}` : '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Docs Review Section */}
      {order.docsReviewedBy && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Docs Review</h2>
          <p className="text-sm">
            Reviewed by <strong>{order.docsReviewedBy.name}</strong> on {formatDate(order.docsReviewedAt)}
          </p>
          {order.status === 'DOCS_REJECTED' && order.docsRejectionReason && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Rejection Reason: {order.docsRejectionReason}
            </p>
          )}
        </div>
      )}

      {/* NOC Processing Section */}
      {order.nocProcessedBy && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">NOC Processing</h2>
          <p className="text-sm">
            Processed by <strong>{order.nocProcessedBy.name}</strong> on {formatDate(order.nocProcessedAt)}
          </p>
          {order.nocSpeedTestUrl && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Speed Test Screenshot</p>
              <img
                src={order.nocSpeedTestUrl}
                alt="Speed Test"
                className="max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowSpeedTest(true)}
              />
            </div>
          )}
          {order.nocNotes && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Notes: {order.nocNotes}</p>
          )}
        </div>
      )}

      {/* Activation Date Section */}
      {order.activationDate && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Activation Date</h2>
          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            {formatDate(order.activationDate)}
          </p>
          {order.activationSetBy && (
            <p className="text-sm text-slate-500 mt-1">
              Set by <strong>{order.activationSetBy.name}</strong> on {formatDate(order.activationSetAt)}
            </p>
          )}
        </div>
      )}

      {/* Disconnection Info */}
      {order.orderType === 'DISCONNECTION' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Disconnection Details</h2>
          <div className="space-y-3">
            {order.disconnectionCategory && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-500">Category</span>
                  <p className="font-medium">{order.disconnectionCategory.name}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Sub Category</span>
                  <p className="font-medium">{order.disconnectionSubCategory?.name || '-'}</p>
                </div>
              </div>
            )}
            {order.disconnectionReason && (
              <div>
                <span className="text-sm text-slate-500">Additional Notes</span>
                <p className="font-medium">{order.disconnectionReason}</p>
              </div>
            )}
            {order.disconnectionDate && (
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm text-slate-500">Disconnection Date</span>
                  <p className="font-medium">{formatDate(order.disconnectionDate)}</p>
                </div>
                {order.status !== 'COMPLETED' && order.status !== 'REJECTED' && order.status !== 'CANCELLED' && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getDaysRemaining()} days remaining
                  </Badge>
                )}
              </div>
            )}
            <div>
              <span className="text-sm text-slate-500">Current Plan</span>
              <p className="font-medium">{order.currentPlanName || '-'} ({order.currentBandwidth ? `${order.currentBandwidth} Mbps` : '-'})</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Notes</h2>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Attachments</h2>
          <div className="space-y-2">
            {attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-orange-500" />
                <span className="text-sm flex-1 truncate">{att.originalName || 'Attachment'}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Approval Info */}
      {order.approvedBy && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">
            {order.status === 'REJECTED' ? 'Rejection Details' : 'Approval Details'}
          </h2>
          <p className="text-sm">
            {order.status === 'REJECTED' ? 'Rejected' : 'Approved'} by <strong>{order.approvedBy.name}</strong> on{' '}
            {formatDate(order.approvedAt)}
          </p>
          {order.rejectionReason && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Reason: {order.rejectionReason}</p>
          )}
        </div>
      )}

      {/* Processing Info */}
      {order.processedBy && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">Processing Details</h2>
          <p className="text-sm">
            Processed by <strong>{order.processedBy.name}</strong> on{' '}
            {formatDate(order.processedAt)}
          </p>
          {order.processNotes && <p className="text-sm text-slate-600 mt-1">{order.processNotes}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Super Admin: Approve / Reject (Disconnection flow) */}
        {isSuperAdmin && order.status === 'PENDING_APPROVAL' && (
          <>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button
              onClick={() => setShowRejectModal(true)}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          </>
        )}

        {/* Accounts / NOC: Process (Disconnection flow) */}
        {isAccountsOrNOC && order.status === 'APPROVED' && (
          <Button
            onClick={() => setShowProcessModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Process Order
          </Button>
        )}

        {/* SAM_EXECUTIVE / SAM_HEAD: Set Activation Date */}
        {(isSAM || isSuperAdmin) && order.status === 'PENDING_SAM_ACTIVATION' && (
          <Button
            onClick={() => setShowActivationModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Calendar className="w-4 h-4 mr-1" /> Set Activation Date
          </Button>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold mb-3">Reject Service Order</h3>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[100px]"
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold mb-3">Process Service Order</h3>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[100px]"
              placeholder="Processing notes (optional)..."
              value={processNotes}
              onChange={(e) => setProcessNotes(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowProcessModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                disabled={isSubmitting}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? 'Processing...' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Date Modal */}
      {showActivationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold mb-1">Set Activation Date</h3>
            <p className="text-sm text-slate-500 mb-4">
              Enter the billing activation date confirmed by the customer.
            </p>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              value={activationDate}
              onChange={(e) => setActivationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => { setShowActivationModal(false); setActivationDate(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetActivationDate}
                disabled={isSubmitting || !activationDate}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Set Date'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Speed Test Full-Size Modal */}
      {showSpeedTest && order.nocSpeedTestUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setShowSpeedTest(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSpeedTest(false)}
              className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <img
              src={order.nocSpeedTestUrl}
              alt="Speed Test Screenshot"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
