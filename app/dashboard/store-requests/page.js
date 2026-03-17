'use client';

import React, { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Package,
  Building2,
  X,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Barcode,
  ChevronDown,
  ChevronUp,
  Box,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { STORE_REQUEST_STATUS_CONFIG, getStatusBadgeClass } from '@/lib/statusConfig';
import TabBar from '@/components/TabBar';
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
const getStatusBadge = (status) => getStatusBadgeClass(status, STORE_REQUEST_STATUS_CONFIG, 'bg-slate-100 text-slate-700 border-slate-200');

export default function StoreRequestsPage() {
  const router = useRouter();
  const { user, isStoreManager } = useRoleCheck();
  const {
    deliveryRequests,
    deliveryRequestStats,
    fetchApprovedRequestsForStore,
    fetchAvailableInventoryForRequest,
    assignItemsToRequest,
    isLoading
  } = useLeadStore();

  const [activeTab, setActiveTab] = useState('APPROVED');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [isAssigning, setIsAssigning] = useState(false);

  // Serial number search states
  const [expandedSerialDropdown, setExpandedSerialDropdown] = useState(null); // Format: "itemId-invId"
  const [serialSearchTerm, setSerialSearchTerm] = useState('');

  const isAuthorized = isStoreManager;

  // Modal accessibility: Escape-to-close, scroll lock, autofocus
  useModal(showAssignModal, () => !isAssigning && handleCloseAssignModal());

  useSocketRefresh(() => fetchApprovedRequestsForStore(activeTab), { enabled: isAuthorized });

  const tabs = [
    { id: 'APPROVED', label: 'Approved', count: deliveryRequestStats.approved },
    { id: 'ASSIGNED', label: 'Assigned', count: deliveryRequestStats.assigned }
  ];

  useEffect(() => {
    if (isAuthorized) {
      fetchApprovedRequestsForStore(activeTab);
    }
  }, [isAuthorized, activeTab, fetchApprovedRequestsForStore]);

  const handleOpenAssignModal = async (request) => {
    setSelectedRequest(request);
    setShowAssignModal(true);
    setAssignments({});
    setExpandedItems({});

    // Fetch available inventory
    const result = await fetchAvailableInventoryForRequest();
    if (result.success) {
      setAvailableInventory(result.inventory);
    }
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedRequest(null);
    setAssignments({});
    setAvailableInventory([]);
    setExpandedItems({});
    setExpandedSerialDropdown(null);
    setSerialSearchTerm('');
  };

  const toggleItemExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleSelectInventoryForItem = (itemId, inventoryItem, serialNumber) => {
    setAssignments(prev => {
      const current = prev[itemId] || { poItemId: '', serialNumbers: [], bulkQuantity: 0 };

      if (inventoryItem.id !== current.poItemId) {
        // Switching to different PO item
        return {
          ...prev,
          [itemId]: {
            poItemId: inventoryItem.id,
            serialNumbers: [serialNumber],
            bulkQuantity: 0
          }
        };
      }

      // Toggle serial number selection
      const serialNumbers = current.serialNumbers.includes(serialNumber)
        ? current.serialNumbers.filter(sn => sn !== serialNumber)
        : [...current.serialNumbers, serialNumber];

      return {
        ...prev,
        [itemId]: {
          ...current,
          serialNumbers
        }
      };
    });
  };

  // Handle bulk quantity input for items like fiber
  const handleBulkQuantityChange = (itemId, inventoryItem, quantity, maxAvailable) => {
    const validQuantity = Math.min(Math.max(0, parseInt(quantity) || 0), maxAvailable);
    setAssignments(prev => ({
      ...prev,
      [itemId]: {
        poItemId: inventoryItem.id,
        serialNumbers: [],
        bulkQuantity: validQuantity
      }
    }));
  };

  const getSelectedCount = (itemId) => {
    const assignment = assignments[itemId];
    if (!assignment) return 0;
    // Return bulk quantity if set, otherwise serial count
    return assignment.bulkQuantity || assignment.serialNumbers?.length || 0;
  };

  // Check if product is bulk (not serialized) - fiber, etc.
  const isBulkProduct = (product) => {
    return product?.unit === 'mtrs' || product?.category === 'FIBER';
  };

  const handleAssignItems = async () => {
    if (!selectedRequest) return;

    // Build assignments array
    const assignmentData = selectedRequest.items.map(item => {
      const assignment = assignments[item.id];
      if (!assignment) return null;

      return {
        itemId: item.id,
        serialNumbers: assignment.serialNumbers || [],
        poItemId: assignment.poItemId || null,
        quantity: item.quantity,
        bulkQuantity: assignment.bulkQuantity || 0
      };
    }).filter(a => a && (a.serialNumbers.length > 0 || a.bulkQuantity > 0));

    if (assignmentData.length === 0) {
      toast.error('Please select items to assign');
      return;
    }

    setIsAssigning(true);
    const result = await assignItemsToRequest(selectedRequest.id, assignmentData);
    setIsAssigning(false);

    if (result.success) {
      toast.success(result.message || 'Items assigned successfully');
      handleCloseAssignModal();
      fetchApprovedRequestsForStore(activeTab);
    } else {
      toast.error(result.error || 'Failed to assign items');
    }
  };

  // Filter inventory by product
  const getInventoryForProduct = (productId) => {
    return availableInventory.filter(inv => inv.productId === productId);
  };

  // Filter serial numbers based on search term
  const filterSerialNumbers = (serialNumbers, searchTerm) => {
    if (!searchTerm.trim()) return serialNumbers;
    const search = searchTerm.toLowerCase().trim();
    return serialNumbers.filter(serial =>
      serial.toLowerCase().includes(search)
    );
  };

  // Get selected serials for an item from specific inventory
  const getSelectedSerialsFromInv = (itemId, invId) => {
    const assignment = assignments[itemId];
    if (!assignment || assignment.poItemId !== invId) return [];
    return assignment.serialNumbers || [];
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Only Store Manager can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader title="Material Requests" description="Manage approved delivery requests and assign materials" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard color="emerald" icon={CheckCircle} label="Ready to Assign" value={deliveryRequestStats.approved || 0} />
        <StatCard color="blue" icon={Box} label="Assigned" value={deliveryRequestStats.assigned || 0} />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={tabs.map(tab => ({
          key: tab.id,
          label: tab.label,
          count: tab.count,
          variant: tab.id === 'APPROVED' ? 'success' : 'info',
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : deliveryRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No requests found
          </h3>
          <p className="text-slate-500">
            {activeTab === 'APPROVED' ? 'No approved requests waiting for assignment.' : 'No requests in this category.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-700">
                {deliveryRequests.map((request) => {
                  const isExpanded = expandedItems[request.id];
                  return (
                    <div key={request.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{request.requestNumber}</p>
                          <p className="text-xs text-slate-500">{formatDate(request.createdAt)}</p>
                        </div>
                        <Badge variant="outline" className={getStatusBadge(request.status)}>
                          {request.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {request.lead?.campaignData?.company || '-'}
                          </p>
                          <p className="text-xs text-slate-500">{request.requestedBy?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Package className="h-4 w-4 text-slate-400" />
                          <span>{request.items?.length || 0} item(s)</span>
                        </div>

                        {request.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenAssignModal(request)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Barcode className="h-4 w-4 mr-1" />
                            Assign Items
                          </Button>
                        )}
                        {request.status === 'ASSIGNED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedItems(prev => ({ ...prev, [request.id]: !prev[request.id] }))}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Details
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Expanded assigned items for mobile */}
                      {isExpanded && request.status === 'ASSIGNED' && (
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3 space-y-2">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Box className="h-4 w-4 text-blue-500" />
                            Assigned Items
                          </h4>
                          {request.items?.map((item) => {
                            const isBulk = item.product?.unit === 'mtrs' || item.product?.category === 'FIBER';
                            const hasSerialNumbers = item.assignedSerialNumbers && item.assignedSerialNumbers.length > 0;
                            const hasAssignedQty = item.assignedQuantity && item.assignedQuantity > 0;

                            return (
                              <div key={item.id} className="p-2 bg-white dark:bg-slate-800 rounded-lg space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-sm text-slate-900 dark:text-white">
                                    {item.product?.name || item.product?.modelNumber || 'Unknown Product'}
                                  </p>
                                  <Badge variant="outline" className={
                                    item.isAssigned
                                      ? "bg-blue-100 text-blue-700 border-blue-200 text-xs"
                                      : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
                                  }>
                                    {item.isAssigned ? 'Assigned' : 'Pending'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Requested: {item.quantity} {item.product?.unit || 'pcs'}
                                </p>
                                {hasSerialNumbers && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.assignedSerialNumbers.map((sn, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                                        {sn}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {isBulk && hasAssignedQty && (
                                  <p className="text-xs text-blue-600 font-medium">
                                    Assigned: {item.assignedQuantity} {item.product?.unit || 'pcs'}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {deliveryRequests.map((row) => (
                      <Fragment key={row.id}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-white">{row.requestNumber}</span>
                              <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{row.lead?.campaignData?.company || '-'}</p>
                                <p className="text-sm text-slate-500">{row.requestedBy?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-700 dark:text-slate-300">{row.items?.length || 0} item(s)</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={getStatusBadge(row.status)}>{row.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {row.status === 'APPROVED' && (
                                <Button size="sm" onClick={() => handleOpenAssignModal(row)} className="bg-orange-600 hover:bg-orange-700 text-white">
                                  <Barcode className="h-4 w-4 mr-1" />
                                  Assign Items
                                </Button>
                              )}
                              {row.status === 'ASSIGNED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setExpandedItems(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                >
                                  {expandedItems[row.id] ? (
                                    <><ChevronUp className="h-4 w-4 mr-1" />Hide Details</>
                                  ) : (
                                    <><ChevronDown className="h-4 w-4 mr-1" />View Details</>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Inline expanded row */}
                        {expandedItems[row.id] && row.status === 'ASSIGNED' && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50 dark:bg-slate-800/30 px-6 py-4">
                              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                  <Box className="h-4 w-4 text-blue-500" />
                                  Assigned Items - {row.requestNumber}
                                </h4>
                                <div className="space-y-3">
                                  {row.items?.map((item) => {
                                    const isBulk = item.product?.unit === 'mtrs' || item.product?.category === 'FIBER';
                                    const hasSerialNumbers = item.assignedSerialNumbers && item.assignedSerialNumbers.length > 0;
                                    const hasAssignedQty = item.assignedQuantity && item.assignedQuantity > 0;

                                    return (
                                      <div key={item.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                              {item.product?.name || item.product?.modelNumber || 'Unknown Product'}
                                            </p>
                                            {item.product?.modelNumber && item.product?.name && (
                                              <span className="text-xs text-slate-400">({item.product.modelNumber})</span>
                                            )}
                                          </div>
                                          <p className="text-sm text-slate-500 mt-1">
                                            Requested: {item.quantity} {item.product?.unit || 'pcs'}
                                          </p>

                                          {hasSerialNumbers && (
                                            <div className="mt-2">
                                              <p className="text-xs font-medium text-blue-600 mb-1">Assigned Serial Numbers:</p>
                                              <div className="flex flex-wrap gap-1">
                                                {item.assignedSerialNumbers.map((sn, idx) => (
                                                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                                                    {sn}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {isBulk && hasAssignedQty && (
                                            <p className="text-sm text-blue-600 font-medium mt-2">
                                              Assigned: {item.assignedQuantity} {item.product?.unit || 'pcs'}
                                            </p>
                                          )}
                                        </div>

                                        <Badge variant="outline" className={
                                          item.isAssigned
                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                            : "bg-amber-100 text-amber-700 border-amber-200"
                                        }>
                                          {item.isAssigned ? 'Assigned' : 'Pending'}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {deliveryRequests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Package className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">{activeTab === 'APPROVED' ? 'No approved requests waiting for assignment.' : 'No requests in this category.'}</p>
                  </div>
                )}
              </div>
        </>
      )}

      {/* Assign Items Modal */}
      {showAssignModal && selectedRequest && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseAssignModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                  Assign Items - {selectedRequest.requestNumber}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {selectedRequest.lead?.campaignData?.company} - {selectedRequest.requestedBy?.name}
                </p>
              </div>
              <button
                onClick={handleCloseAssignModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
              <div className="space-y-4">
                {selectedRequest.items?.map((item) => {
                  const productInventory = getInventoryForProduct(item.productId);
                  const isExpanded = expandedItems[item.id];
                  const selectedCount = getSelectedCount(item.id);
                  const isComplete = selectedCount >= item.quantity;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg overflow-hidden ${
                        isComplete ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'
                      }`}
                    >
                      {/* Item Header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        onClick={() => toggleItemExpanded(item.id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Package className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {item.product?.modelNumber}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.product?.category} - {item.product?.brandName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Compact progress indicator */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isComplete
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          }`}>
                            {isComplete && <CheckCircle className="h-3.5 w-3.5" />}
                            <span>{selectedCount}/{item.quantity} {item.product?.unit || 'pcs'}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content - Serial Selection */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                          {productInventory.length === 0 ? (
                            <div className="text-center py-3 text-amber-600">
                              <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
                              <p className="text-sm">No inventory available for this product</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {productInventory.map((inv) => (
                                <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {inv.poNumber}
                                      </span>
                                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                        {inv.availableQuantity} {inv.unit} available
                                      </span>
                                    </div>
                                  </div>

                                  {/* Serial Numbers Grid OR Bulk Quantity Input */}
                                  {isBulkProduct(item.product) ? (
                                    // Bulk item - show quantity input
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                          Enter quantity to assign ({item.product?.unit || 'mtrs'})
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                          Available: {inv.availableQuantity} {item.product?.unit || 'mtrs'} | Required: {item.quantity} {item.product?.unit || 'mtrs'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          max={Math.min(inv.availableQuantity, item.quantity)}
                                          value={assignments[item.id]?.poItemId === inv.id ? (assignments[item.id]?.bulkQuantity || '') : ''}
                                          onChange={(e) => handleBulkQuantityChange(item.id, inv, e.target.value, Math.min(inv.availableQuantity, item.quantity))}
                                          placeholder="0"
                                          className="w-24 h-10 text-center text-lg font-bold"
                                        />
                                        <span className="text-sm font-medium text-slate-600">{item.product?.unit || 'mtrs'}</span>
                                      </div>
                                    </div>
                                  ) : inv.serialNumbers && inv.serialNumbers.length > 0 ? (
                                    // Serialized item - compact chip selection
                                    <div className="space-y-2">
                                      {/* Top bar: Search + Auto-assign */}
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <div className="relative flex-1">
                                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                          <input
                                            type="text"
                                            value={expandedSerialDropdown === `${item.id}-${inv.id}` ? serialSearchTerm : ''}
                                            onChange={(e) => {
                                              setExpandedSerialDropdown(`${item.id}-${inv.id}`);
                                              setSerialSearchTerm(e.target.value);
                                            }}
                                            onFocus={() => setExpandedSerialDropdown(`${item.id}-${inv.id}`)}
                                            placeholder="Search..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-700"
                                          />
                                        </div>
                                        {/* Auto-assign button */}
                                        {(() => {
                                          const currentSelected = getSelectedSerialsFromInv(item.id, inv.id);
                                          const remaining = item.quantity - currentSelected.length;
                                          if (remaining <= 0) return null;
                                          return (
                                            <button
                                              onClick={() => {
                                                const available = inv.serialNumbers.filter(
                                                  sn => !currentSelected.includes(sn)
                                                );
                                                const toSelect = available.slice(0, remaining);
                                                toSelect.forEach(sn => handleSelectInventoryForItem(item.id, inv, sn));
                                              }}
                                              className="flex-shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                                            >
                                              Auto-assign {remaining}
                                            </button>
                                          );
                                        })()}
                                      </div>

                                      {/* Selected serials as chips */}
                                      {(() => {
                                        const selectedSerials = getSelectedSerialsFromInv(item.id, inv.id);
                                        return selectedSerials.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {selectedSerials.map((serial) => (
                                              <span
                                                key={serial}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 text-white text-xs rounded font-mono"
                                              >
                                                {serial}
                                                <button
                                                  onClick={() => handleSelectInventoryForItem(item.id, inv, serial)}
                                                  className="hover:bg-orange-700 rounded-full"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </span>
                                            ))}
                                          </div>
                                        );
                                      })()}

                                      {/* Serial numbers as compact chip grid */}
                                      <div className="max-h-[140px] overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                                        {(() => {
                                          const searchTerm = expandedSerialDropdown === `${item.id}-${inv.id}` ? serialSearchTerm : '';
                                          const filtered = filterSerialNumbers(inv.serialNumbers, searchTerm);

                                          if (filtered.length === 0) {
                                            return (
                                              <div className="py-2 text-center text-slate-500 text-xs">
                                                No serials found
                                              </div>
                                            );
                                          }

                                          return (
                                            <div className="flex flex-wrap gap-1">
                                              {filtered.map((serial) => {
                                                const isSelected = assignments[item.id]?.serialNumbers?.includes(serial);
                                                const isDisabled = !isSelected && selectedCount >= item.quantity;

                                                return (
                                                  <button
                                                    key={serial}
                                                    onClick={() => !isDisabled && handleSelectInventoryForItem(item.id, inv, serial)}
                                                    disabled={isDisabled}
                                                    className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                                                      isSelected
                                                        ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-400 text-orange-700 dark:text-orange-300 ring-1 ring-orange-400'
                                                        : isDisabled
                                                          ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                          : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'
                                                    }`}
                                                  >
                                                    {serial}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  ) : inv.availableQuantity > 0 ? (
                                    // Non-serialized item with available quantity - show quantity input
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                          Enter quantity to assign (pcs)
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                          Available: {inv.availableQuantity} pcs | Required: {item.quantity} pcs
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          max={Math.min(inv.availableQuantity, item.quantity)}
                                          value={assignments[item.id]?.poItemId === inv.id ? (assignments[item.id]?.bulkQuantity || '') : ''}
                                          onChange={(e) => handleBulkQuantityChange(item.id, inv, e.target.value, Math.min(inv.availableQuantity, item.quantity))}
                                          placeholder="0"
                                          className="w-24 h-10 text-center text-lg font-bold"
                                        />
                                        <span className="text-sm font-medium text-slate-600">pcs</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500 italic">No items available</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Button variant="outline" onClick={handleCloseAssignModal}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignItems}
                disabled={isAssigning || Object.keys(assignments).length === 0}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Assignment
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
