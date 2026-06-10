'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLeadStore } from '@/lib/store';
import { useRoleCheck } from '@/lib/useRoleCheck';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  Loader2,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Search,
  Building2,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';

// Delivery-side tab for the Legacy Customer Onboarding flow.
// Accounts add a customer → it lands here as PENDING_DELIVERY. Delivery records
// the delivery date, which returns it to Accounts for billing.
export default function CustomerOnboardingPage() {
  const { user, isDeliveryTeam, isSuperAdmin: isAdmin } = useRoleCheck();
  const { legacyGetDeliveryQueue, legacySetDeliveryDate, legacyLoading } = useLeadStore();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Per-row delivery date keyed by customer id.
  const [dateInputs, setDateInputs] = useState({});

  const fetchQueue = useCallback(async (searchTerm = '') => {
    setLoading(true);
    const result = await legacyGetDeliveryQueue({ limit: 100, search: searchTerm });
    if (result.success) {
      setQueue(result.data?.customers || []);
    } else {
      toast.error(result.error || 'Failed to load queue');
    }
    setLoading(false);
  }, [legacyGetDeliveryQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Access check
  if (user && !isDeliveryTeam && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <ShieldAlert className="h-16 w-16 text-red-500" />
            <h2 className="text-xl font-semibold text-center">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              Only the Delivery Team and Super Admin can access Customer Onboarding.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const setDateInput = (id, value) => {
    setDateInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQueue(search.trim());
  };

  const handleSaveDelivery = async (customer) => {
    const deliveryDate = dateInputs[customer.id];
    if (!deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }
    const result = await legacySetDeliveryDate(customer.id, deliveryDate);
    if (result.success) {
      toast.success(`${customer.customerCode} delivery recorded — returned to accounts for billing`);
      setQueue((prev) => prev.filter((c) => c.id !== customer.id));
      setDateInputs((prev) => {
        const next = { ...prev };
        delete next[customer.id];
        return next;
      });
    } else {
      toast.error(result.error || 'Failed to save delivery date');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Customer Onboarding
        </h1>
        <p className="text-muted-foreground mt-1">
          Record the delivery date for customers added by accounts. They then return to accounts for billing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5" />
              Awaiting Delivery Date ({queue.length})
            </span>
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-56"
                    placeholder="Search name / company / code"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" size="sm">Search</Button>
              </form>
              <Button variant="outline" size="sm" onClick={() => fetchQueue(search.trim())} disabled={loading}>
                <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No customers awaiting a delivery date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((customer) => (
                <div key={customer.id} className="rounded-lg border p-4">
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    {/* Customer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{customer.companyName || customer.name}</span>
                        <Badge variant="outline" className="font-mono text-xs">{customer.customerCode}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{customer.name}</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </span>
                        {customer.installationAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {customer.installationAddress}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Added: {formatDate(customer.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delivery date input */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`delivery-${customer.id}`} className="text-xs">Delivery Date</Label>
                      <Input
                        id={`delivery-${customer.id}`}
                        type="date"
                        className="w-44"
                        value={dateInputs[customer.id] || ''}
                        onChange={(e) => setDateInput(customer.id, e.target.value)}
                      />
                    </div>
                    <Button onClick={() => handleSaveDelivery(customer)} disabled={legacyLoading}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Delivery Date
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
