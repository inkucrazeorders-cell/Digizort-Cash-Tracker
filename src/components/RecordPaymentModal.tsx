import React, { useState } from 'react';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { X, DollarSign, CheckCircle2, Sparkles } from 'lucide-react';

interface RecordPaymentModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { settings, recordPayment } = useApp();

  const currentRemaining =
    transaction.remainingAmount ??
    (transaction.status === 'Paid' ? 0 : transaction.amount - (transaction.amountPaid || 0));

  const [amountInput, setAmountInput] = useState<string>(
    currentRemaining.toString()
  );
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const paymentNum = parseFloat(amountInput) || 0;
  const newRemaining = Math.max(0, currentRemaining - paymentNum);
  const isFullPayment = paymentNum >= currentRemaining && currentRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentNum <= 0) return;

    try {
      setIsSubmitting(true);
      await recordPayment(transaction.id, paymentNum, note);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Record Friend Payment</h3>
            <p className="text-xs text-zinc-400">
              {transaction.friendName} • {transaction.purpose}
            </p>
          </div>
        </div>

        {/* Current State Summary */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
              Original Amount
            </span>
            <span className="font-bold text-white">
              {settings.currencySymbol}
              {transaction.amount.toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
              Current Remaining
            </span>
            <span className="font-extrabold text-rose-400">
              {settings.currencySymbol}
              {currentRemaining.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300">Amount Received Today</label>
              <button
                type="button"
                onClick={() => setAmountInput(currentRemaining.toString())}
                className="text-[10px] font-bold text-[#E53935] hover:underline"
              >
                Set Full ({settings.currencySymbol}{currentRemaining})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                max={currentRemaining}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white text-base font-bold focus:outline-none focus:border-[#E53935]"
                placeholder="Enter amount"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              Payment Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
              placeholder="e.g. Paid via UPI / GPay / Cash"
            />
          </div>

          {/* Live Result Calculation Box */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">New Balance After Payment:</span>
            <span
              className={`font-extrabold text-sm ${
                newRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {settings.currencySymbol}
              {newRemaining.toLocaleString('en-IN')}{' '}
              {newRemaining === 0 ? '(Completed 🎉)' : '(Partially Paid)'}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || paymentNum <= 0}
            className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              isFullPayment
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 shadow-emerald-600/20'
                : 'bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 shadow-[#E53935]/20'
            }`}
          >
            {isFullPayment ? <Sparkles className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {isSubmitting
              ? 'Processing...'
              : isFullPayment
              ? 'Confirm Full Payment & Close'
              : 'Record Partial Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};
