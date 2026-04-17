import { create } from 'zustand';
import customerApi from './customerApi';

export const useCustomerAuthStore = create((set) => ({
  customer: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('customer_token');
    const customer = localStorage.getItem('customer_user');
    if (token && customer) {
      try {
        set({ token, customer: JSON.parse(customer), isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_user');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    try {
      const res = await customerApi.post('/auth/customer-login', { username, password });
      const { token, customer } = res.data;
      localStorage.setItem('customer_token', token);
      localStorage.setItem('customer_user', JSON.stringify(customer));
      try { useCustomerNexusStore.getState().reset(); } catch {}
      set({ token, customer, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    // Reset NEXUS chat so next login starts clean
    try { useCustomerNexusStore.getState().reset(); } catch {}
    set({ customer: null, token: null, isAuthenticated: false });
  },
}));

export const useCustomerProfileStore = create((set) => ({
  profile: null,
  loading: false,

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const res = await customerApi.get('/customer/profile');
      set({ profile: res.data.data, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      await customerApi.patch('/customer/profile', data);
      // Refresh profile after update
      const res = await customerApi.get('/customer/profile');
      set({ profile: res.data.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Update failed' };
    }
  },
}));

export const useCustomerPlanStore = create((set) => ({
  plan: null,
  demoPlan: null,
  upgradeHistory: [],
  loading: false,

  fetchPlan: async () => {
    set({ loading: true });
    try {
      const res = await customerApi.get('/customer/plan');
      set({
        plan: res.data.data.currentPlan,
        demoPlan: res.data.data.demoPlan,
        upgradeHistory: res.data.data.upgradeHistory,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
    }
  },
}));

export const useCustomerBillingStore = create((set) => ({
  summary: null,
  invoices: [],
  payments: [],
  invoicePagination: null,
  paymentPagination: null,
  loading: false,

  fetchBillingSummary: async () => {
    try {
      const res = await customerApi.get('/customer/billing-summary');
      set({ summary: res.data.data });
    } catch (error) {
      console.error('Fetch billing summary error:', error);
    }
  },

  fetchInvoices: async (page = 1, limit = 10, status) => {
    set({ loading: true });
    try {
      let url = `/customer/invoices?page=${page}&limit=${limit}`;
      if (status && status !== 'ALL') url += `&status=${status}`;
      const res = await customerApi.get(url);
      set({ invoices: res.data.data, invoicePagination: res.data.pagination, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  fetchInvoiceDetail: async (id) => {
    try {
      const res = await customerApi.get(`/customer/invoices/${id}`);
      return { success: true, data: res.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to load invoice' };
    }
  },

  fetchPayments: async (page = 1, limit = 10) => {
    set({ loading: true });
    try {
      const res = await customerApi.get(`/customer/payments?page=${page}&limit=${limit}`);
      set({ payments: res.data.data, paymentPagination: res.data.pagination, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },
}));

export const useCustomerComplaintStore = create((set) => ({
  requests: [],
  categories: [],
  pagination: null,
  loading: false,

  fetchComplaints: async (page = 1, limit = 10, status) => {
    set({ loading: true });
    try {
      let url = `/customer/complaints?page=${page}&limit=${limit}`;
      if (status && status !== 'ALL') url += `&status=${status}`;
      const res = await customerApi.get(url);
      set({ requests: res.data.data, pagination: res.data.pagination, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const res = await customerApi.get('/customer/complaints/categories');
      set({ categories: res.data.data });
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  },

  submitComplaint: async (data) => {
    try {
      const res = await customerApi.post('/customer/complaints', data);
      return { success: true, data: res.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to submit' };
    }
  },

  uploadAttachments: async (requestId, files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const res = await customerApi.post(`/customer/complaints/${requestId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return { success: true, data: res.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Upload failed' };
    }
  },
}));

export const useCustomerEnquiryStore = create((set) => ({
  enquiries: [],
  pagination: null,
  loading: false,
  submitting: false,

  fetchEnquiries: async (page = 1, limit = 10, status) => {
    set({ loading: true });
    try {
      let url = `/customer/enquiries?page=${page}&limit=${limit}`;
      if (status && status !== 'ALL') url += `&status=${status}`;
      const res = await customerApi.get(url);
      set({ enquiries: res.data.data, pagination: res.data.pagination, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  submitEnquiry: async (data) => {
    set({ submitting: true });
    try {
      const res = await customerApi.post('/customer/enquiries', data);
      set({ submitting: false });
      return { success: true, data: res.data.data };
    } catch (error) {
      set({ submitting: false });
      return { success: false, error: error.response?.data?.message || 'Failed to submit' };
    }
  },
}));

// ============================================================
// NEXUS AI Assistant (customer portal)
// ============================================================

export const useCustomerNexusStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  conversationId: null,
  sending: false,
  error: null,
  quota: null,

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
      const { data } = await customerApi.get('/customer/nexus/quota');
      set({ quota: data.quota });
    } catch {
      // non-fatal
    }
  },

  sendMessage: async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || get().sending) return;

    const userMsg = { role: 'USER', content: trimmed };
    set((s) => ({ messages: [...s.messages, userMsg], sending: true, error: null }));

    try {
      const { data } = await customerApi.post('/customer/nexus/ask', {
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
  reset: () => set({
    isOpen: false,
    messages: [],
    conversationId: null,
    sending: false,
    error: null,
    quota: null,
  }),
}));
