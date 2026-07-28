import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { generateAvatarSvg, formatCurrency } from '../lib/utils';
import { getCategoryInfo } from '../data/categories';
import { DigitalDocumentCard } from './DigitalDocumentCard';
import { RecordPaymentModal } from './RecordPaymentModal';
import {
  X,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  MessageSquare,
  Share2,
  Calendar,
  Phone,
  FileText,
  User,
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
  DollarSign,
  Layers,
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

export const TransactionDetailModal: React.FC = () => {
  const {
    selectedTransaction,
    setSelectedTransaction,
    markAsPaid,
    deleteTransaction,
    updateTransaction,
    setWhatsAppTx,
    setIsWhatsAppModalOpen,
    setSelectedFriendName,
    setCurrentView,
    settings,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'document'>('details');

  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!selectedTransaction) return null;

  const catInfo = getCategoryInfo(selectedTransaction.category);
  const CategoryIcon = ICON_MAP[catInfo.iconName] || MoreHorizontal;

  const handleStartEdit = () => {
    setEditName(selectedTransaction.friendName);
    setEditAmount(selectedTransaction.amount.toString());
    setEditPurpose(selectedTransaction.purpose);
    setEditDate(selectedTransaction.date);
    setEditNotes(selectedTransaction.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTransaction(selectedTransaction.id, {
      friendName: editName.trim(),
      amount: Number(editAmount),
      purpose: editPurpose.trim(),
      date: editDate,
      notes: editNotes.trim() || undefined,
    });
    setIsEditing(false);
    setSelectedTransaction(null);
  };

  const currentRemaining =
    selectedTransaction.remainingAmount ??
    (selectedTransaction.status === 'Paid' ? 0 : selectedTransaction.amount);

  const getStatusBadge = () => {
    if (selectedTransaction.status === 'Paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Paid (Completed)
        </span>
      );
    }
    if (selectedTransaction.status === 'Partially Paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
          Partially Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
        Payment Pending
      </span>
    );
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
            id="transaction-detail-modal"
          >
            {/* Top Banner */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${catInfo.bgColor} ${catInfo.color}`}>
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedTransaction.category}</h3>
                  <p className="text-[10px] text-zinc-400">Entry #{selectedTransaction.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'details'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('document')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTab === 'document'
                      ? 'bg-[#E53935] text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Document Timeline
                </button>
              </div>

              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedTransaction(null);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors ml-2"
                id="close-detail-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              {activeTab === 'document' ? (
                /* Digital Document & Timeline Mode */
                <DigitalDocumentCard
                  transaction={selectedTransaction}
                  onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
                />
              ) : !isEditing ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Friend Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={generateAvatarSvg(selectedTransaction.friendName)}
                        alt={selectedTransaction.friendName}
                        className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                      />
                      <div>
                        <button
                          onClick={() => {
                            setSelectedFriendName(selectedTransaction.friendName);
                            setSelectedTransaction(null);
                            setCurrentView('friends');
                          }}
                          className="text-base font-bold text-white hover:text-[#E53935] transition-colors"
                        >
                          {selectedTransaction.friendName}
                        </button>
                        {selectedTransaction.phone && (
                          <p className="text-xs text-zinc-400">{selectedTransaction.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-white block">
                        {formatCurrency(selectedTransaction.amount, settings.currency)}
                      </span>
                      {getStatusBadge()}
                    </div>
                  </div>

                  {/* Purpose & Details Grid */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase block">
                        Purpose
                      </span>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {selectedTransaction.purpose}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase block">
                          Already Paid So Far
                        </span>
                        <p className="text-emerald-400 font-bold mt-0.5">
                          {formatCurrency(selectedTransaction.amountPaid || 0, settings.currency)}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase block">
                          Remaining Balance
                        </span>
                        <p className="text-rose-400 font-bold mt-0.5">
                          {formatCurrency(currentRemaining, settings.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase block">
                          Transaction Date
                        </span>
                        <p className="text-zinc-300 font-medium mt-0.5">
                          {new Date(selectedTransaction.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase block">
                          Timeline Records
                        </span>
                        <p className="text-zinc-300 font-medium mt-0.5 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-rose-400" />
                          {selectedTransaction.timeline?.length || 1} Documents Generated
                        </p>
                      </div>
                    </div>

                    {selectedTransaction.notes && (
                      <div className="pt-2 border-t border-zinc-800/80">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase block">
                          Notes
                        </span>
                        <p className="text-zinc-300 mt-0.5 leading-relaxed">
                          {selectedTransaction.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5">
                    {selectedTransaction.status !== 'Paid' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsRecordPaymentOpen(true)}
                          className="py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <DollarSign className="w-4 h-4" />
                          Record Friend Payment
                        </button>

                        <button
                          onClick={() => {
                            setWhatsAppTx(selectedTransaction);
                            setIsWhatsAppModalOpen(true);
                          }}
                          className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          View & Share Document
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStartEdit}
                        className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        id="detail-edit-btn"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Entry
                      </button>

                      <button
                        onClick={() => {
                          deleteTransaction(selectedTransaction.id);
                          setSelectedTransaction(null);
                        }}
                        className="p-2.5 bg-zinc-800 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl transition-colors"
                        title="Move to Trash"
                        id="detail-delete-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Friend Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Original Amount ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Purpose
                    </label>
                    <input
                      type="text"
                      required
                      value={editPurpose}
                      onChange={(e) => setEditPurpose(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935] resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#E53935] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#E53935]/20 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Record Payment Sub-Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          transaction={selectedTransaction}
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}
    </>
  );
};
