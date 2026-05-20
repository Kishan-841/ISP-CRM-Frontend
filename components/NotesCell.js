'use client';

import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModal } from '@/lib/useModal';

// Reusable notes cell used in every approver-side service-order queue
// (Order Approvals, Docs Review, Delivery Approvals, Accounts, NOC).
// Shows a 60-char preview inline + a View button when truncated; the
// button pops a read-only modal with the full text, scroll if it's long.
// Long QUICK markers like "SAM-9fb88bae | QUICK disconnect — CRM Admin
// approved | Reason: …" otherwise fall off the row.
const TRUNCATE_AT = 60;

export default function NotesCell({ notes, title = 'Notes' }) {
  const [open, setOpen] = useState(false);
  useModal(open, () => setOpen(false));

  if (!notes) return <span className="text-slate-400 text-xs">—</span>;

  const isTruncated = notes.length > TRUNCATE_AT;
  const preview = isTruncated ? `${notes.slice(0, TRUNCATE_AT)}…` : notes;

  return (
    <>
      <div className="flex items-center gap-1.5 max-w-[280px]">
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate" title={notes}>
          {preview}
        </span>
        {isTruncated && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true); }}
            className="p-1 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors flex-shrink-0"
            title="View full notes"
          >
            <Eye size={14} />
          </button>
        )}
      </div>

      {open && (
        <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div
            className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                {notes}
              </p>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
