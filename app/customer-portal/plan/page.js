'use client';

import { useEffect } from 'react';
import { useCustomerPlanStore } from '@/lib/customerStore';
import {
  Wifi,
  Download,
  Upload,
  Database,
  IndianRupee,
  CalendarDays,
  CalendarClock,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  Zap,
  ArrowRight,
  History,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

function StatTile({ icon: Icon, label, value, accent = 'blue' }) {
  const accents = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-900/40 text-orange-600 dark:text-orange-400',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400',
  };
  const iconBg = {
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40',
    orange: 'bg-orange-100 dark:bg-orange-900/40',
    amber: 'bg-amber-100 dark:bg-amber-900/40',
    red: 'bg-red-100 dark:bg-red-900/40',
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]} transition-all hover:shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[accent]}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value || '-'}</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
      <div className="animate-pulse space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CustomerPlanPage() {
  const { plan, demoPlan, upgradeHistory, loading, fetchPlan } = useCustomerPlanStore();

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Plan Details</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your current plan and history</p>
        </div>
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <PageHeader title="Plan Details" description="Your current plan and history" />

      {/* Current Plan */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Plan Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-5 sm:px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Wifi size={22} className="text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Current Plan</p>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  {plan?.name || 'No Plan Assigned'}
                </h2>
              </div>
            </div>
            {plan?.name && (
              plan?.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-400/30 backdrop-blur">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-100 border border-amber-400/30 backdrop-blur">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Inactive
                </span>
              )
            )}
          </div>
        </div>

        {/* Plan Details Grid */}
        {plan?.name ? (
          <div className="p-4 sm:p-6">
            {/* Speed & Data Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <StatTile icon={Download} label="Download" value={plan.bandwidth ? `${plan.bandwidth} Mbps` : '-'} accent="emerald" />
              <StatTile icon={Upload} label="Upload" value={plan.uploadBandwidth ? `${plan.uploadBandwidth} Mbps` : '-'} accent="orange" />
              <StatTile icon={Database} label="Data Limit" value={plan.dataLimit ? `${plan.dataLimit} GB` : 'Unlimited'} accent="amber" />
            </div>

            {/* Billing & Dates Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatTile icon={IndianRupee} label="Plan Price" value={formatCurrency(plan.price)} accent="emerald" />
              <StatTile icon={IndianRupee} label="ARC Amount" value={formatCurrency(plan.arcAmount)} accent="blue" />
              <StatTile icon={Activity} label="Billing Cycle" value={plan.billingCycle || plan.billingType || '-'} accent="orange" />
            </div>

            {/* Date bar */}
            <div className="mt-4 flex items-center gap-3 flex-wrap rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={15} className="text-blue-500" />
                <span className="text-slate-500 dark:text-slate-400">Start:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(plan.startDate)}</span>
              </div>
              <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock size={15} className="text-red-500" />
                <span className="text-slate-500 dark:text-slate-400">End:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(plan.endDate)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <Wifi size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No active plan assigned</p>
          </div>
        )}
      </div>

      {/* Demo Plan */}
      {demoPlan && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 px-5 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Demo Plan</p>
                  <h3 className="text-base font-bold text-white mt-0.5">{demoPlan.name}</h3>
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/20 backdrop-blur">
                Trial
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile icon={Download} label="Download" value={`${demoPlan.bandwidth} Mbps`} accent="emerald" />
              <StatTile icon={Upload} label="Upload" value={`${demoPlan.uploadBandwidth || '-'} Mbps`} accent="orange" />
              <StatTile icon={CalendarDays} label="Start" value={formatDate(demoPlan.startDate)} accent="blue" />
              <StatTile icon={CalendarClock} label="End" value={formatDate(demoPlan.endDate)} accent="red" />
            </div>
          </div>
        </div>
      )}

      {/* Plan Change History */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <History size={18} className="text-blue-600 dark:text-blue-400" />
            Plan Change History
          </h3>
        </div>
        <div>
          {upgradeHistory.length === 0 ? (
            <div className="py-12 text-center">
              <History size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No plan changes recorded</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Previous Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Plan</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Old ARC</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New ARC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradeHistory.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{formatDate(item.upgradeDate)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.actionType === 'UPGRADE' && item.previousArc !== item.newArc
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : item.actionType === 'UPGRADE' && item.previousArc === item.newArc
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {item.actionType === 'UPGRADE' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                            {item.actionType === 'UPGRADE' && item.previousArc === item.newArc ? 'RATE REVISION' : item.actionType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.previousPlanName}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{item.newPlanName}</td>
                        <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.previousArc)}</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-semibold">{formatCurrency(item.newArc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {upgradeHistory.map((item, i) => (
                  <div key={i} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(item.upgradeDate)}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        item.actionType === 'UPGRADE' && item.previousArc !== item.newArc
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : item.actionType === 'UPGRADE' && item.previousArc === item.newArc
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {item.actionType === 'UPGRADE' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                        {item.actionType === 'UPGRADE' && item.previousArc === item.newArc ? 'RATE REVISION' : item.actionType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 dark:text-slate-400 truncate">{item.previousPlanName}</span>
                      <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{item.newPlanName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase">Old ARC</span>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(item.previousArc)}</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 uppercase">New ARC</span>
                        <p className="text-slate-900 dark:text-white font-bold">{formatCurrency(item.newArc)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
