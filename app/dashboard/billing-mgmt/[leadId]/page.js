'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  FileText,
  X,
  CheckCircle,
  Loader2,
  Eye,
  AlertCircle,
  Printer,
  CreditCard,
  IndianRupee,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  History,
  Receipt,
  Download,
  Calendar,
  Hash,
  Banknote,
  MinusCircle,
  FileX,
  RefreshCw,
  Plus,
  Wallet
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { INVOICE_STATUS_CONFIG, getStatusBadgeClass } from '@/lib/statusConfig';

// Get status color
const getStatusColor = (status) => getStatusBadgeClass(status, INVOICE_STATUS_CONFIG, 'bg-slate-100 text-slate-700');

// Number to words conversion
const numberToWords = (num) => {
  if (!num && num !== 0) return '-';
  num = Math.round(num);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  if (num === 0) return 'Zero only';

  let result = '';

  // Indian numbering system: Crores, Lakhs, Thousands, Hundreds
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = num;

  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remaining > 0) result += convertLessThanThousand(remaining);

  return result.trim() + ' only';
};

// Payment mode options
const PAYMENT_MODES = [
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'NEFT', label: 'NEFT' },
  { value: 'ONLINE', label: 'Online Payment' },
  { value: 'TDS', label: 'TDS' }
];

// Bank account options for Cheque/NEFT
const BANK_ACCOUNTS = [
  { value: 'AXIS_CC_919020026961333', label: 'Axis Bank Cash Credit - 919020026961333' },
  { value: 'AXIS_CC_920030064383932', label: 'Axis Bank Cash Credit - 920030064383932' },
  { value: 'UBI_CA_344505010060134', label: 'UBI C/A No - 344505010060134' }
];

// Online payment options
const ONLINE_PAYMENT_OPTIONS = [
  { value: 'RAZORPAY', label: 'Razorpay' }
];

// Get bank account display name
const getBankAccountName = (value) => {
  if (!value) return '-';
  const bank = BANK_ACCOUNTS.find(b => b.value === value);
  if (bank) return bank.label;
  const online = ONLINE_PAYMENT_OPTIONS.find(o => o.value === value);
  if (online) return online.label;
  return value;
};

// Get payment mode display name
const getPaymentModeLabel = (value) => {
  const mode = PAYMENT_MODES.find(m => m.value === value);
  return mode ? mode.label : value;
};

export default function CustomerInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId;
  const { user } = useAuthStore();

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // New partial payment flow state
  const [currentInvoiceId, setCurrentInvoiceId] = useState('');
  const [sessionPayments, setSessionPayments] = useState([]);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState(null);

  // Credit Note modal state
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState(null);
  const [isCreatingCreditNote, setIsCreatingCreditNote] = useState(false);
  const [showCreditNotesModal, setShowCreditNotesModal] = useState(false);
  const [invoiceCreditNotes, setInvoiceCreditNotes] = useState([]);
  const [creditNoteSummary, setCreditNoteSummary] = useState(null);
  const [showCreditNoteViewModal, setShowCreditNoteViewModal] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);

  // OTC Invoice state
  const [isGeneratingOTC, setIsGeneratingOTC] = useState(false);

  // Advance Payment modal state
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [isProcessingAdvancePayment, setIsProcessingAdvancePayment] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    paymentMode: '',
    bankAccount: '',
    provisionalReceiptNo: '',
    paidAmount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    paymentRemark: ''
  });

  // Advance Balance state
  const [advanceBalance, setAdvanceBalance] = useState({
    advanceAvailable: 0,
    ledgerBalance: 0,
    advancePayments: []
  });
  // Credit Note form state
  const [creditNoteForm, setCreditNoteForm] = useState({
    baseAmount: '',
    reason: '',
    remarks: ''
  });

  // Credit Note reasons
  const CREDIT_NOTE_REASONS = [
    { value: 'SERVICE_DOWNTIME', label: 'Service Downtime' },
    { value: 'OVERPAYMENT', label: 'Overpayment' },
    { value: 'PRICE_ADJUSTMENT', label: 'Price Adjustment' },
    { value: 'CANCELLATION', label: 'Cancellation' },
    { value: 'ERROR_CORRECTION', label: 'Error Correction' }
  ];

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    paymentMode: '',
    bankAccount: '',
    provisionalReceiptNo: '',
    paidAmount: '',
    tdsAmount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    paymentRemark: '',
    useAdvancePayment: false,
    advanceAmount: ''
  });

  const isAccountsTeam = user?.role === 'ACCOUNTS_TEAM';
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return selectedInvoices.reduce((sum, id) => {
      const invoice = invoices.find(inv => inv.id === id);
      return sum + (invoice?.grandTotal || 0);
    }, 0);
  }, [selectedInvoices, invoices]);

  // Get payable invoices (pending, overdue, or partially paid)
  const pendingInvoices = useMemo(() => {
    return invoices.filter(inv =>
      inv.status === 'GENERATED' ||
      inv.status === 'OVERDUE' ||
      inv.status === 'PARTIALLY_PAID'
    );
  }, [invoices]);

  // Get current selected invoice details
  const currentInvoice = useMemo(() => {
    if (!currentInvoiceId) return null;
    return invoices.find(inv => inv.id === currentInvoiceId);
  }, [currentInvoiceId, invoices]);

  // Get remaining amount for current invoice
  const currentInvoiceRemaining = useMemo(() => {
    if (!currentInvoice) return 0;
    return currentInvoice.remainingAmount ?? currentInvoice.grandTotal;
  }, [currentInvoice]);

  // Get invoices available for payment (selected and not fully paid in this session)
  const availableForPayment = useMemo(() => {
    return selectedInvoices
      .map(id => invoices.find(inv => inv.id === id))
      .filter(inv => inv && inv.status !== 'PAID');
  }, [selectedInvoices, invoices]);

  // Check if current invoice is OTC
  const isOTCInvoice = useMemo(() => {
    return currentInvoice?.invoiceNumber?.startsWith('OTC/') || false;
  }, [currentInvoice]);

  // Payment validation for partial payments
  const paymentValidation = useMemo(() => {
    const paidAmount = parseFloat(paymentForm.paidAmount) || 0;
    const tdsAmount = parseFloat(paymentForm.tdsAmount) || 0;
    const advanceAmount = parseFloat(paymentForm.advanceAmount) || 0;
    const totalPayment = paidAmount + tdsAmount + advanceAmount;
    const isTdsMode = paymentForm.paymentMode === 'TDS';
    const isAdvanceMode = paymentForm.useAdvancePayment;

    // For TDS mode, only tdsAmount is required (paidAmount can be 0)
    // For advance mode, advanceAmount is required
    // For other modes, paidAmount is required
    let isValid = false;
    if (isAdvanceMode) {
      isValid = advanceAmount > 0 && advanceAmount <= (advanceBalance.advanceAvailable || 0) && totalPayment <= currentInvoiceRemaining + 1;
    } else if (isTdsMode) {
      isValid = tdsAmount > 0 && totalPayment <= currentInvoiceRemaining + 1;
    } else {
      isValid = paidAmount > 0 && totalPayment <= currentInvoiceRemaining + 1;
    }

    return {
      paidAmount,
      tdsAmount,
      advanceAmount,
      totalPayment,
      isTdsMode,
      isAdvanceMode,
      isValid,
      exceedsRemaining: totalPayment > currentInvoiceRemaining + 1,
      isOTCInvoice
    };
  }, [paymentForm, currentInvoiceRemaining, isOTCInvoice, advanceBalance.advanceAvailable]);

  // Redirect non-authorized users
  useEffect(() => {
    if (user && !isAccountsTeam && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAccountsTeam, isAdmin, router]);

  // Fetch customer detail
  const fetchCustomerDetail = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/invoices/customer/${leadId}`);
      setCustomer(response.data.customer);
      setInvoices(response.data.invoices || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      toast.error('Failed to fetch customer details');
      router.push('/dashboard/billing-mgmt');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdvanceBalance = async () => {
    try {
      const response = await api.get(`/invoices/customer/${leadId}/advance-balance`);
      setAdvanceBalance(response.data);
    } catch (error) {
      console.error('Failed to fetch advance balance:', error);
    }
  };

  useEffect(() => {
    if (leadId && (isAccountsTeam || isAdmin)) {
      fetchCustomerDetail();
      fetchAdvanceBalance();
    }
  }, [leadId, isAccountsTeam, isAdmin]);

  // Toggle invoice selection
  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  // Select all pending invoices
  const selectAllPending = () => {
    const allPendingIds = pendingInvoices.map(inv => inv.id);
    setSelectedInvoices(allPendingIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedInvoices([]);
  };

  // Open advance payment modal
  const handleOpenAdvancePaymentModal = () => {
    setAdvancePaymentForm({
      paymentMode: '',
      bankAccount: '',
      provisionalReceiptNo: '',
      paidAmount: '',
      transactionDate: new Date().toISOString().split('T')[0],
      paymentRemark: ''
    });
    setShowAdvancePaymentModal(true);
  };

  // Record advance payment
  const handleRecordAdvancePayment = async () => {
    if (!advancePaymentForm.paymentMode) {
      toast.error('Please select payment mode');
      return;
    }
    if (!advancePaymentForm.paidAmount || parseFloat(advancePaymentForm.paidAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (['CHEQUE', 'NEFT', 'ONLINE'].includes(advancePaymentForm.paymentMode) && !advancePaymentForm.bankAccount) {
      toast.error('Please select bank account');
      return;
    }

    setIsProcessingAdvancePayment(true);
    try {
      const response = await api.post(`/invoices/customer/${leadId}/advance-payment`, {
        paymentMode: advancePaymentForm.paymentMode,
        bankAccount: advancePaymentForm.bankAccount || null,
        provisionalReceiptNo: advancePaymentForm.provisionalReceiptNo || null,
        amount: parseFloat(advancePaymentForm.paidAmount),
        transactionDate: advancePaymentForm.transactionDate || null,
        remark: advancePaymentForm.paymentRemark || null
      });

      toast.success(`Advance payment of ${formatCurrency(parseFloat(advancePaymentForm.paidAmount))} recorded successfully`);
      setShowAdvancePaymentModal(false);
      fetchCustomerDetail(); // Refresh data
      fetchAdvanceBalance(); // Refresh advance balance
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record advance payment');
    } finally {
      setIsProcessingAdvancePayment(false);
    }
  };

  // Open payment modal
  const handleOpenPaymentModal = () => {
    if (selectedInvoices.length === 0) {
      toast.error('Please select at least one invoice');
      return;
    }
    // Reset form and session payments
    setSessionPayments([]);
    const firstInvoiceId = selectedInvoices[0];
    setCurrentInvoiceId(firstInvoiceId);
    resetPaymentForm();
    setShowPaymentModal(true);
  };

  // Reset payment form
  const resetPaymentForm = () => {
    setPaymentForm({
      paymentMode: '',
      bankAccount: '',
      provisionalReceiptNo: '',
      paidAmount: '',
      tdsAmount: '',
      transactionDate: new Date().toISOString().split('T')[0],
      paymentRemark: '',
      useAdvancePayment: false,
      advanceAmount: ''
    });
  };

  // Handle payment mode change
  const handlePaymentModeChange = (mode) => {
    let bankAccount = '';
    // Auto-select Razorpay for online payments
    if (mode === 'ONLINE') {
      bankAccount = 'RAZORPAY';
    }
    setPaymentForm(prev => ({
      ...prev,
      paymentMode: mode,
      bankAccount,
      // Clear amount if TDS (not required)
      paidAmount: mode === 'TDS' ? '' : prev.paidAmount
    }));
  };

  // Handle invoice selection change in dropdown
  const handleInvoiceChange = (invoiceId) => {
    setCurrentInvoiceId(invoiceId);
    resetPaymentForm();
  };

  // Update amount received - cap at remaining balance
  const handleAmountChange = (value) => {
    const numValue = parseFloat(value) || 0;
    const advanceUsed = parseFloat(paymentForm.advanceAmount) || 0;
    const maxAllowed = currentInvoiceRemaining - advanceUsed;

    // Cap the value at the maximum allowed
    const cappedValue = numValue > maxAllowed ? maxAllowed.toString() : value;

    setPaymentForm(prev => ({
      ...prev,
      paidAmount: cappedValue
    }));
  };

  // Update TDS amount - cap at remaining balance
  const handleTdsChange = (value) => {
    const numValue = parseFloat(value) || 0;
    const advanceUsed = parseFloat(paymentForm.advanceAmount) || 0;
    const paidAmount = parseFloat(paymentForm.paidAmount) || 0;
    const maxAllowed = currentInvoiceRemaining - advanceUsed - paidAmount;

    // Cap the value at the maximum allowed
    const cappedValue = numValue > maxAllowed ? maxAllowed.toString() : value;

    setPaymentForm(prev => ({
      ...prev,
      tdsAmount: cappedValue
    }));
  };

  // Add payment for current invoice (supports partial payments and advance settlement)
  const handleAddPayment = async () => {
    if (!currentInvoiceId) {
      toast.error('Please select an invoice');
      return;
    }

    const useAdvance = paymentForm.useAdvancePayment && parseFloat(paymentForm.advanceAmount) > 0;
    const hasRegularPayment = parseFloat(paymentForm.paidAmount) > 0 || parseFloat(paymentForm.tdsAmount) > 0;

    // If only using advance payment, no payment mode needed
    if (!useAdvance && !paymentForm.paymentMode) {
      toast.error('Please select payment mode');
      return;
    }
    // Validate bank account for CHEQUE/NEFT/ONLINE
    if (!useAdvance && ['CHEQUE', 'NEFT', 'ONLINE'].includes(paymentForm.paymentMode) && !paymentForm.bankAccount) {
      toast.error('Please select bank account');
      return;
    }
    // For TDS, only tdsAmount is required; for others, paidAmount is required (unless using advance)
    const isTdsMode = paymentForm.paymentMode === 'TDS';
    if (!useAdvance && !isTdsMode && (!paymentForm.paidAmount || parseFloat(paymentForm.paidAmount) <= 0)) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (isTdsMode && (!paymentForm.tdsAmount || parseFloat(paymentForm.tdsAmount) <= 0)) {
      toast.error('Please enter TDS amount');
      return;
    }
    if (paymentValidation.exceedsRemaining) {
      toast.error(`Payment exceeds remaining balance of ${formatCurrency(currentInvoiceRemaining)}`);
      return;
    }
    // Validate advance amount
    if (useAdvance && parseFloat(paymentForm.advanceAmount) > advanceBalance.advanceAvailable) {
      toast.error('Advance amount exceeds available balance');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const invoice = invoices.find(inv => inv.id === currentInvoiceId);
      let advanceSettled = false;
      let regularPaymentMade = false;
      let lastReceiptNumber = '';
      let finalInvoiceStatus = '';

      // Step 1: Settle advance if used
      if (useAdvance) {
        const advanceResponse = await api.post(`/invoices/customer/${leadId}/settle-advance`, {
          invoiceId: currentInvoiceId,
          amount: parseFloat(paymentForm.advanceAmount)
        });
        advanceSettled = true;
        lastReceiptNumber = advanceResponse.data.payment.receiptNumber;
        finalInvoiceStatus = advanceResponse.data.newInvoiceStatus;

        // Add advance settlement to session payments
        setSessionPayments(prev => [...prev, {
          invoiceNumber: invoice?.invoiceNumber,
          receiptNumber: advanceResponse.data.payment.receiptNumber,
          amount: parseFloat(paymentForm.advanceAmount),
          tdsAmount: 0,
          paymentMode: 'ADVANCE_SETTLEMENT',
          isFullyPaid: advanceResponse.data.newInvoiceStatus === 'PAID'
        }]);
      }

      // Step 2: Add regular payment if any
      if (hasRegularPayment && paymentForm.paymentMode) {
        const response = await api.post(`/invoices/${currentInvoiceId}/payment`, {
          amount: parseFloat(paymentForm.paidAmount) || 0,
          paymentMode: paymentForm.paymentMode,
          bankAccount: paymentForm.bankAccount,
          provisionalReceiptNo: paymentForm.provisionalReceiptNo,
          tdsAmount: parseFloat(paymentForm.tdsAmount) || 0,
          transactionDate: paymentForm.transactionDate,
          remark: paymentForm.paymentRemark
        });

        regularPaymentMade = true;
        lastReceiptNumber = response.data.payment.receiptNumber;
        finalInvoiceStatus = response.data.invoice.status;

        // Add to session payments
        setSessionPayments(prev => [...prev, {
          invoiceNumber: invoice?.invoiceNumber,
          receiptNumber: response.data.payment.receiptNumber,
          amount: response.data.payment.amount,
          tdsAmount: response.data.payment.tdsAmount,
          paymentMode: response.data.payment.paymentMode,
          isFullyPaid: response.data.invoice.status === 'PAID'
        }]);
      }

      // Show success message
      if (advanceSettled && regularPaymentMade) {
        toast.success('Advance settled and payment added!');
      } else if (advanceSettled) {
        toast.success(`Advance settled! Receipt: ${lastReceiptNumber}`);
      } else {
        toast.success(`Payment added! Receipt: ${lastReceiptNumber}`);
      }

      // Refresh data
      await fetchCustomerDetail();
      await fetchAdvanceBalance();

      // Reset form for next payment
      resetPaymentForm();

      // If invoice is fully paid, switch to next unpaid invoice
      if (finalInvoiceStatus === 'PAID') {
        const nextUnpaid = selectedInvoices.find(id =>
          id !== currentInvoiceId && invoices.find(inv => inv.id === id)?.status !== 'PAID'
        );
        if (nextUnpaid) {
          setCurrentInvoiceId(nextUnpaid);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Close payment modal and clear selection
  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoices([]);
    setSessionPayments([]);
    setCurrentInvoiceId('');
  };

  // Auto-generate OTC Invoice for customers without one
  const [otcGenerationAttempted, setOtcGenerationAttempted] = useState(false);

  useEffect(() => {
    const autoGenerateOTC = async () => {
      // Only try once per page load, and only if conditions are met
      if (
        customer?.otcAmount > 0 &&
        !customer?.otcInvoiceId &&
        !isGeneratingOTC &&
        !otcGenerationAttempted &&
        !isLoading
      ) {
        setOtcGenerationAttempted(true);
        setIsGeneratingOTC(true);
        try {
          const response = await api.post(`/invoices/generate-otc/${leadId}`);
          toast.success(`OTC Invoice ${response.data.invoice.invoiceNumber} generated!`);
          fetchCustomerDetail(); // Refresh to show the new invoice
        } catch (error) {
          console.error('Failed to auto-generate OTC invoice:', error.response?.data?.message || error.message);
          // Show error only if it's not about already existing
          if (error.response?.data?.message && !error.response.data.message.includes('already')) {
            toast.error(error.response.data.message);
          }
        } finally {
          setIsGeneratingOTC(false);
        }
      }
    };

    autoGenerateOTC();
  }, [customer, isLoading, leadId, otcGenerationAttempted]);

  // View invoice
  const handleViewInvoice = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}`);
      setSelectedInvoice(response.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to load invoice');
    }
  };

  // Print invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  // Open receipt modal
  const handleGenerateReceipt = async (invoice) => {
    try {
      // Fetch full invoice details including payments
      const response = await api.get(`/invoices/${invoice.id}`);
      setReceiptInvoice(response.data);
      setShowReceiptModal(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  // Print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Open credit note modal
  const handleOpenCreditNoteModal = (invoice) => {
    setCreditNoteInvoice(invoice);
    setCreditNoteForm({
      baseAmount: '',
      reason: '',
      remarks: ''
    });
    setShowCreditNoteModal(true);
  };

  // Create credit note
  const handleCreateCreditNote = async () => {
    if (!creditNoteInvoice) return;

    if (!creditNoteForm.baseAmount || parseFloat(creditNoteForm.baseAmount) <= 0) {
      toast.error('Please enter a valid base amount');
      return;
    }
    if (!creditNoteForm.reason) {
      toast.error('Please select a reason');
      return;
    }

    setIsCreatingCreditNote(true);
    try {
      const response = await api.post(`/credit-notes/invoice/${creditNoteInvoice.id}`, {
        baseAmount: parseFloat(creditNoteForm.baseAmount),
        reason: creditNoteForm.reason,
        remarks: creditNoteForm.remarks
      });

      // Show success message with advance payment info if applicable
      if (response.data.advancePayment) {
        toast.success(
          `Credit Note ${response.data.creditNote.creditNoteNumber} created successfully. ` +
          `${formatCurrency(response.data.advancePayment.amount)} added to advance payment (Receipt: ${response.data.advancePayment.receiptNumber})`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Credit Note ${response.data.creditNote.creditNoteNumber} created successfully`);
      }

      setShowCreditNoteModal(false);
      fetchCustomerDetail(); // Refresh invoice data
      fetchAdvanceBalance(); // Refresh advance balance to show credit note amount
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create credit note');
    } finally {
      setIsCreatingCreditNote(false);
    }
  };

  // View credit notes for invoice
  const handleViewCreditNotes = async (invoice) => {
    try {
      const response = await api.get(`/credit-notes/invoice/${invoice.id}`);
      setInvoiceCreditNotes(response.data.creditNotes || []);
      setCreditNoteSummary(response.data.summary);
      setCreditNoteInvoice(response.data.invoice);
      setShowCreditNotesModal(true);
    } catch (error) {
      toast.error('Failed to load credit notes');
    }
  };

  // Calculate max allowable credit for invoice
  const getMaxAllowableCredit = (invoice) => {
    if (!invoice) return 0;
    const totalCreditAmount = invoice.totalCreditAmount || 0;
    return invoice.grandTotal - totalCreditAmount;
  };

  // Calculate credit note total with GST (18%)
  const calculateCreditNoteTotal = (baseAmount) => {
    const base = parseFloat(baseAmount) || 0;
    const gst = base * 0.18;
    return base + gst;
  };

  // Generate receipt number from invoice and payments
  const getReceiptNumber = (invoice) => {
    if (!invoice || !invoice.payments || invoice.payments.length === 0) {
      return `RCP-${invoice?.invoiceNumber?.replace('INV-', '') || 'UNKNOWN'}`;
    }
    // Use the first payment's receipt number as main receipt number
    return invoice.payments[0].receiptNumber;
  };

  // Get total from all payments
  const getTotalPayments = (invoice) => {
    if (!invoice || !invoice.payments || invoice.payments.length === 0) return 0;
    return invoice.payments.reduce((sum, p) => sum + (p.amount || 0) + (p.tdsAmount || 0), 0);
  };

  if (!isAccountsTeam && !isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/billing-mgmt')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {customer?.companyName || 'Customer'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-orange-600 font-mono ml-[18px]">{customer?.customerUsername}</p>
          </div>
          {/* View Ledger Button */}
          <Button
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-600 hover:bg-orange-50 w-fit"
            onClick={() => router.push(`/dashboard/billing-mgmt/${leadId}/ledger`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Ledger
          </Button>
        </div>

        {/* Customer Info Card */}
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Company</p>
                  <p className="text-sm font-medium truncate">{customer?.companyName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium truncate">{customer?.contactPhone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium truncate">{customer?.contactEmail || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm font-medium truncate">{customer?.city || '-'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OTC Invoice Auto-Generation Status */}
        {customer?.otcAmount > 0 && !customer?.otcInvoiceId && isGeneratingOTC && (
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Generating OTC Invoice...</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(customer.otcAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-orange-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Pending Invoices</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{summary.pendingCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-red-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Total Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(summary.totalPendingAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Total Paid</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalPaidAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Advance Amount */}
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-500">Available Advance</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(advanceBalance.advanceAvailable || 0)}</p>
                  {advanceBalance.advanceAvailable > 0 && (
                    <p className="text-xs text-blue-500 mt-1 hidden sm:block">Use in payment modal to settle</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Notes Summary - Only show if there are credit notes */}
          {(summary.totalCreditAmount || 0) > 0 && (
            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-orange-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MinusCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Credit Notes Issued</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{formatCurrency(summary.totalCreditAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Selection Summary & Actions */}
        {pendingInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3 sm:gap-4">
              <div>
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Selected: </span>
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {selectedInvoices.length} of {pendingInvoices.length}
                </span>
              </div>
              {selectedInvoices.length > 0 && (
                <div className="px-2 sm:px-3 py-1 bg-orange-100 rounded-lg">
                  <span className="text-xs sm:text-sm text-orange-600">Total: </span>
                  <span className="font-bold text-sm sm:text-base text-orange-700">{formatCurrency(selectedTotal)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedInvoices.length < pendingInvoices.length && (
                <Button size="sm" variant="outline" onClick={selectAllPending}>
                  Select All
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleOpenAdvancePaymentModal}
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Record </span>Advance
              </Button>
              {selectedInvoices.length > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={handleOpenPaymentModal}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Pay ({selectedInvoices.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Invoices Table */}
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No invoices found</p>
          </div>
        ) : (
          <>
          {/* Desktop Table */}
          <DataTable
            className="hidden lg:block"
                columns={[
                  {
                    key: 'select',
                    label: '',
                    width: '48px',
                    render: (row) => {
                      const isPayable = row.status === 'GENERATED' || row.status === 'OVERDUE' || row.status === 'PARTIALLY_PAID';
                      return isPayable ? (
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(row.id)}
                          onChange={() => toggleInvoiceSelection(row.id)}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      ) : null;
                    },
                    cellClassName: 'text-center'
                  },
                  {
                    key: 'invoice',
                    label: 'Invoice',
                    render: (row) => (
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{row.invoiceNumber}</p>
                          {row.invoiceNumber?.startsWith('OTC/') && (
                            <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">OTC</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(row.invoiceDate)}</p>
                        <p className="text-xs text-slate-400">Due: {formatDate(row.dueDate)}</p>
                      </div>
                    )
                  },
                  {
                    key: 'billingPeriod',
                    label: 'Billing Period',
                    render: (row) => (
                      <div className="text-sm">
                        <p>{formatDate(row.billingPeriodStart)}</p>
                        <p className="text-slate-400">to {formatDate(row.billingPeriodEnd)}</p>
                      </div>
                    )
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    render: (row) => {
                      const remainingAmount = row.remainingAmount ?? row.grandTotal;
                      return (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.grandTotal)}</p>
                          {(row.totalCreditAmount || 0) > 0 && (
                            <div className="mt-1 p-1.5 bg-red-50 dark:bg-red-900/20 rounded text-left">
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <MinusCircle className="h-3 w-3" />
                                Credit: -{formatCurrency(row.totalCreditAmount)}
                              </p>
                              {row.creditNoteImpact && (
                                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                  {row.creditNotes?.map(cn => cn.reasonLabel || cn.reason?.replace(/_/g, ' ')).join(', ')}
                                </p>
                              )}
                              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                                Net: {formatCurrency(row.netPayableAmount || (row.grandTotal - row.totalCreditAmount))}
                              </p>
                            </div>
                          )}
                          {row.status === 'PARTIALLY_PAID' && (
                            <p className="text-xs text-amber-600 font-medium mt-1">Remaining: {formatCurrency(remainingAmount)}</p>
                          )}
                          {row.status === 'PAID' && (
                            <p className="text-xs text-emerald-600 font-medium mt-1">Fully Paid</p>
                          )}
                          {row.status === 'CANCELLED' && (
                            <p className="text-xs text-slate-500 font-medium mt-1">Cancelled</p>
                          )}
                        </div>
                      );
                    },
                    cellClassName: 'text-right'
                  },
                  {
                    key: 'payments',
                    label: 'Payments',
                    render: (row) => {
                      const paymentCount = row.payments?.length || 0;
                      const isExpanded = expandedInvoiceId === row.id;
                      return (
                        <div>
                          {paymentCount > 0 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedInvoiceId(isExpanded ? null : row.id); }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              <Receipt className="h-3 w-3" />
                              {paymentCount} Payment{paymentCount > 1 ? 's' : ''}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">No payments</span>
                          )}
                          {isExpanded && paymentCount > 0 && (
                            <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-left">
                              <div className="flex items-center gap-2 mb-2">
                                <History className="h-4 w-4 text-emerald-600" />
                                <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm">Payment History</h4>
                                <span className="text-xs text-slate-500">(Total: {formatCurrency(row.totalPaidAmount || 0)})</span>
                              </div>
                              <div className="space-y-2">
                                {row.payments.map((payment, idx) => (
                                  <div key={payment.id || idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-emerald-600">#{idx + 1}</span>
                                      <div>
                                        <p className="text-xs font-medium text-orange-600">{payment.receiptNumber}</p>
                                        <p className="text-[10px] text-slate-500">{formatDate(payment.paymentDate || payment.createdAt)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">
                                        {getPaymentModeLabel(payment.paymentMode)}
                                      </Badge>
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                                        {payment.tdsAmount > 0 && (
                                          <p className="text-[10px] text-slate-500">TDS: {formatCurrency(payment.tdsAmount)}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(row); }}>
                                  <Receipt className="h-3 w-3 mr-1" /> Generate Receipt
                                </Button>
                                <div className="text-right">
                                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(row.totalPaidAmount || 0)}</span>
                                  {(row.remainingAmount ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-orange-600">(Remaining: {formatCurrency(row.remainingAmount)})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    },
                    cellClassName: 'text-center'
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (row) => (
                      <Badge className={getStatusColor(row.status)}>
                        {row.status === 'PARTIALLY_PAID' ? 'PARTIAL' : row.status}
                      </Badge>
                    ),
                    cellClassName: 'text-center'
                  }
                ]}
                data={invoices}
                pagination={true}
                defaultPageSize={10}
                emptyMessage="No invoices found"
                emptyIcon={FileText}
                actions={(row) => {
                  const paymentCount = row.payments?.length || 0;
                  return (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewInvoice(row)}
                        className="group relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-all"
                        title="View Invoice"
                      >
                        <Eye size={16} className="text-slate-600 dark:text-slate-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">View</span>
                      </button>
                      {paymentCount > 0 && (
                        <button
                          onClick={() => handleGenerateReceipt(row)}
                          className="group relative p-2 rounded-lg border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                          title="Generate Receipt"
                        >
                          <Receipt size={16} className="text-emerald-600" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-emerald-600 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Receipt</span>
                        </button>
                      )}
                      {row.status !== 'CANCELLED' && (
                        <>
                          {(row.totalCreditAmount || 0) > 0 && (
                            <button
                              onClick={() => handleViewCreditNotes(row)}
                              className="group relative p-2 rounded-lg border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all"
                              title="View Credit Notes"
                            >
                              <FileX size={16} className="text-orange-600" />
                              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-orange-500 rounded-full">
                                {row.creditNotes?.length || '.'}
                              </span>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-orange-600 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Credit Notes</span>
                            </button>
                          )}
                          {getMaxAllowableCredit(row) > 0 && !row.invoiceNumber?.startsWith('OTC/') && (
                            <button
                              onClick={() => handleOpenCreditNoteModal(row)}
                              className="group relative p-2 rounded-lg border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all"
                              title="Issue Credit Note"
                            >
                              <MinusCircle size={16} className="text-red-500" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Issue Credit</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                }}
              />

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-800">
                {invoices.map((invoice) => {
                  const isPayable = invoice.status === 'GENERATED' || invoice.status === 'OVERDUE' || invoice.status === 'PARTIALLY_PAID';
                  const isSelected = selectedInvoices.includes(invoice.id);
                  const remainingAmount = invoice.remainingAmount ?? invoice.grandTotal;
                  const paymentCount = invoice.payments?.length || 0;
                  const isExpanded = expandedInvoiceId === invoice.id;

                  return (
                    <div key={invoice.id} className={`p-4 ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
                      {/* Top row: checkbox + invoice info + status */}
                      <div className="flex items-start gap-3">
                        {isPayable && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            className="h-4 w-4 mt-1 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate">{invoice.invoiceNumber}</p>
                              {invoice.invoiceNumber?.startsWith('OTC/') && (
                                <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0 flex-shrink-0">OTC</Badge>
                              )}
                            </div>
                            <Badge className={`flex-shrink-0 ${getStatusColor(invoice.status)}`}>
                              {invoice.status === 'PARTIALLY_PAID' ? 'PARTIAL' : invoice.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{formatDate(invoice.invoiceDate)}</span>
                            <span>Due: {formatDate(invoice.dueDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-3 mt-3 ml-7">
                        <div>
                          <p className="text-xs text-slate-500">Amount</p>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(invoice.grandTotal)}</p>
                          {invoice.status === 'PARTIALLY_PAID' && (
                            <p className="text-xs text-amber-600 font-medium">
                              Remaining: {formatCurrency(remainingAmount)}
                            </p>
                          )}
                          {invoice.status === 'PAID' && (
                            <p className="text-xs text-emerald-600 font-medium">Fully Paid</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Billing Period</p>
                          <p className="text-xs">{formatDate(invoice.billingPeriodStart)}</p>
                          <p className="text-xs text-slate-400">to {formatDate(invoice.billingPeriodEnd)}</p>
                        </div>
                      </div>

                      {/* Credit Notes info */}
                      {(invoice.totalCreditAmount || 0) > 0 && (
                        <div className="mt-2 ml-7 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                          <p className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                            <MinusCircle className="h-3 w-3" />
                            Credit: -{formatCurrency(invoice.totalCreditAmount)}
                          </p>
                          <p className="text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                            Net: {formatCurrency(invoice.netPayableAmount || (invoice.grandTotal - invoice.totalCreditAmount))}
                          </p>
                        </div>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center justify-between mt-3 ml-7">
                        {/* Payments toggle */}
                        <div>
                          {paymentCount > 0 ? (
                            <button
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium"
                            >
                              <Receipt className="h-3 w-3" />
                              {paymentCount} Payment{paymentCount > 1 ? 's' : ''}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">No payments</span>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                            title="View Invoice"
                          >
                            <Eye size={14} className="text-slate-600 dark:text-slate-400" />
                          </button>
                          {paymentCount > 0 && (
                            <button
                              onClick={() => handleGenerateReceipt(invoice)}
                              className="p-2 rounded-lg border border-emerald-200 hover:bg-emerald-50"
                              title="Generate Receipt"
                            >
                              <Receipt size={14} className="text-emerald-600" />
                            </button>
                          )}
                          {invoice.status !== 'CANCELLED' && (invoice.totalCreditAmount || 0) > 0 && (
                            <button
                              onClick={() => handleViewCreditNotes(invoice)}
                              className="relative p-2 rounded-lg border border-orange-200 hover:bg-orange-50"
                              title="View Credit Notes"
                            >
                              <FileX size={14} className="text-orange-600" />
                              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-orange-500 rounded-full">
                                {invoice.creditNotes?.length || '·'}
                              </span>
                            </button>
                          )}
                          {invoice.status !== 'CANCELLED' && getMaxAllowableCredit(invoice) > 0 && !invoice.invoiceNumber?.startsWith('OTC/') && (
                            <button
                              onClick={() => handleOpenCreditNoteModal(invoice)}
                              className="p-2 rounded-lg border border-red-200 hover:bg-red-50"
                              title="Issue Credit Note"
                            >
                              <MinusCircle size={14} className="text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Payment History */}
                      {isExpanded && paymentCount > 0 && (
                        <div className="mt-3 ml-7 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <History className="h-3.5 w-3.5 text-emerald-600" />
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment History</h4>
                          </div>
                          <div className="space-y-2">
                            {invoice.payments.map((payment, idx) => (
                              <div
                                key={payment.id || idx}
                                className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-600">#{idx + 1}</span>
                                    <div>
                                      <p className="text-xs font-medium text-orange-600">{payment.receiptNumber}</p>
                                      <p className="text-[10px] text-slate-500">{formatDate(payment.paymentDate || payment.createdAt)}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                                    {payment.tdsAmount > 0 && (
                                      <p className="text-[10px] text-slate-500">TDS: {formatCurrency(payment.tdsAmount)}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">
                                    {getPaymentModeLabel(payment.paymentMode)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs text-slate-500">{paymentCount} payment{paymentCount > 1 ? 's' : ''}</span>
                            <span className="text-sm font-bold text-emerald-600">{formatCurrency(invoice.totalPaidAmount || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          </>
        )}
      </div>

      {/* Payment Modal - New Partial Payment Flow */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClosePaymentModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 z-10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Record Payment</h2>
              <button onClick={handleClosePaymentModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Customer Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-medium text-slate-900 dark:text-white">{customer?.companyName}</p>
                    <p className="text-sm text-orange-600">{customer?.customerUsername}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Selected Invoices</p>
                    <p className="text-2xl font-bold text-orange-600">{selectedInvoices.length}</p>
                  </div>
                </div>
              </div>

              {/* Invoice Selector */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <Label htmlFor="invoiceSelect" className="text-orange-800 dark:text-orange-300">
                  Select Invoice to Pay <span className="text-red-500">*</span>
                </Label>
                <select
                  id="invoiceSelect"
                  value={currentInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Invoice</option>
                  {availableForPayment.map(invoice => {
                    const hasCreditNote = (invoice.totalCreditAmount || 0) > 0;
                    return (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {formatCurrency(invoice.remainingAmount ?? invoice.grandTotal)} remaining
                        {invoice.status === 'PARTIALLY_PAID' ? ' (Partial)' : ''}
                        {hasCreditNote ? ' [Credit Note Applied]' : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Selected Invoice Details */}
                {currentInvoice && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Invoice Total:</span>
                        <span className="font-medium">{formatCurrency(currentInvoice.grandTotal)}</span>
                      </div>

                      {/* Credit Note Information */}
                      {(currentInvoice.totalCreditAmount || 0) > 0 && (
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex justify-between text-red-700 dark:text-red-400">
                            <span className="flex items-center gap-1">
                              <MinusCircle className="h-3 w-3" />
                              Credit Note Applied:
                            </span>
                            <span className="font-medium">-{formatCurrency(currentInvoice.totalCreditAmount)}</span>
                          </div>
                          {currentInvoice.creditNoteImpact && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {currentInvoice.creditNoteImpact}
                            </p>
                          )}
                          {currentInvoice.creditNotes && currentInvoice.creditNotes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {currentInvoice.creditNotes.map((cn, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-red-600 dark:text-red-400">
                                  <span>{cn.creditNoteNumber} - {cn.reasonLabel || cn.reason?.replace(/_/g, ' ')}</span>
                                  <span>{formatCurrency(cn.totalAmount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between mt-2 pt-2 border-t border-red-200 dark:border-red-700 font-medium">
                            <span className="text-slate-700 dark:text-slate-300">Net Payable:</span>
                            <span className="text-orange-700 dark:text-orange-400">
                              {formatCurrency(currentInvoice.netPayableAmount || (currentInvoice.grandTotal - (currentInvoice.totalCreditAmount || 0)))}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-slate-500">Already Paid:</span>
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(currentInvoice.totalPaidAmount || 0)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Remaining Balance:</span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(currentInvoiceRemaining)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Form */}
              {currentInvoice && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Payment Details
                  </h3>

                  {/* Use Advance Payment Option */}
                  {advanceBalance.advanceAvailable > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentForm.useAdvancePayment}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPaymentForm(prev => ({
                              ...prev,
                              useAdvancePayment: checked,
                              advanceAmount: checked ? Math.min(advanceBalance.advanceAvailable, currentInvoiceRemaining).toString() : '',
                              paymentMode: checked ? '' : prev.paymentMode,
                              paidAmount: checked ? '' : prev.paidAmount
                            }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Use Advance Payment
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-500">
                            Available: {formatCurrency(advanceBalance.advanceAvailable)}
                          </p>
                        </div>
                      </label>

                      {/* Advance Amount Input */}
                      {paymentForm.useAdvancePayment && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                          <Label htmlFor="advanceAmount" className="text-blue-700 dark:text-blue-400">
                            Amount from Advance <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="advanceAmount"
                            type="number"
                            value={paymentForm.advanceAmount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const maxAdvance = Math.min(advanceBalance.advanceAvailable, currentInvoiceRemaining);
                              setPaymentForm(prev => ({
                                ...prev,
                                advanceAmount: Math.min(val, maxAdvance).toString()
                              }));
                            }}
                            placeholder="Enter amount to use"
                            className="mt-1 bg-white dark:bg-slate-700"
                            max={Math.min(advanceBalance.advanceAvailable, currentInvoiceRemaining)}
                          />
                          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                            Max: {formatCurrency(Math.min(advanceBalance.advanceAvailable, currentInvoiceRemaining))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regular Payment Options - Hidden when using full advance */}
                  {(!paymentForm.useAdvancePayment || parseFloat(paymentForm.advanceAmount || 0) < currentInvoiceRemaining) && (
                  <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Payment Mode */}
                    <div>
                      <Label htmlFor="paymentMode">Payment Mode {!paymentForm.useAdvancePayment && <span className="text-red-500">*</span>}</Label>
                      <select
                        id="paymentMode"
                        value={paymentForm.paymentMode}
                        onChange={(e) => handlePaymentModeChange(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        disabled={paymentForm.useAdvancePayment && parseFloat(paymentForm.advanceAmount || 0) >= currentInvoiceRemaining}
                      >
                        <option value="">Select Mode</option>
                        {PAYMENT_MODES.map(mode => (
                          <option key={mode.value} value={mode.value}>{mode.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Bank Account - Show for CHEQUE/NEFT/ONLINE */}
                    {['CHEQUE', 'NEFT', 'ONLINE'].includes(paymentForm.paymentMode) && (
                      <div>
                        <Label htmlFor="bankAccount">
                          {paymentForm.paymentMode === 'ONLINE' ? 'Payment Gateway' : 'Bank Account'} <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="bankAccount"
                          value={paymentForm.bankAccount}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select {paymentForm.paymentMode === 'ONLINE' ? 'Gateway' : 'Bank'}</option>
                          {paymentForm.paymentMode === 'ONLINE'
                            ? ONLINE_PAYMENT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))
                            : BANK_ACCOUNTS.map(bank => (
                                <option key={bank.value} value={bank.value}>{bank.label}</option>
                              ))
                          }
                        </select>
                      </div>
                    )}

                    {/* Provisional Receipt No - Show when not showing bank */}
                    {!['CHEQUE', 'NEFT', 'ONLINE'].includes(paymentForm.paymentMode) && (
                      <div>
                        <Label htmlFor="provisionalReceiptNo">Reference No</Label>
                        <Input
                          id="provisionalReceiptNo"
                          value={paymentForm.provisionalReceiptNo}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, provisionalReceiptNo: e.target.value }))}
                          placeholder="Optional"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Provisional Receipt - Show in separate row when bank is shown */}
                  {['CHEQUE', 'NEFT', 'ONLINE'].includes(paymentForm.paymentMode) && (
                    <div>
                      <Label htmlFor="provisionalReceiptNo">Reference / Transaction No</Label>
                      <Input
                        id="provisionalReceiptNo"
                        value={paymentForm.provisionalReceiptNo}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, provisionalReceiptNo: e.target.value }))}
                        placeholder="Enter transaction reference"
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amount Received - Not required for TDS or Advance only */}
                    <div>
                      <Label htmlFor="paidAmount">
                        Amount Received {!paymentForm.useAdvancePayment && paymentForm.paymentMode !== 'TDS' && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        value={paymentForm.paidAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder={paymentForm.paymentMode === 'TDS' ? 'Optional (0 for TDS only)' : 'Enter amount'}
                        className="mt-1"
                        disabled={paymentForm.paymentMode === 'TDS' || (paymentForm.useAdvancePayment && parseFloat(paymentForm.advanceAmount || 0) >= currentInvoiceRemaining)}
                        max={currentInvoiceRemaining - (parseFloat(paymentForm.advanceAmount) || 0)}
                        min={0}
                      />
                      {paymentForm.paymentMode !== 'TDS' && (
                        <p className="text-xs text-slate-500 mt-1">
                          Max: {formatCurrency(currentInvoiceRemaining - (parseFloat(paymentForm.advanceAmount) || 0))}
                        </p>
                      )}
                    </div>

                    {/* TDS Amount */}
                    <div>
                      <Label htmlFor="tdsAmount">
                        TDS Amount {paymentForm.paymentMode === 'TDS' && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="tdsAmount"
                        type="number"
                        value={paymentForm.tdsAmount}
                        onChange={(e) => handleTdsChange(e.target.value)}
                        placeholder={paymentForm.paymentMode === 'TDS' ? 'Enter TDS amount' : '0'}
                        className="mt-1"
                        max={currentInvoiceRemaining - (parseFloat(paymentForm.advanceAmount) || 0) - (parseFloat(paymentForm.paidAmount) || 0)}
                        min={0}
                      />
                      {paymentForm.paymentMode === 'TDS' && (
                        <p className="text-xs text-slate-500 mt-1">
                          Max: {formatCurrency(currentInvoiceRemaining - (parseFloat(paymentForm.advanceAmount) || 0))}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Transaction Date */}
                    <div>
                      <Label htmlFor="transactionDate">Transaction Date</Label>
                      <Input
                        id="transactionDate"
                        type="date"
                        value={paymentForm.transactionDate}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    {/* Remark */}
                    <div>
                      <Label htmlFor="paymentRemark">Remark</Label>
                      <Input
                        id="paymentRemark"
                        value={paymentForm.paymentRemark}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentRemark: e.target.value }))}
                        placeholder="Optional note"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  </>
                  )}

                  {/* Payment Summary */}
                  <div className={`p-3 rounded-lg ${paymentValidation.isValid ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200'}`}>
                    <div className="space-y-1">
                      {paymentValidation.advanceAmount > 0 && (
                        <div className="flex items-center justify-between text-sm text-blue-600">
                          <span>From Advance:</span>
                          <span className="font-medium">{formatCurrency(paymentValidation.advanceAmount)}</span>
                        </div>
                      )}
                      {paymentValidation.paidAmount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span>Amount Received:</span>
                          <span className="font-medium">{formatCurrency(paymentValidation.paidAmount)}</span>
                        </div>
                      )}
                      {paymentValidation.tdsAmount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span>TDS:</span>
                          <span className="font-medium">{formatCurrency(paymentValidation.tdsAmount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-200 dark:border-slate-600">
                        <span className="font-medium">Total Payment:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(paymentValidation.totalPayment)}
                        </span>
                      </div>
                    </div>
                    {paymentValidation.exceedsRemaining && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Exceeds remaining balance!
                      </p>
                    )}
                    {paymentValidation.totalPayment > 0 && paymentValidation.totalPayment < currentInvoiceRemaining && (
                      <p className="text-xs text-amber-600 mt-1">
                        Partial payment - {formatCurrency(currentInvoiceRemaining - paymentValidation.totalPayment)} will remain
                      </p>
                    )}
                  </div>

                  {/* Add Payment Button */}
                  <Button
                    onClick={handleAddPayment}
                    disabled={isProcessingPayment || !paymentValidation.isValid}
                    className="w-full bg-orange-600 text-white hover:bg-orange-700"
                  >
                    {isProcessingPayment ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4 mr-2" /> Add Payment</>
                    )}
                  </Button>
                </div>
              )}

              {/* Session Payments Summary */}
              {sessionPayments.length > 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Payments Added ({sessionPayments.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sessionPayments.map((payment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-emerald-100 dark:border-emerald-900">
                        <div>
                          <p className="text-sm font-medium">{payment.invoiceNumber}</p>
                          <p className="text-xs text-emerald-600">{payment.receiptNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(payment.amount + payment.tdsAmount)}</p>
                          <p className="text-xs text-slate-500">{payment.paymentMode}</p>
                        </div>
                        {payment.isFullyPaid && (
                          <Badge className="bg-emerald-100 text-emerald-700 ml-2">Paid</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs sm:text-sm text-slate-500">
                {sessionPayments.length > 0 ? (
                  <span>Total: {formatCurrency(sessionPayments.reduce((sum, p) => sum + p.amount + p.tdsAmount, 0))}</span>
                ) : (
                  <span>Select invoice and add payment</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleClosePaymentModal}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:overflow-visible print:shadow-none">
            {/* Print-hidden header */}
            <div className="flex-shrink-0 bg-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b print:hidden z-10 rounded-t-xl sm:rounded-t-xl">
              <h2 className="text-base sm:text-lg font-bold truncate mr-2">Invoice: {selectedInvoice.invoiceNumber}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={handlePrintInvoice}>
                  <Printer size={14} className="mr-1" /> Print
                </Button>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-4" id="invoice-content">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="inline-block bg-cyan-500 text-white px-8 py-2 text-xl font-bold tracking-wide">
                  TAX INVOICE
                </div>
              </div>

              {/* Logo and Company Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 60 60" className="w-12 h-12 sm:w-16 sm:h-16">
                      <circle cx="20" cy="30" r="8" fill="#F97316" />
                      <circle cx="30" cy="18" r="8" fill="#22C55E" />
                      <circle cx="40" cy="30" r="8" fill="#3B82F6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-cyan-600">GAZON</p>
                    <p className="text-xs text-slate-500 tracking-widest">COMMUNICATIONS INDIA LTD</p>
                  </div>
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 border border-slate-200 rounded flex items-center justify-center bg-slate-50 flex-shrink-0">
                  <span className="text-xs text-slate-400">QR Code</span>
                </div>
              </div>

              {/* Company Address */}
              <div className="text-sm text-slate-700 mb-4">
                <p className="font-bold">GAZON COMMUNICATIONS INDIA LIMITED</p>
                <p><strong>ADDRESS:</strong> Office No. 1001, 10th Floor, City Avenue, Kolte Patil</p>
                <p>Devlopers, Wakad, Pune 411057.</p>
                <p><strong>STATE:</strong> Maharashtra <strong>STATE CODE:</strong> 27</p>
                <p><strong>TEL:</strong> (+91) 20 4690 6782</p>
                <p><strong>MOB NO:</strong> 7030938375</p>
                <p><strong>EMAIL:</strong> accounts@gazonindia.com</p>
              </div>

              {/* Invoice Details Section */}
              <div className="border-t-2 border-b border-slate-300 py-3 mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>INVOICE NO:</strong> {selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>INVOICE DATE:</strong> {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>PO NO:</strong> {selectedInvoice.poNumber || customer?.poNumber || '-'}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>DUE DATE:</strong> {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="border-b border-slate-300 py-2 mb-2">
                <p className="text-sm border-b border-slate-200 py-1"><strong>COMPANY NAME:</strong> {selectedInvoice.companyName || customer?.companyName || '-'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>BILLING ADDRESS:</strong> {selectedInvoice.billingAddress || customer?.billingAddress || '-'}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>INSTALLATION ADDRESS:</strong> {selectedInvoice.installationAddress || customer?.installationAddress || '-'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>BUYERS GST NO:</strong> {selectedInvoice.buyerGstNo || customer?.customerGstNo || '-'}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>USERNAME:</strong> {selectedInvoice.customerUsername || customer?.customerUsername || '-'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>CONTACT:</strong> {selectedInvoice.contactPhone || customer?.contactPhone || '-'}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>EMAIL:</strong> {selectedInvoice.contactEmail || customer?.contactEmail || '-'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>ACKNOWLEDGMENT NO:</strong> {selectedInvoice.acknowledgementNo || '-'}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>ACKNOWLEDGMENT DATE:</strong> {selectedInvoice.acknowledgementDate ? new Date(selectedInvoice.acknowledgementDate).toLocaleString('en-IN') : '-'}</p>
                </div>
                <p className="text-sm py-1"><strong>IRN NO:</strong></p>
                <p className="text-xs text-slate-600 break-all">{selectedInvoice.irnNumber || '-'}</p>
              </div>

              {/* Invoice Summary Header */}
              <div className="text-center py-2 border-b border-slate-300 mb-2">
                <h3 className="font-bold text-slate-800">INVOICE SUMMARY</h3>
              </div>

              {/* Invoice Summary Table */}
              <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-2 text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-cyan-500 text-white">
                    <th className="border border-cyan-600 px-2 py-2 text-center w-10">Sr</th>
                    <th className="border border-cyan-600 px-2 py-2 text-left">Description OF Goods / Services</th>
                    <th className="border border-cyan-600 px-2 py-2 text-center">HSN / SAC</th>
                    <th className="border border-cyan-600 px-2 py-2 text-center">Plan Duration</th>
                    <th className="border border-cyan-600 px-2 py-2 text-center">Amount</th>
                    <th className="border border-cyan-600 px-2 py-2 text-center">Discount</th>
                    <th className="border border-cyan-600 px-2 py-2 text-center">GST (18%)</th>
                    <th className="border border-cyan-600 px-2 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2 text-center">1</td>
                    <td className="border border-slate-300 px-2 py-2">{selectedInvoice.planName}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{selectedInvoice.hsnSacCode}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center text-xs">
                      {new Date(selectedInvoice.billingPeriodStart).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')} To {new Date(selectedInvoice.billingPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(selectedInvoice.baseAmount)}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(selectedInvoice.discountAmount || 0)}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(selectedInvoice.totalGstAmount)}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(selectedInvoice.grandTotal)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2 text-center">2</td>
                    <td className="border border-slate-300 px-2 py-2">Internet Leased Line</td>
                    <td className="border border-slate-300 px-2 py-2 text-center"></td>
                    <td className="border border-slate-300 px-2 py-2 text-center"></td>
                    <td className="border border-slate-300 px-2 py-2 text-center"></td>
                    <td className="border border-slate-300 px-2 py-2 text-center"></td>
                    <td className="border border-slate-300 px-2 py-2 text-center"></td>
                    <td className="border border-slate-300 px-2 py-2 text-center"></td>
                  </tr>
                  <tr className="font-bold">
                    <td className="border border-slate-300 px-2 py-2" colSpan="7">Grand Total:</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{Math.round(selectedInvoice.grandTotal)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2" colSpan="8">
                      <strong>Rupees in Words:-</strong> {numberToWords(selectedInvoice.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Tax Summary Table */}
              <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-4 text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-orange-400 text-white">
                    <th className="border border-orange-500 px-3 py-2" rowSpan="2">Tax Summary</th>
                    <th className="border border-orange-500 px-3 py-2">HSN/SAC</th>
                    <th className="border border-orange-500 px-3 py-2">Taxable Value</th>
                    <th className="border border-orange-500 px-3 py-2">SGST (9%)</th>
                    <th className="border border-orange-500 px-3 py-2">CGST (9%)</th>
                    <th className="border border-orange-500 px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-orange-100">
                    <td className="border border-orange-300 px-3 py-2 font-medium text-center"></td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{selectedInvoice.hsnSacCode}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{Math.round(selectedInvoice.taxableAmount)}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{selectedInvoice.sgstAmount?.toFixed(1)}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{selectedInvoice.cgstAmount?.toFixed(1)}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{Math.round(selectedInvoice.totalGstAmount)}</td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Credit Notes Section (if any) */}
              {(selectedInvoice.totalCreditAmount > 0 || selectedInvoice.creditNotes?.length > 0) && (
                <div className="mb-4 p-4 rounded-lg border bg-red-50 border-red-200">
                  <h4 className="font-bold flex items-center gap-2 text-red-800 mb-3">
                    <MinusCircle className="h-5 w-5" />
                    Credit Notes Applied
                    <Badge className="bg-red-100 text-red-700 ml-2">
                      Total: {formatCurrency(selectedInvoice.totalCreditAmount || 0)}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3 p-3 bg-white rounded border">
                    <div>
                      <p className="text-slate-500">Invoice Total</p>
                      <p className="font-bold">{formatCurrency(selectedInvoice.grandTotal)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Credit Applied</p>
                      <p className="font-bold text-red-600">-{formatCurrency(selectedInvoice.totalCreditAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Net Payable</p>
                      <p className="font-bold text-orange-600">
                        {formatCurrency(selectedInvoice.grandTotal - (selectedInvoice.totalCreditAmount || 0))}
                      </p>
                    </div>
                  </div>
                  {selectedInvoice.creditNotes && selectedInvoice.creditNotes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 uppercase">Credit Note Records</p>
                      {selectedInvoice.creditNotes.map((cn, idx) => (
                        <div key={cn.id || idx} className="p-2 bg-white rounded border text-sm flex justify-between items-center">
                          <div>
                            <span className="font-medium text-red-600">{cn.creditNoteNumber}</span>
                            <span className="ml-2 text-xs text-slate-500">{formatDate(cn.creditNoteDate || cn.createdAt)}</span>
                            <span className="ml-2 text-xs text-slate-400">
                              ({CREDIT_NOTE_REASONS.find(r => r.value === cn.reason)?.label || cn.reason})
                            </span>
                          </div>
                          <span className="font-bold text-red-600">-{formatCurrency(cn.totalAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Details (if has payments) */}
              {(selectedInvoice.status === 'PAID' || selectedInvoice.status === 'PARTIALLY_PAID' || selectedInvoice.payments?.length > 0) && (
                <div className={`mb-4 p-4 rounded-lg border ${selectedInvoice.status === 'PAID' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-bold flex items-center gap-2 ${selectedInvoice.status === 'PAID' ? 'text-emerald-800' : 'text-amber-800'}`}>
                      <CheckCircle className="h-5 w-5" />
                      Payment History
                      {selectedInvoice.status === 'PARTIALLY_PAID' && (
                        <Badge className="bg-amber-100 text-amber-700 ml-2">Partial</Badge>
                      )}
                    </h4>
                    {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700 print:hidden"
                        onClick={() => {
                          setShowViewModal(false);
                          handleGenerateReceipt(selectedInvoice);
                        }}
                      >
                        <Receipt className="h-3 w-3 mr-1" />
                        Generate Receipt
                      </Button>
                    )}
                  </div>

                  {/* Payment Summary */}
                  <div className={`grid ${(selectedInvoice.totalCreditAmount || 0) > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} gap-4 text-sm mb-4 p-3 bg-white rounded border`}>
                    <div>
                      <p className="text-slate-500">Invoice Total</p>
                      <p className="font-bold">{formatCurrency(selectedInvoice.grandTotal)}</p>
                    </div>
                    {(selectedInvoice.totalCreditAmount || 0) > 0 && (
                      <div>
                        <p className="text-slate-500">Credit Notes</p>
                        <p className="font-bold text-red-600">-{formatCurrency(selectedInvoice.totalCreditAmount)}</p>
                        <p className="text-xs text-orange-600">
                          Net: {formatCurrency(selectedInvoice.netPayableAmount || (selectedInvoice.grandTotal - selectedInvoice.totalCreditAmount))}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-500">Total Paid</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(selectedInvoice.totalPaidAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Remaining</p>
                      <p className={`font-bold ${selectedInvoice.remainingAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {formatCurrency(selectedInvoice.remainingAmount ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Individual Payments */}
                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600 uppercase">Payment Records</p>
                      {selectedInvoice.payments.map((payment, idx) => (
                        <div key={payment.id || idx} className="p-3 bg-white rounded border text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-orange-600">{payment.receiptNumber}</p>
                              <p className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(payment.amount)}</p>
                              {payment.tdsAmount > 0 && (
                                <p className="text-xs text-slate-500">TDS: {formatCurrency(payment.tdsAmount)}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <Badge className="bg-slate-100 text-slate-600">{getPaymentModeLabel(payment.paymentMode)}</Badge>
                            {payment.bankAccount && <span>Bank: {getBankAccountName(payment.bankAccount)}</span>}
                            {payment.provisionalReceiptNo && <span>Ref: {payment.provisionalReceiptNo}</span>}
                            {payment.remark && <span>• {payment.remark}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedInvoice.paymentMode || selectedInvoice.paidAmount ? (
                    /* Legacy single payment display - only show if there's actual payment data */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Payment Mode:</strong> {getPaymentModeLabel(selectedInvoice.paymentMode) || '-'}</p>
                        <p><strong>Receipt No:</strong> {selectedInvoice.provisionalReceiptNo || '-'}</p>
                        <p><strong>Amount Received:</strong> {formatCurrency(selectedInvoice.paidAmount)}</p>
                        <p><strong>TDS Amount:</strong> {selectedInvoice.tdsAmount ? formatCurrency(selectedInvoice.tdsAmount) : '-'}</p>
                      </div>
                      <div>
                        <p><strong>Transaction Date:</strong> {selectedInvoice.transactionDate ? formatDate(selectedInvoice.transactionDate) : '-'}</p>
                        <p><strong>Paid On:</strong> {formatDate(selectedInvoice.paidAt)}</p>
                        {selectedInvoice.paymentRemark && <p><strong>Remark:</strong> {selectedInvoice.paymentRemark}</p>}
                      </div>
                    </div>
                  ) : (
                    /* No payment details available - show a simple message */
                    <div className="p-3 bg-white rounded border text-sm text-center">
                      <p className="text-slate-600">
                        <CheckCircle className="h-4 w-4 inline mr-2 text-emerald-500" />
                        Payment of <strong className="text-emerald-600">{formatCurrency(selectedInvoice.totalPaidAmount || selectedInvoice.grandTotal)}</strong> recorded
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedInvoice.paidAt ? `Paid on ${formatDate(selectedInvoice.paidAt)}` : 'Payment details not available'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="text-sm mb-4">
                <p className="font-bold">Notes:</p>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 mt-1">
                  <li>This is a computer generated invoice</li>
                  <li>Payment is due within the specified due date</li>
                  <li>For any queries, please contact accounts@gazonindia.com</li>
                </ol>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-300 text-center text-xs text-slate-500">
                <p>Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReceiptModal(false)} />
          <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:overflow-visible print:shadow-none">
            {/* Print-hidden header */}
            <div className="flex-shrink-0 bg-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b print:hidden z-10 rounded-t-xl sm:rounded-t-xl">
              <h2 className="text-base sm:text-lg font-bold">Payment Receipt</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={handlePrintReceipt}>
                  <Printer size={14} className="mr-1" /> Print
                </Button>
                <button onClick={() => setShowReceiptModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-8 print:p-6" id="receipt-content">
              {/* Header with Company Info */}
              <div className="border-b-2 border-emerald-500 pb-4 sm:pb-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <svg viewBox="0 0 60 60" className="w-16 h-16">
                        <circle cx="20" cy="30" r="8" fill="#F97316" />
                        <circle cx="30" cy="18" r="8" fill="#22C55E" />
                        <circle cx="40" cy="30" r="8" fill="#3B82F6" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-emerald-600">GAZON</h1>
                      <p className="text-xs text-slate-500 tracking-widest">COMMUNICATIONS INDIA LTD</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-emerald-500 text-white px-6 py-2 text-lg font-bold tracking-wide rounded">
                      PAYMENT RECEIPT
                    </div>
                  </div>
                </div>

                {/* Company Address */}
                <div className="mt-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">GAZON COMMUNICATIONS INDIA LIMITED</p>
                  <p>Office No. 1001, 10th Floor, City Avenue, Kolte Patil Developers, Wakad, Pune 411057</p>
                  <p>Tel: (+91) 20 4690 6782 | Mobile: 7030938375 | Email: accounts@gazonindia.com</p>
                  <p>GSTIN: 27AAJCG0847A1ZJ | State: Maharashtra (27)</p>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Receipt Number</p>
                      <p className="font-bold text-emerald-700">{getReceiptNumber(receiptInvoice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Receipt Date</p>
                      <p className="font-medium">{formatDate(new Date())}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Invoice Number</p>
                      <p className="font-medium text-orange-700">{receiptInvoice.invoiceNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Invoice Date</p>
                      <p className="font-medium">{formatDate(receiptInvoice.invoiceDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  RECEIVED FROM
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Company Name</p>
                    <p className="font-semibold text-slate-800">{receiptInvoice.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Customer ID</p>
                    <p className="font-medium text-orange-600">{receiptInvoice.customerUsername || customer?.customerUsername || '-'}</p>
                  </div>
                  {receiptInvoice.billingAddress && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="text-sm">{receiptInvoice.billingAddress}</p>
                    </div>
                  )}
                  {(receiptInvoice.buyerGstNo || customer?.customerGstNo) && (
                    <div>
                      <p className="text-xs text-slate-500">GSTIN</p>
                      <p className="text-sm font-medium">{receiptInvoice.buyerGstNo || customer?.customerGstNo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Amount Summary */}
              <div className="bg-orange-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-orange-700 mb-3">INVOICE SUMMARY</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Invoice Amount</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(receiptInvoice.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(getTotalPayments(receiptInvoice))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Balance</p>
                    <p className={`text-lg font-bold ${(receiptInvoice.remainingAmount || 0) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {formatCurrency(receiptInvoice.remainingAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details Table */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  PAYMENT DETAILS
                  {receiptInvoice.payments && receiptInvoice.payments.length > 1 && (
                    <Badge className="bg-emerald-100 text-emerald-700 ml-2">
                      {receiptInvoice.payments.length} Payments
                    </Badge>
                  )}
                </h3>

                <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-emerald-500 text-white">
                      <th className="border border-emerald-600 px-2 py-2 text-center w-8">#</th>
                      <th className="border border-emerald-600 px-2 py-2 text-left">Receipt No.</th>
                      <th className="border border-emerald-600 px-2 py-2 text-center">Date</th>
                      <th className="border border-emerald-600 px-2 py-2 text-center">Mode</th>
                      <th className="border border-emerald-600 px-2 py-2 text-right">Amount</th>
                      <th className="border border-emerald-600 px-2 py-2 text-right">TDS</th>
                      <th className="border border-emerald-600 px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptInvoice.payments && receiptInvoice.payments.length > 0 ? (
                      receiptInvoice.payments.map((payment, idx) => (
                        <tr key={payment.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="border border-slate-200 px-2 py-2 text-center font-medium">{idx + 1}</td>
                          <td className="border border-slate-200 px-2 py-2 font-medium text-orange-600 text-xs">{payment.receiptNumber}</td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-xs">{formatDate(payment.paymentDate || payment.createdAt)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-center text-xs">{getPaymentModeLabel(payment.paymentMode)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right">{formatCurrency(payment.amount)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right">{payment.tdsAmount > 0 ? formatCurrency(payment.tdsAmount) : '-'}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right font-medium">{formatCurrency((payment.amount || 0) + (payment.tdsAmount || 0))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="border border-slate-200 px-2 py-4 text-center text-slate-500">
                          No payment records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {receiptInvoice.payments && receiptInvoice.payments.length > 0 && (
                    <tfoot>
                      <tr className="bg-emerald-50 font-bold">
                        <td colSpan="4" className="border border-slate-200 px-2 py-2 text-right">TOTAL:</td>
                        <td className="border border-slate-200 px-2 py-2 text-right">
                          {formatCurrency(receiptInvoice.payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right">
                          {formatCurrency(receiptInvoice.payments.reduce((sum, p) => sum + (p.tdsAmount || 0), 0))}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">
                          {formatCurrency(getTotalPayments(receiptInvoice))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <p className="text-sm">
                  <span className="font-semibold text-emerald-800">Amount in Words: </span>
                  <span className="text-slate-700">Rupees {numberToWords(getTotalPayments(receiptInvoice))}</span>
                </p>
              </div>

              {/* Reference Details */}
              {receiptInvoice.payments && receiptInvoice.payments.some(p => p.provisionalReceiptNo || p.remark) && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Additional Details</h3>
                  <div className="space-y-2 text-sm">
                    {receiptInvoice.payments.map((payment, idx) => (
                      (payment.provisionalReceiptNo || payment.remark) && (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="font-medium text-orange-600">#{idx + 1}:</span>
                          {payment.provisionalReceiptNo && <span>Ref: {payment.provisionalReceiptNo}</span>}
                          {payment.provisionalReceiptNo && payment.remark && <span>•</span>}
                          {payment.remark && <span className="text-slate-600">{payment.remark}</span>}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t-2 border-slate-200 pt-6 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Notes:</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• This is a computer generated receipt</li>
                      <li>• Subject to realization of cheque/payment</li>
                      <li>• For any queries: accounts@gazonindia.com</li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <div className="inline-block border-t-2 border-slate-400 pt-2 mt-4 sm:mt-8">
                      <p className="text-sm font-semibold text-slate-700">Authorized Signatory</p>
                      <p className="text-xs text-slate-500">GAZON COMMUNICATIONS INDIA LTD</p>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-6 pt-4 border-t border-slate-200">
                  <p className="text-sm text-emerald-600 font-medium">Thank you for your payment!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Credit Note Modal */}
      {showCreditNoteModal && creditNoteInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreditNoteModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MinusCircle className="h-5 w-5 text-red-500" />
                Create Credit Note
              </h2>
              <button onClick={() => setShowCreditNoteModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Invoice Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Invoice</p>
                    <p className="font-medium text-orange-600">{creditNoteInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Company</p>
                    <p className="font-medium">{creditNoteInvoice.companyName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Invoice Total</p>
                    <p className="font-bold">{formatCurrency(creditNoteInvoice.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Max Credit Allowable</p>
                    <p className="font-bold text-red-600">{formatCurrency(getMaxAllowableCredit(creditNoteInvoice))}</p>
                  </div>
                </div>
                {(creditNoteInvoice.totalCreditAmount || 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Existing credit notes: {formatCurrency(creditNoteInvoice.totalCreditAmount)}
                    </p>
                  </div>
                )}
              </div>

              {/* Advance Payment Notice for PAID invoices */}
              {creditNoteInvoice.status === 'PAID' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <IndianRupee className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Advance Payment Notice
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        This invoice is already paid. The credit note amount will be added to the customer's advance payment balance, which can be settled against future invoices.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Note Form */}
              <div className="space-y-4">
                {/* Reason */}
                <div>
                  <Label htmlFor="cnReason">Reason <span className="text-red-500">*</span></Label>
                  <select
                    id="cnReason"
                    value={creditNoteForm.reason}
                    onChange={(e) => setCreditNoteForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Reason</option>
                    {CREDIT_NOTE_REASONS.map(reason => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                </div>

                {/* Base Amount */}
                <div>
                  <Label htmlFor="cnBaseAmount">Base Amount (excl. GST) <span className="text-red-500">*</span></Label>
                  <Input
                    id="cnBaseAmount"
                    type="number"
                    value={creditNoteForm.baseAmount}
                    onChange={(e) => setCreditNoteForm(prev => ({ ...prev, baseAmount: e.target.value }))}
                    placeholder="Enter base amount"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Max base amount: {formatCurrency(getMaxAllowableCredit(creditNoteInvoice) / 1.18)}
                  </p>
                </div>

                {/* GST Preview */}
                {creditNoteForm.baseAmount && parseFloat(creditNoteForm.baseAmount) > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Base Amount:</span>
                        <span className="ml-2 font-medium">{formatCurrency(parseFloat(creditNoteForm.baseAmount))}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">SGST (9%):</span>
                        <span className="ml-2 font-medium">{formatCurrency(parseFloat(creditNoteForm.baseAmount) * 0.09)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">CGST (9%):</span>
                        <span className="ml-2 font-medium">{formatCurrency(parseFloat(creditNoteForm.baseAmount) * 0.09)}</span>
                      </div>
                      <div className="font-bold">
                        <span className="text-red-700">Total Credit:</span>
                        <span className="ml-2 text-red-600">{formatCurrency(calculateCreditNoteTotal(creditNoteForm.baseAmount))}</span>
                      </div>
                    </div>
                    {calculateCreditNoteTotal(creditNoteForm.baseAmount) > getMaxAllowableCredit(creditNoteInvoice) && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Credit amount exceeds maximum allowable!
                      </p>
                    )}
                  </div>
                )}

                {/* Remarks */}
                <div>
                  <Label htmlFor="cnRemarks">Remarks</Label>
                  <textarea
                    id="cnRemarks"
                    value={creditNoteForm.remarks}
                    onChange={(e) => setCreditNoteForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Optional remarks..."
                    rows={2}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="outline" onClick={() => setShowCreditNoteModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCreditNote}
                disabled={isCreatingCreditNote || !creditNoteForm.reason || !creditNoteForm.baseAmount || calculateCreditNoteTotal(creditNoteForm.baseAmount) > getMaxAllowableCredit(creditNoteInvoice)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isCreatingCreditNote ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
                ) : (
                  <><MinusCircle className="h-4 w-4 mr-2" /> Create Credit Note</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Credit Notes Modal */}
      {showCreditNotesModal && creditNoteInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreditNotesModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 z-10">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate mr-2">
                <FileX className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span className="truncate">Credit Notes - {creditNoteInvoice.invoiceNumber}</span>
              </h2>
              <button onClick={() => setShowCreditNotesModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Credit Notes List */}
              {invoiceCreditNotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileX className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No credit notes found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoiceCreditNotes.map((cn) => (
                    <div
                      key={cn.id}
                      className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-red-300 hover:shadow-md transition-all"
                      onClick={() => {
                        setSelectedCreditNote({ ...cn, invoice: creditNoteInvoice });
                        setShowCreditNoteViewModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-red-600">{cn.creditNoteNumber}</p>
                          <p className="text-xs text-slate-500">{formatDate(cn.creditNoteDate || cn.createdAt)}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-bold text-lg text-red-600">-{formatCurrency(cn.totalAmount)}</p>
                            <Badge className={
                              cn.status === 'ISSUED' ? 'bg-blue-100 text-blue-700' :
                              cn.status === 'ADJUSTED' ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }>
                              {cn.status}
                            </Badge>
                          </div>
                          <Eye className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Reason:</span>
                            <span className="ml-1 font-medium">{CREDIT_NOTE_REASONS.find(r => r.value === cn.reason)?.label || cn.reason}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Base:</span>
                            <span className="ml-1">{formatCurrency(cn.baseAmount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">GST:</span>
                            <span className="ml-1">{formatCurrency(cn.totalGstAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs sm:text-sm text-slate-500">
                {invoiceCreditNotes.length} credit note{invoiceCreditNotes.length !== 1 ? 's' : ''} - Tap to view
              </div>
              <Button size="sm" onClick={() => setShowCreditNotesModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Document View Modal */}
      {showCreditNoteViewModal && selectedCreditNote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreditNoteViewModal(false)} />
          <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:overflow-visible print:shadow-none">
            {/* Print-hidden header */}
            <div className="flex-shrink-0 bg-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b print:hidden z-10 rounded-t-xl sm:rounded-t-xl">
              <h2 className="text-base sm:text-lg font-bold truncate mr-2">Credit Note: {selectedCreditNote.creditNoteNumber}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer size={14} className="mr-1" /> Print
                </Button>
                <button onClick={() => setShowCreditNoteViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Credit Note Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-4" id="creditnote-content">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="inline-block bg-red-500 text-white px-8 py-2 text-xl font-bold tracking-wide">
                  CREDIT NOTE
                </div>
              </div>

              {/* Logo and Company Info */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <svg viewBox="0 0 60 60" className="w-16 h-16">
                      <circle cx="20" cy="30" r="8" fill="#F97316" />
                      <circle cx="30" cy="18" r="8" fill="#22C55E" />
                      <circle cx="40" cy="30" r="8" fill="#3B82F6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">GAZON</p>
                    <p className="text-xs text-slate-500 tracking-widest">COMMUNICATIONS INDIA LTD</p>
                  </div>
                </div>
              </div>

              {/* Company Address */}
              <div className="text-sm text-slate-700 mb-4">
                <p className="font-bold">GAZON COMMUNICATIONS INDIA LIMITED</p>
                <p><strong>ADDRESS:</strong> Office No. 1001, 10th Floor, City Avenue, Kolte Patil</p>
                <p>Developers, Wakad, Pune 411057.</p>
                <p><strong>STATE:</strong> Maharashtra <strong>STATE CODE:</strong> 27</p>
                <p><strong>TEL:</strong> (+91) 20 4690 6782 | <strong>MOB:</strong> 7030938375</p>
                <p><strong>EMAIL:</strong> accounts@gazonindia.com | <strong>GSTIN:</strong> 27AAJCG0847A1ZJ</p>
              </div>

              {/* Credit Note Details Section */}
              <div className="border-t-2 border-b border-red-300 py-3 mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>CREDIT NOTE NO:</strong> {selectedCreditNote.creditNoteNumber}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>CREDIT NOTE DATE:</strong> {new Date(selectedCreditNote.creditNoteDate || selectedCreditNote.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>ORIGINAL INVOICE NO:</strong> {selectedCreditNote.invoice?.invoiceNumber}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>ORIGINAL INVOICE DATE:</strong> {selectedCreditNote.invoice?.invoiceDate ? new Date(selectedCreditNote.invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '-'}</p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="border-b border-slate-300 py-2 mb-2">
                <p className="text-sm border-b border-slate-200 py-1"><strong>COMPANY NAME:</strong> {selectedCreditNote.invoice?.companyName || customer?.companyName}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <p className="text-sm border-b border-slate-200 py-1"><strong>BILLING ADDRESS:</strong> {selectedCreditNote.invoice?.billingAddress || customer?.billingAddress || '-'}</p>
                  <p className="text-sm border-b border-slate-200 py-1"><strong>USERNAME:</strong> {selectedCreditNote.invoice?.customerUsername || customer?.customerUsername || '-'}</p>
                </div>
                <p className="text-sm border-b border-slate-200 py-1"><strong>BUYERS GST NO:</strong> {selectedCreditNote.invoice?.buyerGstNo || customer?.customerGstNo || '-'}</p>
              </div>

              {/* Credit Note Reason */}
              <div className="text-center py-2 border-b border-slate-300 mb-2">
                <h3 className="font-bold text-slate-800">CREDIT NOTE DETAILS</h3>
              </div>

              {/* Reason Section */}
              <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm"><strong>Reason for Credit Note:</strong> {CREDIT_NOTE_REASONS.find(r => r.value === selectedCreditNote.reason)?.label || selectedCreditNote.reason}</p>
                {selectedCreditNote.remarks && (
                  <p className="text-sm mt-2"><strong>Remarks:</strong> {selectedCreditNote.remarks}</p>
                )}
              </div>

              {/* Credit Note Summary Table */}
              <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-2 text-sm min-w-[550px]">
                <thead>
                  <tr className="bg-red-500 text-white">
                    <th className="border border-red-600 px-2 py-2 text-center w-10">Sr</th>
                    <th className="border border-red-600 px-2 py-2 text-left">Description</th>
                    <th className="border border-red-600 px-2 py-2 text-center">HSN / SAC</th>
                    <th className="border border-red-600 px-2 py-2 text-center">Base Amount</th>
                    <th className="border border-red-600 px-2 py-2 text-center">SGST (9%)</th>
                    <th className="border border-red-600 px-2 py-2 text-center">CGST (9%)</th>
                    <th className="border border-red-600 px-2 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2 text-center">1</td>
                    <td className="border border-slate-300 px-2 py-2">Credit Adjustment - {CREDIT_NOTE_REASONS.find(r => r.value === selectedCreditNote.reason)?.label || selectedCreditNote.reason}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{selectedCreditNote.invoice?.hsnSacCode || '998315'}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{formatCurrency(selectedCreditNote.baseAmount)}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{formatCurrency(selectedCreditNote.sgstAmount || (selectedCreditNote.totalGstAmount / 2))}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">{formatCurrency(selectedCreditNote.cgstAmount || (selectedCreditNote.totalGstAmount / 2))}</td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-bold text-red-600">{formatCurrency(selectedCreditNote.totalAmount)}</td>
                  </tr>
                  <tr className="font-bold bg-red-50">
                    <td className="border border-slate-300 px-2 py-2" colSpan="6">Total Credit Amount:</td>
                    <td className="border border-slate-300 px-2 py-2 text-center text-red-600">{formatCurrency(selectedCreditNote.totalAmount)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-2" colSpan="7">
                      <strong>Amount in Words:-</strong> Rupees {numberToWords(selectedCreditNote.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Tax Summary Table */}
              <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-4 text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-orange-400 text-white">
                    <th className="border border-orange-500 px-3 py-2">Tax Summary</th>
                    <th className="border border-orange-500 px-3 py-2">HSN/SAC</th>
                    <th className="border border-orange-500 px-3 py-2">Taxable Value</th>
                    <th className="border border-orange-500 px-3 py-2">SGST (9%)</th>
                    <th className="border border-orange-500 px-3 py-2">CGST (9%)</th>
                    <th className="border border-orange-500 px-3 py-2">Total GST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-orange-100">
                    <td className="border border-orange-300 px-3 py-2 font-medium text-center">Credit</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{selectedCreditNote.invoice?.hsnSacCode || '998315'}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{formatCurrency(selectedCreditNote.baseAmount)}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{formatCurrency(selectedCreditNote.sgstAmount || (selectedCreditNote.totalGstAmount / 2))}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{formatCurrency(selectedCreditNote.cgstAmount || (selectedCreditNote.totalGstAmount / 2))}</td>
                    <td className="border border-orange-300 px-3 py-2 text-center">{formatCurrency(selectedCreditNote.totalGstAmount)}</td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Original Invoice Reference */}
              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-bold text-sm mb-2">Original Invoice Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Invoice Total</p>
                    <p className="font-bold">{formatCurrency(selectedCreditNote.invoice?.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">This Credit Note</p>
                    <p className="font-bold text-red-600">-{formatCurrency(selectedCreditNote.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Net Payable After Credit</p>
                    <p className="font-bold text-orange-600">{formatCurrency((selectedCreditNote.invoice?.grandTotal || 0) - selectedCreditNote.totalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Terms & Signature */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-6 pt-4 border-t border-slate-300">
                <div>
                  <p className="text-xs font-bold mb-1">Terms & Conditions:</p>
                  <p className="text-xs text-slate-600">1. This credit note is issued as per GST regulations.</p>
                  <p className="text-xs text-slate-600">2. Credit will be adjusted against future invoices or refunded as applicable.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold mb-4 sm:mb-8">For GAZON COMMUNICATIONS INDIA LIMITED</p>
                  <p className="text-xs text-slate-600 border-t border-slate-400 pt-1 inline-block">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Payment Modal */}
      {showAdvancePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdvancePaymentModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                Record Advance Payment
              </h2>
              <button onClick={() => setShowAdvancePaymentModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Customer Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">{customer?.companyName}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500">{customer?.customerUsername}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Advance payment will be credited to customer ledger and can be adjusted against future invoices.
                </p>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Payment Mode */}
                  <div>
                    <Label htmlFor="advPaymentMode">Payment Mode <span className="text-red-500">*</span></Label>
                    <select
                      id="advPaymentMode"
                      value={advancePaymentForm.paymentMode}
                      onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, paymentMode: e.target.value, bankAccount: '' }))}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Mode</option>
                      {PAYMENT_MODES.filter(m => m.value !== 'TDS').map(mode => (
                        <option key={mode.value} value={mode.value}>{mode.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bank Account - Show for CHEQUE/NEFT/ONLINE */}
                  {['CHEQUE', 'NEFT', 'ONLINE'].includes(advancePaymentForm.paymentMode) && (
                    <div>
                      <Label htmlFor="advBankAccount">
                        {advancePaymentForm.paymentMode === 'ONLINE' ? 'Payment Gateway' : 'Bank Account'} <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="advBankAccount"
                        value={advancePaymentForm.bankAccount}
                        onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select {advancePaymentForm.paymentMode === 'ONLINE' ? 'Gateway' : 'Bank'}</option>
                        {advancePaymentForm.paymentMode === 'ONLINE'
                          ? ONLINE_PAYMENT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))
                          : BANK_ACCOUNTS.map(bank => (
                              <option key={bank.value} value={bank.value}>{bank.label}</option>
                            ))
                        }
                      </select>
                    </div>
                  )}

                  {/* Reference No - Show when not showing bank */}
                  {!['CHEQUE', 'NEFT', 'ONLINE'].includes(advancePaymentForm.paymentMode) && advancePaymentForm.paymentMode && (
                    <div>
                      <Label htmlFor="advRefNo">Reference No</Label>
                      <Input
                        id="advRefNo"
                        value={advancePaymentForm.provisionalReceiptNo}
                        onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, provisionalReceiptNo: e.target.value }))}
                        placeholder="Optional"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Reference - Show in separate row when bank is shown */}
                {['CHEQUE', 'NEFT', 'ONLINE'].includes(advancePaymentForm.paymentMode) && (
                  <div>
                    <Label htmlFor="advRefNo2">Reference / Transaction No</Label>
                    <Input
                      id="advRefNo2"
                      value={advancePaymentForm.provisionalReceiptNo}
                      onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, provisionalReceiptNo: e.target.value }))}
                      placeholder="Enter transaction reference"
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div>
                    <Label htmlFor="advAmount">Amount <span className="text-red-500">*</span></Label>
                    <Input
                      id="advAmount"
                      type="number"
                      value={advancePaymentForm.paidAmount}
                      onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                      placeholder="Enter amount"
                      className="mt-1"
                    />
                  </div>

                  {/* Transaction Date */}
                  <div>
                    <Label htmlFor="advTransDate">Transaction Date</Label>
                    <Input
                      id="advTransDate"
                      type="date"
                      value={advancePaymentForm.transactionDate}
                      onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, transactionDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Remark */}
                <div>
                  <Label htmlFor="advRemark">Remark</Label>
                  <Input
                    id="advRemark"
                    value={advancePaymentForm.paymentRemark}
                    onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, paymentRemark: e.target.value }))}
                    placeholder="Optional note"
                    className="mt-1"
                  />
                </div>

                {/* Amount Summary */}
                {advancePaymentForm.paidAmount && parseFloat(advancePaymentForm.paidAmount) > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-700 dark:text-emerald-400">Advance Amount:</span>
                      <span className="font-bold text-lg text-emerald-600">
                        {formatCurrency(parseFloat(advancePaymentForm.paidAmount))}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                      This amount will be credited to customer ledger
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="outline" onClick={() => setShowAdvancePaymentModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRecordAdvancePayment}
                disabled={isProcessingAdvancePayment || !advancePaymentForm.paymentMode || !advancePaymentForm.paidAmount}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isProcessingAdvancePayment ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <><Wallet className="h-4 w-4 mr-2" /> Record Advance</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-content, #invoice-content * { visibility: visible; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #creditnote-content, #creditnote-content * { visibility: visible; }
          #invoice-content { position: absolute; left: 0; top: 0; width: 100%; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; }
          #creditnote-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
