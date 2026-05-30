'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Page-level error state. Use inside a page body where data was supposed to render
 * (e.g. queue load failure). Optional onRetry renders a Retry button.
 *
 * Props:
 *   - message (string): error text. Falsy = render nothing.
 *   - onRetry (() => void, optional): renders a Retry button that calls this.
 *   - className (string, optional)
 */
export function ErrorBanner({ message, onRetry, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50',
        'px-6 py-10 text-center',
        'dark:border-red-900/50 dark:bg-red-900/20',
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-1.5">
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
