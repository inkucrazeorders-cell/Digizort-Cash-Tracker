import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderRequest, PaymentVerificationMethod } from '../types';
import { useApp } from '../context/AppContext';
import { getRequestRemaining, getRequestPrice } from '../lib/calculations';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Building,
  Smartphone,
  AlertCircle,
  FileText,
  UploadCloud,
  Send,
  Loader2,
} from 'lucide-react';

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OrderRequest;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const { userSubmitPaymentVerification, settings, showToast } = useApp();

  const remainingDue = getRequestRemaining(request);
  const totalPrice = getRequestPrice(request);

  const [paymentMethod, setPaymentMethod] = useState<PaymentVerificationMethod>('Cash');
  const [customMethod, setCustomMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState<string>(String(remainingDue > 0 ? remainingDue : totalPrice));
  const [transactionId, setTransactionId] = useState('');
  const [userNote, setUserNote] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountNum = parseFloat(amountPaid);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage('Please enter a valid amount paid greater than 0.');
      return;
    }

    if (amountNum > remainingDue) {
      setErrorMessage(
        `Amount entered (${settings.currencySymbol}${amountNum.toLocaleString('en-IN')}) cannot exceed the amount due (${settings.currencySymbol}${remainingDue.toLocaleString('en-IN')}).`
      );
      return;
    }

    if (paymentMethod === 'Other' && !customMethod.trim()) {
      setErrorMessage('Please enter the name of the payment method.');
      return;
    }

    if ((paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && !transactionId.trim()) {
      setErrorMessage(
        `Please provide the ${paymentMethod === 'UPI' ? 'UTR / Transaction ID' : 'Transaction Reference / UTR'} so our team can verify your payment.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await userSubmitPaymentVerification({
        requestId: request.id,
        paymentMethod: paymentMethod,
        customPaymentMethod: paymentMethod === 'Other' ? customMethod.trim() : undefined,
        amountPaid: amountNum,
        transactionId: transactionId.trim() || undefined,
        userNote: userNote.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit payment verification request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Payment Verification</h3>
              <p className="text-xs text-zinc-400">
                Order: <strong className="text-white">#{request.id}</strong> • {request.productName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational Message from User Brief */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
          <p>
            Tell DIGIZORT how you paid. Your payment will be verified by the DIGIZORT Team before the order is marked as Paid.
          </p>
        </div>

        {/* Amount Due Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-900 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Amount Due
            </span>
            <span className="text-xl font-black text-rose-400">
              {settings.currencySymbol}
              {remainingDue.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 font-medium block">
              Total Order Price: {settings.currencySymbol}{totalPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold block">
              Paid so far: {settings.currencySymbol}{(request.amountPaid || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'Cash'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Bank Transfer')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'Bank Transfer'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Bank Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Other')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'Other'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Other</span>
              </button>
            </div>
          </div>

          {/* Custom Payment Method Text Field (if Other) */}
          {paymentMethod === 'Other' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Specify Payment Method *
              </label>
              <input
                type="text"
                required
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                placeholder="e.g. Cheque, Store Voucher, Wallet"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Amount Paid Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 block">
                Amount Paid ({settings.currencySymbol}) *
              </label>
              {remainingDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountPaid(String(remainingDue))}
                  className="text-[10px] text-emerald-400 hover:underline font-bold"
                >
                  Pay Full ({settings.currencySymbol}{remainingDue.toLocaleString('en-IN')})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                min="1"
                max={remainingDue}
                step="any"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={`e.g. ${remainingDue}`}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-extrabold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              Enter the exact amount you transferred or paid.
            </p>
          </div>

          {/* Transaction / UTR ID based on Method */}
          {(paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer' || paymentMethod === 'Other') && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                {paymentMethod === 'UPI'
                  ? 'UPI Reference / UTR Number *'
                  : paymentMethod === 'Bank Transfer'
                  ? 'Bank Transaction / Reference ID *'
                  : 'Transaction / Reference ID (Optional)'}
              </label>
              <input
                type="text"
                required={paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer'}
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder={
                  paymentMethod === 'UPI'
                    ? 'e.g. 12-digit UTR from GPay / PhonePe / Paytm'
                    : paymentMethod === 'Bank Transfer'
                    ? 'e.g. IMPS / NEFT Ref Number'
                    : 'Transaction reference or cheque number'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Optional Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              Optional Note / Details
            </label>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder={
                paymentMethod === 'Cash'
                  ? 'e.g. Paid in cash directly to DIGIZORT desk'
                  : 'e.g. Transferred from HDFC account ending in 4102'
              }
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Optional Proof / Reference Link */}
          {(paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Payment Proof Link / Screenshot URL (Optional)
              </label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://... (Optional receipt or image link)"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all flex-[2] flex items-center justify-center gap-1.5"
              id="btn-submit-payment-verification"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
