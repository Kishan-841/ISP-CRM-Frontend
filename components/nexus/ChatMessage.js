'use client';

import ReactMarkdown from 'react-markdown';
import { Sparkles, User as UserIcon, AlertTriangle, Info, Zap } from 'lucide-react';

// Detect a refusal / "no info" response by content so we can style it distinctly
// without needing a backend field.
const REFUSAL_PATTERNS = [
  /^i don'?t have information/i,
  /^that'?s (primarily )?handled by/i,
  /^nexus is experiencing high load/i,
  /contact your team lead or admin/i,
];
const isRefusalContent = (content) => REFUSAL_PATTERNS.some((re) => re.test((content || '').trim()));

export default function ChatMessage({ role, content, fromCache, isError }) {
  const isUser = role === 'USER';

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] break-words rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          {content}
        </div>
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserIcon className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  const isRefusal = !isError && isRefusalContent(content);

  // Visual state: error > refusal > cached > normal
  const state = isError ? 'error' : isRefusal ? 'refusal' : fromCache ? 'cached' : 'normal';

  const AVATAR_CLASS = {
    error:   'bg-gradient-to-br from-red-500 to-rose-600',
    refusal: 'bg-gradient-to-br from-amber-500 to-orange-500',
    cached:  'bg-gradient-to-br from-emerald-500 to-teal-600',
    normal:  'bg-gradient-to-br from-violet-500 to-indigo-600',
  }[state];

  const BUBBLE_CLASS = {
    error:   'bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/40 dark:text-red-100 dark:border-red-900/50',
    refusal: 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900/50',
    cached:  'bg-muted text-foreground',
    normal:  'bg-muted text-foreground',
  }[state];

  const AvatarIcon = { error: AlertTriangle, refusal: Info, cached: Sparkles, normal: Sparkles }[state];

  return (
    <div className="flex gap-2">
      <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white shadow ${AVATAR_CLASS}`}>
        <AvatarIcon className="h-3.5 w-3.5" />
      </div>
      <div
        className={`max-w-[85%] overflow-hidden rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm shadow-sm ${BUBBLE_CLASS}`}
      >
        {state === 'cached' && (
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            <Zap className="h-2.5 w-2.5" />
            Instant · cached
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:text-xs">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
