'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useCampaignStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { useModal } from '@/lib/useModal';

const EDIT_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title/Designation' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'address', label: 'Address' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'industry', label: 'Industry' },
  { key: 'companySize', label: 'Company Size' },
  { key: 'linkedinUrl', label: 'LinkedIn URL' }
];

export default function EditCampaignDataModal({ data, isOpen, onClose, onSaved }) {
  const { editCampaignData } = useCampaignStore();
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useModal(isOpen, () => !isSaving && onClose());

  useEffect(() => {
    if (data && isOpen) {
      const initialData = {};
      EDIT_FIELDS.forEach(({ key }) => {
        initialData[key] = data[key] || '';
      });
      setFormData(initialData);
    }
  }, [data, isOpen]);

  const handleSave = async () => {
    if (!data) return;
    setIsSaving(true);
    const result = await editCampaignData(data.id, formData);
    setIsSaving(false);
    if (result.success) {
      toast.success('Data updated successfully');
      onSaved?.({ ...data, ...formData });
      onClose();
    } else {
      toast.error(result.error || 'Failed to update data');
    }
  };

  if (!isOpen) return null;

  return (
    <div data-modal className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit Contact Details</h2>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {EDIT_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
              <input
                type="text"
                value={formData[key] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={label}
              />
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="text-sm"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                Saving...
              </div>
            ) : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
