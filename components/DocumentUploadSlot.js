'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatFileSize, isAllowedFileType, isFileSizeValid } from '@/lib/documentTypes';
import toast from 'react-hot-toast';

/**
 * DocumentUploadSlot - A card component for uploading a single document type
 *
 * Props:
 * - documentType: { id, label, description, required, order }
 * - document: Uploaded document data or null
 * - onUpload: (file) => void
 * - onRemove: () => void
 * - onView: () => void
 * - isUploading: boolean
 * - disabled: boolean
 */
export default function DocumentUploadSlot({
  documentType,
  document,
  onUpload,
  onRemove,
  onView,
  isUploading = false,
  disabled = false
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isUploaded = !!document;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const validateAndUpload = (file) => {
    // Validate file type
    if (!isAllowedFileType(file)) {
      toast.error('Invalid file type. Please upload PDF, DOC, DOCX, JPG, or PNG files.');
      return;
    }

    // Validate file size
    if (!isFileSizeValid(file)) {
      toast.error('File is too large. Maximum size is 10MB.');
      return;
    }

    onUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const getFileIcon = () => {
    if (!document?.mimetype) return <File className="h-5 w-5" />;

    if (document.mimetype.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    if (document.mimetype === 'application/pdf') {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  return (
    <div
      className={`relative rounded-lg border-2 transition-all ${
        isDragOver
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
          : isUploaded
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-2.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate">
                {documentType.label}
              </h4>
              {documentType.required && (
                <span className="text-red-500 text-xs">*</span>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex-shrink-0">
            {isUploading ? (
              <Loader2 className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-spin" />
            ) : isUploaded ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            )}
          </div>
        </div>

        {/* Content area */}
        {isUploaded ? (
          // Uploaded state - show file info and actions
          <div className="space-y-2">
            {/* File info */}
            <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600 dark:text-orange-400">
                {getFileIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {document.originalName}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onView}
                disabled={disabled}
                className="flex-1 h-6 text-[10px] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Eye size={12} className="mr-0.5" />
                View
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="flex-1 h-6 text-[10px] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw size={12} className="mr-0.5" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                disabled={disabled || isUploading}
                className="h-6 px-1.5 text-[10px] border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ) : (
          // Empty state - show upload area
          <div
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center py-2 px-3 border border-dashed rounded transition-colors ${
              isDragOver
                ? 'border-orange-400 dark:border-orange-600'
                : 'border-slate-300 dark:border-slate-600'
            } ${
              disabled || isUploading
                ? 'cursor-not-allowed'
                : 'cursor-pointer hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-spin" />
                <p className="text-[10px] text-slate-500 mt-1">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-slate-400" />
                <p className="text-[10px] text-slate-500 mt-1">
                  Drop or <span className="text-orange-600 dark:text-orange-400">browse</span>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
