'use client';

import { useState } from 'react';
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
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useModal(!!document, onClose);

  if (!document) return null;

  const isImage = document.mimetype?.startsWith('image/');
  const isPDF = document.mimetype === 'application/pdf';
  const docTypeInfo = getDocumentTypeById(document.documentType);

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
          // PDF preview using iframe
          <iframe
            src={document.url}
            title={document.originalName}
            className="w-full h-full max-w-4xl bg-white rounded shadow-xl"
            style={{ minHeight: 'calc(100vh - 120px)' }}
          />
        ) : (
          // Other file types - show download prompt
          <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700 max-w-md">
            <div className="p-4 bg-orange-600/20 rounded-xl inline-block mb-4">
              {getFileIcon()}
            </div>
            <h4 className="text-lg font-medium text-white mb-2">
              {document.originalName}
            </h4>
            <p className="text-slate-400 mb-4">
              This file type cannot be previewed directly. Please download to view.
            </p>
            <div className="text-sm text-slate-500 mb-6">
              <p>Type: {document.mimetype}</p>
              <p>Size: {formatFileSize(document.size)}</p>
            </div>
            <Button
              onClick={handleDownload}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Download size={16} className="mr-2" />
              Download File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
