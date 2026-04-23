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
  Eye,
  Send
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

const TABS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'amber' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'emerald' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'red' }
];

export default function SuperAdmin2ApprovalPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('pending');
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
  // Optional approval notes forwarded to Docs team + BDM.
  const [sa2Notes, setSa2Notes] = useState('');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useModal(showDetailModal, () => setShowDetailModal(false));
  useModal(showDispositionModal, () => !isSaving && setShowDispositionModal(false));

  const isMaster = user?.role === 'MASTER';
  const isSA2 = user?.role === 'SUPER_ADMIN_2' || isMaster;
  const isSalesDirector = user?.role === 'SALES_DIRECTOR';
  const isAdmin = user?.role === 'SUPER_ADMIN' || isSalesDirector || isMaster;

  useEffect(() => {
    if (user && !isSA2 && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isSA2, isAdmin, router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'pending') {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString()
        });
        const response = await api.get(`/leads/super-admin2/queue?${params}`);
        setLeads(response.data.leads);
        setStats(response.data.stats);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        const params = new URLSearchParams({
          tab: activeTab,
          page: page.toString(),
          limit: pageSize.toString()
        });
        const response = await api.get(`/leads/super-admin2/history?${params}`);
        setLeads(response.data.leads);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
        // Refresh stats from queue endpoint (lightweight — just stats)
        try {
          const statsRes = await api.get('/leads/super-admin2/queue?page=1&limit=1');
          setStats(statsRes.data.stats);
        } catch {}
      }
    } catch (error) {
      console.error('Error fetching SA2 data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, pageSize]);

  useEffect(() => {
    if (isSA2 || isAdmin) {
      fetchData();
    }
  }, [isSA2, isAdmin, fetchData]);

  useSocketRefresh(fetchData, { enabled: isSA2 || isAdmin });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
  };

  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  const handleOpenDisposition = (lead) => {
    setSelectedLead(lead);
    setDecision('');
    setReason('');
    setSa2Notes('');
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
        reason: reason.trim() || null,
        notes: sa2Notes.trim() || null,
      });
      toast.success(response.data.message || 'Decision saved');
      setShowDispositionModal(false);
      setSelectedLead(null);
      fetchData();
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

  // Common columns
  const baseColumns = [
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
      key: 'bdm',
      label: 'BDM',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100">{row.assignedTo?.name || row.createdBy?.name || '-'}</p>
      )
    }
  ];

  // Tab-specific columns
  const pendingColumns = [
    ...baseColumns,
    {
      key: 'submitted',
      label: 'Submitted',
      render: (row) => (
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.opsApprovedAt)}</p>
      )
    }
  ];

  const approvedColumns = [
    ...baseColumns,
    {
      key: 'approvedAt',
      label: 'Approved At',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-900 dark:text-slate-100">{formatDate(row.superAdmin2ApprovedAt)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.superAdmin2ApprovedBy?.name || '-'}</p>
        </div>
      )
    }
  ];

  const rejectedColumns = [
    ...baseColumns,
    {
      key: 'rejectedAt',
      label: 'Rejected',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-900 dark:text-slate-100">{formatDate(row.superAdmin2ApprovedAt)}</p>
          <p className="text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate" title={row.superAdmin2RejectedReason}>
            {row.superAdmin2RejectedReason || '-'}
          </p>
        </div>
      )
    }
  ];

  const columns = activeTab === 'approved' ? approvedColumns : activeTab === 'rejected' ? rejectedColumns : pendingColumns;

  const tableTitle = activeTab === 'pending' ? 'Pending Approvals' : activeTab === 'approved' ? 'Approved Quotations' : 'Rejected Quotations';
  const emptyMessage = activeTab === 'pending' ? 'No quotations pending approval' : activeTab === 'approved' ? 'No approved quotations yet' : 'No rejected quotations';
  const emptySubtitle = activeTab === 'pending' ? 'All quotations have been reviewed.' : '';

  return (
    <>
      {/* Header */}
      <PageHeader title="Quotation Approval" description="Review and approve quotations submitted by BDM" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`text-left transition-all ${activeTab === tab.key ? 'ring-2 ring-offset-2 ring-orange-500 rounded-xl' : ''}`}
          >
            <StatCard color={tab.color} icon={tab.icon} label={tab.label} value={stats[tab.key] || 0} />
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {stats[tab.key] > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key
                    ? tab.key === 'pending' ? 'bg-amber-100 text-amber-700' : tab.key === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}>
                  {stats[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <DataTable
        title={tableTitle}
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
        actions={activeTab === 'pending' ? (row) => (
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
        ) : (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
            className="border-slate-300 dark:border-slate-700"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        )}
        emptyMessage={emptyMessage}
        emptySubtitle={emptySubtitle}
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
              {/* SA2 Decision Banner (for approved/rejected tabs) */}
              {selectedLead.superAdmin2ApprovalStatus === 'APPROVED' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Approved by {selectedLead.superAdmin2ApprovedBy?.name || 'Admin'}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{formatDate(selectedLead.superAdmin2ApprovedAt)}</p>
                  </div>
                </div>
              )}
              {selectedLead.superAdmin2ApprovalStatus === 'REJECTED' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-1">
                    <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">Rejected by {selectedLead.superAdmin2ApprovedBy?.name || 'Admin'}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">{formatDate(selectedLead.superAdmin2ApprovedAt)}</p>
                    </div>
                  </div>
                  {selectedLead.superAdmin2RejectedReason && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2 ml-8">Reason: {selectedLead.superAdmin2RejectedReason}</p>
                  )}
                </div>
              )}

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

              {/* Quotation Attachments */}
              {selectedLead.quotationAttachments?.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300 mb-2">Quotation Attachments</h4>
                  <div className="space-y-1.5">
                    {selectedLead.quotationAttachments.map((file, i) => (
                      <a
                        key={i}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <FileText size={13} />
                        <span className="truncate">{file.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
              {activeTab === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => { setShowDetailModal(false); handleOpenDisposition(selectedLead); }}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                  >
                    Review & Decide
                  </Button>
                </div>
              )}
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
              {/* Quotation Attachments */}
              {selectedLead.quotationAttachments?.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase mb-2">Attachments</h4>
                  <div className="space-y-1.5">
                    {selectedLead.quotationAttachments.map((file, i) => (
                      <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <FileText size={13} />
                        <span className="truncate">{file.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* OPS approval note — forwarded context from the OPS team.
                  Only shown when they left one, otherwise this section stays
                  quiet. */}
              {selectedLead.opsApprovalNotes && (
                <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText size={13} className="text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">OPS Notes</p>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedLead.opsApprovalNotes}
                  </p>
                </div>
              )}

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

              {/* Reason (required for rejection) */}
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

              {/* Optional approval notes — forwarded to Docs team + BDM
                  on either decision so they see the handoff context. */}
              {decision && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Notes <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={sa2Notes}
                    onChange={(e) => setSa2Notes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 resize-none"
                    placeholder="Add any context for the Docs team or BDM…"
                  />
                  <p className="text-xs text-slate-500">
                    Visible to the Docs team and the BDM on the next step.
                  </p>
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
