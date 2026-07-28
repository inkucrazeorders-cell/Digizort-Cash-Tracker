import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { RequestType } from '../types';
import { X, PlusCircle, ShoppingBag, Link, DollarSign, FileText, Send } from 'lucide-react';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose }) => {
  const { submitNewRequest, settings, currentUser } = useApp();

  const [requestType, setRequestType] = useState<RequestType>('Product Purchase');
  const [productName, setProductName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [productLink, setProductLink] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !purpose.trim() || !expectedPrice) return;

    try {
      setIsSubmitting(true);
      await submitNewRequest({
        requestType,
        productName: productName.trim(),
        purpose: purpose.trim(),
        productLink: productLink.trim() || undefined,
        expectedPrice: Number(expectedPrice) || 0,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
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
                Submit an order or cash request for admin review and processing.
              </p>
            </div>
          </div>

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
                placeholder="e.g. Sony WH-1000XM5 Headphones / Amazon Order"
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
                placeholder="e.g. Work setup equipment / Personal gift purchase"
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
                    onChange={(e) => setExpectedPrice(e.target.value)}
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

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Additional Specifications or Notes <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
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
                disabled={isSubmitting || !productName.trim() || !expectedPrice}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
                id="btn-submit-request-form"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Request</span>
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
