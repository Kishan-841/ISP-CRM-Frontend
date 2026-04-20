'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';

const MASTER_ROLES = new Set(['MASTER', 'SUPER_ADMIN']);

export default function DeletionHistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !MASTER_ROLES.has(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/leads/deletion-audit?page=${page}&limit=20`);
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (MASTER_ROLES.has(user?.role)) load(1);
  }, [user, load]);

  if (!user || !MASTER_ROLES.has(user.role)) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/master/delete-lead">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
      </div>
      <PageHeader
        title="Lead Deletion History"
        description="Permanent audit of every lead deleted from the system. These records are never removed."
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {pagination.total} {pagination.total === 1 ? 'lead has been' : 'leads have been'} deleted so far.
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No deletion audits yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-muted-foreground dark:bg-slate-800/50">
                <tr>
                  <th className="text-left py-2.5 px-4 font-semibold">Deleted</th>
                  <th className="text-left py-2.5 px-4 font-semibold">Lead</th>
                  <th className="text-left py-2.5 px-4 font-semibold">Deleted By</th>
                  <th className="text-left py-2.5 px-4 font-semibold">Reason</th>
                  <th className="text-left py-2.5 px-4 font-semibold">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((a) => (
                  <tr key={a.id} className="align-top">
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(a.deletedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{a.companyName || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.contactName || '—'}{a.phone ? ` · ${a.phone}` : ''}
                      </div>
                      {a.leadNumber && (
                        <Badge variant="outline" className="mt-1 text-[10px]">{a.leadNumber}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{a.deletedBy?.name || '—'}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {a.deletedBy?.role}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-sm">
                      {a.reason}
                    </td>
                    <td className="py-3 px-4">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">View counts</summary>
                        <pre className="mt-1 max-w-xs whitespace-pre-wrap break-all text-[10px] leading-tight">
                          {JSON.stringify(a.snapshot?.counts || {}, null, 2)}
                        </pre>
                        {a.alsoDeletedCampaignData && (
                          <div className="mt-1 italic">(campaign data also removed)</div>
                        )}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => load(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
