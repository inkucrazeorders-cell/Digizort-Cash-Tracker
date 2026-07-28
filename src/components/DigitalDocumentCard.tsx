import React, { useRef, useState } from 'react';
import { OrderRequest } from '../types';
import { useApp } from '../context/AppContext';
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
} from 'lucide-react';

interface DigitalDocumentCardProps {
  transaction: OrderRequest;
  onClose?: () => void;
  onOpenRecordPayment?: () => void;
}

export const DigitalDocumentCard: React.FC<DigitalDocumentCardProps> = ({
  transaction,
  onClose,
  onOpenRecordPayment,
}) => {
  const { settings, showToast } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleShareWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
    showToast('WhatsApp share link opened!');
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
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `DIGIZORT_${transaction.id}_${transaction.userName.replace(/\s+/g, '_')}.png`;
      link.click();
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
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
      pdf.save(`DIGIZORT_${transaction.id}_${transaction.userName.replace(/\s+/g, '_')}.pdf`);
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
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

        <button
          onClick={handleShareWhatsApp}
          className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          id="btn-share-whatsapp"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Share WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
