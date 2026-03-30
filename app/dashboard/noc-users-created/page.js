'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import DataTable from '@/components/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  UserPlus,
  Copy,
  Network,
  CheckCircle,
  Wifi,
  Hash,
  Eye,
  EyeOff,
  X,
  MapPin,
  Phone,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function NocUsersCreatedPage() {
  const router = useRouter();
  const { user, isNOC: _isNOC, isSuperAdmin: isAdmin } = useRoleCheck();
  const isNOC = _isNOC || user?.role === 'NOC_HEAD';
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, ipAssigned: 0, configured: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Redirect non-NOC users
  useEffect(() => {
    if (user && !isNOC && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isNOC, isAdmin, router]);

  const fetchUsersCreated = async () => {
    if (!isNOC && !isAdmin) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads/noc/queue?status=all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        // Filter to only show leads with customerUserId (user created)
        const usersCreated = data.leads.filter(lead => lead.customerUserId);
        setLeads(usersCreated);

        // Calculate stats
        setStats({
          total: usersCreated.length,
          ipAssigned: usersCreated.filter(l => l.customerIpAssigned).length,
          configured: usersCreated.filter(l => l.customerSwitchPort).length
        });
      }
    } catch (error) {
      console.error('Failed to fetch users created:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useSocketRefresh(fetchUsersCreated, { enabled: isNOC || isAdmin });

  // Fetch users created
  useEffect(() => {
    fetchUsersCreated();
  }, [isNOC, isAdmin]);

  // Handle view details
  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Toggle password visibility
  const togglePasswordVisibility = (leadId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  // Get status badge
  const getStatusBadge = (lead) => {
    if (lead.customerSwitchPort) {
      return { label: 'CONFIGURED', color: 'bg-green-100 text-green-700' };
    }
    if (lead.customerIpAssigned) {
      return { label: 'IP ASSIGNED', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'USER CREATED', color: 'bg-orange-100 text-orange-700' };
  };

  if (!user || (!isNOC && !isAdmin)) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        {/* Header */}
        <PageHeader title="Users Created" description="All customer accounts created by NOC team" />

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard color="orange" icon={UserPlus} label="Total Created" value={stats.total} />
          <StatCard color="blue" icon={Network} label="IP Assigned" value={stats.ipAssigned} />
          <StatCard color="green" icon={CheckCircle} label="Configured" value={stats.configured} />
        </div>

        {/* Table */}
        <DataTable
          title="Users Created"
          totalCount={leads.length}
          columns={[
            {
              key: 'company',
              label: 'Company',
              render: (row) => (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Building2 className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{row.company}</p>
                    <p className="text-xs text-slate-500">{row.name}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'customerUserId',
              label: 'Customer ID',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-900 dark:text-white">{row.customerUserId}</span>
                  <button
                    onClick={() => copyToClipboard(row.customerUserId, 'Customer ID')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    <Copy className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              ),
            },
            {
              key: 'customerUsername',
              label: 'Username',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{row.customerUsername}</span>
                  <button
                    onClick={() => copyToClipboard(row.customerUsername, 'Username')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    <Copy className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              ),
            },
            {
              key: 'customerPassword',
              label: 'Password',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {visiblePasswords[row.id] ? (row.customerPassword || '-') : '••••••••'}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(row.id)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title={visiblePasswords[row.id] ? 'Hide password' : 'Show password'}
                  >
                    {visiblePasswords[row.id] ? (
                      <EyeOff className="h-3 w-3 text-slate-400" />
                    ) : (
                      <Eye className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                  {row.customerPassword && (
                    <button
                      onClick={() => copyToClipboard(row.customerPassword, 'Password')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      <Copy className="h-3 w-3 text-slate-400" />
                    </button>
                  )}
                </div>
              ),
            },
            {
              key: 'customerCreatedAt',
              label: 'Created',
              render: (row) => (
                <div>
                  <p className="text-sm text-slate-900 dark:text-white">{formatDate(row.customerCreatedAt)}</p>
                  <p className="text-xs text-slate-500">{row.customerCreatedBy?.name || '-'}</p>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => {
                const status = getStatusBadge(row);
                return <Badge className={status.color}>{status.label}</Badge>;
              },
            },
            {
              key: 'ipSwitch',
              label: 'IP / Switch',
              render: (row) => (
                <div className="space-y-1">
                  {row.customerIpAssigned ? (
                    <p className="text-xs text-blue-600">IP: {row.customerIpAssigned}</p>
                  ) : (
                    <p className="text-xs text-slate-400">No IP</p>
                  )}
                  {row.customerSwitchPort ? (
                    <p className="text-xs text-green-600">Port: {row.customerSwitchPort}</p>
                  ) : (
                    <p className="text-xs text-slate-400">No Switch</p>
                  )}
                </div>
              ),
            },
          ]}
          data={leads}
          loading={loading}
          searchable
          searchPlaceholder="Search by company, name, username..."
          searchKeys={['company', 'name', 'customerUsername', 'customerUserId']}
          pagination
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyMessage="No customer accounts created yet"
          emptyIcon={UserCheck}
          actions={(row) => (
            <button
              onClick={() => handleViewDetails(row)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        />
      </div>

      {/* Lead Details Modal */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailsModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedLead.company}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedLead.name}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{selectedLead.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{selectedLead.city}, {selectedLead.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{selectedLead.bandwidthRequirement || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{selectedLead.numberOfIPs || '-'} IPs</span>
                </div>
              </div>

              {/* Customer Account Details */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Customer Account
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded">
                    <div>
                      <p className="text-xs text-slate-500">Customer ID</p>
                      <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{selectedLead.customerUserId}</p>
                    </div>
                    <button onClick={() => copyToClipboard(selectedLead.customerUserId, 'Customer ID')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                      <Copy className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded">
                    <div>
                      <p className="text-xs text-slate-500">Username</p>
                      <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{selectedLead.customerUsername}</p>
                    </div>
                    <button onClick={() => copyToClipboard(selectedLead.customerUsername, 'Username')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                      <Copy className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="text-sm text-slate-900 dark:text-white">{formatDate(selectedLead.customerCreatedAt)} by {selectedLead.customerCreatedBy?.name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Network Details */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                  <Network className="h-4 w-4" /> Network Configuration
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <p className="text-xs text-slate-500">IP Address</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-white">{selectedLead.customerIpAssigned || 'Not assigned'}</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <p className="text-xs text-slate-500">Switch Port</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-white">{selectedLead.customerSwitchPort || 'Not configured'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <Button onClick={() => setShowDetailsModal(false)} variant="outline">Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
