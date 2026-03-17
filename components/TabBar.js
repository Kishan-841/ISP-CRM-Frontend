'use client';

/**
 * Reusable TabBar component with underline-style tabs.
 *
 * Usage:
 *   <TabBar
 *     tabs={[
 *       { key: 'all', label: 'All', count: 10 },
 *       { key: 'active', label: 'Active', count: 5, variant: 'success' },
 *       { key: 'overdue', label: 'Overdue', count: 2, variant: 'danger' },
 *     ]}
 *     activeTab="all"
 *     onTabChange={(key) => setActiveTab(key)}
 *   />
 *
 * Props:
 *   tabs        - Array of { key, label, count?, variant?, icon? }
 *                  variant: 'danger'  → red   (overdue, rejected, critical)
 *                           'warning' → amber (pending, follow-up)
 *                           'success' → emerald (approved, completed, live)
 *                           'info'    → blue  (neutral info)
 *                           default   → orange (brand)
 *   activeTab   - Currently active tab key
 *   onTabChange - Callback when a tab is clicked
 *   className   - Optional extra classes on the wrapper
 */

const VARIANT_STYLES = {
  default: {
    underline: 'bg-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  },
  danger: {
    underline: 'bg-red-500',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  },
  warning: {
    underline: 'bg-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  },
  success: {
    underline: 'bg-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  },
  info: {
    underline: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  },
};

export default function TabBar({ tabs = [], activeTab, onTabChange, className = '' }) {
  return (
    <div className={`border-b border-slate-200 dark:border-slate-700/50 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-0 -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const style = VARIANT_STYLES[tab.variant] || VARIANT_STYLES.default;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange?.(tab.key)}
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-xs font-semibold text-center ${
                    isActive
                      ? style.badge
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span
                  className={`absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full ${style.underline}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
