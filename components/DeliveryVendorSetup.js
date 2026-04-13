'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { useLeadStore } from '@/lib/store';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import CreateVendorModal from '@/components/CreateVendorModal';

const VENDOR_TYPE_LABELS = {
  ownNetwork: 'Own Network',
  fiberVendor: 'Fiber Vendor',
  commissionVendor: 'Commission Vendor',
  thirdParty: 'Third Party',
  telco: 'Telco',
};

const VENDOR_TYPE_CATEGORY_MAP = {
  fiberVendor: 'FIBER',
  commissionVendor: 'COMMISSION',
  thirdParty: 'THIRD_PARTY',
  telco: 'TELCO',
};

const MATERIAL_CATEGORIES = [
  { key: 'FIBER', label: 'Fiber' },
  { key: 'SWITCH', label: 'Switch' },
  { key: 'SFP', label: 'SFP' },
  { key: 'CLOSURE', label: 'Closure' },
  { key: 'PATCH_CORD', label: 'Patch Cord' },
  { key: 'RF', label: 'RF' },
  { key: 'MEDIA_CONVERTER', label: 'Media Converter' },
  { key: 'ROUTER', label: 'Router' },
];

export default function DeliveryVendorSetup({ lead, onSaved }) {
  const { setupDeliveryVendor } = useLeadStore();
  const [vendors, setVendors] = useState([]);
  const [storeProducts, setStoreProducts] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(lead.vendorId || '');
  const [vendorNotes, setVendorNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);

  // OPEX fields per vendor type
  const [commissionPct, setCommissionPct] = useState('');
  const [fiberRequired, setFiberRequired] = useState('');
  const [perMtrCost, setPerMtrCost] = useState('');
  const [p2pCapacity, setP2pCapacity] = useState('');
  const [perMbCost, setPerMbCost] = useState('');
  const [telcoFiberMtr, setTelcoFiberMtr] = useState('');
  const [telcoCostPerMtr, setTelcoCostPerMtr] = useState('');
  const [tpBandwidth, setTpBandwidth] = useState('');
  const [tpArc, setTpArc] = useState('');
  const [tpOtc, setTpOtc] = useState('');

  // CAPEX: material/equipment items
  const [materials, setMaterials] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Resolve vendor type
  let initialVendorType = lead.feasibilityVendorType;
  if (!initialVendorType && lead.feasibilityNotes) {
    try {
      const parsed = typeof lead.feasibilityNotes === 'string' ? JSON.parse(lead.feasibilityNotes) : lead.feasibilityNotes;
      initialVendorType = parsed?.vendorType || null;
    } catch {}
  }
  if (!initialVendorType && lead.feasibilityInfo?.vendorType) {
    initialVendorType = lead.feasibilityInfo.vendorType;
  }

  const [vendorType, setLocalVendorType] = useState(initialVendorType || '');
  const vendorTypeLabel = VENDOR_TYPE_LABELS[vendorType] || vendorType || 'Not Set';
  const vendorCategory = VENDOR_TYPE_CATEGORY_MAP[vendorType];
  const isOwnNetwork = vendorType === 'ownNetwork';
  const isFiber = vendorType === 'fiberVendor';
  const isCommission = vendorType === 'commissionVendor';
  const isTelco = vendorType === 'telco';
  const isThirdParty = vendorType === 'thirdParty';
  const isDone = lead.deliveryVendorSetupDone;
  const arcAmount = lead.tentativePrice || lead.arcAmount || 0;

  // Auto-calculated OPEX
  const fiberAmount = useMemo(() => Math.round((parseFloat(fiberRequired) || 0) * (parseFloat(perMtrCost) || 0) * 100) / 100, [fiberRequired, perMtrCost]);
  const commissionOpex = useMemo(() => Math.round((parseFloat(commissionPct) || 0) * arcAmount / 100 * 100) / 100, [commissionPct, arcAmount]);
  const telcoOpex = useMemo(() => {
    return Math.round(((parseFloat(p2pCapacity) || 0) * (parseFloat(perMbCost) || 0) + (parseFloat(telcoFiberMtr) || 0) * (parseFloat(telcoCostPerMtr) || 0)) * 100) / 100;
  }, [p2pCapacity, perMbCost, telcoFiberMtr, telcoCostPerMtr]);
  const calculatedOpex = isFiber ? fiberAmount : isCommission ? commissionOpex : isTelco ? telcoOpex : isThirdParty ? parseFloat(tpArc) || 0 : 0;

  // Auto-calculated CAPEX from material items
  const calculatedCapex = useMemo(() =>
    materials.reduce((sum, m) => sum + ((parseFloat(m.quantity) || 0) * (parseFloat(m.unitPrice) || 0)), 0),
    [materials]
  );

  // Fetch vendors + store products
  const fetchVendorList = () => {
    if (isOwnNetwork || !vendorCategory) {
      setIsLoadingVendors(false);
      return;
    }
    setIsLoadingVendors(true);
    api.get(`/vendors?category=${vendorCategory}&status=PENDING_ACCOUNTS,APPROVED`)
      .then(res => setVendors(res.data.vendors || res.data || []))
      .catch(() => {})
      .finally(() => setIsLoadingVendors(false));
  };

  useEffect(() => { fetchVendorList(); }, [vendorCategory, isOwnNetwork]);
  useEffect(() => {
    api.get('/store/products').then(res => setStoreProducts(res.data || [])).catch(() => {});
  }, []);

  // Pre-fill from existing deliveryProducts
  useEffect(() => {
    if (lead.deliveryProducts && typeof lead.deliveryProducts === 'object') {
      const dp = lead.deliveryProducts;
      if (dp.fiberRequired) setFiberRequired(String(dp.fiberRequired));
      if (dp.perMtrCost) setPerMtrCost(String(dp.perMtrCost));
      if (dp.commissionPct) setCommissionPct(String(dp.commissionPct));
      if (dp.p2pCapacity) setP2pCapacity(String(dp.p2pCapacity));
      if (dp.perMbCost) setPerMbCost(String(dp.perMbCost));
      if (dp.telcoFiberMtr) setTelcoFiberMtr(String(dp.telcoFiberMtr));
      if (dp.telcoCostPerMtr) setTelcoCostPerMtr(String(dp.telcoCostPerMtr));
      if (dp.vendorNotes) setVendorNotes(dp.vendorNotes);
      if (dp.materials && Array.isArray(dp.materials)) setMaterials(dp.materials);
    }
  }, [lead.deliveryProducts]);

  const getProductsByCategory = (cat) => storeProducts.filter(p => p.category === cat);

  const handleAddMaterial = () => {
    if (!selectedProductId && !selectedCategory) return;
    const product = storeProducts.find(p => p.id === selectedProductId);
    setMaterials(prev => [...prev, {
      category: selectedCategory,
      productId: product?.id || null,
      name: product ? `${product.modelNumber || product.brandName}` : selectedCategory,
      unit: product?.unit || 'pcs',
      unitPrice: product?.price || 0,
      quantity: '1',
    }]);
    setSelectedProductId('');
  };

  const removeMaterial = (idx) => setMaterials(prev => prev.filter((_, i) => i !== idx));
  const updateMaterial = (idx, field, value) => setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));

  const handleSave = async () => {
    if (!vendorType) return toast.error('Please select a vendor type');
    if (!isOwnNetwork && !selectedVendorId) return toast.error('Please select a vendor');

    setIsSaving(true);
    const result = await setupDeliveryVendor(lead.id, {
      vendorId: isOwnNetwork ? undefined : selectedVendorId || undefined,
      fiberRequired: isFiber ? fiberRequired : undefined,
      perMtrCost: isFiber ? perMtrCost : undefined,
      actualCapex: calculatedCapex > 0 ? calculatedCapex : lead.tentativeCapex,
      actualOpex: calculatedOpex > 0 ? calculatedOpex : lead.tentativeOpex,
      vendorNotes: vendorNotes.trim() || undefined,
      materials: materials.filter(m => m.name && (parseFloat(m.quantity) || 0) > 0),
      vendorTypeData: {
        vendorType,
        ...(isCommission && { commissionPct: parseFloat(commissionPct) || 0 }),
        ...(isFiber && { fiberRequired: parseFloat(fiberRequired) || 0, perMtrCost: parseFloat(perMtrCost) || 0, fiberAmount }),
        ...(isTelco && { p2pCapacity: parseFloat(p2pCapacity) || 0, perMbCost: parseFloat(perMbCost) || 0, telcoFiberMtr: parseFloat(telcoFiberMtr) || 0, telcoCostPerMtr: parseFloat(telcoCostPerMtr) || 0 }),
        ...(isThirdParty && { bandwidth: tpBandwidth, arc: parseFloat(tpArc) || 0, otc: parseFloat(tpOtc) || 0 }),
      },
    });
    setIsSaving(false);

    if (result.success) {
      toast.success('Vendor setup saved');
      if (onSaved) onSaved(result.lead);
    } else {
      toast.error(result.error || 'Failed to save');
    }
  };

  // ===== DONE STATE =====
  if (isDone) {
    return (
      <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-emerald-600" />
            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Vendor Setup</h4>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
              <CheckCircle2 size={10} className="mr-1" /> Done
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">{vendorTypeLabel}</Badge>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
            {lead.vendor && <p>Vendor: <span className="font-medium">{lead.vendor.companyName}</span></p>}
            <div className="flex gap-4">
              {lead.tentativeCapex != null && <p>CAPEX: <span className="font-bold">₹{lead.tentativeCapex.toLocaleString('en-IN')}</span></p>}
              {lead.tentativeOpex != null && <p>OPEX: <span className="font-bold">₹{lead.tentativeOpex.toLocaleString('en-IN')}</span></p>}
            </div>
          </div>
          {/* Show materials from vendor setup */}
          {lead.deliveryProducts?.materials?.length > 0 && (
            <div className="mt-2 border-t border-emerald-200 dark:border-emerald-800 pt-2">
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Equipment</p>
              <div className="space-y-1">
                {lead.deliveryProducts.materials.map((m, i) => {
                  const total = Math.round((parseFloat(m.quantity) || 0) * (parseFloat(m.unitPrice) || 0));
                  return (
                    <div key={i} className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                      <span>{m.name} <span className="text-emerald-500">×{m.quantity}</span></span>
                      <span className="font-medium">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== SETUP STATE =====
  return (
    <div className="p-4 rounded-xl border bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-violet-600" />
          <h4 className="text-sm font-semibold text-violet-800 dark:text-violet-300">Vendor Setup</h4>
        </div>
        {vendorType && <Badge variant="outline" className="text-xs">{vendorTypeLabel}</Badge>}
      </div>

      {/* Step 1: Vendor Type (if not pre-set) */}
      {!vendorType && (
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Select Vendor Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(VENDOR_TYPE_LABELS).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setLocalVendorType(key)}
                className="px-3 py-2 rounded-md border-2 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400 transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {vendorType && (
        <>
          {/* Step 2: Vendor Selection (not for Own Network) */}
          {!isOwnNetwork && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select {vendorTypeLabel} <span className="text-red-500">*</span>
              </label>
              {isLoadingVendors ? (
                <p className="text-xs text-slate-400">Loading...</p>
              ) : (
                <div className="flex gap-2">
                  <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="flex-1 h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100">
                    <option value="">Select vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName}{v.commissionPercentage ? ` (${v.commissionPercentage}%)` : ''}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => setShowCreateVendorModal(true)}
                    className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 shrink-0">
                    <Plus size={14} className="mr-1" /> New
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: OPEX — vendor-type-specific cost fields */}
          {!isOwnNetwork && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                  OPEX {isFiber ? '— Fiber Cost' : isCommission ? '— Commission' : isTelco ? '— Telco Cost' : isThirdParty ? '— Third Party' : ''}
                </p>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">₹{calculatedOpex.toLocaleString('en-IN')}</p>
              </div>

              {/* Commission */}
              {isCommission && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Commission %</label>
                    <input type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} placeholder="e.g. 30"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">ARC (₹)</label>
                    <div className="h-8 px-2 flex items-center bg-slate-100 dark:bg-slate-800 rounded text-sm text-slate-500">₹{arcAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">OPEX (₹)</label>
                    <div className="h-8 px-2 flex items-center bg-orange-100 dark:bg-orange-900/30 rounded text-sm font-semibold text-orange-700">₹{commissionOpex.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}

              {/* Fiber */}
              {isFiber && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Fiber Required (Mtr)</label>
                    <input type="number" value={fiberRequired} onChange={(e) => setFiberRequired(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Per Mtr Cost (₹)</label>
                    <input type="number" value={perMtrCost} onChange={(e) => setPerMtrCost(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Fiber Amount (₹)</label>
                    <div className="h-8 px-2 flex items-center bg-orange-100 dark:bg-orange-900/30 rounded text-sm font-semibold text-orange-700">₹{fiberAmount.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}

              {/* Telco */}
              {isTelco && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">P2P Capacity (Mbps)</label>
                    <input type="number" value={p2pCapacity} onChange={(e) => setP2pCapacity(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Per MB Cost (₹)</label>
                    <input type="number" value={perMbCost} onChange={(e) => setPerMbCost(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Fiber MTR Required</label>
                    <input type="number" value={telcoFiberMtr} onChange={(e) => setTelcoFiberMtr(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Cost Per MTR (₹)</label>
                    <input type="number" value={telcoCostPerMtr} onChange={(e) => setTelcoCostPerMtr(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                </div>
              )}

              {/* Third Party */}
              {isThirdParty && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Bandwidth (Mbps)</label>
                    <input type="text" value={tpBandwidth} onChange={(e) => setTpBandwidth(e.target.value)} placeholder="100"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">ARC (₹)</label>
                    <input type="number" value={tpArc} onChange={(e) => setTpArc(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">OTC (₹)</label>
                    <input type="number" value={tpOtc} onChange={(e) => setTpOtc(e.target.value)} placeholder="0"
                      className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: CAPEX — Equipment / Materials */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-700">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">CAPEX — Equipment</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{calculatedCapex.toLocaleString('en-IN')}</p>
            </div>

            {/* Material Add — two-step: pick category → pick product */}
            <div className="flex gap-2 mb-3">
              <select value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedProductId(''); }}
                className="w-28 h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded text-xs text-slate-900 dark:text-slate-100">
                <option value="">Category</option>
                {MATERIAL_CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
              <select value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={!selectedCategory}
                className="flex-1 h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded text-xs text-slate-900 dark:text-slate-100 disabled:opacity-50">
                <option value="">Select {selectedCategory ? MATERIAL_CATEGORIES.find(c => c.key === selectedCategory)?.label : 'product'}...</option>
                {selectedCategory && getProductsByCategory(selectedCategory).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.modelNumber || p.brandName} {p.price ? `— ₹${p.price.toLocaleString('en-IN')}` : ''}
                  </option>
                ))}
              </select>
              <Button size="sm" type="button" disabled={!selectedProductId && !selectedCategory}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 shrink-0"
                onClick={handleAddMaterial}>
                <Plus size={12} className="mr-1" /> Add
              </Button>
            </div>

            {/* Material Rows */}
            {materials.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No materials added yet</p>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">
                  <span className="col-span-5">Item</span>
                  <span className="col-span-3 text-center">Qty</span>
                  <span className="col-span-3 text-right">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {materials.map((m, idx) => {
                  const total = Math.round((parseFloat(m.quantity) || 0) * (parseFloat(m.unitPrice) || 0));
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 dark:bg-slate-800/50 rounded px-1 py-1">
                      <div className="col-span-5 text-xs text-slate-700 dark:text-slate-300 truncate">
                        <span className="font-medium">{m.name}</span>
                        {m.unitPrice > 0 && <span className="text-[10px] text-slate-400 ml-1">@₹{parseFloat(m.unitPrice).toLocaleString('en-IN')}/{m.unit || 'pcs'}</span>}
                      </div>
                      <input type="number" value={m.quantity} onChange={(e) => updateMaterial(idx, 'quantity', e.target.value)}
                        min="1" className="col-span-3 h-7 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-center" />
                      <div className="col-span-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-right pr-1">
                        ₹{total.toLocaleString('en-IN')}
                      </div>
                      <button type="button" onClick={() => removeMaterial(idx)}
                        className="col-span-1 h-7 flex items-center justify-center text-red-400 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-center">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-medium">CAPEX</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">₹{calculatedCapex.toLocaleString('en-IN')}</p>
            </div>
            {!isOwnNetwork && (
              <div className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-center">
                <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-medium">OPEX</p>
                <p className="text-sm font-bold text-orange-700 dark:text-orange-300">₹{calculatedOpex.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            <textarea value={vendorNotes} onChange={(e) => setVendorNotes(e.target.value)} rows={2}
              placeholder="Any notes..." className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm resize-none" />
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={isSaving} size="sm"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...</> : <><CheckCircle2 size={14} className="mr-1.5" /> Save Vendor Setup</>}
          </Button>
        </>
      )}

      <CreateVendorModal open={showCreateVendorModal} onClose={() => setShowCreateVendorModal(false)}
        onSuccess={() => { fetchVendorList(); setShowCreateVendorModal(false); }} />
    </div>
  );
}
