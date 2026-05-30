'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small red text + icon. Sits directly under an Input/Textarea/Select for per-field errors.
 *
 * Props:
 *   - message (string): error text. Falsy = render nothing.
 *   - className (string, optional)
 */
export function FormFieldError({ message, className = '' }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        'mt-1.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400',
        className
      )}
    >
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
}
