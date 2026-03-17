// PO Status Utilities - Consistent labels and styling across all pages

// Human-readable status labels
export const PO_STATUS_LABELS = {
  PENDING_ADMIN: 'Pending Approval',
  APPROVED: 'Approved',
  PENDING_RECEIPT: 'Sent to Vendor',
  RECEIVED: 'Inventory Pending',
  PARTIALLY_RECEIVED: 'Partial Delivery',
  RECEIPT_REJECTED: 'Delivery Rejected',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed'
};

// Short labels for compact display
export const PO_STATUS_SHORT = {
  PENDING_ADMIN: 'Pending',
  APPROVED: 'Approved',
  PENDING_RECEIPT: 'With Vendor',
  RECEIVED: 'Inventory',
  PARTIALLY_RECEIVED: 'Partial',
  RECEIPT_REJECTED: 'Rejected',
  REJECTED: 'Rejected',
  COMPLETED: 'Complete'
};

// Status badge colors (Tailwind classes)
export const PO_STATUS_COLORS = {
  PENDING_ADMIN: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700',
    icon: 'text-amber-500'
  },
  APPROVED: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700',
    icon: 'text-blue-500'
  },
  PENDING_RECEIPT: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-700',
    icon: 'text-indigo-500'
  },
  RECEIVED: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700',
    icon: 'text-emerald-500'
  },
  PARTIALLY_RECEIVED: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-700',
    icon: 'text-orange-500'
  },
  RECEIPT_REJECTED: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-700',
    icon: 'text-red-500'
  },
  REJECTED: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-700',
    icon: 'text-red-500'
  },
  COMPLETED: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700',
    icon: 'text-emerald-500'
  }
};

// PO Lifecycle steps for progress indicator
export const PO_LIFECYCLE_STEPS = [
  { key: 'created', label: 'Created', shortLabel: 'Created' },
  { key: 'approved', label: 'Approved', shortLabel: 'Approved' },
  { key: 'sent', label: 'Sent to Vendor', shortLabel: 'Sent' },
  { key: 'receiving', label: 'Receiving', shortLabel: 'Receiving' },
  { key: 'inventory', label: 'Add to Inventory', shortLabel: 'Inventory' },
  { key: 'complete', label: 'Complete', shortLabel: 'Done' }
];

// Get current step index based on status
export const getProgressStep = (status) => {
  switch (status) {
    case 'PENDING_ADMIN':
      return 0; // Created, waiting approval
    case 'APPROVED':
      return 1; // Approved
    case 'PENDING_RECEIPT':
      return 2; // Sent to vendor
    case 'PARTIALLY_RECEIVED':
      return 3; // Receiving (partial)
    case 'RECEIVED':
      return 4; // Inventory step
    case 'COMPLETED':
      return 5; // Done
    case 'REJECTED':
    case 'RECEIPT_REJECTED':
      return -1; // Failed/Rejected
    default:
      return 0;
  }
};

// Get status label
export const getStatusLabel = (status) => {
  return PO_STATUS_LABELS[status] || status;
};

// Get status short label
export const getStatusShortLabel = (status) => {
  return PO_STATUS_SHORT[status] || status;
};

// Get status colors
export const getStatusColors = (status) => {
  return PO_STATUS_COLORS[status] || PO_STATUS_COLORS.PENDING_ADMIN;
};

// Get status badge class string
export const getStatusBadgeClass = (status) => {
  const colors = getStatusColors(status);
  return `${colors.bg} ${colors.text}`;
};

// Format currency (INR)
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Format date
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '-';
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return new Date(dateString).toLocaleDateString('en-IN', defaultOptions);
};

// Format date with time
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Calculate PO summary
export const getPOSummary = (po) => {
  if (!po?.items?.length) {
    return { totalItems: 0, totalOrdered: 0, totalReceived: 0, percentReceived: 0, unitLabel: 'units' };
  }

  const totalItems = po.items.length;
  const totalOrdered = po.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalReceived = po.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
  const percentReceived = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  // Determine unit label based on items
  const hasFiber = po.items.some(item => item.product?.category === 'FIBER' || item.product?.unit === 'mtrs');
  const hasNonFiber = po.items.some(item => item.product?.category !== 'FIBER' && item.product?.unit !== 'mtrs');

  let unitLabel = 'units';
  if (hasFiber && !hasNonFiber) {
    unitLabel = 'mtrs';
  } else if (!hasFiber && hasNonFiber) {
    unitLabel = 'pcs';
  }

  return { totalItems, totalOrdered, totalReceived, percentReceived, unitLabel };
};

// Check if PO can be edited
export const canEditPO = (po) => {
  const editableStatuses = ['PENDING_ADMIN'];
  const hasItemsInStore = po?.items?.some(item => item.status === 'IN_STORE');
  return editableStatuses.includes(po?.status) && !hasItemsInStore;
};

// Check if PO can be deleted
export const canDeletePO = (po) => {
  const hasItemsInStore = po?.items?.some(item => item.status === 'IN_STORE');
  return !hasItemsInStore;
};

// Get action hint based on status and role
export const getActionHint = (status, role) => {
  const hints = {
    PENDING_ADMIN: {
      ADMIN: 'Review and approve this PO',
      SUPER_ADMIN: 'Review and approve this PO',
      STORE_MANAGER: 'Waiting for approval'
    },
    PENDING_RECEIPT: {
      ADMIN: 'Verify when goods arrive',
      SUPER_ADMIN: 'Verify when goods arrive',
      STORE_MANAGER: 'Waiting for goods to arrive'
    },
    PARTIALLY_RECEIVED: {
      ADMIN: 'Record next batch when it arrives',
      SUPER_ADMIN: 'Record next batch when it arrives',
      STORE_MANAGER: 'Some items received, waiting for more'
    },
    RECEIVED: {
      STORE_MANAGER: 'Add received items to inventory',
      SUPER_ADMIN: 'Add received items to inventory',
      ALL: 'Items received - pending inventory addition'
    },
    COMPLETED: {
      ALL: 'All items added to inventory - PO complete'
    },
    REJECTED: {
      ALL: 'This PO was rejected'
    },
    RECEIPT_REJECTED: {
      ALL: 'Delivery was rejected'
    }
  };

  const statusHints = hints[status];
  if (!statusHints) return '';
  return statusHints[role] || statusHints.ALL || '';
};

// Product category labels
export const CATEGORY_LABELS = {
  SWITCH: 'Switch',
  SFP: 'SFP',
  CLOSURE: 'Closure',
  RF: 'RF',
  PATCH_CORD: 'Patch Cord',
  FIBER: 'Fiber'
};

export const getCategoryLabel = (category) => {
  return CATEGORY_LABELS[category] || category;
};
