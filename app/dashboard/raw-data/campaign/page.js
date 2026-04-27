'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useCampaignStore, useUserStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Users, X, Upload, Database, Megaphone, Phone } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RawDataCampaignPage() {
  const { user } = useAuthStore();
  const { campaigns, isLoading, fetchCampaigns, fetchMyAssignedCampaigns, deleteCampaign, deleteSelfCampaign, assignUsers } = useCampaignStore();
  const { users, fetchUsers } = useUserStore();
  const [deletingId, setDeletingId] = useState(null);

  const router = useRouter();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isBDM = user?.role === 'BDM';
  const isISR = user?.role === 'ISR';
  const isBDMTeamLeader = user?.role === 'BDM_TEAM_LEADER';
  const canManageCampaigns = isAdmin || isBDM || isBDMTeamLeader;

  // Filters
  const [filters, setFilters] = useState({ code: '', name: '', assignedTo: '' });

  // ISR Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [distributionResult, setDistributionResult] = useState(null);

  // Upload Data Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCampaign, setUploadCampaign] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    if (canManageCampaigns) {
      fetchCampaigns();
      fetchUsers();
    } else {
      fetchMyAssignedCampaigns();
    }
  }, [canManageCampaigns, fetchCampaigns, fetchMyAssignedCampaigns, fetchUsers]);

  const isrUsers = users.filter(u => u.role === 'ISR' && u.isActive);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  const handleDelete = async (campaignId, campaignName, isSelfCampaign = false) => {
    if (!confirm(`Are you sure you want to delete "${campaignName}"? All associated data will be permanently deleted.`)) return;
    setDeletingId(campaignId);
    const result = isSelfCampaign ? await deleteSelfCampaign(campaignId) : await deleteCampaign(campaignId);
    setDeletingId(null);
    if (result.success) {
      toast.success('Campaign deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete campaign');
    }
  };

  // Assignment modal handlers
  const handleOpenAssignModal = (campaign) => {
    setSelectedCampaign(campaign);
    const currentlyAssigned = campaign.assignments?.map(a => a.user?.id).filter(Boolean) || [];
    setSelectedUsers(currentlyAssigned);
    setDistributionResult(null);
    setShowAssignModal(true);
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAssignSubmit = async () => {
    if (!selectedCampaign) return;
    setIsAssigning(true);
    const result = await assignUsers(selectedCampaign.id, selectedUsers);
    if (result.success) {
      setDistributionResult(result.distribution);
      toast.success(result.message || 'ISRs assigned successfully');
    } else {
      toast.error(result.error || 'Failed to assign ISRs');
    }
    setIsAssigning(false);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedCampaign(null);
    setSelectedUsers([]);
    setDistributionResult(null);
  };

  // Upload modal handlers
  const handleOpenUploadModal = (campaign) => {
    setUploadCampaign(campaign);
    setUploadFile(null);
    setParsedData([]);
    setUploadResult(null);
    setShowUploadModal(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadResult(null);

    const fileName = file.name.toLowerCase();
    try {
      let data;
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.trim().split('\n');
        if (lines.length < 2) { setParsedData([]); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        data = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row = {};
          headers.forEach((header, idx) => { row[header] = values[idx] || ''; });
          data.push(row);
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const XLSX = (await import('xlsx'));
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        toast.error('Unsupported file format. Use .csv or .xlsx');
        return;
      }
      setParsedData(data);
    } catch (err) {
      console.error('File parse error:', err);
      toast.error('Failed to parse file');
      setParsedData([]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadCampaign || parsedData.length === 0) return;
    setIsUploading(true);
    try {
      const response = await api.post(`/campaigns/${uploadCampaign.id}/data`, { data: parsedData });
      setUploadResult(response.data);
      toast.success(response.data.message || 'Data uploaded successfully');
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload data');
    }
    setIsUploading(false);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadCampaign(null);
    setUploadFile(null);
    setParsedData([]);
    setUploadResult(null);
  };

  // Display helpers
  const getAssignedUsersDisplay = (campaign) => {
    if (!campaign.assignments || campaign.assignments.length === 0) return null;
    return campaign.assignments.filter(a => a.user?.isActive !== false);
  };

  const getAssignedUsers = (campaign) => {
    if (!campaign.assignments || campaign.assignments.length === 0) return '-';
    return campaign.assignments.map(a => a.user?.name || 'Unknown').join(', ');
  };

  // Apply filters
  const filteredCampaigns = campaigns.filter((c) => {
    // SELF campaigns excluded server-side via getCampaigns
    if (filters.code && !c.code?.toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.name && !c.name?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.assignedTo) {
      const assignedStr = getAssignedUsers(c).toLowerCase();
      if (!assignedStr.includes(filters.assignedTo.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">&raquo;</span>
        <span className="text-slate-900 dark:text-slate-100">Raw Data - Campaign</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isAdmin ? 'Campaigns' : isBDM ? 'My Campaigns' : 'Assigned Campaigns'}
          </h1>
        </div>
        {canManageCampaigns && (
          <Link href="/dashboard/campaigns/create">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Campaign
            </Button>
          </Link>
        )}
      </div>

      {/* Campaign Table */}
      <DataTable
        title={isAdmin ? 'All Campaigns' : isBDM ? 'My Campaigns' : 'Assigned Campaigns'}
        columns={[
          {
            key: 'srNo',
            label: 'Sr. No.',
            render: (_row, index) => index + 1,
          },
          {
            key: 'code',
            label: 'Campaign Code',
            render: (row) => <span className="font-medium">{row.code}</span>,
          },
          {
            key: 'name',
            label: 'Campaign Name',
            render: (row) => {
              if (row.code === 'CUSTOMER-REFERRAL') return row.name;
              const isSelf = row.isSelfGenerated || row.type === 'SELF' || row.name?.startsWith('[Self]') || row.name?.startsWith('[BDM Self]');
              if (isSelf) {
                return (
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded font-medium">
                      {row.selfCreator?.name || row.assignments?.[0]?.user?.name || 'Self'}
                    </span>
                    <span>{row.name?.replace(/^\[(Self|BDM Self)\]\s*/i, '') || '-'}</span>
                  </div>
                );
              }
              return row.name;
            },
          },
          {
            key: 'createdBy',
            label: 'Created By',
            render: (row) => {
              if (row.code === 'CUSTOMER-REFERRAL') {
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                    Customer Portal
                  </span>
                );
              }
              const creator = row.createdBy;
              if (!creator) return <span className="text-zinc-400 dark:text-zinc-500">-</span>;
              const roleColors = {
                SUPER_ADMIN: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                ADMIN: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                BDM: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                BDM_TEAM_LEADER: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
                ISR: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                SAM_EXECUTIVE: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                SAM_HEAD: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
              };
              const colorClass = roleColors[creator.role] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
              return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                  {creator.name}
                </span>
              );
            },
          },
          {
            key: 'dataCount',
            label: 'No. Of Data',
            render: (row) => row.dataCount || row.totalDataCount || row._count?.campaignData || 0,
          },
          ...(!isISR ? [{
            key: 'assignedTo',
            label: 'Assigned To',
            render: (row) => {
              const assignments = getAssignedUsersDisplay(row);
              if (!assignments || assignments.length === 0) {
                return <span className="text-zinc-400 dark:text-zinc-500">-</span>;
              }
              return (
                <div className="flex flex-wrap gap-1.5">
                  {assignments.map((a) => (
                    <span key={a.user?.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                      {a.user?.name || 'Unknown'}
                      <span className="ml-1 px-1 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-300 text-[10px] font-semibold">
                        {a.dataCount || 0}
                      </span>
                    </span>
                  ))}
                </div>
              );
            },
          }] : []),
          {
            key: 'statusBreakdown',
            label: 'Status Breakdown',
            render: (row) => {
              const breakdown = row.statusBreakdown;
              const hasValues = breakdown && Object.values(breakdown).some(v => v > 0);
              if (!hasValues) return <span className="text-zinc-400 dark:text-zinc-500 text-xs">-</span>;
              const badges = [
                { key: 'INTERESTED', label: 'INT', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
                { key: 'NOT_INTERESTED', label: 'NI', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                { key: 'NOT_REACHABLE', label: 'NR', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
                { key: 'CALL_LATER', label: 'CL', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                { key: 'NEW', label: 'NEW', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
              ];
              return (
                <div className="flex flex-wrap gap-1.5">
                  {badges.filter(({ key }) => breakdown[key] > 0).map(({ key, label, color }) => (
                    <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                      {label}: {breakdown[key]}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: 'createdAt',
            label: 'Created',
            render: (row) => <span className="text-zinc-500 dark:text-zinc-400">{formatDate(row.createdAt)}</span>,
          },
        ]}
        data={filteredCampaigns}
        filters={<>
          <input
            type="text"
            placeholder="Filter by code..."
            value={filters.code}
            onChange={(e) => handleFilterChange('code', e.target.value)}
            className="h-9 px-3 w-36 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Filter by name..."
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            className="h-9 px-3 w-36 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {!isISR && (
            <input
              type="text"
              placeholder="Filter by assigned..."
              value={filters.assignedTo}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              className="h-9 px-3 w-40 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          )}
        </>}
        pagination={true}
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage={canManageCampaigns ? 'No campaigns found' : 'No campaigns assigned to you'}
        emptyIcon={Megaphone}
        actions={isISR ? (campaign) => {
          const breakdown = campaign.statusBreakdown || {};
          const callableCount = (breakdown.NEW || 0) + (breakdown.CALL_LATER || 0) + (breakdown.NOT_REACHABLE || 0);
          if (callableCount === 0) return null;
          return (
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/calling-queue?campaignId=${campaign.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              title="Start Calling"
            >
              <Phone size={16} className="mr-1.5" />
              Call
            </Button>
          );
        } : canManageCampaigns ? (campaign) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenUploadModal(campaign)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              title="Upload Data"
            >
              <Upload size={16} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenAssignModal(campaign)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              title="Assign ISRs"
            >
              <Users size={16} />
            </Button>
            {(isAdmin || campaign.type === 'SELF') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(campaign.id, campaign.name, campaign.type === 'SELF' && !isAdmin)}
                disabled={deletingId === campaign.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                {deletingId === campaign.id ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </Button>
            )}
          </div>
        ) : undefined}
      />

      {/* ISR Assignment Modal */}
      {showAssignModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Assign ISRs</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedCampaign.name} ({selectedCampaign.dataCount || 0} records)
                </p>
              </div>
              <button onClick={handleCloseAssignModal} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Select ISRs to assign (data will be distributed equally)
                </label>
                {isrUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    No ISR users available.
                  </p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-800">
                    {isrUsers.map((isrUser) => (
                      <label key={isrUser.id} className="flex items-center gap-3 py-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(isrUser.id)}
                          onChange={() => handleUserToggle(isrUser.id)}
                          className="w-4 h-4 text-orange-600 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{isrUser.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({isrUser.email})</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {selectedUsers.length > 0 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    {selectedUsers.length} ISR(s) selected
                    {selectedCampaign.dataCount > 0 && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}- Each will get ~{Math.floor(selectedCampaign.dataCount / selectedUsers.length)} records
                      </span>
                    )}
                  </p>
                )}
              </div>

              {distributionResult && distributionResult.length > 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Distribution Result</h4>
                  <div className="space-y-1">
                    {distributionResult.map((item) => (
                      <div key={item.userId} className="flex justify-between text-sm">
                        <span className="text-emerald-600 dark:text-emerald-400">{item.userName}</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">{item.dataCount} records</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={handleCloseAssignModal} variant="outline">
                {distributionResult ? 'Close' : 'Cancel'}
              </Button>
              {!distributionResult && (
                <Button onClick={handleAssignSubmit} disabled={isAssigning} className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50">
                  {isAssigning ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Assigning...</>
                  ) : (
                    <><Users size={16} className="mr-2" />Assign &amp; Distribute</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Data Modal */}
      {showUploadModal && uploadCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upload Data</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{uploadCampaign.name}</p>
              </div>
              <button onClick={handleCloseUploadModal} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload File (CSV or Excel)</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-100 dark:file:bg-orange-900/30 file:text-orange-600 dark:file:text-orange-400 hover:file:bg-orange-200"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Required columns: Name, Company, Phone, Email, Title</p>
              </div>

              {parsedData.length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{parsedData.length} records found</p>
                </div>
              )}

              {uploadResult && (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className={`p-3 rounded-lg text-sm ${uploadResult.count > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                    <p className="font-semibold">{uploadResult.count} of {uploadResult.totalReceived} records uploaded successfully</p>
                  </div>

                  {/* Breakdown */}
                  {(uploadResult.duplicateCount > 0 || uploadResult.skippedNoPhone > 0 || uploadResult.skippedInvalidPhone > 0 || uploadResult.skippedNoName > 0 || uploadResult.skippedNoCompany > 0 || uploadResult.skippedNoEmail > 0 || uploadResult.skippedNoTitle > 0) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                      <p className="font-semibold mb-1">Skipped Records Breakdown:</p>
                      <ul className="space-y-0.5 text-xs">
                        {uploadResult.duplicateCount > 0 && <li>• Duplicate phone: {uploadResult.duplicateCount}</li>}
                        {uploadResult.skippedNoPhone > 0 && <li>• Missing phone: {uploadResult.skippedNoPhone}</li>}
                        {uploadResult.skippedInvalidPhone > 0 && <li>• Invalid phone (not 10 digits): {uploadResult.skippedInvalidPhone}</li>}
                        {uploadResult.skippedNoName > 0 && <li>• Missing name: {uploadResult.skippedNoName}</li>}
                        {uploadResult.skippedNoCompany > 0 && <li>• Missing company: {uploadResult.skippedNoCompany}</li>}
                        {uploadResult.skippedNoEmail > 0 && <li>• Missing email: {uploadResult.skippedNoEmail}</li>}
                        {uploadResult.skippedNoTitle > 0 && <li>• Missing title: {uploadResult.skippedNoTitle}</li>}
                      </ul>
                    </div>
                  )}

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
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={handleCloseUploadModal} variant="outline">
                {uploadResult ? 'Close' : 'Cancel'}
              </Button>
              {!uploadResult && (
                <Button
                  onClick={handleUploadSubmit}
                  disabled={isUploading || parsedData.length === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {isUploading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Uploading...</>
                  ) : (
                    <><Upload size={16} className="mr-2" />Upload {parsedData.length} Records</>
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
