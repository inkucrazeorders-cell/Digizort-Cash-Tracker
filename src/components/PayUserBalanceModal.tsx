import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  X,
  Coins,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export interface PayUserBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    userId?: string;
    userMobile: string;
    userName: string;
  };
  currentBalance: number;
  relatedRequestId?: string;
  relatedGroupPaymentId?: string;
  onSuccess?: () => void;
}

export const PayUserBalanceModal: React.FC<PayUserBalanceModalProps> = ({
  isOpen,
  onClose,
  customer,
  currentBalance,
  relatedRequestId,
  relatedGroupPaymentId,
  onSuccess,
}) => {
  const { settings, adminPayBalance, showToast } = useApp();

  const [amountToReturnInput, setAmountToReturnInput] = useState<string>('');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize input with currentBalance when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountToReturnInput(currentBalance > 0 ? String(currentBalance) : '');
      setReturnNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, currentBalance]);

  if (!isOpen) return null;

  const returnAmountNum = parseFloat(amountToReturnInput) || 0;
  const isOverReturn = returnAmountNum > currentBalance;
  const remainingBalance = Math.max(0, currentBalance - returnAmountNum);
  const isFullReturn = returnAmountNum === currentBalance && currentBalance > 0;
  const isPartialReturn = returnAmountNum > 0 && returnAmountNum < currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict validation per Requirement 8
    if (returnAmountNum > currentBalance) {
      setErrorMsg(
        `Amount cannot be greater than the available balance of ${settings.currencySymbol}${currentBalance.toLocaleString('en-IN')}.`
      );
      return;
    }

    if (returnAmountNum <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0 to return.');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminPayBalance({
        userId: customer.userId,
        userMobile: customer.userMobile,
        userName: customer.userName,
        amount: returnAmountNum,
        notes:
          returnNotes.trim() ||
          `Returned cash balance of ${settings.currencySymbol}${returnAmountNum.toLocaleString('en-IN')} to customer`,
        relatedRequestId: relatedRequestId,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Error returning balance:', err);
      setErrorMsg(
        err?.message ||
          `Amount cannot be greater than the available balance of ${settings.currencySymbol}${currentBalance.toLocaleString('en-IN')}.`
      );
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
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">Return Balance to User</h3>
              <p className="text-xs text-zinc-400">
                Customer: <span className="text-white font-bold">{customer.userName}</span> •{' '}
                <span className="text-amber-400 font-medium">{customer.userMobile}</span>
              </p>
            </div>
          </div>

          {/* Current User Balance Banner */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                Current User Balance
              </span>
              <p className="text-xs text-zinc-400">Available extra credit to return</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-amber-400 block" id="text-current-user-balance">
                {settings.currencySymbol}
                {currentBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount to Return Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300">
                  Amount to Return ({settings.currencySymbol}) <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAmountToReturnInput(String(currentBalance));
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    Return Full ({settings.currencySymbol}{currentBalance.toLocaleString('en-IN')})
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-extrabold text-lg">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={currentBalance}
                  required
                  autoFocus
                  placeholder={`Max ${currentBalance}`}
                  value={amountToReturnInput}
                  onChange={(e) => {
                    setAmountToReturnInput(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    if (val > currentBalance) {
                      setErrorMsg(
                        `Amount cannot be greater than the available balance of ${settings.currencySymbol}${currentBalance.toLocaleString('en-IN')}.`
                      );
                    } else {
                      setErrorMsg(null);
                    }
                  }}
                  className={`w-full pl-9 pr-4 py-3 bg-zinc-950 border rounded-2xl text-lg font-extrabold focus:outline-none transition-colors ${
                    isOverReturn
                      ? 'border-rose-500 text-rose-400 focus:border-rose-500'
                      : 'border-zinc-700 focus:border-amber-500 text-white'
                  }`}
                  id="input-amount-to-return"
                />
              </div>
            </div>

            {/* Live Automated Balance Breakdown */}
            {returnAmountNum > 0 && !isOverReturn && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <span className="text-zinc-400 font-medium">Previous Balance:</span>
                  <span className="font-extrabold text-white">
                    {settings.currencySymbol}{currentBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Amount Returned to Customer:</span>
                  <span className="font-extrabold text-amber-400">
                    -{settings.currencySymbol}{returnAmountNum.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-400 font-medium">Remaining User Balance:</span>
                  <span
                    className={`font-extrabold ${
                      remainingBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {settings.currencySymbol}{remainingBalance.toLocaleString('en-IN')}
                    {remainingBalance === 0 && ' (Balance Cleared)'}
                  </span>
                </div>

                {/* Case D: Full Balance Return */}
                {isFullReturn && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Full Balance Return → Balance: {settings.currencySymbol}0
                    </span>
                    <span className="uppercase text-[10px] tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-md">
                      Status: Balance Cleared
                    </span>
                  </div>
                )}

                {/* Case C: Partial Balance Return */}
                {isPartialReturn && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      Remaining balance: {settings.currencySymbol}{remainingBalance.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-amber-200/80">
                      The "Pay User Balance" button will continue to appear because {settings.currencySymbol}{remainingBalance.toLocaleString('en-IN')} remains to be returned later.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Strict Overpayment Rejection Error (Requirement 8) */}
            {isOverReturn && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold">Overpayment not allowed!</p>
                  <p>
                    Amount cannot be greater than the available balance of{' '}
                    <strong>
                      {settings.currencySymbol}{currentBalance.toLocaleString('en-IN')}
                    </strong>
                    . The balance cannot become negative.
                  </p>
                </div>
              </div>
            )}

            {/* General Error Alert */}
            {errorMsg && !isOverReturn && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Return Notes / Method <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Returned in cash at store counter / UPI refund"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                id="input-return-notes"
              />
            </div>

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
                disabled={isSubmitting || returnAmountNum <= 0 || isOverReturn}
                className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                id="btn-confirm-return-balance"
              >
                {isSubmitting ? (
                  <span>Processing Return...</span>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>
                      Confirm Return ({settings.currencySymbol}
                      {returnAmountNum > 0 && !isOverReturn ? returnAmountNum.toLocaleString('en-IN') : '0'})
                    </span>
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
