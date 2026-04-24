'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getRequiredCount } from '@/lib/documentTypes';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Clock,
  Trash2,
  Eye,
  X,
  Download,
  ExternalLink,
  RefreshCw,
  Send
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function CustomerUploadPage() {
  const params = useParams();
  const token = params.token;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [uploadingType, setUploadingType] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch link data and validate token
  const fetchLinkData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/public/upload/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid upload link');
        return;
      }

      setLinkData(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load upload page. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLinkData();
    }
  }, [token, fetchLinkData]);

  // Handle file upload
  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, DOC, DOCX files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingType(documentType);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch(`${API_BASE}/public/upload/${token}/document/${documentType}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      // Update local state
      setLinkData(prev => ({
        ...prev,
        uploadedDocuments: {
          ...prev.uploadedDocuments,
          [documentType]: data.document
        },
        uploadProgress: data.uploadProgress,
        documentTypes: prev.documentTypes.map(dt =>
          dt.id === documentType ? { ...dt, uploaded: true } : dt
        )
      }));

      toast.success('Document uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingType(null);
    }
  };

  // Handle file removal
  const handleRemoveDocument = async (documentType) => {
    if (!confirm('Are you sure you want to remove this document?')) return;

    try {
      const response = await fetch(`${API_BASE}/public/upload/${token}/document/${documentType}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove document');
      }

      // Update local state
      const { [documentType]: removed, ...remainingDocs } = linkData.uploadedDocuments;
      setLinkData(prev => ({
        ...prev,
        uploadedDocuments: remainingDocs,
        uploadProgress: data.uploadProgress,
        documentTypes: prev.documentTypes.map(dt =>
          dt.id === documentType ? { ...dt, uploaded: false } : dt
        )
      }));

      toast.success('Document removed');
    } catch (err) {
      console.error('Remove error:', err);
      toast.error(err.message || 'Failed to remove document');
    }
  };

  // Handle submit/notify completion
  const handleSubmitDocuments = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/public/upload/${token}/complete`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit');
      }

      toast.success('Documents submitted successfully! The team has been notified.');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading upload page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Unable to Access
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
              <Button onClick={() => fetchLinkData()} variant="outline">
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const uploadProgress = linkData?.uploadProgress || { uploaded: 0, total: getRequiredCount() };
  const progressPercent = Math.round((uploadProgress.uploaded / uploadProgress.total) * 100);
  const isComplete = uploadProgress.uploaded >= uploadProgress.total;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-orange-600 dark:bg-orange-900 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Document Upload Portal</h1>
          </div>
          <p className="text-orange-100">
            Upload your documents securely for {linkData?.companyName || 'your application'}
          </p>
          {linkData?.customerNote && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-orange-100">
                <strong>Note from team:</strong> {linkData.customerNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Upload Progress
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {uploadProgress.uploaded} of {uploadProgress.total} documents
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {isComplete && (
            <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">All documents uploaded!</span>
            </div>
          )}
        </div>
      </div>

      {/* Link expiry notice */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Clock size={14} />
          <span>This link expires on {formatDate(linkData?.expiresAt)}</span>
        </div>
      </div>

      {/* Document Upload Cards */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {linkData?.documentTypes?.map((docType) => {
            const uploadedDoc = linkData.uploadedDocuments?.[docType.id];
            const isUploading = uploadingType === docType.id;

            return (
              <Card
                key={docType.id}
                className={`transition-all ${
                  uploadedDoc
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          #{docType.order}
                        </span>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {docType.label}
                        </h3>
                        {docType.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {uploadedDoc && (
                          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {docType.description}
                      </p>

                      {/* Uploaded file info */}
                      {uploadedDoc && (
                        <div className="mt-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                {uploadedDoc.originalName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFileSize(uploadedDoc.size)} - Uploaded {formatDate(uploadedDoc.uploadedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewDoc(uploadedDoc)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(uploadedDoc.url, '_blank')}
                                className="h-8 w-8 p-0"
                              >
                                <Download size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDocument(docType.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex-shrink-0">
                      <label
                        className={`
                          flex flex-col items-center justify-center w-32 h-24
                          border-2 border-dashed rounded-lg cursor-pointer
                          transition-all
                          ${isUploading
                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                            : uploadedDoc
                              ? 'border-slate-300 dark:border-slate-700 hover:border-orange-400'
                              : 'border-slate-300 dark:border-slate-700 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          }
                        `}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin text-orange-600 mb-1" />
                            <span className="text-xs text-orange-600">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-slate-400 mb-1" />
                            <span className="text-xs text-slate-500 text-center">
                              {uploadedDoc ? 'Replace' : 'Upload'}
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept={(docType.acceptedFormats || ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']).map(f => `.${f}`).join(',')}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(docType.id, e.target.files[0]);
                              e.target.value = '';
                            }
                          }}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmitDocuments}
            disabled={uploadProgress.uploaded === 0 || isSubmitting}
            className="px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Submit Documents ({uploadProgress.uploaded}/{uploadProgress.total})
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)</p>
          <p className="mt-1">Need help? Contact your sales representative.</p>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {previewDoc.originalName}
                </h3>
                <p className="text-sm text-slate-500">{formatFileSize(previewDoc.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewDoc.url, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1" />
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 min-h-[400px]">
              {previewDoc.mimetype?.startsWith('image/') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.originalName}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewDoc.mimetype === 'application/pdf' ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full min-h-[500px]"
                  title={previewDoc.originalName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <FileText size={48} className="mb-4" />
                  <p>Preview not available for this file type</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.open(previewDoc.url, '_blank')}
                  >
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
