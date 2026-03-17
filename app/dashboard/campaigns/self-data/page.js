'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCampaignStore, useUserStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { PageHeader } from '@/components/PageHeader';

export default function AddSelfDataPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createSelfCampaign } = useCampaignStore();
  const { fetchUsersByRole } = useUserStore();

  // Input mode: 'file' or 'single'
  const [inputMode, setInputMode] = useState('file');

  // Assignment options (for BDM only)
  const [assignmentType, setAssignmentType] = useState('self'); // 'self' or 'isr'
  const [selectedISR, setSelectedISR] = useState('');
  const [isrUsers, setIsrUsers] = useState([]);
  const [loadingISRs, setLoadingISRs] = useState(false);

  const isBDM = user?.role === 'BDM';
  const isSAM = user?.role === 'SAM';
  const isISR = user?.role === 'ISR';
  const canAssignToOthers = isBDM || isSAM; // BDM and SAM can assign to ISR

  // Fetch ISR users when BDM/SAM loads the page
  useEffect(() => {
    if (canAssignToOthers) {
      loadISRUsers();
    }
  }, [canAssignToOthers]);

  const loadISRUsers = async () => {
    setLoadingISRs(true);
    try {
      const result = await fetchUsersByRole('ISR');
      if (result.success) {
        setIsrUsers(result.users || []);
      }
    } catch (err) {
      console.error('Failed to load ISR users:', err);
    }
    setLoadingISRs(false);
  };

  const [formData, setFormData] = useState({
    name: '',
    dataSource: ''
  });

  // Single data form
  const [singleData, setSingleData] = useState({
    name: '',
    company: '',
    phone: '',
    title: '',
    email: '',
    industry: '',
    city: ''
  });

  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResultData, setUploadResultData] = useState(null);

  // Redirect if admin (only ISR can access this page)
  if (user?.role === 'SUPER_ADMIN') {
    router.push('/dashboard');
    return null;
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSingleDataChange = (field, value) => {
    setSingleData(prev => ({ ...prev, [field]: value }));
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { data: [], headers: [] };

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
    setSuccess('');

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

  const validateSingleData = () => {
    if (!singleData.name?.trim()) {
      setError('Full Name is required.');
      return false;
    }
    if (!singleData.company?.trim()) {
      setError('Company is required.');
      return false;
    }
    if (!singleData.phone?.trim()) {
      setError('Phone number is required.');
      return false;
    }
    if (!singleData.title?.trim()) {
      setError('Title is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    // Validate based on input mode
    if (inputMode === 'file') {
      if (parsedData.length === 0) {
        setError('Please upload a file with data.');
        return;
      }
    } else {
      if (!validateSingleData()) {
        return;
      }
    }

    // Validate ISR selection if BDM/SAM chooses to assign to ISR
    if (canAssignToOthers && assignmentType === 'isr' && !selectedISR) {
      setError('Please select an ISR to assign the data to.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare data based on input mode
      const dataToSubmit = inputMode === 'file'
        ? parsedData
        : [{
            name: singleData.name.trim(),
            company: singleData.company.trim(),
            phone: singleData.phone.trim(),
            title: singleData.title.trim(),
            email: singleData.email?.trim() || '',
            industry: singleData.industry?.trim() || '',
            city: singleData.city?.trim() || ''
          }];

      // Determine who to assign the data to
      const assignToId = (canAssignToOthers && assignmentType === 'isr') ? selectedISR : null;

      const result = await createSelfCampaign(formData.name, formData.dataSource, dataToSubmit, assignToId);

      if (!result.success) {
        setError(result.error || 'Failed to create campaign.');
        setIsLoading(false);
        return;
      }

      setUploadResultData(result);
      const hasInvalid = (result.invalidRecords?.length || 0) > 0;

      if (hasInvalid) {
        setSuccess(`Campaign created with ${result.count} of ${result.totalReceived} record(s). ${result.invalidRecords.length} records skipped.`);
      } else {
        setSuccess(`Campaign created successfully with ${result.count} record(s)!`);
        // Only auto-redirect if no invalid records to show
        setTimeout(() => {
          router.push('/dashboard/campaigns/management');
        }, 1500);
      }
    } catch (err) {
      console.error('Create self campaign error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = ['Company', 'Name', 'Title', 'Email', 'Phone', 'Industry', 'City'];
    const sampleRow = ['ABC Corp', 'John Doe', 'Manager', 'john@abc.com', '1234567890', 'Technology', 'Mumbai'];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_self_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleModeChange = (mode) => {
    setInputMode(mode);
    setError('');
    setSuccess('');
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">»</span>
        <Link href="/dashboard/campaigns/management" className="hover:text-orange-600 dark:hover:text-orange-400">Campaign List</Link>
        <span className="mx-2">»</span>
        <span className="text-slate-900 dark:text-slate-100">Add Self Data</span>
      </div>

      {/* Page Header */}
      <PageHeader title="Add Self Data" description="Add your own data to work on. This will create a personal campaign assigned to you." />

      {/* Main Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Create Campaign
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`p-3 rounded-md text-sm ${error.startsWith('Warning') ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md text-sm bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                {success}
              </div>
            )}

            {/* Upload Result Breakdown */}
            {uploadResultData && uploadResultData.invalidRecords?.length > 0 && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-semibold mb-1">Skipped Records Breakdown:</p>
                  <ul className="space-y-0.5 text-xs">
                    {uploadResultData.duplicateCount > 0 && <li>• Duplicate phone: {uploadResultData.duplicateCount}</li>}
                    {uploadResultData.skippedNoPhone > 0 && <li>• Missing phone: {uploadResultData.skippedNoPhone}</li>}
                    {uploadResultData.skippedInvalidPhone > 0 && <li>• Invalid phone (not 10 digits): {uploadResultData.skippedInvalidPhone}</li>}
                    {uploadResultData.skippedNoName > 0 && <li>• Missing name: {uploadResultData.skippedNoName}</li>}
                    {uploadResultData.skippedNoCompany > 0 && <li>• Missing company: {uploadResultData.skippedNoCompany}</li>}
                    {uploadResultData.skippedNoTitle > 0 && <li>• Missing title/designation: {uploadResultData.skippedNoTitle}</li>}
                  </ul>
                </div>
                <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 border-b border-red-200 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{uploadResultData.invalidRecords.length} Invalid Records</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50/50 dark:bg-red-900/10 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1.5 text-red-600 dark:text-red-400 font-medium">#</th>
                          <th className="text-left px-2 py-1.5 text-red-600 dark:text-red-400 font-medium">Name</th>
                          <th className="text-left px-2 py-1.5 text-red-600 dark:text-red-400 font-medium">Phone</th>
                          <th className="text-left px-2 py-1.5 text-red-600 dark:text-red-400 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                        {uploadResultData.invalidRecords.map((rec, i) => (
                          <tr key={i} className="text-slate-700 dark:text-slate-300">
                            <td className="px-2 py-1">{i + 1}</td>
                            <td className="px-2 py-1 truncate max-w-[120px]">{rec.name || '-'}</td>
                            <td className="px-2 py-1">{rec.phone || '-'}</td>
                            <td className="px-2 py-1 text-red-600 dark:text-red-400">{rec.errorReason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard/campaigns/management')}
                  className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Go to Campaign Management
                </button>
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
                placeholder="Enter campaign name (e.g., My Leads - Dec 2024)"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your campaign will be prefixed with [Self] for easy identification
              </p>
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
                placeholder="Where did you get this data? (optional)"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Assignment Option (BDM and SAM) */}
            {canAssignToOthers && (
              <div className="space-y-3">
                <Label className="text-slate-700 dark:text-slate-300">
                  Assign Data To <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType('self');
                      setSelectedISR('');
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      assignmentType === 'self'
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm font-medium">Assign to Self</span>
                      <span className="text-xs opacity-70">I'll work on this</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentType('isr')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      assignmentType === 'isr'
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm font-medium">Assign to ISR</span>
                      <span className="text-xs opacity-70">ISR will call</span>
                    </div>
                  </button>
                </div>

                {/* ISR Selection Dropdown */}
                {assignmentType === 'isr' && (
                  <div className="mt-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Label htmlFor="isrSelect" className="text-orange-700 dark:text-orange-300 mb-2 block">
                      Select ISR <span className="text-red-500">*</span>
                    </Label>
                    {loadingISRs ? (
                      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading ISR users...
                      </div>
                    ) : isrUsers.length === 0 ? (
                      <p className="text-sm text-amber-600 dark:text-amber-400">No active ISR users found.</p>
                    ) : (
                      <select
                        id="isrSelect"
                        value={selectedISR}
                        onChange={(e) => setSelectedISR(e.target.value)}
                        className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        <option value="">Select an ISR</option>
                        {isrUsers.map((isr) => (
                          <option key={isr.id} value={isr.id}>{isr.name} ({isr.email})</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      The selected ISR will be assigned to work on this data and it will appear in their calling queue.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Input Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                How would you like to add data? <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('file')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    inputMode === 'file'
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Upload File</span>
                    <span className="text-xs opacity-70">CSV, Excel, TXT</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('single')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    inputMode === 'single'
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium">Single Entry</span>
                    <span className="text-xs opacity-70">Add one contact</span>
                  </div>
                </button>
              </div>
            </div>

            {/* File Upload Mode */}
            {inputMode === 'file' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="file" className="text-slate-700 dark:text-slate-300">
                    Upload Data File <span className="text-red-500">*</span>
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
              </>
            )}

            {/* Single Entry Mode */}
            {inputMode === 'single' && (
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Enter contact details below. Fields marked with <span className="text-red-500">*</span> are required.
                </p>

                {/* Full Name */}
                <div className="space-y-1">
                  <Label htmlFor="singleName" className="text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="singleName"
                    type="text"
                    value={singleData.name}
                    onChange={(e) => handleSingleDataChange('name', e.target.value)}
                    placeholder="Enter full name"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Company */}
                <div className="space-y-1">
                  <Label htmlFor="singleCompany" className="text-slate-700 dark:text-slate-300">
                    Company <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="singleCompany"
                    type="text"
                    value={singleData.company}
                    onChange={(e) => handleSingleDataChange('company', e.target.value)}
                    placeholder="Enter company name"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <Label htmlFor="singlePhone" className="text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="singlePhone"
                    type="text"
                    value={singleData.phone}
                    onChange={(e) => handleSingleDataChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <Label htmlFor="singleTitle" className="text-slate-700 dark:text-slate-300">
                    Title / Designation <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="singleTitle"
                    type="text"
                    value={singleData.title}
                    onChange={(e) => handleSingleDataChange('title', e.target.value)}
                    placeholder="e.g. Manager, Director, CEO"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Email (Optional) */}
                <div className="space-y-1">
                  <Label htmlFor="singleEmail" className="text-slate-700 dark:text-slate-300">
                    Email
                  </Label>
                  <Input
                    id="singleEmail"
                    type="email"
                    value={singleData.email}
                    onChange={(e) => handleSingleDataChange('email', e.target.value)}
                    placeholder="email@example.com (optional)"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Industry & City in a row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="singleIndustry" className="text-slate-700 dark:text-slate-300">
                      Industry
                    </Label>
                    <Input
                      id="singleIndustry"
                      type="text"
                      value={singleData.industry}
                      onChange={(e) => handleSingleDataChange('industry', e.target.value)}
                      placeholder="e.g. IT, Manufacturing"
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="singleCity" className="text-slate-700 dark:text-slate-300">
                      City
                    </Label>
                    <Input
                      id="singleCity"
                      type="text"
                      value={singleData.city}
                      onChange={(e) => handleSingleDataChange('city', e.target.value)}
                      placeholder="Enter city"
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || (inputMode === 'file' && parsedData.length === 0)}
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
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
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Campaign
                  </>
                )}
              </Button>
              <Link href="/dashboard/campaigns/management">
                <Button type="button" variant="outline" className="border-slate-300 dark:border-slate-600">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 max-w-2xl mt-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Choose to upload a file with multiple contacts or add a single contact</li>
                <li>A new campaign will be created and automatically assigned to you</li>
                <li>All data will be pre-assigned to you for immediate work</li>
                <li>View and work on this data from the Campaign Management page</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
