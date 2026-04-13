'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/lib/store';
import { PhoneMissed, Clock } from 'lucide-react';

/**
 * Shared tab bar for the BDM Follow-Ups + Retry Queue split.
 * Renders two pill buttons that look like tabs but navigate to separate
 * pages underneath so we don't have to refactor either big page.
 */
export default function FollowUpTabs() {
  const pathname = usePathname();
  const { counts } = useSidebarStore();

  const tabs = [
    {
      key: 'retry',
      label: 'Retry Queue',
      path: '/dashboard/retry-calls',
      icon: PhoneMissed,
      badge: counts?.retryQueue || 0,
      description: 'Calls from Self Calling Queue that went unanswered',
    },
    {
      key: 'followups',
      label: 'Follow-Ups',
      path: '/dashboard/bdm-follow-ups',
      icon: Clock,
      badge: counts?.followUps || 0,
      description: 'Leads you marked for follow-up from New Lead Assigned',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.path;
        return (
          <Link
            key={tab.key}
            href={tab.path}
            title={tab.description}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900/50'
            }`}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  active
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
