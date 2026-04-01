'use client';

/**
 * Channel Partner Badge - displays when a lead is sourced from a Channel Partner.
 * Shows the CP company name and optionally the commission percentage.
 * Uses purple color scheme to distinguish from other badges.
 */
export default function CPBadge({ vendor, showCommission = false, size = 'sm' }) {
  if (!vendor || vendor.category !== 'CHANNEL_PARTNER') return null;

  const sizeClass = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClass} rounded-full font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800`}>
      CP: {vendor.companyName}
      {showCommission && vendor.commissionPercentage && (
        <span className="text-purple-500">({vendor.commissionPercentage}%)</span>
      )}
    </span>
  );
}
