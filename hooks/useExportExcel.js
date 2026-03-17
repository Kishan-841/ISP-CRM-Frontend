'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';

/**
 * Reusable Excel export hook. Replaces 8+ identical export functions.
 *
 * @param {Object} options
 * @param {string} options.endpoint - API endpoint to fetch data from
 * @param {Function} options.getParams - Function returning URLSearchParams or params object
 * @param {Function} options.mapRow - Function (item, index) => object for each row
 * @param {string} options.sheetName - Name of the Excel sheet
 * @param {string} options.fileName - File name (without .xlsx extension)
 * @param {Array<{wch: number}>} options.columnWidths - Column width definitions
 * @param {string} [options.dataKey] - Key to extract data from response (e.g., 'invoices', 'items')
 * @returns {{ handleExport: Function, isExporting: boolean }}
 */
export function useExportExcel({ endpoint, getParams, mapRow, sheetName, fileName, columnWidths, dataKey }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = getParams();
      const queryString = params instanceof URLSearchParams ? params.toString() : new URLSearchParams(params).toString();
      const response = await api.get(`${endpoint}?${queryString}`);

      const exportData = dataKey ? response.data[dataKey] : response.data.items || response.data;

      if (!exportData || exportData.length === 0) {
        toast.error('No data to export');
        return;
      }

      const excelData = exportData.map(mapRow);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      if (columnWidths) ws['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return { handleExport, isExporting };
}
