import React, { useRef, useState, useEffect } from 'react';
import { OrderRequest } from '../types';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import {
  getRequestPrice,
  getOriginalPrice,
  getOfferSavings,
  getRequestPaid,
  getRequestRemaining,
} from '../lib/calculations';
import {
  Download,
  Share2,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  DollarSign,
  Layers,
  Sparkles,
  Printer,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Coins,
  X,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import { normalizeWhatsAppNumber, sendWhatsAppViaServer } from '../lib/whatsapp';

interface DigitalDocumentCardProps {
  transaction: OrderRequest;
  onClose?: () => void;
  onOpenRecordPayment?: () => void;
  showWhatsAppShare?: boolean;
  isAdminView?: boolean;
}

export const DigitalDocumentCard: React.FC<DigitalDocumentCardProps> = ({
  transaction,
  onClose,
  onOpenRecordPayment,
  showWhatsAppShare = false,
  isAdminView,
}) => {
  const { settings, showToast, adminRecordPayment, adminPayBalance, getUserBalanceInfo, currentUser, isAdmin } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  const [currentTransaction, setCurrentTransaction] = useState<OrderRequest>(transaction);

  // Strict permission check: admin controls only available when user is actual admin AND in admin view
  const allowAdminFinancialControls = Boolean(isAdmin && isAdminView !== false);

  useEffect(() => {
    setCurrentTransaction(transaction);
  }, [transaction]);

  const [isExporting, setIsExporting] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSendStatus, setWhatsAppSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [whatsAppErrorMessage, setWhatsAppErrorMessage] = useState<string | null>(null);
  const [sentMessageId, setSentMessageId] = useState<string | null>(null);
  const [isUnregisteredError, setIsUnregisteredError] = useState(false);
  const [showPinRegister, setShowPinRegister] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isRegisteringPin, setIsRegisteringPin] = useState(false);

  // Cash payment & balance payout state
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cashNote, setCashNote] = useState('Paid user balance in cash');
  const [isRecordingCash, setIsRecordingCash] = useState(false);

  // Customer balance payout state
  const [showPayoutCreditModal, setShowPayoutCreditModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutNote, setPayoutNote] = useState('Paid customer balance cash at desk');
  const [isPayingCredit, setIsPayingCredit] = useState(false);

  const formattedDate = new Date(currentTransaction.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const actualAmount = getRequestPrice(currentTransaction);
  const originalAmount = getOriginalPrice(currentTransaction);
  const offerSavings = getOfferSavings(currentTransaction);
  const hasOffer = currentTransaction.offerApplied || (originalAmount > 0 && actualAmount < originalAmount);
  const paidAmount = getRequestPaid(currentTransaction);
  const remainingAmount = getRequestRemaining(currentTransaction);

  const userBalInfo = getUserBalanceInfo(currentTransaction.userMobile, currentTransaction.userId);
  const customerAvailableCredit = userBalInfo.availableBalance;

  // Sync cashAmount when modal opens or remainingAmount changes
  useEffect(() => {
    if (remainingAmount > 0) {
      setCashAmount(String(remainingAmount));
    }
  }, [remainingAmount]);

  useEffect(() => {
    if (customerAvailableCredit > 0) {
      setPayoutAmount(String(customerAvailableCredit));
    }
  }, [customerAvailableCredit]);

  const handleMarkPaidInCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowAdminFinancialControls) {
      showToast('Unauthorized: Admin access required.');
      return;
    }
    const num = Number(cashAmount) || remainingAmount;
    if (num <= 0) {
      showToast('Please enter a valid cash amount greater than 0.');
      return;
    }
    try {
      setIsRecordingCash(true);
      await adminRecordPayment(currentTransaction.id, num, cashNote.trim() || 'Paid user balance in cash');
      
      const newPaid = paidAmount + num;
      const newRem = Math.max(0, actualAmount - newPaid);
      const newStatus = newRem === 0 ? 'Paid' : 'Partially Paid';
      
      setCurrentTransaction((prev) => ({
        ...prev,
        amountPaid: newPaid,
        remainingAmount: newRem,
        status: newStatus,
        timeline: [
          ...(prev.timeline || []),
          {
            id: 'EVT-' + Date.now(),
            type: newRem === 0 ? 'TRANSACTION_COMPLETED' : 'PARTIAL_PAYMENT',
            title: newRem === 0 ? 'Full Payment Received (Cash)' : `Partial Cash Payment (+₹${num})`,
            timestamp: new Date().toISOString(),
            amountPaidThisStep: num,
            totalPaidSoFar: newPaid,
            remainingBalance: newRem,
            notes: cashNote.trim() || 'Paid user balance in cash',
            actor: 'ADMIN',
          },
        ],
      }));

      setShowCashModal(false);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      showToast(`Recorded cash payment of ₹${num.toLocaleString('en-IN')}. Status: ${newStatus}`);
      if (onOpenRecordPayment) {
        // If parent has a handler to refresh, trigger it
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record cash payment');
    } finally {
      setIsRecordingCash(false);
    }
  };

  const handlePayCustomerCreditCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowAdminFinancialControls) {
      showToast('Unauthorized: Admin access required.');
      return;
    }
    const num = Number(payoutAmount) || customerAvailableCredit;
    if (num <= 0) {
      showToast('Please enter a valid amount greater than 0.');
      return;
    }
    try {
      setIsPayingCredit(true);
      await adminPayBalance({
        userId: currentTransaction.userId,
        userMobile: currentTransaction.userMobile,
        userName: currentTransaction.userName,
        amount: num,
        notes: `Cash Payout - ${payoutNote.trim() || 'Paid customer balance cash'}`,
        relatedRequestId: currentTransaction.id,
      });

      // Update local transaction state immediately so UI updates in real-time
      setCurrentTransaction((prev) => {
        const currentExtra = prev.extraCash || 0;
        const deduct = Math.min(currentExtra, num);
        return {
          ...prev,
          extraCash: Math.max(0, currentExtra - deduct),
          extraCashPaid: (prev.extraCashPaid || 0) + deduct,
        };
      });

      setShowPayoutCreditModal(false);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      showToast(`Paid ₹${num.toLocaleString('en-IN')} cash balance to ${currentTransaction.userName}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to pay customer balance cash');
    } finally {
      setIsPayingCredit(false);
    }
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    let extraCashLine = '';
    if (customerAvailableCredit > 0) {
      extraCashLine = `\n🪙 *Extra Cash Pending to Pay:* ${settings.currencySymbol}${customerAvailableCredit.toLocaleString('en-IN')}`;
    } else if (
      currentTransaction.extraCashPaid ||
      (currentTransaction.extraCash && currentTransaction.extraCash > 0) ||
      userBalInfo.hasTransactions
    ) {
      extraCashLine = `\n🪙 *Extra Cash / Store Credit:* Cleared / Fully Paid (${settings.currencySymbol}0)`;
    }

    const text = `*DIGIZORT OFFICIAL STATEMENT & CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━━
📄 *Document ID:* #${currentTransaction.id}
👤 *Customer:* ${currentTransaction.userName} (${currentTransaction.userMobile})
📦 *Item/Service:* ${currentTransaction.productName}
🎯 *Purpose:* ${currentTransaction.purpose}
📊 *Status:* ${currentTransaction.status.toUpperCase()}

💰 *Total Amount:* ${settings.currencySymbol}${actualAmount.toLocaleString('en-IN')}
✅ *Paid So Far:* ${settings.currencySymbol}${paidAmount.toLocaleString('en-IN')}
⏳ *Order Balance Due:* ${settings.currencySymbol}${remainingAmount.toLocaleString('en-IN')}${extraCashLine}

📅 *Date:* ${formattedDate}
━━━━━━━━━━━━━━━━━━━━━
_Track live updates and timeline records on your DIGIZORT User Portal._`;

    return encodeURIComponent(text);
  };

  // Helper to convert any oklch/oklab/color CSS function to rgb/rgba format for html2canvas
  const colorToRgb = (colorStr: string): string => {
    if (!colorStr || typeof colorStr !== 'string') return colorStr;
    if (!/(oklch|oklab|color)/i.test(colorStr)) return colorStr;

    return colorStr.replace(/(oklch|oklab|color)\([^)]+\)/gi, (match) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return match;

        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000000';
        ctx.fillStyle = match;
        ctx.fillRect(0, 0, 1, 1);

        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const alpha = Number((a / 255).toFixed(3));
        return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch {
        return match;
      }
    });
  };

  const processClonedDocForOklch = (clonedDoc: Document) => {
    // 1. Convert all <style> elements in clonedDoc
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent && /(oklch|oklab|color)/i.test(styleEl.textContent)) {
        styleEl.textContent = colorToRgb(styleEl.textContent);
      }
    });

    // 2. Convert inline style attributes and computed properties on all elements
    const allElements = clonedDoc.querySelectorAll<HTMLElement>('*');
    allElements.forEach((el) => {
      const styleAttr = el.getAttribute('style');
      if (styleAttr && /(oklch|oklab|color)/i.test(styleAttr)) {
        el.setAttribute('style', colorToRgb(styleAttr));
      }

      try {
        const computed = window.getComputedStyle(el);
        const propsToCheck = [
          'color',
          'background-color',
          'border-color',
          'border-top-color',
          'border-right-color',
          'border-bottom-color',
          'border-left-color',
          'outline-color',
          'box-shadow',
          'fill',
          'stroke',
        ];

        propsToCheck.forEach((prop) => {
          const val = computed.getPropertyValue(prop);
          if (val && /(oklch|oklab|color)/i.test(val)) {
            el.style.setProperty(prop, colorToRgb(val));
          }
        });
      } catch {
        // ignore
      }
    });
  };

  // Helper to format WhatsApp phone number with country code (default 91 for India)
  const formatWhatsAppPhone = (phone?: string): string => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.slice(1);
    }
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  };

  // Safe WhatsApp dispatch calling backend Cloud API via unified server layer
  const handleShareWhatsApp = async () => {
    if (isSendingWhatsApp) return;

    const rawCustomerPhone = transaction.userMobile || transaction.phone || '';
    const normalizedPhone = normalizeWhatsAppNumber(rawCustomerPhone);
    if (!normalizedPhone) {
      showToast('Customer WhatsApp mobile number not found or invalid format.');
      return;
    }

    // Keep exact existing generated WhatsApp message format
    const rawMessage = decodeURIComponent(generateWhatsAppMessage());

    try {
      setIsSendingWhatsApp(true);
      setWhatsAppSendStatus('sending');
      setWhatsAppErrorMessage(null);

      const result = await sendWhatsAppViaServer({
        to: normalizedPhone,
        message: rawMessage,
        requestId: transaction.id,
        customerName: transaction.userName,
      });

      if (result.success) {
        setWhatsAppSendStatus('success');
        setIsUnregisteredError(false);
        setSentMessageId(result.messageId || 'sent');
        showToast(`WhatsApp sent successfully to ${transaction.userName}!`);
      } else {
        setWhatsAppSendStatus('error');
        setIsUnregisteredError(!!result.isUnregistered);

        const errTitle = result.error || 'WhatsApp delivery failed';
        const errDetail = result.details ? `: ${result.details}` : '';
        const fullErr = `${errTitle}${errDetail}`;
        setWhatsAppErrorMessage(fullErr);
        showToast(errTitle);
      }
    } catch (err: any) {
      console.error('Failed to send WhatsApp message via API:', err);
      setWhatsAppSendStatus('error');
      const errText = err?.message || 'Connection error while communicating with WhatsApp API.';
      setWhatsAppErrorMessage(`Network/Client error: ${errText}`);
      showToast(errText);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleRegisterPin = async () => {
    if (!pinInput || pinInput.trim().length !== 6) {
      showToast('Please enter a valid 6-digit numeric PIN');
      return;
    }
    setIsRegisteringPin(true);
    try {
      const res = await fetch('/api/whatsapp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success) {
        showToast('Phone number successfully registered with Meta Cloud API!');
        setIsUnregisteredError(false);
        setShowPinRegister(false);
        // Automatically retry dispatch
        handleShareWhatsApp();
      } else {
        showToast(resData.error || resData.details || 'Failed to register PIN with Meta');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error registering PIN');
    } finally {
      setIsRegisteringPin(false);
    }
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      showToast('Generating PNG Document...');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b',
        logging: false,
        onclone: (clonedDoc) => {
          processClonedDocForOklch(clonedDoc);
        },
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      const cleanReqId = transaction.id || 'REQ-DOC';
      link.download = `DIGIZORT_Request_${cleanReqId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('PNG downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      showToast('Generating PDF Document...');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b',
        logging: false,
        onclone: (clonedDoc) => {
          processClonedDocForOklch(clonedDoc);
        },
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Dark background for A4 sheet
      pdf.setFillColor(9, 9, 11);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      const margin = 10;
      const maxWidth = pdfWidth - margin * 2;
      const imgProps = pdf.getImageProperties(imgData);
      const calculatedHeight = (imgProps.height * maxWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', margin, margin, maxWidth, Math.min(calculatedHeight, pdfHeight - margin * 2));
      const cleanReqId = transaction.id || 'REQ-DOC';
      pdf.save(`DIGIZORT_Request_${cleanReqId}.pdf`);
      showToast('PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = () => {
    if (currentTransaction.status === 'Paid' || currentTransaction.status === 'Completed') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
          Completed & Fully Paid
        </span>
      );
    }
    if (currentTransaction.status === 'Partially Paid') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wider">
          Partially Paid
        </span>
      );
    }
    if (currentTransaction.status === 'Rejected' || currentTransaction.status === 'Cancelled') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 tracking-wider">
          {currentTransaction.status}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40 tracking-wider">
        {currentTransaction.status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Printable / Capturable Card Canvas */}
      <div
        ref={cardRef}
        className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-6 relative overflow-hidden shadow-2xl text-white"
        id="digital-doc-card"
      >
        {/* Background Watermark Branding */}
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-zinc-100 font-extrabold text-8xl pointer-events-none select-none tracking-tighter">
          DIGIZORT
        </div>

        {/* Card Header Bar */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <img
                src={OFFICIAL_DIGIZORT_LOGO}
                alt="DIGIZORT Logo"
                crossOrigin="anonymous"
                className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(229,57,53,0.4)]"
              />
              <h2 className="text-xl font-extrabold tracking-tight text-white">DIGIZORT</h2>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
              OFFICIAL CASH & ORDER RECORD STATEMENT
            </p>
          </div>

          <div className="text-right space-y-1">
            {getStatusBadge()}
            <p className="text-[10px] text-zinc-500 font-mono block mt-1">
              Doc ID: #{currentTransaction.id}
            </p>
          </div>
        </div>

        {/* Customer & Request Info Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
              Customer Identity
            </span>
            <p className="font-extrabold text-white text-sm">{currentTransaction.userName}</p>
            <p className="text-zinc-400 text-[11px]">{currentTransaction.userMobile}</p>
            {currentTransaction.userEmail && (
              <p className="text-zinc-500 text-[10px]">{currentTransaction.userEmail}</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
              Order Specification
            </span>
            <p className="font-extrabold text-rose-400 text-sm">{currentTransaction.productName}</p>
            <p className="text-zinc-300 text-[11px] font-medium">{currentTransaction.purpose}</p>
            <p className="text-zinc-500 text-[10px]">{formattedDate}</p>
          </div>
        </div>

        {/* Special Offer Notification Banner inside Document Statement */}
        {hasOffer && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-extrabold">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Special Offer Applied: Reduced from {settings.currencySymbol}{originalAmount.toLocaleString('en-IN')} to {settings.currencySymbol}{actualAmount.toLocaleString('en-IN')}.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-xs shrink-0">
              Saved {settings.currencySymbol}{offerSavings.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* Pricing Summary Box */}
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 grid gap-2 text-center ${
          customerAvailableCredit > 0 || currentTransaction.extraCash || currentTransaction.extraCashPaid || userBalInfo.hasTransactions
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-3'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
              {hasOffer ? 'Offer Price' : 'Total Price'}
            </span>
            <div className="space-y-0.5">
              {hasOffer && (
                <span className="text-[11px] text-zinc-500 line-through block font-medium">
                  {settings.currencySymbol}{originalAmount.toLocaleString('en-IN')}
                </span>
              )}
              <span className={`text-base font-extrabold block ${hasOffer ? 'text-amber-400' : 'text-white'}`}>
                {settings.currencySymbol}
                {actualAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
              Paid So Far
            </span>
            <span className="text-base font-extrabold text-emerald-400 block">
              {settings.currencySymbol}
              {paidAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
              Balance Due
            </span>
            <span
              className={`text-base font-extrabold block ${
                remainingAmount === 0 ? 'text-zinc-500' : 'text-rose-400'
              }`}
            >
              {settings.currencySymbol}
              {remainingAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {(customerAvailableCredit > 0 || currentTransaction.extraCash || currentTransaction.extraCashPaid || userBalInfo.hasTransactions) && (
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                {customerAvailableCredit > 0 ? 'Extra Cash to Pay' : 'Extra Cash'}
              </span>
              <span
                className={`text-base font-extrabold block ${
                  customerAvailableCredit > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {customerAvailableCredit > 0
                  ? `${settings.currencySymbol}${customerAvailableCredit.toLocaleString('en-IN')}`
                  : `Cleared (${settings.currencySymbol}0)`}
              </span>
            </div>
          )}
        </div>

        {/* ADMIN QUICK CASH ACTIONS (Direct inside statement - STRICTLY ADMIN ONLY) */}
        {allowAdminFinancialControls && (remainingAmount > 0 || customerAvailableCredit > 0 || currentTransaction.extraCashPaid || userBalInfo.hasTransactions) && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/95 border border-zinc-800 space-y-2.5">
            {remainingAmount > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-white block">
                      Order Balance Due: {settings.currencySymbol}{remainingAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium block">
                      Did the customer pay cash? Settle now to update statement & WhatsApp receipt.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCashAmount(String(remainingAmount));
                    setShowCashModal(true);
                  }}
                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-[0.98]"
                  id="btn-mark-paid-cash-banner"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Mark Paid Cash ({settings.currencySymbol}{remainingAmount.toLocaleString('en-IN')})</span>
                </button>
              </div>
            )}

            {customerAvailableCredit > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-amber-300 block">
                      Extra Cash Pending to Pay: {settings.currencySymbol}{customerAvailableCredit.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block">
                      Customer has pending cash balance to be returned. Paid customer in cash?
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPayoutAmount(String(customerAvailableCredit));
                    setShowPayoutCreditModal(true);
                  }}
                  className="py-2 px-3.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-[0.98]"
                  id="btn-pay-customer-balance-cash-banner"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Pay Customer Extra Cash ({settings.currencySymbol}{customerAvailableCredit.toLocaleString('en-IN')})</span>
                </button>
              </div>
            )}

            {customerAvailableCredit === 0 && (currentTransaction.extraCashPaid || userBalInfo.hasTransactions) && (
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">
                    Extra cash / store balance is fully cleared & paid to customer ({settings.currencySymbol}0 remaining).
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Timeline Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#E53935]" />
              Audit & Transaction Timeline
            </h4>
            <span className="text-[10px] text-zinc-500 font-medium">
              {currentTransaction.timeline?.length || 1} Events Logged
            </span>
          </div>

          <div className="space-y-2 border-l-2 border-zinc-800 pl-4 py-1">
            {currentTransaction.timeline && currentTransaction.timeline.length > 0 ? (
              currentTransaction.timeline.map((evt, idx) => (
                <div key={evt.id || idx} className="relative group text-xs space-y-0.5">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#E53935] ring-4 ring-zinc-950" />
                  <div className="flex items-center justify-between text-zinc-200 font-bold">
                    <span>{evt.title}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      {new Date(evt.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {evt.amountPaidThisStep && (
                    <p className="text-[11px] font-bold text-emerald-400">
                      Amount Paid: +{settings.currencySymbol}
                      {evt.amountPaidThisStep.toLocaleString('en-IN')}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400">
                    Paid so far: {settings.currencySymbol}
                    {evt.totalPaidSoFar.toLocaleString('en-IN')} • Balance: {settings.currencySymbol}
                    {evt.remainingBalance.toLocaleString('en-IN')}
                  </p>
                  {evt.notes && (
                    <p className="text-[10px] text-zinc-400 italic bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800/60 mt-1">
                      "{evt.notes}"
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-400">
                <p className="font-bold text-white">REQUEST SUBMITTED</p>
                <p className="text-[10px]">{formattedDate}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Verification Stamp */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
          <span>DIGIZORT REAL-TIME DATABASE SYSTEM</span>
          <span>DOCUMENT STAMP: VERIFIED</span>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={handleDownloadPNG}
          disabled={isExporting}
          className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          id="btn-download-png"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Download PNG</span>
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          id="btn-download-pdf"
        >
          <Printer className="w-3.5 h-3.5 text-amber-400" />
          <span>Download PDF</span>
        </button>

        {allowAdminFinancialControls && remainingAmount > 0 && (
          <button
            type="button"
            onClick={() => {
              setCashAmount(String(remainingAmount));
              setShowCashModal(true);
            }}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
            id="btn-mark-paid-cash-footer"
            title="Mark this request's balance as paid in cash"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Mark Paid Cash</span>
          </button>
        )}

        {showWhatsAppShare && (
          <button
            onClick={handleShareWhatsApp}
            disabled={isSendingWhatsApp || whatsAppSendStatus === 'sending'}
            className={`${remainingAmount > 0 ? '' : 'col-span-2 sm:col-span-2'} py-2.5 px-3 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all ${
              whatsAppSendStatus === 'success'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
            id="btn-share-whatsapp"
            title={whatsAppSendStatus === 'success' ? `Sent: ${sentMessageId || 'Success'}. Click to send again.` : 'Send WhatsApp Message'}
          >
            {isSendingWhatsApp ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : whatsAppSendStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sent to WhatsApp!</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* QUICK CASH SETTLEMENT MODAL (STRICTLY ADMIN ONLY) */}
      {allowAdminFinancialControls && showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Mark as Paid (Cash)</h3>
                  <p className="text-[11px] text-zinc-400">Record that customer settled balance in cash</p>
                </div>
              </div>
              <button
                onClick={() => setShowCashModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkPaidInCash} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Order:</span>
                  <span className="text-white font-bold">{currentTransaction.productName} (#{currentTransaction.id})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Customer:</span>
                  <span className="text-white font-bold">{currentTransaction.userName} ({currentTransaction.userMobile})</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/80">
                  <span className="text-zinc-400 font-bold">Current Balance Due:</span>
                  <span className="text-rose-400 font-extrabold text-sm">
                    {settings.currencySymbol}{remainingAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Cash Amount Received ({settings.currencySymbol})
                  </label>
                  <button
                    type="button"
                    onClick={() => setCashAmount(String(remainingAmount))}
                    className="text-[11px] text-emerald-400 font-bold hover:underline"
                  >
                    Full Balance ({settings.currencySymbol}{remainingAmount.toLocaleString('en-IN')})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Enter cash received"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-base font-extrabold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Payment Method
                </label>
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cash (In-Hand / Store Counter Settle)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Timeline Note <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={cashNote}
                  onChange={(e) => setCashNote(e.target.value)}
                  placeholder="e.g. Paid in cash at counter"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingCash || !cashAmount || Number(cashAmount) <= 0}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                  id="btn-confirm-cash-settlement"
                >
                  {isRecordingCash ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Cash Payment ({settings.currencySymbol}{Number(cashAmount || 0).toLocaleString('en-IN')})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PAY CUSTOMER CREDIT BALANCE MODAL (STRICTLY ADMIN ONLY) */}
      {allowAdminFinancialControls && showPayoutCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Pay Customer Balance (Cash)</h3>
                  <p className="text-[11px] text-zinc-400">Record cash paid/returned to customer from their balance</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayoutCreditModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayCustomerCreditCash} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Customer:</span>
                  <span className="text-white font-bold">{currentTransaction.userName} ({currentTransaction.userMobile})</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/80">
                  <span className="text-zinc-400 font-bold">Current Available Balance:</span>
                  <span className="text-emerald-400 font-extrabold text-sm">
                    {settings.currencySymbol}{customerAvailableCredit.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Cash Amount to Pay Customer ({settings.currencySymbol})
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(String(customerAvailableCredit))}
                    className="text-[11px] text-blue-400 font-bold hover:underline"
                  >
                    All Balance ({settings.currencySymbol}{customerAvailableCredit.toLocaleString('en-IN')})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    max={customerAvailableCredit}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter cash given to customer"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-base font-extrabold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Payout Method
                </label>
                <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/40 flex items-center gap-2 text-xs font-bold text-blue-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Cash Handed to Customer (In-Person / Desk)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Note <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  placeholder="e.g. Paid customer balance cash at desk"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutCreditModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPayingCredit || !payoutAmount || Number(payoutAmount) <= 0}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition-all"
                  id="btn-confirm-pay-customer-balance-cash"
                >
                  {isPayingCredit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
                  <span>Confirm Paid Cash ({settings.currencySymbol}{Number(payoutAmount || 0).toLocaleString('en-IN')})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Delivery Status Feedback */}
      {whatsAppSendStatus === 'error' && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-3 text-rose-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-bold block text-rose-300">
                {isUnregisteredError ? 'Sender Number Active on WhatsApp Phone App' : 'WhatsApp Dispatch Error'}
              </span>
              <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">{whatsAppErrorMessage}</p>
            </div>
          </div>

          {isUnregisteredError ? (
            <div className="space-y-2 pt-1 border-t border-rose-900/50">
              <button
                type="button"
                onClick={() => {
                  const encoded = generateWhatsAppMessage();
                  const cleanPhone = formatWhatsAppPhone(transaction.userMobile || transaction.phone || '');
                  window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all text-xs active:scale-[0.99]"
                id="btn-direct-send-fallback"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send via WhatsApp App Now (+91 8129043397)</span>
              </button>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowPinRegister(!showPinRegister)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline flex items-center gap-1"
                >
                  <span>{showPinRegister ? 'Hide Cloud API PIN registration' : 'Want automated server background sending? Register 6-digit PIN'}</span>
                </button>

                {showPinRegister && (
                  <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-zinc-700/60 space-y-2">
                    <p className="text-[10px] text-zinc-300">
                      Enter the 6-digit PIN you created in Meta WhatsApp Manager (or choose a new 6-digit PIN) to register the Cloud API:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="6-digit PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-32 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white tracking-widest text-center focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        disabled={isRegisteringPin || pinInput.length !== 6}
                        onClick={handleRegisterPin}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                      >
                        {isRegisteringPin ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Register PIN</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1.5 border-t border-rose-900/40 text-[11px]">
              <span className="text-zinc-400">Manual Fallback Option:</span>
              <button
                onClick={() => {
                  const encoded = generateWhatsAppMessage();
                  const cleanPhone = formatWhatsAppPhone(transaction.userMobile || transaction.phone || '');
                  window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
                id="btn-fallback-open-whatsapp"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in WhatsApp Web</span>
              </button>
            </div>
          )}
        </div>
      )}

      {whatsAppSendStatus === 'success' && (
        <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs flex items-center justify-between text-emerald-300">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Successfully sent to {transaction.userName} ({transaction.userMobile || transaction.phone})</span>
          </div>
          <button
            onClick={() => setWhatsAppSendStatus('idle')}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline shrink-0"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};
