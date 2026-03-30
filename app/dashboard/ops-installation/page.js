'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useUserStore } from '@/lib/store';
import api from '@/lib/api';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building2,
  User,
  Loader2,
  Truck,
  X,
  Search,
  Package,
  Wifi,
  Hash,
  MapPin,
  Eye,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatCurrency } from '@/lib/formatters';

export default function OpsInstallationPage() {
  const router = useRouter();
  const { user, isOpsTeam, isSuperAdmin } = useRoleCheck();
  const { pushToInstallation } = useLeadStore();
  const { fetchUsersByRole } = useUserStore();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Assignment modal state
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [selectedDeliveryUser, setSelectedDeliveryUser] = useState('');
  const [installationNotes, setInstallationNotes] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canAccess = isOpsTeam || isSuperAdmin;

  const fetchQueue = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const res = await api.get('/leads/ops-team/installation-queue', {
        params: { page, limit: 50, search }
      });
      setLeads(res.data.leads || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load installation queue');
    } finally {
      setLoading(false);
    }
  }, [canAccess, page, search]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useSocketRefresh(() => { fetchQueue(); });

  const handleOpenAssign = async (lead) => {
    setSelectedLead(lead);
    setSelectedDeliveryUser('');
    setInstallationNotes('');
    setShowAssignModal(true);
    setIsLoadingUsers(true);
    try {
      const result = await fetchUsersByRole('DELIVERY_TEAM');
      if (result.success) {
        setDeliveryUsers(result.users || []);
      } else {
        toast.error(result.error || 'Failed to fetch delivery users');
      }
    } catch {
      toast.error('Failed to load delivery users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedLead || !selectedDeliveryUser) {
      toast.error('Please select a delivery user');
      return;
    }
    setIsSaving(true);
    try {
      const result = await pushToInstallation(selectedLead.id, installationNotes, selectedDeliveryUser);
      if (result.success) {
        toast.success(result.message || 'Assigned to Delivery Team');
        setShowAssignModal(false);
        fetchQueue();
      } else {
        toast.error(result.error || 'Failed to assign');
      }
    } catch {
      toast.error('Failed to assign to delivery');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Dashboard</span> <ChevronRight size={12} /> <span>Installation Assignment</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-1 h-7 bg-orange-500 rounded-full" />
              Installation Assignment
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Assign approved leads to delivery team for installation</p>
          </div>
          <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-sm px-3 py-1">
            {total} Pending
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by company, name, email..."
          className="pl-9 h-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Package size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No leads pending installation assignment</p>
          <p className="text-sm mt-1">Leads will appear here after accounts approval</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Products</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BDM</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Building2 size={14} className="text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{lead.companyName || lead.campaignData?.company || '-'}</p>
                          <p className="text-[10px] text-slate-400">{lead.campaignData?.campaign?.name || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900 dark:text-slate-100">{lead.campaignData?.name || '-'}</p>
                      <p className="text-[10px] text-slate-400">{lead.campaignData?.email || lead.campaignData?.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {lead.productType && (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">{lead.productType}</Badge>
                        )}
                        {lead.bandwidthRequirement && (
                          <span className="text-[10px] text-orange-600 flex items-center gap-0.5"><Wifi size={10} />{lead.bandwidthRequirement}</span>
                        )}
                        {lead.numberOfIPs && (
                          <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Hash size={10} />{lead.numberOfIPs} IPs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{lead.arcAmount ? formatCurrency(lead.arcAmount) : '-'}</p>
                      <p className="text-[10px] text-slate-400">ARC</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{lead.assignedTo?.name || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenAssign(lead)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8 px-3"
                      >
                        <Truck size={14} className="mr-1" /> Assign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">{total} leads total</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 text-xs">
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-slate-500">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 text-xs">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assign to Delivery</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedLead.companyName}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Lead summary */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle size={16} />
                  <span className="font-medium">All approvals complete - Ready for installation</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">ARC Amount</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedLead.arcAmount ? formatCurrency(selectedLead.arcAmount) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">BDM</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedLead.assignedTo?.name || '-'}</p>
                </div>
              </div>

              {/* Delivery user selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Team Member *
                </label>
                {isLoadingUsers ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </div>
                ) : (
                  <select
                    value={selectedDeliveryUser}
                    onChange={(e) => setSelectedDeliveryUser(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select delivery user</option>
                    {(Array.isArray(deliveryUsers) ? deliveryUsers : []).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Installation Notes (Optional)
                </label>
                <textarea
                  value={installationNotes}
                  onChange={(e) => setInstallationNotes(e.target.value)}
                  placeholder="Any special instructions for delivery team..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleAssign}
                disabled={!selectedDeliveryUser || isSaving}
              >
                {isSaving ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Truck size={16} className="mr-1" />}
                Assign to Delivery
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
