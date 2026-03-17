'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import {
  Bell,
  Database,
  Users,
  Clock,
  Check,
  CheckCheck,
  Trash2,
  ChevronRight,
  Loader2,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'DATA_ASSIGNED':
      return Database;
    case 'LEAD_CONVERTED':
      return Users;
    case 'FOLLOW_UP_REMINDER':
      return Clock;
    case 'FEASIBILITY_ASSIGNED':
      return ClipboardCheck;
    case 'FEASIBILITY_RETURNED':
      return AlertTriangle;
    default:
      return Bell;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'DATA_ASSIGNED':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-600'
      };
    case 'LEAD_CONVERTED':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-600'
      };
    case 'FOLLOW_UP_REMINDER':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-600'
      };
    case 'FEASIBILITY_ASSIGNED':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-600'
      };
    case 'FEASIBILITY_RETURNED':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-600'
      };
    default:
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-600'
      };
  }
};

const getTimeAgo = (date) => {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInSeconds = Math.floor((now - notificationDate) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  return notificationDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const getNotificationLink = (notification) => {
  const metadata = notification.metadata || {};

  switch (notification.type) {
    case 'DATA_ASSIGNED':
      if (metadata.campaignId) {
        return `/dashboard/calling-queue?campaign=${metadata.campaignId}`;
      }
      return '/dashboard/calling-queue';
    case 'LEAD_CONVERTED':
      if (metadata.leadId) {
        return `/dashboard/leads?id=${metadata.leadId}`;
      }
      return '/dashboard/leads';
    case 'FOLLOW_UP_REMINDER':
      // BDM follow-up has leadId, ISR follow-up has dataId
      if (metadata.leadId) {
        return `/dashboard/bdm-follow-ups?highlight=${metadata.leadId}`;
      }
      if (metadata.dataId) {
        return `/dashboard/follow-ups?highlight=${metadata.dataId}`;
      }
      return '/dashboard/follow-ups';
    case 'FEASIBILITY_ASSIGNED':
      return `/dashboard/feasibility-queue`;
    case 'FEASIBILITY_RETURNED':
      if (metadata.leadId) {
        return `/dashboard/bdm-queue`;
      }
      return '/dashboard/bdm-queue';
    default:
      return '/dashboard';
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'DATA_ASSIGNED':
      return 'Data Assignment';
    case 'LEAD_CONVERTED':
      return 'Lead Conversion';
    case 'FOLLOW_UP_REMINDER':
      return 'Follow-up Reminder';
    case 'FEASIBILITY_ASSIGNED':
      return 'Feasibility Review';
    case 'FEASIBILITY_RETURNED':
      return 'Lead Returned';
    default:
      return 'Notification';
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all'); // all, unread, read

  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    router.push(link);
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader title="Notifications" description={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            >
              <CheckCheck size={18} />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              Clear all
            </button>
          )}
        </div>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'read', label: 'Read', count: notifications.length - unreadCount }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              filter === tab.key
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            {tab.label}
            <span className={cn(
              'ml-2 px-2 py-0.5 text-xs rounded-full',
              filter === tab.key
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Bell size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">
            {filter === 'unread' ? "You're all caught up!" : 'Your notifications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">
                {date}
              </h3>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const colors = getNotificationColor(notification.type);

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex items-start gap-4 p-4 cursor-pointer transition-colors group',
                        !notification.read
                          ? 'bg-orange-50/50 dark:bg-orange-900/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        colors.bg
                      )}>
                        <Icon size={20} className={colors.text} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                colors.bg,
                                colors.text
                              )}>
                                {getTypeLabel(notification.type)}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-orange-600" />
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                              {getTimeAgo(notification.createdAt)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <button
                                onClick={(e) => handleMarkAsRead(e, notification.id)}
                                className="p-2 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, notification.id)}
                              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                            <ChevronRight size={16} className="text-slate-400 ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
