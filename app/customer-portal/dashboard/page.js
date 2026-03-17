'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCustomerAuthStore,
  useCustomerProfileStore,
  useCustomerPlanStore,
  useCustomerBillingStore,
  useCustomerComplaintStore,
} from '@/lib/customerStore';
import { Button } from '@/components/ui/button';
import {
  User,
  Wifi,
  IndianRupee,
  CalendarClock,
  FileText,
  MessageSquare,
  ArrowRight,
  Download,
  Upload,
  Activity,
  Plus,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CUSTOMER_PORTAL_STATUS_CONFIG, getStatusBadgeClass, getStatusLabel } from '@/lib/statusConfig';

const statusBadge = (status) => {
  const cls = getStatusBadgeClass(status, CUSTOMER_PORTAL_STATUS_CONFIG, 'bg-slate-100 text-slate-600');
  const label = getStatusLabel(status, CUSTOMER_PORTAL_STATUS_CONFIG);
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>;
};

function StatCard({ icon: Icon, label, value, sub, gradient, onClick }) {
  return (
    <div onClick={onClick} className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5 truncate">{value}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
      <div className="animate-pulse">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-28 mb-2" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3.5 animate-pulse">
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-48" />
      </div>
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
    </div>
  );
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { customer } = useCustomerAuthStore();
  const { profile, loading: profileLoading, fetchProfile } = useCustomerProfileStore();
  const { plan, loading: planLoading, fetchPlan } = useCustomerPlanStore();
  const { summary, invoices, loading: billingLoading, fetchBillingSummary, fetchInvoices } = useCustomerBillingStore();
  const { requests, loading: complaintsLoading, fetchComplaints } = useCustomerComplaintStore();

  useEffect(() => {
    fetchProfile();
    fetchPlan();
    fetchBillingSummary();
    fetchInvoices(1, 5);
    fetchComplaints(1, 5);
  }, [fetchProfile, fetchPlan, fetchBillingSummary, fetchInvoices, fetchComplaints]);

  const isLoading = profileLoading || planLoading;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Welcome{customer?.company ? `, ${customer.company}` : ''}
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">Here&apos;s an overview of your account</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              icon={User}
              label="Customer ID"
              value={customer?.customerUserId || '-'}
              sub={customer?.customerUsername}
              gradient="from-blue-600 to-blue-700"
            />
            {(() => {
              let poEnd = null;
              if (plan?.startDate) {
                const d = new Date(plan.startDate);
                d.setMonth(d.getMonth() + 12);
                poEnd = d;
              }
              return (
                <StatCard
                  icon={CalendarClock}
                  label="PO Duration"
                  value={plan?.startDate ? '12 Months' : '-'}
                  sub={plan?.startDate ? `${formatDate(plan.startDate)} – ${formatDate(poEnd)}` : 'No active plan'}
                  gradient="from-emerald-600 to-emerald-700"
                />
              );
            })()}
            <StatCard
              icon={IndianRupee}
              label="Outstanding"
              value={formatCurrency(summary?.outstandingBalance || 0)}
              sub={summary?.overdueCount > 0 ? `${summary.overdueCount} overdue` : 'No overdue invoices'}
              gradient={summary?.outstandingBalance > 0 ? 'from-red-600 to-red-700' : 'from-emerald-600 to-emerald-700'}
              onClick={() => router.push('/customer-portal/invoices')}
            />
          </>
        )}
      </div>

      {/* Current Plan Hero */}
      {plan?.name && (
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-5 sm:px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Wifi size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-blue-100 text-[11px] font-semibold uppercase tracking-wider">Current Plan</p>
                  <h2 className="text-base sm:text-lg font-bold text-white">{plan.name}</h2>
                </div>
              </div>
              <Link href="/customer-portal/plan">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors backdrop-blur border border-white/20">
                  View Details <ArrowRight size={13} />
                </button>
              </Link>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-2xl px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Download</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.bandwidth ? `${plan.bandwidth} Mbps` : '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Upload size={14} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Upload</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.uploadBandwidth ? `${plan.uploadBandwidth} Mbps` : '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Activity size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Cycle</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.billingCycle || plan.billingType || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <IndianRupee size={14} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Price</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Clock size={14} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Valid Until</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(plan.endDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices & Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Recent Invoices */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              Recent Invoices
            </h3>
            <Link href="/customer-portal/invoices">
              <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight size={12} />
              </button>
            </Link>
          </div>
          <div className="px-5">
            {billingLoading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-10 text-center">
                <FileText size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3.5 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(inv.invoiceDate)} &middot; {formatCurrency(inv.grandTotal)}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {statusBadge(inv.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
              My Complaints
            </h3>
            <div className="flex items-center gap-2">
              <Link href="/customer-portal/complaints/new">
                <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Plus size={12} /> New
                </button>
              </Link>
              <Link href="/customer-portal/complaints">
                <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1">
                  View All <ArrowRight size={12} />
                </button>
              </Link>
            </div>
          </div>
          <div className="px-5">
            {complaintsLoading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : requests.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquare size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No complaints submitted</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-3.5 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{req.number || req.requestNumber}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {req.category?.name}{req.subCategory?.name ? ` · ${req.subCategory.name}` : ''}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {statusBadge(req.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
