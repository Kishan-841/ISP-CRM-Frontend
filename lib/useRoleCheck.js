'use client';

import { useAuthStore } from './store';

/**
 * Custom hook for role-based access control
 */
export function useRoleCheck() {
  const { user } = useAuthStore();

  return {
    user,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    isAdminRole: user?.role === 'ADMIN',
    isBDM: user?.role === 'BDM',
    isBDMTeamLeader: user?.role === 'BDM_TEAM_LEADER',
    isISR: user?.role === 'ISR',
    isSAM: user?.role === 'SAM',
    isFeasibilityTeam: user?.role === 'FEASIBILITY_TEAM',
    isOpsTeam: user?.role === 'OPS_TEAM',
    isDocsTeam: user?.role === 'DOCS_TEAM',
    isAccountsTeam: user?.role === 'ACCOUNTS_TEAM',
    isDeliveryTeam: user?.role === 'DELIVERY_TEAM',
    isStoreManager: user?.role === 'STORE_MANAGER',
    isAreaHead: user?.role === 'AREA_HEAD',
    isNOC: user?.role === 'NOC',
    isSAMHead: user?.role === 'SAM_HEAD',
    isSAMExecutive: user?.role === 'SAM_EXECUTIVE',
    isInstallationTeam: user?.role === 'INSTALLATION_TEAM',

    // Combined permission checks
    canApprovePO: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    canApproveDeliveryRequest: user?.role === 'SUPER_ADMIN' || user?.role === 'AREA_HEAD',

    // Helper to check if user has any of the specified roles
    hasAnyRole: (...roles) => {
      return roles.includes(user?.role);
    },
  };
}

export default useRoleCheck;
