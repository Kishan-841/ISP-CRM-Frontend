'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
  'dashboard': 'Dashboard',
  'pipeline-arc': 'Pipeline ARC Tracker',
  'bdm-queue': 'New Lead Assigned',
  'calling-queue': 'Self Calling Queue',
  'feasibility-team': 'Feasibility',
  'feasibility-queue': 'Feasibility',
  'docs-team': 'Documents',
  'docs-verification': 'Documents',
  'ops-approval': 'OPS Approval',
  'accounts-team': 'Accounts',
  'accounts-verification': 'Accounts Verification',
  'accounts-dashboard': 'Accounts Dashboard',
  'accounts-demo-plan': 'Demo Plans',
  'accounts-create-plan': 'Create Plan',
  'accounts-reports': 'Accounts Reports',
  'accounts-po-creation': 'PO Creation',
  'delivery-team': 'Delivery',
  'delivery-queue': 'Delivery Queue',
  'delivery-request-approval': 'Delivery Approval',
  'delivery-report': 'Delivery Report',
  'delivery-completed': 'Delivery Completed',
  'noc-team': 'NOC',
  'noc-queue': 'NOC Queue',
  'noc-users-created': 'NOC Users',
  'billing-mgmt': 'Billing',
  'store-inventory': 'Store',
  'store-requests': 'Store Requests',
  'employees': 'Employees',
  'admin-dashboards': 'Admin',
  'sam': 'SAM',
  'sam-head': 'SAM Head',
  'sam-executive': 'SAM Executive',
  'sam-data': 'SAM Data',
  'sam-calling-queue': 'SAM Calling',
  'campaigns': 'Campaigns',
  'ledger': 'Ledger',
  'vendors': 'Vendors',
  'products': 'Products',
  'product-management': 'Products',
  'notifications': 'Notifications',
  'reports': 'Reports',
  'call-history': 'Call History',
  'bdm-meetings': 'BDM Meetings',
  'bdm-follow-ups': 'BDM Follow-ups',
  'bdm-reports': 'BDM Reports',
  'follow-ups': 'Follow-ups',
  'retry-calls': 'Retry Calls',
  'self-leads': 'Self Leads',
  'leads': 'Leads',
  'data-management': 'Data Management',
  'quotation-mgmt': 'Quotations',
  'po-approval': 'PO Approval',
  'po-management': 'PO Management',
  'goods-receipt': 'Goods Receipt',
  'inventory': 'Inventory',
  'vendor-approval': 'Vendor Approval',
  'vendor-po-approval': 'Vendor PO Approval',
};

function formatSegmentLabel(segment) {
  return routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const label = formatSegmentLabel(segment);
    const isLast = index === segments.length - 1;

    return { path, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
