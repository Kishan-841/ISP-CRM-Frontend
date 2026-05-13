'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { canViewAuditLog } from '@/lib/useRoleCheck';
import AuditFilterBar from '@/components/audit/AuditFilterBar';
import AuditEventTable from '@/components/audit/AuditEventTable';
import AuditEventDrawer from '@/components/audit/AuditEventDrawer';
import { PageHeader } from '@/components/PageHeader';

export default function AuditLogPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [drawerId, setDrawerId] = useState(null);

  useEffect(() => {
    if (user && !canViewAuditLog(user)) router.push('/dashboard');
  }, [user, router]);

  if (!user || !canViewAuditLog(user)) return null;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Event Log" description="Who did what, when, from where." />
      <AuditFilterBar />
      <AuditEventTable onRowClick={r => setDrawerId(r.id)} />
      <AuditEventDrawer eventId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
