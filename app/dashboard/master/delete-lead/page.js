'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import {
  AlertTriangle,
  Search,
  Trash2,
  Loader2,
  ShieldAlert,
  FileText,
  History,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MASTER_ROLES = new Set(['MASTER', 'SUPER_ADMIN']);

export default function DeleteLeadPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [alsoDeleteCampaignData, setAlsoDeleteCampaignData] = useState(false);

  const [showFinalModal, setShowFinalModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(null);

  const deleteButtonRef = useRef(null);

  useEffect(() => {
    if (user && !MASTER_ROLES.has(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Auto-tick "also delete campaign data" for self-generated leads
  useEffect(() => {
    if (preview?.lead?.campaignIsSelf) setAlsoDeleteCampaignData(true);
  }, [preview]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get(`/customer-360/search?q=${encodeURIComponent(searchQuery.trim())}&page=1&limit=10`);
      setSearchResults(data?.leads || data?.items || []);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const loadPreview = async (leadId) => {
    setSelectedLeadId(leadId);
    setPreview(null);
    setReason('');
    setConfirmText('');
    setAlsoDeleteCampaignData(false);
    setDeleteSuccess(null);
    setPreviewLoading(true);
    try {
      const { data } = await api.get(`/leads/${leadId}/deletion-preview`);
      setPreview(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load preview');
      setSelectedLeadId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const expectedConfirm = (preview?.lead?.contactName || preview?.lead?.company || '').trim();
  const reasonOk = reason.trim().length >= 10;
  const confirmOk = confirmText.trim() === expectedConfirm && expectedConfirm.length > 0;
  const canProceed = !!preview && reasonOk && confirmOk && !deleting;

  // As soon as the user satisfies both validation gates, scroll the big red
  // button into view so they never have to hunt for it below the fold.
  useEffect(() => {
    if (canProceed && deleteButtonRef.current) {
      deleteButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [canProceed]);

  const handleDelete = async () => {
    if (!canProceed) return;
    setDeleting(true);
    try {
      const { data } = await api.post(`/leads/${selectedLeadId}/delete-entirely`, {
        reason: reason.trim(),
        confirmText: confirmText.trim(),
        alsoDeleteCampaignData,
      });
      setDeleteSuccess(data);
      setShowFinalModal(false);
      toast.success('Lead deleted permanently');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!user || !MASTER_ROLES.has(user.role)) return null;

  if (deleteSuccess) {
    return (
      <div className="p-6 space-y-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                Lead deleted successfully
              </h2>
            </div>
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
              {deleteSuccess.message}
            </p>
            {deleteSuccess.audit && (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <dt className="font-semibold">Audit ID</dt>
                <dd className="font-mono">{deleteSuccess.audit.id}</dd>
                <dt className="font-semibold">Contact</dt>
                <dd>{deleteSuccess.audit.contactName || '—'}</dd>
                <dt className="font-semibold">Company</dt>
                <dd>{deleteSuccess.audit.companyName || '—'}</dd>
                <dt className="font-semibold">Reason</dt>
                <dd className="col-span-1">{deleteSuccess.audit.reason}</dd>
              </dl>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                onClick={() => {
                  setDeleteSuccess(null);
                  setPreview(null);
                  setSelectedLeadId(null);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
              >
                Delete another lead
              </Button>
              <Link href="/dashboard/master/delete-lead/history">
                <Button variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  View deletion history
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Delete Lead Permanently"
        description="Master-only tool. Removes a lead and every linked record across the system. This cannot be undone."
      />

      {/* Danger banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm text-red-800 dark:text-red-200">
            <p className="font-semibold">This action is permanent and irreversible.</p>
            <p className="mt-1 opacity-90">
              All invoices, payments, ledger entries, delivery requests, complaints, SAM records,
              document uploads, and every other trace of this lead will be wiped. There is no undo.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div />
        <Link href="/dashboard/master/delete-lead/history">
          <Button variant="outline" size="sm">
            <History className="mr-2 h-4 w-4" />
            Deletion History
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by company, contact name, phone, lead number, or customer username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <ul className="mt-4 divide-y rounded-lg border">
              {searchResults.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-center justify-between gap-3 p-3 ${selectedLeadId === r.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.company || r.campaignData?.company || '—'}</span>
                      {r.leadNumber && (
                        <Badge variant="outline" className="text-[10px]">{r.leadNumber}</Badge>
                      )}
                      {r.customerUsername && (
                        <Badge variant="secondary" className="text-[10px]">@{r.customerUsername}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.contactName || r.campaignData?.name || '—'} · {r.phone || r.campaignData?.phone || '—'}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => loadPreview(r.id)}>
                    Select <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Preview + confirmation */}
      {previewLoading && (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {preview && !previewLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Preview counts */}
          <Card>
            <CardContent className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                What will be deleted
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <LeadFact label="Contact" value={preview.lead.contactName} />
                <LeadFact label="Company" value={preview.lead.company} />
                <LeadFact label="Phone" value={preview.lead.phone} />
                <LeadFact label="Lead #" value={preview.lead.leadNumber} />
                <LeadFact label="Customer username" value={preview.lead.customerUsername} />
                <LeadFact label="Campaign" value={preview.lead.campaignName} />
              </div>

              <div className="my-4 border-t" />

              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Records that will be removed
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {Object.entries(preview.counts)
                  .filter(([key]) => key !== 'callLogsIfCampaignDeleted' || alsoDeleteCampaignData)
                  .map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{humanize(key)}</span>
                      <span className={`font-mono text-xs ${count > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {count}
                      </span>
                    </div>
                  ))}
              </div>

              {preview.lead.campaignDataId && (
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    checked={alsoDeleteCampaignData}
                    onChange={(e) => setAlsoDeleteCampaignData(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div className="text-sm">
                    <div className="font-medium">Also delete campaign data</div>
                    <p className="text-xs text-muted-foreground">
                      {preview.lead.campaignIsSelf
                        ? 'This lead was self-generated (Create Opportunity) — safe to remove the linked campaign record and its call logs.'
                        : 'This lead came through a real campaign. Only enable this if you want to remove the original campaign contact AND its call logs too.'}
                    </p>
                  </div>
                </label>
              )}
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card>
            <CardContent className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
                Confirm deletion
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason (required, min 10 characters)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you deleting this lead? This reason is permanent and auditable."
                    className="mt-1 min-h-[80px]"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reason.trim().length} / 10 chars minimum
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type the contact name <span className="text-red-600">exactly</span> to confirm
                  </label>
                  <div className="mt-1 rounded-md border-2 border-dashed border-red-300 bg-red-50 px-3 py-2 text-sm font-mono dark:border-red-900/50 dark:bg-red-950/30">
                    {expectedConfirm || '(no name on record — cannot delete)'}
                  </div>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type the name above, exactly"
                    className={`mt-2 font-mono ${confirmOk ? 'border-emerald-500' : confirmText ? 'border-red-500' : ''}`}
                    disabled={!expectedConfirm}
                  />
                </div>

                {canProceed && (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                    ✓ Both checks passed. Click the red button below to open the final confirmation.
                  </div>
                )}

                <Button
                  ref={deleteButtonRef}
                  size="lg"
                  className={`w-full bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white/80 transition-all ${
                    canProceed ? 'shadow-lg shadow-red-500/40 ring-4 ring-red-500/20' : ''
                  }`}
                  disabled={!canProceed}
                  onClick={() => setShowFinalModal(true)}
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete lead permanently
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Final confirmation modal */}
      <Dialog open={showFinalModal} onOpenChange={(o) => !deleting && setShowFinalModal(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
              <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-center">
              This cannot be undone
            </DialogTitle>
            <DialogDescription className="text-center">
              You are about to permanently delete every trace of{' '}
              <strong className="text-foreground">{expectedConfirm}</strong> from the system. There
              is no undo, no restore, no backup recovery for this action.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            A permanent audit record will be written with your user, timestamp, and reason.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setShowFinalModal(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white/80"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete forever'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadFact({ label, value }) {
  return (
    <div className="text-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value || '—'}</div>
    </div>
  );
}

function humanize(key) {
  const map = {
    invoicePayments: 'Invoice payments',
    creditNotes: 'Credit notes',
    collectionCallsByInvoice: 'Collection calls (by invoice)',
    invoices: 'Invoices',
    advancePayments: 'Advance payments',
    ledgerEntries: 'Ledger entries',
    vendorPurchaseOrders: 'Vendor purchase orders',
    deliveryRequests: 'Delivery requests (+ items + logs)',
    collectionCallsByLead: 'Collection calls (by lead)',
    statusChangeLogs: 'Status change log entries',
    notifications: 'Notifications',
    nexusConversations: 'VECTRA conversations',
    samMeetings: 'SAM meetings',
    samVisits: 'SAM visits',
    samCommunications: 'SAM communications',
    samAssignmentHistory: 'SAM assignment history',
    samAssignments: 'SAM assignments',
    leadProducts: 'Lead products',
    minutesOfMeeting: 'Minutes of meeting',
    documentUploadLinks: 'Document upload links',
    complaints: 'Complaints (+ attachments)',
    customerComplaintRequests: 'Customer complaint requests',
    planUpgradeHistory: 'Plan upgrade history',
    serviceOrders: 'Service orders',
    callLogsIfCampaignDeleted: 'Call logs (in campaign data)',
  };
  return map[key] || key;
}
