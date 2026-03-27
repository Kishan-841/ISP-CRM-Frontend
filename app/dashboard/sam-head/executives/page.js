'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { UserPlus, Users, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export default function SAMExecutivesManagement() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [executives, setExecutives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchExecutives = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/sam/executives?includeInactive=${showInactive}`);
      setExecutives(res.data.executives || []);
    } catch {
      toast.error('Failed to load executives');
    } finally {
      setIsLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    if (user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER') {
      fetchExecutives();
    }
  }, [user, fetchExecutives]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setIsCreating(true);
    try {
      const res = await api.post('/sam/executives', form);
      toast.success(res.data.message);
      setShowCreateModal(false);
      setForm({ name: '', email: '', password: '' });
      fetchExecutives();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create executive.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (exec) => {
    setTogglingId(exec.id);
    try {
      const res = await api.patch(`/sam/executives/${exec.id}/toggle-status`);
      toast.success(res.data.message);
      fetchExecutives();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  if (!user || (user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER')) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="SAM Executives" description="Create and manage SAM executive accounts">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowInactive(!showInactive); }}
          className="text-xs"
        >
          {showInactive ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </Button>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Add Executive
        </Button>
      </PageHeader>

      {/* Executives List */}
      <Card className="bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Executives ({executives.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : executives.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No executives found</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Email</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Customers</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Meetings</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executives.map((exec) => (
                      <tr key={exec.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{exec.name}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{exec.email}</td>
                        <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{exec._count?.samAssignmentsAsExecutive || 0}</td>
                        <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{exec._count?.samMeetings || 0}</td>
                        <td className="py-3 px-4 text-center">
                          {exec.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(exec)}
                            disabled={togglingId === exec.id}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              exec.isActive
                                ? 'text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40'
                            }`}
                          >
                            {togglingId === exec.id ? '...' : exec.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {executives.map((exec) => (
                  <div key={exec.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{exec.name}</p>
                        <p className="text-xs text-slate-500">{exec.email}</p>
                      </div>
                      {exec.isActive ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>{exec._count?.samAssignmentsAsExecutive || 0} customers</span>
                        <span>{exec._count?.samMeetings || 0} meetings</span>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(exec)}
                        disabled={togglingId === exec.id}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                          exec.isActive
                            ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                            : 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20'
                        }`}
                      >
                        {togglingId === exec.id ? '...' : exec.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add SAM Executive</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1" disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
