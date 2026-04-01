'use client';

import { useAuthStore } from './store';

/**
 * Custom hook for role-based access control
 */
export function useRoleCheck() {
  const { user } = useAuthStore();
  const isMaster = user?.role === 'MASTER';

  return {
    user,
    isMaster,
    isSuperAdmin: user?.role === 'SUPER_ADMIN' || isMaster,
    isAdmin: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || isMaster,
    isAdminRole: user?.role === 'ADMIN' || isMaster,
    isBDM: user?.role === 'BDM' || isMaster,
    isBDMCP: user?.role === 'BDM_CP',
    isBDMTeamLeader: user?.role === 'BDM_TEAM_LEADER' || isMaster,
    isISR: user?.role === 'ISR' || isMaster,
    isSAM: user?.role === 'SAM' || isMaster,
    isFeasibilityTeam: user?.role === 'FEASIBILITY_TEAM' || isMaster,
    isOpsTeam: user?.role === 'OPS_TEAM' || isMaster,
    isDocsTeam: user?.role === 'DOCS_TEAM' || isMaster,
    isAccountsTeam: user?.role === 'ACCOUNTS_TEAM' || isMaster,
    isDeliveryTeam: user?.role === 'DELIVERY_TEAM' || isMaster,
    isStoreManager: user?.role === 'STORE_MANAGER' || isMaster,
    isAreaHead: user?.role === 'AREA_HEAD' || isMaster,
    isNOC: user?.role === 'NOC' || isMaster,
    isSAMHead: user?.role === 'SAM_HEAD' || isMaster,
    isSAMExecutive: user?.role === 'SAM_EXECUTIVE' || isMaster,
    isInstallationTeam: user?.role === 'INSTALLATION_TEAM' || isMaster,

    // Combined permission checks
    canApprovePO: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || isMaster,
    canApproveDeliveryRequest: user?.role === 'SUPER_ADMIN' || user?.role === 'AREA_HEAD' || isMaster,

    // Helper to check if user has any of the specified roles
    hasAnyRole: (...roles) => {
      if (isMaster) return true;
      return roles.includes(user?.role);
    },
  };
}

export default useRoleCheck;
