'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Users, CheckCircle, AlertCircle, Calendar, User, Heart } from 'lucide-react';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { useModal } from '@/lib/useModal';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/PageHeader';

export default function SAMHeadDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    assignedCustomers: 0,
    unassignedCustomers: 0,
    meetingsThisWeek: 0,
    executiveCount: 0
  });

  // Customer list
  const [customers, setCustomers] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  // Check authorization
  useEffect(() => {
    if (user && user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/sam/head/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      if (search) params.append('search', search);
      if (assignedFilter !== 'all') params.append('assigned', assignedFilter === 'assigned' ? 'true' : 'false');

      const response = await api.get(`/sam/customers/invoiced?${params}`);
      setCustomers(response.data.customers);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, assignedFilter]);

  // Fetch executives
  const fetchExecutives = useCallback(async () => {
    try {
      const response = await api.get('/sam/executives');
      setExecutives(response.data.executives);
    } catch (error) {
      console.error('Error fetching executives:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER') {
      fetchStats();
      fetchCustomers();
      fetchExecutives();
    }
  }, [user, fetchStats, fetchCustomers, fetchExecutives]);

  // Auto-refresh when socket events arrive
  useSocketRefresh(() => { fetchStats(); fetchCustomers(); }, { enabled: user?.role === 'SAM_HEAD' || user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER' });

  // Handle assignment
  const openAssignModal = (customer, isReassign = false) => {
    setSelectedCustomer(customer);
    setIsReassigning(isReassign);
    setSelectedExecutive(isReassign && customer.samAssignment ? customer.samAssignment.samExecutive.id : '');
    setAssignmentNotes(isReassign && customer.samAssignment ? customer.samAssignment.notes || '' : '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    setSelectedExecutive('');
    setAssignmentNotes('');
    setIsReassigning(false);
  };

  useModal(showModal, () => !isSubmitting && closeModal());

  const handleAssignment = async (e) => {
    e.preventDefault();
    if (!selectedExecutive) {
      toast.error('Please select an executive');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isReassigning) {
        await api.post(`/sam/reassign/${selectedCustomer.id}`, {
          samExecutiveId: selectedExecutive,
          notes: assignmentNotes
        });
        toast.success('Customer reassigned successfully');
      } else {
        await api.post('/sam/assign', {
          customerId: selectedCustomer.id,
          samExecutiveId: selectedExecutive,
          notes: assignmentNotes
        });
        toast.success('Customer assigned successfully');
      }
      closeModal();
      fetchCustomers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || (user.role !== 'SAM_HEAD' && user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER')) {
    return null;
  }

  const getContractPeriod = (row) => {
    const startDate = row.actualPlanStartDate || row.contractStartDate;
    if (!startDate) return '-';
    const start = new Date(startDate);
    const end = new Date(start.getFullYear(), start.getMonth() + 11, start.getDate());
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const columns = [
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {row.campaignData?.company || '-'}
        </p>
      )
    },
    {
      key: 'installationAddress',
      label: 'Installation Address',
      render: (row) => (
        <p className="text-sm text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={row.installationAddress || '-'}>
          {row.installationAddress || '-'}
        </p>
      )
    },
    {
      key: 'bandwidth',
      label: 'Bandwidth',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100">
          {row.actualPlanBandwidth ? `${row.actualPlanBandwidth} Mbps` : '-'}
        </p>
      )
    },
    {
      key: 'circuitId',
      label: 'Circuit ID',
      render: (row) => (
        <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{row.circuitId || '-'}</p>
      )
    },
    {
      key: 'username',
      label: 'Username',
      render: (row) => (
        <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{row.customerUsername || '-'}</p>
      )
    },
    {
      key: 'samName',
      label: 'SAM Name',
      render: (row) => row.samAssignment ? (
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {row.samAssignment.samExecutive.name}
        </p>
      ) : (
        <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
          Unassigned
        </Badge>
      )
    },
    {
      key: 'activationDate',
      label: 'Activation Date',
      render: (row) => (
        <p className="text-sm text-slate-900 dark:text-slate-100">
          {formatDate(row.actualPlanStartDate)}
        </p>
      )
    },
    {
      key: 'city',
      label: 'City',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100">{row.campaignData?.city || '-'}</p>
      )
    },
    {
      key: 'arc',
      label: 'ARC',
      render: (row) => (
        <p className="text-slate-900 dark:text-slate-100 font-medium">
          {row.arcAmount ? `₹${Number(row.arcAmount).toLocaleString('en-IN')}` : '-'}
        </p>
      )
    },
    {
      key: 'contact',
      label: 'Contact Details',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-900 dark:text-slate-100">{row.campaignData?.name || '-'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.campaignData?.phone || '-'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.campaignData?.email || '-'}</p>
        </div>
      )
    },
    {
      key: 'contractPeriod',
      label: 'Contract Period',
      render: (row) => (
        <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
          {getContractPeriod(row)}
        </p>
      )
    },
  ];

  return (
    <>
      <PageHeader title="SAM Head Dashboard" description="Manage customer assignments to SAM executives" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <StatCard color="orange" icon={Users} label="Total Customers" value={stats.totalCustomers} />
        <StatCard color="emerald" icon={CheckCircle} label="Assigned" value={stats.assignedCustomers} />
        <StatCard color="amber" icon={AlertCircle} label="Unassigned" value={stats.unassignedCustomers} />
        <StatCard color="blue" icon={Calendar} label="Meetings (Week)" value={stats.meetingsThisWeek} />
        <StatCard color="slate" icon={User} label="Executives" value={stats.executiveCount} />
      </div>

      {/* Customers Table */}
      <DataTable
        title="Customer Assignments"
        totalCount={total}
        columns={columns}
        data={customers}
        loading={isLoading}
        searchable
        searchPlaceholder="Search company, name..."
        onSearch={(val) => { setSearch(val); setPage(1); }}
        filters={
          <div className="flex items-center gap-2">
            <select
              value={assignedFilter}
              onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Customers</option>
              <option value="assigned">Assigned Only</option>
              <option value="unassigned">Unassigned Only</option>
            </select>
            <Button
              onClick={() => router.push('/dashboard/sam-head/meetings')}
              variant="outline"
              size="sm"
              className="border-slate-300 dark:border-slate-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              All Meetings
            </Button>
          </div>
        }
        pagination
        serverPagination={{ page, limit: pageSize, total, totalPages }}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        actions={(row) => row.samAssignment ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); openAssignModal(row, true); }}
            className="border-slate-300 dark:border-slate-700"
          >
            Reassign
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); openAssignModal(row, false); }}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Assign
          </Button>
        )}
        onRowClick={(row) => router.push(`/dashboard/sam-executive/customers/${row.id}`)}
        emptyMessage="No customers found"
        emptySubtitle="No customers match your search criteria."
      />

      {/* Assignment Modal */}
      {showModal && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {isReassigning ? 'Reassign Customer' : 'Assign Customer'}
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">Customer</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedCustomer?.campaignData?.company || '-'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCustomer?.campaignData?.name || '-'}
                </p>
              </div>

              <form onSubmit={handleAssignment} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">SAM Executive</Label>
                  <select
                    value={selectedExecutive}
                    onChange={(e) => setSelectedExecutive(e.target.value)}
                    className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="">Select Executive</option>
                    {executives.map((exec) => (
                      <option key={exec.id} value={exec.id}>
                        {exec.name} ({exec._count?.samAssignmentsAsExecutive || 0} customers)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Notes (optional)</Label>
                  <textarea
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 resize-none"
                    placeholder="Any special notes about this assignment..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : isReassigning ? 'Reassign' : 'Assign'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
