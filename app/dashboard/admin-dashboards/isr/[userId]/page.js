'use client';

// Per-ISR drill-in. Kept as a redirect to keep the URL shape (the sidebar
// and other surfaces link to /admin-dashboards/isr/<id>) but the actual
// rendering happens on the overall dashboard, scoped via ?userId=<id>.
// One layout, two URLs.

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function IndividualISRDashboardRedirect() {
  const router = useRouter();
  const { userId } = useParams();

  useEffect(() => {
    if (!userId) return;
    router.replace(`/dashboard/admin-dashboards/isr?userId=${userId}`);
  }, [userId, router]);

  return null;
}
