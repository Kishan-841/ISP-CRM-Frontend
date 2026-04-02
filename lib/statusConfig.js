// ---------------------------------------------------------------------------
// Consolidated Status & Priority Configurations
// ---------------------------------------------------------------------------
// Single source of truth for all status badge colors across the app.
// Each config maps a status key to { label, color } where color includes
// dark-mode variants matching the original source files.
// ---------------------------------------------------------------------------

// ─── Lead Status ───
// Source: dashboard/leads/page.js  getStatusColor()
export const LEAD_STATUS_CONFIG = {
  NEW:          { label: 'New',          color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  QUALIFIED:    { label: 'Qualified',    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  FEASIBLE:     { label: 'Feasible',     color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  NOT_FEASIBLE: { label: 'Not Feasible', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  FOLLOW_UP:    { label: 'Follow Up',    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  DROPPED:      { label: 'Dropped',      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
};

// ─── Lead Type ───
// Source: dashboard/leads/page.js  getLeadTypeColor()
export const LEAD_TYPE_CONFIG = {
  QUALIFIED:          { label: 'Qualified',          color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  PUSHED_TO_PRESALES: { label: 'Pushed to Presales', color: 'bg-slate-700 dark:bg-slate-600 text-white dark:text-slate-100 border-slate-600 dark:border-slate-500' },
};

// ─── Lead Pipeline Stage ───
// Source: dashboard/leads/page.js  inline getStageInfo() logic (lines 680-691)
export const LEAD_PIPELINE_STAGE_CONFIG = {
  LIVE:              { label: 'Live',              color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  INSTALLED:         { label: 'Installed',         color: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-800' },
  AT_NOC:            { label: 'At NOC',            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  PUSH_TO_DELIVERY:  { label: 'Push to Delivery',  color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  ACCOUNTS_REVIEW:   { label: 'Accounts Review',   color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800' },
  DOCS_REVIEW:       { label: 'Docs Review',       color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800' },
  DOCS_UPLOAD:       { label: 'Docs Upload',       color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  QUOTE_SENT:        { label: 'Quote Sent',        color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800' },
  FEASIBLE:          { label: 'Feasible',          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' },
  DROPPED:           { label: 'Dropped',           color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  AT_BDM:            { label: 'At BDM',            color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
};

// ─── Invoice Status ───
// Source: dashboard/billing-mgmt/[leadId]/page.js  getStatusColor()
export const INVOICE_STATUS_CONFIG = {
  GENERATED:      { label: 'Generated',      color: 'bg-blue-100 text-blue-700' },
  SENT:           { label: 'Sent',           color: 'bg-orange-100 text-orange-700' },
  PAID:           { label: 'Paid',           color: 'bg-emerald-100 text-emerald-700' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-amber-100 text-amber-700' },
  OVERDUE:        { label: 'Overdue',        color: 'bg-red-100 text-red-700' },
  CANCELLED:      { label: 'Cancelled',      color: 'bg-slate-100 text-slate-700' },
};

// ─── Invoice Status (with dark mode, customer-360 variant) ───
// Source: dashboard/customer-360/[leadId]/page.js  getInvoiceStatusStyle()
export const INVOICE_STATUS_DARK_CONFIG = {
  PAID:           { label: 'Paid',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  OVERDUE:        { label: 'Overdue',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED:      { label: 'Cancelled',      color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500' },
};

// ─── Invoice Status (customer portal dashboard) ───
// Source: customer-portal/dashboard/page.js  statusBadge()
export const CUSTOMER_PORTAL_STATUS_CONFIG = {
  GENERATED:      { label: 'Unpaid',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  PARTIALLY_PAID: { label: 'Partial',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PAID:           { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  OVERDUE:        { label: 'Overdue',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED:      { label: 'Cancelled', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  PENDING:        { label: 'Pending',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  OPEN:           { label: 'Open',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CLOSED:         { label: 'Closed',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

// ─── Credit Note Status ───
// Source: dashboard/customer-360/[leadId]/page.js  getCreditNoteStatusStyle()
export const CREDIT_NOTE_STATUS_CONFIG = {
  ISSUED:    { label: 'Issued',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ADJUSTED:  { label: 'Adjusted',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  REFUNDED:  { label: 'Refunded',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500' },
};

// ─── Complaint Status ───
// Source: dashboard/complaints/page.js  STATUS_CONFIG
export const COMPLAINT_STATUS_CONFIG = {
  OPEN:   { label: 'Open',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CLOSED: { label: 'Closed', color: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-500' },
};

// ─── Complaint Priority ───
// Source: dashboard/complaints/page.js  PRIORITY_CONFIG
export const PRIORITY_CONFIG = {
  LOW:      { label: 'Low',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  MEDIUM:   { label: 'Medium',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  HIGH:     { label: 'High',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

// ─── Customer Complaint Request Status (customer portal) ───
// Source: customer-portal/complaints/page.js  complaintStatusColors + statusLabel
export const CUSTOMER_COMPLAINT_STATUS_CONFIG = {
  PENDING: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  OPEN:    { label: 'Open',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CLOSED:  { label: 'Closed',         color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

// ─── Service Order Type ───
// Source: dashboard/order-approvals/page.js  typeBadgeColors
//         dashboard/sam-executive/orders/page.js  typeBadgeColors
//         dashboard/sam-executive/orders/[id]/page.js  typeBadgeColors
export const SERVICE_ORDER_TYPE_CONFIG = {
  UPGRADE:       { label: 'Upgrade',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  DOWNGRADE:     { label: 'Downgrade',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  RATE_REVISION: { label: 'Rate Revision', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  DISCONNECTION: { label: 'Disconnection', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

// ─── Service Order Status ───
// Source: dashboard/order-approvals/page.js  statusBadgeColors
//         dashboard/sam-executive/orders/page.js  statusBadgeColors
//         dashboard/sam-executive/orders/[id]/page.js  statusBadgeColors
export const SERVICE_ORDER_STATUS_CONFIG = {
  PENDING_APPROVAL:     { label: 'Pending Approval',      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  APPROVED:             { label: 'Approved',               color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED:             { label: 'Rejected',               color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  PENDING_DOCS_REVIEW:  { label: 'Pending Docs Review',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  DOCS_REJECTED:        { label: 'Docs Rejected',          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  PENDING_NOC:          { label: 'Pending NOC',            color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  PENDING_SAM_ACTIVATION: { label: 'Pending Activation',   color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  PENDING_ACCOUNTS:     { label: 'Pending Billing',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  COMPLETED:            { label: 'Completed',              color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  CANCELLED:            { label: 'Cancelled',              color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
};

// ─── Delivery Pipeline Stage (badge colors) ───
// Source: dashboard/delivery-queue/page.js  getStageBadgeColor() + getStageLabel()
export const DELIVERY_STAGE_CONFIG = {
  pending:              { label: 'Pending',     color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200' },
  material_requested:   { label: 'Requested',   color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200' },
  pushed_to_noc:        { label: 'At NOC',      color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200' },
  installing:           { label: 'Installing',  color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200' },
  demo_plan_pending:    { label: 'Demo Plan',   color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200' },
  speed_test:           { label: 'Speed Test',  color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200' },
  customer_acceptance:  { label: 'Acceptance',  color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200' },
  completed:            { label: 'Completed',   color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200' },
  rejected:             { label: 'Rejected',    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200' },
  material_rejected:    { label: 'Rejected',    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200' },
};

// ─── Delivery Request Status ───
// Source: dashboard/delivery-queue/page.js  getRequestStatusInfo()
export const DELIVERY_REQUEST_STATUS_CONFIG = {
  PENDING_APPROVAL:      { label: 'Awaiting Approval',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  SUPER_ADMIN_APPROVED:  { label: 'Admin Approved',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  AREA_HEAD_APPROVED:    { label: 'Area Head Approved',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  APPROVED:              { label: 'Approved',            color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED:              { label: 'Rejected',            color: 'bg-red-100 text-red-700 border-red-200' },
  ASSIGNED:              { label: 'Items Assigned',      color: 'bg-orange-100 text-orange-700 border-orange-200' },
  COMPLETED:             { label: 'Delivered',           color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

// ─── Delivery Request Approval Status ───
// Source: dashboard/delivery-request-approval/page.js  getStatusBadge()
export const DELIVERY_APPROVAL_STATUS_CONFIG = {
  PENDING_APPROVAL:      { label: 'Pending Approval',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  SUPER_ADMIN_APPROVED:  { label: 'Admin Approved',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  AREA_HEAD_APPROVED:    { label: 'Area Head Approved',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  APPROVED:              { label: 'Approved',            color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED:              { label: 'Rejected',            color: 'bg-red-100 text-red-700 border-red-200' },
};

// ─── Delivery Request Urgency ───
// Source: dashboard/delivery-request-approval/page.js  getUrgencyBadge()
export const DELIVERY_URGENCY_CONFIG = {
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
  URGENT:   { label: 'Urgent',   color: 'bg-amber-100 text-amber-700 border-amber-300' },
  NORMAL:   { label: 'Normal',   color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

// ─── Store Request Status ───
// Source: dashboard/store-requests/page.js  getStatusBadge()
export const STORE_REQUEST_STATUS_CONFIG = {
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

// ─── Vendor Approval Status ───
// Source: dashboard/vendors/page.js  APPROVAL_STATUS_CONFIG
export const VENDOR_APPROVAL_STATUS_CONFIG = {
  PENDING_ADMIN:    { label: 'Pending Admin',    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  PENDING_ACCOUNTS: { label: 'Pending Accounts', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  APPROVED:         { label: 'Approved',          color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  REJECTED:         { label: 'Rejected',          color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

// ─── Vendor Category Colors ───
// Source: dashboard/vendors/page.js  CATEGORY_COLORS
export const VENDOR_CATEGORY_CONFIG = {
  FIBER:           { label: 'Fiber',           color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  COMMISSION:      { label: 'Commission',      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  CHANNEL_PARTNER: { label: 'Channel Partner', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  THIRD_PARTY:     { label: 'Third Party',     color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
};

// ─── Vendor Approval Category Colors (vendor-approval page variant) ───
// Source: dashboard/vendor-approval/page.js  CATEGORY_COLORS
export const VENDOR_APPROVAL_CATEGORY_CONFIG = {
  FIBER:           { label: 'Fiber',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  COMMISSION:      { label: 'Commission',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  THIRD_PARTY:     { label: 'Third Party',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  CHANNEL_PARTNER: { label: 'Channel Partner', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  TELCO:           { label: 'Telco',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  OTHER:           { label: 'Other',           color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

// ─── Customer 360 - Lead Status (list page variant) ───
// Source: dashboard/customer-360/page.js  getLeadStatusStyle()
export const CUSTOMER_360_LEAD_STATUS_CONFIG = {
  NEW:       { label: 'New',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  QUALIFIED: { label: 'Qualified', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  FEASIBLE:  { label: 'Feasible',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  DROPPED:   { label: 'Dropped',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  FOLLOW_UP: { label: 'Follow Up', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

// ─── Customer 360 - Delivery Status (list page variant) ───
// Source: dashboard/customer-360/page.js  getDeliveryStatusStyle()
export const CUSTOMER_360_DELIVERY_STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

// ─── Customer 360 Detail - Lead Status ───
// Source: dashboard/customer-360/[leadId]/page.js  getLeadStatusStyle()
export const CUSTOMER_360_DETAIL_LEAD_STATUS_CONFIG = {
  NEW:       { label: 'New',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  QUALIFIED: { label: 'Qualified', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  DROPPED:   { label: 'Dropped',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  FOLLOW_UP: { label: 'Follow Up', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  CONVERTED: { label: 'Converted', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

// ─── Customer 360 Detail - Delivery Status ───
// Source: dashboard/customer-360/[leadId]/page.js  getDeliveryStatusStyle()
export const CUSTOMER_360_DETAIL_DELIVERY_STATUS_CONFIG = {
  COMPLETED:  { label: 'Completed',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PENDING:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

// ─── Customer Enquiry Status ───
// Source: customer-portal/enquiries/page.js  enquiryStatusColors + statusLabel
export const ENQUIRY_STATUS_CONFIG = {
  SUBMITTED:    { label: 'Submitted',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CONVERTED:    { label: 'Converted',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  CLOSED:       { label: 'Closed',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

// ─── Call Outcome Status (calling queue) ───
// Source: dashboard/calling-queue/page.js  statusOptions
export const CALL_OUTCOME_CONFIG = {
  INTERESTED:         { label: 'Interested',         color: 'emerald' },
  NOT_INTERESTED:     { label: 'Not Interested',     color: 'red' },
  NOT_REACHABLE:      { label: 'Not Reachable',      color: 'amber' },
  WRONG_NUMBER:       { label: 'Wrong Number',       color: 'red' },
  CALL_LATER:         { label: 'Call Later',          color: 'blue' },
  RINGING_NOT_PICKED: { label: 'Ringing Not Picked', color: 'orange' },
  OTHERS:             { label: 'Others',             color: 'violet' },
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Returns the color class string for a given status from a config object.
 * Falls back to a neutral gray if the status is not found.
 *
 * @param {string} status - The status key to look up
 * @param {Object} config - A status config object (e.g. LEAD_STATUS_CONFIG)
 * @param {string} [fallback] - Optional custom fallback color class
 * @returns {string} Tailwind color classes
 */
export function getStatusBadgeClass(status, config, fallback) {
  const entry = config[status];
  if (entry) return entry.color;
  return fallback || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
}

/**
 * Returns the human-readable label for a given status from a config object.
 * Falls back to a formatted version of the raw status string if not found.
 *
 * @param {string} status - The status key to look up
 * @param {Object} config - A status config object (e.g. LEAD_STATUS_CONFIG)
 * @returns {string} Human-readable label
 */
export function getStatusLabel(status, config) {
  const entry = config[status];
  if (entry) return entry.label;
  // Fallback: convert SNAKE_CASE to Title Case
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
