'use client';
import { RefreshCw } from 'lucide-react';

// Compact chip surfaced next to ARC/OTC anywhere a lead is shown. Only
// renders when the lead has actually been revised. The tooltip carries the
// audit info (who/when/why) so reviewers can see the story at a glance.
export default function QuotationRevisedBadge({ lead, size = 'sm' }) {
  if (!lead?.quotationRevisedAt) return null;
  const count = lead.quotationRevisionCount || 1;
  const who = lead.quotationRevisedBy?.name || 'Sales Director';
  const when = new Date(lead.quotationRevisedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const reason = lead.quotationRevisedReason || '';
  const tooltip = `Revised by ${who} on ${when}${reason ? `\nReason: ${reason}` : ''}`;

  const padding = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-xs';

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 ${padding} rounded-md font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800`}
    >
      <RefreshCw className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {count > 1 ? `Quotation Revised ×${count}` : 'Quotation Revised'}
    </span>
  );
}
