'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  Database,
  Plus,
  UserPlus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import { formatDate } from '@/lib/formatters';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

export default function DataManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('data-batches');
  const [isLoading, setIsLoading] = useState(true);
  const [dataBatches, setDataBatches] = useState([]);
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalRecords: 0,
    totalValid: 0,
    totalDuplicates: 0,
    validatedBatches: 0,
    pendingBatches: 0
  });

  // Modal States
  const [showGenerateLeadModal, setShowGenerateLeadModal] = useState(false);
  const [showManualRecordModal, setShowManualRecordModal] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate Lead Form
  const [leadForm, setLeadForm] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    designation: '',
    source: '',
    industry: '',
    companySize: '',
    city: '',
    state: '',
    linkedinUrl: '',
    notes: '',
    campaignId: '',
    productIds: []
  });

  // Manual Record Form
  const [recordForm, setRecordForm] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    industry: '',
    city: '',
    campaignId: '',
    productIds: []
  });

  const isAdmin = user?.role === 'SUPER_ADMIN';

  const sourceOptions = [
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'Referral', label: 'Referral' },
    { value: 'Networking', label: 'Networking' },
    { value: 'Cold Call', label: 'Cold Call' },
    { value: 'Website', label: 'Website' },
    { value: 'Trade Show', label: 'Trade Show' },
    { value: 'Other', label: 'Other' }
  ];

  const companySizeOptions = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1000+', label: '1000+ employees' }
  ];

  useEffect(() => {
    loadDataBatches();
    loadCampaigns();
    loadProducts();
  }, []);

  const loadDataBatches = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/campaigns/reports/data-batches');
      if (response.data) {
        setDataBatches(response.data.batches || []);
        setStats(response.data.stats || {
          totalBatches: 0,
          totalRecords: 0,
          totalValid: 0,
          totalDuplicates: 0,
          validatedBatches: 0,
          pendingBatches: 0
        });
      }
    } catch (error) {
      console.error('Failed to load data batches:', error);
      toast.error('Failed to load data batches');
      setDataBatches([]);
      setStats({
        totalBatches: 0,
        totalRecords: 0,
        totalValid: 0,
        totalDuplicates: 0,
        validatedBatches: 0,
        pendingBatches: 0
      });
    }
    setIsLoading(false);
  };

  const loadCampaigns = async () => {
    try {
      // ISRs use my-campaigns, admins use /campaigns
      const endpoint = isAdmin ? '/campaigns' : '/campaigns/my-campaigns';
      const response = await api.get(endpoint);
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setCampaigns([]);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    }
  };

  const getSourceBadgeColor = (source) => {
    switch (source?.toLowerCase()) {
      case 'purchased':
        return 'bg-emerald-600 text-white';
      case 'website':
        return 'bg-blue-600 text-white';
      case 'referral':
        return 'bg-orange-600 text-white';
      case 'self upload':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const resetLeadForm = () => {
    setLeadForm({
      company: '',
      contactName: '',
      phone: '',
      email: '',
      designation: '',
      source: '',
      industry: '',
      companySize: '',
      city: '',
      state: '',
      linkedinUrl: '',
      notes: '',
      campaignId: '',
      productIds: []
    });
  };

  const resetRecordForm = () => {
    setRecordForm({
      company: '',
      contactName: '',
      phone: '',
      email: '',
      industry: '',
      city: '',
      campaignId: '',
      productIds: []
    });
  };

  const toggleLeadProduct = (productId) => {
    setLeadForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const toggleRecordProduct = (productId) => {
    setRecordForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleGenerateLead = async () => {
    // Validate required fields
    if (!leadForm.company || !leadForm.contactName || !leadForm.phone || !leadForm.source) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/leads/self-generate', {
        ...leadForm,
        createAsLead: true
      });

      if (response.data.success) {
        toast.success('Lead created successfully');
        setShowGenerateLeadModal(false);
        resetLeadForm();
        router.push('/dashboard/leads');
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
      toast.error(error.response?.data?.message || 'Failed to create lead');
    }
    setIsSubmitting(false);
  };

  const handleAddRecord = async () => {
    // Validate required fields
    if (!recordForm.company || !recordForm.contactName || !recordForm.phone || !recordForm.campaignId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/leads/self-generate', {
        ...recordForm,
        source: 'Manual Entry',
        createAsLead: false
      });

      if (response.data.success) {
        toast.success('Record added successfully');
        setShowManualRecordModal(false);
        resetRecordForm();
        loadDataBatches();
      }
    } catch (error) {
      console.error('Failed to add record:', error);
      toast.error(error.response?.data?.message || 'Failed to add record');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Data Management" description="Upload and manage calling data">
        <button
          onClick={() => setShowGenerateLeadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Generate</span> Lead
        </button>
        <button
          onClick={() => setShowManualRecordModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Manual</span> Record
        </button>
      </PageHeader>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'data-batches', label: 'Data Batches', count: stats.totalBatches, variant: 'info' },
          { key: 'statistics', label: 'Statistics' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Data Batches Tab */}
      {activeTab === 'data-batches' && (
        <DataTable
          title="Data Batches"
          columns={[
            {
              key: 'batchName',
              label: 'Batch Name',
              render: (row) => (
                <span className="font-medium">{row.batchName}</span>
              ),
            },
            {
              key: 'source',
              label: 'Source',
              render: (row) => (
                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-medium ${getSourceBadgeColor(row.source)}`}>
                  {row.source}
                </span>
              ),
            },
            {
              key: 'totalRecords',
              label: 'Total Records',
              render: (row) => (
                <span className="font-medium">{row.totalRecords.toLocaleString()}</span>
              ),
            },
            {
              key: 'validRecords',
              label: 'Valid',
              render: (row) => row.validRecords.toLocaleString(),
            },
            {
              key: 'duplicates',
              label: 'Duplicates',
              render: (row) => (
                <span className={row.duplicates > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                  {row.duplicates}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <div className="flex items-center gap-2">
                  {row.status === 'Validated' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Validated</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Pending</span>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: 'campaignName',
              label: 'Campaign',
              render: (row) => row.campaignName || 'Not assigned',
            },
            {
              key: 'uploadedAt',
              label: 'Uploaded',
              render: (row) => (
                <span className="text-zinc-500 dark:text-zinc-400">{formatDate(row.uploadedAt)}</span>
              ),
            },
          ]}
          data={dataBatches}
          searchable={true}
          searchPlaceholder="Search batches..."
          searchKeys={['batchName', 'source', 'campaignName']}
          pagination={true}
          defaultPageSize={10}
          loading={isLoading}
          emptyMessage="No data batches available"
          emptyIcon={Database}
        />
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Batches</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalBatches}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Records</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalRecords.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Valid Records</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalValid.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Duplicates</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.totalDuplicates}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Validated Batches</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.validatedBatches}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Pending Batches</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingBatches}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate Lead Modal */}
      {showGenerateLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Generate New Lead</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Add a lead you found from LinkedIn, networking, or other sources
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGenerateLeadModal(false);
                  resetLeadForm();
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-5">
              {/* Row 1: Company & Contact Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Company Name *</Label>
                  <Input
                    value={leadForm.company}
                    onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                    placeholder="ABC Technologies Pvt Ltd"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Contact Name *</Label>
                  <Input
                    value={leadForm.contactName}
                    onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                    placeholder="Rahul Sharma"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Row 2: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Phone *</Label>
                  <Input
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="+91-98765-43210"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                  <Input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="rahul@abc.com"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Row 3: Designation & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Designation</Label>
                  <Input
                    value={leadForm.designation}
                    onChange={(e) => setLeadForm({ ...leadForm, designation: e.target.value })}
                    placeholder="IT Manager / CTO"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Lead Source *</Label>
                  <Select value={leadForm.source} onValueChange={(value) => setLeadForm({ ...leadForm, source: value })}>
                    <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {sourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Industry & Company Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Industry</Label>
                  <Input
                    value={leadForm.industry}
                    onChange={(e) => setLeadForm({ ...leadForm, industry: e.target.value })}
                    placeholder="IT Services, Manufacturing, etc."
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Company Size</Label>
                  <Select value={leadForm.companySize} onValueChange={(value) => setLeadForm({ ...leadForm, companySize: value })}>
                    <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {companySizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 5: City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">City</Label>
                  <Input
                    value={leadForm.city}
                    onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                    placeholder="Mumbai"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">State</Label>
                  <Input
                    value={leadForm.state}
                    onChange={(e) => setLeadForm({ ...leadForm, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Row 6: LinkedIn URL */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300">LinkedIn Profile URL</Label>
                <Input
                  value={leadForm.linkedinUrl}
                  onChange={(e) => setLeadForm({ ...leadForm, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Row 7: Notes */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Notes / Context</Label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="Found on LinkedIn, interested in cloud solutions..."
                  rows={3}
                  className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Row 8: Products Selection */}
              {products.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Label className="text-slate-700 dark:text-slate-300">Interested In Products</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleLeadProduct(product.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          leadForm.productIds.includes(product.id)
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {product.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 9: Campaign Selection */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <Label className="text-slate-700 dark:text-slate-300">Add to Campaign (Optional)</Label>
                <Select
                  value={leadForm.campaignId || 'self'}
                  onValueChange={(value) => setLeadForm({ ...leadForm, campaignId: value === 'self' ? '' : value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select campaign or keep as direct lead" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="self">Keep as Self Lead</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name} ({campaign.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={handleGenerateLead}
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save as Lead'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Record Modal */}
      {showManualRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Manual Record</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Add a single data record manually with validation
                </p>
              </div>
              <button
                onClick={() => {
                  setShowManualRecordModal(false);
                  resetRecordForm();
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Company & Contact Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Company Name *</Label>
                  <Input
                    value={recordForm.company}
                    onChange={(e) => setRecordForm({ ...recordForm, company: e.target.value })}
                    placeholder="ABC Technologies"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Contact Name *</Label>
                  <Input
                    value={recordForm.contactName}
                    onChange={(e) => setRecordForm({ ...recordForm, contactName: e.target.value })}
                    placeholder="John Doe"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Phone *</Label>
                  <Input
                    value={recordForm.phone}
                    onChange={(e) => setRecordForm({ ...recordForm, phone: e.target.value })}
                    placeholder="+91-98765-43210"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                  <Input
                    type="email"
                    value={recordForm.email}
                    onChange={(e) => setRecordForm({ ...recordForm, email: e.target.value })}
                    placeholder="john@abc.com"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Industry & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Industry</Label>
                  <Input
                    value={recordForm.industry}
                    onChange={(e) => setRecordForm({ ...recordForm, industry: e.target.value })}
                    placeholder="IT Services"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">City</Label>
                  <Input
                    value={recordForm.city}
                    onChange={(e) => setRecordForm({ ...recordForm, city: e.target.value })}
                    placeholder="Mumbai"
                    className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Products Selection */}
              {products.length > 0 && (
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Interested In Products</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleRecordProduct(product.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          recordForm.productIds.includes(product.id)
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {product.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Selection (Required) */}
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Assign to Campaign *</Label>
                <Select
                  value={recordForm.campaignId}
                  onValueChange={(value) => setRecordForm({ ...recordForm, campaignId: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name} ({campaign.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={handleAddRecord}
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? 'Adding...' : 'Add Record'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
