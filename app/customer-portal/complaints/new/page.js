'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerComplaintStore } from '@/lib/customerStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Upload,
  X,
  FileText,
  Image,
  File,
  ArrowLeft,
  Send,
  Layers,
  AlignLeft,
  Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function getFileIcon(type) {
  if (type?.startsWith('image/')) return Image;
  if (type?.includes('pdf')) return FileText;
  return File;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function SectionHeader({ icon: Icon, title, step, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex-shrink-0 mt-0.5">
        {step}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Icon size={15} className="text-blue-600 dark:text-blue-400" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function NewComplaintPage() {
  const router = useRouter();
  const { categories, fetchCategories, submitComplaint, uploadAttachments } = useCustomerComplaintStore();
  const fileInputRef = useRef(null);

  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const subCategories = selectedCategory?.subCategories || [];

  useEffect(() => {
    setSubCategoryId('');
  }, [categoryId]);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`${file.name}: Only PDF, DOC, DOCX, JPG, PNG allowed`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: File too large (max 10MB)`);
      return false;
    }
    return true;
  };

  const addFiles = (newFiles) => {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    const valid = Array.from(newFiles).filter(validateFile).slice(0, remaining);
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoryId) { toast.error('Please select a category'); return; }
    if (!subCategoryId) { toast.error('Please select a sub-category'); return; }
    if (!description.trim()) { toast.error('Please enter a description'); return; }

    setSubmitting(true);

    const result = await submitComplaint({
      categoryId,
      subCategoryId,
      description: description.trim(),
    });

    if (!result.success) {
      toast.error(result.error || 'Failed to submit complaint');
      setSubmitting(false);
      return;
    }

    if (files.length > 0 && result.data?.id) {
      const uploadResult = await uploadAttachments(result.data.id, files);
      if (!uploadResult.success) {
        toast.error('Complaint submitted but file upload failed. You can retry later.');
      }
    }

    toast.success('Complaint submitted successfully!');
    router.push('/customer-portal/complaints');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">New Complaint</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">Describe your issue and we&apos;ll look into it</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Submit a Complaint</h2>
              <p className="text-xs text-blue-100">Fill in the details below to raise your issue</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Section 1: Category */}
          <div>
            <SectionHeader icon={Layers} title="Select Issue Type" step="1" subtitle="Choose the category that best matches your issue" />
            <div className="pl-11 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Category <span className="text-red-500">*</span></Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Sub-Category <span className="text-red-500">*</span></Label>
                <Select value={subCategoryId} onValueChange={setSubCategoryId} disabled={!categoryId}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors">
                    <SelectValue placeholder={categoryId ? 'Select a sub-category' : 'Select a category first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section 2: Description */}
          <div>
            <SectionHeader icon={AlignLeft} title="Describe the Issue" step="2" subtitle="Provide as much detail as possible" />
            <div className="pl-11">
              <Textarea
                placeholder="What happened? When did it start? What were you trying to do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors"
              />
              <p className="text-xs text-slate-400 mt-1.5">{description.length} characters</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Section 3: Attachments */}
          <div>
            <SectionHeader icon={Paperclip} title="Attachments" step="3" subtitle={`Optional \u2022 up to ${MAX_FILES} files`} />
            <div className="pl-11">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
                  <Upload size={18} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG (max 10MB each)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-3">
                  {files.map((file, i) => {
                    const Icon = getFileIcon(file.type);
                    return (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-2.5 border border-slate-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300 truncate font-medium">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Submit Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="flex items-center gap-3 pl-11">
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none h-11 px-8 rounded-xl gap-2 shadow-sm shadow-blue-600/20"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <>
                    <Send size={15} />
                    Submit Complaint
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
