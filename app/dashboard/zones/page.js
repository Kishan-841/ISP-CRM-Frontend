'use client';

/**
 * Zone & city settings (admin).
 *
 * Reference data that leads point at, so deletes are soft — a zone retired
 * today is still the right answer for every lead already holding it. Retired
 * rows stay visible, greyed, with a Restore button, because "add it again"
 * is the usual intent and a silent duplicate would be worse.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Globe, Plus, Trash2, RotateCcw } from 'lucide-react';
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
  // Per-zone "add city" inputs, keyed by zone id.
  const [newCity, setNewCity] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !canAccess) router.push('/dashboard');
  }, [user, canAccess, router]);

  const reload = useCallback(() => fetchZones(true), [fetchZones]);

  useEffect(() => {
    if (canAccess) reload();
  }, [canAccess, reload]);

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
    const name = (newCity[zoneId] || '').trim();
    if (!name) return;
    if (await run(() => createCity(zoneId, name), 'City added')) {
      setNewCity((prev) => ({ ...prev, [zoneId]: '' }));
    }
  };

  if (!canAccess) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Zone & City Settings"
        description="The service geography the feasibility team picks from. Retiring a row hides it from new selections but leaves existing leads untouched."
        icon={Globe}
      />

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleAddZone} className="flex gap-2">
            <input
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="New zone name, e.g. Nashik"
              className="h-10 px-3 flex-1 max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
            />
            <Button type="submit" disabled={busy || !newZone.trim()} className="h-10">
              <Plus className="h-4 w-4 mr-1" />
              Add zone
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {zones.map((zone) => (
          <Card key={zone.id} className={zone.isActive ? '' : 'opacity-60'}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {zone.name}
                    {!zone.isActive && (
                      <span className="ml-2 text-xs font-normal text-slate-500">retired</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {zone.cities.length} cit{zone.cities.length === 1 ? 'y' : 'ies'}
                    {zone.leadCount > 0 && ` · ${zone.leadCount} lead${zone.leadCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                {zone.isActive ? (
                  <Button
                    variant="outline"
                    className="h-8 px-2"
                    disabled={busy}
                    onClick={() => run(() => deleteZone(zone.id), 'Zone retired')}
                    title="Retire this zone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-8 px-2"
                    disabled={busy}
                    onClick={() => run(() => updateZone(zone.id, { isActive: true }), 'Zone restored')}
                    title="Restore this zone"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <ul className="space-y-1">
                {zone.cities.map((city) => (
                  <li
                    key={city.id}
                    className={`flex items-center justify-between text-sm py-1 px-2 rounded bg-slate-50 dark:bg-slate-800/60 ${
                      city.isActive ? '' : 'opacity-60'
                    }`}
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {city.name}
                      {!city.isActive && (
                        <span className="ml-2 text-xs text-slate-500">retired</span>
                      )}
                    </span>
                    {city.isActive ? (
                      <button
                        className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => run(() => deleteCity(city.id), 'City retired')}
                        title="Retire this city"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        className="text-slate-400 hover:text-green-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => run(() => updateCity(city.id, { isActive: true }), 'City restored')}
                        title="Restore this city"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
                {zone.cities.length === 0 && (
                  <li className="text-sm text-slate-400 py-1">No cities yet.</li>
                )}
              </ul>

              <div className="flex gap-2">
                <input
                  value={newCity[zone.id] || ''}
                  onChange={(e) => setNewCity((prev) => ({ ...prev, [zone.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCity(zone.id);
                    }
                  }}
                  placeholder="Add a city"
                  className="h-9 px-3 flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={busy || !(newCity[zone.id] || '').trim()}
                  onClick={() => handleAddCity(zone.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {zones.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            No zones yet. Add the first one above.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
