'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerEnquiryStore } from '@/lib/customerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus,
  ArrowLeft,
  Send,
  Building2,
  Phone,
  MapPin,
  AlignLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

function SectionHeader({ icon: Icon, title, step, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex-shrink-0 mt-0.5">
        {step}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Icon size={15} className="text-blue-600 dark:text-blue-400" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function NewEnquiryPage() {
  const router = useRouter();
  const { submitEnquiry, submitting } = useCustomerEnquiryStore();

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    requirements: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.companyName.trim()) { toast.error('Company name is required'); return; }
    if (!form.contactName.trim()) { toast.error('Contact person is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (form.phone.replace(/\D/g, '').length < 10) { toast.error('Phone must be at least 10 digits'); return; }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Invalid email format');
      return;
    }

    const result = await submitEnquiry({
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      requirements: form.requirements.trim() || undefined,
    });

    if (!result.success) {
      toast.error(result.error || 'Failed to submit enquiry');
      return;
    }

    toast.success('Enquiry submitted successfully!');
    router.push('/customer-portal/enquiries');
  };

  const inputClass = "h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">New Enquiry</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">Submit a business enquiry for our services</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Submit an Enquiry</h2>
              <p className="text-xs text-blue-100">Fill in the business details below</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Section 1: Business Details */}
          <div>
            <SectionHeader icon={Building2} title="Business Details" step="1" subtitle="Company and contact person information" />
            <div className="pl-11 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Company Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Enter company name"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Contact Person <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Full name of contact person"
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section 2: Contact Info */}
          <div>
            <SectionHeader icon={Phone} title="Contact Information" step="2" subtitle="How can we reach them?" />
            <div className="pl-11 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</Label>
                <Input
                  type="email"
                  placeholder="Email address (optional)"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section 3: Location */}
          <div>
            <SectionHeader icon={MapPin} title="Location" step="3" subtitle="Optional - helps us assess feasibility" />
            <div className="pl-11 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Address</Label>
                <Input
                  placeholder="Business address"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">City</Label>
                  <Input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">State</Label>
                  <Input
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section 4: Requirements */}
          <div>
            <SectionHeader icon={AlignLeft} title="Additional Notes" step="4" subtitle="Optional - any requirements or context" />
            <div className="pl-11">
              <Textarea
                placeholder="What services are they looking for? Any special requirements?"
                value={form.requirements}
                onChange={(e) => update('requirements', e.target.value)}
                rows={4}
                className="resize-none rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors"
              />
            </div>
          </div>

          {/* Submit Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="flex items-center gap-3 pl-11">
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none h-11 px-8 rounded-xl gap-2 shadow-sm shadow-blue-600/20"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <>
                    <Send size={15} />
                    Submit Enquiry
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
