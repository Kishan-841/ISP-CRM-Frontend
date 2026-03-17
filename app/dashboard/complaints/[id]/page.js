'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useComplaintStore, useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  Wifi,
  Tag,
  FileText,
  CalendarClock,
  Users,
  UserPlus,
  StickyNote,
  Save,
  Search,
  X,
  ChevronRight,
  Circle,
  Paperclip,
  Download,
  Trash2,
  Calendar,
  Image,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { COMPLAINT_STATUS_CONFIG, PRIORITY_CONFIG, getStatusBadgeClass } from '@/lib/statusConfig';

// ─── Status badge configuration ───
const STATUS_ICON_MAP = {
  OPEN: AlertCircle,
  CLOSED: XCircle,
};

const STATUS_CONFIG = Object.fromEntries(
  Object.entries(COMPLAINT_STATUS_CONFIG).map(([key, val]) => [key, { ...val, icon: STATUS_ICON_MAP[key] }])
);

// ─── TAT helper ───
const getTATDisplay = (tatDeadline) => {
  const now = new Date();
  const deadline = new Date(tatDeadline);
  const diff = deadline - now;
  if (diff <= 0) {
    const overdueMins = Math.abs(diff) / 60000;
    if (overdueMins < 60) return { text: `Overdue ${Math.floor(overdueMins)}m`, isBreached: true };
    const overdueHrs = overdueMins / 60;
    if (overdueHrs < 24) return { text: `Overdue ${Math.floor(overdueHrs)}h`, isBreached: true };
    return { text: `Overdue ${Math.floor(overdueHrs / 24)}d`, isBreached: true };
  }
  const remainMins = diff / 60000;
  if (remainMins < 60) return { text: `${Math.floor(remainMins)}m left`, isBreached: false };
  const remainHrs = remainMins / 60;
  if (remainHrs < 24) return { text: `${Math.floor(remainHrs)}h left`, isBreached: false };
  return { text: `${Math.floor(remainHrs / 24)}d left`, isBreached: false };
};

export default function ComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const { user } = useAuthStore();
  const {
    complaintDetail: complaint,
    fetchComplaintById,
    assignComplaint,
    updateNotes,
    deleteAttachment,
    loading,
  } = useComplaintStore();

  // Local state
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesModified, setNotesModified] = useState(false);

  // Modal states
  const [showReassignDialog, setShowReassignDialog] = useState(false);

  // Reassign state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch complaint on mount
  const loadComplaint = useCallback(async () => {
    setPageLoading(true);
    const result = await fetchComplaintById(id);
    if (!result.success) {
      toast.error(result.error || 'Failed to load complaint.');
    }
    setPageLoading(false);
  }, [id, fetchComplaintById]);

  useEffect(() => {
    loadComplaint();
  }, [loadComplaint]);

  // Sync notes when complaint loads
  useEffect(() => {
    if (complaint) {
      setNotes(complaint.notes || '');
      setNotesModified(false);
    }
  }, [complaint]);

  // Permission helpers
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isCreator = complaint?.createdBy?.id === user?.id;
  const isAssignee = complaint?.assignments?.some(a => a.user?.id === user?.id);
  const canReassign = isAdmin || isCreator;
  const canEditNotes = isAdmin || isCreator || isAssignee;

  // ─── Action Handlers ───

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    const result = await updateNotes(id, notes.trim());
    if (result.success) {
      toast.success('Notes saved.');
      setNotesModified(false);
      await loadComplaint();
    } else {
      toast.error(result.error || 'Failed to save notes.');
    }
    setNotesSaving(false);
  };

  // ─── Reassign Handlers ───

  const handleSearchUsers = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await api.get(`/users/by-role?role=ALL`);
      const users = response.data.users || [];
      const filtered = users.filter(
        (u) =>
          (u.name?.toLowerCase().includes(term.toLowerCase()) ||
            u.email?.toLowerCase().includes(term.toLowerCase())) &&
          !selectedAssignees.some((s) => s.id === u.id)
      );
      setSearchResults(filtered.slice(0, 10));
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const handleAddAssignee = (assignee) => {
    if (selectedAssignees.length >= 3) {
      toast.error('Maximum 3 assignees allowed.');
      return;
    }
    setSelectedAssignees((prev) => [...prev, assignee]);
    setSearchResults((prev) => prev.filter((u) => u.id !== assignee.id));
    setSearchTerm('');
  };

  const handleRemoveAssignee = (assigneeId) => {
    setSelectedAssignees((prev) => prev.filter((a) => a.id !== assigneeId));
  };

  const handleReassign = async () => {
    if (!selectedAssignees.length) {
      toast.error('Select at least one assignee.');
      return;
    }
    setActionLoading(true);
    const result = await assignComplaint(
      id,
      selectedAssignees.map((a) => a.id)
    );
    if (result.success) {
      toast.success('Complaint reassigned.');
      setShowReassignDialog(false);
      setSelectedAssignees([]);
      setSearchTerm('');
      await loadComplaint();
    } else {
      toast.error(result.error || 'Failed to reassign.');
    }
    setActionLoading(false);
  };

  const openReassignDialog = () => {
    // Pre-select current assignees
    const current = complaint?.assignments?.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      role: a.user.role,
    })) || [];
    setSelectedAssignees(current);
    setSearchTerm('');
    setSearchResults([]);
    setShowReassignDialog(true);
  };

  // ─── Loading State ───
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">Loading complaint...</span>
      </div>
    );
  }

  // ─── Error State ───
  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-semibold">Complaint Not Found</h2>
        <p className="text-muted-foreground">The complaint you are looking for does not exist or you do not have access.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/complaints')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Complaints
        </Button>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.OPEN;
  const priorityConf = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.MEDIUM;
  const StatusIcon = statusConf.icon;
  const tat = complaint.tatDeadline ? getTATDisplay(complaint.tatDeadline) : null;

  return (
    <div className="space-y-6 pb-10">
      {/* ─── Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/complaints')}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-2xl font-bold">{complaint.complaintNumber}</h1>
          <Badge className={`${statusConf.color} border-0 gap-1`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConf.label}
          </Badge>
          <Badge className={`${priorityConf.color} border-0`}>
            {priorityConf.label}
          </Badge>
          {tat && (
            <Badge
              className={`border-0 ${
                tat.isBreached
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
              }`}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              {tat.text}
            </Badge>
          )}
          {complaint.reopenCount > 0 && (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0">
              <RotateCcw className="h-3 w-3 mr-1" />
              Reopened {complaint.reopenCount}x
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column (2/3) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ─── Customer Info Card ─── */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Building2} label="Company" value={complaint.lead?.campaignData?.company} />
                <InfoRow icon={User} label="Contact Person" value={complaint.lead?.campaignData?.name} />
                <InfoRow icon={Phone} label="Phone" value={complaint.lead?.campaignData?.phone} />
                <InfoRow icon={Mail} label="Email" value={complaint.lead?.campaignData?.email} />
                <InfoRow icon={Globe} label="Username" value={complaint.lead?.customerUsername} />
                <InfoRow icon={Wifi} label="Service Type" value={complaint.lead?.serviceType} />
                {complaint.lead?.actualPlanName && (
                  <InfoRow
                    icon={Tag}
                    label="Current Plan"
                    value={
                      <span className="flex items-center gap-2">
                        {complaint.lead.actualPlanName}
                        {complaint.lead.actualPlanIsActive && (
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </span>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── Complaint Details Card ─── */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Complaint Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-teal-600 shrink-0" />
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">
                    {complaint.category?.name}
                    {complaint.subCategory?.name && (
                      <>
                        <ChevronRight className="inline h-3.5 w-3.5 mx-1 text-muted-foreground" />
                        {complaint.subCategory.name}
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {complaint.description || '-'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-teal-600 shrink-0" />
                    <span className="text-muted-foreground">Created by:</span>
                    <span className="font-medium">
                      {complaint.createdBy?.name}
                      {complaint.createdBy?.role && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({complaint.createdBy.role.replace(/_/g, ' ')})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarClock className="h-4 w-4 text-teal-600 shrink-0" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatDateTime(complaint.createdAt)}</span>
                  </div>
                </div>

                {complaint.complaintDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-teal-600 shrink-0" />
                    <span className="text-muted-foreground">Complaint Date:</span>
                    <span className="font-medium">{formatDate(complaint.complaintDate)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm pt-1">
                  <Clock className="h-4 w-4 text-teal-600 shrink-0" />
                  <span className="text-muted-foreground">TAT:</span>
                  <span className="font-medium">
                    {complaint.tatHours} hours
                    <span className="text-muted-foreground ml-2">
                      (Deadline: {formatDateTime(complaint.tatDeadline)})
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Close Details Card (shown when closed) */}
          {complaint.status === 'CLOSED' && (complaint.reasonForOutage || complaint.resolution) && (
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Close Details
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {complaint.reasonForOutage && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Reason for Outage:</span>
                        <p className="font-medium mt-0.5">{complaint.reasonForOutage}</p>
                      </div>
                    )}
                    {complaint.resolution && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Resolution:</span>
                        <p className="font-medium mt-0.5">{complaint.resolution}</p>
                      </div>
                    )}
                    {complaint.resolutionType && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Resolution Type:</span>
                        <p className="font-medium mt-0.5">{complaint.resolutionType}</p>
                      </div>
                    )}
                    {complaint.closedBy && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Closed By:</span>
                        <p className="font-medium mt-0.5">{complaint.closedBy.name}</p>
                      </div>
                    )}
                  </div>
                  {complaint.closeRemark && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Remark:</span>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mt-1 text-sm">
                        {complaint.closeRemark}
                      </div>
                    </div>
                  )}
                  {complaint.serviceImpact && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Service Impact</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {(complaint.ispImpactFrom || complaint.ispImpactTo) && (
                          <div>
                            <span className="text-muted-foreground text-xs">ISP Impact:</span>
                            <p className="font-medium">{formatDateTime(complaint.ispImpactFrom)} - {formatDateTime(complaint.ispImpactTo)}</p>
                          </div>
                        )}
                        {(complaint.customerImpactFrom || complaint.customerImpactTo) && (
                          <div>
                            <span className="text-muted-foreground text-xs">Customer Impact:</span>
                            <p className="font-medium">{formatDateTime(complaint.customerImpactFrom)} - {formatDateTime(complaint.customerImpactTo)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
                    {complaint.resolvedAt && <span>Resolved: {formatDateTime(complaint.resolvedAt)}</span>}
                    {complaint.closedAt && <span>Closed: {formatDateTime(complaint.closedAt)}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Status History Timeline ─── */}
          {complaint.statusHistory?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Status History
                </h3>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-muted-foreground/20" />

                  <div className="space-y-4">
                    {complaint.statusHistory.map((entry, index) => {
                      const newConf = STATUS_CONFIG[entry.newValue] || {};
                      const EntryIcon = newConf.icon || Circle;
                      return (
                        <div key={entry.id || index} className="flex gap-4 relative">
                          {/* Dot */}
                          <div
                            className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-white dark:bg-zinc-900 shrink-0 ${
                              index === 0
                                ? 'border-teal-500'
                                : 'border-muted-foreground/30'
                            }`}
                          >
                            <EntryIcon
                              className={`h-3 w-3 ${
                                index === 0 ? 'text-teal-600' : 'text-muted-foreground/60'
                              }`}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              {entry.oldValue && (
                                <>
                                  <Badge className={`${STATUS_CONFIG[entry.oldValue]?.color || 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
                                    {STATUS_CONFIG[entry.oldValue]?.label || entry.oldValue}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              <Badge className={`${newConf.color || 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
                                {newConf.label || entry.newValue}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              by <span className="font-medium text-foreground">{entry.changedBy?.name || 'System'}</span>
                              {' '}at {formatDateTime(entry.changedAt)}
                            </p>
                            {entry.reason && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                Reason: {entry.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right Column (1/3) ─── */}
        <div className="space-y-6">
          {/* ─── Assignment Card ─── */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assignees
                </h3>
                {canReassign && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openReassignDialog}
                    className="text-teal-600 border-teal-200 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Reassign
                  </Button>
                )}
              </div>

              {complaint.assignments?.length > 0 ? (
                <div className="space-y-3">
                  {complaint.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 text-sm font-semibold shrink-0">
                        {assignment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.user?.role?.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned {formatDate(assignment.assignedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No assignees yet.</p>
              )}
            </CardContent>
          </Card>

          {/* ─── Attachments Card ─── */}
          {complaint.attachments?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({complaint.attachments.length})
                </h3>
                <div className="space-y-2">
                  {complaint.attachments.map((att) => {
                    const isImage = att.fileType?.startsWith('image/');
                    const FileIcon = isImage ? Image : FileText;
                    return (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                          <FileIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(att.fileSize / 1024).toFixed(0)}KB
                            {att.uploadedBy?.name && ` · ${att.uploadedBy.name}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-teal-600 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          {(isCreator || isAdmin) && (
                            <button
                              onClick={async () => {
                                const result = await deleteAttachment(complaint.id, att.id);
                                if (result.success) {
                                  toast.success('Attachment deleted');
                                  loadComplaint();
                                } else {
                                  toast.error(result.error || 'Failed to delete');
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Notes Card ─── */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notes
              </h3>

              {canEditNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setNotesModified(true);
                    }}
                    placeholder="Add notes about this complaint..."
                    rows={5}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {complaint.updatedAt ? `Last updated: ${formatDateTime(complaint.updatedAt)}` : ''}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={notesSaving || !notesModified}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {notesSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap min-h-[80px]">
                  {complaint.notes || <span className="text-muted-foreground italic">No notes added.</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════ */}

      {/* ─── Reassign Dialog ─── */}
      {showReassignDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowReassignDialog(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-lg mx-0 sm:mx-4 border border-zinc-200 dark:border-zinc-700 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Reassign Complaint</h3>
                <p className="text-sm text-muted-foreground">Select 1-3 users to assign this complaint to.</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Selected Assignees */}
              {selectedAssignees.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Selected ({selectedAssignees.length}/3)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssignees.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-full px-3 py-1 text-sm"
                      >
                        <span>{a.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(a.id)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full rounded-lg border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              {searchLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleAddAssignee(u)}
                      disabled={selectedAssignees.length >= 3}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 text-xs font-semibold shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.role?.replace(/_/g, ' ')} {u.email ? `- ${u.email}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searchLoading && searchTerm.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No users found.</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                variant="outline"
                onClick={() => setShowReassignDialog(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={actionLoading || selectedAssignees.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Assign ({selectedAssignees.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Info Row Component ───
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-teal-600 shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value || '-'}</span>
    </div>
  );
}
