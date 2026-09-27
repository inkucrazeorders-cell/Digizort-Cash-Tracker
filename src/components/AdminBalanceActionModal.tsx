import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { BalanceTransaction } from '../types';
import {
  X,
  RotateCcw,
  Edit3,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Coins,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';

export interface AdminBalanceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: BalanceTransaction | null;
  mode: 'reverse' | 'edit' | 'cancel' | null;
  onSuccess?: () => void;
}

export const AdminBalanceActionModal: React.FC<AdminBalanceActionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  mode,
  onSuccess,
}) => {
  const {
    settings,
    getUserBalanceInfo,
    adminReverseBalanceCredit,
    adminEditBalanceCredit,
    adminCancelBalanceCredit,
    showToast,
  } = useApp();

  const [reason, setReason] = useState('');
  const [reverseAmountInput, setReverseAmountInput] = useState('');
  const [newIntendedAmountInput, setNewIntendedAmountInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Read authoritative balance for user
  const userBal = transaction
    ? getUserBalanceInfo(transaction.userMobile, transaction.userId)
    : { availableBalance: 0 };
  const currentAvailable = userBal.availableBalance;

  const origAmount = transaction
    ? (transaction.newIntendedAmount ?? transaction.originalCreditAmount ?? transaction.amount)
    : 0;
  const maxSafeReversible = Math.min(origAmount, currentAvailable);

  // Initialize input fields when modal opens or transaction/mode changes
  useEffect(() => {
    if (isOpen && transaction) {
      setReason('');
      setErrorMsg(null);
      if (mode === 'reverse') {
        setReverseAmountInput(maxSafeReversible > 0 ? String(maxSafeReversible) : '0');
      } else if (mode === 'edit') {
        setNewIntendedAmountInput(String(origAmount));
      } else if (mode === 'cancel') {
        // Cancel uses safe amount automatically
      }
    }
  }, [isOpen, transaction, mode, origAmount, maxSafeReversible]);

  if (!isOpen || !transaction || !mode) return null;

  // Validation & Calculations for Reverse Mode
  const numReverseAmount = Number(reverseAmountInput) || 0;
  const isReverseValid =
    numReverseAmount > 0 &&
    numReverseAmount <= maxSafeReversible &&
    numReverseAmount <= currentAvailable;
  const newBalanceAfterReverse = Math.max(0, currentAvailable - numReverseAmount);

  // Validation & Calculations for Edit Mode
  const numIntendedAmount = Number(newIntendedAmountInput);
  const isIntendedValidNumber =
    !isNaN(numIntendedAmount) && newIntendedAmountInput.trim() !== '' && numIntendedAmount >= 0;
  const diff = isIntendedValidNumber ? numIntendedAmount - origAmount : 0;
  const isReduction = diff < 0;
  const isAddition = diff > 0;
  const reductionAmount = Math.abs(diff);

  // Safe reduction check: Cannot reduce by more than user currently has available!
  const hasEnoughBalanceForReduction = !isReduction || reductionAmount <= currentAvailable;
  const maxSafeReduction = Math.min(origAmount, currentAvailable);
  const minAllowedIntendedAmount = Math.max(0, origAmount - currentAvailable);

  const newBalanceAfterEdit = isReduction
    ? Math.max(0, currentAvailable - reductionAmount)
    : isAddition
    ? currentAvailable + diff
    : currentAvailable;

  const isEditSubmittable =
    isIntendedValidNumber &&
    diff !== 0 &&
    hasEnoughBalanceForReduction &&
    reason.trim().length > 0;

  // Cancellation calculations
  const safeCancelAmount = Math.min(origAmount, currentAvailable);
  const newBalanceAfterCancel = Math.max(0, currentAvailable - safeCancelAmount);
  const isCancelSubmittable = reason.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('Please provide a mandatory reason for this financial transaction.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === 'reverse') {
        if (!isReverseValid) {
          setErrorMsg(
            `Reversal amount cannot exceed safe available balance of ${settings.currencySymbol}${maxSafeReversible.toLocaleString('en-IN')}.`
          );
          return;
        }
        await adminReverseBalanceCredit({
          originalTransactionId: transaction.id,
          reason: reason.trim(),
          amountToReverse: numReverseAmount,
        });
      } else if (mode === 'edit') {
        if (!isEditSubmittable) {
          if (!hasEnoughBalanceForReduction) {
            setErrorMsg(
              `Cannot reduce credit by ${settings.currencySymbol}${reductionAmount.toLocaleString('en-IN')}: Customer only has ${settings.currencySymbol}${currentAvailable.toLocaleString('en-IN')} available balance. Minimum intended amount is ${settings.currencySymbol}${minAllowedIntendedAmount.toLocaleString('en-IN')}.`
            );
          } else {
            setErrorMsg('Please specify a valid intended amount different from original.');
          }
          return;
        }
        await adminEditBalanceCredit({
          originalTransactionId: transaction.id,
          newIntendedAmount: numIntendedAmount,
          reason: reason.trim(),
        });
      } else if (mode === 'cancel') {
        await adminCancelBalanceCredit({
          originalTransactionId: transaction.id,
          reason: reason.trim(),
        });
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Admin balance action error:', err);
      setErrorMsg(err?.message || 'Failed to process balance management action.');
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
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                mode === 'reverse'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : mode === 'edit'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
            >
              {mode === 'reverse' && <RotateCcw className="w-6 h-6" />}
              {mode === 'edit' && <Edit3 className="w-6 h-6" />}
              {mode === 'cancel' && <Ban className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {mode === 'reverse' && 'Reverse / Take Back Balance'}
                {mode === 'edit' && 'Edit / Correct Balance Credit'}
                {mode === 'cancel' && 'Cancel Balance Credit'}
              </h3>
              <p className="text-xs text-zinc-400">
                Customer: <span className="text-white font-bold">{transaction.userName}</span> •{' '}
                <span className="text-zinc-300 font-medium">{transaction.userMobile}</span>
              </p>
            </div>
          </div>

          {/* Original Transaction Summary Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold uppercase text-[10px]">Original Transaction</span>
              <span className="font-mono text-zinc-500 text-[10px]">#{transaction.id}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span>Original Amount Credited:</span>
              <span className="font-extrabold text-amber-400 text-sm">
                +{settings.currencySymbol}
                {origAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Date Recorded:</span>
              <span>
                {transaction.date} at {transaction.time}
              </span>
            </div>
            {(transaction.reason || transaction.notes) && (
              <div className="pt-1.5 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                <span>Reason / Notes: </span>
                <span className="text-zinc-300 italic">"{transaction.reason || transaction.notes}"</span>
              </div>
            )}
          </div>

          {/* Current Available Balance Banner */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">
                Current Available Balance
              </span>
              <span className="text-xs text-zinc-400">Total customer balance in system</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-emerald-400 block">
                {settings.currencySymbol}
                {currentAvailable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ================= MODE: REVERSE ================= */}
            {mode === 'reverse' && (
              <div className="space-y-3">
                {/* Partial Usage Warning if spent */}
                {currentAvailable < origAmount && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Partial Balance Spent by User</p>
                      <p className="text-[11px] text-amber-200/90">
                        {currentAvailable > 0
                          ? `Only ${settings.currencySymbol}${currentAvailable.toLocaleString('en-IN')} of this balance is currently available to reverse because part of the original credit has already been used.`
                          : 'User has spent all available funds. Available balance is ₹0. Balance cannot become negative.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Amount to Reverse */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">
                      Amount to Reverse ({settings.currencySymbol}) *
                    </label>
                    <span className="text-[10px] text-zinc-500">
                      Max safe: {settings.currencySymbol}{maxSafeReversible.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={maxSafeReversible}
                      step="any"
                      required
                      disabled={maxSafeReversible <= 0}
                      value={reverseAmountInput}
                      onChange={(e) => setReverseAmountInput(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-bold text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Live Preview */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
                  <div className="flex justify-between text-zinc-400">
                    <span>Reversing from Credit:</span>
                    <span className="text-amber-400 font-bold">
                      -{settings.currencySymbol}
                      {numReverseAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Current Available Balance:</span>
                    <span>
                      {settings.currencySymbol}
                      {currentAvailable.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-extrabold border-t border-zinc-800 pt-1.5">
                    <span>New Balance After Reversal:</span>
                    <span className={newBalanceAfterReverse === 0 ? 'text-emerald-400' : 'text-white'}>
                      {settings.currencySymbol}
                      {newBalanceAfterReverse.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ================= MODE: EDIT ================= */}
            {mode === 'edit' && (
              <div className="space-y-3">
                {/* Safe constraint warning if reduction exceeds available */}
                {!hasEnoughBalanceForReduction && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Cannot Create Negative Balance</p>
                      <p className="text-[11px] text-rose-200/90">
                        Customer has already spent part of their balance and only has{' '}
                        <strong>
                          {settings.currencySymbol}
                          {currentAvailable.toLocaleString('en-IN')}
                        </strong>{' '}
                        available. The minimum intended amount you can set right now is{' '}
                        <strong>
                          {settings.currencySymbol}
                          {minAllowedIntendedAmount.toLocaleString('en-IN')}
                        </strong>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {/* New Intended Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">
                      New Intended Amount ({settings.currencySymbol}) *
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      Originally: {settings.currencySymbol}{origAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      min={minAllowedIntendedAmount}
                      step="any"
                      required
                      value={newIntendedAmountInput}
                      onChange={(e) => setNewIntendedAmountInput(e.target.value)}
                      placeholder="e.g. 300"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Live Adjustment Calculation Preview */}
                {isIntendedValidNumber && diff !== 0 && (
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Adjustment Required:</span>
                      <span
                        className={`font-extrabold ${
                          isReduction ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isReduction ? '-' : '+'}
                        {settings.currencySymbol}
                        {Math.abs(diff).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Compensating Transaction:</span>
                      <span className="text-zinc-300 font-mono text-[11px]">
                        {isReduction ? 'Balance Correction (Debit)' : 'Balance Correction (Credit)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-white font-extrabold border-t border-zinc-800 pt-1.5">
                      <span>New Available Balance:</span>
                      <span className={newBalanceAfterEdit === 0 ? 'text-emerald-400' : 'text-white'}>
                        {settings.currencySymbol}
                        {newBalanceAfterEdit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= MODE: CANCEL ================= */}
            {mode === 'cancel' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Cancel Balance Credit #{transaction.id}?</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    This will mark the original transaction as <strong>Cancelled</strong> and create a compensating reversal transaction of{' '}
                    <strong>
                      {settings.currencySymbol}
                      {safeCancelAmount.toLocaleString('en-IN')}
                    </strong>
                    . The original record remains in history for audit compliance.
                  </p>
                  {safeCancelAmount < origAmount && (
                    <p className="text-[10px] text-amber-300 font-semibold pt-1 border-t border-rose-500/20">
                      Note: User has already spent part of this credit. Only {settings.currencySymbol}
                      {safeCancelAmount.toLocaleString('en-IN')} will be deducted to avoid a negative balance.
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs flex justify-between items-center">
                  <span className="text-zinc-400">New Balance After Cancellation:</span>
                  <span className="font-extrabold text-white text-sm">
                    {settings.currencySymbol}
                    {newBalanceAfterCancel.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Mandatory Reason Field for all Financial Actions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Reason for Financial Action *</span>
                <span className="text-[10px] text-rose-400 font-medium">Required for Audit</span>
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  mode === 'reverse'
                    ? 'e.g. Granted by mistake, reward condition not met, revoked...'
                    : mode === 'edit'
                    ? 'e.g. Corrected intended tier amount from ₹1000 to ₹750...'
                    : 'e.g. Cancelled promotional credit, duplicate entry rollback...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500 resize-none placeholder-zinc-500"
              />
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
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
                disabled={
                  isSubmitting ||
                  !reason.trim() ||
                  (mode === 'reverse' && (!isReverseValid || maxSafeReversible <= 0)) ||
                  (mode === 'edit' && !isEditSubmittable)
                }
                className={`py-2.5 px-4 rounded-xl font-extrabold text-xs shadow-lg transition-all flex-[2] flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  mode === 'reverse'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                    : mode === 'edit'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                }`}
                id="btn-confirm-admin-balance-action"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    {mode === 'reverse' && <RotateCcw className="w-4 h-4" />}
                    {mode === 'edit' && <Edit3 className="w-4 h-4" />}
                    {mode === 'cancel' && <Ban className="w-4 h-4" />}
                    <span>
                      {mode === 'reverse' && 'Confirm Reversal'}
                      {mode === 'edit' && 'Confirm Correction'}
                      {mode === 'cancel' && 'Confirm Cancellation'}
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
