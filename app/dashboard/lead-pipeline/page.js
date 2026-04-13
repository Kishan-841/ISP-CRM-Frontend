'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useProductStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  MapPin,
  Snowflake,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { PageHeader } from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

export default function LeadPipelinePage() {
  const router = useRouter();
  const { user, isBDM, isBDMTeamLeader, isSuperAdmin: isAdmin } = useRoleCheck();
  const isBDMCP = user?.role === 'BDM_CP';
  const canAccess = isBDM || isBDMCP || isBDMTeamLeader || isAdmin;

  const {
    coldLeads,
    coldLeadsPagination,
    fetchColdLeads,
    completeColdLead,
    feasibilityTeamUsers,
    fetchFeasibilityTeamUsers,
    isLoading,
  } = useLeadStore();
  const { products, fetchProducts } = useProductStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Complete form state (mirrors bdm-meetings Qualified form — minus POP Location,
  // which the Feasibility Team decides, not the BDM)
  const [feasibilityUserId, setFeasibilityUserId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [bandwidthRequirement, setBandwidthRequirement] = useState('');
  const [numberOfIPs, setNumberOfIPs] = useState('');
  const [interestLevel, setInterestLevel] = useState('');
  const [tentativePrice, setTentativePrice] = useState('');
  const [otcAmount, setOtcAmount] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPincode, setBillingPincode] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);

  useModal(showCompleteModal, () => !isSaving && setShowCompleteModal(false));

  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (canAccess) {
      fetchColdLeads();
      fetchProducts();
      fetchFeasibilityTeamUsers();
    }
  }, [canAccess, fetchColdLeads, fetchProducts, fetchFeasibilityTeamUsers]);

  useSocketRefresh(() => fetchColdLeads(), { enabled: canAccess });

  const openCompleteModal = (lead) => {
    setSelectedLead(lead);
    setFeasibilityUserId('');
    setLatitude(lead.latitude != null ? String(lead.latitude) : '');
    setLongitude(lead.longitude != null ? String(lead.longitude) : '');
    setFullAddress(lead.fullAddress || '');
    setBandwidthRequirement(lead.bandwidthRequirement ? String(lead.bandwidthRequirement).replace(/\D/g, '') : '');
    setNumberOfIPs(lead.numberOfIPs != null ? String(lead.numberOfIPs) : '');
    setInterestLevel(lead.interestLevel || '');
    setTentativePrice(lead.tentativePrice != null ? String(lead.tentativePrice) : '');
    setOtcAmount(lead.otcAmount != null ? String(lead.otcAmount) : '');
    setBillingAddress(lead.billingAddress || '');
    setBillingPincode(lead.billingPincode || '');
    setExpectedDeliveryDate(
      lead.expectedDeliveryDate ? new Date(lead.expectedDeliveryDate).toISOString().slice(0, 10) : ''
    );
    setNotes('');
    setSelectedProducts((lead.products || []).map((p) => p.id));
    setShowCompleteModal(true);
  };

  const toggleProduct = (pid) => {
    setSelectedProducts((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  const handleComplete = async () => {
    if (!selectedLead) return;
    if (!feasibilityUserId) return toast.error('Please select a Feasibility Team member');
    if (!latitude.trim() || !longitude.trim()) return toast.error('Latitude and longitude are required');
    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) return toast.error('Invalid coordinates');
    if (!fullAddress.trim()) return toast.error('Full address is required');
    if (!interestLevel) return toast.error('Interest level is required');

    setIsSaving(true);
    const bwNum = bandwidthRequirement.replace(/\D/g, '');
    const result = await completeColdLead(selectedLead.id, {
      feasibilityAssignedToId: feasibilityUserId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      fullAddress: fullAddress.trim(),
      bandwidthRequirement: bwNum ? `${bwNum} Mbps` : null,
      numberOfIPs: numberOfIPs.trim() ? parseInt(numberOfIPs) : null,
      interestLevel,
      tentativePrice: tentativePrice.trim() ? parseFloat(tentativePrice) : null,
      otcAmount: otcAmount.trim() ? parseFloat(otcAmount) : null,
      billingAddress: billingAddress.trim() || null,
      billingPincode: billingPincode.trim() || null,
      expectedDeliveryDate: expectedDeliveryDate || null,
      productIds: selectedProducts,
      notes: notes.trim() || null,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success('Cold lead completed and pushed to Feasibility Team');
      setShowCompleteModal(false);
      setSelectedLead(null);
      fetchColdLeads();
    } else {
      toast.error(result.error || 'Failed to complete cold lead');
    }
  };

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Lead Pipeline" description="Cold leads parked with partial details — complete them when the customer provides more information.">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
            <Snowflake size={12} className="mr-1" />
            {coldLeadsPagination?.total || 0} cold leads
          </Badge>
        </div>
      </PageHeader>

      <DataTable
        columns={[
          {
            key: 'leadNumber',
            label: 'Lead #',
            render: (row) => (
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                {row.leadNumber || '—'}
              </span>
            ),
          },
          {
            key: 'company',
            label: 'Company',
            render: (row) => (
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {row.company || '—'}
                </div>
                {row.campaign && (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {row.campaign.name}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'name',
            label: 'Contact',
            render: (row) => (
              <span className="text-slate-700 dark:text-slate-300">{row.name || '—'}</span>
            ),
          },
          {
            key: 'phone',
            label: 'Phone',
            render: (row) => (
              <span className="text-slate-700 dark:text-slate-300">{row.phone || '—'}</span>
            ),
          },
          {
            key: 'assignedTo',
            label: 'Assigned To',
            render: (row) => (
              <span className="text-slate-700 dark:text-slate-300">
                {row.assignedTo?.name || 'Unassigned'}
              </span>
            ),
          },
          {
            key: 'addedOn',
            label: 'Added On',
            render: (row) => (
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {row.createdAt
                  ? new Date(row.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            ),
          },
        ]}
        data={coldLeads}
        loading={isLoading}
        searchable
        searchPlaceholder="Search company, name, phone, email, lead #..."
        searchKeys={['company', 'name', 'phone', 'email', 'leadNumber']}
        pagination
        defaultPageSize={25}
        emptyMessage="No cold leads right now"
        emptySubtitle='When a BDM saves a meeting outcome as "Cold Lead", it will appear here until the customer provides the missing details.'
        emptyIcon={Snowflake}
        actions={(row) => (
          <Button
            size="sm"
            onClick={() => openCompleteModal(row)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Pencil size={12} className="mr-1.5" />
            Complete Details
          </Button>
        )}
      />

      {/* Complete Details Modal */}
      {showCompleteModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Complete Cold Lead</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedLead.company} · {selectedLead.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  On save, this lead will be pushed to the Feasibility Team and removed from Lead Pipeline.
                </p>
              </div>
              <button
                onClick={() => !isSaving && setShowCompleteModal(false)}
                disabled={isSaving}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Feasibility Assignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Feasibility Team <span className="text-red-500">*</span>
                </label>
                <select
                  value={feasibilityUserId}
                  onChange={(e) => setFeasibilityUserId(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select team member...</option>
                  {(feasibilityTeamUsers || []).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer Location */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                  <MapPin size={12} />
                  Customer Location <span className="text-red-500">*</span>
                </h4>
                <input
                  type="text"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Customer address..."
                  className="w-full h-9 px-2 mb-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude *"
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                  />
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude *"
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
              </div>

              {/* Service Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Bandwidth (Mbps)
                  </label>
                  <input
                    type="number"
                    value={bandwidthRequirement}
                    onChange={(e) => setBandwidthRequirement(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Number of IPs
                  </label>
                  <input
                    type="number"
                    value={numberOfIPs}
                    onChange={(e) => setNumberOfIPs(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Interest Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={interestLevel}
                    onChange={(e) => setInterestLevel(e.target.value)}
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select...</option>
                    <option value="HOT">Hot</option>
                    <option value="WARM">Warm</option>
                    <option value="COLD">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tentative ARC Price
                  </label>
                  <input
                    type="number"
                    value={tentativePrice}
                    onChange={(e) => setTentativePrice(e.target.value)}
                    placeholder="₹"
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    OTC Amount
                  </label>
                  <input
                    type="number"
                    value={otcAmount}
                    onChange={(e) => setOtcAmount(e.target.value)}
                    placeholder="₹"
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-300">Billing Address</h4>
                  <button
                    type="button"
                    onClick={() => setBillingAddress(fullAddress)}
                    disabled={!fullAddress.trim()}
                    className="text-[11px] font-medium px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white disabled:cursor-not-allowed"
                  >
                    Same as installation address
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Full billing address..."
                    className="col-span-3 w-full h-9 px-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                  />
                  <input
                    type="text"
                    value={billingPincode}
                    onChange={(e) => setBillingPincode(e.target.value)}
                    placeholder="Pincode"
                    maxLength={6}
                    className="w-full h-9 px-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
              </div>

              {/* Products */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Products of Interest
                </label>
                {products.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {products.map((p) => {
                      const selected = selectedProducts.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProduct(p.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-orange-600 border-orange-600 text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Additional notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything the feasibility team should know..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                onClick={() => setShowCompleteModal(false)}
                variant="outline"
                size="sm"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isSaving}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 size={14} className="mr-1.5" />
                {isSaving ? 'Saving...' : 'Complete & Assign to Feasibility'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
