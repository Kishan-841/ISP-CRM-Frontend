'use client';

import { useEffect, useState } from 'react';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import {
  Package,
  Building2,
  User,
  MapPin,
  Clock,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Send,
  Navigation,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { DELIVERY_APPROVAL_STATUS_CONFIG, DELIVERY_URGENCY_CONFIG, getStatusBadgeClass } from '@/lib/statusConfig';
import { PageHeader } from '@/components/PageHeader';

// Format date
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Status badge colors
const getStatusBadge = (status) => getStatusBadgeClass(status, DELIVERY_APPROVAL_STATUS_CONFIG, 'bg-slate-100 text-slate-700 border-slate-200');

// Urgency badge colors
const getUrgencyBadge = (urgency) => getStatusBadgeClass(urgency, DELIVERY_URGENCY_CONFIG, 'bg-slate-100 text-slate-600 border-slate-200');

export default function DeliveryRequestApprovalPage() {
  const { user, isSuperAdmin, isAreaHead } = useRoleCheck();
  const {
    deliveryRequests,
    deliveryRequestStats,
    fetchPendingApprovalRequests,
    approveDeliveryRequest,
    rejectDeliveryRequest,
    isLoading
  } = useLeadStore();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const isAuthorized = isSuperAdmin || isAreaHead;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showDetailsModal, () => { setShowDetailsModal(false); setSelectedRequest(null); });
  useModal(showRejectModal, () => { if (!isRejecting) { setShowRejectModal(false); setRejectReason(''); } });

  useSocketRefresh(fetchPendingApprovalRequests, { enabled: isAuthorized });

  useEffect(() => {
    if (isAuthorized) {
      fetchPendingApprovalRequests();
    }
  }, [isAuthorized, fetchPendingApprovalRequests]);

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApprove = async (request) => {
    setIsApproving(true);
    const result = await approveDeliveryRequest(request.id);
    setIsApproving(false);

    if (result.success) {
      toast.success(result.message || 'Request approved successfully');
      handleCloseDetails();
      fetchPendingApprovalRequests();
    } else {
      toast.error(result.error || 'Failed to approve request');
    }
  };

  const handleOpenRejectModal = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsRejecting(true);
    const result = await rejectDeliveryRequest(selectedRequest.id, rejectReason);
    setIsRejecting(false);

    if (result.success) {
      toast.success('Request rejected');
      handleCloseRejectModal();
      handleCloseDetails();
      fetchPendingApprovalRequests();
    } else {
      toast.error(result.error || 'Failed to reject request');
    }
  };

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Only Super Admin and Area Head can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader title="Delivery Request Approval" description="Review and approve material delivery requests" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard color="slate" icon={Package} label="Total Requests" value={deliveryRequestStats.total || 0} />
        <StatCard color="amber" icon={Clock} label="Pending Approval" value={deliveryRequestStats.pending || deliveryRequests.length || 0} />
        <StatCard color="emerald" icon={CheckCircle} label="Approved" value={deliveryRequestStats.approved || 0} />
        <StatCard color="red" icon={XCircle} label="Rejected" value={deliveryRequestStats.rejected || 0} />
      </div>

      {/* Requests List */}
      <DataTable
        title="Pending Requests"
        totalCount={deliveryRequests.length}
        columns={[
          {
            key: 'request',
            label: 'Request',
            render: (row) => (
              <div className="flex flex-col">
                <span className="font-medium text-slate-900 dark:text-white">
                  {row.requestNumber}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDate(row.createdAt)}
                </span>
                {row.urgency && row.urgency !== 'NORMAL' && (
                  <Badge variant="outline" className={`mt-1 w-fit ${getUrgencyBadge(row.urgency)}`}>
                    {row.urgency}
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: 'company',
            label: 'Company',
            render: (row) => (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {row.lead?.campaignData?.company || '-'}
                  </p>
                  {row.lead?.campaignData?.name && (
                    <p className="text-sm text-slate-500">{row.lead.campaignData.name}</p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'requester',
            label: 'Requester',
            render: (row) => (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-slate-900 dark:text-white">{row.requestedBy?.name}</p>
                  <p className="text-xs text-slate-500">{row.requestedBy?.role}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'items',
            label: 'Items',
            render: (row) => (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">
                  {row.items?.length || 0} item(s)
                </span>
              </div>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className={getStatusBadge(row.status)}>
                  {row.status.replace(/_/g, ' ')}
                </Badge>
                {row.superAdminApprovedBy && (
                  <span className="text-xs text-emerald-600">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Super Admin
                  </span>
                )}
                {row.areaHeadApprovedBy && (
                  <span className="text-xs text-emerald-600">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Area Head
                  </span>
                )}
              </div>
            ),
          },
        ]}
        data={deliveryRequests}
        loading={isLoading}
        pagination={true}
        defaultPageSize={10}
        emptyMessage="All caught up! No pending requests to approve."
        emptyIcon={CheckCircle}
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(row)}
              className="border-slate-200"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              onClick={() => handleApprove(row)}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenRejectModal(row)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseDetails} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Request Details - {selectedRequest.requestNumber}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className={getStatusBadge(selectedRequest.status)}>
                    {selectedRequest.status.replace(/_/g, ' ')}
                  </Badge>
                  {selectedRequest.urgency && selectedRequest.urgency !== 'NORMAL' && (
                    <Badge variant="outline" className={getUrgencyBadge(selectedRequest.urgency)}>
                      {selectedRequest.urgency}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseDetails}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Company & Requester Info */}
                <div className="space-y-6">
                  {/* Company Info */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Information
                    </h3>
                    <div className="space-y-2">
                      <p className="font-medium text-slate-900 dark:text-white text-lg">
                        {selectedRequest.lead?.campaignData?.company || '-'}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        <User className="h-4 w-4 inline mr-2" />
                        {selectedRequest.lead?.campaignData?.name || '-'}
                      </p>
                      {selectedRequest.lead?.campaignData?.phone && (
                        <p className="text-slate-600 dark:text-slate-400">
                          <Phone className="h-4 w-4 inline mr-2" />
                          {selectedRequest.lead.campaignData.phone}
                        </p>
                      )}
                      {selectedRequest.lead?.campaignData?.email && (
                        <p className="text-slate-600 dark:text-slate-400">
                          <Mail className="h-4 w-4 inline mr-2" />
                          {selectedRequest.lead.campaignData.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Requester Info */}
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Requested By
                    </h3>
                    <div className="space-y-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedRequest.requestedBy?.name}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        {selectedRequest.requestedBy?.role}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location Details
                    </h3>
                    <div className="space-y-2">
                      {selectedRequest.latitude && selectedRequest.longitude ? (
                        <button
                          onClick={() => openGoogleMaps(selectedRequest.latitude, selectedRequest.longitude)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <Navigation className="h-4 w-4" />
                          {selectedRequest.latitude.toFixed(6)}, {selectedRequest.longitude.toFixed(6)}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <p className="text-slate-500">GPS not captured</p>
                      )}
                      {selectedRequest.deliveryAddress && (
                        <p className="text-slate-600 dark:text-slate-400 mt-2">
                          {selectedRequest.deliveryAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Items */}
                <div className="space-y-6">
                  {/* Items List */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Items Requested ({selectedRequest.items?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {selectedRequest.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.product?.modelNumber || 'Unknown Product'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {item.product?.category} - {item.product?.brandName}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg text-orange-600">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-slate-500 ml-1">
                              {item.product?.unit || 'pcs'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedRequest.notes && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Additional Notes
                      </h3>
                      <p className="text-slate-700 dark:text-slate-300">{selectedRequest.notes}</p>
                    </div>
                  )}

                  {/* Approval Status */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Approval Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Super Admin</span>
                        {selectedRequest.superAdminApprovedBy ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Approved by {selectedRequest.superAdminApprovedBy.name}
                          </span>
                        ) : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Area Head</span>
                        {selectedRequest.areaHeadApprovedBy ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Approved by {selectedRequest.areaHeadApprovedBy.name}
                          </span>
                        ) : (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Button variant="outline" onClick={handleCloseDetails}>
                Close
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleOpenRejectModal(selectedRequest)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseRejectModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Request</h3>
              <p className="text-sm text-slate-500">{selectedRequest.requestNumber}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={handleCloseRejectModal}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
