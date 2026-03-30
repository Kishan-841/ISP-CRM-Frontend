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
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  XCircle,
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

  // Lead Tracker
  const [leadStats, setLeadStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [expandedCreator, setExpandedCreator] = useState(null);

  const fetchLeadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await api.get('/sam/lead-stats');
      setLeadStats(res.data);
    } catch {
      console.error('Failed to fetch lead stats');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

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

  // Fetch BDM Team Leaders
  const fetchISRUsers = useCallback(async () => {
    setIsLoadingISRs(true);
    try {
      const res = await api.get('/users/by-role?role=BDM_TEAM_LEADER');
      setIsrUsers(res.data.users || []);
    } catch {
      console.error('Failed to fetch team leaders');
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
      <PageHeader title="SAM Leads" description="Create leads and assign them to BDM Team Leaders" />

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: 'create', label: 'Create Lead', icon: UserPlus },
          { key: 'bulk', label: 'Bulk Upload', icon: Upload },
          { key: 'tracker', label: 'Lead Tracker', icon: BarChart3 },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'tracker' && !leadStats) fetchLeadStats();
        }}
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
                  Assign to BDM Team Leader <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.assignToISRId}
                  onChange={(e) => handleChange('assignToISRId', e.target.value)}
                  className={`${inputClass} border-orange-200 dark:border-orange-800`}
                  required
                >
                  <option value="">Select Team Leader...</option>
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
                  Assign all leads to BDM Team Leader <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulkISRId}
                  onChange={(e) => setBulkISRId(e.target.value)}
                  className={`${inputClass} border-orange-200 dark:border-orange-800`}
                >
                  <option value="">Select Team Leader...</option>
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
      {/* ─── Lead Tracker Tab ─── */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          {isLoadingStats ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : !leadStats ? (
            <div className="text-center py-12 text-slate-500">
              <BarChart3 size={40} className="mx-auto mb-2 text-slate-300" />
              <p>No data available</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Total Leads</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{leadStats.totals.total}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Converted to Lead</p>
                  <p className="text-2xl font-bold text-emerald-600">{leadStats.totals.converted}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{leadStats.totals.pending}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Live Customers</p>
                  <p className="text-2xl font-bold text-blue-600">{leadStats.totals.live}</p>
                </div>
              </div>

              {/* Per-SAM Breakdown */}
              <div className="space-y-3">
                {leadStats.stats.map((item) => (
                  <div key={item.creator.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Creator Header */}
                    <button
                      onClick={() => setExpandedCreator(expandedCreator === item.creator.id ? null : item.creator.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <User size={16} className="text-orange-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.creator.name}</p>
                          <p className="text-[10px] text-slate-400">{item.creator.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Status pills */}
                        <div className="hidden sm:flex items-center gap-2">
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">{item.statusCounts.total} Total</Badge>
                          {item.statusCounts.INTERESTED > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{item.statusCounts.INTERESTED} Interested</Badge>}
                          {item.statusCounts.NEW > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{item.statusCounts.NEW} New</Badge>}
                          {item.pipelineCounts.LIVE > 0 && <Badge className="bg-green-100 text-green-700 text-[10px]">{item.pipelineCounts.LIVE} Live</Badge>}
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{item.statusCounts.total}</span>
                        {expandedCreator === item.creator.id ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {expandedCreator === item.creator.id && (
                      <div className="border-t border-slate-200 dark:border-slate-800">
                        {/* Status Summary Bar */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> New: {item.statusCounts.NEW || 0}</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Interested: {item.statusCounts.INTERESTED || 0}</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Not Interested: {item.statusCounts.NOT_INTERESTED || 0}</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Call Later: {item.statusCounts.CALL_LATER || 0}</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Converted: {item.statusCounts.CONVERTED || 0}</span>
                          {item.pipelineCounts.FEASIBLE > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Feasible: {item.pipelineCounts.FEASIBLE}</span>}
                          {item.pipelineCounts.LIVE > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Live: {item.pipelineCounts.LIVE}</span>}
                        </div>

                        {/* Leads Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                                <th className="text-left px-4 py-2 font-medium">Company</th>
                                <th className="text-left px-4 py-2 font-medium">Contact</th>
                                <th className="text-left px-4 py-2 font-medium">Status</th>
                                <th className="text-left px-4 py-2 font-medium">Pipeline</th>
                                <th className="text-left px-4 py-2 font-medium">Assigned To</th>
                                <th className="text-left px-4 py-2 font-medium">Created</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {item.leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{lead.company || '-'}</td>
                                  <td className="px-4 py-2">
                                    <p className="text-slate-700 dark:text-slate-300">{lead.contactName || '-'}</p>
                                    <p className="text-[10px] text-slate-400">{lead.phone}</p>
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge className={
                                      lead.status === 'INTERESTED' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
                                      lead.status === 'NEW' ? 'bg-blue-100 text-blue-700 text-[10px]' :
                                      lead.status === 'NOT_INTERESTED' ? 'bg-red-100 text-red-700 text-[10px]' :
                                      lead.status === 'CALL_LATER' ? 'bg-amber-100 text-amber-700 text-[10px]' :
                                      lead.status === 'CONVERTED' ? 'bg-purple-100 text-purple-700 text-[10px]' :
                                      'bg-slate-100 text-slate-600 text-[10px]'
                                    }>{lead.status}</Badge>
                                  </td>
                                  <td className="px-4 py-2">
                                    {lead.isLive ? (
                                      <Badge className="bg-green-100 text-green-700 text-[10px]"><Zap size={10} className="mr-0.5" /> Live</Badge>
                                    ) : lead.leadStatus ? (
                                      <Badge className="bg-slate-100 text-slate-600 text-[10px]">{lead.leadStatus}</Badge>
                                    ) : (
                                      <span className="text-slate-400 text-xs">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400 text-xs">{lead.assignedTo || '-'}</td>
                                  <td className="px-4 py-2 text-slate-400 text-xs">{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {leadStats.stats.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Users size={40} className="mx-auto mb-2 text-slate-300" />
                  <p>No SAM-generated leads yet</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
