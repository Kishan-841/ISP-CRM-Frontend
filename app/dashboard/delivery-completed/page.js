'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useSidebarStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import {
  CheckCircle2,
  Building2,
  Truck,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  IndianRupee,
  Wifi,
  Hash,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';

export default function DeliveryCompletedPage() {
  const router = useRouter();
  const { user, isBDM, isBDMTeamLeader } = useRoleCheck();
  const canAccessBDM = isBDM || isBDMTeamLeader;
  const {
    deliveryCompletedLeads,
    fetchBDMDeliveryCompleted,
    isLoading
  } = useLeadStore();
  const { fetchSidebarCounts } = useSidebarStore();

  // Redirect users who are not BDM
  useEffect(() => {
    if (user && !canAccessBDM) {
      router.push('/dashboard');
    }
  }, [user, canAccessBDM, router]);

  // Fetch data and refresh sidebar counts (marks leads as viewed, clears badge)
  useEffect(() => {
    if (canAccessBDM) {
      fetchBDMDeliveryCompleted().then(() => {
        // Refresh sidebar counts after viewing (leads are marked as viewed by the API)
        fetchSidebarCounts();
      });
    }
  }, [canAccessBDM, fetchBDMDeliveryCompleted, fetchSidebarCounts]);

  // Auto-refresh when socket events arrive
  useSocketRefresh(fetchBDMDeliveryCompleted, { enabled: canAccessBDM });

  if (!canAccessBDM) {
    return null;
  }

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (lead) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company || 'N/A'}</p>
            {lead.city && (
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin size={12} />
                {lead.city}{lead.state ? `, ${lead.state}` : ''}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (lead) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <User size={14} className="text-slate-400" />
            {lead.name || 'N/A'}
          </p>
          {lead.phone && (
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Phone size={12} />
              {lead.phone}
            </p>
          )}
          {lead.email && (
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
              <Mail size={12} />
              {lead.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'products',
      label: 'Products',
      render: (lead) => (
        <div>
          <div className="flex flex-wrap gap-1">
            {lead.products && lead.products.length > 0 ? (
              lead.products.map((product) => (
                <Badge
                  key={product.id}
                  className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0 text-xs"
                >
                  {product.title}
                </Badge>
              ))
            ) : (
              <span className="text-slate-400 text-sm">-</span>
            )}
          </div>
          {(lead.bandwidthRequirement || lead.numberOfIPs) && (
            <div className="flex items-center gap-2 mt-1">
              {lead.bandwidthRequirement && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
                  <Wifi size={10} />
                  {lead.bandwidthRequirement}
                </span>
              )}
              {lead.numberOfIPs && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs">
                  <Hash size={10} />
                  {lead.numberOfIPs} IPs
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (lead) => (
        <div className="space-y-1">
          {lead.arcAmount && (
            <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <IndianRupee size={12} className="text-slate-400" />
              <span className="font-medium">{Number(lead.arcAmount).toLocaleString()}</span>
              <span className="text-slate-400 text-xs">/yr</span>
            </p>
          )}
          {lead.otcAmount && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              OTC: ₹{Number(lead.otcAmount).toLocaleString()}
            </p>
          )}
          {!lead.arcAmount && !lead.otcAmount && (
            <span className="text-slate-400 text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'deliveredBy',
      label: 'Delivered By',
      render: (lead) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {lead.deliveryAssignedTo?.name || 'N/A'}
          </p>
          {lead.deliveryAssignedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(lead.deliveryAssignedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0">
          <CheckCircle2 size={14} className="mr-1" />
          Completed
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Delivery Completed" description="Leads that have completed the delivery process" />

      {/* Stats */}
      {(() => {
        const leads = deliveryCompletedLeads || [];
        const totalARC = leads.reduce((sum, l) => sum + (Number(l.arcAmount) || 0), 0);
        const totalOTC = leads.reduce((sum, l) => sum + (Number(l.otcAmount) || 0), 0);
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard color="emerald" icon={CheckCircle2} label="Total Deliveries" value={leads.length} />
          </div>
        );
      })()}

      {/* Leads Table */}
      <DataTable
        title="Completed Deliveries"
        totalCount={deliveryCompletedLeads?.length || 0}
        columns={columns}
        data={deliveryCompletedLeads || []}
        searchable={true}
        searchPlaceholder="Search deliveries..."
        searchKeys={['company', 'name', 'phone', 'email', 'deliveryAssignedTo.name']}
        pagination={true}
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage="No completed deliveries yet"
        emptyIcon={Truck}
        emptyFilteredMessage="No deliveries match your search"
      />
    </div>
  );
}
