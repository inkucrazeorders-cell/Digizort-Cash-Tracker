import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderRequest, AppNotification } from '../types';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import {
  getRequestPrice,
  getOriginalPrice,
  getOfferSavings,
  getRequestPaid,
  getRequestRemaining,
} from '../lib/calculations';
import {
  Sparkles,
  X,
  TrendingDown,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface CustomerOrderUpdatedModalProps {
  order: OrderRequest;
  notification?: AppNotification | null;
  onClose: () => void;
  onViewDocument?: () => void;
}

export const CustomerOrderUpdatedModal: React.FC<CustomerOrderUpdatedModalProps> = ({
  order,
  notification,
  onClose,
  onViewDocument,
}) => {
  const { settings } = useApp();

  const originalPrice = getOriginalPrice(order);
  const currentAmount = getRequestPrice(order);
  const offerSavings = getOfferSavings(order);
  const amountPaid = getRequestPaid(order);
  const remainingDue = getRequestRemaining(order);

  // Use offer message from notification or order
  const offerMessage =
    notification?.message?.split('(')[0]?.trim() ||
    order.offerMessage ||
    'Good news! We received a special supplier offer for your order.';

  // Format customer-facing status
  const getCustomerStatusLabel = () => {
    if (order.status === 'Paid' || remainingDue === 0) {
      return 'Fully Paid';
    }
    if (order.status === 'Partially Paid' || amountPaid > 0) {
      return 'Partially Paid';
    }
    if (order.status === 'Accepted') {
      return 'Pending Payment';
    }
    return order.status || 'Pending Payment';
  };

  const getStatusBadgeStyle = () => {
    if (order.status === 'Paid' || remainingDue === 0) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (order.status === 'Partially Paid' || amountPaid > 0) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto text-white"
          id="customer-order-updated-modal"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-2 pr-8">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Special Supplier Offer</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ORDER UPDATED
            </h2>
            <p className="text-xs text-zinc-400">
              #{order.id} • {order.productName}
            </p>
          </div>

          {/* SPECIFIED FINANCIAL BREAKDOWN */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-amber-500/30 space-y-3.5">
            {/* Original Price */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-zinc-400 font-medium">Original Price:</span>
              <span className="line-through font-bold text-zinc-400 font-mono">
                {settings.currencySymbol}
                {originalPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Special Offer */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Special Offer:
              </span>
              <span className="font-extrabold text-white font-mono">
                {settings.currencySymbol}
                {currentAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* You Save */}
            {offerSavings > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs sm:text-sm font-black text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  YOU SAVE:
                </span>
                <span className="text-base font-black font-mono">
                  {settings.currencySymbol}
                  {offerSavings.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Current Amount */}
            <div className="flex items-baseline justify-between border-t border-zinc-800 pt-3">
              <span className="text-xs font-bold text-zinc-300">Current Amount:</span>
              <span className="text-2xl font-black text-white font-mono">
                {settings.currencySymbol}
                {currentAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Offer Message */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Offer Message:
            </span>
            <p className="text-xs text-zinc-200 leading-relaxed italic">
              "{offerMessage}"
            </p>
          </div>

          {/* Status & Payment Overview (Strictly Read-Only) */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Order Status:
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeStyle()}`}
              >
                {getCustomerStatusLabel()}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Remaining Due:
              </span>
              <span className="text-sm font-black text-rose-400 font-mono">
                {settings.currencySymbol}
                {remainingDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons (Strictly Customer-Appropriate) */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            {onViewDocument && (
              <button
                type="button"
                onClick={onViewDocument}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-zinc-700"
              >
                <FileText className="w-4 h-4 text-[#E53935]" />
                <span>View Full Document</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all text-center"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
