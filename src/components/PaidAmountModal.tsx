import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OrderRequest, GroupPayment } from '../types';
import { getRequestRemaining, getRequestPrice, getRequestPaid } from '../lib/calculations';
import {
  X,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Coins,
  ArrowRight,
  Receipt,
} from 'lucide-react';

export interface PaidAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Either a single request, an existing group payment, or a new group settlement
  target:
    | { type: 'request'; request: OrderRequest }
    | { type: 'group'; groupPayment: GroupPayment }
    | { type: 'new_group'; userId: string; userName: string; userMobile: string; requestIds: string[]; totalDue: number };
  onSuccess?: () => void;
}

export const PaidAmountModal: React.FC<PaidAmountModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess,
}) => {
  const { settings, adminRecordPayment, adminRecordGroupPaymentReceived, adminProcessGroupPayment, showToast } = useApp();

  const isRequest = target.type === 'request';
  const isExistingGroup = target.type === 'group';
  const isNewGroup = target.type === 'new_group';

  const request = isRequest ? (target.request as OrderRequest) : null;
  const groupPayment = isExistingGroup ? (target.groupPayment as GroupPayment) : null;
  const newGroup = isNewGroup ? target : null;

  // Calculate expected payment
  const expectedPayment = isRequest
    ? getRequestRemaining(request!)
    : isExistingGroup
    ? Math.max(0, groupPayment!.totalDue - (groupPayment!.amountSettled || 0))
    : newGroup!.totalDue;

  const customerName = isRequest
    ? request!.userName
    : isExistingGroup
    ? groupPayment!.userName
    : newGroup!.userName;
  const customerMobile = isRequest
    ? request!.userMobile
    : isExistingGroup
    ? groupPayment!.userMobile
    : newGroup!.userMobile;
  const itemTitle = isRequest
    ? request!.productName
    : isExistingGroup
    ? `Group Settlement #${groupPayment!.id} (${groupPayment!.requestIds?.length || 0} requests)`
    : `Group Batch Settlement (${newGroup!.requestIds.length} requests)`;

  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize amount input with expected payment when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setAmountReceivedInput(expectedPayment > 0 ? String(expectedPayment) : '');
      setPaymentNote('');
      setValidationError(null);
    }
  }, [isOpen, expectedPayment, target]);

  if (!isOpen) return null;

  const numReceived = parseFloat(amountReceivedInput) || 0;
  const isExactPayment = numReceived === expectedPayment && expectedPayment > 0;
  const isExtraPayment = numReceived > expectedPayment;
  const isPartialPayment = numReceived > 0 && numReceived < expectedPayment;

  const actualPayment = Math.min(numReceived, expectedPayment);
  const extraCash = isExtraPayment ? numReceived - expectedPayment : 0;
  const remainingDue = Math.max(0, expectedPayment - numReceived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (numReceived <= 0) {
      setValidationError('Please enter a valid amount received greater than ₹0.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isRequest && request) {
        await adminRecordPayment(request.id, numReceived, paymentNote.trim() || undefined);
      } else if (isExistingGroup && groupPayment) {
        if (adminRecordGroupPaymentReceived) {
          await adminRecordGroupPaymentReceived({
            groupPaymentId: groupPayment.id,
            amountReceived: numReceived,
            notes: paymentNote.trim() || undefined,
          });
        }
      } else if (isNewGroup && newGroup) {
        await adminProcessGroupPayment({
          userId: newGroup.userId,
          userName: newGroup.userName,
          userMobile: newGroup.userMobile,
          requestIds: newGroup.requestIds,
          cashReceived: numReceived,
          notes: paymentNote.trim() || undefined,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setValidationError(err?.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">Enter Amount Received</h3>
              <p className="text-xs text-zinc-400">
                Customer: <span className="text-white font-bold">{customerName}</span> •{' '}
                <span className="text-emerald-400 font-medium">{customerMobile}</span>
              </p>
            </div>
          </div>

          {/* Target Item Pill */}
          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                {isRequest ? 'Request Item' : 'Grouped Payment'}
              </span>
              <p className="font-extrabold text-white">{itemTitle}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                Expected Payment
              </span>
              <span className="text-base font-extrabold text-emerald-400">
                {settings.currencySymbol}
                {expectedPayment.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Received Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300">
                  Amount Received from Customer ({settings.currencySymbol}){' '}
                  <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAmountReceivedInput(String(expectedPayment))}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  Exact ({settings.currencySymbol}{expectedPayment.toLocaleString('en-IN')})
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-extrabold text-lg">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  autoFocus
                  placeholder={`e.g. ${expectedPayment}`}
                  value={amountReceivedInput}
                  onChange={(e) => {
                    setAmountReceivedInput(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full pl-9 pr-4 py-3 bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-2xl text-lg font-extrabold text-white focus:outline-none transition-colors"
                  id="input-amount-received"
                />
              </div>
            </div>

            {/* Live Automated Breakdown */}
            {numReceived > 0 && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <span className="text-zinc-400 font-medium">Expected Payment:</span>
                  <span className="font-extrabold text-white">
                    {settings.currencySymbol}{expectedPayment.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Amount Received:</span>
                  <span className="font-extrabold text-emerald-400">
                    {settings.currencySymbol}{numReceived.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Actual Request Payment:</span>
                  <span className="font-extrabold text-white">
                    {settings.currencySymbol}{actualPayment.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Case B: Extra Payment */}
                {isExtraPayment && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-amber-300">
                    <div className="flex items-center justify-between font-extrabold text-sm text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-400" />
                        Extra Cash (User Balance):
                      </span>
                      <span>+{settings.currencySymbol}{extraCash.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Payment for this request is recorded as <strong>{settings.currencySymbol}{actualPayment.toLocaleString('en-IN')}</strong>. The extra <strong>{settings.currencySymbol}{extraCash.toLocaleString('en-IN')}</strong> becomes the customer's available balance.
                    </p>
                    <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1 pt-0.5">
                      <ArrowRight className="w-3 h-3" /> Button will change to: "Pay User Balance"
                    </p>
                  </div>
                )}

                {/* Case C: Partial Payment */}
                {isPartialPayment && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1 text-rose-300">
                    <div className="flex items-center justify-between font-extrabold text-sm text-rose-400">
                      <span>Remaining to Pay:</span>
                      <span>{settings.currencySymbol}{remainingDue.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[11px] text-rose-200/80 leading-relaxed">
                      Status will be set to <strong>Partially Paid</strong> ({settings.currencySymbol}{remainingDue.toLocaleString('en-IN')} Remaining to Pay). The remaining amount can be collected later.
                    </p>
                  </div>
                )}

                {/* Case A: Exact Payment */}
                {isExactPayment && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Exact Payment: Paid & Fully Completed
                    </span>
                    <span>Balance: {settings.currencySymbol}0</span>
                  </div>
                )}
              </div>
            )}

            {/* Optional Payment Note */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Payment Note / Reference <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Counter Cash, GPay UPI Ref, Paid in full..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                id="input-payment-note"
              />
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || numReceived <= 0}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                id="btn-confirm-amount-received"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Payment ({settings.currencySymbol}{numReceived > 0 ? numReceived.toLocaleString('en-IN') : '0'})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
