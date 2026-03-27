'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  Upload,
  Building2,
  Phone,
  Mail,
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Users,
  User,
  Briefcase,
  MapPin,
} from 'lucide-react';
import TabBar from '@/components/TabBar';
import { PageHeader } from '@/components/PageHeader';

export default function SAMLeadsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isMaster = user?.role === 'MASTER';
  const isSAMExecutive = user?.role === 'SAM_EXECUTIVE';
  const isSAMHead = user?.role === 'SAM_HEAD';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAllowed = isSAMExecutive || isSAMHead || isSuperAdmin || isMaster;

  // Tab state
  const [activeTab, setActiveTab] = useState('create');

  // ISR users
  const [isrUsers, setIsrUsers] = useState([]);
  const [isLoadingISRs, setIsLoadingISRs] = useState(false);

  // Create form
  const [form, setForm] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    designation: '',
    industry: '',
    city: '',
    notes: '',
    source: 'SAM Referral',
    assignToISRId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk upload
  const [bulkData, setBulkData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [bulkISRId, setBulkISRId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Redirect unauthorized
  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, isAllowed, router]);

  // Fetch ISR users
  const fetchISRUsers = useCallback(async () => {
    setIsLoadingISRs(true);
    try {
      const res = await api.get('/users/isr-list');
      setIsrUsers(res.data.users || []);
    } catch {
      console.error('Failed to fetch ISR users');
    } finally {
      setIsLoadingISRs(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchISRUsers();
    }
  }, [isAllowed, fetchISRUsers]);

  // Handle single form field change
  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  // Submit single lead
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.company.trim() || !form.contactName.trim() || !form.phone.trim()) {
      toast.error('Company, contact name, and phone are required');
      return;
    }

    if (form.phone.replace(/\D/g, '').length !== 10) {
      toast.error('Phone must be 10 digits');
      return;
    }

    if (!form.assignToISRId) {
      toast.error('Please select an ISR');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/leads/self-generate', {
        company: form.company.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.replace(/\D/g, ''),
        email: form.email.trim() || undefined,
        designation: form.designation.trim() || undefined,
        industry: form.industry.trim() || undefined,
        city: form.city.trim() || undefined,
        notes: form.notes.trim() || undefined,
        source: form.source || 'SAM Referral',
        assignToISRId: form.assignToISRId,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Lead created and assigned!');
        setForm({
          company: '',
          contactName: '',
          phone: '',
          email: '',
          designation: '',
          industry: '',
          city: '',
          notes: '',
          source: 'SAM Referral',
          assignToISRId: form.assignToISRId,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploadResult(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const mapped = data.map(row => ({
          company: row.company || row.Company || row['Company Name'] || '',
          contactName: row.name || row.Name || row['Full Name'] || `${row.firstName || row['First Name'] || ''} ${row.lastName || row['Last Name'] || ''}`.trim() || '',
          phone: String(row.phone || row.Phone || row.mobile || row.Mobile || row['Phone Number'] || ''),
          email: row.email || row.Email || '',
          designation: row.title || row.Title || row.designation || row.Designation || '',
          industry: row.industry || row.Industry || '',
          city: row.city || row.City || row.Location || '',
        }));

        setBulkData(mapped);
      } catch {
        toast.error('Failed to parse file');
        setBulkData([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk upload
  const handleBulkSubmit = async () => {
    if (bulkData.length === 0) {
      toast.error('No data to upload');
      return;
    }

    if (!bulkISRId) {
      toast.error('Please select an ISR');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const item of bulkData) {
      try {
        await api.post('/leads/self-generate', {
          company: item.company?.trim() || 'Unknown',
          contactName: item.contactName?.trim() || 'Unknown',
          phone: String(item.phone).replace(/\D/g, ''),
          email: item.email?.trim() || undefined,
          designation: item.designation?.trim() || undefined,
          industry: item.industry?.trim() || undefined,
          city: item.city?.trim() || undefined,
          source: 'SAM Bulk Upload',
          assignToISRId: bulkISRId,
        });
        successCount++;
      } catch (error) {
        failCount++;
        errors.push({
          company: item.company,
          phone: item.phone,
          error: error.response?.data?.message || 'Failed'
        });
      }
    }

    setUploadResult({ successCount, failCount, errors });
    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} lead${successCount > 1 ? 's' : ''} created successfully`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} lead${failCount > 1 ? 's' : ''} failed`);
    }
  };

  const resetBulk = () => {
    setBulkData([]);
    setFileName('');
    setUploadResult(null);
  };

  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5';

  if (!isAllowed) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="SAM Leads" description="Create leads and assign them to ISRs for calling" />

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'create', label: 'Create Lead', icon: UserPlus },
          { key: 'bulk', label: 'Bulk Upload', icon: Upload },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ─── Create Lead Tab ─── */}
      {activeTab === 'create' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="h-1 bg-gradient-to-r from-orange-500 to-indigo-600" />
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              {/* ISR Selection */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
                <label className="block text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
                  <Users className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Assign to ISR <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.assignToISRId}
                  onChange={(e) => handleChange('assignToISRId', e.target.value)}
                  className={`${inputClass} border-orange-200 dark:border-orange-800`}
                  required
                >
                  <option value="">Select ISR...</option>
                  {isrUsers.map(isr => (
                    <option key={isr.id} value={isr.id}>{isr.name} ({isr.email})</option>
                  ))}
                </select>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="e.g. Acme Corp"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.contactName}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="10-digit phone number"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="email@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="e.g. IT Manager"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Industry</label>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. IT Services"
                  />
                </div>

                <div>
                  <label className={labelClass}>City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                </div>

              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                  placeholder="Any additional notes about this lead..."
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create & Assign Lead
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── Bulk Upload Tab ─── */}
      {activeTab === 'bulk' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
            <div className="p-5 sm:p-6 space-y-5">
              {/* ISR Selection */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
                <label className="block text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
                  <Users className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Assign all leads to ISR <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulkISRId}
                  onChange={(e) => setBulkISRId(e.target.value)}
                  className={`${inputClass} border-orange-200 dark:border-orange-800`}
                >
                  <option value="">Select ISR...</option>
                  {isrUsers.map(isr => (
                    <option key={isr.id} value={isr.id}>{isr.name} ({isr.email})</option>
                  ))}
                </select>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Upload Excel or CSV file
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Required columns: Name, Company, Phone, Title/Designation
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bulk-file-input"
                />
                <label
                  htmlFor="bulk-file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </label>
                {fileName && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    Selected: <span className="font-medium">{fileName}</span>
                  </p>
                )}
              </div>

              {/* Preview */}
              {bulkData.length > 0 && !uploadResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm px-3 py-1">
                      {bulkData.length} records found
                    </Badge>
                    <button
                      onClick={resetBulk}
                      className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Preview table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm min-w-max">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">#</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Company</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Contact</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Phone</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Designation</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">City</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bulkData.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium">{row.company || '-'}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.contactName || '-'}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.phone || '-'}</td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.designation || '-'}</td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.city || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkData.length > 50 && (
                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 text-center">
                        Showing first 50 of {bulkData.length} records
                      </div>
                    )}
                  </div>

                  {/* Upload button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleBulkSubmit}
                      disabled={isUploading || !bulkISRId}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Assign {bulkData.length} Leads
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload Result */}
              {uploadResult && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Upload Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{uploadResult.successCount}</span> created
                        </span>
                      </div>
                      {uploadResult.failCount > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">{uploadResult.failCount}</span> failed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {uploadResult.errors?.length > 0 && (
                    <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-xs font-medium text-red-600 dark:text-red-400">
                        Failed Records
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {uploadResult.errors.map((err, idx) => (
                          <div key={idx} className="px-3 py-2 text-xs border-t border-red-100 dark:border-red-900/20 text-slate-600 dark:text-slate-400">
                            {err.company} ({err.phone}) - {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={resetBulk}>
                      Upload More
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
