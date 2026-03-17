'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoleCheck } from '@/lib/useRoleCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Wifi,
  Building2,
  Loader2,
  X,
  Filter,
  BarChart3,
  Wrench,
  Activity,
  CircleCheck,
  User,
  FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import StatCard from '@/components/StatCard';
import { useSocketRefresh } from '@/lib/useSocketRefresh';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';

// Status config
const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  MATERIAL_REQUESTED: { label: 'Material Requested', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  MATERIAL_RECEIVED: { label: 'Material Received', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' },
  PUSHED_TO_NOC: { label: 'Pushed to NOC', color: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-400' },
  ACTIVATION_READY: { label: 'NOC Complete', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  INSTALLING: { label: 'Installing', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  DEMO_PLAN_PENDING: { label: 'Demo Plan', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  SPEED_TEST: { label: 'Speed Test', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', dot: 'bg-cyan-400' },
  CUSTOMER_ACCEPTANCE: { label: 'Customer Acceptance', color: 'bg-teal-100 text-teal-700 border-teal-200', dot: 'bg-teal-400' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-400' }
};

export default function DeliveryReportPage() {
  const { isDeliveryTeam, isAdmin, isSuperAdmin } = useRoleCheck();
  const hasAccess = isDeliveryTeam || isAdmin || isSuperAdmin;
  const searchParams = useSearchParams();
  const deliveryUserId = searchParams.get('userId');

  const [report, setReport] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, installing: 0, inProgress: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewingUserName, setViewingUserName] = useState('');

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (searchTerm) params.append('search', searchTerm);
      if (deliveryUserId) params.append('deliveryUserId', deliveryUserId);
      const res = await api.get(`/leads/delivery-team/report?${params.toString()}`);
      setReport(res.data.report || []);
      setStats(res.data.stats || {});
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch the delivery user's name when viewing by userId
  useEffect(() => {
    if (deliveryUserId && (isAdmin || isSuperAdmin)) {
      api.get('/users/by-role?role=DELIVERY_TEAM').then(res => {
        const found = (res.data.users || []).find(u => u.id === deliveryUserId);
        if (found) setViewingUserName(found.name);
      }).catch(() => {});
    }
  }, [deliveryUserId, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (hasAccess) fetchReport();
  }, [hasAccess, deliveryUserId]);

  // Auto-refresh when socket events arrive
  useSocketRefresh(fetchReport, { enabled: hasAccess });

  const handleApplyFilters = () => fetchReport();

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setStatusFilter('ALL');
    setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (deliveryUserId) params.append('deliveryUserId', deliveryUserId);
      api.get(`/leads/delivery-team/report?${params.toString()}`).then(res => {
        setReport(res.data.report || []);
        setStats(res.data.stats || {});
      }).catch(() => toast.error('Failed to fetch report'))
        .finally(() => setIsLoading(false));
    }, 0);
  };

  // Status groups matching backend logic
  const STATUS_GROUPS = {
    PRE_INSTALL: ['PENDING', 'MATERIAL_REQUESTED', 'MATERIAL_RECEIVED', 'PUSHED_TO_NOC', 'ACTIVATION_READY'],
    INSTALLING: ['INSTALLING'],
    POST_INSTALL: ['DEMO_PLAN_PENDING', 'SPEED_TEST', 'CUSTOMER_ACCEPTANCE'],
    COMPLETED: ['COMPLETED'],
  };

  // Client-side status filter
  const filteredReport = statusFilter === 'ALL'
    ? report
    : STATUS_GROUPS[statusFilter]
      ? report.filter(r => STATUS_GROUPS[statusFilter].includes(r.status))
      : report.filter(r => r.status === statusFilter);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Access denied</p>
      </div>
    );
  }

  const STAT_CARDS = [
    { key: 'total', label: 'Total', value: stats.total, filter: 'ALL', icon: BarChart3, color: 'slate' },
    { key: 'pending', label: 'Pre-Install', value: stats.pending, filter: 'PRE_INSTALL', icon: Clock, color: 'amber' },
    { key: 'installing', label: 'Installing', value: stats.installing, filter: 'INSTALLING', icon: Wrench, color: 'orange' },
    { key: 'inProgress', label: 'Post-Install', value: stats.inProgress, filter: 'POST_INSTALL', icon: Activity, color: 'blue' },
    { key: 'completed', label: 'Completed', value: stats.completed, filter: 'COMPLETED', icon: CircleCheck, color: 'emerald' },
  ];

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Viewing-as banner */}
      {deliveryUserId && viewingUserName && (
        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
          <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-200 truncate">
              Viewing report for <span className="font-bold">{viewingUserName}</span>
            </p>
          </div>
          <a
            href="/dashboard/admin-dashboards"
            className="text-xs text-orange-600 hover:text-orange-700 font-medium underline flex-shrink-0"
          >
            Back
          </a>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
              Delivery Report{viewingUserName ? ` - ${viewingUserName}` : ''}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 ml-[18px]">Track installation progress, materials, and timelines</p>
        </div>
        <div className="text-xs text-slate-400">
          {!isLoading && `${report.length} total deliveries`}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {STAT_CARDS.map(card => (
          <StatCard
            key={card.key}
            color={card.color}
            icon={card.icon}
            label={card.label}
            value={card.value}
            onClick={() => setStatusFilter(card.filter)}
            selected={statusFilter === card.filter}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          {/* Search */}
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search company, name, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                className="pl-10 h-9"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-[140px] h-9 text-xs"
            />
            <span className="text-xs text-slate-400 flex-shrink-0">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-[140px] h-9 text-xs"
            />
          </div>

          {/* Status Filter + Buttons */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs flex-1 sm:flex-none"
            >
              <option value="ALL">All Stages</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            <Button onClick={handleApplyFilters} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-3">
              <Search className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Search</span>
            </Button>
            {(fromDate || toDate || searchTerm || statusFilter !== 'ALL') && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9 px-2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : filteredReport.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No deliveries found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredReport.map((lead, index) => {
              const isExpanded = expandedRow === lead.id;
              const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.PENDING;

              return (
                <div key={lead.id}>
                  <button
                    onClick={() => setExpandedRow(isExpanded ? null : lead.id)}
                    className={`w-full text-left p-3 sm:p-4 transition-colors ${
                      isExpanded ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{lead.company}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{lead.contactName} {lead.phone && `| ${lead.phone}`}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                          {statusCfg.label}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5 text-orange-600" />
                          : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        }
                      </div>
                    </div>
                    {lead.address && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{lead.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-400">{formatDate(lead.pushedAt)}</span>
                      {lead.installDurationHrs != null && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          lead.installDurationHrs < 24
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : lead.installDurationHrs < 72
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          <Clock className="h-2.5 w-2.5" />
                          {lead.installDurationHrs < 24
                            ? `${lead.installDurationHrs}h`
                            : `${Math.round(lead.installDurationHrs / 24 * 10) / 10}d`
                          }
                        </span>
                      )}
                      {lead.totalMaterialItems > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          {lead.materialsVerified ? (
                            <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
                          ) : (
                            <Package className="h-2.5 w-2.5 text-slate-400" />
                          )}
                          {lead.verifiedItems}/{lead.totalMaterialItems}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {/* Service Details */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="h-3 w-3" /> Service Details
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Bandwidth</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                                <Wifi className="h-3 w-3 text-blue-500" /> {lead.bandwidth || '-'} Mbps
                              </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">IPs</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{lead.ips || '-'}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">ARC / Month</p>
                              <p className="text-sm font-semibold text-emerald-600 mt-0.5">{formatCurrency(lead.arc)}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">OTC</p>
                              <p className="text-sm font-semibold text-blue-600 mt-0.5">{formatCurrency(lead.otc)}</p>
                            </div>
                          </div>
                          {lead.assignedTo && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                              <User className="h-3.5 w-3.5 text-orange-500" />
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Assigned To</p>
                                <p className="text-xs font-medium text-slate-900 dark:text-white">{lead.assignedTo}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Timeline */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Timeline
                          </h4>
                          <div className="relative">
                            {[
                              { label: 'Pushed to Installation', date: lead.pushedAt, icon: Truck },
                              { label: 'NOC Configured', date: lead.nocConfigured, icon: Activity },
                              { label: 'Installation Started', date: lead.installStarted, icon: Wrench },
                              { label: 'Installation Completed', date: lead.installCompleted, icon: CheckCircle },
                              { label: 'Speed Test Uploaded', date: lead.speedTestUploaded, icon: Wifi },
                              { label: 'Customer Acceptance', date: lead.customerAccepted, icon: CircleCheck },
                            ].map((step, i, arr) => {
                              const isLast = i === arr.length - 1;
                              return (
                                <div key={i} className="flex gap-3 pb-2 last:pb-0">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      step.date ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'
                                    }`}>
                                      <step.icon className={`h-2.5 w-2.5 ${step.date ? 'text-white' : 'text-slate-400'}`} />
                                    </div>
                                    {!isLast && (
                                      <div className={`w-0.5 flex-1 min-h-[8px] ${
                                        step.date ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-600'
                                      }`} />
                                    )}
                                  </div>
                                  <div className="pb-0.5 -mt-0.5">
                                    <p className={`text-xs font-medium ${step.date ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                                      {step.label}
                                    </p>
                                    <p className={`text-[10px] ${step.date ? 'text-slate-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                      {step.date ? formatDateTime(step.date) : 'Pending'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Materials */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="h-3 w-3" /> Materials
                            {lead.deliveryRequestNumber && (
                              <span className="text-orange-500 normal-case font-normal">({lead.deliveryRequestNumber})</span>
                            )}
                          </h4>
                          {lead.materials.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No materials assigned</p>
                          ) : (
                            <div className="space-y-1.5">
                              {lead.materials.map((mat, idx) => (
                                <div
                                  key={idx}
                                  className={`rounded-lg border p-2 text-xs ${
                                    mat.verified
                                      ? 'bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {mat.verified ? (
                                        <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                      ) : (
                                        <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">{mat.product}</p>
                                        <p className="text-[10px] text-slate-400">{mat.category}</p>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {mat.usedQty != null ? (
                                        <span className="font-semibold text-emerald-600">{mat.usedQty} {mat.unit}</span>
                                      ) : (
                                        <span className="text-slate-500">{mat.assignedQty} {mat.unit}</span>
                                      )}
                                    </div>
                                  </div>
                                  {mat.serialNumbers.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {mat.serialNumbers.map((sn, snIdx) => (
                                        <span
                                          key={snIdx}
                                          className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded text-[10px] font-mono text-orange-700 dark:text-orange-300"
                                        >
                                          {sn}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table (manual - supports inline expandable rows) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 divide-x divide-slate-200 dark:divide-slate-700">
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap" style={{ width: '40px' }}>#</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Customer</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Address</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Stage</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Materials</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Pushed On</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Duration</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredReport.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 px-4 text-center text-sm text-slate-500 dark:text-slate-400">No deliveries found</td></tr>
                ) : filteredReport.map((lead, index) => {
                  const isExpanded = expandedRow === lead.id;
                  const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.PENDING;
                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        className={`divide-x divide-slate-200 dark:divide-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isExpanded ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                        onClick={() => setExpandedRow(isExpanded ? null : lead.id)}
                      >
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300"><span className="text-xs text-slate-400 font-medium">{index + 1}</span></td>
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{lead.company}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{lead.contactName} | {lead.phone}</p>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">
                          <p className="text-xs text-slate-600 dark:text-slate-300">{lead.address}</p>
                          {lead.popLocation && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-[10px]">
                              <MapPin className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                              <span className="text-[10px] text-blue-600 dark:text-blue-300 truncate">POP: {lead.popLocation}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">
                          {lead.totalMaterialItems > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {lead.materialsVerified ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" /> : <Package className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
                              <span className={`text-xs ${lead.materialsVerified ? 'text-emerald-600 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{lead.verifiedItems}/{lead.totalMaterialItems}</span>
                            </div>
                          ) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">
                          <p className="text-xs text-slate-600 dark:text-slate-300">{formatDate(lead.pushedAt)}</p>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">
                          {lead.installDurationHrs == null ? <span className="text-xs text-slate-400">-</span> : (() => {
                            let colorClass = 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                            if (lead.installDurationHrs < 24) colorClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                            else if (lead.installDurationHrs < 72) colorClass = 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
                            const d = lead.installDurationHrs < 24 ? `${lead.installDurationHrs}h` : `${Math.round(lead.installDurationHrs / 24 * 10) / 10}d`;
                            return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}><Clock className="h-3 w-3" />{d}</span>;
                          })()}
                        </td>
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setExpandedRow(isExpanded ? null : lead.id)} className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-orange-100 dark:bg-orange-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-orange-600" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr><td colSpan={8} className="p-0">
                          <div className="bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700 px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Col 1: Service Details */}
                              <div className="space-y-3">
                                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="h-3 w-3" /> Service Details
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Bandwidth</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                                      <Wifi className="h-3 w-3 text-blue-500" /> {lead.bandwidth || '-'} Mbps
                                    </p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">IPs</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{lead.ips || '-'}</p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">ARC / Month</p>
                                    <p className="text-sm font-semibold text-emerald-600 mt-0.5">{formatCurrency(lead.arc)}</p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">OTC</p>
                                    <p className="text-sm font-semibold text-blue-600 mt-0.5">{formatCurrency(lead.otc)}</p>
                                  </div>
                                </div>
                                {lead.assignedTo && (
                                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                                    <User className="h-3.5 w-3.5 text-orange-500" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Assigned To</p>
                                      <p className="text-xs font-medium text-slate-900 dark:text-white">{lead.assignedTo}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Col 2: Timeline */}
                              <div className="space-y-3">
                                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" /> Timeline
                                </h4>
                                <div className="relative">
                                  {[
                                    { label: 'Pushed to Installation', date: lead.pushedAt, icon: Truck },
                                    { label: 'NOC Configured', date: lead.nocConfigured, icon: Activity },
                                    { label: 'Installation Started', date: lead.installStarted, icon: Wrench },
                                    { label: 'Installation Completed', date: lead.installCompleted, icon: CheckCircle },
                                    { label: 'Speed Test Uploaded', date: lead.speedTestUploaded, icon: Wifi },
                                    { label: 'Customer Acceptance', date: lead.customerAccepted, icon: CircleCheck },
                                  ].map((step, i, arr) => {
                                    const isLast = i === arr.length - 1;
                                    return (
                                      <div key={i} className="flex gap-3 pb-3 last:pb-0">
                                        <div className="flex flex-col items-center">
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            step.date ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'
                                          }`}>
                                            <step.icon className={`h-3 w-3 ${step.date ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                                          </div>
                                          {!isLast && (
                                            <div className={`w-0.5 flex-1 min-h-[12px] ${
                                              step.date ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-600'
                                            }`} />
                                          )}
                                        </div>
                                        <div className="pb-1 -mt-0.5">
                                          <p className={`text-xs font-medium ${step.date ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                                            {step.label}
                                          </p>
                                          <p className={`text-[11px] ${step.date ? 'text-slate-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                            {step.date ? formatDateTime(step.date) : 'Pending'}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Col 3: Materials */}
                              <div className="space-y-3">
                                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Package className="h-3 w-3" /> Materials
                                  {lead.deliveryRequestNumber && (
                                    <span className="text-orange-500 normal-case font-normal">({lead.deliveryRequestNumber})</span>
                                  )}
                                </h4>
                                {lead.materials.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">No materials assigned</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {lead.materials.map((mat, idx) => (
                                      <div
                                        key={idx}
                                        className={`rounded-lg border p-2.5 text-xs ${
                                          mat.verified
                                            ? 'bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            {mat.verified ? (
                                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                            ) : (
                                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                              <p className="font-medium text-slate-900 dark:text-white truncate">{mat.product}</p>
                                              <p className="text-[10px] text-slate-400">{mat.category}</p>
                                            </div>
                                          </div>
                                          <div className="text-right flex-shrink-0">
                                            {mat.usedQty != null ? (
                                              <span className="font-semibold text-emerald-600">{mat.usedQty} {mat.unit}</span>
                                            ) : (
                                              <span className="text-slate-500">{mat.assignedQty} {mat.unit}</span>
                                            )}
                                            {mat.usedQty != null && mat.usedQty !== mat.assignedQty && (
                                              <p className="text-[10px] text-slate-400 line-through">{mat.assignedQty}</p>
                                            )}
                                          </div>
                                        </div>
                                        {mat.serialNumbers.length > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1">
                                            {mat.serialNumbers.map((sn, snIdx) => (
                                              <span
                                                key={snIdx}
                                                className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded text-[10px] font-mono text-orange-700 dark:text-orange-300"
                                              >
                                                {sn}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Result count (mobile only) */}
        {!isLoading && filteredReport.length > 0 && (
          <div className="lg:hidden px-3 sm:px-4 py-2 sm:py-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filteredReport.length} of {report.length} deliveries</span>
            {statusFilter !== 'ALL' && (
              <button onClick={() => setStatusFilter('ALL')} className="text-orange-600 hover:text-orange-700 font-medium">
                Show all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
