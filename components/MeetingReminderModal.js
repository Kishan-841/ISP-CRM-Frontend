'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReminderStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Clock, MapPin, Link as LinkIcon, X, ExternalLink,
  Phone, Users, AlertTriangle, DollarSign, Calendar,
} from 'lucide-react';
import Link from 'next/link';

/**
 * Generic reminder modal — renders any reminder pushed by the backend
 * `reminder:show` socket event. Handles meetings, follow-ups, SAM visits,
 * complaint TAT warnings, and invoice-due notices. Pinned bottom-right,
 * stacked vertically, each card dismissable independently.
 *
 * Kept the filename "MeetingReminderModal.js" for import-path stability —
 * the internal component has always been the mount point for every reminder.
 */

// Visual style per reminder type: icon + gradient + label.
// Keep in one place so adding a new reminder type is a single-row change.
const TYPE_STYLES = {
  MEETING_BDM:    { icon: Users,          header: 'Meeting Reminder',   gradient: 'from-amber-500 to-orange-500',   badge: 'BDM' },
  MEETING_SAM:    { icon: Users,          header: 'Meeting Reminder',   gradient: 'from-amber-500 to-orange-500',   badge: 'SAM' },
  FOLLOW_UP_ISR:  { icon: Phone,          header: 'Follow-up Call',     gradient: 'from-sky-500 to-blue-600',       badge: 'ISR' },
  FOLLOW_UP_BDM:  { icon: Phone,          header: 'Follow-up Call',     gradient: 'from-sky-500 to-blue-600',       badge: 'BDM' },
  SAM_VISIT:      { icon: MapPin,         header: 'Customer Visit',     gradient: 'from-emerald-500 to-teal-600',   badge: 'SAM' },
  COMPLAINT_TAT:  { icon: AlertTriangle,  header: 'TAT Warning',        gradient: 'from-red-500 to-rose-600',       badge: 'Complaint' },
  INVOICE_DUE:    { icon: DollarSign,     header: 'Invoice Due Soon',   gradient: 'from-violet-500 to-indigo-600',  badge: 'Accounts' },
  // Fallback for any unknown future type
  DEFAULT:        { icon: Bell,           header: 'Reminder',           gradient: 'from-amber-500 to-orange-500',   badge: '' },
};

export default function MeetingReminderModal() {
  const reminders = useReminderStore((s) => s.reminders);
  const dismiss = useReminderStore((s) => s.dismissReminder);

  // Play a short tone only when a NEW reminder arrives. Tracking previous
  // length so dismissing one (length goes down) doesn't trigger a beep.
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (reminders.length > prevLenRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.05;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      } catch { /* best effort */ }
    }
    prevLenRef.current = reminders.length;
  }, [reminders.length]);

  if (reminders.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-end gap-3 px-4 sm:bottom-5 sm:right-5 sm:items-end sm:px-0">
      {reminders.map((r) => (
        <ReminderCard key={r.id} reminder={r} onDismiss={() => dismiss(r.id)} />
      ))}
    </div>
  );
}

function ReminderCard({ reminder, onDismiss }) {
  const style = TYPE_STYLES[reminder.type] || TYPE_STYLES.DEFAULT;
  const Icon = style.icon;
  const minutesUntil = useMinutesUntil(reminder.startAt);
  const timeLabel = useMemo(() => formatWhen(reminder.startAt), [reminder.startAt]);
  const urgencyLabel = buildUrgencyLabel(reminder.type, minutesUntil);

  return (
    <div className="pointer-events-auto w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-2 ring-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700/40">
      {/* Header */}
      <div className={`flex items-center gap-2 bg-gradient-to-r ${style.gradient} px-4 py-2.5 text-white`}>
        <Bell className="h-4 w-4 animate-bounce" />
        <div className="flex-1 text-sm font-semibold">{style.header}</div>
        {style.badge && (
          <Badge variant="secondary" className="bg-white/20 text-white">
            {style.badge}
          </Badge>
        )}
        <button
          onClick={onDismiss}
          className="rounded p-1 hover:bg-white/20"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {reminder.title}
            </div>
            {reminder.subtitle && (
              <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {reminder.subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <InfoRow icon={Clock} bold>
            {urgencyLabel}{timeLabel ? ` · ${timeLabel}` : ''}
          </InfoRow>
          {reminder.location && <InfoRow icon={MapPin}>{reminder.location}</InfoRow>}
          {reminder.joinLink && (
            <InfoRow icon={LinkIcon}>
              <a
                href={reminder.joinLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {reminder.joinLink}
              </a>
            </InfoRow>
          )}
          {reminder.meta?.priority && reminder.type === 'COMPLAINT_TAT' && (
            <InfoRow icon={AlertTriangle}>Priority: {reminder.meta.priority}</InfoRow>
          )}
          {reminder.meta?.amountDue != null && reminder.type === 'INVOICE_DUE' && (
            <InfoRow icon={DollarSign}>
              ₹{Number(reminder.meta.amountDue).toFixed(2)} pending
            </InfoRow>
          )}
          {reminder.meta?.phone && (reminder.type === 'FOLLOW_UP_ISR' || reminder.type === 'FOLLOW_UP_BDM') && (
            <InfoRow icon={Phone}>{reminder.meta.phone}</InfoRow>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          {reminder.joinLink && (
            <a
              href={reminder.joinLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r ${style.gradient} px-3 py-2 text-xs font-medium text-white hover:opacity-90`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Join
            </a>
          )}
          {reminder.ctaHref && (
            <Link
              href={reminder.ctaHref}
              onClick={onDismiss}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {reminder.ctaLabel || 'Open'}
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={onDismiss} className="text-xs">
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, children, bold }) {
  return (
    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
      <span className={bold ? 'font-semibold' : ''}>{children}</span>
    </div>
  );
}

// Re-renders the component every 30 seconds so the "Starts in N min" label
// doesn't go stale while a reminder card sits open. 30s is granular enough
// for minute-level countdowns without burning CPU.
function useMinutesUntil(startAt) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(startAt).getTime();
  const ms = target - Date.now();
  return Math.round(ms / 60000);  // can be negative (already passed)
}

function formatWhen(dt) {
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// Friendly urgency phrasing per type. Timescales differ a lot — 5 min for
// meetings, 30 min for visits, hours for TAT, days for invoices.
function buildUrgencyLabel(type, minutesUntil) {
  const abs = Math.abs(minutesUntil);
  const past = minutesUntil < 0;

  if (type === 'INVOICE_DUE') {
    const days = Math.round(abs / (60 * 24));
    if (past) return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
  }
  if (type === 'COMPLAINT_TAT') {
    if (abs >= 60) {
      const h = Math.round(abs / 60);
      return past ? `TAT breached ${h}h ago` : `TAT breach in ${h}h`;
    }
    return past ? `TAT breached ${abs} min ago` : `TAT breach in ${abs} min`;
  }
  // Meetings / visits / follow-ups — minutes
  if (past) return `Started ${abs} min ago`;
  if (abs === 0) return 'Starting now';
  return `Starts in ${abs} min`;
}
