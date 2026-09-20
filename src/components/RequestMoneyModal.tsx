import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowDownToLine, Coins, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  pendingRequestedAmount: number;
  requestableBalance: number;
}

export const RequestMoneyModal: React.FC<RequestMoneyModalProps> = ({
  isOpen,
  onClose,
  availableBalance,
  pendingRequestedAmount,
  requestableBalance,
}) => {
  const { userSubmitBalanceRequest, settings } = useApp();

  const [amount, setAmount] = useState<string>('');
  const [paymentDetail, setPaymentDetail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    const clamped = Math.min(val, requestableBalance);
    setAmount(clamped > 0 ? clamped.toString() : '');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter an amount greater than ₹0.');
      return;
    }

    if (numAmount > requestableBalance) {
      if (pendingRequestedAmount > 0) {
        setError(
          `You have ₹${pendingRequestedAmount.toLocaleString(
            'en-IN'
          )} in pending requests. Maximum available to request now is ₹${requestableBalance.toLocaleString(
            'en-IN'
          )}.`
        );
      } else {
        setError(
          `Requested amount cannot exceed your available balance of ₹${availableBalance.toLocaleString(
            'en-IN'
          )}.`
        );
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await userSubmitBalanceRequest({
        amount: numAmount,
        userNotes: paymentDetail.trim() || undefined,
      });
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to submit balance request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
        id="modal-request-money"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          id="btn-close-request-money"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Request Money</h3>
            <p className="text-xs text-zinc-400">Withdraw or receive your available credit balance</p>
          </div>
        </div>

        {/* Balance Overview Card */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 mb-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Available Balance:</span>
            <span className="text-white font-extrabold text-sm">
              {settings.currencySymbol}
              {availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {pendingRequestedAmount > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Requests:</span>
              </span>
              <span className="text-amber-300 font-bold">
                -{settings.currencySymbol}
                {pendingRequestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800">
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
              Available to Request Now:
            </span>
            <span className="text-emerald-400 font-black text-base">
              {settings.currencySymbol}
              {requestableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>How much do you want to receive?</span>
              {requestableBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(requestableBalance)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-extrabold hover:underline"
                >
                  Use Full Amount ({settings.currencySymbol}
                  {requestableBalance.toLocaleString('en-IN')})
                </button>
              )}
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                max={requestableBalance}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="Enter amount (e.g. 50)"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 pl-8 pr-4 text-white text-sm font-semibold outline-none transition-colors"
                id="input-request-money-amount"
                autoFocus
              />
            </div>

            {/* Quick Amount Suggestion Chips */}
            {requestableBalance > 0 && (
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-zinc-500 mr-1">Quick:</span>
                {[50, 100, 200, 500]
                  .filter((v) => v <= requestableBalance && v !== requestableBalance)
                  .map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold transition-colors"
                    >
                      {settings.currencySymbol}
                      {val}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => handleQuickAmount(requestableBalance)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors"
                >
                  Entire Balance ({settings.currencySymbol}
                  {requestableBalance.toLocaleString('en-IN')})
                </button>
              </div>
            )}
          </div>

          {/* Payment Detail / Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">
              Note / Payment Details <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={paymentDetail}
              onChange={(e) => setPaymentDetail(e.target.value)}
              placeholder="e.g. UPI ID: name@upi or Cash payout"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-white text-xs outline-none transition-colors"
              id="input-request-money-notes"
            />
            <p className="text-[10px] text-zinc-500">
              The admin will review your payout request and process it accordingly.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-colors"
              id="btn-cancel-request-money"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || requestableBalance <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              id="btn-submit-request-money"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
