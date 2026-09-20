import React, { useRef, useState } from 'react';
import { OrderRequest } from '../types';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
} from 'lucide-react';

interface DigitalDocumentCardProps {
  transaction: OrderRequest;
  onClose?: () => void;
  onOpenRecordPayment?: () => void;
  showWhatsAppShare?: boolean;
}

export const DigitalDocumentCard: React.FC<DigitalDocumentCardProps> = ({
  transaction,
  onClose,
  onOpenRecordPayment,
  showWhatsAppShare = false,
}) => {
  const { settings, showToast } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSendStatus, setWhatsAppSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [whatsAppErrorMessage, setWhatsAppErrorMessage] = useState<string | null>(null);
  const [sentMessageId, setSentMessageId] = useState<string | null>(null);

  const formattedDate = new Date(transaction.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const actualAmount = transaction.actualPrice || transaction.amount || transaction.expectedPrice || 0;
  const paidAmount = transaction.amountPaid || (transaction.status === 'Paid' ? actualAmount : 0);
  const remainingAmount = transaction.remainingAmount ?? (transaction.status === 'Paid' ? 0 : Math.max(0, actualAmount - paidAmount));

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    const text = `*DIGIZORT OFFICIAL STATEMENT & CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━━
📄 *Document ID:* #${transaction.id}
👤 *Customer:* ${transaction.userName} (${transaction.userMobile})
📦 *Item/Service:* ${transaction.productName}
🎯 *Purpose:* ${transaction.purpose}
📊 *Status:* ${transaction.status.toUpperCase()}

💰 *Total Amount:* ${settings.currencySymbol}${actualAmount.toLocaleString('en-IN')}
✅ *Paid So Far:* ${settings.currencySymbol}${paidAmount.toLocaleString('en-IN')}
⏳ *Remaining Balance:* ${settings.currencySymbol}${remainingAmount.toLocaleString('en-IN')}

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

  const handleShareWhatsApp = async () => {
    if (isSendingWhatsApp) return;

    const customerPhone = transaction.userMobile || transaction.phone || '';
    if (!customerPhone) {
      showToast('Customer WhatsApp mobile number not found.');
      return;
    }

    // Use exact existing generated message
    const rawMessage = decodeURIComponent(generateWhatsAppMessage());

    try {
      setIsSendingWhatsApp(true);
      setWhatsAppSendStatus('sending');
      setWhatsAppErrorMessage(null);

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customerPhone,
          message: rawMessage,
          requestId: transaction.id,
          customerName: transaction.userName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWhatsAppSendStatus('success');
        setSentMessageId(data.messageId || 'sent');
        showToast(`WhatsApp message automatically sent to ${transaction.userName} (${customerPhone})!`);
      } else {
        setWhatsAppSendStatus('error');
        const errText = data.error || 'Failed to dispatch WhatsApp message.';
        setWhatsAppErrorMessage(errText);
        showToast(`WhatsApp error: ${errText}`);
      }
    } catch (err: any) {
      console.error('Failed to send WhatsApp message via API:', err);
      setWhatsAppSendStatus('error');
      const errText = err.message || 'Connection error while communicating with WhatsApp API.';
      setWhatsAppErrorMessage(errText);
      showToast(`WhatsApp error: ${errText}`);
    } finally {
      setIsSendingWhatsApp(false);
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
    if (transaction.status === 'Paid' || transaction.status === 'Completed') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
          Completed & Fully Paid
        </span>
      );
    }
    if (transaction.status === 'Partially Paid') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wider">
          Partially Paid
        </span>
      );
    }
    if (transaction.status === 'Rejected' || transaction.status === 'Cancelled') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 tracking-wider">
          {transaction.status}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40 tracking-wider">
        {transaction.status}
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
              Doc ID: #{transaction.id}
            </p>
          </div>
        </div>

        {/* Customer & Request Info Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
              Customer Identity
            </span>
            <p className="font-extrabold text-white text-sm">{transaction.userName}</p>
            <p className="text-zinc-400 text-[11px]">{transaction.userMobile}</p>
            {transaction.userEmail && (
              <p className="text-zinc-500 text-[10px]">{transaction.userEmail}</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
              Order Specification
            </span>
            <p className="font-extrabold text-rose-400 text-sm">{transaction.productName}</p>
            <p className="text-zinc-300 text-[11px] font-medium">{transaction.purpose}</p>
            <p className="text-zinc-500 text-[10px]">{formattedDate}</p>
          </div>
        </div>

        {/* Pricing Summary Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
              Total Price
            </span>
            <span className="text-base font-extrabold text-white block">
              {settings.currencySymbol}
              {actualAmount.toLocaleString('en-IN')}
            </span>
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
        </div>

        {/* Audit Timeline Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#E53935]" />
              Audit & Transaction Timeline
            </h4>
            <span className="text-[10px] text-zinc-500 font-medium">
              {transaction.timeline?.length || 1} Events Logged
            </span>
          </div>

          <div className="space-y-2 border-l-2 border-zinc-800 pl-4 py-1">
            {transaction.timeline && transaction.timeline.length > 0 ? (
              transaction.timeline.map((evt, idx) => (
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
      <div className={`grid ${showWhatsAppShare ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2`}>
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

        {showWhatsAppShare && (
          <button
            onClick={handleShareWhatsApp}
            disabled={isSendingWhatsApp || whatsAppSendStatus === 'sending'}
            className={`col-span-2 sm:col-span-1 py-2.5 px-3 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all ${
              whatsAppSendStatus === 'success'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
            id="btn-share-whatsapp"
            title={whatsAppSendStatus === 'success' ? `Sent: ${sentMessageId || 'Success'}. Click to send again.` : 'Send WhatsApp Message via API'}
          >
            {isSendingWhatsApp ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending via API...</span>
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

      {/* WhatsApp Delivery Status Feedback */}
      {whatsAppSendStatus === 'error' && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-2 text-rose-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-bold block text-rose-300">WhatsApp Dispatch Error</span>
              <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">{whatsAppErrorMessage}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-rose-900/40 text-[11px]">
            <span className="text-zinc-400">Manual Fallback Option:</span>
            <button
              onClick={() => {
                const encoded = generateWhatsAppMessage();
                const cleanPhone = (transaction.userMobile || transaction.phone || '').replace(/\D/g, '');
                window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
              }}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open in WhatsApp Web</span>
            </button>
          </div>
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
