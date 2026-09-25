import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OrderRequest } from '../types';
import { getRequestPrice, getRequestPaid, getRequestRemaining } from '../lib/calculations';
import { X, Coins, Wallet, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface PayWithBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OrderRequest | null;
}

export const PayWithBalanceModal: React.FC<PayWithBalanceModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const { userPayRequestWithBalance, getUserBalanceInfo, currentUser, settings } = useApp();

  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userBalInfo = getUserBalanceInfo(currentUser?.mobileNumber || '', currentUser?.id);
  const availableBalance = userBalInfo.availableBalance;

  const totalPrice = request ? getRequestPrice(request) : 0;
  const currentPaid = request ? getRequestPaid(request) : 0;
  const remainingDue = request ? getRequestRemaining(request) : 0;
  const maxCanPay = Math.min(availableBalance, remainingDue);

  useEffect(() => {
    if (isOpen && request) {
      setErrorMsg(null);
      setAmount(String(maxCanPay > 0 ? maxCanPay : ''));
    }
  }, [isOpen, request, maxCanPay]);

  if (!isOpen || !request) return null;

  const numAmount = Number(amount) || 0;
  const newOrderRemaining = Math.max(0, remainingDue - numAmount);
  const newAccountBalance = Math.max(0, availableBalance - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹0.');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMsg(
        `Amount cannot exceed your available balance of ${settings.currencySymbol}${availableBalance.toLocaleString('en-IN')}.`
      );
      return;
    }

    if (numAmount > remainingDue) {
      setErrorMsg(
        `Amount cannot exceed remaining amount due of ${settings.currencySymbol}${remainingDue.toLocaleString('en-IN')}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await userPayRequestWithBalance(request.id, numAmount);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Payment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative"
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
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pay with DIGIZORT Balance</h3>
              <p className="text-xs text-zinc-400">Use your available account credit to settle this order</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Details Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-white text-sm block">{request.productName}</span>
                <span className="text-[10px] text-zinc-500 font-medium">#{request.id} • {request.purpose}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300">
                {request.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 block">Total Price</span>
                <span className="font-extrabold text-white">
                  {settings.currencySymbol}{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Already Paid</span>
                <span className="font-extrabold text-emerald-400">
                  {settings.currencySymbol}{currentPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Amount Due</span>
                <span className="font-extrabold text-rose-400">
                  {settings.currencySymbol}{remainingDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Overview Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-950 border border-emerald-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold block">Available DIGIZORT Balance</span>
                <span className="text-base font-black text-white">
                  {settings.currencySymbol}{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            {availableBalance >= remainingDue && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                Can Pay in Full
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-300">Amount to Pay from Balance</label>
                {maxCanPay > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(maxCanPay))}
                    className="text-[10px] text-emerald-400 font-extrabold hover:underline"
                  >
                    Use Max ({settings.currencySymbol}{maxCanPay.toLocaleString('en-IN')})
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={maxCanPay}
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Preset quick buttons */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {maxCanPay > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(maxCanPay))}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[10px] font-bold border border-zinc-700"
                  >
                    Full Due ({settings.currencySymbol}{maxCanPay.toLocaleString('en-IN')})
                  </button>
                )}
                {maxCanPay >= 100 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.floor(maxCanPay / 2)))}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold border border-zinc-700"
                  >
                    50% ({settings.currencySymbol}{Math.floor(maxCanPay / 2)})
                  </button>
                )}
                {maxCanPay >= 50 && (
                  <button
                    type="button"
                    onClick={() => setAmount('50')}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold border border-zinc-700"
                  >
                    {settings.currencySymbol}50
                  </button>
                )}
              </div>
            </div>

            {/* Live Calculation Preview */}
            {numAmount > 0 && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Balance to Deduct:</span>
                  <span className="font-extrabold text-emerald-400">
                    -{settings.currencySymbol}{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-300 pt-1 border-t border-zinc-800/80">
                  <span className="font-bold">Order Due After:</span>
                  <span className={`font-black ${newOrderRemaining === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {settings.currencySymbol}{newOrderRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    {newOrderRemaining === 0 && ' (Order Cleared)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/80 text-[11px]">
                  <span>Account Balance Remaining:</span>
                  <span className="font-semibold text-zinc-200">
                    {settings.currencySymbol}{newAccountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || numAmount <= 0 || numAmount > maxCanPay}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Payment</span>
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
