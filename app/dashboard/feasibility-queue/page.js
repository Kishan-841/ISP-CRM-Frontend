'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLeadStore, useVendorStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import {
  Building2,
  User,
  Mail,
  MapPin,
  Clock,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Package,
  Loader2,
  ExternalLink,
  Navigation,
  Phone,
  Calendar,
  TrendingUp,
  Wifi,
  Hash,
  Plus,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import CreateVendorModal from '@/components/CreateVendorModal';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

export default function FeasibilityQueuePage() {
  const router = useRouter();
  const { user, isFeasibilityTeam: _isFeasibilityTeam, isBDMTeamLeader: _isBDMTeamLeader, isSuperAdmin: isAdmin, isMaster } = useRoleCheck();
  const isFeasibilityTeam = isMaster ? false : _isFeasibilityTeam;
  const isBDMTeamLeader = isMaster ? false : _isBDMTeamLeader;
  const canAccessFeasibility = isFeasibilityTeam || isBDMTeamLeader || isAdmin;
  const {
    feasibilityQueue,
    feasibilityStats,
    fetchFeasibilityQueue,
    feasibilityReviewHistory,
    feasibilityReviewCounts,
    fetchFeasibilityReviewHistory,
    feasibilityDisposition,
    getLeadMOMs,
    isLoading
  } = useLeadStore();

  const {
    vendors: allVendors,
    fetchVendors
  } = useVendorStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [leadMOMs, setLeadMOMs] = useState([]);

  // Tabs state
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'pending');

  // Disposition state
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Store products for equipment dropdowns
  const [storeProducts, setStoreProducts] = useState([]);

  // Vendor type state (when FEASIBLE is selected)
  const [vendorType, setVendorType] = useState('');
  const defaultEquipment = () => ({ modelId: '', modelNumber: '', unitPrice: 0, quantity: '', total: 0 });

  // Track which materials have been added per vendor type (dynamic add)
  const ALL_MATERIALS = [
    { field: 'fiberRequired', label: 'Fiber', category: 'FIBER', unit: 'mtr' },
    { field: 'switch', label: 'Switch', category: 'SWITCH', unit: 'nos' },
    { field: 'sfp', label: 'SFP', category: 'SFP', unit: 'nos' },
    { field: 'closure', label: 'Closure', category: 'CLOSURE', unit: 'nos' },
    { field: 'patchChord', label: 'Patch Chord', category: 'PATCH_CORD', unit: 'nos' },
    { field: 'rf', label: 'RF', category: 'RF', unit: 'nos' },
    { field: 'mediaConverter', label: 'Media Converter', category: 'MEDIA_CONVERTER', unit: 'nos' },
    { field: 'router', label: 'Router', category: 'ROUTER', unit: 'nos' },
  ];
  // For fiberVendor/commissionVendor, ownFiber replaces fiberRequired
  const ALL_MATERIALS_VENDOR = ALL_MATERIALS.map(m => m.field === 'fiberRequired' ? { ...m, field: 'ownFiber', label: 'Own Fiber' } : m);

  const [addedMaterials, setAddedMaterials] = useState({
    ownNetwork: [],
    fiberVendor: [],
    commissionVendor: [],
    telco: [],
  });

  const handleAddMaterial = (vType, field) => {
    if (!field) return;
    setAddedMaterials(prev => ({
      ...prev,
      [vType]: [...(prev[vType] || []), field]
    }));
  };

  const handleRemoveMaterial = (vType, field) => {
    setAddedMaterials(prev => ({
      ...prev,
      [vType]: (prev[vType] || []).filter(f => f !== field)
    }));
    // Clear the equipment data
    updateEquipmentField(vType, field, { modelId: '', modelNumber: '', unitPrice: 0, quantity: '', total: 0 });
  };

  const [vendorData, setVendorData] = useState({
    // Own Network fields
    ownNetwork: {
      popLocation: '',
      popLatitude: '',
      popLongitude: '',
      fiberRequired: defaultEquipment(),
      switch: defaultEquipment(),
      sfp: defaultEquipment(),
      closure: defaultEquipment(),
      patchChord: defaultEquipment(),
      rf: defaultEquipment(),
      capex: 0
    },
    // Fiber Vendor fields
    fiberVendor: {
      popLocation: '',
      popLatitude: '',
      popLongitude: '',
      vendorName: '',
      vendorDetails: null,
      fiberRequired: defaultEquipment(),
      perMtrCost: '',
      switch: defaultEquipment(),
      sfp: defaultEquipment(),
      closure: defaultEquipment(),
      patchChord: defaultEquipment(),
      capex: 0,
      opex: 0
    },
    // Commission Vendor fields
    commissionVendor: {
      popLocation: '',
      popLatitude: '',
      popLongitude: '',
      vendorName: '',
      vendorDetails: null,
      percentage: '',
      switch: defaultEquipment(),
      sfp: defaultEquipment(),
      closure: defaultEquipment(),
      patchChord: defaultEquipment(),
      capex: 0,
      opex: 0
    },
    // Third Party fields
    thirdParty: {
      popLocation: '',
      popLatitude: '',
      popLongitude: '',
      vendorName: '',
      vendorDetails: null,
      bandwidth: '',
      arc: '',
      otc: ''
    },
    // Telco fields
    telco: {
      popLocation: '',
      popLatitude: '',
      popLongitude: '',
      provider: '',
      p2pCapacity: '',
      perMbCost: '',
      fiberMtrReq: '',
      costPerMtr: '',
      fiberRequired: defaultEquipment(),
      vendorName: '',
      vendorDetails: null,
      switch: defaultEquipment(),
      sfp: defaultEquipment(),
      closure: defaultEquipment(),
      patchChord: defaultEquipment(),
      rf: defaultEquipment(),
      capex: 0,
      opex: 0
    }
  });

  const VENDOR_TYPES = [
    { id: 'ownNetwork', label: 'Own Network', description: 'Use internal infrastructure' },
    { id: 'fiberVendor', label: 'Fiber Vendor', description: 'Third-party fiber provider' },
    { id: 'commissionVendor', label: 'Commission Vendor', description: 'Commission-based vendor' },
    { id: 'thirdParty', label: 'Third Party', description: 'External third-party service' },
    { id: 'telco', label: 'Telco', description: 'Telecom provider (Airtel, TCL, etc.)' }
  ];

  const TELCO_PROVIDERS = ['Airtel', 'TCL', 'Vodafone', 'Sify', 'TTSL'];

  // Map vendor type to VendorCategory for filtered dropdowns
  const VENDOR_TYPE_CATEGORY_MAP = {
    fiberVendor: 'FIBER',
    commissionVendor: 'COMMISSION',
    thirdParty: 'THIRD_PARTY',
    telco: 'CHANNEL_PARTNER'
  };

  // Get filtered vendors for a specific vendor type
  const getVendorsForType = (vendorTypeId) => {
    const category = VENDOR_TYPE_CATEGORY_MAP[vendorTypeId];
    if (!category) return allVendors;
    return allVendors.filter(v => v.category === category);
  };

  // Create Vendor modal state

  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);

  // POP Location state
  const [popLocations, setPopLocations] = useState([]);
  const [showPopDropdown, setShowPopDropdown] = useState(false);
  const [showAddPopModal, setShowAddPopModal] = useState(false);
  const [newPopName, setNewPopName] = useState('');
  const [newPopLat, setNewPopLat] = useState('');
  const [newPopLng, setNewPopLng] = useState('');
  const [popSaving, setPopSaving] = useState(false);

  const handlePopSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setPopLocations([]);
      setShowPopDropdown(false);
      return;
    }
    try {
      const res = await api.get(`/pop-locations?search=${encodeURIComponent(query.trim())}`);
      setPopLocations(res.data.locations || []);
      setShowPopDropdown(true);
    } catch (e) {
      console.error('POP search error:', e);
    }
  };

  const handleAddPop = async () => {
    if (!newPopName.trim()) {
      toast.error('POP name is required');
      return;
    }
    setPopSaving(true);
    try {
      const res = await api.post('/pop-locations', {
        name: newPopName.trim(),
        latitude: newPopLat || null,
        longitude: newPopLng || null,
      });
      const pop = res.data.location;
      toast.success(`POP "${pop.name}" created`);
      setShowAddPopModal(false);
      // Auto-fill the current vendor type's POP fields
      if (vendorType) {
        updateVendorField(vendorType, 'popLocation', pop.name);
        updateVendorField(vendorType, 'popLatitude', pop.latitude ? String(pop.latitude) : '');
        updateVendorField(vendorType, 'popLongitude', pop.longitude ? String(pop.longitude) : '');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create POP');
    } finally {
      setPopSaving(false);
    }
  };

  const openCreateVendorModal = () => {
    setShowCreateVendorModal(true);
  };

  useModal(showDetailsModal, () => setShowDetailsModal(false));
  useModal(showDispositionDialog, () => !isSaving && setShowDispositionDialog(false));

  // Redirect non-FT users
  useEffect(() => {
    if (user && !canAccessFeasibility) {
      router.push('/dashboard');
    }
  }, [user, canAccessFeasibility, router]);

  useSocketRefresh(fetchFeasibilityQueue, { enabled: canAccessFeasibility });

  // Fetch review counts on initial load (for tab badges)
  useEffect(() => {
    if (canAccessFeasibility) {
      fetchFeasibilityReviewHistory('all'); // Fetch counts for approved/rejected tabs
    }
  }, [canAccessFeasibility, fetchFeasibilityReviewHistory]);

  // Fetch vendors for dropdown
  useEffect(() => {
    if (canAccessFeasibility) {
      fetchVendors('', true, 'PENDING_ACCOUNTS,APPROVED'); // Fetch admin-approved + fully-approved vendors
    }
  }, [canAccessFeasibility, fetchVendors]);

  // Fetch store products for equipment dropdowns
  useEffect(() => {
    if (canAccessFeasibility) {
      api.get('/store/products').then(res => setStoreProducts(res.data)).catch(() => {});
    }
  }, [canAccessFeasibility]);

  // Helper: filter products by category
  const getProductsByCategory = (category) => storeProducts.filter(p => p.category === category);

  // Category mapping: equipment field name → StoreProductType
  const EQUIPMENT_CATEGORY_MAP = {
    fiberRequired: 'FIBER',
    ownFiber: 'FIBER',
    switch: 'SWITCH',
    sfp: 'SFP',
    closure: 'CLOSURE',
    patchChord: 'PATCH_CORD',
    rf: 'RF',
    mediaConverter: 'MEDIA_CONVERTER',
    router: 'ROUTER'
  };

  const EQUIPMENT_FIELDS = ['fiberRequired', 'ownFiber', 'switch', 'sfp', 'closure', 'patchChord', 'rf', 'mediaConverter', 'router'];

  // Fetch data based on active tab
  useEffect(() => {
    if (canAccessFeasibility) {
      if (activeTab === 'pending') {
        fetchFeasibilityQueue();
      } else {
        fetchFeasibilityReviewHistory(activeTab === 'approved' ? 'approved' : 'rejected');
      }
    }
  }, [canAccessFeasibility, activeTab, fetchFeasibilityQueue, fetchFeasibilityReviewHistory]);

  const resetDecision = () => {
    setDecision('');
    setNotes('');
    setVendorType('');
    setVendorData({
      ownNetwork: { popLocation: '', popLatitude: '', popLongitude: '', fiberRequired: defaultEquipment(), switch: defaultEquipment(), sfp: defaultEquipment(), closure: defaultEquipment(), patchChord: defaultEquipment(), rf: defaultEquipment(), mediaConverter: defaultEquipment(), router: defaultEquipment(), capex: 0 },
      fiberVendor: { popLocation: '', popLatitude: '', popLongitude: '', vendorName: '', vendorDetails: null, fiberRequired: defaultEquipment(), perMtrCost: '', ownFiber: defaultEquipment(), switch: defaultEquipment(), sfp: defaultEquipment(), closure: defaultEquipment(), patchChord: defaultEquipment(), mediaConverter: defaultEquipment(), router: defaultEquipment(), capex: 0, opex: 0 },
      commissionVendor: { popLocation: '', popLatitude: '', popLongitude: '', vendorName: '', vendorDetails: null, percentage: '', ownFiber: defaultEquipment(), switch: defaultEquipment(), sfp: defaultEquipment(), closure: defaultEquipment(), patchChord: defaultEquipment(), mediaConverter: defaultEquipment(), router: defaultEquipment(), capex: 0, opex: 0 },
      thirdParty: { popLocation: '', popLatitude: '', popLongitude: '', vendorName: '', vendorDetails: null, bandwidth: '', arc: '', otc: '' },
      telco: { popLocation: '', popLatitude: '', popLongitude: '', provider: '', p2pCapacity: '', perMbCost: '', fiberMtrReq: '', costPerMtr: '', fiberRequired: defaultEquipment(), ownFiber: defaultEquipment(), vendorName: '', vendorDetails: null, switch: defaultEquipment(), sfp: defaultEquipment(), closure: defaultEquipment(), patchChord: defaultEquipment(), rf: defaultEquipment(), mediaConverter: defaultEquipment(), router: defaultEquipment(), capex: 0, opex: 0 }
    });
  };

  // Update vendor data helper function
  const updateVendorField = (type, field, value) => {
    setVendorData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  // Update equipment field (model selection or quantity change)
  const updateEquipmentField = (vendorTypeKey, fieldName, updates) => {
    setVendorData(prev => {
      const current = prev[vendorTypeKey][fieldName] || defaultEquipment();
      const updated = { ...current, ...updates };
      // Recalculate total
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.unitPrice) || 0;
      updated.total = qty * price;
      return {
        ...prev,
        [vendorTypeKey]: {
          ...prev[vendorTypeKey],
          [fieldName]: updated
        }
      };
    });
  };

  // Auto-calculate CAPEX (and OPEX for fiberVendor) from equipment totals
  useEffect(() => {
    const types = ['ownNetwork', 'fiberVendor', 'commissionVendor', 'telco'];
    let hasChange = false;
    const newData = { ...vendorData };
    types.forEach(type => {
      const data = vendorData[type];
      if (!data) return;
      let capexTotal = 0;
      EQUIPMENT_FIELDS.forEach(field => {
        if (data[field] && typeof data[field] === 'object' && data[field].total !== undefined) {
          // For fiberVendor: fiberRequired cost goes to OPEX, not CAPEX
          if (type === 'fiberVendor' && field === 'fiberRequired') return;
          capexTotal += data[field].total || 0;
        }
      });
      capexTotal = Math.round(capexTotal * 100) / 100;

      let updated = { ...data };
      if (data.capex !== capexTotal) {
        updated.capex = capexTotal;
        hasChange = true;
      }

      // For fiberVendor: OPEX = fiber quantity × perMtrCost (auto-calculated)
      if (type === 'fiberVendor') {
        const fiberQty = parseFloat(data.fiberRequired?.quantity) || 0;
        const perMtr = parseFloat(data.perMtrCost) || 0;
        const opexTotal = Math.round(fiberQty * perMtr * 100) / 100;
        if (data.opex !== opexTotal) {
          updated.opex = opexTotal;
          hasChange = true;
        }
      }

      // For commissionVendor: OPEX = percentage × tentativePrice/arcAmount from lead (auto-calculated)
      if (type === 'commissionVendor' && selectedLead) {
        const pct = parseFloat(data.percentage) || 0;
        const arc = parseFloat(selectedLead.tentativePrice) || parseFloat(selectedLead.arcAmount) || 0;
        const opexTotal = Math.round(pct * arc / 100 * 100) / 100;
        if (data.opex !== opexTotal) {
          updated.opex = opexTotal;
          hasChange = true;
        }
      }

      // For telco: OPEX = (p2pCapacity × perMbCost) + (fiberMtrReq × costPerMtr)
      if (type === 'telco') {
        const capacity = parseFloat(data.p2pCapacity) || 0;
        const perMb = parseFloat(data.perMbCost) || 0;
        const fiberMtr = parseFloat(data.fiberMtrReq) || 0;
        const costMtr = parseFloat(data.costPerMtr) || 0;
        const opexTotal = Math.round((capacity * perMb + fiberMtr * costMtr) * 100) / 100;
        if (data.opex !== opexTotal) {
          updated.opex = opexTotal;
          hasChange = true;
        }
      }

      if (hasChange) {
        newData[type] = updated;
      }
    });
    if (hasChange) {
      setVendorData(newData);
    }
  }, [
    vendorData.ownNetwork?.fiberRequired, vendorData.ownNetwork?.switch, vendorData.ownNetwork?.sfp, vendorData.ownNetwork?.closure, vendorData.ownNetwork?.patchChord, vendorData.ownNetwork?.rf, vendorData.ownNetwork?.mediaConverter, vendorData.ownNetwork?.router,
    vendorData.fiberVendor?.fiberRequired, vendorData.fiberVendor?.perMtrCost, vendorData.fiberVendor?.ownFiber, vendorData.fiberVendor?.switch, vendorData.fiberVendor?.sfp, vendorData.fiberVendor?.closure, vendorData.fiberVendor?.patchChord, vendorData.fiberVendor?.mediaConverter, vendorData.fiberVendor?.router,
    vendorData.commissionVendor?.percentage, vendorData.commissionVendor?.ownFiber, vendorData.commissionVendor?.switch, vendorData.commissionVendor?.sfp, vendorData.commissionVendor?.closure, vendorData.commissionVendor?.patchChord, vendorData.commissionVendor?.mediaConverter, vendorData.commissionVendor?.router, selectedLead?.tentativePrice, selectedLead?.arcAmount,
    vendorData.telco?.fiberRequired, vendorData.telco?.ownFiber, vendorData.telco?.switch, vendorData.telco?.sfp, vendorData.telco?.closure, vendorData.telco?.patchChord, vendorData.telco?.rf, vendorData.telco?.mediaConverter, vendorData.telco?.router, vendorData.telco?.p2pCapacity, vendorData.telco?.perMbCost, vendorData.telco?.fiberMtrReq, vendorData.telco?.costPerMtr
  ]);

  const handleViewDetails = async (lead) => {
    setSelectedLead(lead);
    const result = await getLeadMOMs(lead.id);
    if (result.success) {
      setLeadMOMs(result.moms || []);
    }
    setShowDetailsModal(true);
  };

  const handleOpenDisposition = (lead) => {
    setSelectedLead(lead);
    resetDecision();
    setShowDispositionDialog(true);
  };

  const handleSubmitDisposition = async () => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    if (decision === 'NOT_FEASIBLE' && !notes.trim()) {
      toast.error('Notes are required when marking as not feasible');
      return;
    }

    if (decision === 'FEASIBLE' && !vendorType) {
      toast.error('Please select a vendor type');
      return;
    }

    setIsSaving(true);

    // Build the simplified payload — vendor type + tentative pricing + POP + description
    const currentVD = decision === 'FEASIBLE' ? vendorData[vendorType] : null;
    const result = await feasibilityDisposition(selectedLead.id, {
      decision,
      notes: notes.trim() || null,
      vendorType: decision === 'FEASIBLE' ? vendorType : undefined,
      tentativeCapex: currentVD?.capex || null,
      tentativeOpex: currentVD?.opex || null,
      feasibilityDescription: currentVD?.description || null,
      popLocation: currentVD?.popLocation || null,
      popLatitude: currentVD?.popLatitude || null,
      popLongitude: currentVD?.popLongitude || null,
    });

    if (result.success) {
      setShowDispositionDialog(false);
      setSelectedLead(null);
      toast.success(result.message || 'Decision saved');
      fetchFeasibilityQueue();
      // Refresh counts
      fetchFeasibilityReviewHistory('approved');
    } else {
      toast.error(result.error || 'Failed to save decision');
    }

    setIsSaving(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  // Get current list based on active tab
  const currentList = activeTab === 'pending' ? feasibilityQueue : feasibilityReviewHistory;

  if (!canAccessFeasibility) {
    return null;
  }

  // Build columns based on active tab
  const getColumns = () => {
    const columns = [
      {
        key: 'company',
        label: 'Company',
        render: (lead) => (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
              {lead.campaign?.code === 'SAM-GENERATED' ? (
                <span className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] px-1.5 py-0 rounded">
                  SAM Generated {lead.dataCreatedBy?.name ? `(${lead.dataCreatedBy.name})` : ''}
                </span>
              ) : lead.isCustomerReferral ? (
                <span className="flex-shrink-0 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] px-1.5 py-0 rounded">
                  Customer Referral
                </span>
              ) : (lead.isSelfGenerated || lead.campaign?.name?.startsWith('[Self]')) && (
                <span className="flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 rounded">
                  {lead.dataCreatedBy?.name || 'Self'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name}</p>
            {lead.phone && (
              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Phone size={10} />
                {lead.phone}
              </span>
            )}
          </div>
        )
      },
      {
        key: 'location',
        label: 'To (Customer)',
        render: (lead) => (
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2" title={lead.fullAddress || lead.location || lead.city}>
              {lead.fullAddress || lead.location || lead.city || '-'}
            </p>
            {lead.latitude && lead.longitude && (
              <a
                href={`https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Navigation size={10} />
                Map
              </a>
            )}
          </div>
        )
      }
    ];

    // POP Location column only for approved/rejected tabs
    if (activeTab !== 'pending') {
      columns.push({
        key: 'popLocation',
        label: 'POP Location',
        render: (lead) => (
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2" title={lead.fromAddress}>
              {lead.fromAddress || '-'}
            </p>
            {lead.fromLatitude && lead.fromLongitude && (
              <a
                href={`https://www.google.com/maps?q=${lead.fromLatitude},${lead.fromLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Navigation size={10} />
                Map
              </a>
            )}
          </div>
        )
      });
    }

    columns.push(
      {
        key: 'bandwidth',
        label: 'BW / IPs',
        render: (lead) => (
          <div className="flex flex-col items-center gap-1">
            {lead.bandwidthRequirement ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs font-medium">
                <Wifi size={10} />
                {lead.bandwidthRequirement}
              </span>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
            {lead.numberOfIPs && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded text-xs font-medium">
                <Hash size={10} />
                {lead.numberOfIPs} IPs
              </span>
            )}
          </div>
        )
      },
      {
        key: 'interestLevel',
        label: 'Interest',
        render: (lead) => lead.interestLevel ? (
          <Badge className={`text-xs font-medium ${
            lead.interestLevel === 'HOT'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : lead.interestLevel === 'WARM'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            {lead.interestLevel}
          </Badge>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )
      },
      {
        key: 'assignedBy',
        label: 'By',
        render: (lead) => (
          <div className="space-y-0.5 text-center">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {lead.bdm?.name || '-'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {getTimeAgo(activeTab === 'pending' ? lead.updatedAt : lead.feasibilityReviewedAt)}
            </p>
          </div>
        )
      }
    );

    return columns;
  };

  const getTableTitle = () => {
    if (activeTab === 'pending') return 'Pending Reviews';
    if (activeTab === 'approved') return 'Approved Leads';
    return 'Rejected Leads';
  };

  const getEmptyMessage = () => {
    if (activeTab === 'pending') return 'All caught up! No pending feasibility reviews.';
    if (activeTab === 'approved') return 'No approved leads yet. Approved leads will appear here.';
    return 'No rejected leads. Rejected leads will appear here.';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Feasibility Queue" description="Review and verify location feasibility for service delivery">
        {isBDMTeamLeader && (
          <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs">
            Read-Only View
          </Badge>
        )}
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard color="amber" icon={Clock} label="Pending" value={feasibilityStats.pending || 0} />
        <StatCard color="emerald" icon={CheckCircle} label="Approved" value={feasibilityStats.totalApproved || 0} />
        <StatCard color="red" icon={XCircle} label="Rejected" value={feasibilityStats.totalRejected || 0} />
        <StatCard color="orange" icon={TrendingUp} label="Approval Rate" value={`${feasibilityStats.approvalRate || 0}%`} />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'pending', label: 'Pending', count: feasibilityStats.pending || 0, icon: Clock, variant: 'warning' },
          { key: 'approved', label: 'Approved', count: feasibilityStats.totalApproved || 0, icon: CheckCircle, variant: 'success' },
          { key: 'rejected', label: 'Rejected', count: feasibilityStats.totalRejected || 0, icon: XCircle, variant: 'danger' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Queue List */}
      <DataTable
        title={getTableTitle()}
        totalCount={currentList.length}
        columns={getColumns()}
        data={currentList}
        pagination={true}
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage={getEmptyMessage()}
        emptyIcon={Search}
        searchable={true}
        searchPlaceholder="Search by company, name, or phone..."
        searchKeys={['company', 'name', 'phone']}
        actions={(lead) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(lead)}
              className="h-8 px-3 border-slate-200 dark:border-slate-700 text-xs"
            >
              <FileText size={12} className="mr-1.5" />
              Details
            </Button>
            {activeTab === 'pending' && !isBDMTeamLeader && (
              <Button
                size="sm"
                onClick={() => handleOpenDisposition(lead)}
                className="h-8 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs"
              >
                Review
              </Button>
            )}
            {activeTab !== 'pending' && (
              <Badge className={`text-xs ${
                lead.status === 'FEASIBLE'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {lead.status === 'FEASIBLE' ? 'Approved' : 'Rejected'}
              </Badge>
            )}
          </div>
        )}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Lead Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLead.company}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Status Badge (for reviewed leads) */}
              {selectedLead.status && ['FEASIBLE', 'NOT_FEASIBLE'].includes(selectedLead.status) && (
                <div className="space-y-4">
                  {/* Status Header */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${
                    selectedLead.status === 'FEASIBLE'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    {selectedLead.status === 'FEASIBLE' ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                        <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                        <XCircle size={20} className="text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${
                        selectedLead.status === 'FEASIBLE'
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}>
                        {selectedLead.status === 'FEASIBLE' ? 'Approved - Feasible' : 'Rejected - Not Feasible'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reviewed {formatDate(selectedLead.feasibilityReviewedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Feasibility Details */}
                  {selectedLead.feasibilityNotes && (() => {
                    let parsed = null;
                    try { parsed = JSON.parse(selectedLead.feasibilityNotes); } catch { /* plain text */ }

                    if (!parsed) {
                      return (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Notes:</span> {selectedLead.feasibilityNotes}
                          </p>
                        </div>
                      );
                    }

                    const vd = parsed.vendorDetails || {};
                    const VENDOR_LABELS = { ownNetwork: 'Own Network', fiberVendor: 'Fiber Vendor', commissionVendor: 'Commission Vendor', thirdParty: 'Third Party', telco: 'Telco' };
                    const equipFields = ['fiberRequired', 'switch', 'sfp', 'closure', 'patchChord', 'rf'];
                    const equipLabels = { fiberRequired: 'Fiber', switch: 'Switch', sfp: 'SFP', closure: 'Closure', patchChord: 'Patch Chord', rf: 'RF' };

                    return (
                      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Vendor Type & POP row */}
                        <div className="px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendor</span>
                            <Badge variant="outline" className="text-xs font-medium">{VENDOR_LABELS[parsed.vendorType] || parsed.vendorType}</Badge>
                          </div>
                          {vd.popLocation && (
                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1">
                              <Navigation size={12} className="text-blue-500" />
                              <span className="text-[11px] font-bold text-blue-500 uppercase">POP:</span>
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{vd.popLocation}</span>
                            </div>
                          )}
                        </div>

                        <div className="p-3 sm:p-4 space-y-3">
                          {/* CAPEX / OPEX Summary - shown at top */}
                          <div className="grid grid-cols-2 gap-2">
                            {vd.opex !== undefined && vd.opex !== null && vd.opex !== '' && (
                              <div className="flex items-center justify-between p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">OPEX</span>
                                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">₹{(parseFloat(vd.opex) || 0).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {vd.capex !== undefined && vd.capex !== null && (
                              <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">CAPEX</span>
                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">₹{(vd.capex || 0).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>

                          {/* Equipment Table */}
                          {equipFields.some(f => vd[f] && typeof vd[f] === 'object' && vd[f].modelNumber) && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
                              <table className="w-full text-xs min-w-[400px]">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                                    <th className="text-left px-2 sm:px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Item</th>
                                    <th className="text-left px-2 sm:px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Model</th>
                                    <th className="text-right px-2 sm:px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Rate</th>
                                    <th className="text-right px-2 sm:px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Qty</th>
                                    <th className="text-right px-2 sm:px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {equipFields.map(f => {
                                    const eq = vd[f];
                                    if (!eq || typeof eq !== 'object' || !eq.modelNumber) return null;
                                    return (
                                      <tr key={f} className="border-t border-slate-100 dark:border-slate-700/50">
                                        <td className="px-2 sm:px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{equipLabels[f]}</td>
                                        <td className="px-2 sm:px-3 py-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{eq.modelNumber}</td>
                                        <td className="px-2 sm:px-3 py-2 text-right text-slate-600 dark:text-slate-300">₹{(eq.unitPrice || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-2 sm:px-3 py-2 text-right text-slate-700 dark:text-slate-200 font-medium">{eq.quantity || 0}</td>
                                        <td className="px-2 sm:px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">₹{(eq.total || 0).toLocaleString('en-IN')}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Fiber Vendor: perMtrCost row */}
                          {parsed.vendorType === 'fiberVendor' && vd.perMtrCost && (
                            <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/30 rounded-lg px-3 py-2">
                              <span className="text-slate-500 dark:text-slate-400">Fiber:</span>
                              <span className="text-slate-700 dark:text-slate-300">{vd.fiberRequired?.quantity || 0} mtr × ₹{vd.perMtrCost}/mtr</span>
                              <span className="text-slate-400">=</span>
                              <span className="font-bold text-slate-900 dark:text-white">₹{((parseFloat(vd.fiberRequired?.quantity) || 0) * (parseFloat(vd.perMtrCost) || 0)).toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          {/* Commission Vendor: percentage */}
                          {parsed.vendorType === 'commissionVendor' && vd.percentage && (
                            <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/30 rounded-lg px-3 py-2">
                              <span className="text-slate-500 dark:text-slate-400">Commission:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{vd.percentage}%</span>
                              {selectedLead.arcAmount && <span className="text-slate-400">of ₹{selectedLead.arcAmount.toLocaleString('en-IN')} (ARC)</span>}
                            </div>
                          )}

                          {/* Third Party specific fields */}
                          {parsed.vendorType === 'thirdParty' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {vd.bandwidth && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Bandwidth</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vd.bandwidth}</p>
                                </div>
                              )}
                              {vd.arc && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">ARC</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">₹{parseFloat(vd.arc).toLocaleString('en-IN')}</p>
                                </div>
                              )}
                              {vd.otc && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">OTC</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">₹{parseFloat(vd.otc).toLocaleString('en-IN')}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Telco P2P details */}
                          {parsed.vendorType === 'telco' && (vd.provider || vd.p2pCapacity) && (
                            <div className="grid grid-cols-2 gap-2">
                              {vd.provider && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Provider</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vd.provider}</p>
                                </div>
                              )}
                              {vd.p2pCapacity && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">P2P Capacity</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vd.p2pCapacity}</p>
                                </div>
                              )}
                              {vd.perMbCost && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Per MB Cost</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">₹{parseFloat(vd.perMbCost).toLocaleString('en-IN')}</p>
                                </div>
                              )}
                              {vd.fiberMtrReq && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Fiber Mtr Req</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vd.fiberMtrReq}</p>
                                </div>
                              )}
                              {vd.costPerMtr && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Cost Per Mtr</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">₹{parseFloat(vd.costPerMtr).toLocaleString('en-IN')}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Additional Notes */}
                          {parsed.additionalNotes && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
                              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Notes</p>
                              <p className="text-sm text-slate-800 dark:text-slate-200">{parsed.additionalNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Customer Location */}
              <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Customer Location</h4>
                </div>
                <div className="p-4 space-y-3">
                  {selectedLead.fullAddress ? (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Installation Address</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                        {selectedLead.fullAddress}
                      </p>
                    </div>
                  ) : selectedLead.location ? (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                        {selectedLead.location}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedLead.city || 'Not provided'}
                      {selectedLead.state && `, ${selectedLead.state}`}
                    </p>
                  )}

                  {selectedLead.latitude && selectedLead.longitude && (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {selectedLead.latitude.toFixed(6)}, {selectedLead.longitude.toFixed(6)}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${selectedLead.latitude},${selectedLead.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                      >
                        <Navigation size={11} />
                        Open Map
                        <ExternalLink size={9} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Address */}
              {(selectedLead.billingAddress || selectedLead.billingPincode) && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Billing Address
                  </h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {selectedLead.billingAddress || '-'}
                    {selectedLead.billingPincode && <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">({selectedLead.billingPincode})</span>}
                  </p>
                </div>
              )}

              {/* Expected Delivery Date */}
              {selectedLead.expectedDeliveryDate && (
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    Expected Delivery Date
                  </h4>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Service Requirements: Bandwidth, IPs & Interest Level */}
              {(selectedLead.bandwidthRequirement || selectedLead.numberOfIPs || selectedLead.interestLevel) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {selectedLead.bandwidthRequirement && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
                        <Wifi size={16} />
                        Bandwidth
                      </h4>
                      <p className="text-slate-900 dark:text-slate-100 font-medium">
                        {selectedLead.bandwidthRequirement}
                      </p>
                    </div>
                  )}
                  {selectedLead.numberOfIPs && (
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                      <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 mb-2 flex items-center gap-2">
                        <Hash size={16} />
                        Number of IPs
                      </h4>
                      <p className="text-slate-900 dark:text-slate-100 font-medium">
                        {selectedLead.numberOfIPs}
                      </p>
                    </div>
                  )}
                  {selectedLead.interestLevel && (
                    <div className={`p-4 rounded-xl border ${
                      selectedLead.interestLevel === 'HOT'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : selectedLead.interestLevel === 'WARM'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                      <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                        selectedLead.interestLevel === 'HOT'
                          ? 'text-red-800 dark:text-red-300'
                          : selectedLead.interestLevel === 'WARM'
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-blue-800 dark:text-blue-300'
                      }`}>
                        <TrendingUp size={16} />
                        Interest Level
                      </h4>
                      <Badge className={`text-sm font-semibold ${
                        selectedLead.interestLevel === 'HOT'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : selectedLead.interestLevel === 'WARM'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {selectedLead.interestLevel}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Company</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedLead.company}</p>
                    {selectedLead.industry && (
                      <p className="text-sm text-slate-500">{selectedLead.industry}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Contact</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium">{selectedLead.name}</p>
                    <p className="text-sm text-slate-500">{selectedLead.title}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                    <a href={`tel:${selectedLead.phone}`} className="text-slate-900 dark:text-slate-100 hover:text-orange-600">
                      {selectedLead.phone || '-'}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <a href={`mailto:${selectedLead.email}`} className="text-slate-900 dark:text-slate-100 hover:text-orange-600 truncate block">
                      {selectedLead.email || '-'}
                    </a>
                  </div>
                </div>
              </div>

              {/* BDM & Campaign Info */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Assigned by:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.bdm?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-500 dark:text-slate-400">Campaign:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.campaign?.name || '-'}</span>
                </div>
              </div>

              {/* Products */}
              {selectedLead.products?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Package size={16} />
                    Products of Interest
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.products.map(p => (
                      <Badge key={p.id} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements/Notes */}
              {selectedLead.requirements && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                    Important Notes About This Lead
                  </h4>
                  <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {selectedLead.requirements}
                  </div>
                </div>
              )}

              {/* MOMs */}
              {leadMOMs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Meeting Notes ({leadMOMs.length})
                  </h4>
                  <div className="space-y-3">
                    {leadMOMs.map(mom => (
                      <div key={mom.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {new Date(mom.meetingDate).toLocaleDateString()}
                          </p>
                          {mom.attendees && (
                            <p className="text-xs text-slate-500">{mom.attendees}</p>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{mom.discussion}</p>
                        {mom.nextSteps && (
                          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                            Next: {mom.nextSteps}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Close
              </Button>
              {activeTab === 'pending' && !isBDMTeamLeader && (
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenDisposition(selectedLead);
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Review Lead
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disposition Dialog */}
      {!isBDMTeamLeader && showDispositionDialog && selectedLead && (
        <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Feasibility Review</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedLead.company}
                </p>
              </div>
              <button
                onClick={() => setShowDispositionDialog(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Decision Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Can we provide service at this location? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setDecision('FEASIBLE');
                      setVendorType(''); // Reset vendor type when switching decision
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      decision === 'FEASIBLE'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <CheckCircle size={28} />
                    <span className="font-medium">Yes, Feasible</span>
                  </button>
                  <button
                    onClick={() => {
                      setDecision('NOT_FEASIBLE');
                      setVendorType(''); // Reset vendor type
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      decision === 'NOT_FEASIBLE'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                  >
                    <XCircle size={28} />
                    <span className="font-medium">Not Feasible</span>
                  </button>
                </div>
              </div>

              {/* Simplified Feasibility Fields (vendor setup moved to delivery) */}
              {decision === 'FEASIBLE' && (
                <div className="space-y-4">
                  {/* Vendor Type Selection — just the type, no vendor creation at this stage */}
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Vendor Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {VENDOR_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setVendorType(type.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${
                          vendorType === type.id
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                      >
                        <span className="font-medium text-sm">{type.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* POP Location — moved out of vendor-specific sections */}
                  {vendorType && (
                    <div className="mt-4 space-y-4">
                      {/* POP Location - Searchable dropdown with Add New */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">POP Location</p>
                        <div className="space-y-3">
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">POP Location Name</label>
                            <input
                              type="text"
                              value={vendorData[vendorType]?.popLocation || ''}
                              onChange={(e) => {
                                updateVendorField(vendorType, 'popLocation', e.target.value);
                                handlePopSearch(e.target.value);
                              }}
                              onBlur={() => setTimeout(() => setShowPopDropdown(false), 200)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                              placeholder="Type min 2 chars to search..."
                              autoComplete="off"
                            />
                            {showPopDropdown && popLocations.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-52 overflow-auto">
                                {popLocations.map((pop) => (
                                  <button
                                    key={pop.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-2"
                                    onClick={() => {
                                      updateVendorField(vendorType, 'popLocation', pop.name);
                                      updateVendorField(vendorType, 'popLatitude', pop.latitude ? String(pop.latitude) : '');
                                      updateVendorField(vendorType, 'popLongitude', pop.longitude ? String(pop.longitude) : '');
                                      setShowPopDropdown(false);
                                    }}
                                  >
                                    <MapPin size={14} className="text-blue-500 flex-shrink-0" />
                                    <span className="font-medium truncate">{pop.name}</span>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2"
                                  onClick={() => {
                                    setShowPopDropdown(false);
                                    setShowAddPopModal(true);
                                    setNewPopName(vendorData[vendorType]?.popLocation || '');
                                    setNewPopLat('');
                                    setNewPopLng('');
                                  }}
                                >
                                  <Plus size={14} className="text-blue-500" />
                                  Add New POP
                                </button>
                              </div>
                            )}
                            {showPopDropdown && popLocations.length === 0 && vendorData[vendorType]?.popLocation?.length >= 2 && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
                                <div className="px-3 py-2.5 text-xs text-slate-400">No matching POP found</div>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2"
                                  onClick={() => {
                                    setShowPopDropdown(false);
                                    setShowAddPopModal(true);
                                    setNewPopName(vendorData[vendorType]?.popLocation || '');
                                    setNewPopLat('');
                                    setNewPopLng('');
                                  }}
                                >
                                  <Plus size={14} className="text-blue-500" />
                                  Add New POP
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Latitude</label>
                              <input
                                type="text"
                                value={vendorData[vendorType]?.popLatitude || ''}
                                onChange={(e) => updateVendorField(vendorType, 'popLatitude', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                placeholder="e.g., 28.6139"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Longitude</label>
                              <input
                                type="text"
                                value={vendorData[vendorType]?.popLongitude || ''}
                                onChange={(e) => updateVendorField(vendorType, 'popLongitude', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                placeholder="e.g., 77.2090"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tentative CAPEX & OPEX (OPEX hidden for Own Network — no external vendor cost) */}
                      <div className={`grid gap-3 ${vendorType === 'ownNetwork' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tentative CAPEX (₹)
                          </label>
                          <input
                            type="number"
                            value={vendorData[vendorType]?.capex || ''}
                            onChange={(e) => updateVendorField(vendorType, 'capex', e.target.value)}
                            placeholder="e.g. 50000"
                            className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        {vendorType !== 'ownNetwork' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Tentative OPEX (₹)
                            </label>
                            <input
                              type="number"
                              value={vendorData[vendorType]?.opex || ''}
                              onChange={(e) => updateVendorField(vendorType, 'opex', e.target.value)}
                              placeholder="e.g. 25000"
                              className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={vendorData[vendorType]?.description || ''}
                          onChange={(e) => updateVendorField(vendorType, 'description', e.target.value)}
                          rows={3}
                          placeholder="Any notes about the feasibility — fiber route, equipment needed, cost breakdown reasoning..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 resize-none"
                        />
                      </div>

                      {/* Old vendor-specific forms removed — vendor setup moved to delivery stage */}
                      {false && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-800">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">CAPEX - Equipment</span>
                            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{(vendorData.ownNetwork.capex || 0).toLocaleString('en-IN')}</span>
                          </div>

                          {/* Add Material Dropdown */}
                          {(() => {
                            const available = ALL_MATERIALS.filter(m => !(addedMaterials.ownNetwork || []).includes(m.field));
                            return available.length > 0 && (
                              <div className="flex gap-2">
                                <select
                                  id="addMaterial_ownNetwork"
                                  className="flex-1 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Select material to add...</option>
                                  {available.map(m => <option key={m.field} value={m.field}>{m.label}</option>)}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sel = document.getElementById('addMaterial_ownNetwork');
                                    if (sel?.value) { handleAddMaterial('ownNetwork', sel.value); sel.value = ''; }
                                  }}
                                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                                >
                                  + Add
                                </button>
                              </div>
                            );
                          })()}

                          {/* Added Materials */}
                          {(addedMaterials.ownNetwork || []).map(fieldKey => {
                            const mat = ALL_MATERIALS.find(m => m.field === fieldKey);
                            if (!mat) return null;
                            const { field, label, category, unit } = mat;
                            const products = getProductsByCategory(category);
                            const eq = vendorData.ownNetwork[field] || {};
                            return (
                              <div key={field} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-4">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label} - Model</label>
                                    <button type="button" onClick={() => handleRemoveMaterial('ownNetwork', field)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                                  </div>
                                  <select
                                    value={eq.modelId || ''}
                                    onChange={(e) => {
                                      const product = storeProducts.find(p => p.id === e.target.value);
                                      updateEquipmentField('ownNetwork', field, {
                                        modelId: product?.id || '',
                                        modelNumber: product?.modelNumber || '',
                                        unitPrice: product?.price || 0,
                                        quantity: eq.quantity || ''
                                      });
                                    }}
                                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                  >
                                    <option value="">Select Model</option>
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>{p.brandName} - {p.modelNumber} (₹{p.price}/{p.unit})</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-3">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty ({unit})</label>
                                  <input
                                    type="number"
                                    value={eq.quantity || ''}
                                    onChange={(e) => updateEquipmentField('ownNetwork', field, { quantity: e.target.value })}
                                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (₹)</label>
                                  <div className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-medium">
                                    ₹{(eq.total || 0).toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Fiber Vendor Fields */}
                      {false && vendorType === 'fiberVendor' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vendor</label>
                            <div className="flex gap-2">
                              <select
                                value={vendorData.fiberVendor.vendorName}
                                onChange={(e) => {
                                  const selectedVendor = getVendorsForType('fiberVendor').find(v => v.companyName === e.target.value);
                                  updateVendorField('fiberVendor', 'vendorName', e.target.value);
                                  updateVendorField('fiberVendor', 'vendorDetails', selectedVendor || null);
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                              >
                                <option value="">Select Vendor</option>
                                {getVendorsForType('fiberVendor').map((vendor) => (
                                  <option key={vendor.id} value={vendor.companyName}>{vendor.companyName}{vendor.docsStatus !== 'VERIFIED' ? ' (Docs Pending - Accounts Verification Pending)' : ''}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => openCreateVendorModal()}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <Plus size={16} />
                                New
                              </button>
                            </div>
                            {vendorData.fiberVendor.vendorDetails && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Vendor selected: {vendorData.fiberVendor.vendorDetails.companyName}
                              </p>
                            )}
                          </div>

                          {/* OPEX Section */}
                          <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-orange-200 dark:border-orange-800">
                              <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">OPEX - Fiber Cost</span>
                              <span className="text-lg font-bold text-orange-700 dark:text-orange-300">₹{(vendorData.fiberVendor.opex || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-4">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fiber Required (Mtr)</label>
                                <input
                                  type="number"
                                  value={vendorData.fiberVendor.fiberRequired?.quantity || ''}
                                  onChange={(e) => updateEquipmentField('fiberVendor', 'fiberRequired', { quantity: e.target.value })}
                                  className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Per Mtr Cost (₹)</label>
                                <input
                                  type="number"
                                  value={vendorData.fiberVendor.perMtrCost}
                                  onChange={(e) => updateVendorField('fiberVendor', 'perMtrCost', e.target.value)}
                                  className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fiber Amount (₹)</label>
                                <div className="w-full px-2 py-2 bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-medium">
                                  ₹{((parseFloat(vendorData.fiberVendor.fiberRequired?.quantity) || 0) * (parseFloat(vendorData.fiberVendor.perMtrCost) || 0)).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* CAPEX Section */}
                          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-800">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">CAPEX - Equipment</span>
                              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{(vendorData.fiberVendor.capex || 0).toLocaleString('en-IN')}</span>
                            </div>
                            {/* Add Material Dropdown */}
                            {(() => {
                              const available = ALL_MATERIALS_VENDOR.filter(m => !(addedMaterials.fiberVendor || []).includes(m.field));
                              return available.length > 0 && (
                                <div className="flex gap-2">
                                  <select
                                    id="addMaterial_fiberVendor"
                                    className="flex-1 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Select material to add...</option>
                                    {available.map(m => <option key={m.field} value={m.field}>{m.label}</option>)}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sel = document.getElementById('addMaterial_fiberVendor');
                                      if (sel?.value) { handleAddMaterial('fiberVendor', sel.value); sel.value = ''; }
                                    }}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                                  >
                                    + Add
                                  </button>
                                </div>
                              );
                            })()}

                            {/* Added Materials */}
                            {(addedMaterials.fiberVendor || []).map(fieldKey => {
                              const mat = ALL_MATERIALS_VENDOR.find(m => m.field === fieldKey);
                              if (!mat) return null;
                              const { field, label, category, unit } = mat;
                              const products = getProductsByCategory(category);
                              const eq = vendorData.fiberVendor[field] || {};
                              return (
                                <div key={field} className="grid grid-cols-12 gap-2 items-end">
                                  <div className="col-span-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label} - Model</label>
                                      <button type="button" onClick={() => handleRemoveMaterial('fiberVendor', field)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                                    </div>
                                    <select
                                      value={eq.modelId || ''}
                                      onChange={(e) => {
                                        const product = storeProducts.find(p => p.id === e.target.value);
                                        updateEquipmentField('fiberVendor', field, {
                                          modelId: product?.id || '',
                                          modelNumber: product?.modelNumber || '',
                                          unitPrice: product?.price || 0,
                                          quantity: eq.quantity || ''
                                        });
                                      }}
                                      className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                    >
                                      <option value="">Select Model</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.brandName} - {p.modelNumber} (₹{p.price}/{p.unit})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-3">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty ({unit})</label>
                                    <input
                                      type="number"
                                      value={eq.quantity || ''}
                                      onChange={(e) => updateEquipmentField('fiberVendor', field, { quantity: e.target.value })}
                                      className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="col-span-5">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (₹)</label>
                                    <div className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-medium">
                                      ₹{(eq.total || 0).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Commission Vendor Fields */}
                      {false && vendorType === 'commissionVendor' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vendor</label>
                            <div className="flex gap-2">
                              <select
                                value={vendorData.commissionVendor.vendorName}
                                onChange={(e) => {
                                  const selectedVendor = getVendorsForType('commissionVendor').find(v => v.companyName === e.target.value);
                                  updateVendorField('commissionVendor', 'vendorName', e.target.value);
                                  updateVendorField('commissionVendor', 'vendorDetails', selectedVendor || null);
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                              >
                                <option value="">Select Vendor</option>
                                {getVendorsForType('commissionVendor').map((vendor) => (
                                  <option key={vendor.id} value={vendor.companyName}>{vendor.companyName}{vendor.docsStatus !== 'VERIFIED' ? ' (Docs Pending - Accounts Verification Pending)' : ''}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => openCreateVendorModal()}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <Plus size={16} />
                                New
                              </button>
                            </div>
                            {vendorData.commissionVendor.vendorDetails && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Vendor selected: {vendorData.commissionVendor.vendorDetails.companyName}
                              </p>
                            )}
                          </div>

                          {/* OPEX Section */}
                          <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-orange-200 dark:border-orange-800">
                              <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">OPEX - Commission</span>
                              <span className="text-lg font-bold text-orange-700 dark:text-orange-300">₹{(vendorData.commissionVendor.opex || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Percentage (%)</label>
                              <input
                                type="number"
                                value={vendorData.commissionVendor.percentage}
                                onChange={(e) => updateVendorField('commissionVendor', 'percentage', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              {vendorData.commissionVendor.percentage || 0}% × ₹{(selectedLead?.tentativePrice || selectedLead?.arcAmount || 0).toLocaleString('en-IN')} (ARC)
                            </p>
                          </div>

                          {/* CAPEX Section */}
                          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-800">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">CAPEX - Equipment</span>
                              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{(vendorData.commissionVendor.capex || 0).toLocaleString('en-IN')}</span>
                            </div>
                            {/* Add Material Dropdown */}
                            {(() => {
                              const available = ALL_MATERIALS_VENDOR.filter(m => !(addedMaterials.commissionVendor || []).includes(m.field));
                              return available.length > 0 && (
                                <div className="flex gap-2">
                                  <select
                                    id="addMaterial_commissionVendor"
                                    className="flex-1 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Select material to add...</option>
                                    {available.map(m => <option key={m.field} value={m.field}>{m.label}</option>)}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sel = document.getElementById('addMaterial_commissionVendor');
                                      if (sel?.value) { handleAddMaterial('commissionVendor', sel.value); sel.value = ''; }
                                    }}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                                  >
                                    + Add
                                  </button>
                                </div>
                              );
                            })()}

                            {/* Added Materials */}
                            {(addedMaterials.commissionVendor || []).map(fieldKey => {
                              const mat = ALL_MATERIALS_VENDOR.find(m => m.field === fieldKey);
                              if (!mat) return null;
                              const { field, label, category, unit } = mat;
                              const products = getProductsByCategory(category);
                              const eq = vendorData.commissionVendor[field] || {};
                              return (
                                <div key={field} className="grid grid-cols-12 gap-2 items-end">
                                  <div className="col-span-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label} - Model</label>
                                      <button type="button" onClick={() => handleRemoveMaterial('commissionVendor', field)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                                    </div>
                                    <select
                                      value={eq.modelId || ''}
                                      onChange={(e) => {
                                        const product = storeProducts.find(p => p.id === e.target.value);
                                        updateEquipmentField('commissionVendor', field, {
                                          modelId: product?.id || '',
                                          modelNumber: product?.modelNumber || '',
                                          unitPrice: product?.price || 0,
                                          quantity: eq.quantity || ''
                                        });
                                      }}
                                      className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                    >
                                      <option value="">Select Model</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.brandName} - {p.modelNumber} (₹{p.price}/{p.unit})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-3">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty ({unit})</label>
                                    <input
                                      type="number"
                                      value={eq.quantity || ''}
                                      onChange={(e) => updateEquipmentField('commissionVendor', field, { quantity: e.target.value })}
                                      className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="col-span-5">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (₹)</label>
                                    <div className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-medium">
                                      ₹{(eq.total || 0).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Third Party Fields */}
                      {false && vendorType === 'thirdParty' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vendor</label>
                            <div className="flex gap-2">
                              <select
                                value={vendorData.thirdParty.vendorName}
                                onChange={(e) => {
                                  const selectedVendor = getVendorsForType('thirdParty').find(v => v.companyName === e.target.value);
                                  updateVendorField('thirdParty', 'vendorName', e.target.value);
                                  updateVendorField('thirdParty', 'vendorDetails', selectedVendor || null);
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                              >
                                <option value="">Select Vendor</option>
                                {getVendorsForType('thirdParty').map((vendor) => (
                                  <option key={vendor.id} value={vendor.companyName}>{vendor.companyName}{vendor.docsStatus !== 'VERIFIED' ? ' (Docs Pending - Accounts Verification Pending)' : ''}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => openCreateVendorModal()}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <Plus size={16} />
                                New
                              </button>
                            </div>
                            {vendorData.thirdParty.vendorDetails && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Vendor selected: {vendorData.thirdParty.vendorDetails.companyName}
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bandwidth</label>
                              <input
                                type="text"
                                value={vendorData.thirdParty.bandwidth}
                                onChange={(e) => updateVendorField('thirdParty', 'bandwidth', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                placeholder="e.g., 100 Mbps"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ARC</label>
                              <input
                                type="number"
                                value={vendorData.thirdParty.arc}
                                onChange={(e) => updateVendorField('thirdParty', 'arc', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">OTC</label>
                              <input
                                type="number"
                                value={vendorData.thirdParty.otc}
                                onChange={(e) => updateVendorField('thirdParty', 'otc', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Telco Fields */}
                      {false && vendorType === 'telco' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Provider</label>
                            <select
                              value={vendorData.telco.provider}
                              onChange={(e) => updateVendorField('telco', 'provider', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                            >
                              <option value="">Select Provider</option>
                              {TELCO_PROVIDERS.map((provider) => (
                                <option key={provider} value={provider}>{provider}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vendor (Optional)</label>
                            <div className="flex gap-2">
                              <select
                                value={vendorData.telco.vendorName}
                                onChange={(e) => {
                                  const selectedVendor = getVendorsForType('telco').find(v => v.companyName === e.target.value);
                                  updateVendorField('telco', 'vendorName', e.target.value);
                                  updateVendorField('telco', 'vendorDetails', selectedVendor || null);
                                }}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                              >
                                <option value="">Select Vendor (Optional)</option>
                                {getVendorsForType('telco').map((vendor) => (
                                  <option key={vendor.id} value={vendor.companyName}>{vendor.companyName}{vendor.docsStatus !== 'VERIFIED' ? ' (Docs Pending - Accounts Verification Pending)' : ''}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => openCreateVendorModal()}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <Plus size={16} />
                                New
                              </button>
                            </div>
                            {vendorData.telco.vendorDetails && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Vendor selected: {vendorData.telco.vendorDetails.companyName}
                              </p>
                            )}
                          </div>
                          {/* OPEX Section */}
                          <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-orange-200 dark:border-orange-800">
                              <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">OPEX - Recurring Cost</span>
                              <span className="text-lg font-bold text-orange-700 dark:text-orange-300">₹{(vendorData.telco.opex || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">P2P Details</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">P2P Capacity (MB)</label>
                                  <input
                                    type="number"
                                    value={vendorData.telco.p2pCapacity}
                                    onChange={(e) => updateVendorField('telco', 'p2pCapacity', e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                    placeholder="e.g. 100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Per MB Cost (₹)</label>
                                  <input
                                    type="number"
                                    value={vendorData.telco.perMbCost}
                                    onChange={(e) => updateVendorField('telco', 'perMbCost', e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                P2P Cost: ₹{((parseFloat(vendorData.telco.p2pCapacity) || 0) * (parseFloat(vendorData.telco.perMbCost) || 0)).toLocaleString('en-IN')}
                              </div>
                            </div>
                            {vendorData.telco.vendorDetails && (
                              <div className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg space-y-2">
                                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Vendor Fiber Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fiber Mtr Req</label>
                                    <input
                                      type="number"
                                      value={vendorData.telco.fiberMtrReq}
                                      onChange={(e) => updateVendorField('telco', 'fiberMtrReq', e.target.value)}
                                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cost Per Mtr (₹)</label>
                                    <input
                                      type="number"
                                      value={vendorData.telco.costPerMtr}
                                      onChange={(e) => updateVendorField('telco', 'costPerMtr', e.target.value)}
                                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <div className="text-xs text-orange-600 dark:text-orange-400">
                                  Fiber Cost: ₹{((parseFloat(vendorData.telco.fiberMtrReq) || 0) * (parseFloat(vendorData.telco.costPerMtr) || 0)).toLocaleString('en-IN')}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* CAPEX Section */}
                          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-800">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">CAPEX - Equipment</span>
                              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{(vendorData.telco.capex || 0).toLocaleString('en-IN')}</span>
                            </div>
                            {/* Add Material Dropdown */}
                            {(() => {
                              const available = ALL_MATERIALS.filter(m => !(addedMaterials.telco || []).includes(m.field));
                              return available.length > 0 && (
                                <div className="flex gap-2">
                                  <select
                                    id="addMaterial_telco"
                                    className="flex-1 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Select material to add...</option>
                                    {available.map(m => <option key={m.field} value={m.field}>{m.label}</option>)}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sel = document.getElementById('addMaterial_telco');
                                      if (sel?.value) { handleAddMaterial('telco', sel.value); sel.value = ''; }
                                    }}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                                  >
                                    + Add
                                  </button>
                                </div>
                              );
                            })()}

                            {/* Added Materials */}
                            {(addedMaterials.telco || []).map(fieldKey => {
                              const mat = ALL_MATERIALS.find(m => m.field === fieldKey);
                              if (!mat) return null;
                              const { field, label, category, unit } = mat;
                              const products = getProductsByCategory(category);
                              const eq = vendorData.telco[field] || {};
                              return (
                                <div key={field} className="grid grid-cols-12 gap-2 items-end">
                                  <div className="col-span-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label} - Model</label>
                                      <button type="button" onClick={() => handleRemoveMaterial('telco', field)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                                    </div>
                                    <select
                                      value={eq.modelId || ''}
                                      onChange={(e) => {
                                        const product = storeProducts.find(p => p.id === e.target.value);
                                        updateEquipmentField('telco', field, {
                                          modelId: product?.id || '',
                                          modelNumber: product?.modelNumber || '',
                                          unitPrice: product?.price || 0,
                                          quantity: eq.quantity || ''
                                        });
                                      }}
                                      className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                    >
                                      <option value="">Select Model</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.brandName} - {p.modelNumber} (₹{p.price}/{p.unit})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-3">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty ({unit})</label>
                                    <input
                                      type="number"
                                      value={eq.quantity || ''}
                                      onChange={(e) => updateEquipmentField('telco', field, { quantity: e.target.value })}
                                      className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="col-span-5">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (₹)</label>
                                    <div className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-medium">
                                      ₹{(eq.total || 0).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes {decision === 'NOT_FEASIBLE' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={decision === 'NOT_FEASIBLE'
                    ? "Explain why service cannot be provided at this location..."
                    : "Add any notes (optional)..."
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm resize-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3 shrink-0">
              <Button
                onClick={() => setShowDispositionDialog(false)}
                variant="outline"
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDisposition}
                disabled={
                  !decision ||
                  isSaving ||
                  (decision === 'NOT_FEASIBLE' && !notes.trim()) ||
                  (decision === 'FEASIBLE' && !vendorType)
                }
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Vendor Modal (reusable component) */}
      <CreateVendorModal
        open={showCreateVendorModal}
        onClose={() => setShowCreateVendorModal(false)}
        onSuccess={() => fetchVendors('', true, 'PENDING_ACCOUNTS,APPROVED')}
      />

      {/* Add New POP Location Modal */}
      {showAddPopModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowAddPopModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New POP Location</h3>
              <button onClick={() => setShowAddPopModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">POP Name *</label>
                <input
                  type="text"
                  value={newPopName}
                  onChange={(e) => setNewPopName(e.target.value)}
                  placeholder="e.g., POP-Sector 62"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={newPopLat}
                    onChange={(e) => setNewPopLat(e.target.value)}
                    placeholder="e.g., 28.6139"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={newPopLng}
                    onChange={(e) => setNewPopLng(e.target.value)}
                    placeholder="e.g., 77.2090"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" onClick={() => setShowAddPopModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddPop} disabled={popSaving || !newPopName.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {popSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add POP
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
