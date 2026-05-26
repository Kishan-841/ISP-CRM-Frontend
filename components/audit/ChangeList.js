'use client';
import { useState } from 'react';
import { ChevronRight, Plus, Minus, ArrowRight } from 'lucide-react';
import {
  humanizeField, formatScalar, changeKind, arrayDiff, objectDiff, collectionDiff, itemLabel,
} from '@/lib/auditFormat';

// Old → New for a plain scalar field.
function ScalarDiff({ field, oldValue, newValue, userMap }) {
  const oldEmpty = oldValue === null || oldValue === undefined || oldValue === '';
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {!oldEmpty && (
        <span className="text-red-600 dark:text-red-400 line-through decoration-red-400/60">
          {formatScalar(oldValue, field, userMap)}
        </span>
      )}
      {!oldEmpty && <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
        {formatScalar(newValue, field, userMap)}
      </span>
    </div>
  );
}

// Added / removed items for an array field (documents, IP lists, line items…).
function ArrayDiff({ field, oldValue, newValue }) {
  const [open, setOpen] = useState(false);
  const { added, removed, oldCount, newCount } = arrayDiff(oldValue, newValue);

  const summary = [];
  if (added.length) summary.push(`${added.length} added`);
  if (removed.length) summary.push(`${removed.length} removed`);
  if (!summary.length) summary.push(`${oldCount} → ${newCount} items`);

  const hasDetail = added.length > 0 || removed.length > 0;

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`flex items-center gap-1 text-slate-600 dark:text-slate-300 ${hasDetail ? 'hover:text-slate-900 dark:hover:text-slate-100' : 'cursor-default'}`}
      >
        {hasDetail && (
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        )}
        <span>{summary.join(' · ')}</span>
      </button>

      {open && (
        <div className="mt-1.5 ml-1 space-y-1">
          {added.map((it, i) => (
            <div key={`a${i}`} className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Plus className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="break-words">{itemLabel(it)}</span>
            </div>
          ))}
          {removed.map((it, i) => (
            <div key={`r${i}`} className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
              <Minus className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="break-words line-through decoration-red-400/60">{itemLabel(it)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A keyed collection (e.g. documents map) — added / removed / replaced entries
// summarized by their human label, never the internal file keys.
function CollectionDiff({ oldValue, newValue }) {
  const [open, setOpen] = useState(false);
  const { added, removed, modified } = collectionDiff(oldValue, newValue);

  const summary = [];
  if (added.length) summary.push(`${added.length} added`);
  if (removed.length) summary.push(`${removed.length} removed`);
  if (modified.length) summary.push(`${modified.length} replaced`);
  if (!summary.length) summary.push('updated');

  const hasDetail = added.length || removed.length || modified.length;

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`flex items-center gap-1 text-slate-600 dark:text-slate-300 ${hasDetail ? 'hover:text-slate-900 dark:hover:text-slate-100' : 'cursor-default'}`}
      >
        {hasDetail ? <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} /> : null}
        <span>{summary.join(' · ')}</span>
      </button>

      {open && (
        <div className="mt-1.5 ml-1 space-y-1">
          {added.map(({ key, value }) => (
            <div key={`a${key}`} className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Plus className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="break-words">{itemLabel(value)}</span>
            </div>
          ))}
          {removed.map(({ key, value }) => (
            <div key={`r${key}`} className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
              <Minus className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="break-words line-through decoration-red-400/60">{itemLabel(value)}</span>
            </div>
          ))}
          {modified.map(({ key, newValue: nv }) => (
            <div key={`m${key}`} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="break-words">{itemLabel(nv)} <span className="text-slate-400">(replaced)</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A nested object — show only the sub-fields that actually changed.
function ObjectDiff({ oldValue, newValue, userMap }) {
  const subs = objectDiff(oldValue, newValue);
  if (subs.length === 0) {
    return <span className="text-sm text-slate-500">updated</span>;
  }
  return (
    <div className="space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
      {subs.map((c) => (
        <div key={c.field}>
          <div className="text-xs text-slate-500 dark:text-slate-400">{humanizeField(c.field)}</div>
          {(() => {
            const k = changeKind(c);
            if (k === 'array') return <ArrayDiff {...c} />;
            if (k === 'collection') return <CollectionDiff {...c} />;
            if (k === 'object') return <span className="text-sm text-slate-500">updated</span>;
            return <ScalarDiff {...c} userMap={userMap} />;
          })()}
        </div>
      ))}
    </div>
  );
}

function FieldDiff({ change, userMap }) {
  const kind = changeKind(change);
  return (
    <div className="py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
        {humanizeField(change.field)}
      </div>
      {kind === 'array' && <ArrayDiff {...change} />}
      {kind === 'collection' && <CollectionDiff {...change} />}
      {kind === 'object' && <ObjectDiff {...change} userMap={userMap} />}
      {kind === 'scalar' && <ScalarDiff {...change} userMap={userMap} />}
    </div>
  );
}

// Friendly, field-by-field rendering of an audit event's `changes` array.
// `userMap` resolves user-id fields to display names.
export default function ChangeList({ changes, userMap }) {
  if (!Array.isArray(changes) || changes.length === 0) return null;
  return (
    <div className="space-y-2">
      {changes.map((c, i) => <FieldDiff key={`${c.field}-${i}`} change={c} userMap={userMap} />)}
    </div>
  );
}
