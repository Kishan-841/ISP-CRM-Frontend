'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building2,
  User,
  MapPin,
  Clock,
  X,
  CheckCircle,
  Package,
  Loader2,
  Eye,
  Truck,
  Play,
  Save,
  Phone,
  Wifi,
  Pencil,
  Send,
  Navigation,
  AlertTriangle,
  Plus,
  Minus,
  Hash,
  Info,
  FileText,
  Upload,
  Image,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Camera
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import {
  DELIVERY_STAGE_CONFIG,
  DELIVERY_REQUEST_STATUS_CONFIG,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/lib/statusConfig';
import TabBar from '@/components/TabBar';

// Vendor type labels
const vendorTypeLabels = {
  ownNetwork: 'Own Network',
  fiberVendor: 'Fiber Vendor',
  commissionVendor: 'Commission Vendor',
  thirdParty: 'Third Party',
  telco: 'Telco'
};

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'pending', label: 'Pending', status: 'PENDING', color: 'amber', icon: Clock },
  { id: 'material_requested', label: 'Requested', status: 'MATERIAL_REQUESTED', color: 'orange', icon: Send },
  { id: 'pushed_to_noc', label: 'At NOC', status: 'PUSHED_TO_NOC', color: 'indigo', icon: Send },
  { id: 'installing', label: 'Installing', status: 'INSTALLING', color: 'orange', icon: Truck },
  { id: 'demo_plan_pending', label: 'Demo Plan', status: 'DEMO_PLAN_PENDING', color: 'pink', icon: FileText },
  { id: 'speed_test', label: 'Speed Test', status: 'SPEED_TEST', color: 'cyan', icon: Camera },
  { id: 'customer_acceptance', label: 'Customer Accept', status: 'CUSTOMER_ACCEPTANCE', color: 'teal', icon: ThumbsUp },
  { id: 'completed', label: 'Completed', status: 'COMPLETED', color: 'emerald', icon: CheckCircle }
];

export default function DeliveryQueuePage() {
  const router = useRouter();
  const { user, isDeliveryTeam, isBDMTeamLeader, isSuperAdmin: isAdmin } = useRoleCheck();
  const {
    deliveryQueue,
    deliveryStats,
    fetchDeliveryQueue,
    fetchDeliveryLeadDetails,
    assignDeliveryLead,
    updateDeliveryProducts,
    updateDeliveryStatus,
    clearSelectedDeliveryLead,
    createDeliveryRequest,
    pushToNoc,
    startInstallation,
    isLoading
  } = useLeadStore();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPushingToNoc, setIsPushingToNoc] = useState(false);
  const [updatingStatusLeadId, setUpdatingStatusLeadId] = useState(null);

  // Material Verification Modal State
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialLead, setMaterialLead] = useState(null);
  const [materialItems, setMaterialItems] = useState([]);
  const [isStartingInstallation, setIsStartingInstallation] = useState(false);

  // Speed Test Modal State
  const [showSpeedTestModal, setShowSpeedTestModal] = useState(false);
  const [speedTestLead, setSpeedTestLead] = useState(null);
  const [speedTestFiles, setSpeedTestFiles] = useState({ speedTest: null, latencyTest: null });
  const [speedTestPreviews, setSpeedTestPreviews] = useState({ speedTest: null, latencyTest: null });
  const [isUploadingSpeedTest, setIsUploadingSpeedTest] = useState(false);

  // Customer Acceptance Modal State
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [acceptanceLead, setAcceptanceLead] = useState(null);
  const [acceptanceNotes, setAcceptanceNotes] = useState('');
  const [acceptanceScreenshot, setAcceptanceScreenshot] = useState(null);
  const [acceptancePreview, setAcceptancePreview] = useState(null);
  const [isSubmittingAcceptance, setIsSubmittingAcceptance] = useState(false);
  const [acceptanceAction, setAcceptanceAction] = useState(null); // 'ACCEPTED' or 'REJECTED'

  // NOC Details Modal State
  const [showNocDetailsModal, setShowNocDetailsModal] = useState(false);
  const [nocDetailsLead, setNocDetailsLead] = useState(null);

  // Material Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestLead, setRequestLead] = useState(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestItems, setRequestItems] = useState([]);
  const [requestNotes, setRequestNotes] = useState('');
  const [gpsLocation, setGpsLocation] = useState({ latitude: null, longitude: null });
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [storeProducts, setStoreProducts] = useState([]);

  // Editable fields state
  const [editableData, setEditableData] = useState({
    switch: '',
    switchCategory: '',
    sfp: '',
    sfpCategory: '',
    closure: '',
    closureCategory: '',
    patchChord: '',
    patchChordCategory: '',
    rf: '',
    fiberRequired: '',
    capex: '',
    opex: '',
    arc: '',
    otc: '',
    bandwidthRequirement: '',
    numberOfIPs: ''
  });

  // Category options for each product type
  const categoryOptions = {
    switch: ['1G', '10G'],
    sfp: ['1G', '10G'],
    closure: ['2 way', '4 way'],
    patchChord: ['LC/LC', 'SC/LC', 'SC/SC']
  };

  // Dynamic product items state
  const [productItems, setProductItems] = useState([]);

  // Add product item handler
  const handleAddProductItem = () => {
    setProductItems([...productItems, { productType: '', productId: '', quantity: 1 }]);
  };

  // Remove product item handler
  const handleRemoveProductItem = (index) => {
    setProductItems(productItems.filter((_, i) => i !== index));
  };

  // Update product item handler
  const handleUpdateProductItem = (index, field, value) => {
    const updated = [...productItems];
    updated[index] = { ...updated[index], [field]: value };

    // If product type changes, reset productId
    if (field === 'productType') {
      updated[index].productId = '';
    }

    setProductItems(updated);
  };

  // Get products by type for dropdown
  const getProductsByTypeForEdit = (productType) => {
    if (!productType || !storeProducts) return [];
    return storeProducts.filter(p => p.category === productType);
  };

  // Pagination is handled by DataTable

  useModal(showDetailsModal, () => {
    setShowDetailsModal(false);
    setSelectedLead(null);
    setIsEditMode(false);
    setProductItems([]);
    setEditableData({
      switch: '', switchCategory: '', sfp: '', sfpCategory: '',
      closure: '', closureCategory: '', patchChord: '', patchChordCategory: '',
      rf: '', fiberRequired: '', capex: '', opex: '',
      arc: '', otc: '', bandwidthRequirement: '', numberOfIPs: ''
    });
    clearSelectedDeliveryLead();
  });
  useModal(showMaterialModal, () => {
    if (!isStartingInstallation) { setShowMaterialModal(false); setMaterialLead(null); setMaterialItems([]); }
  });
  useModal(showSpeedTestModal, () => {
    if (!isUploadingSpeedTest) {
      setShowSpeedTestModal(false);
      setSpeedTestLead(null);
      setSpeedTestFiles({ speedTest: null, latencyTest: null });
      setSpeedTestPreviews({ speedTest: null, latencyTest: null });
    }
  });
  useModal(showAcceptanceModal, () => {
    if (!isSubmittingAcceptance) {
      setShowAcceptanceModal(false);
      setAcceptanceLead(null);
      setAcceptanceNotes('');
      setAcceptanceScreenshot(null);
      setAcceptancePreview(null);
    }
  });
  useModal(showRequestModal, () => {
    if (!isSubmittingRequest) {
      setShowRequestModal(false);
      setRequestLead(null);
      setRequestItems([]);
      setRequestNotes('');
      setGpsLocation({ latitude: null, longitude: null });
    }
  });

  // Redirect non-Delivery Team users
  useEffect(() => {
    if (user && !isDeliveryTeam && !isAdmin && !isBDMTeamLeader) {
      router.push('/dashboard');
    }
  }, [user, isDeliveryTeam, isAdmin, isBDMTeamLeader, router]);

  useSocketRefresh(() => fetchDeliveryQueue(activeTab), { enabled: isDeliveryTeam || isAdmin || isBDMTeamLeader });

  // Fetch queue based on active tab
  useEffect(() => {
    if (isDeliveryTeam || isAdmin || isBDMTeamLeader) {
      fetchDeliveryQueue(activeTab);
    }
  }, [isDeliveryTeam, isAdmin, isBDMTeamLeader, activeTab, fetchDeliveryQueue]);

  // Initialize editable data when viewing details
  useEffect(() => {
    if (selectedLead) {
      // Get products from deliveryProducts first, then fallback to feasibilityInfo
      const products = selectedLead.deliveryProducts || selectedLead.feasibilityInfo?.vendorDetails || {};

      // Helper: extract quantity from equipment field (handles both old string format and new object format)
      const getQty = (val) => typeof val === 'object' && val !== null ? (val.quantity || '') : (val || '');
      const getQtyInt = (val) => parseInt(typeof val === 'object' && val !== null ? val.quantity : val) || 0;
      const getModelId = (val) => typeof val === 'object' && val !== null ? (val.modelId || '') : '';

      setEditableData({
        switch: getQty(products.switch),
        switchCategory: products.switchCategory || '',
        sfp: getQty(products.sfp),
        sfpCategory: products.sfpCategory || '',
        closure: getQty(products.closure),
        closureCategory: products.closureCategory || '',
        patchChord: getQty(products.patchChord),
        patchChordCategory: products.patchChordCategory || '',
        rf: getQty(products.rf),
        fiberRequired: getQty(products.fiberRequired),
        capex: products.capex || selectedLead.feasibilityInfo?.vendorDetails?.capex || '',
        opex: products.opex || selectedLead.feasibilityInfo?.vendorDetails?.opex || '',
        arc: selectedLead.arcAmount || '',
        otc: selectedLead.otcAmount || '',
        bandwidthRequirement: selectedLead.bandwidthRequirement || '',
        numberOfIPs: selectedLead.numberOfIPs || ''
      });

      // Initialize product items from existing data
      const items = [];
      if (getQtyInt(products.switch) > 0) items.push({ productType: 'SWITCH', productId: getModelId(products.switch), quantity: getQtyInt(products.switch), productName: 'Switch' });
      if (getQtyInt(products.sfp) > 0) items.push({ productType: 'SFP', productId: getModelId(products.sfp), quantity: getQtyInt(products.sfp), productName: 'SFP' });
      if (getQtyInt(products.closure) > 0) items.push({ productType: 'CLOSURE', productId: getModelId(products.closure), quantity: getQtyInt(products.closure), productName: 'Closure' });
      if (getQtyInt(products.patchChord) > 0) items.push({ productType: 'PATCH_CORD', productId: getModelId(products.patchChord), quantity: getQtyInt(products.patchChord), productName: 'Patch Cord' });
      if (getQtyInt(products.rf) > 0) items.push({ productType: 'RF', productId: getModelId(products.rf), quantity: getQtyInt(products.rf), productName: 'RF' });
      if (getQtyInt(products.fiberRequired) > 0) items.push({ productType: 'FIBER', productId: getModelId(products.fiberRequired), quantity: getQtyInt(products.fiberRequired), productName: 'Fiber' });

      // If items from productItems array exist, use those instead
      if (products.items && Array.isArray(products.items)) {
        setProductItems(products.items);
      } else if (items.length > 0) {
        setProductItems(items);
      } else {
        setProductItems([]);
      }
    }
  }, [selectedLead]);

  const handleViewDetails = async (lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);

    // Fetch store products for edit mode
    try {
      const response = await api.get('/store/products');
      setStoreProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch store products:', error);
    }

    // Fetch full details
    const result = await fetchDeliveryLeadDetails(lead.id);
    if (result.success) {
      setSelectedLead(result.lead);
    }
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedLead(null);
    setIsEditMode(false);
    setProductItems([]);
    setEditableData({
      switch: '',
      switchCategory: '',
      sfp: '',
      sfpCategory: '',
      closure: '',
      closureCategory: '',
      patchChord: '',
      patchChordCategory: '',
      rf: '',
      fiberRequired: '',
      capex: '',
      opex: '',
      arc: '',
      otc: '',
      bandwidthRequirement: '',
      numberOfIPs: ''
    });
    clearSelectedDeliveryLead();
  };

  const handleAssignToMe = async (leadId) => {
    const result = await assignDeliveryLead(leadId);
    if (result.success) {
      toast.success(result.message || 'Lead assigned to you');
      fetchDeliveryQueue(activeTab);
    } else {
      toast.error(result.error || 'Failed to assign lead');
    }
  };

  // ========== SPEED TEST HANDLERS ==========

  const handleOpenSpeedTestModal = (lead) => {
    setSpeedTestLead(lead);
    setSpeedTestFiles({ speedTest: null, latencyTest: null });
    setSpeedTestPreviews({ speedTest: null, latencyTest: null });
    setShowSpeedTestModal(true);
  };

  const handleCloseSpeedTestModal = () => {
    setShowSpeedTestModal(false);
    setSpeedTestLead(null);
    setSpeedTestFiles({ speedTest: null, latencyTest: null });
    setSpeedTestPreviews({ speedTest: null, latencyTest: null });
  };

  const handleSpeedTestFileChange = (type, file) => {
    if (file) {
      setSpeedTestFiles(prev => ({ ...prev, [type]: file }));
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setSpeedTestPreviews(prev => ({ ...prev, [type]: previewUrl }));
    }
  };

  const handleUploadSpeedTest = async () => {
    if (!speedTestLead || !speedTestFiles.speedTest || !speedTestFiles.latencyTest) {
      toast.error('Please upload both speed test and latency test screenshots');
      return;
    }

    setIsUploadingSpeedTest(true);

    try {
      const formData = new FormData();
      formData.append('speedTest', speedTestFiles.speedTest);
      formData.append('latencyTest', speedTestFiles.latencyTest);

      const response = await api.post(`/leads/delivery-team/${speedTestLead.id}/speed-test`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        toast.success('Speed test uploaded successfully!');
        handleCloseSpeedTestModal();
        fetchDeliveryQueue(activeTab);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload speed test');
    } finally {
      setIsUploadingSpeedTest(false);
    }
  };

  // Bypass speed test (testing only)
  const handleBypassSpeedTest = async () => {
    if (!speedTestLead) return;
    setIsUploadingSpeedTest(true);
    try {
      const response = await api.post(`/leads/delivery-team/${speedTestLead.id}/speed-test-bypass`);
      if (response.data) {
        toast.success('Speed test bypassed!');
        handleCloseSpeedTestModal();
        fetchDeliveryQueue(activeTab);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to bypass speed test');
    } finally {
      setIsUploadingSpeedTest(false);
    }
  };

  // ========== CUSTOMER ACCEPTANCE HANDLERS ==========

  const handleOpenAcceptanceModal = (lead) => {
    setAcceptanceLead(lead);
    setAcceptanceNotes('');
    setShowAcceptanceModal(true);
  };

  const handleCloseAcceptanceModal = () => {
    setShowAcceptanceModal(false);
    setAcceptanceLead(null);
    setAcceptanceNotes('');
    setAcceptanceScreenshot(null);
    setAcceptancePreview(null);
  };

  const handleCustomerAcceptance = async (status) => {
    if (!acceptanceLead) return;

    setAcceptanceAction(status);
    setIsSubmittingAcceptance(true);

    try {
      const formData = new FormData();
      formData.append('status', status);
      if (acceptanceNotes) formData.append('notes', acceptanceNotes);
      if (acceptanceScreenshot) formData.append('acceptanceScreenshot', acceptanceScreenshot);

      const response = await api.post(`/leads/delivery-team/${acceptanceLead.id}/customer-acceptance`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        toast.success(status === 'ACCEPTED'
          ? 'Customer accepted! Delivery completed.'
          : 'Customer rejected. Lead marked for review.');
        handleCloseAcceptanceModal();
        fetchDeliveryQueue(activeTab);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record acceptance');
    } finally {
      setIsSubmittingAcceptance(false);
      setAcceptanceAction(null);
    }
  };

  // ========== MATERIAL REQUEST HANDLERS ==========

  // Fetch store products for selection
  const fetchStoreProducts = async () => {
    try {
      const response = await api.get('/store/products');
      const products = response.data || [];
      setStoreProducts(products);
    } catch (error) {
      console.error('Failed to fetch store products:', error);
      toast.error('Failed to load products');
    }
  };

  // Open request modal
  const handleOpenRequestModal = async (lead) => {
    setRequestLead(lead);
    setShowRequestModal(true);
    setRequestItems([]);
    setRequestNotes('');
    setGpsLocation({ latitude: lead.latitude || null, longitude: lead.longitude || null });

    // Fetch store products and get result directly
    let fetchedProducts = [];
    try {
      const response = await api.get('/store/products');
      fetchedProducts = response.data || [];
      setStoreProducts(fetchedProducts);
    } catch (error) {
      console.error('Failed to fetch store products:', error);
      toast.error('Failed to load products');
    }

    // Helper to find matching product
    const findProductByType = (productType) => {
      return fetchedProducts.find(p => p.category === productType);
    };

    // Pre-populate items from lead's delivery products with auto-selected productIds
    const products = lead.deliveryProducts || lead.feasibilityInfo?.vendorDetails || {};
    const initialItems = [];

    // Helper: extract quantity and modelId from equipment field (handles both old string and new object format)
    const extractQty = (val) => parseInt(typeof val === 'object' && val !== null ? val.quantity : val) || 0;
    const extractModelId = (val) => typeof val === 'object' && val !== null ? (val.modelId || '') : '';

    if (extractQty(products.switch) > 0) {
      const matchingProduct = fetchedProducts.find(p => p.id === extractModelId(products.switch)) || findProductByType('SWITCH');
      initialItems.push({ productType: 'SWITCH', category: products.switchCategory || '', quantity: extractQty(products.switch), productId: matchingProduct?.id || '' });
    }
    if (extractQty(products.sfp) > 0) {
      const matchingProduct = fetchedProducts.find(p => p.id === extractModelId(products.sfp)) || findProductByType('SFP');
      initialItems.push({ productType: 'SFP', category: products.sfpCategory || '', quantity: extractQty(products.sfp), productId: matchingProduct?.id || '' });
    }
    if (extractQty(products.closure) > 0) {
      const matchingProduct = fetchedProducts.find(p => p.id === extractModelId(products.closure)) || findProductByType('CLOSURE');
      initialItems.push({ productType: 'CLOSURE', category: products.closureCategory || '', quantity: extractQty(products.closure), productId: matchingProduct?.id || '' });
    }
    if (extractQty(products.patchChord) > 0) {
      const matchingProduct = fetchedProducts.find(p => p.id === extractModelId(products.patchChord)) || findProductByType('PATCH_CORD');
      initialItems.push({ productType: 'PATCH_CORD', category: products.patchChordCategory || '', quantity: extractQty(products.patchChord), productId: matchingProduct?.id || '' });
    }
    if (extractQty(products.rf) > 0) {
      const matchingProduct = fetchedProducts.find(p => p.id === extractModelId(products.rf)) || findProductByType('RF');
      initialItems.push({ productType: 'RF', category: '', quantity: extractQty(products.rf), productId: matchingProduct?.id || '' });
    }
    if (extractQty(products.fiberRequired) > 0) {
      const matchingProduct = fetchedProducts.find(p => p.id === extractModelId(products.fiberRequired)) || findProductByType('FIBER');
      initialItems.push({ productType: 'FIBER', category: '', quantity: extractQty(products.fiberRequired), productId: matchingProduct?.id || '' });
    }

    setRequestItems(initialItems);
  };

  // Close request modal
  const handleCloseRequestModal = () => {
    setShowRequestModal(false);
    setRequestLead(null);
    setRequestItems([]);
    setRequestNotes('');
    setGpsLocation({ latitude: null, longitude: null });
  };

  // Capture GPS location
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsCapturingGps(false);
        toast.success('Location captured successfully');
      },
      (error) => {
        setIsCapturingGps(false);
        toast.error('Failed to capture location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Add item to request
  const handleAddRequestItem = () => {
    setRequestItems([...requestItems, { productType: '', category: '', quantity: 1, productId: '' }]);
  };

  // Remove item from request
  const handleRemoveRequestItem = (index) => {
    setRequestItems(requestItems.filter((_, i) => i !== index));
  };

  // Update request item
  const handleUpdateRequestItem = (index, field, value) => {
    const updated = [...requestItems];
    updated[index][field] = value;

    // Auto-select product if type matches
    if (field === 'productType' || field === 'category') {
      const matchingProduct = storeProducts.find(
        p => p.category === updated[index].productType
      );
      if (matchingProduct) {
        updated[index].productId = matchingProduct.id;
      }
    }

    setRequestItems(updated);
  };

  // Submit delivery request
  const handleSubmitRequest = async () => {
    if (!requestLead) return;

    // Validate items
    const validItems = requestItems.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item with a product selected');
      return;
    }

    setIsSubmittingRequest(true);

    try {
      const requestData = {
        leadId: requestLead.id,
        items: validItems.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity)
        })),
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        deliveryAddress: requestLead.fullAddress || requestLead.campaignData?.address,
        notes: requestNotes
      };

      const result = await createDeliveryRequest(requestData);

      if (result.success) {
        toast.success(result.message || 'Delivery request submitted successfully!');
        handleCloseRequestModal();
        fetchDeliveryQueue(activeTab);
      } else {
        toast.error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      toast.error('Failed to submit request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Get products filtered by type
  const getProductsByType = (productType) => {
    const categoryMap = {
      'SWITCH': 'SWITCH',
      'SFP': 'SFP',
      'CLOSURE': 'CLOSURE',
      'PATCH_CORD': 'PATCH_CORD',
      'RF': 'RF',
      'FIBER': 'FIBER'
    };
    const category = categoryMap[productType] || productType;
    return storeProducts.filter(p => p.category === category);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    const result = await updateDeliveryStatus(leadId, { status: newStatus });
    if (result.success) {
      toast.success(result.message || `Status updated to ${newStatus}`);
      if (selectedLead) {
        setSelectedLead({ ...selectedLead, deliveryStatus: newStatus });
      }
      fetchDeliveryQueue(activeTab);
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  // Push to NOC handler
  const handlePushToNoc = async (requestId) => {
    if (!requestId) return;

    setIsPushingToNoc(true);
    const result = await pushToNoc(requestId);
    if (result.success) {
      toast.success(result.message || 'Pushed to NOC successfully');
      if (selectedLead && selectedLead.activeDeliveryRequest) {
        setSelectedLead({
          ...selectedLead,
          activeDeliveryRequest: {
            ...selectedLead.activeDeliveryRequest,
            pushedToNocAt: new Date().toISOString()
          }
        });
      }
      fetchDeliveryQueue(activeTab);
    } else {
      toast.error(result.error || 'Failed to push to NOC');
    }
    setIsPushingToNoc(false);
  };

  // Handle installation status update (Start Installing / Complete Installing)
  const handleInstallationStatus = async (lead, newStatus) => {
    setUpdatingStatusLeadId(lead.id);
    const result = await updateDeliveryStatus(lead.id, { status: newStatus });
    if (result.success) {
      const statusLabel = newStatus === 'INSTALLING' ? 'Installation Started' :
                         newStatus === 'SPEED_TEST' ? 'Ready for Speed Test' : 'Status Updated';
      toast.success(statusLabel);
      fetchDeliveryQueue(activeTab);
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead({ ...selectedLead, deliveryStatus: newStatus });
      }
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setUpdatingStatusLeadId(null);
  };

  const handleInputChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedLead) return;

    setIsSaving(true);

    const products = {
      switch: editableData.switch,
      switchCategory: editableData.switchCategory,
      sfp: editableData.sfp,
      sfpCategory: editableData.sfpCategory,
      closure: editableData.closure,
      closureCategory: editableData.closureCategory,
      patchChord: editableData.patchChord,
      patchChordCategory: editableData.patchChordCategory,
      rf: editableData.rf,
      fiberRequired: editableData.fiberRequired,
      capex: editableData.capex,
      opex: editableData.opex,
      arc: editableData.arc,
      otc: editableData.otc,
      items: productItems.map(item => ({
        productType: item.productType,
        productId: item.productId,
        quantity: item.quantity,
        productName: storeProducts.find(p => p.id === item.productId)?.modelNumber || item.productName
      }))
    };

    const result = await updateDeliveryProducts(selectedLead.id, {
      products,
      notes: '',
      bandwidthRequirement: editableData.bandwidthRequirement || null,
      numberOfIPs: editableData.numberOfIPs ? parseInt(editableData.numberOfIPs) : null
    });

    if (result.success) {
      toast.success('Saved successfully');
      setSelectedLead({
        ...selectedLead,
        deliveryProducts: products,
        arcAmount: parseFloat(editableData.arc) || 0,
        otcAmount: parseFloat(editableData.otc) || 0,
        bandwidthRequirement: editableData.bandwidthRequirement,
        numberOfIPs: editableData.numberOfIPs ? parseInt(editableData.numberOfIPs) : null
      });
      setIsEditMode(false);
    } else {
      toast.error(result.error || 'Failed to save');
    }
    setIsSaving(false);
  };

  // Get status badge color based on stage ID
  const getStageBadgeColor = (stage) => getStatusBadgeClass(stage, DELIVERY_STAGE_CONFIG, 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200');

  // Get readable stage label
  const getStageLabel = (stage) => getStatusLabel(stage, DELIVERY_STAGE_CONFIG);

  // Get request status badge and label
  const REQUEST_STATUS_ICON_MAP = {
    PENDING_APPROVAL: Clock,
    SUPER_ADMIN_APPROVED: CheckCircle,
    AREA_HEAD_APPROVED: CheckCircle,
    APPROVED: CheckCircle,
    REJECTED: X,
    ASSIGNED: Package,
    COMPLETED: CheckCircle,
  };

  const getRequestStatusInfo = (status) => {
    const entry = DELIVERY_REQUEST_STATUS_CONFIG[status];
    if (entry) {
      return { label: entry.label, color: entry.color, icon: REQUEST_STATUS_ICON_MAP[status] || Send };
    }
    return { label: 'Not Requested', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Send };
  };

  // Determine the actual stage of a lead (same logic as backend)
  const getLeadStage = (lead) => {
    const status = lead.deliveryStatus;
    const activeRequest = lead.activeDeliveryRequest;

    // Check explicit statuses first
    // material_received → pushed_to_noc, noc_completed → installing (auto-transitions)
    if (status === 'COMPLETED') return 'completed';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'CUSTOMER_ACCEPTANCE') return 'customer_acceptance';
    if (status === 'SPEED_TEST') return 'speed_test';
    if (status === 'DEMO_PLAN_PENDING') return 'demo_plan_pending';
    if (status === 'INSTALLING') return 'installing';
    if (status === 'ACTIVATION_READY') return 'installing';
    if (status === 'PUSHED_TO_NOC') return 'pushed_to_noc';
    if (status === 'MATERIAL_RECEIVED') return 'pushed_to_noc';
    if (status === 'MATERIAL_REQUESTED') return 'material_requested';
    if (status === 'MATERIAL_REJECTED') return 'material_rejected';

    // Check based on delivery request status
    if (activeRequest) {
      if (activeRequest.status === 'ASSIGNED' && !activeRequest.pushedToNocAt) {
        return 'pushed_to_noc';
      }
      if (activeRequest.pushedToNocAt) {
        return 'pushed_to_noc';
      }
      if (['PENDING_APPROVAL', 'SUPER_ADMIN_APPROVED', 'AREA_HEAD_APPROVED', 'APPROVED'].includes(activeRequest.status)) {
        return 'material_requested';
      }
    }

    return 'pending';
  };

  // Get action button for each stage
  const getStageAction = (lead) => {
    const stage = getLeadStage(lead);
    const activeRequest = lead.activeDeliveryRequest;

    switch (stage) {
      case 'pending':
        // Request Material button
        return (
          <Button
            size="sm"
            onClick={() => handleOpenRequestModal(lead)}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
          >
            <Send size={12} className="mr-1" />
            Request
          </Button>
        );

      case 'material_requested':
        // Awaiting approval - no action
        return (
          <Badge className="bg-amber-100 text-amber-700 text-xs">
            <Clock size={10} className="mr-1" />
            Awaiting
          </Badge>
        );

      case 'material_rejected': {
        // Rejected - show reason and re-request
        const rejectedRequest = lead.activeDeliveryRequest;
        const rejectionReason = rejectedRequest?.areaHeadRejectionReason || rejectedRequest?.superAdminRejectionReason || 'No reason provided';
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-red-600 max-w-[150px] truncate" title={rejectionReason}>
              Rejected: {rejectionReason}
            </span>
            <Button
              size="sm"
              onClick={() => handleOpenRequestModal(lead)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
            >
              <Send size={12} className="mr-1" />
              Re-request
            </Button>
          </div>
        );
      }

      case 'pushed_to_noc':
        // Waiting for NOC - no action
        return (
          <Badge className="bg-indigo-100 text-indigo-700 text-xs">
            <Clock size={10} className="mr-1" />
            At NOC
          </Badge>
        );

      case 'installing': {
        // Check if all assigned materials are verified
        const drItems = lead.activeDeliveryRequest?.items || [];
        const allVerified = drItems.length > 0 && drItems.every(item => item.isUsed);
        const hasItems = drItems.length > 0;

        return (
          <div className="flex items-center gap-1.5">
            {hasItems && !allVerified && (
              <Button
                size="sm"
                onClick={() => {
                  setMaterialLead(lead);
                  setMaterialItems(drItems.map(item => ({
                    id: item.id,
                    productName: item.product?.modelNumber || 'Unknown Product',
                    category: item.product?.category || '',
                    brandName: item.product?.brandName || '',
                    unit: item.product?.unit || 'pcs',
                    assignedQty: item.assignedQuantity || item.quantity,
                    usedQty: item.usedQuantity || item.assignedQuantity || item.quantity,
                    isUsed: item.isUsed || true,
                    serialNumbers: item.assignedSerialNumbers || []
                  })));
                  setShowMaterialModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
              >
                <Package size={12} className="mr-1" />
                Verify
              </Button>
            )}
            {hasItems && allVerified && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-emerald-200">
                <CheckCircle size={10} className="mr-0.5" /> Verified
              </Badge>
            )}
            <Button
              size="sm"
              onClick={() => handleInstallationStatus(lead, 'DEMO_PLAN_PENDING')}
              disabled={updatingStatusLeadId === lead.id || (hasItems && !allVerified)}
              className="bg-pink-600 hover:bg-pink-700 text-white text-xs disabled:opacity-50"
              title={hasItems && !allVerified ? 'Verify materials before completing' : ''}
            >
              {updatingStatusLeadId === lead.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} className="mr-1" />}
              Complete
            </Button>
          </div>
        );
      }

      case 'demo_plan_pending':
        // Waiting for Accounts to assign demo plan - no action for delivery
        return (
          <Badge className="bg-pink-100 text-pink-700 text-xs">
            <Clock size={10} className="mr-1" />
            Awaiting Plan
          </Badge>
        );

      case 'speed_test':
        // Upload Speed Test button
        return (
          <Button
            size="sm"
            onClick={() => handleOpenSpeedTestModal(lead)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
          >
            <Upload size={12} className="mr-1" />
            Upload
          </Button>
        );

      case 'customer_acceptance':
        // Accept/Reject button
        return (
          <Button
            size="sm"
            onClick={() => handleOpenAcceptanceModal(lead)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
          >
            <ThumbsUp size={12} className="mr-1" />
            Accept/Reject
          </Button>
        );

      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
            <CheckCircle size={10} className="mr-1" />
            Done
          </Badge>
        );

      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 text-xs">
            <XCircle size={10} className="mr-1" />
            Rejected
          </Badge>
        );

      default:
        return <span className="text-xs text-slate-400">-</span>;
    }
  };

  const leads = deliveryQueue || [];

  // Get stage count from stats
  const getStageCount = (stageId) => {
    if (!deliveryStats) return 0;
    switch (stageId) {
      case 'pending': return deliveryStats.pending || 0;
      case 'material_requested': return deliveryStats.materialRequested || 0;
      case 'pushed_to_noc': return (deliveryStats.pushedToNoc || 0) + (deliveryStats.materialReceived || 0);
      case 'installing': return (deliveryStats.installing || 0) + (deliveryStats.nocCompleted || 0);
      case 'demo_plan_pending': return deliveryStats.demoPlanPending || 0;
      case 'speed_test': return deliveryStats.speedTest || 0;
      case 'customer_acceptance': return deliveryStats.customerAcceptance || 0;
      case 'completed': return deliveryStats.completed || 0;
      default: return 0;
    }
  };

  if (!isDeliveryTeam && !isAdmin && !isBDMTeamLeader) {
    return null;
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Delivery Queue</h1>
              {isBDMTeamLeader && (
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs">
                  Read-Only View
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Manage installation and delivery pipeline
            </p>
          </div>
        </div>

        {/* Pipeline Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PIPELINE_STAGES.map((stage) => {
            const isActive = activeTab === stage.id;
            const count = getStageCount(stage.id);
            const colorMap = {
              amber: { active: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700', badge: 'bg-amber-200/60 dark:bg-amber-800/60' },
              orange: { active: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-1 ring-orange-300 dark:ring-orange-700', badge: 'bg-orange-200/60 dark:bg-orange-800/60' },
              indigo: { active: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700', badge: 'bg-indigo-200/60 dark:bg-indigo-800/60' },
              pink: { active: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 ring-1 ring-pink-300 dark:ring-pink-700', badge: 'bg-pink-200/60 dark:bg-pink-800/60' },
              cyan: { active: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-300 dark:ring-cyan-700', badge: 'bg-cyan-200/60 dark:bg-cyan-800/60' },
              teal: { active: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-300 dark:ring-teal-700', badge: 'bg-teal-200/60 dark:bg-teal-800/60' },
              emerald: { active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700', badge: 'bg-emerald-200/60 dark:bg-emerald-800/60' },
            };
            const colors = colorMap[stage.color] || colorMap.orange;

            return (
              <button
                key={stage.id}
                onClick={() => setActiveTab(stage.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? colors.active
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{stage.label}</span>
                {count > 0 && (
                  <span className={`min-w-[18px] px-1 py-0.5 rounded-full text-[10px] font-semibold text-center ${
                    isActive ? colors.badge : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Card View */}
        {isLoading ? (
          <div className="lg:hidden flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="lg:hidden text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No leads in this stage</p>
          </div>
        ) : (
          <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {leads.map((lead) => (
              <div key={lead.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
                      {lead.campaign?.code === 'SAM-GENERATED' ? (
                        <span className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] px-1.5 py-0 rounded">
                          SAM Generated
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
                    <p className="text-xs text-slate-500">{lead.name || '-'} {lead.phone ? `\u00B7 ${lead.phone}` : ''}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${getStageBadgeColor(getLeadStage(lead))}`}>
                    {getStageLabel(getLeadStage(lead))}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 truncate mb-2">
                  {lead.fullAddress || lead.location || '-'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {lead.bandwidthRequirement && (
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px]">
                      <Wifi size={10} className="mr-0.5" />
                      {lead.bandwidthRequirement}
                    </Badge>
                  )}
                  {lead.numberOfIPs && (
                    <Badge className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px]">
                      <Hash size={10} className="mr-0.5" />
                      {lead.numberOfIPs} IPs
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {!isBDMTeamLeader && getStageAction(lead)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(lead)}
                    className="text-slate-600 dark:text-slate-400 text-xs"
                  >
                    <Eye size={14} className="mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop Table View */}
        <DataTable
          className="hidden lg:block"
          columns={[
            {
              key: 'company',
              label: 'Company',
              render: (lead) => (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{lead.company}</p>
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
                    <p className="text-xs text-slate-500">{lead.name || '-'}</p>
                    <p className="text-xs text-slate-400">{lead.phone || '-'}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'address',
              label: 'Address',
              render: (lead) => (
                <div className="max-w-[220px] space-y-1.5">
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {lead.fullAddress || lead.location || '-'}
                  </p>
                  {lead.fromAddress && (
                    <div className="flex items-start gap-1.5 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
                      <Navigation className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-blue-500 font-medium uppercase">POP Location</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 truncate">{lead.fromAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'bandwidth',
              label: 'Bandwidth',
              render: (lead) => (
                <div className="space-y-1">
                  {lead.bandwidthRequirement && (
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs">
                      <Wifi size={10} className="mr-1" />
                      {lead.bandwidthRequirement}
                    </Badge>
                  )}
                  {lead.numberOfIPs && (
                    <Badge className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs">
                      <Hash size={10} className="mr-1" />
                      {lead.numberOfIPs} IPs
                    </Badge>
                  )}
                  {!lead.bandwidthRequirement && !lead.numberOfIPs && (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </div>
              ),
            },
            {
              key: 'expectedDelivery',
              label: 'Exp. Delivery',
              render: (lead) => {
                if (!lead.expectedDeliveryDate) return <span className="text-xs text-slate-400">-</span>;
                const isOverdue = new Date(lead.expectedDeliveryDate) < new Date();
                return (
                  <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {new Date(lead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {isOverdue && <span className="block text-[10px] text-red-500">Overdue</span>}
                  </span>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (lead) => (
                <Badge variant="outline" className={getStageBadgeColor(getLeadStage(lead))}>
                  {getStageLabel(getLeadStage(lead))}
                </Badge>
              ),
            },
            {
              key: 'action',
              label: 'Action',
              className: 'text-center',
              render: (lead) => (
                <div className="flex justify-center">
                  {!isBDMTeamLeader && getStageAction(lead)}
                </div>
              ),
            },
          ]}
          data={leads}
          loading={isLoading}
          pagination={true}
          defaultPageSize={10}
          emptyMessage="No leads in this stage"
          emptyIcon={Truck}
          actions={(lead) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewDetails(lead)}
              className="text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 p-1"
            >
              <Eye size={18} />
            </Button>
          )}
        />
      </div>

      {/* Speed Test Upload Modal */}
      {showSpeedTestModal && speedTestLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseSpeedTestModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-cyan-50 dark:bg-cyan-900/20 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">
                  <Camera className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Upload Speed Test</h2>
                  <p className="text-xs text-cyan-600">{speedTestLead.company}</p>
                </div>
              </div>
              <button
                onClick={handleCloseSpeedTestModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Upload screenshots of speed test and latency test results.
              </p>

              {/* Speed Test Screenshot */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Speed Test Screenshot *
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center">
                  {speedTestPreviews.speedTest ? (
                    <div className="relative">
                      <img
                        src={speedTestPreviews.speedTest}
                        alt="Speed Test Preview"
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setSpeedTestFiles(prev => ({ ...prev, speedTest: null }));
                          setSpeedTestPreviews(prev => ({ ...prev, speedTest: null }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSpeedTestFileChange('speedTest', e.target.files[0])}
                      />
                      <div className="py-4">
                        <Image className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">Click to upload speed test</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Latency Test Screenshot */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Latency Test Screenshot *
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center">
                  {speedTestPreviews.latencyTest ? (
                    <div className="relative">
                      <img
                        src={speedTestPreviews.latencyTest}
                        alt="Latency Test Preview"
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setSpeedTestFiles(prev => ({ ...prev, latencyTest: null }));
                          setSpeedTestPreviews(prev => ({ ...prev, latencyTest: null }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSpeedTestFileChange('latencyTest', e.target.files[0])}
                      />
                      <div className="py-4">
                        <Image className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">Click to upload latency test</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sm:rounded-b-xl">
              <Button onClick={handleCloseSpeedTestModal} variant="outline">
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBypassSpeedTest}
                  disabled={isUploadingSpeedTest}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  Bypass (Test)
                </Button>
                <Button
                  onClick={handleUploadSpeedTest}
                  disabled={isUploadingSpeedTest || !speedTestFiles.speedTest || !speedTestFiles.latencyTest}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isUploadingSpeedTest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Continue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Acceptance Modal */}
      {showAcceptanceModal && acceptanceLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseAcceptanceModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-teal-50 dark:bg-teal-900/20 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg">
                  <ThumbsUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Customer Acceptance</h2>
                  <p className="text-xs text-teal-600">{acceptanceLead.company}</p>
                </div>
              </div>
              <button
                onClick={handleCloseAcceptanceModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Record customer's acceptance of the installation based on their feedback.
              </p>

              {/* Speed Test Previews */}
              {(acceptanceLead.speedTestScreenshot || acceptanceLead.latencyTestScreenshot) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-2">Speed Test Results</p>
                  <div className="grid grid-cols-2 gap-3">
                    {acceptanceLead.speedTestScreenshot && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Speed Test</p>
                        <img
                          src={acceptanceLead.speedTestScreenshot}
                          alt="Speed Test"
                          className="rounded-lg border border-slate-200 max-h-32 w-full object-cover cursor-pointer"
                          onClick={() => window.open(acceptanceLead.speedTestScreenshot, '_blank')}
                        />
                      </div>
                    )}
                    {acceptanceLead.latencyTestScreenshot && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Latency Test</p>
                        <img
                          src={acceptanceLead.latencyTestScreenshot}
                          alt="Latency Test"
                          className="rounded-lg border border-slate-200 max-h-32 w-full object-cover cursor-pointer"
                          onClick={() => window.open(acceptanceLead.latencyTestScreenshot, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Acceptance Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Customer Acceptance Screenshot
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Upload a screenshot of the customer acceptance email received.
                </p>
                {acceptanceLead.customerAcceptanceScreenshot && !acceptancePreview ? (
                  <div className="relative">
                    <img
                      src={acceptanceLead.customerAcceptanceScreenshot}
                      alt="Previously uploaded acceptance"
                      className="w-full max-h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      onClick={() => window.open(acceptanceLead.customerAcceptanceScreenshot, '_blank')}
                    />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> Previously uploaded
                    </p>
                  </div>
                ) : !acceptancePreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">Click to upload screenshot</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAcceptanceScreenshot(file);
                          setAcceptancePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={acceptancePreview}
                      alt="Acceptance Screenshot"
                      className="w-full max-h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAcceptanceScreenshot(null);
                        setAcceptancePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> {acceptanceScreenshot.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={acceptanceNotes}
                  onChange={(e) => setAcceptanceNotes(e.target.value)}
                  placeholder="Any notes about customer feedback..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sm:rounded-b-xl">
              <Button
                onClick={() => handleCustomerAcceptance('REJECTED')}
                disabled={isSubmittingAcceptance}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {acceptanceAction === 'REJECTED' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ThumbsDown className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
              <Button
                onClick={() => handleCustomerAcceptance('ACCEPTED')}
                disabled={isSubmittingAcceptance}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {acceptanceAction === 'ACCEPTED' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ThumbsUp className="h-4 w-4 mr-2" />
                )}
                Accept & Complete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseDetails} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 z-10 rounded-t-xl">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">{selectedLead.company}</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    <span>{selectedLead.name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{selectedLead.phone}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{selectedLead.city || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                <Badge variant="outline" className={getStageBadgeColor(getLeadStage(selectedLead))}>
                  {getStageLabel(getLeadStage(selectedLead))}
                </Badge>
                {selectedLead.deliveryStatus !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant={isEditMode ? "default" : "outline"}
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={isEditMode ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {isEditMode ? 'Editing' : 'Edit'}
                  </Button>
                )}
                <button
                  onClick={handleCloseDetails}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Left Column - Lead Info & Products */}
                <div className="space-y-4">
                  {/* Installation Address */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 flex items-center gap-1">
                      <MapPin size={12} />
                      Installation Address
                    </p>
                    <p className="text-sm text-slate-900 dark:text-white">
                      {selectedLead.fullAddress || selectedLead.location || '-'}
                    </p>
                    {(selectedLead.city || selectedLead.state) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {[selectedLead.city, selectedLead.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Billing Address */}
                  {(selectedLead.billingAddress || selectedLead.billingPincode) && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Billing Address</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedLead.billingAddress || '-'}
                        {selectedLead.billingPincode && <span className="ml-2 font-semibold text-amber-600">({selectedLead.billingPincode})</span>}
                      </p>
                    </div>
                  )}

                  {/* Expected Delivery Date */}
                  {selectedLead.expectedDeliveryDate && (
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100 dark:border-cyan-800">
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">Expected Delivery Date</p>
                      <p className={`text-sm font-semibold ${new Date(selectedLead.expectedDeliveryDate) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-cyan-700 dark:text-cyan-300'}`}>
                        {new Date(selectedLead.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {new Date(selectedLead.expectedDeliveryDate) < new Date() && <span className="ml-2 text-xs text-red-500">(Overdue)</span>}
                      </p>
                    </div>
                  )}

                  {/* Bandwidth & IPs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-xs text-orange-600 mb-1">Bandwidth</p>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editableData.bandwidthRequirement}
                          onChange={(e) => handleInputChange('bandwidthRequirement', e.target.value)}
                          placeholder="e.g. 100 mbps"
                          className="w-full h-8 px-2 text-sm bg-white dark:bg-slate-800 border border-orange-300 rounded"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-orange-700">{selectedLead.bandwidthRequirement || '-'}</p>
                      )}
                    </div>
                    <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <p className="text-xs text-cyan-600 mb-1">No. of IPs</p>
                      {isEditMode ? (
                        <input
                          type="number"
                          value={editableData.numberOfIPs}
                          onChange={(e) => handleInputChange('numberOfIPs', e.target.value)}
                          placeholder="IPs"
                          min="1"
                          className="w-full h-8 px-2 text-sm bg-white dark:bg-slate-800 border border-cyan-300 rounded"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-cyan-700">{selectedLead.numberOfIPs || '-'}</p>
                      )}
                    </div>
                  </div>

                  {/* Speed Test Info (if uploaded) */}
                  {selectedLead.speedTestScreenshot && (
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100">
                      <p className="text-xs font-medium text-cyan-600 mb-2 flex items-center gap-1">
                        <Camera size={12} />
                        Speed Test Results
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Speed Test</p>
                          <img
                            src={selectedLead.speedTestScreenshot}
                            alt="Speed Test"
                            className="rounded-lg border border-slate-200 max-h-24 w-full object-cover cursor-pointer"
                            onClick={() => window.open(selectedLead.speedTestScreenshot, '_blank')}
                          />
                        </div>
                        {selectedLead.latencyTestScreenshot && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Latency Test</p>
                            <img
                              src={selectedLead.latencyTestScreenshot}
                              alt="Latency Test"
                              className="rounded-lg border border-slate-200 max-h-24 w-full object-cover cursor-pointer"
                              onClick={() => window.open(selectedLead.latencyTestScreenshot, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                      {selectedLead.speedTestUploadedAt && (
                        <p className="text-xs text-slate-500 mt-2">
                          Uploaded on {formatDateTime(selectedLead.speedTestUploadedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Customer Acceptance (if completed) */}
                  {selectedLead.customerAcceptanceStatus && (
                    <div className={`p-4 rounded-lg border ${
                      selectedLead.customerAcceptanceStatus === 'ACCEPTED'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-100'
                    }`}>
                      <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${
                        selectedLead.customerAcceptanceStatus === 'ACCEPTED' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {selectedLead.customerAcceptanceStatus === 'ACCEPTED' ? (
                          <><ThumbsUp size={12} /> Customer Accepted</>
                        ) : (
                          <><ThumbsDown size={12} /> Customer Rejected</>
                        )}
                      </p>
                      {selectedLead.customerAcceptanceNotes && (
                        <p className="text-sm text-slate-700 mt-1">{selectedLead.customerAcceptanceNotes}</p>
                      )}
                      {selectedLead.customerAcceptanceAt && (
                        <p className="text-xs text-slate-500 mt-2">
                          {formatDateTime(selectedLead.customerAcceptanceAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column - Products & Financials */}
                <div className="space-y-4">
                  {/* Products Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Products / Equipment
                      </h3>
                      {isEditMode && (
                        <Button
                          type="button"
                          onClick={handleAddProductItem}
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>

                    {isEditMode ? (
                      <div className="space-y-2">
                        {productItems.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No products added</p>
                          </div>
                        ) : (
                          productItems.map((item, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                              <select
                                value={item.productType}
                                onChange={(e) => handleUpdateProductItem(index, 'productType', e.target.value)}
                                className="w-full sm:w-24 h-9 px-2 bg-white dark:bg-slate-800 border rounded text-sm"
                              >
                                <option value="">Type</option>
                                <option value="SWITCH">Switch</option>
                                <option value="SFP">SFP</option>
                                <option value="CLOSURE">Closure</option>
                                <option value="PATCH_CORD">Patch Cord</option>
                                <option value="RF">RF</option>
                                <option value="FIBER">Fiber</option>
                              </select>
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateProductItem(index, 'productId', e.target.value)}
                                className="w-full sm:flex-1 h-9 px-2 bg-white dark:bg-slate-800 border rounded text-sm"
                                disabled={!item.productType}
                              >
                                <option value="">Select Product</option>
                                {getProductsByTypeForEdit(item.productType).map(product => (
                                  <option key={product.id} value={product.id}>{product.modelNumber}</option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateProductItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 h-9 text-center"
                              />
                              <button
                                onClick={() => handleRemoveProductItem(index)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <table className="w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800">
                            <th className="text-left px-4 py-2 text-sm font-medium text-slate-600 border-b">Item</th>
                            <th className="text-left px-4 py-2 text-sm font-medium text-slate-600 border-b">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productItems.length === 0 ? (
                            <tr>
                              <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500">No products</td>
                            </tr>
                          ) : (
                            productItems.map((item, index) => (
                              <tr key={index} className="border-b last:border-b-0">
                                <td className="px-4 py-2 text-sm">{item.productName || item.productType || '-'}</td>
                                <td className="px-4 py-2 text-sm font-medium">{item.quantity}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Financials */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Financials</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">ARC</p>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editableData.arc}
                            onChange={(e) => handleInputChange('arc', e.target.value)}
                            className="h-8 mt-1"
                            placeholder="0"
                          />
                        ) : (
                          <p className="text-lg font-bold text-orange-600">{formatCurrency(editableData.arc)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">OTC</p>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editableData.otc}
                            onChange={(e) => handleInputChange('otc', e.target.value)}
                            className="h-8 mt-1"
                            placeholder="0"
                          />
                        ) : (
                          <p className="text-lg font-bold text-orange-600">{formatCurrency(editableData.otc)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {!isBDMTeamLeader && getStageAction(selectedLead)}
              </div>
              {!isBDMTeamLeader && isEditMode && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Material Request Modal */}
      {showRequestModal && requestLead && (
        <div data-modal className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseRequestModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-5xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
              <div>
                <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">Request Material</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {requestLead.company} - {requestLead.name}
                </p>
              </div>
              <button
                onClick={handleCloseRequestModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Left Column - Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Items Required ({requestItems.length})
                    </h3>
                    <Button
                      type="button"
                      onClick={handleAddRequestItem}
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {requestItems.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No items added</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                      {requestItems.map((item, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                          <select
                            value={item.productType}
                            onChange={(e) => handleUpdateRequestItem(index, 'productType', e.target.value)}
                            className="w-full sm:w-28 h-9 px-2 bg-white dark:bg-slate-800 border rounded text-sm"
                          >
                            <option value="">Type</option>
                            <option value="SWITCH">Switch</option>
                            <option value="SFP">SFP</option>
                            <option value="CLOSURE">Closure</option>
                            <option value="PATCH_CORD">Patch Cord</option>
                            <option value="RF">RF</option>
                            <option value="FIBER">Fiber</option>
                          </select>
                          <select
                            value={item.productId}
                            onChange={(e) => handleUpdateRequestItem(index, 'productId', e.target.value)}
                            className="w-full sm:flex-1 h-9 px-2 bg-white dark:bg-slate-800 border rounded text-sm"
                            disabled={!item.productType}
                          >
                            <option value="">Select Product</option>
                            {getProductsByType(item.productType).map(product => (
                              <option key={product.id} value={product.id}>{product.modelNumber}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateRequestItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 h-9 text-center"
                          />
                          <button
                            onClick={() => handleRemoveRequestItem(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column - Location, Notes */}
                <div className="space-y-4">
                  {/* GPS Location */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">GPS Location</p>
                          {gpsLocation.latitude ? (
                            <p className="text-xs text-blue-700">
                              {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                            </p>
                          ) : (
                            <p className="text-xs text-blue-600">Not captured</p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleCaptureGps}
                        disabled={isCapturingGps}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700"
                      >
                        {isCapturingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      placeholder="Any special instructions..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t bg-slate-50 dark:bg-slate-800/50 sm:rounded-b-xl">
              <Button onClick={handleCloseRequestModal} variant="outline">Cancel</Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={isSubmittingRequest || requestItems.length === 0}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6"
              >
                {isSubmittingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Material Verification Modal */}
      {showMaterialModal && materialLead && (
        <div data-modal className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowMaterialModal(false); setMaterialLead(null); setMaterialItems([]); }} />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
          <div className="pointer-events-auto bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Verify Materials
                </h2>
                <p className="text-sm text-slate-500">
                  {materialLead.company || materialLead.campaignData?.company} - {materialLead.name}
                </p>
              </div>
              <button
                onClick={() => { setShowMaterialModal(false); setMaterialLead(null); setMaterialItems([]); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Verify materials on-site match what was assigned. Check serial numbers on each device and adjust quantities if needed.
              </p>

              {materialItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No materials assigned for this lead</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materialItems.map((item, index) => {
                    const isFiber = item.category === 'FIBER' || item.unit === 'mtrs';
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-lg transition-all ${
                          item.isUsed
                            ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-60'
                        }`}
                      >
                        {/* Item row */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={item.isUsed}
                            onChange={(e) => {
                              const updated = [...materialItems];
                              updated[index] = { ...updated[index], isUsed: e.target.checked };
                              if (!e.target.checked) {
                                updated[index].usedQty = 0;
                              } else {
                                updated[index].usedQty = updated[index].assignedQty;
                              }
                              setMaterialItems(updated);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${item.isUsed ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                              {item.productName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.category} - {item.brandName}
                            </p>
                          </div>

                          {/* Quantity input */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Input
                              type="number"
                              min="0"
                              value={item.usedQty}
                              disabled={!item.isUsed}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                const updated = [...materialItems];
                                updated[index] = { ...updated[index], usedQty: val };
                                setMaterialItems(updated);
                              }}
                              className="w-20 h-8 text-center text-sm font-semibold"
                            />
                            <span className="text-xs text-slate-500 w-8">{item.unit}</span>
                          </div>
                        </div>

                        {/* Serial numbers section */}
                        {item.isUsed && item.serialNumbers.length > 0 && (
                          <div className="px-4 pb-3 pt-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Hash size={10} className="text-slate-400" />
                              <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400">
                                Serial Numbers - Verify on device
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.serialNumbers.map((sn, snIdx) => (
                                <span
                                  key={snIdx}
                                  className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded text-xs font-mono text-orange-700 dark:text-orange-300"
                                >
                                  {sn}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bulk item note */}
                        {item.isUsed && isFiber && item.serialNumbers.length === 0 && (
                          <div className="px-4 pb-3 pt-0">
                            <span className="text-[10px] text-slate-400 italic">Bulk item - no serial tracking</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sm:rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => { setShowMaterialModal(false); setMaterialLead(null); setMaterialItems([]); }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const usedItems = materialItems.filter(m => m.isUsed);
                  if (usedItems.length === 0 && materialItems.length > 0) {
                    toast.error('Please check at least one material item');
                    return;
                  }
                  setIsStartingInstallation(true);
                  const materials = materialItems.map(m => ({
                    itemId: m.id,
                    isUsed: m.isUsed,
                    usedQuantity: m.isUsed ? m.usedQty : 0
                  }));
                  const result = await startInstallation(materialLead.id, materials);
                  if (result.success) {
                    toast.success('Materials Verified');
                    setShowMaterialModal(false);
                    setMaterialLead(null);
                    setMaterialItems([]);
                    fetchDeliveryQueue(activeTab);
                  } else {
                    toast.error(result.error || 'Failed to start installation');
                  }
                  setIsStartingInstallation(false);
                }}
                disabled={isStartingInstallation}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6"
              >
                {isStartingInstallation ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirm Verification
              </Button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
