// Renders a tiny orange "SAM" pill when a lead was created via the
// SAM → CRM Create-Lead integration (Lead.creationSource = 'SAM_DISPATCH').
// Optionally renders a richer one-line attribution ("Sourced by …") if
// `showAttribution` is set — used on the lead detail surface, not in
// list rows where space is tight.
//
// Returns null when the lead isn't SAM-sourced — drop it inline anywhere
// without worrying about non-SAM rows.
import { Zap } from 'lucide-react';

export default function SamSourceBadge({ lead, showAttribution = false, className = '' }) {
  if (lead?.creationSource !== 'SAM_DISPATCH') return null;
  return (
    <span
      title={
        lead.samCreatedByName || lead.samCreatedByEmail
          ? `Created from SAM by ${lead.samCreatedByName || lead.samCreatedByEmail}`
          : 'Created from SAM'
      }
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800 ${className}`}
    >
      <Zap className="w-2.5 h-2.5" />
      SAM
      {showAttribution && (lead.samCreatedByName || lead.samCreatedByEmail) && (
        <span className="ml-1 normal-case font-normal text-orange-600/80 dark:text-orange-300/80">
          · {lead.samCreatedByName || lead.samCreatedByEmail}
        </span>
      )}
    </span>
  );
}
