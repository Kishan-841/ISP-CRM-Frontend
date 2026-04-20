'use client';

import { useEffect, useMemo } from 'react';
import { useMeetingReminderStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, MapPin, Link as LinkIcon, User, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/**
 * Floating stack of reminder modals — one per active reminder.
 * Pinned bottom-right, stacked vertically, each can be dismissed independently.
 */
export default function MeetingReminderModal() {
  const reminders = useMeetingReminderStore((s) => s.reminders);
  const dismiss = useMeetingReminderStore((s) => s.dismissReminder);

  // Play a short notification sound once per new reminder (browser-permission-free).
  useEffect(() => {
    if (reminders.length === 0) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      /* audio is best-effort */
    }
  }, [reminders.length]);

  if (reminders.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-end gap-3 px-4 sm:bottom-5 sm:right-5 sm:items-end sm:px-0">
      {reminders.map((r) => (
        <ReminderCard
          key={`${r.source}-${r.meetingId}`}
          reminder={r}
          onDismiss={() => dismiss(r.meetingId, r.source)}
        />
      ))}
    </div>
  );
}

function ReminderCard({ reminder, onDismiss }) {
  const minutesUntil = useMinutesUntil(reminder.startAt);
  const timeLabel = useMemo(() => formatTime(reminder.startAt), [reminder.startAt]);

  return (
    <div className="pointer-events-auto w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-2xl ring-2 ring-amber-300/40 dark:border-amber-900/50 dark:bg-slate-900 dark:ring-amber-700/40">
      {/* Header */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white">
        <Bell className="h-4 w-4 animate-bounce" />
        <div className="flex-1 text-sm font-semibold">Meeting Reminder</div>
        <Badge variant="secondary" className="bg-white/20 text-white">
          {reminder.source === 'SAM' ? 'SAM' : 'BDM'}
        </Badge>
        <button
          onClick={onDismiss}
          className="rounded p-1 hover:bg-white/20"
          aria-label="Dismiss reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {reminder.title}
          </div>
          {(reminder.customerName || reminder.companyName) && (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {reminder.customerName || '—'}
              {reminder.companyName ? ` · ${reminder.companyName}` : ''}
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-xs">
          <InfoRow icon={Clock} bold={minutesUntil <= 5}>
            {minutesUntil > 0
              ? `Starts in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'} · ${timeLabel}`
              : `Started at ${timeLabel}`}
          </InfoRow>
          {reminder.location && (
            <InfoRow icon={MapPin}>{reminder.location}</InfoRow>
          )}
          {reminder.meetingLink && (
            <InfoRow icon={LinkIcon}>
              <a
                href={reminder.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {reminder.meetingLink}
              </a>
            </InfoRow>
          )}
          {reminder.meetingType && reminder.source === 'SAM' && (
            <InfoRow icon={User}>Type: {reminder.meetingType}</InfoRow>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          {reminder.meetingLink && (
            <a
              href={reminder.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Join Meeting
            </a>
          )}
          {(() => {
            // Route to the source-appropriate scheduled-meetings page so the
            // user lands where they can take action on this specific meeting.
            const meetingsPath =
              reminder.source === 'SAM'
                ? '/dashboard/sam-executive/meetings'
                : '/dashboard/bdm-meetings';
            return (
              <Link
                href={meetingsPath}
                onClick={onDismiss}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open meetings
              </Link>
            );
          })()}
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
      <span className={bold ? 'font-semibold text-amber-700 dark:text-amber-300' : ''}>
        {children}
      </span>
    </div>
  );
}

function useMinutesUntil(startAt) {
  const target = new Date(startAt).getTime();
  const ms = target - Date.now();
  return Math.max(0, Math.round(ms / 60000));
}

function formatTime(dt) {
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
