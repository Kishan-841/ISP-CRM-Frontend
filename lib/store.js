import { create } from 'zustand';
import api from './api';
import { createFetchAction, createPaginatedFetchAction } from './storeHelpers';

// Theme Store
export const useThemeStore = create((set, get) => ({
  theme: 'light',

  initialize: () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

      set({ theme });
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
}));

// Sidebar Store
export const useSidebarStore = create((set, get) => ({
  isCollapsed: false,
  isMobileOpen: false,

  openMobile: () => set({ isMobileOpen: true }),
  closeMobile: () => set({ isMobileOpen: false }),

  // Unified sidebar counts for all roles
  counts: {
    // ISR/SAM counts
    followUps: 0,
    callingQueue: 0,
    retryQueue: 0,
    // BDM counts
    queue: 0,
    meetings: 0,
    deliveryCompleted: 0,
    leadPipeline: 0,
    // Feasibility Team counts
    feasibilityPending: 0,
    // OPS Team counts
    opsPending: 0,
    installationPending: 0,
    // Super Admin 2 counts
    sa2Pending: 0,
    // Docs Team counts
    docsPending: 0,
    // Accounts Team counts
    accountsPending: 0,
    // Delivery Team counts
    deliveryPending: 0,
    // Admin counts
    isrQueue: 0,
    bdmQueue: 0,
    feasibilityQueue: 0,
    docsQueue: 0,
    accountsQueue: 0,
    deliveryQueue: 0,
    poApprovalPending: 0,
    // Complaint counts
    complaintsAssigned: 0,
    complaintsCreated: 0,
    complaintsOpen: 0,
    customerRequestsPending: 0,
  },
  countsLoading: false,
  pendingRefresh: false,
  lastCountsFetch: null,

  initialize: () => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        set({ isCollapsed: savedState === 'true' });
      }
    }
  },

  toggle: () => {
    const newState = !get().isCollapsed;
    set({ isCollapsed: newState });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(newState));
    }
  },

  setCollapsed: (collapsed) => {
    set({ isCollapsed: collapsed });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    }
  },

  // Fetch sidebar counts from unified endpoint
  fetchSidebarCounts: async () => {
    const { countsLoading } = get();
    if (countsLoading) {
      // Mark that a refresh was requested while fetching - will re-fetch after current completes
      set({ pendingRefresh: true });
      return { success: false };
    }

    set({ countsLoading: true, pendingRefresh: false });
    try {
      const response = await api.get('/users/sidebar-counts');
      const data = response.data;

      set({
        counts: {
          // ISR/SAM counts
          followUps: data.followUps || 0,
          callingQueue: data.callingQueue || 0,
          retryQueue: data.retryQueue || 0,
          // BDM counts
          queue: data.queue || 0,
          meetings: data.meetings || 0,
          deliveryCompleted: data.deliveryCompleted || 0,
          leadPipeline: data.leadPipeline || 0,
          coldLeadsPending: data.coldLeadsPending || 0,
          // Feasibility Team counts
          feasibilityPending: data.feasibilityPending || 0,
          // OPS Team counts
          opsPending: data.opsPending || 0,
          installationPending: data.installationPending || 0,
          // Super Admin 2 / Admin approval counts
          sa2Pending: data.sa2Pending || 0,
          // Docs Team counts
          docsPending: data.docsPending || 0,
          // Accounts Team counts
          accountsPending: data.accountsPending || 0,
          demoPlanPending: data.demoPlanPending || 0,
          createPlanPending: data.createPlanPending || 0,
          // Delivery Team counts
          deliveryPending: data.deliveryPending || 0,
          // NOC Team counts
          nocPending: data.nocPending || 0,
          nocUserCreated: data.nocUserCreated || 0,
          // Admin counts
          isrQueue: data.isrQueue || 0,
          bdmQueue: data.bdmQueue || 0,
          feasibilityQueue: data.feasibilityQueue || 0,
          docsQueue: data.docsQueue || 0,
          accountsQueue: data.accountsQueue || 0,
          deliveryQueue: data.deliveryQueue || 0,
          poApprovalPending: data.poApprovalPending || 0,
          // Delivery Request Approval counts (for Super Admin & Area Head)
          deliveryRequestPending: data.deliveryRequestPending || 0,
          // Store Requests counts (for Store Manager)
          storeRequests: data.storeRequests || 0,
          // Vendor counts
          vendorsPendingAdmin: data.vendorsPendingAdmin || 0,
          vendorDocsPending: data.vendorDocsPending || 0,
          vendorDocsToVerify: data.vendorDocsToVerify || 0,
          // Complaint counts
          complaintsAssigned: data.complaintsAssigned || 0,
          complaintsCreated: data.complaintsCreated || 0,
          complaintsOpen: data.complaintsOpen || 0,
          customerRequestsPending: data.customerRequestsPending || 0,
          // Service Order counts
          orderApprovalPending: data.orderApprovalPending || 0,
          orderRequestsPending: data.orderRequestsPending || 0,
          allOrdersPending: data.allOrdersPending || 0,
          ordersPending: data.ordersPending || 0,
          docsOrderReviewPending: data.docsOrderReviewPending || 0,
          nocOrdersPending: data.nocOrdersPending || 0,
          samActivationPending: data.samActivationPending || 0,
          // Credit Note approval
          cnPendingApproval: data.cnPendingApproval || 0,
          // SAM counts
          pendingMomEmails: data.pendingMomEmails || 0,
          overdueVisits: data.overdueVisits || 0,
          unassignedCustomers: data.unassignedCustomers || 0,
          contractExpiring: data.contractExpiring || 0,
          pendingEnquiries: data.pendingEnquiries || 0,
        },
        countsLoading: false,
        lastCountsFetch: Date.now(),
      });

      // If a refresh was requested while we were fetching, re-fetch now
      if (get().pendingRefresh) {
        set({ pendingRefresh: false });
        setTimeout(() => get().fetchSidebarCounts(), 100);
      }

      return { success: true, data };
    } catch (error) {
      set({ countsLoading: false, pendingRefresh: false });
      return { success: false, error: error.response?.data?.message };
    }
  },
}));

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          set({
            token,
            user: JSON.parse(user),
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Ensure NEXUS chat is clean for the newly logged-in user
      try { useNexusStore.getState().reset(); } catch {}
      try { useReminderStore.getState().reset(); } catch {}

      set({
        token,
        user,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Reset NEXUS chat so the next logged-in user doesn't see the previous user's messages
    try { useNexusStore.getState().reset(); } catch {}
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  fetchMe: async () => {
    try {
      const response = await api.get('/auth/me');
      const { user } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      set({ user });

      return { success: true, user };
    } catch (error) {
      return { success: false };
    }
  },
}));

export const useUserStore = create((set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  usersPagination: null,

  // Backward-compat: fetchUsers() with no args returns ALL users (legacy —
  // dropdowns and reports rely on this). Pass an object with any of
  // { page, limit, search, role } to request a paginated slice; the store
  // populates usersPagination in that case.
  fetchUsers: async (opts) => {
    set({ isLoading: true, error: null });
    try {
      let url = '/users';
      if (opts && typeof opts === 'object') {
        const params = new URLSearchParams();
        if (opts.page)   params.set('page', opts.page);
        if (opts.limit)  params.set('limit', opts.limit);
        if (opts.search) params.set('search', opts.search);
        if (opts.role)   params.set('role', opts.role);
        if ([...params.keys()].length > 0) url += `?${params.toString()}`;
      }
      const response = await api.get(url);
      set({
        users: response.data.users || [],
        usersPagination: response.data.pagination || null,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch users';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      const { users } = get();
      set({ users: [response.data.user, ...users] });
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create user',
      };
    }
  },

  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      const { users } = get();
      set({
        users: users.map((u) => (u.id === id ? response.data.user : u)),
      });
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update user',
      };
    }
  },

  deleteUser: async (id) => {
    try {
      await api.delete(`/users/${id}`);
      const { users } = get();
      set({ users: users.filter((u) => u.id !== id) });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete user',
      };
    }
  },

  // Fetch users by role (for admin dashboard dropdowns)
  fetchUsersByRole: async (role = 'ALL') => {
    try {
      const response = await api.get(`/users/by-role?role=${role}`);
      return { success: true, users: response.data.users };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch users',
      };
    }
  },

  // Fetch user dashboard stats (admin viewing user's dashboard)
  fetchUserDashboardStats: async (userId, period = 'last7days') => {
    try {
      const response = await api.get(`/users/${userId}/dashboard?period=${period}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user dashboard stats',
      };
    }
  },
}));

// Campaign Store
export const useCampaignStore = create((set, get) => ({
  campaigns: [],
  assignedCampaigns: [],
  currentCampaign: null,
  campaignData: [],
  campaignDataStats: null,
  pagination: null,
  allCampaignData: [],
  allDataPagination: null,
  isLoading: false,
  error: null,

  // Fetch assigned campaigns (ISR)
  fetchAssignedCampaigns: createFetchAction(set, '/campaigns/my-campaigns', 'assignedCampaigns', 'campaigns', 'Failed to fetch assigned campaigns'),

  // Fetch all campaigns (Admin)
  fetchCampaigns: createFetchAction(set, '/campaigns', 'campaigns', 'campaigns', 'Failed to fetch campaigns'),

  // Fetch single campaign
  fetchCampaign: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/campaigns/${id}`);
      set({ currentCampaign: response.data.campaign, isLoading: false });
      return { success: true, campaign: response.data.campaign };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch campaign',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Create campaign
  createCampaign: async (campaignData) => {
    try {
      const response = await api.post('/campaigns', campaignData);
      const { campaigns } = get();
      set({ campaigns: [response.data.campaign, ...campaigns] });
      return { success: true, campaign: response.data.campaign };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create campaign',
      };
    }
  },

  // Update campaign
  updateCampaign: async (id, campaignData) => {
    try {
      const response = await api.put(`/campaigns/${id}`, campaignData);
      const { campaigns } = get();
      set({
        campaigns: campaigns.map((c) => (c.id === id ? { ...c, ...response.data.campaign } : c)),
        currentCampaign: response.data.campaign,
      });
      return { success: true, campaign: response.data.campaign };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update campaign',
      };
    }
  },

  // Delete campaign
  deleteCampaign: async (id) => {
    try {
      await api.delete(`/campaigns/${id}`);
      const { campaigns } = get();
      set({ campaigns: campaigns.filter((c) => c.id !== id) });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete campaign',
      };
    }
  },

  // Assign users to campaign with data distribution
  assignUsers: async (campaignId, userIds) => {
    try {
      const response = await api.post(`/campaigns/${campaignId}/assign`, { userIds });
      const updatedCampaign = response.data.campaign;
      const { campaigns } = get();
      set({
        currentCampaign: updatedCampaign,
        campaigns: campaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c),
      });
      return {
        success: true,
        distribution: response.data.distribution,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to assign users',
      };
    }
  },

  // Add campaign data (bulk import)
  addCampaignData: async (campaignId, data) => {
    try {
      const response = await api.post(`/campaigns/${campaignId}/data`, { data });
      return {
        success: true,
        count: response.data.count,
        duplicateCount: response.data.duplicateCount || 0,
        skippedNoPhone: response.data.skippedNoPhone || 0,
        skippedInvalidPhone: response.data.skippedInvalidPhone || 0,
        skippedNoName: response.data.skippedNoName || 0,
        skippedNoCompany: response.data.skippedNoCompany || 0,
        skippedNoTitle: response.data.skippedNoTitle || 0,
        totalReceived: response.data.totalReceived || 0,
        invalidRecords: response.data.invalidRecords || [],
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add data',
      };
    }
  },

  // Add single campaign data
  addSingleCampaignData: async (campaignId, dataRecord) => {
    try {
      const response = await api.post(`/campaigns/${campaignId}/data/single`, dataRecord);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add data',
      };
    }
  },

  // Fetch campaign data
  fetchCampaignData: async (campaignId, page = 1, limit = 10, status = null, filterType = null, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      if (filterType) params.append('type', filterType);
      if (search && search.trim()) params.append('search', search.trim());

      const url =
        !campaignId || campaignId === 'all'
          ? `/campaigns/my-data/all?${params}`
          : `/campaigns/${campaignId}/data?${params}`;
      const response = await api.get(url);
      set({
        campaignData: response.data.data,
        campaignDataStats: response.data.stats || null,
        pagination: response.data.pagination,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch data',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Get assigned campaigns (ISR)
  fetchMyAssignedCampaigns: createFetchAction(set, '/campaigns/my-campaigns', 'campaigns', 'campaigns', 'Failed to fetch campaigns'),

  // Start a call
  startCall: async (dataId) => {
    try {
      const response = await api.post(`/campaigns/call/start/${dataId}`);
      return {
        success: true,
        callLog: response.data.callLog,
        phone: response.data.phone,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to start call',
      };
    }
  },

  // End a call
  endCall: async (callLogId, status, notes, callLaterAt = null, otherReason = null) => {
    try {
      const response = await api.post(`/campaigns/call/end/${callLogId}`, { status, notes, callLaterAt, otherReason });
      // Update the local campaign data
      const { campaignData } = get();
      set({
        campaignData: campaignData.map((d) =>
          d.id === response.data.callLog.campaignDataId
            ? { ...d, status, lastCall: response.data.callLog }
            : d
        ),
      });
      return {
        success: true,
        callLog: response.data.callLog,
        duration: response.data.duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to end call',
      };
    }
  },

  // Get call history
  fetchCallHistory: async (dataId) => {
    try {
      const response = await api.get(`/campaigns/call/history/${dataId}`);
      return { success: true, callLogs: response.data.callLogs };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch call history',
      };
    }
  },

  // Update status directly (without call)
  updateDataStatus: async (dataId, status) => {
    try {
      const response = await api.put(`/campaigns/data/${dataId}/status`, { status });
      // Update local campaign data
      const { campaignData } = get();
      set({
        campaignData: campaignData.map((d) =>
          d.id === dataId ? { ...d, status } : d
        ),
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update status',
      };
    }
  },

  // Add remark to campaign data
  addRemark: async (dataId, remark) => {
    try {
      const response = await api.put(`/campaigns/data/${dataId}/remark`, { remark });
      // Update local campaign data
      const { campaignData } = get();
      set({
        campaignData: campaignData.map((d) =>
          d.id === dataId ? { ...d, notes: remark } : d
        ),
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add remark',
      };
    }
  },

  // Edit campaign data contact details
  editCampaignData: async (dataId, editData) => {
    try {
      const response = await api.put(`/campaigns/data/${dataId}/edit`, editData);
      // Update local campaign data
      const { campaignData } = get();
      set({
        campaignData: campaignData.map((d) =>
          d.id === dataId ? { ...d, ...editData } : d
        ),
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update data',
      };
    }
  },

  // Get single campaign data details
  fetchDataDetail: async (dataId) => {
    try {
      const response = await api.get(`/campaigns/data/${dataId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch data details',
      };
    }
  },

  // Clear current campaign
  clearCurrentCampaign: () => {
    set({ currentCampaign: null, campaignData: [], pagination: null });
  },

  // Get ISR dashboard stats
  fetchDashboardStats: async (period = 'last7days', fromDate = '', toDate = '') => {
    try {
      let url = `/campaigns/dashboard/stats?period=${period}`;
      if (period === 'custom' && fromDate && toDate) {
        url += `&fromDate=${fromDate}&toDate=${toDate}`;
      }
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch dashboard stats',
      };
    }
  },

  // Create self-campaign (ISR/BDM)
  createSelfCampaign: async (name, dataSource, data, assignToId = null, channelPartnerVendorId = null) => {
    try {
      const response = await api.post('/campaigns/self-campaign', { name, dataSource, data, assignToId, channelPartnerVendorId });
      const { campaigns } = get();
      set({ campaigns: [response.data.campaign, ...campaigns] });
      return {
        success: true,
        campaign: response.data.campaign,
        count: response.data.count,
        duplicateCount: response.data.duplicateCount || 0,
        skippedNoPhone: response.data.skippedNoPhone || 0,
        skippedInvalidPhone: response.data.skippedInvalidPhone || 0,
        skippedNoName: response.data.skippedNoName || 0,
        skippedNoCompany: response.data.skippedNoCompany || 0,
        skippedNoTitle: response.data.skippedNoTitle || 0,
        totalReceived: response.data.totalReceived || 0,
        invalidRecords: response.data.invalidRecords || [],
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create self campaign',
      };
    }
  },

  // Delete self-campaign (ISR)
  deleteSelfCampaign: async (id) => {
    try {
      await api.delete(`/campaigns/self-campaign/${id}`);
      const { campaigns } = get();
      set({ campaigns: campaigns.filter((c) => c.id !== id) });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete campaign',
      };
    }
  },

  // Delete campaign data
  deleteCampaignData: async (dataId) => {
    try {
      await api.delete(`/campaigns/data/${dataId}`);
      const { campaignData } = get();
      set({ campaignData: campaignData.filter((d) => d.id !== dataId) });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete data',
      };
    }
  },

  // Fetch follow-up count for sidebar
  followUpCount: 0,
  fetchFollowUpCount: async () => {
    try {
      const response = await api.get('/campaigns/follow-ups/count');
      set({ followUpCount: response.data.pending || 0 });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false };
    }
  },

  // Unanswered calls (Retry Queue) state and functions
  unansweredCalls: [],
  unansweredCallsStats: { total: 0, today: 0, yesterday: 0, older: 0 },
  unansweredCallsCount: 0,

  // Fetch unanswered calls
  fetchUnansweredCalls: async () => {
    try {
      const response = await api.get('/campaigns/unanswered-calls');
      set({
        unansweredCalls: response.data.data || [],
        unansweredCallsStats: response.data.stats || { total: 0, today: 0, yesterday: 0, older: 0 }
      });
      return { success: true, data: response.data.data, stats: response.data.stats };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch unanswered calls',
      };
    }
  },

  // Fetch unanswered calls count for sidebar
  fetchUnansweredCallsCount: async () => {
    try {
      const response = await api.get('/campaigns/unanswered-calls/count');
      set({ unansweredCallsCount: response.data.count || 0 });
      return { success: true, count: response.data.count };
    } catch (error) {
      return { success: false };
    }
  },

  // Fetch all campaign data (All Data page)
  fetchAllCampaignData: async (page = 1, limit = 25, search = '', tabType = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit, tabType });
      if (search) params.append('search', search);
      const response = await api.get(`/campaigns/all-data?${params}`);
      set({
        allCampaignData: response.data.data,
        allDataPagination: response.data.pagination,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch all campaign data',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch BDM binding for a campaign data record
  fetchBdmBinding: async (dataId) => {
    try {
      const response = await api.get(`/campaigns/data/${dataId}`);
      const data = response.data.data || response.data;
      return {
        success: true,
        assignedByBdm: data.assignedByBdm || null,
        assignedByBdmId: data.assignedByBdmId || null,
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch BDM binding' };
    }
  },
}));

// Product Store
export const useProductStore = create((set, get) => ({
  products: [],
  parentProducts: [],
  currentProduct: null,
  isLoading: false,
  error: null,

  // Fetch all products
  fetchProducts: createFetchAction(set, '/products', 'products', 'products', 'Failed to fetch products'),

  // Fetch single product
  fetchProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/products/${id}`);
      set({ currentProduct: response.data.product, isLoading: false });
      return { success: true, product: response.data.product };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch product',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch parent products (for dropdown)
  fetchParentProducts: async () => {
    try {
      const response = await api.get('/products/parents');
      set({ parentProducts: response.data.products });
      return { success: true, products: response.data.products };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch parent products',
      };
    }
  },

  // Create product (Admin only)
  createProduct: async (productData) => {
    try {
      const response = await api.post('/products', productData);
      const { products } = get();
      set({ products: [response.data.product, ...products] });
      return { success: true, product: response.data.product };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create product',
      };
    }
  },

  // Update product (Admin only)
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      const { products } = get();
      set({
        products: products.map((p) => (p.id === id ? response.data.product : p)),
        currentProduct: response.data.product,
      });
      return { success: true, product: response.data.product };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update product',
      };
    }
  },

  // Delete product (Admin only)
  deleteProduct: async (id) => {
    try {
      await api.delete(`/products/${id}`);
      const { products } = get();
      set({ products: products.filter((p) => p.id !== id) });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete product',
      };
    }
  },

  // Clear current product
  clearCurrentProduct: () => {
    set({ currentProduct: null });
  },
}));

// Lead Store
export const useLeadStore = create((set, get) => ({
  leads: [],
  leadsPagination: null,
  leadsStats: null,
  currentLead: null,
  bdmUsers: [],
  teamLeaders: [],
  isLoading: false,
  error: null,

  // Fetch leads with server-side pagination and filters
  fetchLeads: createPaginatedFetchAction(set, '/leads', { data: 'leads', pagination: 'leadsPagination', stats: 'leadsStats' }, 'Failed to fetch leads'),

  // Fetch single lead
  fetchLead: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/${id}`);
      set({ currentLead: response.data.lead, isLoading: false });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch lead',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch BDM users for assignment
  fetchBDMUsers: async () => {
    try {
      const response = await api.get('/leads/bdm-users');
      set({ bdmUsers: response.data.users });
      return { success: true, users: response.data.users };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch BDM users',
      };
    }
  },

  // Fetch BDM Team Leaders for assignment
  fetchTeamLeaders: async () => {
    try {
      const response = await api.get('/leads/team-leaders');
      set({ teamLeaders: response.data.users });
      return { success: true, users: response.data.users };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch team leaders',
      };
    }
  },

  // Reassign lead from Team Leader to BDM
  reassignLeadToBDM: async (leadId, bdmId) => {
    try {
      const response = await api.post(`/leads/bdm/${leadId}/reassign`, { bdmId });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reassign lead',
      };
    }
  },

  // Bulk reassign leads from Team Leader to BDM
  bulkReassignLeadsToBDM: async (leadIds, bdmId) => {
    try {
      const response = await api.post('/leads/bdm/bulk-reassign', { leadIds, bdmId });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reassign leads',
      };
    }
  },

  // Transfer ALL leads from one BDM to another
  transferAllLeads: async (fromBdmId, toBdmId) => {
    try {
      const response = await api.post('/leads/bdm/transfer-all', { fromBdmId, toBdmId });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to transfer leads',
      };
    }
  },

  // Check if campaign data is already converted to lead
  checkLeadExists: async (campaignDataId) => {
    try {
      const response = await api.get(`/leads/check/${campaignDataId}`);
      return { success: true, exists: response.data.exists, leadId: response.data.leadId };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check lead',
      };
    }
  },

  // Convert campaign data to lead
  convertToLead: async (data) => {
    try {
      const response = await api.post('/leads/convert', data);
      const { leads } = get();
      set({ leads: [response.data.lead, ...leads] });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to convert to lead',
      };
    }
  },

  // Create a direct lead from the BDM queue (walk-in / referral flow).
  // Creates CampaignData + Lead in one atomic backend call.
  createDirectLead: async (data) => {
    try {
      const response = await api.post('/leads/bdm/direct-add', data);
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create lead',
      };
    }
  },

  // Cold lead pipeline (leads parked with partial details after a lukewarm meeting)
  coldLeads: [],
  coldLeadsPagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
  fetchColdLeads: async (params = {}) => {
    set({ isLoading: true });
    try {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      if (params.search) query.append('search', params.search);
      const response = await api.get(`/leads/bdm/cold-leads?${query}`);
      set({
        coldLeads: response.data.leads || [],
        coldLeadsPagination: response.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 },
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch cold leads',
      };
    }
  },
  completeColdLead: async (id, data) => {
    try {
      const response = await api.post(`/leads/bdm/cold-leads/${id}/complete`, data);
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to complete cold lead',
      };
    }
  },

  // Create Opportunity — fast path for BDMs who already have a customer
  // fully committed. Creates a lead with all meeting-outcome fields filled
  // and assigns it directly to the Feasibility Team.
  setupDeliveryVendor: async (leadId, data) => {
    try {
      const response = await api.post(`/leads/delivery/${leadId}/vendor-setup`, data);
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to save vendor setup' };
    }
  },

  createOpportunity: async (data) => {
    try {
      const response = await api.post('/leads/bdm/create-opportunity', data);
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create opportunity',
      };
    }
  },

  // Create self-generated lead (BDM adds lead manually)
  createSelfLead: async (data) => {
    try {
      const response = await api.post('/leads/self-generate', data);
      const { leads } = get();
      set({ leads: [response.data.lead, ...leads] });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create lead',
      };
    }
  },

  // Update lead
  updateLead: async (id, leadData) => {
    try {
      const response = await api.put(`/leads/${id}`, leadData);
      const { leads } = get();
      set({
        leads: leads.map((l) => (l.id === id ? response.data.lead : l)),
        currentLead: response.data.lead,
      });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update lead',
      };
    }
  },

  // Push lead to document verification (legacy - generic file upload)
  pushToDocsVerification: async (leadId, formData) => {
    try {
      const response = await api.post(`/leads/${leadId}/push-to-verification`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const { leads } = get();
      set({
        leads: leads.map((l) => (l.id === leadId ? response.data.lead : l)),
      });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to push to verification',
      };
    }
  },

  // ========== TYPED DOCUMENT MANAGEMENT ==========

  // Upload a single typed document
  uploadDocument: async (leadId, documentType, file, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('document', file);
      // Add optional metadata (for ADVANCE_OTC: paymentMethod, referenceNumber, date, amount)
      if (metadata.paymentMethod) {
        formData.append('paymentMethod', metadata.paymentMethod);
      }
      if (metadata.referenceNumber) {
        formData.append('referenceNumber', metadata.referenceNumber);
      }
      if (metadata.date) {
        formData.append('date', metadata.date);
      }
      if (metadata.amount) {
        formData.append('amount', metadata.amount);
      }

      const response = await api.post(`/leads/${leadId}/documents/${documentType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update lead in store with new documents
      const { leads } = get();
      set({
        leads: leads.map((l) =>
          l.id === leadId
            ? { ...l, documents: response.data.documents }
            : l
        ),
      });

      return {
        success: true,
        document: response.data.document,
        documents: response.data.documents,
        uploadedCount: response.data.uploadedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload document',
      };
    }
  },

  // Remove a typed document
  removeDocument: async (leadId, documentType) => {
    try {
      const response = await api.delete(`/leads/${leadId}/documents/${documentType}`);

      // Update lead in store
      const { leads } = get();
      set({
        leads: leads.map((l) =>
          l.id === leadId
            ? { ...l, documents: response.data.documents }
            : l
        ),
      });

      return {
        success: true,
        removedType: response.data.removedType,
        documents: response.data.documents,
        uploadedCount: response.data.uploadedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove document',
      };
    }
  },

  // Get all documents for a lead
  getLeadDocuments: async (leadId) => {
    try {
      const response = await api.get(`/leads/${leadId}/documents`);
      return {
        success: true,
        documents: response.data.documents,
        uploadedCount: response.data.uploadedCount,
        requiredCount: response.data.requiredCount,
        requiredTypes: response.data.requiredTypes,
        verificationStatus: response.data.verificationStatus
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch documents',
      };
    }
  },

  // Mark login complete (customer accepted quotation)
  markLoginComplete: async (leadId) => {
    try {
      const response = await api.post(`/leads/${leadId}/mark-login-complete`);
      const { leads } = get();
      set({
        leads: leads.map((l) => (l.id === leadId ? response.data.lead : l)),
      });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to mark login complete',
      };
    }
  },

  // Push to verification with typed documents (validates mandatory docs)
  pushToDocsVerificationTyped: async (leadId, notes, testMode = false, financialDetails = {}) => {
    try {
      const response = await api.post(`/leads/${leadId}/push-to-verification-typed`, {
        notes,
        testMode,
        arcAmount: financialDetails.arcAmount || null,
        otcAmount: financialDetails.otcAmount || null,
        advanceAmount: financialDetails.advanceAmount || null,
        paymentTerms: financialDetails.paymentTerms || null
      });

      const { leads } = get();
      set({
        leads: leads.map((l) => (l.id === leadId ? response.data.lead : l)),
      });

      return {
        success: true,
        lead: response.data.lead,
        testMode: response.data.testMode,
        documentsCount: response.data.documentsCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to push to verification',
        missing: error.response?.data?.missing,
        uploadedCount: error.response?.data?.uploadedCount,
        requiredCount: error.response?.data?.requiredCount
      };
    }
  },

  // ========== END TYPED DOCUMENT MANAGEMENT ==========

  // ========== CUSTOMER UPLOAD LINK MANAGEMENT ==========

  // Generate upload link for customer
  generateUploadLink: async (leadId, expiresInDays = 7, customerNote = '', requiredDocuments = []) => {
    try {
      const response = await api.post(`/leads/${leadId}/upload-link`, {
        expiresInDays,
        customerNote,
        requiredDocuments
      });

      // Update lead's docUploadMethod
      const { leads } = get();
      set({
        leads: leads.map((l) =>
          l.id === leadId
            ? { ...l, docUploadMethod: 'customer' }
            : l
        ),
      });

      return {
        success: true,
        uploadLink: response.data.uploadLink
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate upload link',
      };
    }
  },

  // Get all upload links for a lead
  getUploadLinks: async (leadId) => {
    try {
      const response = await api.get(`/leads/${leadId}/upload-links`);
      return {
        success: true,
        links: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch upload links',
      };
    }
  },

  // Revoke an upload link
  revokeUploadLink: async (leadId, linkId) => {
    try {
      await api.delete(`/leads/${leadId}/upload-links/${linkId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to revoke upload link',
      };
    }
  },

  // Set upload method for lead (bdm or customer)
  setUploadMethod: async (leadId, method) => {
    try {
      const response = await api.patch(`/leads/${leadId}/upload-method`, { method });

      // Update lead in store
      const { leads } = get();
      set({
        leads: leads.map((l) =>
          l.id === leadId
            ? { ...l, docUploadMethod: response.data.docUploadMethod }
            : l
        ),
      });

      return {
        success: true,
        docUploadMethod: response.data.docUploadMethod
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to set upload method',
      };
    }
  },

  // ========== END CUSTOMER UPLOAD LINK MANAGEMENT ==========

  // ========== INSTALLATION FUNCTIONS ==========

  // Push lead to installation team (BDM only, after accounts approval)
  pushToInstallation: async (leadId, notes = '', deliveryUserId = null) => {
    try {
      const response = await api.post(`/leads/${leadId}/push-to-installation`, { notes, deliveryUserId });

      const { leads } = get();
      set({
        leads: leads.map((l) => (l.id === leadId ? response.data.lead : l)),
      });

      return {
        success: true,
        lead: response.data.lead,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to push to installation'
      };
    }
  },

  // ========== END INSTALLATION FUNCTIONS ==========

  // Delete lead (Admin only)
  deleteLead: async (id) => {
    try {
      await api.delete(`/leads/${id}`);
      const { leads } = get();
      set({ leads: leads.filter((l) => l.id !== id) });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete lead',
      };
    }
  },

  // Clear current lead
  clearCurrentLead: () => {
    set({ currentLead: null });
  },

  // Create self-generated lead (BDM/ISR creates their own lead)
  createSelfGeneratedLead: async (leadData) => {
    try {
      const response = await api.post('/leads/self-generate', leadData);
      const { leads } = get();
      if (response.data.lead) {
        set({ leads: [response.data.lead, ...leads] });
      }
      return { success: true, lead: response.data.lead, campaignData: response.data.campaignData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create lead',
      };
    }
  },

  // ========== BDM FUNCTIONS ==========

  // BDM queue state
  bdmQueue: [],
  bdmStats: { total: 0, pending: 0, meetingScheduled: 0, qualified: 0, followUp: 0, dropped: 0 },
  bdmCampaigns: [],
  bdmFollowUps: [],
  bdmMeetings: [],
  bdmMeetingStats: { total: 0, today: 0, upcoming: 0, overdue: 0, completed: 0 },

  // Customer enquiry queue (TL view)
  customerEnquiries: [],
  customerEnquiriesTotal: 0,

  // Fetch BDM queue
  fetchBDMQueue: async (campaignId = null) => {
    set({ isLoading: true, error: null });
    try {
      const url = campaignId ? `/leads/bdm/queue?campaignId=${campaignId}` : '/leads/bdm/queue';
      const response = await api.get(url);
      set({
        bdmQueue: response.data.leads,
        bdmStats: response.data.stats,
        bdmCampaigns: response.data.campaigns || [],
        isLoading: false
      });
      return { success: true, campaigns: response.data.campaigns };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch BDM queue',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch customer enquiry queue (TL / Admin)
  fetchCustomerEnquiries: async () => {
    try {
      const response = await api.get('/leads/customer-enquiries');
      set({
        customerEnquiries: response.data.enquiries,
        customerEnquiriesTotal: response.data.total
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Update lead location
  updateLeadLocation: async (leadId, location) => {
    try {
      const response = await api.patch(`/leads/bdm/${leadId}/location`, { location });
      const { bdmQueue } = get();
      set({
        bdmQueue: bdmQueue.map(l => l.id === leadId ? { ...l, location } : l)
      });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update location',
      };
    }
  },

  // BDM call disposition (supports MEETING_SCHEDULED, QUALIFIED, DROPPED, FOLLOW_UP)
  bdmDisposition: async (leadId, dispositionData) => {
    try {
      const response = await api.post(`/leads/bdm/${leadId}/disposition`, dispositionData);
      const { bdmQueue, bdmMeetings } = get();
      // Handle different dispositions
      if (dispositionData.disposition === 'FOLLOW_UP') {
        // Keep in queue with updated data
        set({
          bdmQueue: bdmQueue.map(l => l.id === leadId ? { ...l, ...response.data.lead } : l)
        });
      } else if (dispositionData.disposition === 'MEETING_SCHEDULED') {
        // Remove from queue
        set({
          bdmQueue: bdmQueue.filter(l => l.id !== leadId)
        });
      } else {
        // QUALIFIED or DROPPED - remove from queue and meetings
        set({
          bdmQueue: bdmQueue.filter(l => l.id !== leadId),
          bdmMeetings: (bdmMeetings || []).filter(l => l.id !== leadId)
        });
      }
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update disposition',
      };
    }
  },

  // Fetch BDM scheduled meetings
  fetchBDMMeetings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/leads/bdm/meetings');
      set({
        bdmMeetings: response.data.meetings,
        bdmMeetingStats: response.data.stats,
        isLoading: false
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch meetings',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Add MOM
  addMOM: async (leadId, momData) => {
    try {
      const response = await api.post(`/leads/${leadId}/mom`, momData);
      return { success: true, mom: response.data.mom };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add MOM',
      };
    }
  },

  // Get MOMs for a lead
  getLeadMOMs: async (leadId) => {
    try {
      const response = await api.get(`/leads/${leadId}/moms`);
      return { success: true, moms: response.data.moms };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch MOMs',
      };
    }
  },

  // Update MOM
  updateMOM: async (momId, momData) => {
    try {
      const response = await api.put(`/leads/mom/${momId}`, momData);
      return { success: true, mom: response.data.mom };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update MOM',
      };
    }
  },

  // Delete MOM
  deleteMOM: async (momId) => {
    try {
      await api.delete(`/leads/mom/${momId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete MOM',
      };
    }
  },

  // Fetch BDM follow-ups
  fetchBDMFollowUps: async () => {
    try {
      const response = await api.get('/leads/bdm/follow-ups');
      set({ bdmFollowUps: response.data.followUps });
      return { success: true, followUps: response.data.followUps, categorized: response.data.categorized };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch follow-ups',
      };
    }
  },

  // Delivery completed state
  deliveryCompletedLeads: [],

  // Fetch BDM delivery completed leads
  fetchBDMDeliveryCompleted: async () => {
    try {
      const response = await api.get('/leads/bdm/delivery-completed');
      set({ deliveryCompletedLeads: response.data.leads });
      return { success: true, leads: response.data.leads, total: response.data.total };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch delivery completed leads',
      };
    }
  },

  // ========== END BDM FUNCTIONS ==========

  // ========== FEASIBILITY TEAM FUNCTIONS ==========

  // Feasibility Team state
  feasibilityTeamUsers: [],
  feasibilityQueue: [],
  feasibilityStats: { pending: 0, reviewedToday: 0 },
  feasibilityReviewHistory: [],
  feasibilityReviewCounts: { approved: 0, rejected: 0 },

  // Fetch Feasibility Team users for assignment dropdown
  fetchFeasibilityTeamUsers: async () => {
    try {
      const response = await api.get('/leads/feasibility-team-users');
      set({ feasibilityTeamUsers: response.data.users });
      return { success: true, users: response.data.users };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch Feasibility Team users',
      };
    }
  },

  // Fetch Feasibility Team queue
  fetchFeasibilityQueue: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (options.period) params.append('period', options.period);
      if (options.fromDate) params.append('fromDate', options.fromDate);
      if (options.toDate) params.append('toDate', options.toDate);
      const queryString = params.toString();
      const response = await api.get(`/leads/feasibility-team/queue${queryString ? `?${queryString}` : ''}`);
      set({
        feasibilityQueue: response.data.leads,
        feasibilityStats: response.data.stats,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch Feasibility queue',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch Feasibility Team review history (approved/rejected)
  fetchFeasibilityReviewHistory: async (filter = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/feasibility-team/history?filter=${filter}`);
      set({
        feasibilityReviewHistory: response.data.leads,
        feasibilityReviewCounts: response.data.counts,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, counts: response.data.counts };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch review history',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Feasibility Team disposition (FEASIBLE / NOT_FEASIBLE)
  feasibilityDisposition: async (leadId, data) => {
    try {
      const response = await api.post(`/leads/feasibility-team/${leadId}/disposition`, data);
      const { feasibilityQueue, feasibilityStats, feasibilityReviewCounts } = get();
      // Remove from queue after disposition and update all counts
      set({
        feasibilityQueue: feasibilityQueue.filter(l => l.id !== leadId),
        feasibilityStats: {
          ...feasibilityStats,
          pending: Math.max(0, feasibilityStats.pending - 1),
          reviewedToday: feasibilityStats.reviewedToday + 1
        },
        feasibilityReviewCounts: {
          approved: data.decision === 'FEASIBLE' ? feasibilityReviewCounts.approved + 1 : feasibilityReviewCounts.approved,
          rejected: data.decision === 'NOT_FEASIBLE' ? feasibilityReviewCounts.rejected + 1 : feasibilityReviewCounts.rejected
        }
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update disposition',
      };
    }
  },

  // BDM Dashboard Stats
  bdmDashboardStats: null,
  bdmDashboardLoading: false,

  fetchBDMDashboardStats: async (options = {}) => {
    const { userId = null, period = null, fromDate = null, toDate = null } = options;
    set({ bdmDashboardLoading: true });
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (period) params.append('period', period);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const queryString = params.toString();
      const url = queryString
        ? `/leads/bdm/dashboard-stats?${queryString}`
        : '/leads/bdm/dashboard-stats';
      const response = await api.get(url);
      set({ bdmDashboardStats: response.data, bdmDashboardLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ bdmDashboardLoading: false });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch dashboard stats',
      };
    }
  },

  // BDM Sidebar Counts
  bdmSidebarCounts: {
    queue: 0,
    meetings: 0,
    followUps: 0,
  },

  fetchBDMSidebarCounts: async () => {
    try {
      const response = await api.get('/leads/bdm/sidebar-counts');
      set({ bdmSidebarCounts: response.data });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // ========== END FEASIBILITY TEAM FUNCTIONS ==========

  // ========== OPS TEAM FUNCTIONS ==========

  // OPS Team state
  opsQueue: [],
  opsStats: { pending: 0, approved: 0, rejected: 0 },
  opsReviewHistory: [],
  opsReviewCounts: { approved: 0, rejected: 0 },

  // Fetch OPS Team queue
  fetchOpsQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/leads/ops-team/queue');
      set({
        opsQueue: response.data.leads,
        opsStats: response.data.stats,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch OPS queue',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // OPS Team disposition (APPROVED / REJECTED)
  opsTeamDisposition: async (leadId, { decision, reason, notes }) => {
    try {
      const response = await api.post(`/leads/ops-team/${leadId}/disposition`, { decision, reason, notes });
      const { opsQueue, opsStats, opsReviewCounts } = get();
      // Remove from queue after disposition and update all counts
      set({
        opsQueue: opsQueue.filter(l => l.id !== leadId),
        opsStats: {
          ...opsStats,
          pending: Math.max(0, opsStats.pending - 1),
          approved: decision === 'APPROVED' ? opsStats.approved + 1 : opsStats.approved,
          rejected: decision === 'REJECTED' ? opsStats.rejected + 1 : opsStats.rejected
        },
        // Also update review counts for tabs
        opsReviewCounts: {
          approved: decision === 'APPROVED' ? opsReviewCounts.approved + 1 : opsReviewCounts.approved,
          rejected: decision === 'REJECTED' ? opsReviewCounts.rejected + 1 : opsReviewCounts.rejected
        }
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update disposition',
      };
    }
  },

  // Fetch OPS Team review history (approved/rejected)
  fetchOpsReviewHistory: async (tab = 'approved') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/ops-team/history?tab=${tab}`);
      set({
        opsReviewHistory: response.data.leads,
        // Always update counts if they're returned from the API
        opsReviewCounts: response.data.counts || get().opsReviewCounts,
        isLoading: false
      });
      return { success: true, leads: response.data.leads };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch OPS review history',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // ========== END OPS TEAM FUNCTIONS ==========

  // ========== DOCS TEAM FUNCTIONS ==========

  // Docs Team state
  docsQueue: [],
  accountsRejectedQueue: [],
  docsStats: { pending: 0, verified: 0, rejected: 0, accountsRejected: 0 },
  docsReviewHistory: [],
  docsReviewCounts: { approved: 0, rejected: 0 },

  // Fetch Docs Team queue
  fetchDocsQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/leads/docs-team/queue');
      set({
        docsQueue: response.data.leads,
        accountsRejectedQueue: response.data.accountsRejectedLeads || [],
        docsStats: response.data.stats,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, accountsRejectedLeads: response.data.accountsRejectedLeads || [], stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch Docs queue',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Docs Team disposition (APPROVED / REJECTED)
  docsTeamDisposition: async (leadId, { decision, reason }) => {
    try {
      const response = await api.post(`/leads/docs-team/${leadId}/disposition`, { decision, reason });
      const { docsQueue, docsStats, docsReviewCounts } = get();
      // Remove from queue after disposition and update all counts
      set({
        docsQueue: docsQueue.filter(l => l.id !== leadId),
        docsStats: {
          ...docsStats,
          pending: Math.max(0, docsStats.pending - 1),
          verified: decision === 'APPROVED' ? docsStats.verified + 1 : docsStats.verified,
          rejected: decision === 'REJECTED' ? docsStats.rejected + 1 : docsStats.rejected
        },
        // Also update review counts for tabs
        docsReviewCounts: {
          approved: decision === 'APPROVED' ? docsReviewCounts.approved + 1 : docsReviewCounts.approved,
          rejected: decision === 'REJECTED' ? docsReviewCounts.rejected + 1 : docsReviewCounts.rejected
        }
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update disposition',
      };
    }
  },

  // Fetch Docs Team review history (approved/rejected)
  fetchDocsReviewHistory: async (filter = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/docs-team/history?filter=${filter}`);
      set({
        docsReviewHistory: response.data.leads,
        docsReviewCounts: response.data.counts,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, counts: response.data.counts };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch review history',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Send accounts-rejected lead back to BDM for document re-upload
  sendBackToBDM: async (leadId, reason) => {
    try {
      const response = await api.post(`/leads/docs-team/${leadId}/send-to-bdm`, { reason });
      const { accountsRejectedQueue, docsStats } = get();
      // Remove from accountsRejectedQueue
      set({
        accountsRejectedQueue: accountsRejectedQueue.filter(l => l.id !== leadId),
        docsStats: {
          ...docsStats,
          accountsRejected: Math.max(0, docsStats.accountsRejected - 1)
        }
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send back to BDM',
      };
    }
  },

  // ========== END DOCS TEAM FUNCTIONS ==========

  // ========== ACCOUNTS TEAM FUNCTIONS ==========

  accountsQueue: [],
  accountsStats: { pending: 0, verified: 0, rejected: 0 },
  accountsVerifiedLeads: [],
  accountsReviewHistory: [],
  accountsReviewCounts: { approved: 0, rejected: 0 },

  // Vendor PO state
  poEligibleLeads: [],
  vendorPOs: [],
  vendorPOStats: { pending: 0, approved: 0, rejected: 0 },

  // Fetch Accounts Team queue
  fetchAccountsQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/leads/accounts-team/queue');
      set({
        accountsQueue: response.data.leads,
        accountsStats: response.data.stats,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch Accounts queue',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch Accounts verified leads (history)
  fetchAccountsVerifiedLeads: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/leads/accounts-team/verified');
      set({
        accountsVerifiedLeads: response.data.leads,
        isLoading: false
      });
      return { success: true, leads: response.data.leads };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch verified leads',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Update financial details for a lead
  updateFinancialDetails: async (leadId, { arcAmount, otcAmount, advanceAmount, paymentTerms, accountsNotes }) => {
    try {
      const response = await api.patch(`/leads/accounts-team/${leadId}/financial`, {
        arcAmount,
        otcAmount,
        advanceAmount,
        paymentTerms,
        accountsNotes
      });
      const { accountsQueue, leads } = get();
      // Update the lead in both accountsQueue and leads
      set({
        accountsQueue: accountsQueue.map(l =>
          l.id === leadId
            ? { ...l, ...response.data.lead }
            : l
        ),
        leads: leads.map(l =>
          l.id === leadId
            ? { ...l, ...response.data.lead }
            : l
        )
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update financial details',
      };
    }
  },

  // Accounts Team disposition (APPROVED / REJECTED)
  accountsTeamDisposition: async (leadId, {
    decision,
    reason,
    arcAmount,
    otcAmount,
    advanceAmount,
    paymentTerms,
    customerGstNo,
    customerLegalName,
    // New customer detail fields
    companyName,
    panCardNo,
    tanNumber,
    billingAddress,
    billingPincode,
    installationAddress,
    installationPincode,
    poNumber,
    poExpiryDate,
    billDate,
    technicalInchargeMobile,
    technicalInchargeEmail,
    accountsInchargeMobile,
    accountsInchargeEmail,
    bdmName,
    serviceManager
  }) => {
    try {
      const response = await api.post(`/leads/accounts-team/${leadId}/disposition`, {
        decision,
        reason,
        arcAmount,
        otcAmount,
        advanceAmount,
        paymentTerms,
        customerGstNo,
        customerLegalName,
        // New customer detail fields
        companyName,
        panCardNo,
        tanNumber,
        billingAddress,
        billingPincode,
        installationAddress,
        installationPincode,
        poNumber,
        poExpiryDate,
        billDate,
        technicalInchargeMobile,
        technicalInchargeEmail,
        accountsInchargeMobile,
        accountsInchargeEmail,
        bdmName,
        serviceManager
      });
      const { accountsQueue, accountsStats, accountsReviewCounts } = get();
      // Remove from queue after disposition and update all counts
      set({
        accountsQueue: accountsQueue.filter(l => l.id !== leadId),
        accountsStats: {
          ...accountsStats,
          pending: Math.max(0, accountsStats.pending - 1),
          verified: decision === 'APPROVED' ? accountsStats.verified + 1 : accountsStats.verified,
          rejected: decision === 'REJECTED' ? accountsStats.rejected + 1 : accountsStats.rejected
        },
        // Also update review counts for tabs
        accountsReviewCounts: {
          approved: decision === 'APPROVED' ? accountsReviewCounts.approved + 1 : accountsReviewCounts.approved,
          rejected: decision === 'REJECTED' ? accountsReviewCounts.rejected + 1 : accountsReviewCounts.rejected
        }
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update disposition',
      };
    }
  },

  // Update accounts details for approved leads
  updateAccountsDetails: async (leadId, details) => {
    try {
      const response = await api.patch(`/leads/accounts-team/${leadId}/details`, details);
      const { accountsReviewHistory } = get();
      // Update the lead in the review history
      set({
        accountsReviewHistory: accountsReviewHistory.map(l =>
          l.id === leadId ? { ...l, ...response.data.lead } : l
        )
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update accounts details',
      };
    }
  },

  // Fetch Accounts Team review history (approved/rejected by current user)
  fetchAccountsReviewHistory: async (filter = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/accounts-team/history?filter=${filter}`);
      set({
        accountsReviewHistory: response.data.leads,
        accountsReviewCounts: response.data.counts,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, counts: response.data.counts };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch review history',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // ========== VENDOR PO FUNCTIONS (ACCOUNTS TEAM) ==========

  // Fetch PO-eligible leads
  fetchPOEligibleLeads: async (page = 1, limit = 20, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      const response = await api.get(`/leads/accounts-team/vendor-po/eligible-leads?${params}`);
      set({ poEligibleLeads: response.data.leads, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch eligible leads', isLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Create vendor PO
  createVendorPO: async (poData) => {
    try {
      const response = await api.post('/leads/accounts-team/vendor-po', poData);
      return { success: true, po: response.data.po, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to create PO' };
    }
  },

  // Fetch vendor POs
  fetchVendorPOs: async (page = 1, limit = 20, status = '') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      const response = await api.get(`/leads/accounts-team/vendor-pos?${params}`);
      set({ vendorPOs: response.data.pos, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch vendor POs', isLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch vendor PO approval queue (admin)
  fetchVendorPOApprovalQueue: async (page = 1, limit = 20, status = '') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      const response = await api.get(`/leads/admin/vendor-po-approval?${params}`);
      set({
        vendorPOs: response.data.pos,
        vendorPOStats: response.data.stats,
        isLoading: false
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch PO approval queue', isLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Approve vendor PO (admin)
  approveVendorPO: async (poId) => {
    try {
      const response = await api.post(`/leads/admin/vendor-po/${poId}/approve`);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to approve PO' };
    }
  },

  // Reject vendor PO (admin)
  rejectVendorPO: async (poId, reason) => {
    try {
      const response = await api.post(`/leads/admin/vendor-po/${poId}/reject`, { reason });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to reject PO' };
    }
  },

  // Get single vendor PO by ID
  getVendorPOById: async (poId) => {
    try {
      const response = await api.get(`/leads/accounts-team/vendor-po/${poId}`);
      return { success: true, po: response.data.po };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch PO' };
    }
  },

  // Send vendor PO email to vendor
  sendVendorPOEmail: async (poId, { to, cc, subject, message }) => {
    try {
      const response = await api.post(`/leads/accounts-team/vendor-po/${poId}/send-email`, { to, cc, subject, message });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send PO email' };
    }
  },

  // ========== END VENDOR PO FUNCTIONS ==========

  // ── Customer Import ────────────────────────────────────────────
  importLoading: false,
  importResult: null,

  bulkImportCustomers: async (rows) => {
    set({ importLoading: true, importResult: null });
    try {
      const response = await api.post('/customer-import/bulk', { rows });
      set({ importResult: response.data, importLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ importLoading: false });
      return { success: false, error: error.response?.data?.message || 'Import failed' };
    }
  },

  importSingleCustomer: async (customerData) => {
    set({ importLoading: true, importResult: null });
    try {
      const response = await api.post('/customer-import/single', customerData);
      set({ importResult: response.data, importLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ importLoading: false });
      return { success: false, error: error.response?.data?.message || 'Import failed' };
    }
  },

  getTemplateHeaders: async () => {
    try {
      const response = await api.get('/customer-import/template');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch headers' };
    }
  },

  // ========== END ACCOUNTS TEAM FUNCTIONS ==========

  // ========== DELIVERY TEAM FUNCTIONS ==========

  deliveryQueue: [],
  deliveryStats: { total: 0, pending: 0, inProgress: 0, completed: 0 },
  selectedDeliveryLead: null,

  // Fetch Delivery Team queue
  fetchDeliveryQueue: async (stage = 'pending') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/delivery-team/queue?stage=${stage}`);
      set({
        deliveryQueue: response.data.leads,
        deliveryStats: response.data.stats,
        isLoading: false
      });
      return { success: true, leads: response.data.leads, stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch Delivery queue',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch single lead details for delivery team
  fetchDeliveryLeadDetails: async (leadId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/delivery-team/${leadId}/details`);
      set({
        selectedDeliveryLead: response.data.lead,
        isLoading: false
      });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch lead details',
        isLoading: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Assign lead to delivery team member
  assignDeliveryLead: async (leadId) => {
    try {
      const response = await api.post(`/leads/delivery-team/${leadId}/assign`);
      const { deliveryQueue } = get();
      set({
        deliveryQueue: deliveryQueue.map(l =>
          l.id === leadId ? { ...l, ...response.data.lead } : l
        )
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to assign lead',
      };
    }
  },

  // Update delivery products
  updateDeliveryProducts: async (leadId, { products, notes, bandwidthRequirement, numberOfIPs }) => {
    try {
      const response = await api.patch(`/leads/delivery-team/${leadId}/products`, {
        products,
        notes,
        bandwidthRequirement,
        numberOfIPs
      });
      const { deliveryQueue, selectedDeliveryLead } = get();
      const updateFields = {
        deliveryProducts: products,
        deliveryNotes: notes,
        ...(bandwidthRequirement !== undefined && { bandwidthRequirement }),
        ...(numberOfIPs !== undefined && { numberOfIPs })
      };
      set({
        deliveryQueue: deliveryQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedDeliveryLead: selectedDeliveryLead?.id === leadId
          ? { ...selectedDeliveryLead, ...updateFields }
          : selectedDeliveryLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update products',
      };
    }
  },

  // Update delivery status
  updateDeliveryStatus: async (leadId, { status, notes }) => {
    try {
      const response = await api.patch(`/leads/delivery-team/${leadId}/status`, { status, notes });
      const { deliveryQueue, deliveryStats, selectedDeliveryLead } = get();

      // Update queue
      const updatedQueue = deliveryQueue.map(l =>
        l.id === leadId ? { ...l, deliveryStatus: status, deliveryNotes: notes } : l
      );

      // Recalculate stats
      const newStats = {
        total: deliveryStats.total,
        pending: updatedQueue.filter(l => !l.deliveryStatus || l.deliveryStatus === 'PENDING').length,
        inProgress: updatedQueue.filter(l => l.deliveryStatus === 'IN_PROGRESS').length,
        completed: updatedQueue.filter(l => l.deliveryStatus === 'COMPLETED').length
      };

      set({
        deliveryQueue: updatedQueue,
        deliveryStats: newStats,
        selectedDeliveryLead: selectedDeliveryLead?.id === leadId
          ? { ...selectedDeliveryLead, deliveryStatus: status, deliveryNotes: notes }
          : selectedDeliveryLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update status',
      };
    }
  },

  // Start installation with material verification
  startInstallation: async (leadId, materials) => {
    try {
      const response = await api.patch(`/leads/delivery-team/${leadId}/start-installation`, { materials });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to start installation',
      };
    }
  },

  // Clear selected delivery lead
  clearSelectedDeliveryLead: () => {
    set({ selectedDeliveryLead: null });
  },

  // ========== CUSTOMER ACCOUNT FUNCTIONS ==========

  // Create customer user account for lead
  createCustomerAccount: async (leadId, { username, password }) => {
    try {
      const response = await api.post(`/leads/delivery-team/${leadId}/customer-account`, {
        username,
        password
      });
      const { deliveryQueue, selectedDeliveryLead } = get();
      const lead = response.data.lead;
      const updateFields = {
        customerUserId: lead.customerUserId,
        customerUsername: lead.customerUsername,
        customerCreatedAt: lead.customerCreatedAt,
        customerCreatedBy: lead.customerCreatedBy
      };
      set({
        deliveryQueue: deliveryQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedDeliveryLead: selectedDeliveryLead?.id === leadId
          ? { ...selectedDeliveryLead, ...updateFields }
          : selectedDeliveryLead
      });
      return {
        success: true,
        lead: response.data.lead,
        customerDetails: response.data.customerDetails,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create customer account'
      };
    }
  },

  // Assign IP address to customer
  assignCustomerIP: async (leadId, ipAddress) => {
    try {
      const response = await api.patch(`/leads/delivery-team/${leadId}/customer-ip`, { ipAddress });
      const { deliveryQueue, selectedDeliveryLead } = get();
      set({
        deliveryQueue: deliveryQueue.map(l =>
          l.id === leadId ? { ...l, customerIpAssigned: ipAddress } : l
        ),
        selectedDeliveryLead: selectedDeliveryLead?.id === leadId
          ? { ...selectedDeliveryLead, customerIpAssigned: ipAddress }
          : selectedDeliveryLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to assign IP address'
      };
    }
  },

  // Configure switch port for customer
  configureCustomerSwitch: async (leadId, switchPort) => {
    try {
      const response = await api.patch(`/leads/delivery-team/${leadId}/customer-switch`, { switchPort });
      const { deliveryQueue, selectedDeliveryLead } = get();
      const lead = response.data.lead;
      const updateFields = {
        customerSwitchPort: switchPort,
        nocConfiguredAt: lead.nocConfiguredAt,
        nocConfiguredBy: lead.nocConfiguredBy
      };
      set({
        deliveryQueue: deliveryQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedDeliveryLead: selectedDeliveryLead?.id === leadId
          ? { ...selectedDeliveryLead, ...updateFields }
          : selectedDeliveryLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to configure switch port'
      };
    }
  },

  // ========== NOC QUEUE FUNCTIONS ==========

  nocQueue: [],
  nocStats: {
    total: 0,
    pending: 0,
    customerCreated: 0,
    ipAssigned: 0,
    configured: 0
  },
  selectedNocLead: null,

  // Fetch NOC queue
  fetchNocQueue: async (status = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/noc/queue?status=${status}`);
      set({
        nocQueue: response.data.leads,
        nocStats: response.data.stats,
        isLoading: false
      });
      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch NOC queue'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch NOC lead details
  fetchNocLeadDetails: async (leadId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/leads/noc/${leadId}/details`);
      set({
        selectedNocLead: response.data.lead,
        isLoading: false
      });
      return { success: true, lead: response.data.lead };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch lead details'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Create customer account (NOC)
  nocCreateCustomerAccount: async (leadId, { username, password }) => {
    try {
      const response = await api.post(`/leads/noc/${leadId}/customer-account`, {
        username,
        password
      });
      const { nocQueue, selectedNocLead } = get();
      const lead = response.data.lead;
      const updateFields = {
        customerUserId: lead.customerUserId,
        customerUsername: lead.customerUsername,
        customerCreatedAt: lead.customerCreatedAt,
        customerCreatedBy: lead.customerCreatedBy
      };
      set({
        nocQueue: nocQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedNocLead: selectedNocLead?.id === leadId
          ? { ...selectedNocLead, ...updateFields }
          : selectedNocLead
      });
      return {
        success: true,
        lead: response.data.lead,
        customerDetails: response.data.customerDetails,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create customer account'
      };
    }
  },

  // Assign IP address (NOC)
  nocAssignCustomerIP: async (leadId, ipAddress) => {
    try {
      const response = await api.patch(`/leads/noc/${leadId}/customer-ip`, { ipAddress });
      const { nocQueue, selectedNocLead } = get();
      set({
        nocQueue: nocQueue.map(l =>
          l.id === leadId ? { ...l, customerIpAssigned: ipAddress } : l
        ),
        selectedNocLead: selectedNocLead?.id === leadId
          ? { ...selectedNocLead, customerIpAssigned: ipAddress }
          : selectedNocLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to assign IP address'
      };
    }
  },

  // Assign multiple IP addresses (new flow)
  nocAssignIpAddresses: async (leadId, ipAddresses) => {
    try {
      const response = await api.patch(`/leads/noc/${leadId}/customer-ip`, { ipAddresses });
      const { nocQueue, selectedNocLead } = get();
      const updateFields = {
        customerIpAddresses: ipAddresses,
        customerIpAssigned: ipAddresses[0]
      };
      set({
        nocQueue: nocQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedNocLead: selectedNocLead?.id === leadId
          ? { ...selectedNocLead, ...updateFields }
          : selectedNocLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to assign IP addresses'
      };
    }
  },

  // Generate Circuit ID (completes NOC configuration)
  nocGenerateCircuitId: async (leadId, circuitId) => {
    try {
      const response = await api.post(`/leads/noc/${leadId}/generate-circuit`, { circuitId });
      const { nocQueue, selectedNocLead } = get();
      const lead = response.data.lead;
      const updateFields = {
        circuitId: response.data.circuitId,
        nocConfiguredAt: lead.nocConfiguredAt,
        nocConfiguredBy: lead.nocConfiguredBy
      };
      set({
        nocQueue: nocQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedNocLead: selectedNocLead?.id === leadId
          ? { ...selectedNocLead, ...updateFields }
          : selectedNocLead
      });
      return { success: true, lead: response.data.lead, circuitId: response.data.circuitId, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate circuit ID'
      };
    }
  },

  // Configure switch port (NOC) - DEPRECATED
  nocConfigureSwitch: async (leadId, switchPort) => {
    try {
      const response = await api.patch(`/leads/noc/${leadId}/customer-switch`, { switchPort });
      const { nocQueue, selectedNocLead } = get();
      const lead = response.data.lead;
      const updateFields = {
        customerSwitchPort: switchPort,
        nocConfiguredAt: lead.nocConfiguredAt,
        nocConfiguredBy: lead.nocConfiguredBy
      };
      set({
        nocQueue: nocQueue.map(l =>
          l.id === leadId ? { ...l, ...updateFields } : l
        ),
        selectedNocLead: selectedNocLead?.id === leadId
          ? { ...selectedNocLead, ...updateFields }
          : selectedNocLead
      });
      return { success: true, lead: response.data.lead, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to configure switch port'
      };
    }
  },

  // Clear selected NOC lead
  clearSelectedNocLead: () => {
    set({ selectedNocLead: null });
  },

  // ========== DELIVERY REQUEST FUNCTIONS ==========

  deliveryRequests: [],
  deliveryRequestStats: {
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    assigned: 0,
    dispatched: 0,
    completed: 0,
    total: 0
  },

  // Create delivery request
  createDeliveryRequest: async (requestData) => {
    try {
      const response = await api.post('/delivery-requests/create', requestData);
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create delivery request'
      };
    }
  },

  // Push delivery request to NOC
  pushToNoc: async (requestId) => {
    try {
      const response = await api.post(`/delivery-requests/${requestId}/push-to-noc`);
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to push to NOC'
      };
    }
  },

  // Get my delivery requests (for delivery team)
  fetchMyDeliveryRequests: async (status = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/delivery-requests/my-requests?status=${status}`);
      set({
        deliveryRequests: response.data.requests,
        isLoading: false
      });
      return { success: true, requests: response.data.requests };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch delivery requests',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Get delivery request details
  fetchDeliveryRequestDetails: async (requestId) => {
    try {
      const response = await api.get(`/delivery-requests/${requestId}`);
      return { success: true, request: response.data.request };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch request details'
      };
    }
  },

  // Get pending approval requests (for approvers)
  fetchPendingApprovalRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/delivery-requests/approval/pending');
      set({
        deliveryRequests: response.data.requests,
        deliveryRequestStats: response.data.stats,
        isLoading: false
      });
      return { success: true, requests: response.data.requests, stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch pending requests',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Approve delivery request
  approveDeliveryRequest: async (requestId) => {
    try {
      const response = await api.post(`/delivery-requests/approval/${requestId}/approve`);
      const { deliveryRequests } = get();
      set({
        deliveryRequests: deliveryRequests.filter(r => r.id !== requestId)
      });
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve request'
      };
    }
  },

  // Reject delivery request
  rejectDeliveryRequest: async (requestId, reason) => {
    try {
      const response = await api.post(`/delivery-requests/approval/${requestId}/reject`, { reason });
      const { deliveryRequests } = get();
      set({
        deliveryRequests: deliveryRequests.filter(r => r.id !== requestId)
      });
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject request'
      };
    }
  },

  // Get approved requests for store manager
  fetchApprovedRequestsForStore: async (status = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/delivery-requests/store/approved?status=${status}`);
      set({
        deliveryRequests: response.data.requests,
        deliveryRequestStats: response.data.stats,
        isLoading: false
      });
      return { success: true, requests: response.data.requests, stats: response.data.stats };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch approved requests',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Get available inventory for assignment
  fetchAvailableInventoryForRequest: async (productId = null) => {
    try {
      const url = productId
        ? `/delivery-requests/store/inventory?productId=${productId}`
        : '/delivery-requests/store/inventory';
      const response = await api.get(url);
      return { success: true, inventory: response.data.inventory };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch inventory'
      };
    }
  },

  // Assign items to request (store manager)
  assignItemsToRequest: async (requestId, assignments) => {
    try {
      const response = await api.post(`/delivery-requests/store/${requestId}/assign`, { assignments });
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to assign items'
      };
    }
  },

  // Mark request as dispatched
  markRequestAsDispatched: async (requestId) => {
    try {
      const response = await api.post(`/delivery-requests/store/${requestId}/dispatch`);
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to dispatch'
      };
    }
  },

  // Mark request as completed
  markRequestAsCompleted: async (requestId) => {
    try {
      const response = await api.post(`/delivery-requests/store/${requestId}/complete`);
      return { success: true, request: response.data.request, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to complete'
      };
    }
  },

  // Get delivery request stats
  fetchDeliveryRequestStats: async () => {
    try {
      const response = await api.get('/delivery-requests/stats/overview');
      set({ deliveryRequestStats: response.data.stats });
      return { success: true, stats: response.data.stats };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // ========== END DELIVERY REQUEST FUNCTIONS ==========

  // ========== END DELIVERY TEAM FUNCTIONS ==========
}));

// Notification Store
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Fetch notifications
  fetchNotifications: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
      set({
        notifications: response.data.notifications,
        isLoading: false
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch notifications'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      set({ unreadCount: response.data.unreadCount });
      return { success: true, count: response.data.unreadCount };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Mark single notification as read
  markAsRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      const { notifications, unreadCount } = get();
      set({
        notifications: notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, unreadCount - 1)
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      const { notifications } = get();
      set({
        notifications: notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Delete notification
  deleteNotification: async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const { notifications, unreadCount } = get();
      const notification = notifications.find(n => n.id === id);
      set({
        notifications: notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.read ? Math.max(0, unreadCount - 1) : unreadCount
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Clear all notifications
  clearAll: async () => {
    try {
      await api.delete('/notifications');
      set({ notifications: [], unreadCount: 0 });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Add notification locally (from socket)
  addNotification: (notification) => {
    const { notifications, unreadCount } = get();
    set({
      notifications: [notification, ...notifications],
      unreadCount: unreadCount + 1
    });
  },

  // Reset store
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null
    });
  }
}));

// Email Store
export const useEmailStore = create((set, get) => ({
  emailHistory: [],
  isLoading: false,
  isSending: false,
  error: null,

  // Send quotation email
  sendQuotationEmail: async ({
    referenceId,
    referenceType = 'lead',
    to,
    cc = [],
    subject,
    emailData,
    attachments = []
  }) => {
    set({ isSending: true, error: null });
    try {
      const response = await api.post('/emails/send', {
        referenceId,
        referenceType,
        to,
        cc,
        subject,
        emailData,
        attachments
      });
      set({ isSending: false });
      return {
        success: true,
        message: response.data.message,
        emailLogId: response.data.emailLogId,
        resendId: response.data.resendId
      };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to send email',
        isSending: false
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send email'
      };
    }
  },

  // Get email history for a reference
  fetchEmailHistory: async (referenceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/emails/history/${referenceId}`);
      set({
        emailHistory: response.data.emails,
        isLoading: false
      });
      return { success: true, emails: response.data.emails };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch email history',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Get user's own email history
  fetchMyEmails: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/emails/my?page=${page}&limit=${limit}`);
      set({
        emailHistory: response.data.emails,
        isLoading: false
      });
      return {
        success: true,
        emails: response.data.emails,
        pagination: response.data.pagination
      };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch emails',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Reset store
  reset: () => {
    set({
      emailHistory: [],
      isLoading: false,
      isSending: false,
      error: null
    });
  }
}));

// Vendor Store
export const useVendorStore = create((set, get) => ({
  vendors: [],
  pendingVendors: [],
  currentVendor: null,
  stats: { total: 0, active: 0, inactive: 0, pendingAdmin: 0, pendingAccounts: 0, approved: 0, rejected: 0 },
  isLoading: false,
  error: null,

  // Fetch all vendors
  fetchVendors: async (search = '', isActive = undefined, approvalStatus = undefined) => {
    set({ isLoading: true, error: null });
    try {
      let url = '/vendors';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (isActive !== undefined) params.append('isActive', isActive);
      if (approvalStatus) params.append('approvalStatus', approvalStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      set({
        vendors: response.data,
        isLoading: false
      });
      return { success: true, vendors: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch vendors',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch vendor stats
  fetchVendorStats: async () => {
    try {
      const response = await api.get('/vendors/stats');
      set({ stats: response.data });
      return { success: true, stats: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch pending vendors for approval
  fetchPendingVendors: async () => {
    try {
      const response = await api.get('/vendors/pending');
      set({ pendingVendors: response.data });
      return { success: true, vendors: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Get vendor by ID
  getVendorById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/vendors/${id}`);
      set({
        currentVendor: response.data,
        isLoading: false
      });
      return { success: true, vendor: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch vendor',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Create vendor (FormData for file uploads)
  createVendor: async (vendorData) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      // Append text fields
      const textFields = ['vendorEntityType', 'companyName', 'individualName', 'gstNumber', 'contactPerson', 'email', 'phone', 'panNumber', 'address', 'city', 'state', 'category', 'commissionPercentage', 'accountNumber', 'ifscCode', 'accountName', 'bankName', 'branchName'];
      textFields.forEach(field => {
        if (vendorData[field]) formData.append(field, vendorData[field]);
      });
      // Append file fields
      if (vendorData.panDocumentFile) formData.append('panDocument', vendorData.panDocumentFile);
      if (vendorData.gstDocumentFile) formData.append('gstDocument', vendorData.gstDocumentFile);
      if (vendorData.cancelledChequeFile) formData.append('cancelledCheque', vendorData.cancelledChequeFile);

      const response = await api.post('/vendors', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { vendors } = get();
      set({
        vendors: [response.data.vendor, ...vendors],
        isLoading: false
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create vendor',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Approve vendor
  approveVendor: async (id) => {
    try {
      const response = await api.post(`/vendors/${id}/approve`);
      const { vendors } = get();
      set({
        vendors: vendors.map(v => v.id === id ? response.data.vendor : v)
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Reject vendor
  rejectVendor: async (id, reason) => {
    try {
      const response = await api.post(`/vendors/${id}/reject`, { reason });
      const { vendors } = get();
      set({
        vendors: vendors.map(v => v.id === id ? response.data.vendor : v)
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Update vendor
  updateVendor: async (id, vendorData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/vendors/${id}`, vendorData);
      const { vendors } = get();
      set({
        vendors: vendors.map(v => v.id === id ? response.data.vendor : v),
        isLoading: false
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update vendor',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Create vendor from feasibility (simplified, docs optional)
  createVendorFromFeasibility: async (vendorData) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      const textFields = ['vendorType', 'companyName', 'individualName', 'category', 'contactPerson', 'email', 'phone', 'gstNumber', 'panNumber', 'address', 'city', 'state', 'estimatedCapex', 'estimatedOpex', 'createdForLeadId'];
      textFields.forEach(field => {
        if (vendorData[field] !== undefined && vendorData[field] !== null && vendorData[field] !== '') formData.append(field, vendorData[field]);
      });
      if (vendorData.panDocumentFile) formData.append('panDocument', vendorData.panDocumentFile);
      if (vendorData.gstDocumentFile) formData.append('gstDocument', vendorData.gstDocumentFile);
      if (vendorData.cancelledChequeFile) formData.append('cancelledCheque', vendorData.cancelledChequeFile);

      const response = await api.post('/vendors/from-feasibility', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { vendors } = get();
      set({
        vendors: [response.data.vendor, ...vendors],
        isLoading: false
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create vendor',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Upload vendor documents (after initial creation)
  uploadVendorDocs: async (vendorId, docData) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      const textFields = ['panNumber', 'gstNumber', 'accountNumber', 'ifscCode', 'accountName', 'bankName', 'branchName'];
      textFields.forEach(field => {
        if (docData[field]) formData.append(field, docData[field]);
      });
      if (docData.panDocumentFile) formData.append('panDocument', docData.panDocumentFile);
      if (docData.gstDocumentFile) formData.append('gstDocument', docData.gstDocumentFile);
      if (docData.cancelledChequeFile) formData.append('cancelledCheque', docData.cancelledChequeFile);

      const response = await api.post(`/vendors/${vendorId}/upload-docs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { vendors } = get();
      set({
        vendors: vendors.map(v => v.id === vendorId ? response.data.vendor : v),
        isLoading: false
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to upload vendor documents',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Verify vendor documents (accounts team)
  verifyVendorDocs: async (vendorId, decision, reason) => {
    try {
      const response = await api.post(`/vendors/${vendorId}/verify-docs`, { decision, reason });
      const { vendors } = get();
      set({
        vendors: vendors.map(v => v.id === vendorId ? response.data.vendor : v)
      });
      return { success: true, vendor: response.data.vendor, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch vendor approval queue (admin)
  fetchVendorApprovalQueue: async (page = 1, limit = 20, status = 'pending') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/vendors/approval-queue?page=${page}&limit=${limit}&status=${status}`);
      set({
        pendingVendors: response.data.vendors,
        isLoading: false
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch approval queue',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Delete vendor (permanently)
  deleteVendor: async (id) => {
    try {
      await api.delete(`/vendors/${id}`);
      const { vendors } = get();
      set({
        vendors: vendors.filter(v => v.id !== id)
      });
      return { success: true, message: 'Vendor deleted successfully' };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Reset store
  reset: () => {
    set({
      vendors: [],
      pendingVendors: [],
      currentVendor: null,
      stats: { total: 0, active: 0, inactive: 0, pendingAdmin: 0, pendingAccounts: 0, approved: 0, rejected: 0 },
      isLoading: false,
      error: null
    });
  }
}));

// Inventory Store (Admin only)
export const useInventoryStore = create((set, get) => ({
  items: [],
  currentItem: null,
  stats: { total: 0, active: 0, inactive: 0, lowStock: 0 },
  lowStockItems: [],
  isLoading: false,
  error: null,

  // Fetch all inventory items
  fetchItems: async (search = '', isActive = undefined) => {
    set({ isLoading: true, error: null });
    try {
      let url = '/inventory';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (isActive !== undefined) params.append('isActive', isActive);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      set({
        items: response.data,
        isLoading: false
      });
      return { success: true, items: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch inventory items',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch inventory stats
  fetchStats: async () => {
    try {
      const response = await api.get('/inventory/stats');
      set({ stats: response.data });
      return { success: true, stats: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Fetch low stock items
  fetchLowStockItems: async () => {
    try {
      const response = await api.get('/inventory/low-stock');
      set({ lowStockItems: response.data });
      return { success: true, items: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Get item by ID
  getItemById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/inventory/${id}`);
      set({
        currentItem: response.data,
        isLoading: false
      });
      return { success: true, item: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to fetch item',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Create inventory item
  createItem: async (itemData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/inventory', itemData);
      const { items } = get();
      set({
        items: [response.data.item, ...items],
        isLoading: false
      });
      return { success: true, item: response.data.item, message: response.data.message };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to create item',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Update inventory item
  updateItem: async (id, itemData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/inventory/${id}`, itemData);
      const { items } = get();
      set({
        items: items.map(item => item.id === id ? response.data.item : item),
        currentItem: response.data.item,
        isLoading: false
      });
      return { success: true, item: response.data.item, message: response.data.message };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to update item',
        isLoading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Update inventory quantity (increment/decrement)
  updateQuantity: async (id, adjustment, reason = '') => {
    try {
      const response = await api.patch(`/inventory/${id}/quantity`, { adjustment, reason });
      const { items } = get();
      set({
        items: items.map(item => item.id === id ? response.data.item : item)
      });
      return { success: true, item: response.data.item, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Delete inventory item (permanently)
  deleteItem: async (id) => {
    try {
      await api.delete(`/inventory/${id}`);
      const { items } = get();
      set({
        items: items.filter(item => item.id !== id)
      });
      return { success: true, message: 'Item deleted successfully' };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Clear current item
  clearCurrentItem: () => {
    set({ currentItem: null });
  },

  // Reset store
  reset: () => {
    set({
      items: [],
      currentItem: null,
      stats: { total: 0, active: 0, inactive: 0, lowStock: 0 },
      lowStockItems: [],
      isLoading: false,
      error: null
    });
  }
}));

// ==================== COMPLAINT STORE ====================
export const useComplaintStore = create((set, get) => ({
  complaints: [],
  myQueue: [],
  complaintDetail: null,
  categories: [],
  stats: null,
  pagination: null,
  loading: false,
  error: null,
  assignableUsers: { noc: [], ops: [], accounts: [] },
  closeOptions: { REASON_FOR_OUTAGE: [], RESOLUTION: [], RESOLUTION_TYPE: [] },
  customerList: [],
  customerPagination: null,
  customerComplaints: [],
  customerComplaintsPagination: null,

  fetchCustomerList: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, value);
        }
      });
      const response = await api.get(`/complaints/customers?${query.toString()}`);
      set({
        customerList: response.data.customers,
        customerPagination: response.data.pagination,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchCustomerComplaints: async (leadId, params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, value);
        }
      });
      const response = await api.get(`/complaints/customer/${leadId}?${query.toString()}`);
      set({
        customerComplaints: response.data.complaints,
        customerComplaintsPagination: response.data.pagination,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchComplaints: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, value);
        }
      });
      const response = await api.get(`/complaints?${query.toString()}`);
      set({
        complaints: response.data.complaints,
        stats: response.data.stats,
        pagination: response.data.pagination,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchMyQueue: async (params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, value);
        }
      });
      const response = await api.get(`/complaints/my-queue?${query.toString()}`);
      set({
        myQueue: response.data.complaints,
        pagination: response.data.pagination,
        loading: false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchComplaintById: async (id) => {
    set({ loading: true });
    try {
      const response = await api.get(`/complaints/${id}`);
      set({ complaintDetail: response.data.data, loading: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  createComplaint: async (data) => {
    try {
      const response = await api.post('/complaints', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchAssignableUsers: async () => {
    try {
      const response = await api.get('/complaints/assignable-users');
      set({ assignableUsers: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  uploadAttachments: async (complaintId, files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await api.post(`/complaints/${complaintId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  deleteAttachment: async (complaintId, attachmentId) => {
    try {
      await api.delete(`/complaints/${complaintId}/attachments/${attachmentId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.put(`/complaints/${id}/status`, { status });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  closeComplaint: async (id, data) => {
    try {
      const response = await api.put(`/complaints/${id}/close`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchCloseOptions: async () => {
    try {
      const response = await api.get('/complaint-close-options');
      set({ closeOptions: response.data.data });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  updateComplaintDetails: async (id, data) => {
    try {
      const response = await api.put(`/complaints/${id}/update-details`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  assignComplaint: async (id, assigneeIds) => {
    try {
      const response = await api.put(`/complaints/${id}/assign`, { assigneeIds });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  updateNotes: async (id, notes) => {
    try {
      const response = await api.put(`/complaints/${id}/notes`, { notes });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchCategories: async () => {
    try {
      const response = await api.get('/complaint-categories');
      set({ categories: response.data.data });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchAllCategories: async () => {
    try {
      const response = await api.get('/complaint-categories/all');
      set({ categories: response.data.data });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  createCategory: async (data) => {
    try {
      const response = await api.post('/complaint-categories', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  updateCategory: async (id, data) => {
    try {
      const response = await api.put(`/complaint-categories/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  createSubCategory: async (categoryId, data) => {
    try {
      const response = await api.post(`/complaint-categories/${categoryId}/sub-categories`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  updateSubCategory: async (id, data) => {
    try {
      const response = await api.put(`/complaint-categories/sub-categories/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchDashboardStats: async () => {
    try {
      const response = await api.get('/complaints/dashboard/stats');
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchCustomerComplaints: async (leadId, params = {}) => {
    try {
      const query = new URLSearchParams(params);
      const response = await api.get(`/complaints/customer/${leadId}?${query.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  reset: () => set({ complaints: [], myQueue: [], complaintDetail: null, stats: null, pagination: null, loading: false, error: null, assignableUsers: { noc: [], ops: [], accounts: [] } }),
}));

// Customer 360 Store
export const useCustomer360Store = create((set, get) => ({
  // Search
  searchResults: [],
  searchLoading: false,
  searchPagination: null,

  // Detail
  summary: null,
  summaryLoading: false,
  activeTab: 'journey',
  tabData: {},
  tabLoading: {},
  tabError: {},

  searchCustomers: async (query = '', page = 1, limit = 20) => {
    set({ searchLoading: true });
    try {
      const params = new URLSearchParams({ page, limit });
      if (query) params.set('q', query);
      const response = await api.get(`/customer-360/search?${params.toString()}`);
      set({
        searchResults: response.data.items,
        searchPagination: response.data.pagination,
        searchLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({ searchLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  fetchSummary: async (leadId) => {
    set({ summaryLoading: true, summary: null, tabData: {}, tabLoading: {}, tabError: {} });
    try {
      const response = await api.get(`/customer-360/${leadId}/summary`);
      set({ summary: response.data, summaryLoading: false });
      return { success: true };
    } catch (error) {
      set({ summaryLoading: false });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Lightweight refresh that doesn't clear tabs (used by socket refresh)
  refreshSummary: async (leadId) => {
    try {
      const response = await api.get(`/customer-360/${leadId}/summary`);
      set({ summary: response.data });
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  fetchTabData: async (leadId, tab, { force = false } = {}) => {
    const { tabData } = get();
    if (!force && tabData[tab]) return { success: true, data: tabData[tab] };

    set((state) => ({
      tabLoading: { ...state.tabLoading, [tab]: true },
      tabError: { ...state.tabError, [tab]: null },
    }));
    try {
      const response = await api.get(`/customer-360/${leadId}/${tab}`);
      set((state) => ({
        tabData: { ...state.tabData, [tab]: response.data },
        tabLoading: { ...state.tabLoading, [tab]: false },
      }));
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load data';
      set((state) => ({
        tabLoading: { ...state.tabLoading, [tab]: false },
        tabError: { ...state.tabError, [tab]: msg },
      }));
      return { success: false, error: msg };
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  invalidateTab: (tab) => {
    set((state) => {
      const newTabData = { ...state.tabData };
      delete newTabData[tab];
      const newTabError = { ...state.tabError };
      delete newTabError[tab];
      return { tabData: newTabData, tabError: newTabError };
    });
  },

  reset: () => set({
    summary: null,
    summaryLoading: false,
    activeTab: 'journey',
    tabData: {},
    tabLoading: {},
    tabError: {},
  }),
}));

// ============================================================
// NEXUS AI Assistant (staff)
// ============================================================

export const useNexusStore = create((set, get) => ({
  isOpen: false,
  messages: [], // [{ role: 'USER' | 'ASSISTANT', content, fromCache? }]
  conversationId: null,
  sending: false,
  error: null,
  quota: null, // { limit, used, remaining }

  toggle: () => {
    const opening = !get().isOpen;
    set({ isOpen: opening, error: null });
    if (opening) get().fetchQuota();
  },
  open: () => {
    set({ isOpen: true, error: null });
    get().fetchQuota();
  },
  close: () => set({ isOpen: false }),

  fetchQuota: async () => {
    try {
      const { data } = await api.get('/nexus/quota');
      set({ quota: data.quota });
    } catch {
      // non-fatal — just leave quota as-is
    }
  },

  sendMessage: async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || get().sending) return;

    const userMsg = { role: 'USER', content: trimmed };
    set((s) => ({ messages: [...s.messages, userMsg], sending: true, error: null }));

    try {
      const { data } = await api.post('/nexus/ask', {
        message: trimmed,
        conversationId: get().conversationId,
      });
      const assistantMsg = { role: 'ASSISTANT', content: data.answer, fromCache: !!data.fromCache };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        conversationId: data.conversationId,
        quota: data.quota ?? s.quota,
        sending: false,
      }));
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        (status === 429 ? "You're going too fast. Please wait a moment." : 'Something went wrong. Please try again.');
      const quotaFromErr = err?.response?.data?.quota;
      set((s) => ({
        messages: [...s.messages, { role: 'ASSISTANT', content: message, isError: true }],
        quota: quotaFromErr ?? s.quota,
        sending: false,
        error: message,
      }));
    }
  },

  clearChat: () => set({ messages: [], conversationId: null, error: null }),
  // Full reset — called on logout so next login starts clean.
  reset: () => set({
    isOpen: false,
    messages: [],
    conversationId: null,
    sending: false,
    error: null,
    quota: null,
  }),
}));

// ============================================================
// NEXUS Knowledge Base admin (SUPER_ADMIN)
// ============================================================

export const useNexusKnowledgeStore = create((set, get) => ({
  items: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  loading: false,
  error: null,

  fetchKnowledge: async ({ page = 1, limit = 20, search = '', audience = '' } = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (search) params.set('search', search);
      if (audience) params.set('audience', audience);
      const { data } = await api.get(`/nexus/knowledge?${params.toString()}`);
      set({ items: data.items, pagination: data.pagination, loading: false });
      return { success: true };
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to load knowledge.';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  createKnowledge: async (payload) => {
    try {
      const { data } = await api.post('/nexus/knowledge', payload);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err?.response?.data?.message || 'Create failed.' };
    }
  },

  updateKnowledge: async (id, payload) => {
    try {
      const { data } = await api.put(`/nexus/knowledge/${id}`, payload);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err?.response?.data?.message || 'Update failed.' };
    }
  },

  deleteKnowledge: async (id) => {
    try {
      await api.delete(`/nexus/knowledge/${id}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.response?.data?.message || 'Delete failed.' };
    }
  },
}));

// ============================================================
// Reminders — generic stack for every type of scheduled popup reminder
// (meetings, follow-ups, SAM visits, complaint TAT, invoice due, etc).
// Driven by the backend 'reminder:show' socket event.
// ============================================================

export const useReminderStore = create((set, get) => ({
  // queue of active reminders the user hasn't dismissed yet
  reminders: [],

  pushReminder: (payload) => {
    if (!payload?.id) return;
    // Defense-in-depth: server already dedups, but don't stack the same id twice
    if (get().reminders.some((r) => r.id === payload.id)) return;
    set((s) => ({
      reminders: [...s.reminders, { ...payload, receivedAt: new Date().toISOString() }],
    }));
  },

  dismissReminder: (id) =>
    set((s) => ({
      reminders: s.reminders.filter((r) => r.id !== id),
    })),

  // Called from auth store on logout to avoid carrying reminders across users
  reset: () => set({ reminders: [] }),
}));

// Backward-compat alias — previous name referenced meeting specifically.
// Keeps older imports working if any linger.
export const useMeetingReminderStore = useReminderStore;
