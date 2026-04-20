/**
 * Document Types Configuration (Frontend)
 *
 * Defines the mandatory documents required for BDM document verification workflow.
 * This configuration mirrors the backend config for consistency.
 */

export const DOCUMENT_TYPES = {
  PO: {
    id: 'PO',
    label: 'Purchase Order',
    description: 'Signed purchase order document',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024, // 10MB
    order: 1
  },
  ADVANCE_OTC: {
    id: 'ADVANCE_OTC',
    label: 'Advance OTC',
    description: 'Advance one-time charges receipt',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 2
  },
  GST_DETAILS: {
    id: 'GST_DETAILS',
    label: 'GST Details',
    description: 'GST registration certificate',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 3
  },
  IIL_PROTOCOL_SHEET: {
    id: 'IIL_PROTOCOL_SHEET',
    label: 'IIL Protocol Sheet',
    description: 'Internet Information Link protocol document',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 4
  },
  CAF: {
    id: 'CAF',
    label: 'CAF',
    description: 'Customer Application Form',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 5
  },
  INSTALLATION_ADDRESS_PROOF: {
    id: 'INSTALLATION_ADDRESS_PROOF',
    label: 'Installation Address Proof',
    description: 'Proof of installation location address',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 6
  },
  COMPANY_REGISTRATION: {
    id: 'COMPANY_REGISTRATION',
    label: 'Company Registration Docs',
    description: 'Certificate of incorporation or registration',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 7
  },
  NETWORK_DIAGRAM: {
    id: 'NETWORK_DIAGRAM',
    label: 'Network Diagram',
    description: 'Network architecture/topology diagram',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 8
  },
  TAN_DETAILS: {
    id: 'TAN_DETAILS',
    label: 'TAN Details',
    description: 'Tax Deduction Account Number details',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 9
  },
  COMPANY_PAN: {
    id: 'COMPANY_PAN',
    label: 'Company PAN Card',
    description: 'Company Permanent Account Number card',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 10
  },
  AUTHORIZED_PERSON_ID: {
    id: 'AUTHORIZED_PERSON_ID',
    label: 'Authorized Person ID Proof',
    description: 'ID proof of authorized signatory',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 11
  },
  SLA: {
    id: 'SLA',
    label: 'Service Level Agreement (SLA)',
    description: 'Signed service level agreement document',
    required: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSize: 10 * 1024 * 1024,
    order: 12
  }
};

/**
 * Get all required document types sorted by order
 */
export const getRequiredDocumentTypes = () => {
  return Object.values(DOCUMENT_TYPES)
    .filter(doc => doc.required)
    .sort((a, b) => a.order - b.order);
};

/**
 * Get all document types sorted by order
 */
export const getAllDocumentTypes = () => {
  return Object.values(DOCUMENT_TYPES).sort((a, b) => a.order - b.order);
};

/**
 * Get document type by ID
 */
export const getDocumentTypeById = (id) => {
  return DOCUMENT_TYPES[id] || null;
};

/**
 * Validate if a document type ID is valid
 */
export const isValidDocumentType = (id) => {
  return id in DOCUMENT_TYPES;
};

/**
 * Get required count based on test mode
 */
export const getRequiredCount = (testMode = false) => {
  return testMode ? 1 : getRequiredDocumentTypes().length;
};

/**
 * Check if all required documents are uploaded
 */
export const areAllDocumentsUploaded = (documents, testMode = false) => {
  const uploadedCount = Object.keys(documents || {}).length;
  const requiredCount = getRequiredCount(testMode);
  return uploadedCount >= requiredCount;
};

/**
 * Get upload progress info
 */
export const getUploadProgress = (documents, testMode = false) => {
  const uploadedCount = Object.keys(documents || {}).length;
  const requiredCount = getRequiredCount(testMode);
  const percentage = Math.min(100, Math.round((uploadedCount / requiredCount) * 100));

  return {
    uploadedCount,
    requiredCount,
    percentage,
    isComplete: uploadedCount >= requiredCount
  };
};

/**
 * Get missing document types
 */
export const getMissingDocuments = (documents, testMode = false) => {
  if (testMode) {
    return Object.keys(documents || {}).length >= 1 ? [] : ['At least one document'];
  }

  const required = getRequiredDocumentTypes();
  return required
    .filter(doc => !documents?.[doc.id])
    .map(doc => doc.label);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if file type is allowed
 */
export const isAllowedFileType = (file) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  return allowedMimes.includes(file.type);
};

/**
 * Check if file size is within limit
 */
export const isFileSizeValid = (file, maxSize = 10 * 1024 * 1024) => {
  return file.size <= maxSize;
};
