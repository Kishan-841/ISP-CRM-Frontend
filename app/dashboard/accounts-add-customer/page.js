'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Users,
  ShieldAlert,
  Building2,
  MapPin,
  CreditCard,
  FileText,
  Phone,
  Network,
} from 'lucide-react';

const TEMPLATE_HEADERS = [
  'Name', 'First Name', 'Last Name', 'Phone', 'Email', 'Company Name',
  'City', 'State', 'ARC Amount', 'OTC Amount', 'GST Number', 'Legal Name',
  'PAN Number', 'TAN Number', 'Installation Address', 'Installation Pincode',
  'Billing Address', 'Billing Pincode', 'PO Number', 'PO Expiry Date',
  'Bill Date', 'Billing Cycle', 'Tech Incharge Mobile', 'Tech Incharge Email',
  'Accounts Incharge Mobile', 'Accounts Incharge Email', 'BDM Name',
  'Service Manager', 'Number of IPs', 'IP Addresses', 'SAM Executive Name',
];

const HEADER_TO_FIELD = {
  'Name': 'name', 'First Name': 'firstName', 'Last Name': 'lastName',
  'Phone': 'phone', 'Email': 'email', 'Company Name': 'companyName',
  'City': 'city', 'State': 'state', 'ARC Amount': 'arcAmount',
  'OTC Amount': 'otcAmount', 'GST Number': 'gstNumber', 'Legal Name': 'legalName',
  'PAN Number': 'panNumber', 'TAN Number': 'tanNumber',
  'Installation Address': 'installationAddress', 'Installation Pincode': 'installationPincode',
  'Billing Address': 'billingAddress', 'Billing Pincode': 'billingPincode',
  'PO Number': 'poNumber', 'PO Expiry Date': 'poExpiryDate', 'Bill Date': 'billDate',
  'Billing Cycle': 'billingCycle', 'Tech Incharge Mobile': 'techInchargeMobile',
  'Tech Incharge Email': 'techInchargeEmail', 'Accounts Incharge Mobile': 'accountsInchargeMobile',
  'Accounts Incharge Email': 'accountsInchargeEmail', 'BDM Name': 'bdmName',
  'Service Manager': 'serviceManager', 'Number of IPs': 'numberOfIPs',
  'IP Addresses': 'ipAddresses', 'SAM Executive Name': 'samExecutiveName',
  'Bandwidth (Mbps)': 'bandwidth', 'Username': 'username',
};

const INITIAL_FORM = {
  name: '', firstName: '', lastName: '', phone: '', email: '', companyName: '',
  city: '', state: '', arcAmount: '', otcAmount: '', gstNumber: '', legalName: '',
  panNumber: '', tanNumber: '', installationAddress: '', installationPincode: '',
  billingAddress: '', billingPincode: '', poNumber: '', poExpiryDate: '', billDate: '',
  billingCycle: 'MONTHLY', techInchargeMobile: '', techInchargeEmail: '',
  accountsInchargeMobile: '', accountsInchargeEmail: '', bdmName: '', serviceManager: '',
  numberOfIPs: '', ipAddresses: '', samExecutiveName: '', bandwidth: '', username: '',
};

export default function AccountsAddCustomerPage() {
  const { user, isAccountsTeam, isSuperAdmin: isAdmin } = useRoleCheck();
  const { bulkImportCustomers, importSingleCustomer, importLoading } = useLeadStore();

  const [activeTab, setActiveTab] = useState('excel');
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const fileInputRef = useRef(null);

  // Access check
  if (user && !isAccountsTeam && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <ShieldAlert className="h-16 w-16 text-red-500" />
            <h2 className="text-xl font-semibold text-center">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              You do not have permission to access this page. Only Accounts Team and Super Admin can add customers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Download template
  const handleDownloadTemplate = () => {
    const sampleRows = [
      TEMPLATE_HEADERS,
      [
        'Amit Sharma', 'Amit', 'Sharma', '9876543210', 'amit.sharma@example.com',
        'TechCorp Pvt Ltd', 'Pune', 'Maharashtra',
        '100000', '25000', '27AABCU9603R1ZM', 'TechCorp Private Limited',
        'AAAAA1234A', 'MUMA12345B',
        '123, MG Road, Koregaon Park, Pune', '411001',
        '456, FC Road, Shivajinagar, Pune', '411005',
        'PO-2024-001', '2025-12-31', '2025-01-15', 'MONTHLY',
        '9876543211', 'tech@techcorp.com', '9876543212', 'accounts@techcorp.com',
        'Rajesh Kumar', 'Sunil Verma',
        '2', '103.45.67.1, 103.45.67.2', 'Sam Executive', '100', 'amit_sharma'
      ],
      [
        'Neha Patel', 'Neha', 'Patel', '9123456780', 'neha.patel@example.com',
        'BlueWave Solutions', 'Mumbai', 'Maharashtra',
        '150000', '30000', '27BBCDU1234R1ZN', 'BlueWave Solutions Pvt Ltd',
        'BBBBB5678B', 'MUMB67890C',
        '789, Link Road, Andheri West, Mumbai', '400053',
        '101, Bandra Kurla Complex, Mumbai', '400051',
        'PO-2024-002', '2026-06-30', '2025-02-01', 'QUARTERLY',
        '9123456781', 'tech@bluewave.in', '9123456782', 'accounts@bluewave.in',
        'Priya Singh', 'Amit Deshmukh',
        '3', '203.50.100.1, 203.50.100.2, 203.50.100.3', 'Sam Executive', '200', 'neha_patel'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Import');
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.writeFile(wb, 'customer_import_template.xlsx');
    toast.success('Template downloaded with sample data');
  };

  // Parse uploaded file
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { raw: false });

        if (jsonRows.length === 0) {
          toast.error('No data rows found in the file');
          setParsedRows([]);
          return;
        }

        // Map headers to field keys
        const mapped = jsonRows.map((row) => {
          const mappedRow = {};
          Object.entries(HEADER_TO_FIELD).forEach(([header, field]) => {
            if (row[header] !== undefined && row[header] !== null) {
              mappedRow[field] = String(row[header]).trim();
            } else {
              mappedRow[field] = '';
            }
          });
          return mappedRow;
        });

        setParsedRows(mapped);
        toast.success(`Parsed ${mapped.length} row(s) from file`);
      } catch (err) {
        console.error('Excel parse error:', err);
        toast.error('Failed to parse the Excel file');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Bulk import
  const handleBulkImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('No rows to import');
      return;
    }
    const result = await bulkImportCustomers(parsedRows);
    if (result.success) {
      setImportResult(result.data);
      toast.success(`Import complete: ${result.data.summary?.imported || 0} customer(s) imported`);
    } else {
      toast.error(result.error || 'Import failed');
    }
  };

  // Reset Excel import
  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Single entry form change
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Single entry submit
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name && !form.companyName) {
      toast.error('Please enter at least a Name or Company Name');
      return;
    }
    if (!form.phone) {
      toast.error('Phone number is required');
      return;
    }

    const result = await importSingleCustomer(form);
    if (result.success) {
      const d = result.data;
      const ids = [
        d.customerUserId && `Customer ID: ${d.customerUserId}`,
        d.customerUsername && `Username: ${d.customerUsername}`,
        d.circuitId && `Circuit ID: ${d.circuitId}`,
      ].filter(Boolean).join(' | ');
      toast.success(ids ? `Customer created - ${ids}` : 'Customer created successfully');
      setForm(INITIAL_FORM);
    } else {
      toast.error(result.error || 'Failed to add customer');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Add Customer
          </h1>
          <p className="text-muted-foreground mt-1">
            Import customers via Excel or add a single customer manually
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'excel'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel Import
        </button>
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'single'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Single Entry
        </button>
      </div>

      {/* Tab 1: Excel Import */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Import from Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!fileName && parsedRows.length === 0 && !importResult}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Dropzone */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                {fileName ? (
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {parsedRows.length} row(s) parsed
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Click to upload or drag & drop</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {parsedRows.length > 0 && !importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Preview ({parsedRows.length} rows)
                  </span>
                  <Button onClick={handleBulkImport} disabled={importLoading}>
                    {importLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {parsedRows.length} Customers
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-md border">
                  <table className="text-sm min-w-max">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">#</th>
                        {Object.keys(HEADER_TO_FIELD).map((header) => (
                          <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{idx + 1}</td>
                          {Object.values(HEADER_TO_FIELD).map((field) => (
                            <td key={field} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate" title={String(row[field] || '')}>
                              {row[field] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Showing first 10 of {parsedRows.length} rows
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="text-sm px-3 py-1.5">
                      Total: {importResult.summary?.total || 0}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm px-3 py-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Imported: {importResult.summary?.imported || 0}
                    </Badge>
                    {(importResult.summary?.invalid || 0) > 0 && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-sm px-3 py-1.5">
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Invalid: {importResult.summary?.invalid || 0}
                      </Badge>
                    )}
                    {(importResult.summary?.duplicates || 0) > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-sm px-3 py-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Duplicates: {importResult.summary?.duplicates || 0}
                      </Badge>
                    )}
                    {(importResult.samAssignmentErrors?.length || 0) > 0 && (
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-sm px-3 py-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        SAM Warnings: {importResult.samAssignmentErrors.length}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Imported Customers */}
              {importResult.imported?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Imported Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-80 rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">#</th>
                            <th className="px-3 py-2 text-left font-medium">Row</th>
                            <th className="px-3 py-2 text-left font-medium">Company</th>
                            <th className="px-3 py-2 text-left font-medium">Customer ID</th>
                            <th className="px-3 py-2 text-left font-medium">Username</th>
                            <th className="px-3 py-2 text-left font-medium">Circuit ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importResult.imported.map((row, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                              <td className="px-3 py-2">{row.row || '-'}</td>
                              <td className="px-3 py-2">{row.company || '-'}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.customerUserId || '-'}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.customerUsername || '-'}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.circuitId || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invalid Rows */}
              {importResult.invalidRows?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      Invalid Rows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-60 rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Row</th>
                            <th className="px-3 py-2 text-left font-medium">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importResult.invalidRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium">{row.row || idx + 1}</td>
                              <td className="px-3 py-2 text-red-600 dark:text-red-400">
                                {Array.isArray(row.errors) ? row.errors.join(', ') : row.error || 'Unknown error'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Duplicate Rows */}
              {importResult.duplicateRows?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Duplicate Rows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-60 rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Row</th>
                            <th className="px-3 py-2 text-left font-medium">Phone</th>
                            <th className="px-3 py-2 text-left font-medium">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importResult.duplicateRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium">{row.row || idx + 1}</td>
                              <td className="px-3 py-2">{row.phone || '-'}</td>
                              <td className="px-3 py-2 text-yellow-600 dark:text-yellow-400">
                                {row.reason || 'Duplicate entry'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SAM Warnings */}
              {importResult.samAssignmentErrors?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      SAM Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-60 rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Row</th>
                            <th className="px-3 py-2 text-left font-medium">SAM Name</th>
                            <th className="px-3 py-2 text-left font-medium">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importResult.samAssignmentErrors.map((row, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium">{row.row || idx + 1}</td>
                              <td className="px-3 py-2">{row.samName || '-'}</td>
                              <td className="px-3 py-2 text-orange-600 dark:text-orange-400">
                                {row.reason || 'SAM executive not found'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reset after results */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Import Another File
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Single Entry */}
      {activeTab === 'single' && (
        <form onSubmit={handleSingleSubmit} className="space-y-6">
          {/* Section 1: Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    placeholder="Phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => handleFormChange('companyName', e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arcAmount">ARC Amount</Label>
                  <Input
                    id="arcAmount"
                    type="number"
                    value={form.arcAmount}
                    onChange={(e) => handleFormChange('arcAmount', e.target.value)}
                    placeholder="Annual recurring charge"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otcAmount">OTC Amount</Label>
                  <Input
                    id="otcAmount"
                    type="number"
                    value={form.otcAmount}
                    onChange={(e) => handleFormChange('otcAmount', e.target.value)}
                    placeholder="One-time charge"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={form.gstNumber}
                    onChange={(e) => handleFormChange('gstNumber', e.target.value)}
                    placeholder="GST number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={form.legalName}
                    onChange={(e) => handleFormChange('legalName', e.target.value)}
                    placeholder="Legal name as per GST"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={form.panNumber}
                    onChange={(e) => handleFormChange('panNumber', e.target.value)}
                    placeholder="PAN number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanNumber">TAN Number</Label>
                  <Input
                    id="tanNumber"
                    value={form.tanNumber}
                    onChange={(e) => handleFormChange('tanNumber', e.target.value)}
                    placeholder="TAN number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Address Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Address Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="installationAddress">Installation Address</Label>
                <Textarea
                  id="installationAddress"
                  value={form.installationAddress}
                  onChange={(e) => handleFormChange('installationAddress', e.target.value)}
                  placeholder="Full installation address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installationPincode">Installation Pincode</Label>
                  <Input
                    id="installationPincode"
                    value={form.installationPincode}
                    onChange={(e) => handleFormChange('installationPincode', e.target.value)}
                    placeholder="Pincode"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea
                  id="billingAddress"
                  value={form.billingAddress}
                  onChange={(e) => handleFormChange('billingAddress', e.target.value)}
                  placeholder="Full billing address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingPincode">Billing Pincode</Label>
                  <Input
                    id="billingPincode"
                    value={form.billingPincode}
                    onChange={(e) => handleFormChange('billingPincode', e.target.value)}
                    placeholder="Pincode"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: PO & Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                PO & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    value={form.poNumber}
                    onChange={(e) => handleFormChange('poNumber', e.target.value)}
                    placeholder="Purchase order number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poExpiryDate">PO Expiry Date</Label>
                  <Input
                    id="poExpiryDate"
                    type="date"
                    value={form.poExpiryDate}
                    onChange={(e) => handleFormChange('poExpiryDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billDate">Bill Date</Label>
                  <Input
                    id="billDate"
                    type="date"
                    value={form.billDate}
                    onChange={(e) => handleFormChange('billDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select
                    value={form.billingCycle}
                    onValueChange={(val) => handleFormChange('billingCycle', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Contact Persons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5" />
                Contact Persons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="techInchargeMobile">Tech Incharge Mobile</Label>
                  <Input
                    id="techInchargeMobile"
                    value={form.techInchargeMobile}
                    onChange={(e) => handleFormChange('techInchargeMobile', e.target.value)}
                    placeholder="Tech incharge phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="techInchargeEmail">Tech Incharge Email</Label>
                  <Input
                    id="techInchargeEmail"
                    type="email"
                    value={form.techInchargeEmail}
                    onChange={(e) => handleFormChange('techInchargeEmail', e.target.value)}
                    placeholder="Tech incharge email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountsInchargeMobile">Accounts Incharge Mobile</Label>
                  <Input
                    id="accountsInchargeMobile"
                    value={form.accountsInchargeMobile}
                    onChange={(e) => handleFormChange('accountsInchargeMobile', e.target.value)}
                    placeholder="Accounts incharge phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountsInchargeEmail">Accounts Incharge Email</Label>
                  <Input
                    id="accountsInchargeEmail"
                    type="email"
                    value={form.accountsInchargeEmail}
                    onChange={(e) => handleFormChange('accountsInchargeEmail', e.target.value)}
                    placeholder="Accounts incharge email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bdmName">BDM Name</Label>
                  <Input
                    id="bdmName"
                    value={form.bdmName}
                    onChange={(e) => handleFormChange('bdmName', e.target.value)}
                    placeholder="BDM name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceManager">Service Manager</Label>
                  <Input
                    id="serviceManager"
                    value={form.serviceManager}
                    onChange={(e) => handleFormChange('serviceManager', e.target.value)}
                    placeholder="Service manager name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Network & SAM */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="h-5 w-5" />
                Network & SAM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfIPs">Number of IPs</Label>
                  <Input
                    id="numberOfIPs"
                    type="number"
                    value={form.numberOfIPs}
                    onChange={(e) => handleFormChange('numberOfIPs', e.target.value)}
                    placeholder="Number of IPs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipAddresses">IP Addresses</Label>
                  <Textarea
                    id="ipAddresses"
                    value={form.ipAddresses}
                    onChange={(e) => handleFormChange('ipAddresses', e.target.value)}
                    placeholder="Comma separated: 103.45.67.1, 103.45.67.2"
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    placeholder="Customer username from old software"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bandwidth">Bandwidth (Mbps)</Label>
                  <Input
                    id="bandwidth"
                    type="number"
                    value={form.bandwidth}
                    onChange={(e) => handleFormChange('bandwidth', e.target.value)}
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="samExecutiveName">SAM Executive Name</Label>
                  <Input
                    id="samExecutiveName"
                    value={form.samExecutiveName}
                    onChange={(e) => handleFormChange('samExecutiveName', e.target.value)}
                    placeholder="SAM executive name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(INITIAL_FORM)}
            >
              Reset
            </Button>
            <Button type="submit" disabled={importLoading}>
              {importLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Customer...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Customer
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}