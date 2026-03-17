'use client';

import { useEffect } from 'react';
import { useCustomerProfileStore, useCustomerPlanStore, useCustomerBillingStore } from '@/lib/customerStore';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  CalendarDays,
  Wifi,
  Shield,
  CircleDot,
  BadgeCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

function InfoRow({ icon: Icon, label, value, accent = 'slate' }) {
  const iconColors = {
    slate: 'text-slate-400 dark:text-slate-500',
    blue: 'text-blue-500 dark:text-blue-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
    orange: 'text-orange-500 dark:text-orange-400',
    amber: 'text-amber-500 dark:text-amber-400',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className={`mt-0.5 ${iconColors[accent]}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5 break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, gradient, children }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`${gradient} px-5 sm:px-6 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{subtitle}</p>
            <h3 className="text-base font-bold text-white mt-0.5">{title}</h3>
          </div>
        </div>
      </div>
      <div className="px-5 sm:px-6 py-4">
        {children}
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomerDetailsPage() {
  const { profile, loading: profileLoading, fetchProfile } = useCustomerProfileStore();
  const { plan, loading: planLoading, fetchPlan } = useCustomerPlanStore();
  const { summary, fetchBillingSummary } = useCustomerBillingStore();

  useEffect(() => {
    fetchProfile();
    fetchPlan();
    fetchBillingSummary();
  }, [fetchProfile, fetchPlan, fetchBillingSummary]);

  const loading = profileLoading || planLoading;

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">My Details</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your account and contact information</p>
        </div>
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Title */}
      <PageHeader title="My Details" description="Your account and contact information" />

      {/* Account Info */}
      <SectionCard
        icon={Shield}
        title={profile?.customerUsername || profile?.customerUserId || '-'}
        subtitle="Account"
        gradient="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow icon={BadgeCheck} label="Customer ID" value={profile?.customerUserId} accent="blue" />
          <InfoRow icon={User} label="Username" value={profile?.customerUsername} accent="blue" />
          <InfoRow icon={CalendarDays} label="Account Created" value={formatDate(profile?.customerCreatedAt)} accent="blue" />
          <InfoRow
            icon={CircleDot}
            label="Account Status"
            value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                profile?.planActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${profile?.planActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {profile?.planActive ? 'Active' : 'Inactive'}
              </span>
            }
            accent="emerald"
          />
        </div>
      </SectionCard>

      {/* Contact Information */}
      <SectionCard
        icon={User}
        title={profile?.name || profile?.company || '-'}
        subtitle="Contact Details"
        gradient="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow icon={User} label="Contact Name" value={profile?.name} accent="emerald" />
          <InfoRow icon={Building2} label="Company" value={profile?.company} accent="emerald" />
          <InfoRow icon={Phone} label="Phone" value={profile?.phone} accent="emerald" />
          <InfoRow icon={Mail} label="Email" value={profile?.email} accent="emerald" />
          <InfoRow icon={FileText} label="GST Number" value={profile?.customerGstNo} accent="emerald" />
          <InfoRow icon={Globe} label="IP Address" value={profile?.customerIpAssigned} accent="emerald" />
        </div>
      </SectionCard>

      {/* Address Information */}
      <SectionCard
        icon={MapPin}
        title="Addresses"
        subtitle="Service Locations"
        gradient="bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800"
      >
        <div className="space-y-0">
          <InfoRow icon={MapPin} label="Billing Address" value={profile?.billingAddress || [profile?.address, profile?.city, profile?.state].filter(Boolean).join(', ')} accent="orange" />
          <InfoRow icon={MapPin} label="Installation Address" value={profile?.installationAddress} accent="orange" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow icon={Building2} label="City" value={profile?.city} accent="orange" />
            <InfoRow icon={Globe} label="State" value={profile?.state} accent="orange" />
          </div>
        </div>
      </SectionCard>

      {/* Quick Plan & Billing Summary */}
      <SectionCard
        icon={Wifi}
        title={plan?.name || 'No Plan'}
        subtitle="Plan & Billing"
        gradient="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow icon={Wifi} label="Current Plan" value={plan?.name || profile?.planName} accent="amber" />
          <InfoRow
            icon={CircleDot}
            label="Billing Cycle"
            value={plan?.billingCycle || plan?.billingType || '-'}
            accent="amber"
          />
          <InfoRow icon={CalendarDays} label="Plan Start" value={formatDate(plan?.startDate)} accent="amber" />
          <InfoRow icon={CalendarDays} label="Plan End" value={formatDate(plan?.endDate)} accent="amber" />
        </div>
        {summary?.nextInvoice && (
          <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Next Invoice Due</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{summary.nextInvoice.invoiceNumber}</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary.nextInvoice.remainingAmount || summary.nextInvoice.grandTotal)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Due: {formatDate(summary.nextInvoice.dueDate)}</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
