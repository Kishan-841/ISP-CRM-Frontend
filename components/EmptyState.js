'use client';

import { Inbox } from 'lucide-react';

/**
 * Reusable empty state component with icon, title, subtitle, and optional action.
 *
 * @param {Object} props
 * @param {import('lucide-react').LucideIcon} [props.icon] - Lucide icon component (default: Inbox)
 * @param {string} props.title - Primary message
 * @param {string} [props.subtitle] - Secondary helper text
 * @param {Object} [props.action] - Optional CTA button { label: string, onClick: () => void }
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data found',
  subtitle,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800/60 p-4">
        <Icon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-xs text-center">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
