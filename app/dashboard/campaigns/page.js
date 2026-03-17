'use client';

import { PageHeader } from '@/components/PageHeader';

export default function CampaignsPage() {
  return (
    <>
      <PageHeader title="Campaigns" description="Manage your marketing campaigns" />

      <div className="card">
        <div className="empty-state">
          <h3>Coming Soon</h3>
          <p>Campaign management will be available in the next update.</p>
        </div>
      </div>
    </>
  );
}
