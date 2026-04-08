'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * Reusable searchable campaign dropdown.
 * - Default "All Campaigns" option (when includeAll)
 * - Type-ahead search filters campaigns by name
 * - Value is campaign id, or 'all' for the All option
 */
export default function SearchableCampaignSelect({
  campaigns = [],
  value,
  onChange,
  user,
  includeAll = true,
  disabled = false,
  placeholder = 'Select a campaign',
  className = '',
  onBeforeChange, // optional guard: return false to block change
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const resolveDisplayName = (c) => {
    if (!c?.name) return '';
    let displayName = c.name;
    if (c.createdBy?.name && c.createdBy.id !== user?.id) {
      displayName = displayName
        .replace('[Self]', `[${c.createdBy.name}]`)
        .replace('[SAM Self]', `[SAM: ${c.createdBy.name}]`)
        .replace('[BDM Self]', `[BDM: ${c.createdBy.name}]`)
        .replace('[TL Self]', `[TL: ${c.createdBy.name}]`);
    }
    return displayName;
  };

  const allOption = { id: 'all', name: 'All Campaigns' };
  const list = includeAll ? [allOption, ...campaigns] : campaigns;

  const normSearch = search.trim().toLowerCase();
  const filtered = normSearch
    ? list.filter((c) => {
        if (c.id === 'all') return 'all campaigns'.includes(normSearch);
        return resolveDisplayName(c).toLowerCase().includes(normSearch);
      })
    : list;

  const effectiveValue = value || (includeAll ? 'all' : '');
  const selected =
    list.find((c) => c.id === effectiveValue) || (includeAll ? allOption : null);
  const selectedLabel = selected
    ? selected.id === 'all'
      ? 'All Campaigns'
      : resolveDisplayName(selected)
    : placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Autofocus the search input on open
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((o) => !o);
  };

  const handleSelect = (id) => {
    if (onBeforeChange && onBeforeChange() === false) return;
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className="h-10 px-4 pr-3 w-full sm:min-w-[240px] sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent cursor-pointer flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full sm:w-[320px] right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search campaign name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-orange-600 focus:border-orange-600 outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No campaigns match &quot;{search}&quot;
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected =
                  c.id === effectiveValue ||
                  (c.id === 'all' && (effectiveValue === 'all' || !effectiveValue));
                const label =
                  c.id === 'all' ? 'All Campaigns' : resolveDisplayName(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
