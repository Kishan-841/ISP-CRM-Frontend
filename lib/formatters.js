/**
 * Shared formatting utilities used across all dashboard pages.
 * Replaces 68+ inline formatCurrency/formatDate definitions.
 */

/**
 * Formats a number as Indian Rupee currency.
 * @param {number|null|undefined} amount
 * @returns {string} Formatted currency string or '₹0' for falsy values
 */
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number as compact Indian Rupee currency with suffixes (K, L, Cr).
 * Use this for dashboard stat cards where space is limited.
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. '₹2.5L', '₹1.2Cr', '₹500K', '₹0'
 */
export function formatCompactCurrency(amount) {
  const num = Number(amount);
  if (!num || isNaN(num)) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Formats a date string as 'DD Mon YYYY' in Indian locale.
 * @param {string|Date|null|undefined} date
 * @returns {string} Formatted date or '-' for falsy values
 */
export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date string as 'DD Mon YYYY, HH:MM' in Indian locale.
 * @param {string|Date|null|undefined} date
 * @returns {string} Formatted date+time or '-' for falsy values
 */
export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
