import api from './api';

/**
 * Creates a standard fetch action for Zustand stores.
 * Handles loading state, error state, and returns { success, error }.
 *
 * @param {Function} set - Zustand set function
 * @param {string} endpoint - API endpoint path
 * @param {string} stateKey - Key in the store to set the fetched data
 * @param {string} [dataPath] - Path to extract from response.data (e.g., 'users', 'items')
 * @param {string} [errorMsg='Failed to fetch data'] - Error message fallback
 * @returns {Function} Async fetch function
 */
export function createFetchAction(set, endpoint, stateKey, dataPath, errorMsg = 'Failed to fetch data') {
  return async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(endpoint);
      const data = dataPath ? response.data[dataPath] : response.data;
      set({ [stateKey]: data, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || errorMsg;
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  };
}

/**
 * Creates a standard paginated fetch action for Zustand stores.
 * Builds URLSearchParams from provided filters, handles loading/error.
 *
 * @param {Function} set - Zustand set function
 * @param {string} endpoint - API endpoint path
 * @param {Object} stateKeys - { data: 'leads', pagination: 'leadsPagination', stats: 'leadsStats' }
 * @param {string} [errorMsg='Failed to fetch data'] - Error message fallback
 * @returns {Function} Async function (page, limit, filters) => Promise<{success, error?}>
 */
export function createPaginatedFetchAction(set, endpoint, stateKeys, errorMsg = 'Failed to fetch data') {
  return async (page = 1, limit = 25, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value);
        }
      });
      const response = await api.get(`${endpoint}?${params.toString()}`);
      const updates = { isLoading: false };
      if (stateKeys.data) updates[stateKeys.data] = response.data[stateKeys.data] || response.data.items;
      if (stateKeys.pagination) updates[stateKeys.pagination] = response.data.pagination;
      if (stateKeys.stats) updates[stateKeys.stats] = response.data.stats;
      set(updates);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || errorMsg;
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  };
}
