'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  User,
  MapPin,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  DollarSign,
  Wifi,
  Network,
  Hash,
  Eye,
  AlertCircle
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function SuperAdmin2ApprovalPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Detail modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Disposition
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useModal(showDetailModal, () => setShowDetailModal(false));
  useModal(showDispositionModal, () => !isSaving && setShowDispositionModal(false));

  const isSA2 = user?.role === 'SUPER_ADMIN_2';
  const isAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (user && !isSA2 && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isSA2, isAdmin, router]);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      const response = await api.get(`/leads/super-admin2/queue?${params}`);
      setLeads(response.data.leads);
      setStats(response.data.stats);
      setTotal(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching SA2 queue:', error);
      toast.error('Failed to load approval queue');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (isSA2 || isAdmin) {
      fetchQueue();
    }
  }, [isSA2, isAdmin, fetchQueue]);

  useSocketRefresh(fetchQueue, { enabled: isSA2 || isAdmin });

  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  const handleOpenDisposition = (lead) => {
    setSelectedLead(lead);
    setDecision('');
    setReason('');
    setShowDispositionModal(true);
  };

  const handleSubmitDisposition = async () => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }
    if (decision === 'REJECTED' && !reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post(`/leads/super-admin2/${selectedLead.id}/disposition`, {
        decision,
        reason: reason.trim() || null
      });
      toast.success(response.data.message || 'Decision saved');
      setShowDispositionModal(false);
      setSelectedLead(null);
      fetchQueue();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save decision');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || (!isSA2 && !isAdmin)) return null;

  // Filter leads by search
  const filteredLeads = search
    ? leads.filter(lead =>
        (lead.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{row.company || '-'}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{row.name || '-'}</p>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div>
          <p className="text-slate-900 dark:text-slate-100">{row.email || '-'}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{row.phone || '-'}</p>
        </div>
      )
    },
    {
      key: 'quotation',
      label: 'Quotation',
      render: (row) => (
        <div>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(row.arcAmount)}<span className="text-xs text-slate-400">/mo</span></p>
          {row.otcAmount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">OTC: {formatCurrency(row.otcAmount)}</p>
          )}
        </div>
      )
    },
    {
      key: 'bandwidth',
      label: 'Bandwidth',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100">{row.bandwidthRequirement || '-'}</p>
      )
    },
    {
      key: 'opsApproval',
      label: 'OPS Approval',
      render: (row) => (
        <div>
          <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CheckCircle size={12} className="mr-1" />
            Approved
          </Badge>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {row.opsApprovedBy?.name || '-'}
          </p>
        </div>
      )
    },
    {
      key: 'bdm',
      label: 'BDM',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100">{row.assignedTo?.name || row.createdBy?.name || '-'}</p>
      )
    },
    {
      key: 'submitted',
      label: 'Submitted',
      render: (row) => (
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.opsApprovedAt)}</p>
      )
    }
  ];

  return (
    <>
      {/* Header */}
      <PageHeader title="Quotation Approval" description="Review and approve quotations after OPS approval" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard color="amber" icon={Clock} label="Pending" value={stats.pending} />
        <StatCard color="emerald" icon={CheckCircle} label="Approved" value={stats.approved} />
        <StatCard color="red" icon={XCircle} label="Rejected" value={stats.rejected} />
      </div>

      {/* Queue Table */}
      <DataTable
        title="Pending Approvals"
        totalCount={total}
        columns={columns}
        data={filteredLeads}
        loading={isLoading}
        searchable
        searchPlaceholder="Search company, name, email..."
        onSearch={(val) => { setSearch(val); setPage(1); }}
        pagination
        serverPagination={{ page, limit: pageSize, total, totalPages }}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        onRowClick={(row) => handleViewDetails(row)}
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
              className="border-slate-300 dark:border-slate-700"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleOpenDisposition(row); }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Review
            </Button>
          </div>
        )}
        emptyMessage="No quotations pending approval"
        emptySubtitle="All quotations have been reviewed."
      />

      {/* Detail Modal */}
      {showDetailModal && selectedLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Quotation Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Company</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    {selectedLead.company || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Contact</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    {selectedLead.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Location</p>
                  <p className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    {selectedLead.city || '-'}{selectedLead.state ? `, ${selectedLead.state}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Industry</p>
                  <p className="text-slate-900 dark:text-slate-100">{selectedLead.industry || '-'}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                  <DollarSign size={16} />
                  Financial Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">ARC (Monthly)</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">{formatCurrency(selectedLead.arcAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">OTC</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">{formatCurrency(selectedLead.otcAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Advance</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">{formatCurrency(selectedLead.advanceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Terms</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">{selectedLead.paymentTerms || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <Wifi size={16} />
                  Technical Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Bandwidth</p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">{selectedLead.bandwidthRequirement || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">No. of IPs</p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">{selectedLead.numberOfIPs || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Type</p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">{selectedLead.type || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Products */}
              {selectedLead.products?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Products</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.products.map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* OPS Approval Info */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  OPS Approval
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Approved by: {selectedLead.opsApprovedBy?.name || '-'}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{formatDate(selectedLead.opsApprovedAt)}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">APPROVED</Badge>
                </div>
              </div>

              {/* BDM Info */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">BDM</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.assignedTo?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Campaign</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.campaign?.name || '-'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => { setShowDetailModal(false); handleOpenDisposition(selectedLead); }}
                  className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                >
                  Review & Decide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disposition Modal */}
      {showDispositionModal && selectedLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSaving && setShowDispositionModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Review Quotation</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedLead.company} - {formatCurrency(selectedLead.arcAmount)}/mo
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Decision Buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Decision</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      decision === 'APPROVED'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle size={20} />
                    <span className="font-medium">Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      decision === 'REJECTED'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300'
                    }`}
                  >
                    <XCircle size={20} />
                    <span className="font-medium">Reject</span>
                  </button>
                </div>
              </div>

              {/* Reason (required for rejection, optional for approval) */}
              {decision === 'REJECTED' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 resize-none"
                    placeholder="Explain why this quotation is being rejected..."
                  />
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setShowDispositionModal(false)}
                  disabled={isSaving}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitDisposition}
                  disabled={!decision || isSaving}
                  className={
                    decision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : decision === 'REJECTED'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-slate-400 text-white'
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    decision === 'APPROVED' ? 'Approve Quotation' :
                    decision === 'REJECTED' ? 'Reject Quotation' :
                    'Select Decision'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
