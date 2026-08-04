'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';
import {
  PackageOpen,
  Undo2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Search,
  Barcode,
  Building2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatDate } from '@/lib/formatters';

const CATEGORY_LABELS = {
  SWITCH: 'Switch',
  SFP: 'SFP',
  CLOSURE: 'Closure',
  RF: 'RF',
  PATCH_CORD: 'Patch Cord',
  FIBER: 'Fiber',
  MEDIA_CONVERTER: 'Media Converter',
  ROUTER: 'Router',
  UPS: 'UPS',
  BATTERY: 'Battery',
  SERVER_RACK: 'Server Rack'
};

export default function MaterialReturnsPage() {
  const { user, isStoreManager, isAdmin } = useRoleCheck();
  const isAllowed = isStoreManager || isAdmin;

  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({ total: 0, good: 0, faulty: 0, pending: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // ── Return modal ──
  const [showModal, setShowModal] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [returnable, setReturnable] = useState([]);
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [condition, setCondition] = useState('GOOD');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingSerials, setLoadingSerials] = useState(false);

  useModal(showModal, () => !submitting && closeModal());

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('condition', activeTab === 'faulty' ? 'FAULTY' : 'GOOD');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const res = await api.get(`/store/material-returns?${params.toString()}`);
      setReturns(res.data.returns || []);
      setStats(res.data.stats || { total: 0, good: 0, faulty: 0, pending: 0 });
    } catch (err) {
      console.error('Failed to load material returns:', err);
      toast.error('Failed to load returned material');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    if (isAllowed) fetchReturns();
  }, [isAllowed, fetchReturns]);

  useSocketRefresh(() => fetchReturns(), { enabled: isAllowed });

  // Only leads that still hold recoverable material are offered, so the store
  // never picks a lead with nothing to return.
  const fetchLeads = useCallback(async (term) => {
    try {
      const params = new URLSearchParams();
      if (term && term.trim()) params.set('search', term.trim());
      const res = await api.get(`/store/material-returns/leads?${params.toString()}`);
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  }, []);

  const openModal = async () => {
    setShowModal(true);
    setSelectedLead(null);
    setReturnable([]);
    setSelectedSerial(null);
    setCondition('GOOD');
    setRemark('');
    setLeadSearch('');
    await fetchLeads('');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setReturnable([]);
    setSelectedSerial(null);
    setRemark('');
  };

  const pickLead = async (lead) => {
    setSelectedLead(lead);
    setSelectedSerial(null);
    setLoadingSerials(true);
    try {
      const res = await api.get(`/store/material-returns/returnable?leadId=${lead.id}`);
      setReturnable(res.data.returnable || []);
    } catch (err) {
      console.error('Failed to load returnable material:', err);
      toast.error('Failed to load material for this lead');
      setReturnable([]);
    } finally {
      setLoadingSerials(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedLead || !selectedSerial) return;
    if (!remark.trim()) {
      toast.error('Please enter a reason for the return');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/store/material-returns', {
        leadId: selectedLead.id,
        serialNumber: selectedSerial.serialNumber,
        condition,
        remark: remark.trim()
      });
      toast.success(res.data.message || 'Submitted for approval');
      closeModal();
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return material');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !isAllowed) return null;

  const canSubmit = selectedLead && selectedSerial && remark.trim() && !submitting;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returned Material"
        description="Material recovered from customers and brought back into the store"
      >
        <Button onClick={openModal} className="gap-2">
          <Undo2 size={16} />
          Return Material
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard color="orange" icon={PackageOpen} label="Total Returned" value={stats.total} />
        <StatCard color="amber" icon={Clock} label="Awaiting Approval" value={stats.pending} />
        <StatCard color="emerald" icon={CheckCircle2} label="Good (back in stock)" value={stats.good} />
        <StatCard color="red" icon={AlertTriangle} label="Faulty (quarantined)" value={stats.faulty} />
      </div>

      <TabBar
        tabs={[
          { key: 'all', label: 'All', count: stats.total, icon: PackageOpen },
          { key: 'good', label: 'Good', count: stats.good, icon: CheckCircle2, variant: 'success' },
          { key: 'faulty', label: 'Faulty', count: stats.faulty, icon: AlertTriangle, variant: 'danger' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <DataTable
        title="Returned Material"
        totalCount={returns.length}
        data={returns}
        loading={isLoading}
        pagination={true}
        defaultPageSize={10}
        emptyMessage="No material has been returned yet."
        emptyIcon={PackageOpen}
        searchable={true}
        searchPlaceholder="Search serial, company, product or reason..."
        searchKeys={['serialNumber', 'company', 'productModel', 'remark']}
        columns={[
          {
            key: 'serial',
            label: 'Serial Number',
            render: (row) => (
              <div className="flex items-center gap-1.5">
                <Barcode size={12} className="text-slate-400 flex-shrink-0" />
                <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                  {row.serialNumber}
                </span>
              </div>
            )
          },
          {
            key: 'product',
            label: 'Product',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {row.productModel || '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {CATEGORY_LABELS[row.productCategory] || row.productCategory}
                  {row.brandName ? ` · ${row.brandName}` : ''}
                </p>
              </div>
            )
          },
          {
            key: 'company',
            label: 'Returned From',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {row.company || '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.leadNumber || ''}</p>
              </div>
            )
          },
          {
            key: 'condition',
            label: 'Condition',
            render: (row) => (
              row.condition === 'FAULTY' ? (
                <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0 text-xs gap-1">
                  <AlertTriangle size={10} />
                  Faulty
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 text-xs gap-1">
                  <CheckCircle2 size={10} />
                  Good
                </Badge>
              )
            )
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => {
              if (row.status === 'PENDING_APPROVAL') {
                return (
                  <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0 text-xs">
                    Awaiting approval
                  </Badge>
                );
              }
              if (row.status === 'REJECTED') {
                return (
                  <Badge
                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-0 text-xs"
                    title={row.rejectionReason || ''}
                  >
                    Rejected
                  </Badge>
                );
              }
              return (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 text-xs">
                  {row.condition === 'FAULTY' ? 'Quarantined' : 'In stock'}
                </Badge>
              );
            }
          },
          {
            key: 'remark',
            label: 'Reason',
            render: (row) => (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[240px]" title={row.remark}>
                {row.remark}
              </p>
            )
          },
          {
            key: 'returnedAt',
            label: 'Returned',
            render: (row) => (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p>{formatDate(row.returnedAt)}</p>
                {row.returnedBy && <p className="text-[10px]">by {row.returnedBy}</p>}
              </div>
            )
          }
        ]}
      />

      {/* ── Return Material modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Return Material</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recover serial-tracked material from a customer back into the store
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Step 1: lead */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  1. Customer to recover from
                </label>
                {selectedLead ? (
                  <div className="mt-1.5 flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 size={14} className="text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {selectedLead.company || selectedLead.leadNumber}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {selectedLead.leadNumber} · {selectedLead.returnableCount} item(s) held
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedLead(null); setReturnable([]); setSelectedSerial(null); }}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={leadSearch}
                        onChange={(e) => { setLeadSearch(e.target.value); fetchLeads(e.target.value); }}
                        placeholder="Search customer, lead no. or username..."
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                      {leads.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 p-3 text-center">
                          No customers are currently holding recoverable material.
                        </p>
                      ) : leads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => pickLead(lead)}
                          className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-slate-900 dark:text-slate-100 truncate">
                              {lead.company || lead.leadNumber}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {lead.leadNumber}{lead.customerUsername ? ` · ${lead.customerUsername}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {lead.returnableCount}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: serial */}
              {selectedLead && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    2. Material being returned
                  </label>
                  {loadingSerials ? (
                    <div className="mt-1.5 flex items-center gap-2 p-3 text-xs text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Loading material...
                    </div>
                  ) : returnable.length === 0 ? (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 p-3 text-center rounded-lg border border-slate-200 dark:border-slate-700">
                      No serial-tracked material left to recover from this customer.
                    </p>
                  ) : (
                    <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                      {returnable.map((item) => {
                        const isSel = selectedSerial?.serialNumber === item.serialNumber;
                        return (
                          <button
                            key={item.serialNumber}
                            onClick={() => setSelectedSerial(item)}
                            className={`w-full text-left p-2.5 flex items-center justify-between gap-2 ${
                              isSel
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-inset ring-indigo-400'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                                {item.serialNumber}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {item.productModel} · {CATEGORY_LABELS[item.productCategory] || item.productCategory}
                              </p>
                            </div>
                            {isSel && <CheckCircle2 size={14} className="text-indigo-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: condition + reason */}
              {selectedSerial && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      3. Condition
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCondition('GOOD')}
                        className={`p-2.5 rounded-lg border text-left ${
                          condition === 'GOOD'
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-400'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Good</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Back into stock — can be assigned again
                        </p>
                      </button>
                      <button
                        onClick={() => setCondition('FAULTY')}
                        className={`p-2.5 rounded-lg border text-left ${
                          condition === 'FAULTY'
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-400'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle size={13} className="text-red-600" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Faulty</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Quarantined — visible but never assigned
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      4. Reason for return <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={2}
                      placeholder="e.g. Customer shut down the ILL link"
                      className="mt-1.5 w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                {submitting ? 'Returning...' : 'Return to Inventory'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
