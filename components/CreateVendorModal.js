'use client';

import { useState } from 'react';
import { useVendorStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Building2,
  User,
  FileText,
  X,
  Loader2,
  Plus,
  Upload,
  Landmark,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '@/lib/useModal';

const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

const INITIAL_FORM = {
  vendorEntityType: 'COMPANY',
  companyName: '',
  individualName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  category: '',
  commissionPercentage: '',
  panNumber: '',
  gstNumber: '',
  accountNumber: '',
  ifscCode: '',
  accountName: '',
  bankName: '',
  branchName: '',
};

export default function CreateVendorModal({ open, onClose, onSuccess, defaultCategory = null }) {
  useModal(open, onClose);
  const { createVendor } = useVendorStore();

  const [formData, setFormData] = useState({ ...INITIAL_FORM, category: defaultCategory || '' });
  const [panDocumentFile, setPanDocumentFile] = useState(null);
  const [gstDocumentFile, setGstDocumentFile] = useState(null);
  const [cancelledChequeFile, setCancelledChequeFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM, category: defaultCategory || '' });
    setPanDocumentFile(null);
    setGstDocumentFile(null);
    setCancelledChequeFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    const isCompany = formData.vendorEntityType === 'COMPANY';
    const nameField = isCompany ? 'companyName' : 'individualName';
    if (!formData[nameField]?.trim()) {
      toast.error(isCompany ? 'Company name is required' : 'Individual name is required');
      return;
    }

    const required = ['contactPerson', 'email', 'phone', 'address', 'category'];
    for (const field of required) {
      if (!formData[field]?.trim()) {
        toast.error(`${field.replace(/([A-Z])/g, ' $1').trim()} is required`);
        return;
      }
    }

    setIsSaving(true);
    const submitData = { ...formData };
    if (!isCompany) {
      submitData.companyName = formData.individualName;
    }
    const result = await createVendor({
      ...submitData,
      panDocumentFile,
      gstDocumentFile,
      cancelledChequeFile
    });

    if (result.success) {
      toast.success(result.message || 'Vendor submitted for approval');
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error(result.error || 'Failed to create vendor');
    }
    setIsSaving(false);
  };

  if (!open) return null;

  return (
    <div data-modal className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Plus size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Create New Vendor</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Fill in the details below to submit a vendor for approval</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Vendor Entity Type Toggle */}
          <div>
            <label className={labelClass}>Vendor Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { id: 'COMPANY', label: 'Company', icon: Building2 },
                { id: 'INDIVIDUAL', label: 'Individual', icon: User }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, vendorEntityType: opt.id, companyName: '', individualName: '' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.vendorEntityType === opt.id
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <User size={14} className="text-orange-600" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className={inputClass}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className={labelClass}>
                  {formData.vendorEntityType === 'COMPANY' ? 'Company Name' : 'Individual Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vendorEntityType === 'COMPANY' ? formData.companyName : formData.individualName}
                  onChange={(e) => setFormData({ ...formData, [formData.vendorEntityType === 'COMPANY' ? 'companyName' : 'individualName']: e.target.value })}
                  className={inputClass}
                  placeholder={formData.vendorEntityType === 'COMPANY' ? 'Company name' : 'Individual name'}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  placeholder="Full address"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClass}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={inputClass}
                  placeholder="City"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={inputClass}
                  disabled={!!defaultCategory}
                >
                  <option value="">Select Category</option>
                  <option value="FIBER">Fiber</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="CHANNEL_PARTNER">Channel Partner</option>
                  <option value="THIRD_PARTY">Third Party</option>
                </select>
              </div>
              {formData.category === 'CHANNEL_PARTNER' && (
                <div>
                  <label className={labelClass}>
                    Commission Percentage (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.commissionPercentage}
                    onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. 10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText size={14} className="text-orange-600" /> Documents <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>PAN Number</label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                  className={inputClass}
                  placeholder="PAN number (optional)"
                />
              </div>
              <div>
                <label className={labelClass}>PAN Document</label>
                <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                  panDocumentFile
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                  <Upload size={14} className={panDocumentFile ? 'text-orange-600' : 'text-slate-400'} />
                  <span className={`text-sm truncate ${panDocumentFile ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {panDocumentFile ? panDocumentFile.name : 'Upload PAN image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPanDocumentFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>GST Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  className={inputClass}
                  placeholder="GST number (optional)"
                />
              </div>
              <div>
                <label className={labelClass}>GST Document</label>
                <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                  gstDocumentFile
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                  <Upload size={14} className={gstDocumentFile ? 'text-orange-600' : 'text-slate-400'} />
                  <span className={`text-sm truncate ${gstDocumentFile ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {gstDocumentFile ? gstDocumentFile.name : 'Upload GST image (optional)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setGstDocumentFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Landmark size={14} className="text-orange-600" /> Bank Details <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Bank account number"
                />
              </div>
              <div>
                <label className={labelClass}>IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  className={inputClass}
                  placeholder="IFSC code"
                />
              </div>
              <div>
                <label className={labelClass}>Account Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className={inputClass}
                  placeholder="Account holder name"
                />
              </div>
              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className={inputClass}
                  placeholder="Bank name"
                />
              </div>
              <div>
                <label className={labelClass}>Branch Name</label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className={inputClass}
                  placeholder="Branch name"
                />
              </div>
              <div>
                <label className={labelClass}>Cancelled Cheque</label>
                <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                  cancelledChequeFile
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                  <Upload size={14} className={cancelledChequeFile ? 'text-orange-600' : 'text-slate-400'} />
                  <span className={`text-sm truncate ${cancelledChequeFile ? 'text-orange-700 dark:text-orange-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {cancelledChequeFile ? cancelledChequeFile.name : 'Upload cancelled cheque (optional)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setCancelledChequeFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </form>

        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSaving}
            size="sm"
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Submitting...
              </>
            ) : (
              'Submit for Approval'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
