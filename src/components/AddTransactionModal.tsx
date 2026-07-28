import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { TransactionCategory } from '../types';
import {
  X,
  Plus,
  User,
  Phone,
  DollarSign,
  FileText,
  Calendar,
  Tag,
  AlignLeft,
  Check,
  Smartphone,
  ShoppingBag,
  Utensils,
  Film,
  Car,
  Ticket,
  Gamepad2,
  Banknote,
  Gift,
  MoreHorizontal,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Smartphone,
  ShoppingBag,
  Utensils,
  Film,
  Car,
  Ticket,
  Gamepad2,
  Banknote,
  Gift,
  MoreHorizontal,
};

export const AddTransactionModal: React.FC = () => {
  const { isAddModalOpen, setIsAddModalOpen, addTransaction, settings } = useApp();

  const [friendName, setFriendName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Online Shopping');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Pending' | 'Paid'>('Pending');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isAddModalOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!friendName.trim()) errs.friendName = 'Friend name is required';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      errs.amount = 'Please enter a valid amount';
    }
    if (!purpose.trim()) errs.purpose = 'Purpose or item description is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    addTransaction({
      friendName: friendName.trim(),
      phone: phone.trim() || undefined,
      amount: Number(amount),
      purpose: purpose.trim(),
      category,
      date,
      notes: notes.trim() || undefined,
      status,
    });

    // Reset fields & close
    setFriendName('');
    setPhone('');
    setAmount('');
    setPurpose('');
    setNotes('');
    setErrors({});
    setIsAddModalOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-8"
          id="add-transaction-modal-dialog"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E53935]/20 text-[#E53935] flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Add Cash Entry</h3>
            </div>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              id="close-add-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Friend Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Friend Name <span className="text-[#E53935]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                    id="input-friend-name"
                  />
                </div>
                {errors.friendName && (
                  <p className="text-[11px] text-[#E53935] mt-1">{errors.friendName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Phone Number (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                    id="input-friend-phone"
                  />
                </div>
              </div>
            </div>

            {/* Amount & Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Amount ({settings.currencySymbol}) <span className="text-[#E53935]">*</span>
                </label>
                <div className="relative">
                  <span className="text-zinc-400 font-bold text-sm absolute left-3 top-2.5">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="499"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                    id="input-amount"
                  />
                </div>
                {errors.amount && (
                  <p className="text-[11px] text-[#E53935] mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
                    id="input-date"
                  />
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Purpose / Description <span className="text-[#E53935]">*</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Amazon Order, Mobile Recharge, Dinner..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                  id="input-purpose"
                />
              </div>
              {errors.purpose && (
                <p className="text-[11px] text-[#E53935] mt-1">{errors.purpose}</p>
              )}
            </div>

            {/* Category Selector Grid */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1">
                {CATEGORIES.map((cat) => {
                  const IconComp = ICON_MAP[cat.iconName] || MoreHorizontal;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-2 rounded-xl text-left border text-[11px] flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? `${cat.bgColor} ${cat.borderColor} ${cat.color} font-bold ring-1 ring-[#E53935]`
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Initial Status */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Initial Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('Pending')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    status === 'Pending'
                      ? 'bg-[#E53935]/15 border-[#E53935] text-[#E53935]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Pending (Unpaid)
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Paid')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    status === 'Paid'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Paid Already
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any special agreement, link, or reminder details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935] resize-none"
                id="input-notes"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E53935] to-[#B71C1C] text-white text-xs font-bold shadow-lg shadow-[#E53935]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                id="save-transaction-btn"
              >
                <Check className="w-4 h-4" />
                Save Entry
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
