/**
 * Single source of truth for the "Current Stage" pill colour across the app.
 *
 * Each stage maps to the bucket that owns it (matching the bucket-strip
 * palette on /dashboard/buckets) so a lead's pill is the same colour on
 * the Customer 360 list, the Buckets page, and any future surface that
 * shows currentStage. Bucket boundaries themselves are defined backend-
 * side in src/utils/leadStageDeriver.js — keep this map in sync if the
 * backend mapping changes.
 */

const BUCKET_PILL = {
  BDM:             'bg-orange-100  text-orange-700  dark:bg-orange-900/30  dark:text-orange-300',
  FEASIBILITY:     'bg-purple-100  text-purple-700  dark:bg-purple-900/30  dark:text-purple-300',
  OPS:             'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  SALES_DIRECTOR:  'bg-indigo-100  text-indigo-700  dark:bg-indigo-900/30  dark:text-indigo-300',
  DOCS:            'bg-cyan-100    text-cyan-700    dark:bg-cyan-900/30    dark:text-cyan-300',
  ACCOUNTS:        'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-300',
  NOC:             'bg-teal-100    text-teal-700    dark:bg-teal-900/30    dark:text-teal-300',
  STORE:           'bg-stone-200   text-stone-700   dark:bg-stone-800      dark:text-stone-300',
  DELIVERY:        'bg-pink-100    text-pink-700    dark:bg-pink-900/30    dark:text-pink-300',
  // Post-pipeline / terminal — surface here so Customer 360 list pills
  // still look distinct even though these aren't tabs in the Buckets view.
  ACTIVE:          'bg-green-100   text-green-700   dark:bg-green-900/30   dark:text-green-300',
  DROPPED:         'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-300',
};

const STAGE_TO_BUCKET = {
  // BDM
  'New': 'BDM',
  'BDM': 'BDM',
  'Qualified': 'BDM',
  'Follow-up': 'BDM',
  'Quotation': 'BDM',
  'Quotation Ready': 'BDM',
  'Docs Collection': 'BDM',
  'Docs Rejected': 'BDM',
  'OPS Rejected': 'BDM',
  'SA2 Rejected': 'BDM',
  'Accounts Rejected': 'BDM',

  'Feasibility': 'FEASIBILITY',

  'OPS Approval': 'OPS',
  'Awaiting OPS Push': 'OPS',

  'Sales Director Approval': 'SALES_DIRECTOR',

  'Docs Verification': 'DOCS',

  'Accounts Verification': 'ACCOUNTS',
  'Plan Creation': 'ACCOUNTS',
  'Demo Plan': 'ACCOUNTS',
  'Awaiting Plan Activation': 'ACCOUNTS',

  'Pushed to Installation': 'NOC',
  'NOC': 'NOC',

  'Delivery — Assigned to Store': 'STORE',

  'NOC → Delivery': 'DELIVERY',
  'Delivery Approval': 'DELIVERY',
  'Delivery — Approved': 'DELIVERY',
  'Dispatched': 'DELIVERY',
  'Awaiting Installation': 'DELIVERY',
  'Installation': 'DELIVERY',
  'Speed Test': 'DELIVERY',
  'Customer Acceptance': 'DELIVERY',

  'Active Customer': 'ACTIVE',
  'Dropped': 'DROPPED',
  'Not Feasible': 'DROPPED',
};

const FALLBACK = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export function stageColorClass(stage) {
  if (!stage) return FALLBACK;
  const bucket = STAGE_TO_BUCKET[stage];
  return BUCKET_PILL[bucket] || FALLBACK;
}
