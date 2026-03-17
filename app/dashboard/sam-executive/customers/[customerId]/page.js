'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  Wifi,
  Calendar,
  CalendarCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  X,
  Loader2,
  Globe,
  Server,
  TrendingUp,
  Eye,
  MapPin,
  Clock,
  IndianRupee,
  CircleDot,
  Send,
  ExternalLink,
} from 'lucide-react';
import TabBar from '@/components/TabBar';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const customerId = params.customerId;

  const [customer, setCustomer] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit service details
  const [isEditingService, setIsEditingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceType: '',
    ipDetails: '',
    cpeDetails: '',
    contractStartDate: '',
    contractDurationMonths: '',
    escalationMatrix: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch customer details
  const fetchCustomerDetails = useCallback(async () => {
    try {
      const response = await api.get(`/sam/customers/${customerId}`);
      setCustomer(response.data.customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer details');
    }
  }, [customerId]);

  // Fetch service details
  const fetchServiceDetails = useCallback(async () => {
    try {
      const response = await api.get(`/sam/customers/${customerId}/service-details`);
      const details = response.data.customer;
      setServiceDetails(details);
      if (details) {
        setServiceForm({
          serviceType: details.serviceType || '',
          ipDetails: details.ipDetails || '',
          cpeDetails: details.cpeDetails || '',
          contractStartDate: details.contractStartDate
            ? new Date(details.contractStartDate).toISOString().split('T')[0]
            : '',
          contractDurationMonths: details.contractDurationMonths || '',
          escalationMatrix: details.escalationMatrix
            ? (typeof details.escalationMatrix === 'string'
              ? details.escalationMatrix
              : JSON.stringify(details.escalationMatrix, null, 2))
            : ''
        });
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
    }
  }, [customerId]);

  // Fetch payment summary
  const fetchPaymentSummary = useCallback(async () => {
    try {
      const response = await api.get(`/sam/customers/${customerId}/payment-summary`);
      setPaymentSummary(response.data);
    } catch (error) {
      console.error('Error fetching payment summary:', error);
    }
  }, [customerId]);

  useEffect(() => {
    if (user && customerId) {
      setIsLoading(true);
      Promise.all([
        fetchCustomerDetails(),
        fetchServiceDetails(),
        fetchPaymentSummary()
      ]).finally(() => setIsLoading(false));
    }
  }, [user, customerId, fetchCustomerDetails, fetchServiceDetails, fetchPaymentSummary]);

  // Save service details
  const handleSaveServiceDetails = async () => {
    setIsSaving(true);
    try {
      const payload = {
        serviceType: serviceForm.serviceType || undefined,
        ipDetails: serviceForm.ipDetails || undefined,
        cpeDetails: serviceForm.cpeDetails || undefined,
        contractStartDate: serviceForm.contractStartDate || undefined,
        contractDurationMonths: serviceForm.contractDurationMonths
          ? parseInt(serviceForm.contractDurationMonths)
          : undefined,
        escalationMatrix: undefined
      };

      if (serviceForm.escalationMatrix) {
        try {
          payload.escalationMatrix = JSON.parse(serviceForm.escalationMatrix);
        } catch {
          payload.escalationMatrix = serviceForm.escalationMatrix;
        }
      }

      await api.put(`/sam/customers/${customerId}/service-details`, payload);
      toast.success('Service details updated successfully');
      setIsEditingService(false);
      fetchServiceDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update service details');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Customer not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/dashboard/sam-executive/customers')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  const companyName = customer.campaignData?.company || customer.customerUsername || 'Unknown';
  const contactName = customer.campaignData?.name || '-';
  const meetings = customer.samMeetings || [];
  const invoices = customer.invoices || [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'service', label: 'Service Details', icon: Wifi },
    { id: 'meetings', label: 'Meetings', icon: CalendarCheck, count: meetings.length },
    { id: 'payments', label: 'Payments', icon: CreditCard }
  ];

  // Helper for info items
  const InfoItem = ({ icon: Icon, label, value, iconBg = 'bg-slate-100 dark:bg-slate-800', iconColor = 'text-slate-500', className = '' }) => (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/sam-executive/customers')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* ─── Header Card ─── */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {/* Top gradient accent */}
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-600 to-indigo-600" />

          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/20 flex-shrink-0">
                {companyName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>

              {/* Name + username + contact */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{companyName}</h1>
                  {customer.actualPlanIsActive && (
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">@{customer.customerUsername}</p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {customer.campaignData?.email && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                      {customer.campaignData.email}
                    </span>
                  )}
                  {customer.campaignData?.phone && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.campaignData.phone}
                    </span>
                  )}
                  {contactName !== '-' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="h-3.5 w-3.5" />
                      {contactName}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick metrics */}
              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{meetings.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Meetings</p>
                </div>
                <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{invoices.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Invoices</p>
                </div>
                {customer.actualPlanPrice > 0 && (
                  <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(customer.actualPlanPrice)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">MRC</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ─── */}
      <TabBar
        tabs={tabs.map((tab) => ({
          key: tab.id,
          label: tab.label,
          icon: tab.icon,
          count: tab.count,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customer.campaignData?.company && (
                  <InfoItem icon={Building2} label="Company" value={customer.campaignData.company}
                    iconBg="bg-orange-50 dark:bg-orange-900/20" iconColor="text-orange-500" />
                )}
                {customer.campaignData?.name && (
                  <InfoItem icon={CircleDot} label="Contact Person" value={customer.campaignData.name}
                    iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-500" />
                )}
                {customer.campaignData?.email && (
                  <InfoItem icon={Mail} label="Email" value={customer.campaignData.email}
                    iconBg="bg-indigo-50 dark:bg-indigo-900/20" iconColor="text-indigo-500" />
                )}
                {customer.campaignData?.phone && (
                  <InfoItem icon={Phone} label="Phone" value={customer.campaignData.phone}
                    iconBg="bg-cyan-50 dark:bg-cyan-900/20" iconColor="text-cyan-500" />
                )}
                {customer.installationAddress && (
                  <InfoItem icon={MapPin} label="Installation Address" value={customer.installationAddress}
                    iconBg="bg-rose-50 dark:bg-rose-900/20" iconColor="text-rose-500" className="sm:col-span-2" />
                )}
                {(customer.campaignData?.city || customer.campaignData?.circle) && (
                  <InfoItem icon={Globe} label="City / Circle"
                    value={[customer.campaignData?.city, customer.campaignData?.circle].filter(Boolean).join(', ')}
                    iconBg="bg-teal-50 dark:bg-teal-900/20" iconColor="text-teal-500" />
                )}
                {customer.activationDate && (
                  <InfoItem icon={Calendar} label="Activation Date" value={formatDate(customer.activationDate)}
                    iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-500" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan & Revenue */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Plan & Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customer.actualPlanName && (
                  <InfoItem icon={Wifi} label="Current Plan" value={customer.actualPlanName}
                    iconBg="bg-green-50 dark:bg-green-900/20" iconColor="text-green-500" />
                )}
                {customer.actualPlanPrice > 0 && (
                  <InfoItem icon={IndianRupee} label="Monthly Revenue" value={formatCurrency(customer.actualPlanPrice)}
                    iconBg="bg-emerald-50 dark:bg-emerald-900/20" iconColor="text-emerald-500" />
                )}
                {customer.customerUsername && (
                  <InfoItem icon={Server} label="Username" value={customer.customerUsername}
                    iconBg="bg-orange-50 dark:bg-orange-900/20" iconColor="text-orange-500" />
                )}
                {customer.circuitId && (
                  <InfoItem icon={Server} label="Circuit ID" value={customer.circuitId}
                    iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-500" />
                )}
                {customer.customerIpAssigned && (
                  <InfoItem icon={Globe} label="IP Address" value={customer.customerIpAssigned}
                    iconBg="bg-indigo-50 dark:bg-indigo-900/20" iconColor="text-indigo-500" />
                )}
                {serviceDetails?.serviceType && (
                  <InfoItem icon={Wifi} label="Service Type" value={serviceDetails.serviceType}
                    iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-500" />
                )}
              </div>

              {/* Payment summary mini-strip */}
              {paymentSummary && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Billed</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(paymentSummary.totalBilled || 0)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Paid</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paymentSummary.totalPaid || 0)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Outstanding</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(paymentSummary.totalOutstanding || 0)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Service Details Tab ─── */}
      {activeTab === 'service' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Wifi className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Service Details
            </CardTitle>
            {!isEditingService && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingService(true)}
                className="text-orange-600 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {isEditingService ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service Type</Label>
                    <select
                      value={serviceForm.serviceType}
                      onChange={(e) => setServiceForm(f => ({ ...f, serviceType: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 text-sm"
                    >
                      <option value="">Select Type</option>
                      <option value="ILL">ILL (Internet Leased Line)</option>
                      <option value="P2P">P2P (Point to Point)</option>
                      <option value="MPLS">MPLS</option>
                      <option value="BROADBAND">Broadband</option>
                      <option value="FIBER">Fiber</option>
                      <option value="WIRELESS">Wireless</option>
                    </select>
                  </div>
                  <div>
                    <Label>IP Details</Label>
                    <Input
                      value={serviceForm.ipDetails}
                      onChange={(e) => setServiceForm(f => ({ ...f, ipDetails: e.target.value }))}
                      placeholder="e.g., 203.0.113.0/24, Gateway: 203.0.113.1"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>CPE Details</Label>
                    <Input
                      value={serviceForm.cpeDetails}
                      onChange={(e) => setServiceForm(f => ({ ...f, cpeDetails: e.target.value }))}
                      placeholder="Customer Premise Equipment details (model, serial, config)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contract Start Date</Label>
                    <Input
                      type="date"
                      value={serviceForm.contractStartDate}
                      onChange={(e) => setServiceForm(f => ({ ...f, contractStartDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contract Duration (months)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={serviceForm.contractDurationMonths}
                      onChange={(e) => setServiceForm(f => ({ ...f, contractDurationMonths: e.target.value }))}
                      placeholder="e.g., 12"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Escalation Matrix</Label>
                    <Textarea
                      value={serviceForm.escalationMatrix}
                      onChange={(e) => setServiceForm(f => ({ ...f, escalationMatrix: e.target.value }))}
                      placeholder={'JSON format, e.g.:\n[\n  { "level": 1, "name": "John Doe", "role": "NOC Engineer", "phone": "9876543210" },\n  { "level": 2, "name": "Jane Smith", "role": "Network Manager", "phone": "9876543211" }\n]'}
                      rows={5}
                      className="mt-1 font-mono text-xs"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter escalation contacts as JSON array with level, name, role, and phone fields.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    onClick={handleSaveServiceDetails}
                    disabled={isSaving}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingService(false);
                      if (serviceDetails) {
                        setServiceForm({
                          serviceType: serviceDetails.serviceType || '',
                          ipDetails: serviceDetails.ipDetails || '',
                          cpeDetails: serviceDetails.cpeDetails || '',
                          contractStartDate: serviceDetails.contractStartDate
                            ? new Date(serviceDetails.contractStartDate).toISOString().split('T')[0]
                            : '',
                          contractDurationMonths: serviceDetails.contractDurationMonths || '',
                          escalationMatrix: serviceDetails.escalationMatrix
                            ? (typeof serviceDetails.escalationMatrix === 'string'
                              ? serviceDetails.escalationMatrix
                              : JSON.stringify(serviceDetails.escalationMatrix, null, 2))
                            : ''
                        });
                      }
                    }}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customer.circuitId && (
                    <InfoItem icon={Server} label="Circuit ID" value={customer.circuitId}
                      iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-500" />
                  )}
                  {customer.customerUsername && (
                    <InfoItem icon={Server} label="Username" value={customer.customerUsername}
                      iconBg="bg-orange-50 dark:bg-orange-900/20" iconColor="text-orange-500" />
                  )}
                  {customer.customerIpAssigned && (
                    <InfoItem icon={Globe} label="IP Address" value={customer.customerIpAssigned}
                      iconBg="bg-indigo-50 dark:bg-indigo-900/20" iconColor="text-indigo-500" />
                  )}
                  {customer.actualPlanName && (
                    <InfoItem icon={TrendingUp} label="Bandwidth / Plan" value={customer.actualPlanName}
                      iconBg="bg-green-50 dark:bg-green-900/20" iconColor="text-green-500" />
                  )}
                  {customer.actualPlanPrice > 0 && (
                    <InfoItem icon={CreditCard} label="ARC (Monthly)" value={formatCurrency(customer.actualPlanPrice)}
                      iconBg="bg-emerald-50 dark:bg-emerald-900/20" iconColor="text-emerald-500" />
                  )}
                  {serviceDetails?.serviceType && (
                    <InfoItem icon={Wifi} label="Service Type" value={serviceDetails.serviceType}
                      iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-500" />
                  )}
                  {serviceDetails?.cpeDetails && (
                    <InfoItem icon={Server} label="CPE Details" value={serviceDetails.cpeDetails}
                      iconBg="bg-slate-50 dark:bg-slate-700" iconColor="text-slate-500" />
                  )}
                  {serviceDetails?.ipDetails && (
                    <InfoItem icon={Globe} label="IP Details" value={serviceDetails.ipDetails}
                      iconBg="bg-cyan-50 dark:bg-cyan-900/20" iconColor="text-cyan-500" />
                  )}
                </div>

                {/* Contract Section */}
                {(serviceDetails?.contractStartDate || serviceDetails?.contractEndDate) && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-3">Contract</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {serviceDetails?.contractStartDate && (
                        <InfoItem icon={Calendar} label="Contract Start" value={formatDate(serviceDetails.contractStartDate)}
                          iconBg="bg-rose-50 dark:bg-rose-900/20" iconColor="text-rose-500" />
                      )}
                      {serviceDetails?.contractEndDate && (
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            serviceDetails.contractStatus === 'EXPIRED'
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : serviceDetails.contractStatus === 'EXPIRING_SOON'
                              ? 'bg-amber-50 dark:bg-amber-900/20'
                              : 'bg-green-50 dark:bg-green-900/20'
                          }`}>
                            <Calendar className={`h-4 w-4 ${
                              serviceDetails.contractStatus === 'EXPIRED'
                                ? 'text-red-500'
                                : serviceDetails.contractStatus === 'EXPIRING_SOON'
                                ? 'text-amber-500'
                                : 'text-green-500'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Contract End
                              {serviceDetails.contractDurationMonths && (
                                <span className="ml-1 text-slate-400">({serviceDetails.contractDurationMonths}m)</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {formatDate(serviceDetails.contractEndDate)}
                              </p>
                              {serviceDetails.contractStatus && (
                                <Badge className={`text-[10px] px-1.5 py-0 ${
                                  serviceDetails.contractStatus === 'EXPIRED'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : serviceDetails.contractStatus === 'EXPIRING_SOON'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                  {serviceDetails.contractStatus === 'EXPIRED' ? 'Expired' :
                                   serviceDetails.contractStatus === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Active'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Escalation Matrix */}
                {serviceDetails?.escalationMatrix && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-3">Escalation Matrix</p>
                    {Array.isArray(serviceDetails.escalationMatrix) ? (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Level</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {serviceDetails.escalationMatrix.map((entry, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100 font-medium">{entry.level || idx + 1}</td>
                                <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">{entry.name || '-'}</td>
                                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{entry.role || '-'}</td>
                                <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">{entry.phone || entry.email || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        {typeof serviceDetails.escalationMatrix === 'string'
                          ? serviceDetails.escalationMatrix
                          : JSON.stringify(serviceDetails.escalationMatrix, null, 2)}
                      </p>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!customer.circuitId && !customer.customerUsername && !customer.customerIpAssigned && !customer.actualPlanName && !serviceDetails?.serviceType && !serviceDetails?.contractStartDate && (
                  <div className="text-center py-12 text-slate-500">
                    <Wifi className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">No service details available</p>
                    <p className="text-sm text-slate-400 mt-1">Click Edit to add service information</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Meetings Tab ─── */}
      {activeTab === 'meetings' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <CalendarCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Meeting History
              <span className="text-sm font-normal text-slate-400">({meetings.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {meetings.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-medium">No meetings recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-orange-200 dark:hover:border-orange-900 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          meeting.status === 'COMPLETED'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <CalendarCheck className={`h-4 w-4 ${
                            meeting.status === 'COMPLETED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{meeting.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(meeting.meetingDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-xs ${
                          meeting.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : meeting.status === 'SCHEDULED'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {meeting.status}
                        </Badge>
                        {meeting.momEmailSentAt ? (
                          <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                            <Mail className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="mt-3 ml-11 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        onClick={() => router.push(`/dashboard/sam-executive/meetings/${meeting.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1.5" />
                        View MOM
                      </Button>
                      {!meeting.momEmailSentAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          onClick={() => router.push(`/dashboard/sam-executive/meetings/${meeting.id}?sendEmail=true`)}
                        >
                          <Send className="h-3 w-3 mr-1.5" />
                          Send Email
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Payments Tab ─── */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Outstanding Aging */}
          {(paymentSummary?.totalOutstanding > 0) ? (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  Outstanding Aging
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Current', key: 'current', color: 'blue' },
                    { label: '1-30 Days', key: '1-30', color: 'green' },
                    { label: '31-60 Days', key: '31-60', color: 'amber' },
                    { label: '61-90 Days', key: '61-90', color: 'orange' },
                    { label: '90+ Days', key: '90+', color: 'red' },
                  ].map(({ label, key, color }) => (
                    <div key={key} className={`text-center p-3 rounded-lg bg-${color}-50 dark:bg-${color}-900/10 border border-${color}-100 dark:border-${color}-900/20`}>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                      <p className={`text-sm font-bold text-${color}-600 dark:text-${color}-400`}>
                        {formatCurrency(paymentSummary?.agingBuckets?.[key] || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/20">
              <CardContent className="py-6 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">No Outstanding Balance</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">All invoices are paid</p>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Billed', value: paymentSummary?.totalBilled || 0, color: 'text-slate-900 dark:text-slate-100' },
                  { label: 'Total Paid', value: paymentSummary?.totalPaid || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Outstanding', value: paymentSummary?.totalOutstanding || 0, color: 'text-red-600 dark:text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
                  </div>
                ))}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Invoices</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{paymentSummary?.totalInvoices || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-medium">No invoices found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 10).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          invoice.status === 'PAID'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : invoice.status === 'OVERDUE'
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : 'bg-amber-50 dark:bg-amber-900/20'
                        }`}>
                          <FileText className={`h-4 w-4 ${
                            invoice.status === 'PAID'
                              ? 'text-emerald-500'
                              : invoice.status === 'OVERDUE'
                              ? 'text-red-500'
                              : 'text-amber-500'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(invoice.invoiceDate)}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(invoice.grandTotal)}
                        </p>
                        <Badge className={`text-xs ${
                          invoice.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : invoice.status === 'GENERATED' || invoice.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
