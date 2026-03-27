'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import {
  Users,
  Phone,
  Briefcase,
  DollarSign,
  BarChart3,
  Eye,
  ChevronRight,
  Loader2,
  Truck
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export default function AdminDashboardsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState({
    isr: '',
    bdm: '',
    accounts: '',
    delivery: ''
  });
  const [users, setUsers] = useState({
    isr: [],
    bdm: [],
    accounts: [],
    delivery: []
  });

  const isTL = user?.role === 'BDM_TEAM_LEADER';
  const isAllowed = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER' || isTL;

  // Check authorization
  useEffect(() => {
    if (user && !isAllowed) {
      router.push('/dashboard');
    }
  }, [user, router, isAllowed]);

  // Fetch users by role - API already filters for active users
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isTL) {
        // Team Leader: fetch only ISR and BDM users (filtered to their team on backend)
        const [isrRes, bdmRes] = await Promise.all([
          api.get('/users/by-role?role=ISR'),
          api.get('/users/by-role?role=BDM')
        ]);
        setUsers({
          isr: isrRes.data.users || [],
          bdm: bdmRes.data.users || [],
          accounts: [],
          delivery: []
        });
      } else {
        // Super Admin: fetch all roles
        const [isrRes, bdmRes, accountsRes, deliveryRes] = await Promise.all([
          api.get('/users/by-role?role=ISR'),
          api.get('/users/by-role?role=BDM'),
          api.get('/users/by-role?role=ACCOUNTS_TEAM'),
          api.get('/users/by-role?role=DELIVERY_TEAM')
        ]);
        setUsers({
          isr: isrRes.data.users || [],
          bdm: bdmRes.data.users || [],
          accounts: accountsRes.data.users || [],
          delivery: deliveryRes.data.users || []
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isTL]);

  useEffect(() => {
    if (isAllowed) {
      fetchData();
    }
  }, [user, fetchData, isAllowed]);

  const handleViewIndividual = (roleId) => {
    const memberId = selectedUsers[roleId];
    if (!memberId) return;

    if (roleId === 'delivery') {
      router.push(`/dashboard/delivery-report?userId=${memberId}`);
    } else {
      router.push(`/dashboard/admin-dashboards/${roleId}/${memberId}`);
    }
  };

  if (!user || !isAllowed) {
    return null;
  }

  const allRoleCards = [
    {
      id: 'isr',
      title: 'ISR Dashboard',
      description: 'Telecalling performance & lead generation',
      icon: Phone,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100 text-blue-600',
      borderColor: 'border-blue-200 dark:border-blue-800',
      overallPath: '/dashboard/admin-dashboards/isr',
      users: users.isr
    },
    {
      id: 'bdm',
      title: 'BDM Dashboard',
      description: 'Sales pipeline & team performance',
      icon: Briefcase,
      color: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100 text-green-600',
      borderColor: 'border-green-200 dark:border-green-800',
      overallPath: '/dashboard/admin-dashboards/bdm',
      users: users.bdm
    },
    {
      id: 'accounts',
      title: 'Accounts Dashboard',
      description: 'Billing, collections & financials',
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100 text-orange-600',
      borderColor: 'border-orange-200 dark:border-orange-800',
      overallPath: '/dashboard/admin-dashboards/accounts',
      users: users.accounts
    },
    {
      id: 'delivery',
      title: 'Delivery Reports',
      description: 'Installation tracking & materials',
      icon: Truck,
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100 text-orange-600',
      borderColor: 'border-orange-200 dark:border-orange-800',
      overallPath: '/dashboard/delivery-report',
      users: users.delivery
    }
  ];

  // TL only sees ISR and BDM dashboards
  const roleCards = isTL
    ? allRoleCards.filter(c => c.id === 'isr' || c.id === 'bdm')
    : allRoleCards;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader title="Team Dashboard & Reports" description="View and monitor performance across all teams" />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roleCards.map((role) => (
            <Card
              key={role.id}
              className={`bg-white dark:bg-slate-900 ${role.borderColor} overflow-hidden`}
            >
              {/* Card Header with gradient */}
              <div className={`bg-gradient-to-r ${role.color} p-4`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <role.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{role.title}</h2>
                    <p className="text-white/80 text-xs">{role.description}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Team count badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Team Members</span>
                  <Badge variant="secondary">{role.users.length}</Badge>
                </div>

                {/* Overall Dashboard Button */}
                <Button
                  onClick={() => router.push(role.overallPath)}
                  className={`w-full bg-gradient-to-r ${role.color} hover:opacity-90 text-white`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Overall Dashboard
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">or view individual</span>
                  </div>
                </div>

                {/* Individual User Dropdown */}
                <div className="flex gap-2">
                  <Select
                    value={selectedUsers[role.id]}
                    onValueChange={(value) => setSelectedUsers(prev => ({ ...prev, [role.id]: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {role.users.length === 0 ? (
                        <div className="py-6 text-center text-sm text-slate-500">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No members found
                        </div>
                      ) : (
                        role.users.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${role.iconBg} text-xs font-semibold`}>
                                {member.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <span>{member.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleViewIndividual(role.id)}
                    disabled={!selectedUsers[role.id]}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
