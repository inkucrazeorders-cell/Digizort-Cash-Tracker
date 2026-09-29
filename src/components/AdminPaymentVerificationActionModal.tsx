import React, { useState } from 'react';
import { motion } from 'motion/react';
import { OrderRequest, PaymentVerification } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  FileText,
  User,
} from 'lucide-react';

interface AdminPaymentVerificationActionModalProps {
  isOpen: boolean;
  mode: 'approve' | 'reject';
  request: OrderRequest;
  verification: PaymentVerification;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminPaymentVerificationActionModal: React.FC<
  AdminPaymentVerificationActionModalProps
> = ({ isOpen, mode, request, verification, onClose, onSuccess }) => {
  const { adminApprovePaymentVerification, adminRejectPaymentVerification, settings } = useApp();

  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReasonPreset, setRejectionReasonPreset] = useState(
    'UTR / Reference ID not found in bank statement'
  );
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'approve') {
        await adminApprovePaymentVerification({
          requestId: request.id,
          verificationId: verification.id,
          adminNotes: adminNotes.trim() || undefined,
        });
      } else {
        const finalReason =
          rejectionReasonPreset === 'Other'
            ? customRejectionReason.trim() || 'Payment verification could not be approved'
            : rejectionReasonPreset;

        await adminRejectPaymentVerification({
          requestId: request.id,
          verificationId: verification.id,
          rejectionReason: finalReason,
          adminNotes: adminNotes.trim() || undefined,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Operation failed.');
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
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                mode === 'approve'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-950/50'
                  : 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-950/50'
              }`}
            >
              {mode === 'approve' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {mode === 'approve' ? 'Confirm Payment Approval' : 'Reject Payment Verification'}
              </h3>
              <p className="text-xs text-zinc-400">
                Verification ID: <span className="font-mono text-zinc-200">#{verification.id}</span>
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

        {/* Verification Summary Card */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
          <div className="flex justify-between items-center py-0.5 border-b border-zinc-850">
            <span className="text-zinc-400 font-medium">Customer:</span>
            <span className="text-white font-bold">{request.userName}</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-zinc-850">
            <span className="text-zinc-400 font-medium">Mobile Number:</span>
            <span className="text-zinc-200 font-medium">{request.userMobile}</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-zinc-850">
            <span className="text-zinc-400 font-medium">Request / Order:</span>
            <span className="text-white font-bold">#{request.id} ({request.productName})</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-zinc-850">
            <span className="text-zinc-400 font-medium">Payment Method:</span>
            <span className="text-emerald-400 font-extrabold">
              {verification.paymentMethod}
              {verification.customPaymentMethod ? ` (${verification.customPaymentMethod})` : ''}
            </span>
          </div>

          {verification.transactionId && (
            <div className="flex justify-between items-center py-0.5 border-b border-zinc-850">
              <span className="text-zinc-400 font-medium">UTR / Transaction ID:</span>
              <span className="text-amber-300 font-mono font-bold select-all">
                {verification.transactionId}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-0.5 border-b border-zinc-850">
            <span className="text-zinc-400 font-medium">Amount Claimed:</span>
            <span className="text-base font-black text-emerald-400">
              {settings.currencySymbol}
              {verification.amountClaimed.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400 font-medium">Current Order Status:</span>
            <span className="text-zinc-300 font-semibold">{request.status}</span>
          </div>

          {verification.userNote && (
            <div className="pt-2 border-t border-zinc-850">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">
                Customer Note:
              </span>
              <p className="text-zinc-300 italic bg-zinc-900/60 p-2 rounded-xl border border-zinc-850">
                "{verification.userNote}"
              </p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'reject' ? (
            <>
              {/* Rejection Preset Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Rejection Reason *
                </label>
                <select
                  value={rejectionReasonPreset}
                  onChange={(e) => setRejectionReasonPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="UTR / Reference ID not found in bank statement">
                    UTR / Reference ID not found in bank statement
                  </option>
                  <option value="Payment not received in DIGIZORT account">
                    Payment not received in DIGIZORT account
                  </option>
                  <option value="Incorrect / Mismatched payment amount">
                    Incorrect / Mismatched payment amount
                  </option>
                  <option value="Duplicate payment verification claim">
                    Duplicate payment verification claim
                  </option>
                  <option value="Invalid or illegible payment proof">
                    Invalid or illegible payment proof
                  </option>
                  <option value="Other">Other reason (Custom)</option>
                </select>
              </div>

              {rejectionReasonPreset === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Custom Rejection Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
              <span className="font-bold block">Approval Confirmation</span>
              <p className="text-[11px] text-zinc-300">
                Approving this payment will update the request amount paid by{' '}
                <strong className="text-white">
                  {settings.currencySymbol}
                  {verification.amountClaimed.toLocaleString('en-IN')}
                </strong>
                , advance order status, record an official payment audit timeline event, and notify the customer.
              </p>
            </div>
          )}

          {/* Admin Internal / Customer Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              Admin Note (Optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={
                mode === 'approve'
                  ? 'e.g. Verified via Bank Statement UTR / Cash received at desk'
                  : 'e.g. Please re-check your UPI transaction history or contact bank'
              }
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
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
              className={`py-2.5 px-4 rounded-xl text-white font-extrabold text-xs shadow-lg transition-all flex-[2] flex items-center justify-center gap-1.5 ${
                mode === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
              }`}
              id={mode === 'approve' ? 'btn-confirm-approve-payment' : 'btn-confirm-reject-verification'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'approve' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Payment</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Reject Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
