'use client';

import { useState } from 'react';
import { FileText, Download, Eye, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { getDocumentTypeById } from '@/lib/documentTypes';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import toast from 'react-hot-toast';

// Map MIME types to file extensions so we can recover the extension when
// the original filename doesn't carry one (common for older uploads whose
// public_id was stored without an extension).
const MIME_TO_EXT = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

// Build a Cloudinary download URL that forces the correct filename (with
// extension). Older uploads were stored with extensionless public_ids, so
// a plain `fl_attachment` without a filename would download as "po" with
// no extension — macOS / Windows then label it "unknown type".
const buildDownloadUrl = (doc, docId) => {
  if (!doc?.url || !doc.url.includes('/upload/')) return doc?.url || '';
  const extFromName = doc.originalName?.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  const extFromMime = MIME_TO_EXT[doc.mimetype];
  const ext = extFromName || extFromMime || '';
  const base = docId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filename = ext ? `${base}.${ext}` : base;
  return doc.url.replace('/upload/', `/upload/fl_attachment:${filename}/`);
};

/**
 * Delivery team must review these two documents before vendor setup opens.
 * Shows PO + IIL Protocol Sheet side-by-side with View/Download buttons and
 * a "Mark as Reviewed" ack. Backend refuses vendor-setup until ack is set,
 * so this component is a gate not just a reminder.
 */
const REQUIRED_DOC_IDS = ['PO', 'IIL_PROTOCOL_SHEET'];

export default function DeliveryDocsReview({ lead, onReviewed }) {
  const [acking, setAcking] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const documents = lead?.documents || {};
  const alreadyReviewed = !!lead?.deliveryDocsReviewedAt;
  const reviewer = lead?.deliveryDocsReviewedBy;

  // Both docs must be uploaded for ack to be enabled — the backend also
  // enforces this, but catching it here gives faster feedback.
  const missingDocIds = REQUIRED_DOC_IDS.filter((id) => !documents[id]);
  const canAck = missingDocIds.length === 0 && !alreadyReviewed;

  const handleAck = async () => {
    if (!canAck || acking) return;
    setAcking(true);
    try {
      const res = await api.post(`/leads/delivery/${lead.id}/acknowledge-docs`);
      toast.success('Documents acknowledged. Vendor setup is now available.');
      onReviewed?.(res.data.lead);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to acknowledge documents.');
    } finally {
      setAcking(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Customer Documents — Review Required
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Review the PO and Protocol Sheet before proceeding to vendor setup.
            </p>
          </div>
        </div>
        {alreadyReviewed && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REQUIRED_DOC_IDS.map((docId) => (
          <DocumentCard
            key={docId}
            docId={docId}
            doc={documents[docId]}
            onView={setPreviewDoc}
          />
        ))}
      </div>

      {/* Ack footer: either the confirm button, or a "who reviewed + when" line */}
      {alreadyReviewed ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>
            Acknowledged
            {reviewer?.name ? <> by <span className="font-medium text-slate-800 dark:text-slate-200">{reviewer.name}</span></> : ''}
            {' '}on <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(lead.deliveryDocsReviewedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
          {missingDocIds.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Missing: {missingDocIds.map((id) => getDocumentTypeById(id)?.label || id).join(', ')}
            </div>
          ) : (
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Click to confirm you've reviewed both documents.
            </span>
          )}
          <Button
            size="sm"
            onClick={handleAck}
            disabled={!canAck}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {acking ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Confirming…</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark as Reviewed</>
            )}
          </Button>
        </div>
      )}

      {/* Inline preview — same modal + backend proxy used by docs-verification
          and accounts, so PDFs/Office docs render in place instead of
          forcing a download. */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}

// One document tile — "View" opens the shared preview modal (inline render
// via backend proxy); "Download" forces save with a Cloudinary-side filename
// transform so the file lands with its proper extension.
function DocumentCard({ docId, doc, onView }) {
  const typeInfo = getDocumentTypeById(docId);
  const label = typeInfo?.label || docId;
  const isMissing = !doc;
  const displayName = doc?.originalName || doc?.fileName || `${docId.toLowerCase()}`;
  const downloadUrl = buildDownloadUrl(doc, docId);

  return (
    <div className={`rounded-md border p-3 ${isMissing ? 'border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <FileText className={`h-3.5 w-3.5 ${isMissing ? 'text-red-500' : 'text-indigo-500'}`} />
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{label}</p>
          </div>
          {isMissing ? (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">Not uploaded yet</p>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate" title={displayName}>
              {displayName}
            </p>
          )}
        </div>
      </div>
      {!isMissing && (
        <div className="flex gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => onView(doc)}
            className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded border border-indigo-100 dark:border-indigo-900/40"
          >
            <Eye className="h-3 w-3" />
            View
          </button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700"
          >
            <Download className="h-3 w-3" />
            Download
          </a>
        </div>
      )}
    </div>
  );
}
