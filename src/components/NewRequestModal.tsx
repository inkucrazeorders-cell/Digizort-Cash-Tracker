import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { RequestType } from '../types';
import { X, PlusCircle, ShoppingBag, Link, DollarSign, FileText, Send, Coins, Wallet, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUseBalance?: boolean;
}

const REQUEST_TYPES: RequestType[] = [
  'Product Purchase',
  'Online Service',
  'Recharge & Bill Pay',
  'Software & Games',
  'Travel & Tickets',
  'Custom Request',
  'Others',
];

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, initialUseBalance = false }) => {
  const { submitNewRequest, settings, currentUser, getUserBalanceInfo } = useApp();

  const [requestType, setRequestType] = useState<RequestType>('Product Purchase');
  const [productName, setProductName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [productLink, setProductLink] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full_balance' | 'partial_balance' | 'external'>('external');
  const [customBalanceAmount, setCustomBalanceAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userBalInfo = getUserBalanceInfo(currentUser?.mobileNumber || '', currentUser?.id);
  const availableBalance = userBalInfo.availableBalance;

  const numPrice = Math.max(0, Number(expectedPrice) || 0);

  // Initialize payment mode when modal opens or price changes
  useEffect(() => {
    if (isOpen) {
      if (initialUseBalance && availableBalance > 0) {
        if (numPrice > 0 && availableBalance >= numPrice) {
          setPaymentMode('full_balance');
          setCustomBalanceAmount(String(numPrice));
        } else {
          setPaymentMode('partial_balance');
          setCustomBalanceAmount(String(Math.min(availableBalance, numPrice || availableBalance)));
        }
      } else if (availableBalance > 0 && numPrice > 0 && availableBalance >= numPrice) {
        // keep current selection if user already selected something
      }
    }
  }, [isOpen, initialUseBalance, availableBalance]);

  // Synchronize custom balance amount when switching modes or price changes
  const maxUsableBalance = Math.min(availableBalance, numPrice);

  let effectiveBalanceUsed = 0;
  if (paymentMode === 'full_balance') {
    effectiveBalanceUsed = Math.min(availableBalance, numPrice);
  } else if (paymentMode === 'partial_balance') {
    const customNum = Number(customBalanceAmount);
    effectiveBalanceUsed = isNaN(customNum) ? 0 : Math.min(Math.max(0, customNum), maxUsableBalance);
  } else {
    effectiveBalanceUsed = 0;
  }

  const remainingOrderDue = Math.max(0, numPrice - effectiveBalanceUsed);
  const remainingAccountBalance = Math.max(0, availableBalance - effectiveBalanceUsed);

  if (!isOpen) return null;

  const handleSelectFullBalance = () => {
    setPaymentMode('full_balance');
    setCustomBalanceAmount(String(Math.min(availableBalance, numPrice)));
    setErrorMsg(null);
  };

  const handleSelectPartialBalance = () => {
    setPaymentMode('partial_balance');
    if (!customBalanceAmount || Number(customBalanceAmount) <= 0 || Number(customBalanceAmount) > maxUsableBalance) {
      setCustomBalanceAmount(String(maxUsableBalance > 0 ? maxUsableBalance : Math.min(availableBalance, 100)));
    }
    setErrorMsg(null);
  };

  const handleSelectExternal = () => {
    setPaymentMode('external');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productName.trim() || !purpose.trim() || !expectedPrice) return;
    if (numPrice <= 0) {
      setErrorMsg('Please enter a valid expected price greater than 0.');
      return;
    }

    if (effectiveBalanceUsed > availableBalance) {
      setErrorMsg(`Balance used cannot exceed your available balance of ${settings.currencySymbol}${availableBalance}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await submitNewRequest({
        requestType,
        productName: productName.trim(),
        purpose: purpose.trim(),
        productLink: productLink.trim() || undefined,
        expectedPrice: numPrice,
        description: description.trim() || undefined,
        balanceToUse: effectiveBalanceUsed,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
          id="new-request-modal"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white shadow-lg shadow-[#E53935]/20">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Order Request</h3>
              <p className="text-xs text-zinc-400">
                Submit an order, recharge, or service with universal DIGIZORT balance options.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Request Type */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Request Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REQUEST_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setRequestType(type)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left border ${
                      requestType === type
                        ? 'bg-[#E53935] border-[#E53935] text-white shadow-md'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Product / Service Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Product / Service Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sony Headphones / ₹199 Mobile Recharge / Amazon Order"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-[#E53935]"
                id="input-product-name"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Purpose / Reason <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Monthly recharge / Personal shopping / Software license"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-[#E53935]"
                id="input-request-purpose"
              />
            </div>

            {/* Price & Link Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Expected Price ({settings.currencySymbol}) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="0.00"
                    value={expectedPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpectedPrice(val);
                      const n = Number(val) || 0;
                      if (paymentMode === 'full_balance') {
                        setCustomBalanceAmount(String(Math.min(availableBalance, n)));
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-[#E53935]"
                    id="input-expected-price"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Product URL / Link <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Link className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                  />
                </div>
              </div>
            </div>

            {/* UNIVERSAL DIGIZORT BALANCE PAYMENT METHOD SECTION */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-extrabold text-white">Payment Method</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-400 text-[11px]">Available Balance:</span>
                  <span className={`font-black ${availableBalance > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {settings.currencySymbol}
                    {availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {availableBalance > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-zinc-400">
                    Choose how you want to pay for this request using your available DIGIZORT balance:
                  </p>

                  <div className="space-y-2">
                    {/* Option 1: Pay using DIGIZORT Balance */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        paymentMode === 'full_balance'
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md'
                          : numPrice > 0 && availableBalance < numPrice
                          ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60'
                          : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      onClick={handleSelectFullBalance}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMode === 'full_balance'}
                        onChange={handleSelectFullBalance}
                        disabled={numPrice > 0 && availableBalance < numPrice}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Pay using DIGIZORT Balance
                          </span>
                          {numPrice > 0 && availableBalance >= numPrice && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Fully Paid
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {numPrice > 0 && availableBalance >= numPrice
                            ? `Deduct full ${settings.currencySymbol}${numPrice.toLocaleString('en-IN')} from your balance. Order will be fully paid immediately.`
                            : numPrice > 0
                            ? `Price (${settings.currencySymbol}${numPrice}) exceeds balance (${settings.currencySymbol}${availableBalance}). Use partial balance below.`
                            : 'Pay the full request price using your available account balance.'}
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Use Balance + Pay Remaining (Partial Balance) */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        paymentMode === 'partial_balance'
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md'
                          : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      onClick={handleSelectPartialBalance}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMode === 'partial_balance'}
                        onChange={handleSelectPartialBalance}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Use Balance + Pay Remaining Amount
                          </span>
                          <span className="text-[10px] font-bold text-amber-400">
                            Custom Amount
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Choose exactly how much balance to apply towards this order and pay the remaining amount later.
                        </p>

                        {paymentMode === 'partial_balance' && (
                          <div className="pt-1.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400 font-medium">Balance to use:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                                  {settings.currencySymbol}
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  min="1"
                                  max={maxUsableBalance || availableBalance}
                                  placeholder={String(maxUsableBalance || 0)}
                                  value={customBalanceAmount}
                                  onChange={(e) => setCustomBalanceAmount(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-white font-extrabold text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Quick Balance Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {maxUsableBalance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setCustomBalanceAmount(String(maxUsableBalance))}
                                  className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[10px] font-bold border border-zinc-700"
                                >
                                  Use Max ({settings.currencySymbol}{maxUsableBalance.toLocaleString('en-IN')})
                                </button>
                              )}
                              {maxUsableBalance >= 100 && (
                                <button
                                  type="button"
                                  onClick={() => setCustomBalanceAmount(String(Math.floor(maxUsableBalance / 2)))}
                                  className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold border border-zinc-700"
                                >
                                  50% ({settings.currencySymbol}{Math.floor(maxUsableBalance / 2)})
                                </button>
                              )}
                              {availableBalance >= 50 && (
                                <button
                                  type="button"
                                  onClick={() => setCustomBalanceAmount(String(Math.min(maxUsableBalance, 50)))}
                                  className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold border border-zinc-700"
                                >
                                  {settings.currencySymbol}50
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option 3: Pay using external / new payment */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        paymentMode === 'external'
                          ? 'bg-zinc-800/80 border-zinc-700 shadow-md'
                          : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      onClick={handleSelectExternal}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMode === 'external'}
                        onChange={handleSelectExternal}
                        className="mt-0.5 accent-[#E53935]"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-white block">
                          Pay using external / new payment
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Keep your balance untouched. Pay the full price through standard payment or cash upon review.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-zinc-900/60 text-zinc-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    <span>Pay using external / new payment</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold">Standard request</span>
                </div>
              )}

              {/* REAL-TIME BALANCE CALCULATION BREAKDOWN BOX */}
              {numPrice > 0 && (
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 text-xs">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block mb-1">
                    Order Payment Breakdown
                  </span>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Total Request Price:</span>
                    <strong className="text-white">
                      {settings.currencySymbol}{numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-emerald-400" />
                      <span>DIGIZORT Balance to Deduct:</span>
                    </span>
                    <strong className={effectiveBalanceUsed > 0 ? 'text-emerald-400' : 'text-zinc-500'}>
                      {effectiveBalanceUsed > 0 ? `-${settings.currencySymbol}${effectiveBalanceUsed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `${settings.currencySymbol}0.00`}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-xs">
                    <span className="font-bold text-white">Remaining Amount Due:</span>
                    <strong className={`font-black text-sm ${remainingOrderDue === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {settings.currencySymbol}{remainingOrderDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {remainingOrderDue === 0 && ' (Fully Paid)'}
                    </strong>
                  </div>

                  {availableBalance > 0 && effectiveBalanceUsed > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                      <span>Account Balance Remaining After:</span>
                      <strong className="text-zinc-200">
                        {settings.currencySymbol}{remainingAccountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Additional Specifications or Notes <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Specify color, size, urgency or special instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#E53935] resize-none"
              />
            </div>

            {/* Action Buttons */}
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
                disabled={isSubmitting || !productName.trim() || !expectedPrice || numPrice <= 0}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
                id="btn-submit-request-form"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {effectiveBalanceUsed > 0
                        ? remainingOrderDue === 0
                          ? 'Pay with Balance & Submit'
                          : 'Use Balance & Submit Request'
                        : 'Submit Request'}
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

