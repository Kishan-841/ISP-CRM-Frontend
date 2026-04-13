'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadStore, useProductStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, FileText, CheckCircle2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';

const emptyForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  title: '',
  industry: '',
  city: '',
  fullAddress: '',
  latitude: '',
  longitude: '',
  interestLevel: '',
  bandwidth: '',
  numberOfIPs: '',
  tentativePrice: '',
  otcAmount: '',
  billingAddress: '',
  billingPincode: '',
  expectedDeliveryDate: '',
  notes: '',
};

export default function CreateOpportunityPage() {
  const router = useRouter();
  const { user, isBDM, isBDMTeamLeader, isSuperAdmin: isAdmin } = useRoleCheck();
  const isBDMCP = user?.role === 'BDM_CP';
  const canAccess = isBDM || isBDMCP || isBDMTeamLeader || isAdmin;

  const {
    createOpportunity,
    feasibilityTeamUsers,
    fetchFeasibilityTeamUsers,
  } = useLeadStore();
  const { products, fetchProducts } = useProductStore();

  const [form, setForm] = useState(emptyForm);
  const [feasibilityUserId, setFeasibilityUserId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && !canAccess) {
      router.push('/dashboard');
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (canAccess) {
      fetchProducts();
      fetchFeasibilityTeamUsers();
    }
  }, [canAccess, fetchProducts, fetchFeasibilityTeamUsers]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleProduct = (pid) =>
    setSelectedProducts((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));

  const resetForm = () => {
    setForm(emptyForm);
    setFeasibilityUserId('');
    setSelectedProducts([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Contact validation
    if (!form.name.trim()) return toast.error('Full name is required');
    if (!form.company.trim()) return toast.error('Company is required');
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) return toast.error('Phone must be exactly 10 digits');
    if (!form.email.trim()) return toast.error('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return toast.error('Please enter a valid email address');
    }

    // Feasibility / location contract
    if (!feasibilityUserId) return toast.error('Please select a Feasibility Team member');
    if (!form.fullAddress.trim()) return toast.error('Customer address is required');
    if (!form.latitude.trim() || !form.longitude.trim()) {
      return toast.error('Latitude and longitude are required');
    }
    if (isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      return toast.error('Please enter valid numeric coordinates');
    }
    if (!form.interestLevel) return toast.error('Interest level is required');

    setIsSaving(true);
    const bwNum = form.bandwidth.replace(/\D/g, '');
    const result = await createOpportunity({
      name: form.name.trim(),
      company: form.company.trim(),
      phone: phoneDigits,
      email: form.email.trim(),
      title: form.title.trim() || null,
      industry: form.industry.trim() || null,
      city: form.city.trim() || null,
      feasibilityAssignedToId: feasibilityUserId,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      fullAddress: form.fullAddress.trim(),
      interestLevel: form.interestLevel,
      bandwidthRequirement: bwNum ? `${bwNum} Mbps` : null,
      numberOfIPs: form.numberOfIPs.trim() ? parseInt(form.numberOfIPs) : null,
      tentativePrice: form.tentativePrice.trim() ? parseFloat(form.tentativePrice) : null,
      otcAmount: form.otcAmount.trim() ? parseFloat(form.otcAmount) : null,
      billingAddress: form.billingAddress.trim() || null,
      billingPincode: form.billingPincode.trim() || null,
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      productIds: selectedProducts,
      notes: form.notes.trim() || null,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success('Opportunity created and assigned to Feasibility Team');
      resetForm();
      router.push('/dashboard/quotation-mgmt');
    } else {
      toast.error(result.error || 'Failed to create opportunity');
    }
  };

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Opportunity"
        description="Fast path for customers you've already closed the meeting with — fill everything in one shot and push straight to feasibility."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contact Section */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-orange-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Customer Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Rohit Verma"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setField('company', e.target.value)}
                  placeholder="e.g. BlueWave Solutions"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="10 digits"
                  maxLength={10}
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="e.g. IT Head"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setField('industry', e.target.value)}
                  placeholder="e.g. Technology"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feasibility + Location */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Feasibility &amp; Customer Location
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign to Feasibility Team <span className="text-red-500">*</span>
              </label>
              <select
                value={feasibilityUserId}
                onChange={(e) => setFeasibilityUserId(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">Select team member...</option>
                {(feasibilityTeamUsers || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.fullAddress}
                onChange={(e) => setField('fullAddress', e.target.value)}
                placeholder="Full customer address..."
                className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Latitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.latitude}
                  onChange={(e) => setField('latitude', e.target.value)}
                  placeholder="e.g. 18.5204"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Longitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.longitude}
                  onChange={(e) => setField('longitude', e.target.value)}
                  placeholder="e.g. 73.8567"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer Interest Level <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'HOT', label: 'Hot', color: 'bg-red-600' },
                  { value: 'WARM', label: 'Warm', color: 'bg-amber-600' },
                  { value: 'COLD', label: 'Cold', color: 'bg-sky-600' },
                ].map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setField('interestLevel', lvl.value)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-colors ${
                      form.interestLevel === lvl.value
                        ? `${lvl.color} text-white border-transparent`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements & Pricing */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-violet-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Requirements &amp; Pricing
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Products of Interest
              </label>
              {products.length === 0 ? (
                <p className="text-xs text-slate-400">Loading products...</p>
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
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400'
                        }`}
                      >
                        {p.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bandwidth (Mbps)
                </label>
                <input
                  type="number"
                  value={form.bandwidth}
                  onChange={(e) => setField('bandwidth', e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Number of IPs
                </label>
                <input
                  type="number"
                  value={form.numberOfIPs}
                  onChange={(e) => setField('numberOfIPs', e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tentative ARC Price
                </label>
                <input
                  type="number"
                  value={form.tentativePrice}
                  onChange={(e) => setField('tentativePrice', e.target.value)}
                  placeholder="₹"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tentative OTC Amount
                </label>
                <input
                  type="number"
                  value={form.otcAmount}
                  onChange={(e) => setField('otcAmount', e.target.value)}
                  placeholder="₹"
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) => setField('expectedDeliveryDate', e.target.value)}
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Billing Address
              </h3>
              <button
                type="button"
                onClick={() => setField('billingAddress', form.fullAddress)}
                disabled={!form.fullAddress.trim()}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white disabled:cursor-not-allowed"
              >
                Same as customer address
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={form.billingAddress}
                onChange={(e) => setField('billingAddress', e.target.value)}
                placeholder="Full billing address..."
                className="sm:col-span-3 h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={form.billingPincode}
                onChange={(e) => setField('billingPincode', e.target.value)}
                placeholder="Pincode"
                maxLength={6}
                className="h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={3}
                placeholder="Any context about the customer, meeting, or requirements..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            {isSaving ? 'Creating...' : 'Create Opportunity'}
          </Button>
        </div>
      </form>
    </div>
  );
}
