'use client';

/**
 * Zone & city backfill.
 *
 * Feasibility now demands a zone and city before a lead can be marked
 * FEASIBLE, so anything new arrives complete. This screen is for everything
 * that came before — above all the live customers sitting in SAM with a blank
 * CIRCLE / ZONE today.
 *
 * Rows save one at a time and then disappear from the list, so the work has
 * visible progress and nobody has to track what they have already done.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { MapPin, Search, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ZoneCityBackfillPage() {
  const router = useRouter();
  const { user, isFeasibilityTeam, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const canAccess = isFeasibilityTeam || isAdmin || isMaster;

  const { zones, fetchZones, fetchZoneCityQueue, setLeadZoneCity } = useLeadStore();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  // 'live' = customers already in SAM, where the gap is visible today.
  const [scope, setScope] = useState('live');
  const [loading, setLoading] = useState(true);
  // Per-row pending selections, keyed by lead id.
  const [draft, setDraft] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (user && !canAccess) router.push('/dashboard');
  }, [user, canAccess, router]);

  useEffect(() => {
    if (canAccess) fetchZones();
  }, [canAccess, fetchZones]);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    const result = await fetchZoneCityQueue({
      page,
      limit: 25,
      search: search || undefined,
      scope: scope === 'all' ? 'all' : undefined,
    });
    if (result.success) {
      setRows(result.items || []);
      setPagination(result.pagination || null);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, [canAccess, fetchZoneCityQueue, page, search, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const setDraftField = (leadId, field, value) =>
    setDraft((prev) => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        [field]: value,
        // A zone change invalidates the city beneath it.
        ...(field === 'zoneId' ? { cityId: '' } : {}),
      },
    }));

  const handleSave = async (lead) => {
    const picked = draft[lead.id] || {};
    if (!picked.zoneId || !picked.cityId) {
      toast.error('Pick both a zone and a city.');
      return;
    }
    setSavingId(lead.id);
    const result = await setLeadZoneCity(lead.id, picked.zoneId, picked.cityId);
    if (result.success) {
      toast.success(result.message || 'Saved');
      // Drop the row rather than refetching the page — the list is a worklist,
      // and a full reload would lose the reader's place.
      setRows((prev) => prev.filter((r) => r.id !== lead.id));
      setPagination((p) => (p ? { ...p, total: Math.max(0, p.total - 1) } : p));
    } else {
      toast.error(result.error);
    }
    setSavingId(null);
  };

  if (!canAccess) return null;

  const citiesFor = (zoneId) => zones.find((z) => z.id === zoneId)?.cities || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Zone & City"
        description="Fill in the service geography for leads captured before it was required."
        icon={MapPin}
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {[
                { id: 'live', label: 'Live customers' },
                { id: 'all', label: 'All leads' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setScope(t.id);
                    setPage(1);
                  }}
                  className={`px-3 h-9 rounded-md text-sm font-medium border transition-colors ${
                    scope === t.id
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(searchInput.trim());
              }}
              className="flex gap-2"
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Company or lead number"
                  className="h-9 pl-8 pr-3 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <Button type="submit" variant="outline" className="h-9">
                Search
              </Button>
            </form>
          </div>

          {pagination && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pagination.total} lead{pagination.total === 1 ? '' : 's'} still missing zone or city
              {scope === 'live' && ' among live customers'}.
            </p>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Check className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-slate-700 dark:text-slate-300 font-medium">Nothing left here.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {scope === 'live'
                  ? 'Every live customer has a zone and city. Try "All leads".'
                  : 'Every lead has a zone and city.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 pr-3 font-medium">Lead</th>
                    <th className="py-2 pr-3 font-medium">Typed city</th>
                    <th className="py-2 pr-3 font-medium">Zone</th>
                    <th className="py-2 pr-3 font-medium">City</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead) => {
                    const picked = draft[lead.id] || {};
                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-100 dark:border-slate-800 align-top"
                      >
                        <td className="py-3 pr-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {lead.company || '—'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {lead.leadNumber || '—'}
                            {lead.isLiveCustomer && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                live
                              </span>
                            )}
                          </div>
                          {lead.address && (
                            <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                              {lead.address}
                            </div>
                          )}
                        </td>
                        {/* The BDM's free text — a hint for whoever is filling this in,
                            not a value we trust. */}
                        <td className="py-3 pr-3 text-slate-500 dark:text-slate-400">
                          {lead.typedCity || '—'}
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={picked.zoneId || ''}
                            onChange={(e) => setDraftField(lead.id, 'zoneId', e.target.value)}
                            className="h-9 px-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Zone...</option>
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={picked.cityId || ''}
                            onChange={(e) => setDraftField(lead.id, 'cityId', e.target.value)}
                            disabled={!picked.zoneId}
                            className="h-9 px-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50"
                          >
                            <option value="">{picked.zoneId ? 'City...' : 'Zone first'}</option>
                            {citiesFor(picked.zoneId).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3">
                          <Button
                            onClick={() => handleSave(lead)}
                            disabled={savingId === lead.id || !picked.zoneId || !picked.cityId}
                            className="h-9"
                          >
                            {savingId === lead.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                className="h-9"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                className="h-9"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
