'use client';

/**
 * Zone & city settings (admin).
 *
 * Reference data that leads point at, so deletes are soft — a zone retired
 * today is still the right answer for every lead already holding it. Retired
 * rows stay visible, struck through, with a Restore action, because "add it
 * again" is the usual intent and a silent duplicate would be worse.
 *
 * Laid out as one indented list rather than a card per zone. The branching is
 * uneven — Pune has six cities, most zones have one — and that unevenness is
 * worth seeing: it is the shape of where the business actually operates. A
 * grid of equal-sized boxes flattens it and leaves ragged whitespace.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { Globe, Plus, Trash2, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ZoneSettingsPage() {
  const router = useRouter();
  const { user, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const canAccess = isAdmin || isMaster;

  const {
    zones,
    fetchZones,
    createZone,
    updateZone,
    deleteZone,
    createCity,
    updateCity,
    deleteCity,
  } = useLeadStore();

  const [newZone, setNewZone] = useState('');
  // Which zone has its "add a city" field open. One at a time — the field is
  // for a rare action and twelve permanent inputs were most of the old noise.
  const [addingFor, setAddingFor] = useState(null);
  const [cityDraft, setCityDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const cityInputRef = useRef(null);

  useEffect(() => {
    if (user && !canAccess) router.push('/dashboard');
  }, [user, canAccess, router]);

  const reload = useCallback(() => fetchZones(true), [fetchZones]);

  useEffect(() => {
    if (canAccess) reload();
  }, [canAccess, reload]);

  useEffect(() => {
    if (addingFor) cityInputRef.current?.focus();
  }, [addingFor]);

  const run = async (fn, fallback) => {
    setBusy(true);
    const result = await fn();
    if (result.success) {
      toast.success(result.message || fallback);
      await reload();
    } else {
      toast.error(result.error);
    }
    setBusy(false);
    return result.success;
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    const name = newZone.trim();
    if (!name) return;
    if (await run(() => createZone(name), 'Zone added')) setNewZone('');
  };

  const handleAddCity = async (zoneId) => {
    const name = cityDraft.trim();
    if (!name) return;
    if (await run(() => createCity(zoneId, name), 'City added')) {
      setCityDraft('');
      // Stay open — adding several cities in a row is the common case.
      cityInputRef.current?.focus();
    }
  };

  const openAdd = (zoneId) => {
    setAddingFor(zoneId);
    setCityDraft('');
  };

  const closeAdd = () => {
    setAddingFor(null);
    setCityDraft('');
  };

  if (!canAccess) return null;

  const activeZones = zones.filter((z) => z.isActive);
  const activeCities = activeZones.reduce(
    (n, z) => n + z.cities.filter((c) => c.isActive).length,
    0
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Zone & City Settings"
        description="The service geography the feasibility team picks from. Retiring a row hides it from new selections and leaves existing leads untouched."
        icon={Globe}
      />

      <div className="max-w-3xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeZones.length} zones, {activeCities} cities
          </p>
          <form onSubmit={handleAddZone} className="flex gap-2">
            <input
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="New zone"
              className="h-9 px-3 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Button type="submit" disabled={busy || !newZone.trim()} className="h-9">
              Add zone
            </Button>
          </form>
        </div>

        {zones.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No zones yet. Add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {zones.map((zone) => {
              const cities = zone.cities;
              const liveCities = cities.filter((c) => c.isActive).length;
              return (
                <li key={zone.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-medium ${
                        zone.isActive
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-400 dark:text-slate-500 line-through'
                      }`}
                    >
                      {zone.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {zone.isActive
                        ? `${liveCities} ${liveCities === 1 ? 'city' : 'cities'}`
                        : 'retired'}
                      {zone.leadCount > 0 &&
                        `, ${zone.leadCount} lead${zone.leadCount === 1 ? '' : 's'}`}
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                      {zone.isActive && (
                        <button
                          onClick={() => (addingFor === zone.id ? closeAdd() : openAdd(zone.id))}
                          disabled={busy}
                          className="h-7 px-2 inline-flex items-center gap-1 rounded text-xs text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          City
                        </button>
                      )}
                      {zone.isActive ? (
                        <button
                          onClick={() => run(() => deleteZone(zone.id), 'Zone retired')}
                          disabled={busy}
                          aria-label={`Retire ${zone.name}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            run(() => updateZone(zone.id, { isActive: true }), 'Zone restored')
                          }
                          disabled={busy}
                          aria-label={`Restore ${zone.name}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* The rule is the hierarchy: these cities belong to that zone. */}
                  {(cities.length > 0 || addingFor === zone.id) && (
                    <ul className="mt-1.5 ml-1 border-l border-slate-200 dark:border-slate-700">
                      {cities.map((city) => (
                        <li
                          key={city.id}
                          className="group flex items-center gap-2 pl-4 py-1 text-sm"
                        >
                          <span
                            className={
                              city.isActive
                                ? 'text-slate-600 dark:text-slate-300'
                                : 'text-slate-400 dark:text-slate-500 line-through'
                            }
                          >
                            {city.name}
                          </span>
                          {city.isActive ? (
                            <button
                              onClick={() => run(() => deleteCity(city.id), 'City retired')}
                              disabled={busy}
                              aria-label={`Retire ${city.name}`}
                              className="ml-auto h-6 w-6 inline-flex items-center justify-center rounded text-slate-300 dark:text-slate-600 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                run(() => updateCity(city.id, { isActive: true }), 'City restored')
                              }
                              disabled={busy}
                              aria-label={`Restore ${city.name}`}
                              className="ml-auto h-6 w-6 inline-flex items-center justify-center rounded text-slate-300 dark:text-slate-600 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}

                      {addingFor === zone.id && (
                        <li className="flex items-center gap-2 pl-4 py-1">
                          <input
                            ref={cityInputRef}
                            value={cityDraft}
                            onChange={(e) => setCityDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCity(zone.id);
                              }
                              if (e.key === 'Escape') closeAdd();
                            }}
                            placeholder={`City in ${zone.name}`}
                            className="h-8 px-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            disabled={busy || !cityDraft.trim()}
                            onClick={() => handleAddCity(zone.id)}
                          >
                            Add
                          </Button>
                          <button
                            onClick={closeAdd}
                            aria-label="Cancel"
                            className="h-8 w-8 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      )}
                    </ul>
                  )}

                  {cities.length === 0 && addingFor !== zone.id && zone.isActive && (
                    <p className="mt-1 ml-5 text-sm text-slate-400 dark:text-slate-500">
                      No cities yet. Add the first one.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
