import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { AppUser, OrderRequest } from '../types';
import { getRequestPrice, getRequestRemaining } from '../lib/calculations';
import {
  X,
  Coins,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface BalanceManagementModalProps {
  user: AppUser | null;
  mode: 'pay' | 'use' | null;
  onClose: () => void;
  preselectedRequestId?: string;
}

export const BalanceManagementModal: React.FC<BalanceManagementModalProps> = ({
  user,
  mode,
  onClose,
  preselectedRequestId,
}) => {
  const {
    settings,
    allRequests,
    getUserBalanceInfo,
    adminPayBalance,
    adminUseBalance,
    showToast,
  } = useApp();

  if (!user || !mode) return null;

  const balanceInfo = getUserBalanceInfo(user.mobileNumber, user.id);
  const availableBalance = balanceInfo.availableBalance;

  // Filter active requests for this user that have pending balances
  const userPendingRequests = allRequests.filter((r) => {
    const isUser = r.userMobile === user.mobileNumber || r.userId === user.id;
    if (!isUser) return false;
    const rem = getRequestRemaining(r);
    return rem > 0 && r.status !== 'Rejected' && r.status !== 'Cancelled';
  });

  const [selectedReqId, setSelectedReqId] = useState<string>(preselectedRequestId || '');
  const [amountInput, setAmountInput] = useState<string>(() => {
    if (mode === 'pay') {
      return String(availableBalance > 0 ? availableBalance : '');
    }
    if (mode === 'use') {
      if (preselectedRequestId) {
        const found = userPendingRequests.find((r) => r.id === preselectedRequestId);
        if (found) {
          const due = getRequestRemaining(found);
          return String(Math.min(availableBalance, due));
        }
      }
      return String(availableBalance > 0 ? availableBalance : '');
    }
    return '';
  });

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numAmount = Number(amountInput) || 0;
  const isValidAmount = numAmount > 0 && numAmount <= availableBalance;
  const remainingBalance = Math.max(0, availableBalance - numAmount);
  const isClearingBalance = isValidAmount && remainingBalance === 0;

  // Handler when a request is selected in "Use Balance" mode
  const handleSelectRequest = (reqId: string) => {
    setSelectedReqId(reqId);
    setErrorMessage(null);
    if (reqId) {
      const target = userPendingRequests.find((r) => r.id === reqId);
      if (target) {
        const due = getRequestRemaining(target);
        // Pre-fill with the needed amount or full available balance
        setAmountInput(String(Math.min(availableBalance, due)));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage('Amount must be greater than ₹0.');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMessage(
        `Entered amount (₹${numAmount.toLocaleString('en-IN')}) cannot exceed available balance of ₹${availableBalance.toLocaleString('en-IN')}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === 'pay') {
        await adminPayBalance({
          userId: user.id,
          userMobile: user.mobileNumber,
          userName: user.fullName,
          amount: numAmount,
          notes: notes.trim() || undefined,
        });
      } else if (mode === 'use') {
        await adminUseBalance({
          userId: user.id,
          userMobile: user.mobileNumber,
          userName: user.fullName,
          amount: numAmount,
          relatedRequestId: selectedReqId || undefined,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Balance action error:', err);
      setErrorMessage(err.message || 'An error occurred while processing balance transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
                  mode === 'pay'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {mode === 'pay' ? <DollarSign className="w-6 h-6" /> : <Coins className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {mode === 'pay' ? 'Pay Customer Balance' : 'Use Balance Credit'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Customer: <span className="text-white font-bold">{user.fullName}</span> (
                  <span className="text-rose-400 font-bold">{user.mobileNumber}</span>)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Available Balance Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Current Available Balance
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 block">
                {settings.currencySymbol}
                {availableBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="text-right">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                  availableBalance > 0
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {availableBalance > 0 ? 'Active Credit' : 'Zero / Cleared'}
              </span>
            </div>
          </div>

          {availableBalance <= 0 ? (
            <div className="p-6 text-center bg-zinc-950/60 rounded-2xl border border-zinc-800 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Outstanding Balance</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                This customer currently has ₹0 balance. Any future extra payments or balance adjustments
                will automatically appear here.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* If "Use Balance" mode: Option to link with a pending request */}
              {mode === 'use' && userPendingRequests.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Apply Towards Pending Request <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={selectedReqId}
                    onChange={(e) => handleSelectRequest(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">General Balance Deduction (No specific order)</option>
                    {userPendingRequests.map((req) => {
                      const due = getRequestRemaining(req);
                      return (
                        <option key={req.id} value={req.id}>
                          Order #{req.id} - {req.productName} (Due: {settings.currencySymbol}
                          {due.toLocaleString('en-IN')})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    {mode === 'pay' ? 'Enter Amount to Pay / Return' : 'Enter Amount to Use / Deduct'}{' '}
                    ({settings.currencySymbol}) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAmountInput(String(availableBalance));
                        setErrorMessage(null);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold transition-colors"
                    >
                      Full Balance ({settings.currencySymbol}{availableBalance.toLocaleString('en-IN')})
                    </button>
                    {availableBalance > 10 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAmountInput(String(Math.floor(availableBalance / 2)));
                          setErrorMessage(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors"
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={availableBalance}
                    required
                    placeholder="Enter amount (e.g. 50)"
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setErrorMessage(null);
                    }}
                    className={`w-full bg-zinc-950 border rounded-xl pl-8 pr-4 py-2.5 text-lg font-extrabold focus:outline-none transition-colors ${
                      mode === 'pay'
                        ? 'text-emerald-400 border-zinc-800 focus:border-emerald-500'
                        : 'text-blue-400 border-zinc-800 focus:border-blue-500'
                    }`}
                    id="input-balance-amount"
                  />
                </div>
              </div>

              {/* Real-time Calculation Ledger Preview */}
              {numAmount > 0 && (
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Previous Available Balance:</span>
                    <span className="font-bold text-white">
                      {settings.currencySymbol}
                      {availableBalance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>{mode === 'pay' ? 'Amount to Return:' : 'Amount to Deduct:'}</span>
                    <span
                      className={`font-bold ${
                        mode === 'pay' ? 'text-emerald-400' : 'text-blue-400'
                      }`}
                    >
                      -{settings.currencySymbol}
                      {numAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between pt-1.5 border-t border-zinc-800 font-extrabold">
                    <span className="text-zinc-300">Remaining Balance:</span>
                    <span className={remainingBalance === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                      {settings.currencySymbol}
                      {remainingBalance.toLocaleString('en-IN')}
                      {remainingBalance === 0 && ' (Cleared)'}
                    </span>
                  </div>

                  {isClearingBalance && (
                    <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Balance will be fully settled & marked as Cleared (₹0).</span>
                    </div>
                  )}

                  {!isClearingBalance && remainingBalance > 0 && (
                    <p className="text-[11px] text-zinc-400 pt-1">
                      Remaining {settings.currencySymbol}
                      {remainingBalance.toLocaleString('en-IN')} will stay in the user's account for future
                      requests.
                    </p>
                  )}
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Transaction Note / Payment Mode <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    mode === 'pay'
                      ? 'e.g. Returned via UPI / Cash / Refunded to customer'
                      : 'e.g. Adjusted for order / Service fee'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex-1 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !isValidAmount}
                  className={`py-2.5 px-4 text-white font-extrabold text-xs rounded-xl flex-1 shadow-lg transition-all flex items-center justify-center gap-2 ${
                    mode === 'pay'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 disabled:opacity-50'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:brightness-110 disabled:opacity-50'
                  }`}
                  id="btn-confirm-balance-action"
                >
                  {isSubmitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>
                        {mode === 'pay' ? 'Confirm Pay Balance' : 'Confirm Use Balance'} (
                        {settings.currencySymbol}
                        {numAmount.toLocaleString('en-IN')})
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
