'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useCampaignStore, useUserStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Users, X, Megaphone } from 'lucide-react';
import DataTable from '@/components/DataTable';

export default function CampaignManagementPage() {
  const { user } = useAuthStore();
  const { campaigns, isLoading, fetchCampaigns, fetchMyAssignedCampaigns, deleteCampaign, deleteSelfCampaign, assignUsers } = useCampaignStore();
  const { users, fetchUsers } = useUserStore();
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isBDM = user?.role === 'BDM';
  const isBDMTeamLeader = user?.role === 'BDM_TEAM_LEADER';
  const canViewAllCampaigns = isAdmin || isBDM || isBDMTeamLeader;
  const canCreateCampaigns = isAdmin || isBDM || isBDMTeamLeader;
  const canModifyCampaigns = isAdmin; // Only admin can modify

  // Filters
  const [filters, setFilters] = useState({
    code: '',
    name: '',
    assignedTo: ''
  });

  // ISR Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [distributionResult, setDistributionResult] = useState(null);

  useEffect(() => {
    if (canViewAllCampaigns) {
      fetchCampaigns();
      if (isAdmin || isBDMTeamLeader) {
        fetchUsers(); // Admin and Team Leader need users for assignment
      }
    } else {
      fetchMyAssignedCampaigns();
    }
  }, [canViewAllCampaigns, isAdmin, isBDMTeamLeader, fetchCampaigns, fetchMyAssignedCampaigns, fetchUsers]);

  // Filter to only ISR users
  const isrUsers = users.filter(u => u.role === 'ISR' && u.isActive);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  const handleDelete = async (campaignId, campaignName, isSelfCampaign = false) => {
    if (!confirm(`Are you sure you want to delete "${campaignName}"? All associated data will be permanently deleted.`)) {
      return;
    }
    setDeletingId(campaignId);
    const result = isSelfCampaign ? await deleteSelfCampaign(campaignId) : await deleteCampaign(campaignId);
    setDeletingId(null);
    if (result.success) {
      toast.success('Campaign deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete campaign');
    }
  };

  // Open assignment modal
  const handleOpenAssignModal = (campaign) => {
    setSelectedCampaign(campaign);
    // Pre-select currently assigned users
    const currentlyAssigned = campaign.assignments?.map(a => a.user?.id).filter(Boolean) || [];
    setSelectedUsers(currentlyAssigned);
    setDistributionResult(null);
    setShowAssignModal(true);
  };

  // Handle user selection toggle
  const handleUserToggle = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle assignment submission
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

  // Close modal
  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedCampaign(null);
    setSelectedUsers([]);
    setDistributionResult(null);
  };

  // Check if ISR has any self campaigns (BDM is read-only, no actions)
  const hasSelfCampaigns = !isAdmin && !isBDM && campaigns.some(c => c.type === 'SELF');

  // Get assigned users with data count
  const getAssignedUsersDisplay = (campaign) => {
    if (!campaign.assignments || campaign.assignments.length === 0) {
      return null;
    }
    // Filter to only show active ISRs
    const activeAssignments = campaign.assignments.filter(a => a.user?.isActive !== false);
    return activeAssignments;
  };

  // Get assigned users as comma-separated string (for filtering)
  const getAssignedUsers = (campaign) => {
    if (!campaign.assignments || campaign.assignments.length === 0) {
      return '-';
    }
    return campaign.assignments.map(a => a.user?.name || 'Unknown').join(', ');
  };

  // Apply filters
  const filteredCampaigns = campaigns.filter((c) => {
    if (filters.code && !c.code?.toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.name && !c.name?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.assignedTo) {
      const assignedUsers = getAssignedUsers(c).toLowerCase();
      if (!assignedUsers.includes(filters.assignedTo.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-orange-400">Dashboard</Link>
        <span className="mx-2">»</span>
        <span className="text-slate-900 dark:text-slate-100">Campaign List</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isAdmin ? 'Campaign List' : 'My Assigned Campaigns'}
          </h1>
        </div>
        {canCreateCampaigns && (
          <Link href="/dashboard/campaigns/create">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </Button>
          </Link>
        )}
      </div>

      {/* Campaign Table */}
      <DataTable
        title={isAdmin ? 'Campaign List' : 'Assigned Campaigns'}
        columns={[
          {
            key: 'srNo',
            label: 'Sr. No.',
            render: (_row, index) => index + 1,
          },
          {
            key: 'code',
            label: 'Campaign Code',
            render: (row) => (
              <span className="font-medium">{row.code}</span>
            ),
          },
          {
            key: 'name',
            label: 'Campaign Name',
            render: (row) => {
              if (row.code === 'CUSTOMER-REFERRAL') return row.name;
              if (row.isSelfGenerated || row.type === 'SELF' || row.name?.startsWith('[Self]')) {
                return (
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded font-medium">
                      {row.selfCreator?.name || row.assignments?.[0]?.user?.name || 'Unknown'}
                    </span>
                    <span>{row.name?.replace(/^\[Self\]\s*/i, '') || '-'}</span>
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
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
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
          {
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
                    <span
                      key={a.user?.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                    >
                      {a.user?.name || 'Unknown'}
                      <span className="ml-1 px-1 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-300 text-[10px] font-semibold">
                        {a.dataCount || 0}
                      </span>
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: 'convertedCount',
            label: 'Converted to Lead',
            render: (row) => row.convertedCount || 0,
          },
          {
            key: 'statusBreakdown',
            label: 'Status Breakdown',
            render: (row) => {
              const breakdown = row.statusBreakdown;
              const hasValues = breakdown && Object.values(breakdown).some(v => v > 0);
              if (!hasValues) {
                return <span className="text-zinc-400 dark:text-zinc-500 text-xs">-</span>;
              }
              const statusBadges = [
                { key: 'INTERESTED', label: 'INT', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
                { key: 'NOT_INTERESTED', label: 'NI', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                { key: 'NOT_REACHABLE', label: 'NR', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
                { key: 'CALL_LATER', label: 'CL', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                { key: 'WRONG_NUMBER', label: 'WN', color: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' },
                { key: 'NEW', label: 'NEW', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
              ];
              return (
                <div className="flex flex-wrap gap-1.5">
                  {statusBadges
                    .filter(({ key }) => breakdown[key] > 0)
                    .map(({ key, label, color }) => (
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
            render: (row) => (
              <span className="text-zinc-500 dark:text-zinc-400">{formatDate(row.createdAt)}</span>
            ),
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
          <input
            type="text"
            placeholder="Filter by assigned..."
            value={filters.assignedTo}
            onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
            className="h-9 px-3 w-40 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </>}
        pagination={true}
        defaultPageSize={10}
        loading={isLoading}
        emptyMessage={(isAdmin || isBDM) ? 'No campaigns found' : 'No campaigns assigned to you'}
        emptyIcon={Megaphone}
        actions={(canCreateCampaigns || hasSelfCampaigns) ? (campaign) => (
          <div className="flex items-center gap-2">
            {(isAdmin || isBDMTeamLeader) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenAssignModal(campaign)}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                title="Assign ISRs"
              >
                <Users size={16} />
              </Button>
            )}
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
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Assign ISRs</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedCampaign.name} ({selectedCampaign.dataCount || 0} records)
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* ISR Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Select ISRs to assign (data will be distributed equally)
                </label>
                {isrUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    No ISR users available. Please create ISR users first.
                  </p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-800">
                    {isrUsers.map((isrUser) => (
                      <label
                        key={isrUser.id}
                        className="flex items-center gap-3 py-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
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

              {/* Distribution Result */}
              {distributionResult && distributionResult.length > 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                    Data Distribution Result
                  </h4>
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

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={handleCloseModal}
                variant="outline"
              >
                {distributionResult ? 'Close' : 'Cancel'}
              </Button>
              {!distributionResult && (
                <Button
                  onClick={handleAssignSubmit}
                  disabled={isAssigning}
                  className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {isAssigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Users size={16} className="mr-2" />
                      Assign & Distribute
                    </>
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
