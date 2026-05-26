// Humanizes raw audit-event data (camelCase field names, ISO dates, enums,
// JSON blobs) into something a non-technical reviewer can read at a glance.
// Pure functions only — shared by AuditEventDrawer, EventTimeline, and the
// audit table. The raw JSON is still available behind "View raw data".

// Acronyms that should stay upper-cased when we humanize a field name or an
// enum value (so `arcAmount` → "ARC Amount", not "Arc Amount").
const ACRONYMS = new Set([
  'arc', 'otc', 'gst', 'pan', 'tan', 'ip', 'ips', 'noc', 'sam', 'bdm', 'isr',
  'ops', 'po', 'id', 'url', 'cpe', 'tds', 'sgst', 'cgst', 'kyc', 'dob', 'otp',
  'sla', 'tat', 'mrr', 'arr', 'crm', 'api',
]);

// Enum tokens we must NOT title-case (they're real acronyms, not SHOUTY words).
const KEEP_UPPER = new Set([
  'GST', 'PAN', 'TAN', 'NOC', 'OTC', 'ARC', 'IP', 'PO', 'CPE', 'TDS', 'KYC',
  'SGST', 'CGST', 'OTP', 'SLA', 'TAT', 'ID', 'URL',
]);

// High-traffic fields get a hand-tuned label; everything else falls back to the
// camelCase splitter below. Keeps the common Lead/Invoice/Complaint diffs clean.
const FIELD_LABELS = {
  status: 'Status',
  documents: 'Documents',
  arcAmount: 'ARC Amount',
  otcAmount: 'OTC Amount',
  originalArcAmount: 'Original ARC Amount',
  advanceAmount: 'Advance Amount',
  tentativePrice: 'Tentative Price',
  paymentTerms: 'Payment Terms',
  deliveryStatus: 'Delivery Status',
  opsApprovalStatus: 'OPS Approval Status',
  accountsStatus: 'Accounts Status',
  superAdmin2ApprovalStatus: 'Sales Director Approval Status',
  feasibilityNotes: 'Feasibility Notes',
  accountsNotes: 'Accounts Notes',
  installationNotes: 'Installation Notes',
  customerUsername: 'Customer Username',
  customerUserId: 'Customer User ID',
  customerIpAssigned: 'Customer IP Assigned',
  customerIpAddresses: 'Customer IP Addresses',
  numberOfIPs: 'Number of IPs',
  circuitId: 'Circuit ID',
  customerGstNo: 'Customer GST No',
  customerLegalName: 'Customer Legal Name',
  panCardNo: 'PAN Card No',
  actualPlanName: 'Plan Name',
  actualPlanPrice: 'Plan Price',
  actualPlanIsActive: 'Plan Active',
  contractStartDate: 'Contract Start Date',
  contractEndDate: 'Contract End Date',
  assignedToId: 'Assigned To',
  isActive: 'Active',
  isColdLead: 'Cold Lead',
  reason: 'Reason',
};

// Fields that hold a user UUID — resolved to a name via the userMap from the
// audit API. Mirrors isUserRefField in backend/src/controllers/audit.controller.js.
const USER_REF_SUFFIX = /(ById|AssignedToId)$/;
const USER_REF_EXACT = new Set([
  'assignedToId', 'assignedToStoreManagerId', 'uploadedBy', 'changedById', 'performedById',
]);
export function isUserRefField(field) {
  return !!field && (USER_REF_SUFFIX.test(field) || USER_REF_EXACT.has(field));
}

export function humanizeField(field) {
  if (!field) return '';
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const words = String(field)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → spaced
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let label = words
    .map(w => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
  // "Pushed To NOC By ID" → "Pushed To NOC By"; "Assigned To ID" → "Assigned To".
  if (isUserRefField(field)) label = label.replace(/\s+ID$/, '');
  return label;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}|$)/;

function isAmountField(field = '') {
  const f = field.toLowerCase();
  return /amount|price|capex|opex|balance|advance|\barc\b|\botc\b|total|paid|outstanding/.test(f);
}

export function formatCurrency(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const hasTime = /T\d{2}:\d{2}/.test(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function titleCaseEnum(v) {
  return String(v)
    .split('_')
    .map(w => (KEEP_UPPER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

// Render a single scalar value the way a human expects to read it.
// `userMap` (from the audit API) resolves user-id fields to display names.
export function formatScalar(value, field = '', userMap = null) {
  if (value === null || value === undefined || value === '') return '—';
  // Resolve user references (createdById, pushedToNocById, …) to a name.
  if (isUserRefField(field) && typeof value === 'string') {
    if (userMap && userMap[value]) return userMap[value];
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return isAmountField(field) ? formatCurrency(value) : value.toLocaleString('en-IN');
  }
  if (typeof value === 'string') {
    if (ISO_RE.test(value)) return formatDate(value);
    if (isAmountField(field) && value !== '' && !isNaN(Number(value))) return formatCurrency(Number(value));
    // Enum-ish: SCREAMING_SNAKE, or a single SHOUTY word that isn't an acronym.
    if (/_/.test(value) && /^[A-Z0-9_]+$/.test(value)) return titleCaseEnum(value);
    if (/^[A-Z]{3,}$/.test(value) && !KEEP_UPPER.has(value)) return titleCaseEnum(value);
    return value;
  }
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function isComplex(v) {
  return v !== null && typeof v === 'object';
}

// Best-effort human label for an item inside an array (e.g. a document, a
// line item). Falls back through the most likely "name" keys.
export function itemLabel(it) {
  if (it === null || it === undefined) return '—';
  if (typeof it !== 'object') return String(it);
  const name = it.originalName || it.name || it.fileName || it.title || it.label
    || it.invoiceNumber || it.number || it.serialNumber;
  if (it.documentType && name) return `${it.documentType} · ${basename(name)}`;
  const fallback = name || it.documentType || it.publicId || it.url || it.id;
  if (typeof fallback === 'string') return basename(fallback);
  return fallback != null ? String(fallback) : 'item';
}

function basename(s) {
  if (typeof s !== 'string') return String(s);
  const noQuery = s.split('?')[0];
  return noQuery.includes('/') ? noQuery.split('/').filter(Boolean).pop() : noQuery;
}

const stableKey = (x) => { try { return JSON.stringify(x); } catch { return String(x); } };

// Diff two arrays by value identity → which items were added / removed.
export function arrayDiff(oldVal, newVal) {
  const oldArr = Array.isArray(oldVal) ? oldVal : [];
  const newArr = Array.isArray(newVal) ? newVal : [];
  const oldKeys = new Set(oldArr.map(stableKey));
  const newKeys = new Set(newArr.map(stableKey));
  const added = newArr.filter(it => !oldKeys.has(stableKey(it)));
  const removed = oldArr.filter(it => !newKeys.has(stableKey(it)));
  return { added, removed, oldCount: oldArr.length, newCount: newArr.length };
}

// A "collection object" is a map keyed by id/type whose values are themselves
// objects — e.g. `documents` = { PO: {...}, GST: {...} }. We summarize these
// like an array (added/removed/changed entries) instead of dumping every
// nested key.
export function isCollectionObject(v) {
  if (!isComplex(v) || Array.isArray(v)) return false;
  const vals = Object.values(v);
  if (vals.length === 0) return false;
  return vals.every(x => x !== null && typeof x === 'object' && !Array.isArray(x));
}

export function collectionDiff(oldVal, newVal) {
  const a = isComplex(oldVal) && !Array.isArray(oldVal) ? oldVal : {};
  const b = isComplex(newVal) && !Array.isArray(newVal) ? newVal : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const added = [], removed = [], modified = [];
  for (const k of keys) {
    const inA = k in a, inB = k in b;
    if (inB && !inA) added.push({ key: k, value: b[k] });
    else if (inA && !inB) removed.push({ key: k, value: a[k] });
    else if (stableKey(a[k]) !== stableKey(b[k])) modified.push({ key: k, oldValue: a[k], newValue: b[k] });
  }
  return { added, removed, modified };
}

// Shallow diff two objects → list of sub-fields that changed.
export function objectDiff(oldVal, newVal) {
  const a = isComplex(oldVal) && !Array.isArray(oldVal) ? oldVal : {};
  const b = isComplex(newVal) && !Array.isArray(newVal) ? newVal : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = [];
  for (const k of keys) {
    if (stableKey(a[k]) !== stableKey(b[k])) {
      out.push({ field: k, oldValue: a[k] ?? null, newValue: b[k] ?? null });
    }
  }
  return out;
}

// Classify a change so the renderer knows which UI to use.
export function changeKind(change) {
  const { oldValue, newValue } = change;
  if (Array.isArray(oldValue) || Array.isArray(newValue)) return 'array';
  if (isCollectionObject(oldValue) || isCollectionObject(newValue)) return 'collection';
  if (isComplex(oldValue) || isComplex(newValue)) return 'object';
  return 'scalar';
}

export function actionVerb(action) {
  switch (action) {
    case 'CREATE': return 'created';
    case 'UPDATE': return 'updated';
    case 'DELETE': return 'deleted';
    case 'LOGIN': return 'logged in';
    case 'LOGOUT': return 'logged out';
    default: return (action || '').toLowerCase();
  }
}

export function actionBadgeClass(action) {
  switch (action) {
    case 'CREATE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'LOGIN':
    case 'LOGOUT': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Condense a User-Agent string into "Chrome 148 · macOS". Best-effort; falls
// back to the raw string when it doesn't match a known pattern.
export function shortUserAgent(ua) {
  if (!ua) return '';
  let browser = '';
  let m;
  if ((m = ua.match(/Edg\/(\d+)/))) browser = `Edge ${m[1]}`;
  else if ((m = ua.match(/OPR\/(\d+)/))) browser = `Opera ${m[1]}`;
  else if ((m = ua.match(/Chrome\/(\d+)/)) && !/Edg|OPR/.test(ua)) browser = `Chrome ${m[1]}`;
  else if ((m = ua.match(/Firefox\/(\d+)/))) browser = `Firefox ${m[1]}`;
  else if (/Safari/.test(ua) && (m = ua.match(/Version\/(\d+)/))) browser = `Safari ${m[1]}`;

  let os = '';
  if (/Windows NT 10/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/(iPhone|iPad|iPod)/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const parts = [browser, os].filter(Boolean);
  return parts.length ? parts.join(' · ') : ua;
}
