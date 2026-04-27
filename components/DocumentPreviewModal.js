'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  FileText,
  Image,
  File
} from 'lucide-react';
import { formatFileSize, getDocumentTypeById } from '@/lib/documentTypes';
import { useModal } from '@/lib/useModal';

/**
 * DocumentPreviewModal - Full-screen modal for viewing uploaded documents
 *
 * Props:
 * - document: Document metadata object { documentType, originalName, url, mimetype, size, ... }
 * - onClose: () => void
 * - onReplace: () => void (optional)
 */
export default function DocumentPreviewModal({ document, onClose, onReplace }) {
  // All hooks must be declared unconditionally before any early return —
  // otherwise React throws #310 ("Rendered more hooks than during the
  // previous render") when `document` flips from null to a real object.
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState('');
  const [blobError, setBlobError] = useState('');

  useModal(!!document, onClose);

  // Our backend proxy re-serves Cloudinary files with Content-Disposition:
  // inline so the browser renders them instead of downloading.
  //
  // We fetch via Authorization header (standard Bearer) and pipe the bytes
  // through a blob URL rather than pointing the iframe at the proxy URL
  // directly with `?token=<jwt>`. The query-param form breaks in production
  // under some reverse proxies / WAFs that truncate long URLs or strip
  // unrecognised query strings, which was surfacing as a misleading 401 in
  // the preview modal even though the token itself was valid (the same
  // token succeeds on every other authenticated API call).
  useEffect(() => {
    if (!document?.url) return undefined;
    let cancelled = false;
    let objectUrl = null;

    (async () => {
      try {
        setBlobError('');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : '';
        const res = await fetch(
          `${apiBase}/proxy/file?url=${encodeURIComponent(document.url)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          if (!cancelled) setBlobError(`${res.status} ${body || res.statusText}`);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setBlobError(err?.message || 'Failed to load document');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBlobUrl('');
    };
  }, [document?.url]);

  if (!document) return null;

  // Detect type from mimetype AND file extension (fallback when mimetype is missing/wrong)
  const ext = (document.originalName || document.url || '').toLowerCase().match(/\.([a-z0-9]+)(\?|$)/)?.[1] || '';
  const isImage = document.mimetype?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isPDF = document.mimetype === 'application/pdf' || ext === 'pdf';
  const isOfficeDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods'].includes(ext);
  const docTypeInfo = getDocumentTypeById(document.documentType);

  const proxyUrl = blobUrl;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = document.url;
    link.download = document.originalName;
    link.target = '_blank';
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(document.url, '_blank');
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="h-6 w-6" />;
    if (isPDF) return <FileText className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  return (
    <div data-modal className="fixed inset-0 bg-black/80 flex flex-col z-[60]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600/20 rounded-lg text-orange-400">
            {getFileIcon()}
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">
              {docTypeInfo?.label || document.documentType}
            </h3>
            <p className="text-xs text-slate-400">
              {document.originalName} ({formatFileSize(document.size)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls (for images) */}
          {isImage && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ZoomOut size={18} />
              </Button>
              <span className="text-sm text-slate-400 w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ZoomIn size={18} />
              </Button>
              <div className="w-px h-5 bg-slate-600 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <RotateCw size={18} />
              </Button>
              <div className="w-px h-5 bg-slate-600 mx-1" />
            </>
          )}

          {/* Open in new tab */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewTab}
            className="h-8 px-3 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ExternalLink size={16} className="mr-1.5" />
            Open
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-3 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Download size={16} className="mr-1.5" />
            Download
          </Button>

          {/* Replace button (optional) */}
          {onReplace && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReplace}
              className="h-8 px-3 border-orange-500 text-orange-400 hover:bg-orange-500/20"
            >
              Replace
            </Button>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isImage ? (
          // Image preview
          <div
            className="transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={document.url}
              alt={document.originalName}
              className="max-w-full max-h-[calc(100vh-120px)] object-contain rounded shadow-xl"
            />
          </div>
        ) : isPDF ? (
          // PDF via backend proxy (strips Content-Disposition: attachment).
          // We render a loader until the blob resolves, and surface any
          // proxy error in the modal instead of a blank iframe.
          blobError ? (
            <div className="w-full max-w-2xl bg-slate-800 text-slate-200 rounded shadow-xl p-6 space-y-3">
              <p className="text-sm font-semibold text-red-400">Could not load preview</p>
              <p className="text-xs text-slate-400 break-all">{blobError}</p>
              <Button onClick={handleDownload} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Download size={14} className="mr-1.5" />
                Download instead
              </Button>
            </div>
          ) : proxyUrl ? (
            <iframe
              src={proxyUrl}
              title={document.originalName}
              className="w-full h-full max-w-5xl bg-white rounded shadow-xl"
              style={{ minHeight: 'calc(100vh - 120px)' }}
            />
          ) : (
            <div className="text-slate-300 text-sm">Loading preview…</div>
          )
        ) : isOfficeDoc ? (
          // Office docs — Google Docs Viewer (browsers can't render natively)
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.url)}&embedded=true`}
            title={document.originalName}
            className="w-full h-full max-w-5xl bg-white rounded shadow-xl"
            style={{ minHeight: 'calc(100vh - 120px)' }}
          />
        ) : (
          // Truly unknown file types — still attempt inline iframe, fall back to download
          <div className="w-full h-full max-w-5xl flex flex-col">
            <iframe
              src={document.url}
              title={document.originalName}
              className="w-full flex-1 bg-white rounded shadow-xl"
              style={{ minHeight: 'calc(100vh - 180px)' }}
            />
            <div className="mt-3 flex items-center justify-between gap-3 px-4 py-2 bg-slate-800 rounded text-slate-400 text-sm">
              <span>Can&apos;t preview? {document.mimetype || ext || 'unknown type'}</span>
              <Button onClick={handleDownload} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Download size={14} className="mr-1.5" />
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
