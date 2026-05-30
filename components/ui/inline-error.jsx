'use client';

import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Persistent red banner that sits next to an action button or below a form.
 * Renders nothing when message is falsy — caller doesn't need to conditionally mount it.
 *
 * Props:
 *   - message (string): error text to show. Falsy = render nothing.
 *   - onDismiss (() => void, optional): renders an X button that calls this.
 *   - className (string, optional): extra Tailwind classes for spacing/positioning.
 */
export function InlineError({ message, onDismiss, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 rounded-md border border-red-200 bg-red-50',
        'px-3 py-2 text-sm text-red-700',
        'dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300',
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span className="flex-1 break-words">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="ml-1 text-red-500 hover:text-red-700 dark:hover:text-red-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
