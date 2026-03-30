'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  User,
  Loader2,
  Network,
  CheckCircle,
  Clock,
  Wifi,
  BarChart3,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { PageHeader } from '@/components/PageHeader';
import TabBar from '@/components/TabBar';
import StatCard from '@/components/StatCard';

export default function NocTeamPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isNOCHead = user?.role === 'NOC_HEAD';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER';
  const canAccess = isNOCHead || isAdmin;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStats = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const res = await api.get('/leads/noc/team-stats');
      setStats(res.data);
    } catch {
      toast.error('Failed to load team stats');
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useSocketRefresh(() => { fetchStats(); });

  if (!canAccess) {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-500">Access denied.</p></div>;
  }

  const totalConfigured = stats?.nocUsers?.reduce((s, u) => s + u.stats.configured, 0) || 0;
  const totalInProgress = stats?.nocUsers?.reduce((s, u) => s + u.stats.pending + u.stats.customerCreated + u.stats.ipAssigned, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="NOC Team" description="Monitor NOC user workload and lead assignment status" />

      <TabBar
        tabs={[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'users', label: 'User Workload', icon: Users },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : !stats ? (
        <div className="text-center py-16 text-slate-500">
          <Network size={48} className="mx-auto mb-3 text-slate-300" />
          <p>No data available</p>
        </div>
      ) : (
        <>
          {/* ─── Overview Tab ─── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard label="Total Leads" value={stats.totalLeads} icon={Network} color="orange" />
                <StatCard label="Unassigned" value={stats.unassigned} icon={Clock} color="amber" />
                <StatCard label="In Progress" value={totalInProgress} icon={Wifi} color="blue" />
                <StatCard label="Completed" value={totalConfigured} icon={CheckCircle} color="green" />
                <StatCard label="NOC Users" value={stats.nocUsers?.length || 0} icon={Users} color="violet" />
              </div>

              {/* Quick user summary table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Team Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">NOC User</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wider">Pending</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wider">User Created</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wider">IP Assigned</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-500 uppercase tracking-wider">Configured</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {stats.nocUsers?.map((nocUser) => (
                        <tr key={nocUser.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <User size={14} className="text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{nocUser.name}</p>
                                <p className="text-[10px] text-slate-400">{nocUser.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{nocUser.stats.assigned}</td>
                          <td className="text-center px-3 py-3">
                            <span className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-semibold ${nocUser.stats.pending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                              {nocUser.stats.pending}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-semibold ${nocUser.stats.customerCreated > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                              {nocUser.stats.customerCreated}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-semibold ${nocUser.stats.ipAssigned > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                              {nocUser.stats.ipAssigned}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className={`inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-semibold ${nocUser.stats.configured > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                              {nocUser.stats.configured}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!stats.nocUsers || stats.nocUsers.length === 0) && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            <UserPlus size={24} className="mx-auto mb-2" />
                            No NOC users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── User Workload Tab ─── */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {stats.nocUsers?.map((nocUser) => (
                <div key={nocUser.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* User header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                        <User size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{nocUser.name}</p>
                        <p className="text-xs text-slate-400">{nocUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2.5">
                        {nocUser.stats.assigned} total
                      </Badge>
                      {nocUser.stats.configured > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs px-2.5">
                          {nocUser.stats.configured} done
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30">
                    {nocUser.stats.assigned > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                          <span>Progress</span>
                          <span>{nocUser.stats.assigned > 0 ? Math.round((nocUser.stats.configured / nocUser.stats.assigned) * 100) : 0}% complete</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          {nocUser.stats.configured > 0 && (
                            <div className="bg-emerald-500 h-full" style={{ width: `${(nocUser.stats.configured / nocUser.stats.assigned) * 100}%` }} />
                          )}
                          {nocUser.stats.ipAssigned > 0 && (
                            <div className="bg-violet-500 h-full" style={{ width: `${(nocUser.stats.ipAssigned / nocUser.stats.assigned) * 100}%` }} />
                          )}
                          {nocUser.stats.customerCreated > 0 && (
                            <div className="bg-blue-500 h-full" style={{ width: `${(nocUser.stats.customerCreated / nocUser.stats.assigned) * 100}%` }} />
                          )}
                          {nocUser.stats.pending > 0 && (
                            <div className="bg-amber-400 h-full" style={{ width: `${(nocUser.stats.pending / nocUser.stats.assigned) * 100}%` }} />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[10px]">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending ({nocUser.stats.pending})</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> User Created ({nocUser.stats.customerCreated})</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> IP Assigned ({nocUser.stats.ipAssigned})</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Configured ({nocUser.stats.configured})</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-2">No leads assigned</p>
                    )}
                  </div>
                </div>
              ))}

              {(!stats.nocUsers || stats.nocUsers.length === 0) && (
                <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Users size={40} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-medium">No NOC users found</p>
                  <p className="text-sm mt-1">Create NOC users from the Employees page</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
