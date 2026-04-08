'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useCampaignStore, useUserStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { X, Plus, Database, Phone, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/formatters';

export default function RawDataSelfDataPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createSelfCampaign, fetchAllCampaignData, allCampaignData, allDataPagination, deleteSelfCampaign } = useCampaignStore();
  const { fetchUsersByRole } = useUserStore();

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isBDM = user?.role === 'BDM';
  const isBDMCP = user?.role === 'BDM_CP';
  const isBDMTeamLeader = user?.role === 'BDM_TEAM_LEADER';
  const canAssignToOthers = isBDM || isBDMTeamLeader;
  const showCPDropdown = isBDMCP || isBDMTeamLeader;

  // Channel Partner state (for BDM_CP)
  const [channelPartners, setChannelPartners] = useState([]);
  const [selectedCP, setSelectedCP] = useState('');
  const [loadingCPs, setLoadingCPs] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Assignment options (BDM / TL)
  const [assignmentType, setAssignmentType] = useState('self');
  const [selectedISR, setSelectedISR] = useState('');
  const [isrUsers, setIsrUsers] = useState([]);
  const [loadingISRs, setLoadingISRs] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  // Form state
  const [inputMode, setInputMode] = useState('file');
  const [formData, setFormData] = useState({ campaignName: '', dataSource: '' });
  const [singleData, setSingleData] = useState({ name: '', company: '', phone: '', title: '', email: '', industry: '', city: '' });
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const loadData = async () => {
    if (user) {
      await fetchAllCampaignData(page, pageSize, search, isBDMCP ? 'channel_partner' : 'self');
      if (initialLoad) setInitialLoad(false);
    }
  };

  const loadChannelPartners = async () => {
    setLoadingCPs(true);
    try {
      const res = await (await import('@/lib/api')).default.get('/vendors/channel-partners');
      setChannelPartners(Array.isArray(res.data) ? res.data : res.data.vendors || []);
    } catch (err) { console.error('Failed to load channel partners:', err); }
    finally { setLoadingCPs(false); }
  };

  useEffect(() => {
    if (canAssignToOthers) loadISRUsers();
    if (showCPDropdown) loadChannelPartners();
    loadData();
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadISRUsers = async () => {
    setLoadingISRs(true);
    try {
      const result = await fetchUsersByRole('ISR');
      if (result.success) setIsrUsers(result.users || []);
    } catch (err) {
      console.error('Failed to load ISR users:', err);
    }
    setLoadingISRs(false);
  };

  const showLoading = initialLoad && allCampaignData.length === 0;

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { data: [], headers: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => { row[header] = values[index] || ''; });
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
      headers.forEach((header, index) => { row[header] = values[index] || ''; });
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

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) { setFile(null); setParsedData([]); setDetectedColumns([]); return; }
    setFile(selectedFile);
    setError('');
    const fileName = selectedFile.name.toLowerCase();
    try {
      let result;
      if (fileName.endsWith('.csv')) { result = parseCSV(await selectedFile.text()); }
      else if (fileName.endsWith('.txt')) { result = parseTXT(await selectedFile.text()); }
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) { result = parseExcel(await selectedFile.arrayBuffer()); }
      else { setError('Unsupported file format. Please use .csv, .txt, or .xlsx files.'); setParsedData([]); setDetectedColumns([]); return; }
      setParsedData(result.data);
      setDetectedColumns(result.headers);
    } catch (err) {
      console.error('File parse error:', err);
      setError('Failed to parse file.');
      setParsedData([]);
      setDetectedColumns([]);
    }
  };

  const resetForm = () => {
    setFormData({ campaignName: '', dataSource: '' });
    setSingleData({ name: '', company: '', phone: '', title: '', email: '', industry: '', city: '' });
    setFile(null);
    setParsedData([]);
    setDetectedColumns([]);
    setError('');
    setInputMode('file');
    setAssignmentType('self');
    setSelectedISR('');
    setUploadResult(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputMode === 'file' && parsedData.length === 0) { setError('Please upload a file with data.'); return; }
    if (inputMode === 'single') {
      if (!singleData.name?.trim()) { setError('Full Name is required.'); return; }
      if (!singleData.company?.trim()) { setError('Company is required.'); return; }
      if (!singleData.phone?.trim()) { setError('Phone is required.'); return; }
      if (!singleData.title?.trim()) { setError('Title is required.'); return; }
    }
    if (canAssignToOthers && assignmentType === 'isr' && !selectedISR) { setError('Please select an ISR.'); return; }
    if (isBDMCP && !selectedCP) { setError('Please select a Channel Partner.'); return; }

    setIsLoading(true);
    setError('');
    try {
      const dataToSubmit = inputMode === 'file' ? parsedData : [{
        name: singleData.name.trim(), company: singleData.company.trim(),
        phone: singleData.phone.trim(), title: singleData.title.trim(),
        email: singleData.email?.trim() || '', industry: singleData.industry?.trim() || '',
        city: singleData.city?.trim() || ''
      }];
      const assignToId = (canAssignToOthers && assignmentType === 'isr') ? selectedISR : null;
      let campaignName = formData.campaignName?.trim();
      if (!campaignName) {
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (inputMode === 'single' && singleData.company?.trim()) {
          campaignName = `${singleData.company.trim()} - ${dateStr}`;
        } else if (inputMode === 'file' && file) {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          campaignName = `${fileNameWithoutExt} - ${dateStr}`;
        } else {
          campaignName = `Self Data - ${dateStr}`;
        }
      }
      const cpVendorId = isBDMCP ? selectedCP : null;
      const result = await createSelfCampaign(campaignName, formData.dataSource, dataToSubmit, assignToId, cpVendorId);
      if (!result.success) { const errMsg = result.error || 'Failed to create self data.'; setError(errMsg); toast.error(errMsg); setIsLoading(false); return; }

      loadData();
      const hasInvalid = (result.invalidRecords?.length || 0) > 0;
      if (hasInvalid) {
        setUploadResult(result);
        toast.error(`${result.count} of ${result.totalReceived} records added. ${result.invalidRecords.length} skipped.`);
      } else {
        toast.success(`Self data added with ${result.count} record(s)!`);
        handleCloseModal();
      }
    } catch (err) {
      console.error('Create self campaign error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (campaignId, campaignName) => {
    if (!confirm(`Delete "${campaignName}" and all its data?`)) return;
    setDeletingId(campaignId);
    const result = await deleteSelfCampaign(campaignId);
    setDeletingId(null);
    if (result.success) {
      toast.success('Data set deleted');
      loadData();
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  };

  const downloadSampleCSV = () => {
    const headers = ['Company', 'Name', 'Title', 'Email', 'Phone', 'Industry', 'City'];
    const sampleRow = ['ABC Corp', 'John Doe', 'Manager', 'john@abc.com', '1234567890', 'Technology', 'Mumbai'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sample_self_data.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Raw Data - Self Data</span>
      </div>

      {/* Header */}
      <PageHeader title="Self Data" description="Manage your own sourced contacts">
        <Button onClick={handleOpenModal} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus size={16} className="mr-2" />
          Create Self Data
        </Button>
      </PageHeader>

      {/* My Data Sets Table */}
      <DataTable
        title="My Data Sets"
        totalCount={allDataPagination?.total || 0}
        columns={[
          {
            key: 'srNo', label: 'Sr. No.', render: (_row, index) => {
              const startIndex = allDataPagination ? (allDataPagination.page - 1) * allDataPagination.limit : 0;
              return startIndex + index + 1;
            }
          },
          { key: 'name', label: 'Data Set Name', render: (row) => <span className="font-medium">{row.name?.replace(/^\[(Self|BDM Self|TL Self|SAM Self)\]\s*/i, '') || '-'}</span> },
          { key: 'assignedTo', label: 'Assigned To', render: (row) => {
            if (!row.assignedTo || row.assignedTo.length === 0) return <span className="text-slate-400">-</span>;
            return (
              <div className="flex flex-wrap gap-1">
                {row.assignedTo.map((u) => (
                  <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{u.name}</span>
                ))}
              </div>
            );
          }},
          { key: 'dataCount', label: 'Records', render: (row) => (
            <button
              onClick={() => router.push(`/dashboard/calling-queue?campaignId=${row.id}`)}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 cursor-pointer transition-colors"
              title="Click to start calling"
            >{row.dataCount || 0}</button>
          )},
          { key: 'createdAt', label: 'Created', render: (row) => <span className="text-zinc-500 dark:text-zinc-400">{formatDate(row.createdAt)}</span> },
        ]}
        data={allCampaignData}
        searchable={true}
        searchPlaceholder="Search by name..."
        onSearch={(term) => setSearch(term)}
        loading={showLoading}
        emptyMessage="No self data sets yet. Click 'Create Self Data' to get started."
        emptyIcon={Database}
        serverPagination={allDataPagination ? {
          page: allDataPagination.page,
          totalPages: allDataPagination.totalPages,
          total: allDataPagination.total,
          limit: allDataPagination.limit,
        } : undefined}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        defaultPageSize={pageSize}
        actions={(campaign) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/calling-queue?campaignId=${campaign.id}`)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              title="Start calling"
            >
              <Phone size={14} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(campaign.id, campaign.name)}
              disabled={deletingId === campaign.id}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
              title="Delete data set"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      {/* Create Self Data Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Self Data</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add your own sourced contacts</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {uploadResult ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className={`p-3 rounded-lg text-sm ${uploadResult.count > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                    <p className="font-semibold">{uploadResult.count} of {uploadResult.totalReceived} records uploaded successfully</p>
                  </div>

                  {/* Breakdown */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-semibold mb-1">Skipped Records Breakdown:</p>
                    <ul className="space-y-0.5 text-xs">
                      {uploadResult.duplicateCount > 0 && <li>• Duplicate phone: {uploadResult.duplicateCount}</li>}
                      {uploadResult.skippedNoPhone > 0 && <li>• Missing phone: {uploadResult.skippedNoPhone}</li>}
                      {uploadResult.skippedInvalidPhone > 0 && <li>• Invalid phone (not 10 digits): {uploadResult.skippedInvalidPhone}</li>}
                      {uploadResult.skippedNoName > 0 && <li>• Missing name: {uploadResult.skippedNoName}</li>}
                      {uploadResult.skippedNoCompany > 0 && <li>• Missing company: {uploadResult.skippedNoCompany}</li>}
                      {uploadResult.skippedNoTitle > 0 && <li>• Missing title/designation: {uploadResult.skippedNoTitle}</li>}
                    </ul>
                  </div>

                  {/* Invalid Records Table */}
                  {uploadResult.invalidRecords?.length > 0 && (
                    <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                      <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 border-b border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{uploadResult.invalidRecords.length} Invalid Records</p>
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
                            {uploadResult.invalidRecords.map((rec, i) => (
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
                  )}
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className={`p-3 rounded-md text-sm ${error.startsWith('Warning') ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
                    {error}
                  </div>
                )}

                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaignName" className="text-slate-700 dark:text-slate-300">Campaign Name</Label>
                  <Input id="campaignName" value={formData.campaignName} onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                    placeholder="e.g. Mumbai IT Companies (auto-generated if empty)" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                </div>

                {/* Data Source */}
                <div className="space-y-2">
                  <Label htmlFor="dataSource" className="text-slate-700 dark:text-slate-300">Data Source</Label>
                  <Input id="dataSource" value={formData.dataSource} onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                    placeholder="Where did you get this data? (optional)" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                </div>

                {/* Channel Partner Selection (BDM_CP = mandatory, TL = optional) */}
                {showCPDropdown && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Channel Partner {isBDMCP && <span className="text-red-500">*</span>}
                      {isBDMTeamLeader && <span className="text-xs text-slate-400 font-normal ml-1">(select if this is CP data)</span>}
                    </Label>
                    <select
                      value={selectedCP}
                      onChange={(e) => setSelectedCP(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                    >
                      <option value="">{isBDMCP ? 'Select Channel Partner' : 'None (not CP data)'}</option>
                      {channelPartners.map(cp => (
                        <option key={cp.id} value={cp.id}>{cp.companyName} ({cp.commissionPercentage || 0}%)</option>
                      ))}
                    </select>
                    {loadingCPs && <p className="text-xs text-slate-500">Loading partners...</p>}
                  </div>
                )}

                {/* BDM Assignment Option */}
                {canAssignToOthers && (
                  <div className="space-y-3">
                    <Label className="text-slate-700 dark:text-slate-300">Assign Data To <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setAssignmentType('self'); setSelectedISR(''); }}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${assignmentType === 'self' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <div className="flex flex-col items-center gap-1"><span className="text-sm font-medium">Self</span><span className="text-xs opacity-70">I&apos;ll work on this</span></div>
                      </button>
                      <button type="button" onClick={() => setAssignmentType('isr')}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${assignmentType === 'isr' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <div className="flex flex-col items-center gap-1"><span className="text-sm font-medium">Assign to ISR</span><span className="text-xs opacity-70">ISR will call</span></div>
                      </button>
                    </div>
                    {assignmentType === 'isr' && (
                      <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <Label className="text-orange-700 dark:text-orange-300 mb-2 block text-sm">Select ISR <span className="text-red-500">*</span></Label>
                        {loadingISRs ? (
                          <p className="text-sm text-orange-600 dark:text-orange-400">Loading...</p>
                        ) : isrUsers.length === 0 ? (
                          <p className="text-sm text-amber-600 dark:text-amber-400">No active ISR users found.</p>
                        ) : (
                          <select value={selectedISR} onChange={(e) => setSelectedISR(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                            <option value="">Select an ISR</option>
                            {isrUsers.map((isr) => (<option key={isr.id} value={isr.id}>{isr.name} ({isr.email})</option>))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Input Mode Toggle */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">How to add data? <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setInputMode('file'); setError(''); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${inputMode === 'file' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      <div className="flex flex-col items-center gap-0.5"><span className="text-sm font-medium">Upload File</span><span className="text-xs opacity-70">CSV, Excel, TXT</span></div>
                    </button>
                    <button type="button" onClick={() => { setInputMode('single'); setError(''); }}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${inputMode === 'single' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      <div className="flex flex-col items-center gap-0.5"><span className="text-sm font-medium">Single Entry</span><span className="text-xs opacity-70">Add one contact</span></div>
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                {inputMode === 'file' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Upload File <span className="text-red-500">*</span></Label>
                      <Input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileChange}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-orange-100 dark:file:bg-orange-900/30 file:text-orange-600 dark:file:text-orange-400" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Required columns: Name, Company, Phone, Title</p>
                      {file && parsedData.length > 0 && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{parsedData.length} records found in {file.name}</p>
                      )}
                    </div>
                    <button type="button" onClick={downloadSampleCSV} className="text-orange-600 dark:text-orange-400 hover:text-orange-700 text-sm underline">
                      Download Sample CSV
                    </button>
                    {parsedData.length > 0 && (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800">
                              {detectedColumns.slice(0, 5).map((h, i) => (
                                <th key={i} className="text-left py-2 px-3 text-slate-700 dark:text-slate-300 font-medium text-xs">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                                {detectedColumns.slice(0, 5).map((col, j) => (
                                  <td key={j} className="py-1.5 px-3 text-slate-600 dark:text-slate-400 text-xs">{String(row[col] || '').substring(0, 25)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Single Entry */}
                {inputMode === 'single' && (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-700 dark:text-slate-300 text-sm">Full Name <span className="text-red-500">*</span></Label>
                        <Input value={singleData.name} onChange={(e) => setSingleData({ ...singleData, name: e.target.value })} placeholder="Enter full name" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-700 dark:text-slate-300 text-sm">Company <span className="text-red-500">*</span></Label>
                        <Input value={singleData.company} onChange={(e) => setSingleData({ ...singleData, company: e.target.value })} placeholder="Company name" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-700 dark:text-slate-300 text-sm">Phone <span className="text-red-500">*</span></Label>
                        <Input value={singleData.phone} onChange={(e) => setSingleData({ ...singleData, phone: e.target.value })} placeholder="Phone number" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-700 dark:text-slate-300 text-sm">Designation <span className="text-red-500">*</span></Label>
                        <Input value={singleData.title} onChange={(e) => setSingleData({ ...singleData, title: e.target.value })} placeholder="e.g. Manager, Director" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-700 dark:text-slate-300 text-sm">Email</Label>
                        <Input type="email" value={singleData.email} onChange={(e) => setSingleData({ ...singleData, email: e.target.value })} placeholder="email@example.com" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-700 dark:text-slate-300 text-sm">City</Label>
                        <Input value={singleData.city} onChange={(e) => setSingleData({ ...singleData, city: e.target.value })} placeholder="City" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 dark:text-slate-300 text-sm">Industry</Label>
                      <Input value={singleData.industry} onChange={(e) => setSingleData({ ...singleData, industry: e.target.value })} placeholder="e.g. IT, Manufacturing" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9" />
                    </div>
                  </div>
                )}
              </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={handleCloseModal} variant="outline">{uploadResult ? 'Close' : 'Cancel'}</Button>
              {!uploadResult && (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || (inputMode === 'file' && parsedData.length === 0)}
                  className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Adding...</>
                  ) : (
                    <><Plus size={16} className="mr-2" />Add Data</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
