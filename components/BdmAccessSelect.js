'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, Users } from 'lucide-react';

// The roles the backend actually filters on (see backend/src/utils/productVisibility.js).
// BDM(CP) and Team Leaders are filtered too, so they MUST be selectable here —
// otherwise they could never be granted a restricted product and would be
// permanently locked out of every product that has any assignment.
const RESTRICTED_ROLES = [
  { role: 'BDM', label: 'BDM' },
  { role: 'BDM_CP', label: 'BDM (Channel Partner)' },
  { role: 'BDM_TEAM_LEADER', label: 'BDM Team Leader' },
];

/**
 * Picks which BDMs a product is visible to.
 *
 * Selecting nobody is meaningful, not incomplete: an empty list means the
 * product stays visible to every BDM. Restriction is opt-in.
 *
 * @param {string[]} value      - selected user ids
 * @param {(ids: string[]) => void} onChange
 * @param {boolean} disabled
 */
export default function BdmAccessSelect({ value = [], onChange, disabled = false }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // /users/by-role takes a single role, so fetch the three and merge.
        // Three small calls beat widening an endpoint eight other roles use.
        const results = await Promise.all(
          RESTRICTED_ROLES.map(async ({ role, label }) => {
            const { data } = await api.get(`/users/by-role?role=${role}`);
            return { role, label, users: data?.users || [] };
          })
        );
        if (!cancelled) {
          setGroups(results.filter((g) => g.users.length > 0));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Could not load BDM list');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const toggle = (id) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const total = groups.reduce((n, g) => n + g.users.length, 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading BDMs…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-2">{error}</p>;
  }

  if (total === 0) {
    return <p className="text-sm text-slate-500 py-2">No active BDM users found.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {value.length === 0
            ? 'Visible to all BDMs. Select BDMs to restrict this product to them.'
            : `Only the ${value.length} selected ${value.length === 1 ? 'user' : 'users'} will see this product.`}
        </p>
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-blue-600 hover:underline shrink-0 ml-3"
          >
            Clear (show to all)
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
        {groups.map((group) => (
          <div key={group.role} className="p-2">
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> {group.label}
            </p>
            {group.users.map((u) => (
              <label
                key={u.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                  disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={value.includes(u.id)}
                  onChange={() => toggle(u.id)}
                  disabled={disabled}
                  className="rounded border-slate-300"
                />
                <span className="text-slate-800 dark:text-slate-200">{u.name}</span>
                {u.email && <span className="text-xs text-slate-400 truncate">{u.email}</span>}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
