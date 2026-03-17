'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCampaignStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

export default function CreateCampaignPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createCampaign, addCampaignData, assignUsers } = useCampaignStore();
  const [formData, setFormData] = useState({
    name: '',
    dataSource: ''
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isrUsers, setIsrUsers] = useState([]);

  // Fetch ISR users on mount
  useEffect(() => {
    const fetchISRUsers = async () => {
      try {
        const response = await api.get('/users/isr-list');
        setIsrUsers(response.data.users || []);
      } catch (err) {
        console.error('Failed to fetch ISR users:', err);
      }
    };
    fetchISRUsers();
  }, []);

  // Redirect if not admin, BDM, or BDM Team Leader
  const canCreateCampaign = user?.role === 'SUPER_ADMIN' || user?.role === 'BDM' || user?.role === 'BDM_TEAM_LEADER';

  useEffect(() => {
    if (user && !canCreateCampaign) {
      router.push('/dashboard');
    }
  }, [user, router, canCreateCampaign]);

  if (!canCreateCampaign) {
    return null;
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return { data, headers };
  };

  const parseTXT = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { data: [], headers: [] };

    const delimiter = lines[0].includes('\t') ? '\t' : '|';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return { data, headers };
  };

  const parseExcel = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    return { data, headers };
  };

  const hasPhoneColumn = (headers) => {
    const phoneVariants = ['phone', 'Phone', 'Corporate Land Line Number', 'Phone Number',
                          'Mobile', 'mobile', 'Contact', 'contact', 'Telephone'];
    return headers.some(h => phoneVariants.includes(h));
  };

  const hasNameColumn = (headers) => {
    const nameVariants = ['name', 'Name', 'First Name', 'FirstName', 'first_name',
                          'Last Name', 'LastName', 'last_name'];
    return headers.some(h => nameVariants.includes(h));
  };

  const hasCompanyColumn = (headers) => {
    const companyVariants = ['company', 'Company', 'Company Name', 'company_name'];
    return headers.some(h => companyVariants.includes(h));
  };

  const hasTitleColumn = (headers) => {
    const titleVariants = ['title', 'Title', 'Designation', 'designation', 'Position', 'position'];
    return headers.some(h => titleVariants.includes(h));
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      setFile(null);
      setParsedData([]);
      setDetectedColumns([]);
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploadResult(null);

    const fileName = selectedFile.name.toLowerCase();

    try {
      let result;
      if (fileName.endsWith('.csv')) {
        const text = await selectedFile.text();
        result = parseCSV(text);
      } else if (fileName.endsWith('.txt')) {
        const text = await selectedFile.text();
        result = parseTXT(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        result = parseExcel(arrayBuffer);
      } else {
        setError('Unsupported file format. Please use .csv, .txt, or .xlsx files.');
        setParsedData([]);
        setDetectedColumns([]);
        return;
      }

      setParsedData(result.data);
      setDetectedColumns(result.headers);

      const missingColumns = [];
      if (!hasPhoneColumn(result.headers)) {
        missingColumns.push('Phone (Phone, Mobile, Contact, Telephone)');
      }
      if (!hasNameColumn(result.headers)) {
        missingColumns.push('Name (Name, First Name, Last Name)');
      }
      if (!hasCompanyColumn(result.headers)) {
        missingColumns.push('Company (Company, Company Name)');
      }
      if (!hasTitleColumn(result.headers)) {
        missingColumns.push('Title (Title, Designation, Position)');
      }
      if (missingColumns.length > 0) {
        setError(`Warning: Missing required columns: ${missingColumns.join(', ')}. Records without these will be skipped.`);
      }
    } catch (err) {
      console.error('File parse error:', err);
      setError('Failed to parse file. Please check the format.');
      setParsedData([]);
      setDetectedColumns([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    setIsLoading(true);
    setError('');
    setUploadResult(null);

    try {
      // Create campaign first
      const result = await createCampaign({
        name: formData.name,
        type: 'CAMPAIGN',
        dataSource: formData.dataSource,
        status: 'ACTIVE'
      });

      if (!result.success) {
        setError(result.error || 'Failed to create campaign.');
        setIsLoading(false);
        return;
      }

      const campaignId = result.campaign?.id;

      // Assign selected ISRs
      if (selectedUsers.length > 0 && campaignId) {
        await assignUsers(campaignId, selectedUsers);
      }

      // If we have parsed data, upload it
      if (parsedData.length > 0 && campaignId) {
        const dataResult = await addCampaignData(campaignId, parsedData);
        if (!dataResult.success) {
          setError(`Campaign created but failed to upload data: ${dataResult.error}`);
          setIsLoading(false);
          return;
        }
        setUploadResult(dataResult);

        // Show result modal if there were any skipped/invalid records
        const totalSkipped = (dataResult.skippedNoPhone || 0) +
                            (dataResult.skippedInvalidPhone || 0) +
                            (dataResult.skippedNoName || 0) +
                            (dataResult.skippedNoCompany || 0) +
                            (dataResult.skippedNoTitle || 0) +
                            (dataResult.duplicateCount || 0);

        if (totalSkipped > 0 || (dataResult.invalidRecords && dataResult.invalidRecords.length > 0)) {
          setShowResultModal(true);
          setIsLoading(false);
          return;
        }
      }

      // Redirect to campaign management
      router.push('/dashboard/raw-data/campaign');
    } catch (err) {
      console.error('Create campaign error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = ['Company', 'First Name', 'Last Name', 'Title', 'Email', 'Phone', 'Industry', 'City'];
    const sampleRow = ['ABC Corp', 'John', 'Doe', 'Manager', 'john@abc.com', '1234567890', 'Technology', 'Mumbai'];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_campaign_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">»</span>
        <Link href="/dashboard/raw-data/campaign" className="hover:text-orange-600 dark:hover:text-orange-400">Campaign List</Link>
        <span className="mx-2">»</span>
        <span className="text-slate-900 dark:text-slate-100">Create Campaign</span>
      </div>

      {/* Page Header */}
      <PageHeader title="Create Campaign" />

      {/* Main Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Campaign Details
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`p-3 rounded-md text-sm ${error.startsWith('Warning') ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
                {error}
              </div>
            )}

            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter campaign name"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Assign To ISR */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Assign To (ISR)
              </Label>
              {isrUsers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No ISR users available</p>
              ) : (
                <>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !selectedUsers.includes(val)) {
                        setSelectedUsers(prev => [...prev, val]);
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-md text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="" disabled>Select ISR to assign...</option>
                    {isrUsers.filter(u => !selectedUsers.includes(u.id)).map((isrUser) => (
                      <option key={isrUser.id} value={isrUser.id}>{isrUser.name} ({isrUser.email})</option>
                    ))}
                  </select>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUsers.map((userId) => {
                        const isrUser = isrUsers.find(u => u.id === userId);
                        if (!isrUser) return null;
                        return (
                          <span key={userId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                            {isrUser.name}
                            <button
                              type="button"
                              onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                              className="hover:text-orange-900 dark:hover:text-orange-200"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {selectedUsers.length > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {selectedUsers.length} ISR(s) selected
                </p>
              )}
            </div>

            {/* Upload CSV */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-slate-700 dark:text-slate-300">
                Upload Data File
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-orange-100 dark:file:bg-orange-900/30 file:text-orange-600 dark:file:text-orange-400"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supported formats: .csv, .txt, .xlsx | <strong>Required columns:</strong> Name, Company, Phone, Title
              </p>
              {file && parsedData.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="text-emerald-600 dark:text-emerald-400">
                    {parsedData.length} records found in {file.name}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Detected columns: {detectedColumns.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Data Source */}
            <div className="space-y-2">
              <Label htmlFor="dataSource" className="text-slate-700 dark:text-slate-300">
                Data Source
              </Label>
              <Input
                id="dataSource"
                type="text"
                value={formData.dataSource}
                onChange={(e) => handleInputChange('dataSource', e.target.value)}
                placeholder="Enter data source (optional)"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Download Sample */}
            <div>
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm underline"
              >
                Download Sample CSV File
              </button>
            </div>

            {/* Preview Table */}
            {parsedData.length > 0 && (
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Data Preview (First 5 rows)
                </Label>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        {detectedColumns.slice(0, 6).map((header, i) => (
                          <th key={i} className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                          {detectedColumns.slice(0, 6).map((col, j) => (
                            <td key={j} className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              {String(row[col] || '').substring(0, 30)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
              <Link href="/dashboard/raw-data/campaign">
                <Button type="button" variant="outline" className="border-slate-300 dark:border-slate-600">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Upload Result Modal */}
      {showResultModal && uploadResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Campaign Created</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {uploadResult.count} records added successfully
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/raw-data/campaign')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-medium">Added</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{uploadResult.count}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Total Received</p>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{uploadResult.totalReceived}</p>
                </div>
                {uploadResult.duplicateCount > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-medium">Duplicates</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{uploadResult.duplicateCount}</p>
                  </div>
                )}
              </div>

              {/* Skipped Records Summary */}
              {((uploadResult.skippedNoPhone || 0) + (uploadResult.skippedInvalidPhone || 0) +
                (uploadResult.skippedNoName || 0) + (uploadResult.skippedNoCompany || 0) +
                (uploadResult.skippedNoTitle || 0)) > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h3 className="font-semibold text-red-700 dark:text-red-300">Skipped Records</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    {uploadResult.skippedNoPhone > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {uploadResult.skippedNoPhone} record(s) - Missing phone number
                      </p>
                    )}
                    {uploadResult.skippedInvalidPhone > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {uploadResult.skippedInvalidPhone} record(s) - Invalid phone number (must have exactly 10 digits)
                      </p>
                    )}
                    {uploadResult.skippedNoName > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {uploadResult.skippedNoName} record(s) - Missing name
                      </p>
                    )}
                    {uploadResult.skippedNoCompany > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {uploadResult.skippedNoCompany} record(s) - Missing company
                      </p>
                    )}
                    {uploadResult.skippedNoTitle > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {uploadResult.skippedNoTitle} record(s) - Missing title/designation
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Invalid Records Table */}
              {uploadResult.invalidRecords && uploadResult.invalidRecords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Invalid Records Details ({uploadResult.invalidRecords.length})
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[200px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                          <tr>
                            <th className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-medium border-r border-slate-200 dark:border-slate-700">Company</th>
                            <th className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-medium border-r border-slate-200 dark:border-slate-700">Name</th>
                            <th className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-medium border-r border-slate-200 dark:border-slate-700">Phone</th>
                            <th className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.invalidRecords.map((record, idx) => (
                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                {record.company || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                {record.name || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 font-mono text-xs">
                                {record.phone || '-'}
                              </td>
                              <td className="py-2 px-3 text-red-600 dark:text-red-400">
                                {record.errorReason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <Button
                onClick={() => router.push('/dashboard/raw-data/campaign')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Continue to Campaign List
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
