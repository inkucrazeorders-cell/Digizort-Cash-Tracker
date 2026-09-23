import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderRequest } from '../types';
import { useApp } from '../context/AppContext';
import { getRequestPrice, getOriginalPrice, getRequestRemaining } from '../lib/calculations';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Clock,
  ShieldCheck,
  Tag,
} from 'lucide-react';

interface AdminOfferModalProps {
  isOpen: boolean;
  request: OrderRequest | null;
  onClose: () => void;
}

export const AdminOfferModal: React.FC<AdminOfferModalProps> = ({
  isOpen,
  request,
  onClose,
}) => {
  const { adminApplyOffer, settings, showToast } = useApp();

  const [newOfferPriceInput, setNewOfferPriceInput] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>(
    'Good news! We received a special supplier offer for your order and can provide it to you at a lower price.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const originalPrice = getOriginalPrice(request);
  const currentPrice = getRequestPrice(request);
  const paid = Number(request.amountPaid) || 0;
  const currentRemaining = getRequestRemaining(request);

  const parsedOfferPrice = parseFloat(newOfferPriceInput);
  const isValidNumber = !isNaN(parsedOfferPrice) && parsedOfferPrice > 0;
  const isLowerThanCurrent = isValidNumber && parsedOfferPrice < currentPrice;
  const savings = isLowerThanCurrent ? currentPrice - parsedOfferPrice : 0;
  const totalSavingsFromOriginal = isLowerThanCurrent ? originalPrice - parsedOfferPrice : 0;
  const simulatedRemaining = isLowerThanCurrent ? Math.max(0, parsedOfferPrice - paid) : 0;
  const excessCreditGenerated = isLowerThanCurrent && paid > parsedOfferPrice ? paid - parsedOfferPrice : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidNumber) {
      setErrorMessage('Please enter a valid offer price greater than ₹0.');
      return;
    }

    if (parsedOfferPrice >= currentPrice) {
      setErrorMessage(`Offer price must be lower than the current order amount (${settings.currencySymbol}${currentPrice.toLocaleString('en-IN')}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApplyOffer({
        requestId: request.id,
        newPrice: parsedOfferPrice,
        message: offerMessage.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply supplier offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-rose-500/10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    {request.offerApplied ? 'Adjust Supplier Offer' : 'Apply Supplier Offer'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SPECIAL PRICE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  #{request.id} • {request.productName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Customer Details Pill */}
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Customer
                </span>
                <span className="font-extrabold text-white">
                  {request.userName} ({request.userMobile})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Status
                </span>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold text-[10px]">
                  {request.status}
                </span>
              </div>
            </div>

            {/* Price Overview Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                  Original Price
                </span>
                <span className="text-sm font-extrabold text-zinc-300">
                  {settings.currencySymbol}
                  {originalPrice.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-amber-500/30 text-center relative overflow-hidden">
                <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                  Current Order
                </span>
                <span className="text-base font-extrabold text-white">
                  {settings.currencySymbol}
                  {currentPrice.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                  Total Paid
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {settings.currencySymbol}
                  {paid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Warning if payments already recorded */}
            {paid > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Existing Payments Detected ({settings.currencySymbol}{paid.toLocaleString('en-IN')} Paid)</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Changing the price will adjust the payable balance.
                  {excessCreditGenerated > 0
                    ? ` If set to ${settings.currencySymbol}${parsedOfferPrice.toLocaleString('en-IN')}, the excess ${settings.currencySymbol}${excessCreditGenerated.toLocaleString('en-IN')} will automatically credit the customer's account balance.`
                    : ` Future payments will use the new current order amount.`}
                </p>
              </div>
            )}

            {/* Offer Price Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>New Supplier Offer Price</span>
                <span className="text-[11px] text-amber-400 font-semibold">
                  Must be lower than {settings.currencySymbol}{currentPrice.toLocaleString('en-IN')}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-extrabold text-lg">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  min="1"
                  max={currentPrice - 1}
                  step="any"
                  placeholder={`e.g. ${Math.max(1, currentPrice - 50)}`}
                  value={newOfferPriceInput}
                  onChange={(e) => {
                    setNewOfferPriceInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-2xl text-lg font-black text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  id="input-admin-offer-price"
                  autoFocus
                />
              </div>
            </div>

            {/* Real-time Savings Breakdown */}
            {isLowerThanCurrent && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-extrabold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" />
                    Customer Savings
                  </span>
                  <span className="text-sm">
                    Save {settings.currencySymbol}{savings.toLocaleString('en-IN')}
                    {totalSavingsFromOriginal > savings && ` (Total: ${settings.currencySymbol}${totalSavingsFromOriginal.toLocaleString('en-IN')})`}
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block">New Order Amount:</span>
                    <span className="font-extrabold text-white text-xs">
                      {settings.currencySymbol}{parsedOfferPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 block">New Remaining Due:</span>
                    <span className="font-extrabold text-white text-xs">
                      {settings.currencySymbol}{simulatedRemaining.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Offer Message to Customer */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Offer Notification Message</span>
                <span className="text-[10px] text-zinc-500">Sent to customer in real-time</span>
              </label>
              <textarea
                rows={2}
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Message displayed in customer's special offer popup..."
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                id="input-admin-offer-message"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
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
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isLowerThanCurrent}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                id="btn-confirm-apply-offer"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>
                  {isSubmitting
                    ? 'Applying Offer...'
                    : `Apply Offer (${isLowerThanCurrent ? `${settings.currencySymbol}${parsedOfferPrice.toLocaleString('en-IN')}` : 'Enter Amount'})`}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
