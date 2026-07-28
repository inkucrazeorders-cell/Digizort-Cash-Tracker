import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { generateAvatarSvg, formatCurrency } from '../lib/utils';
import { getCategoryInfo } from '../data/categories';
import {
  X,
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Users,
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

export const FriendProfileModal: React.FC = () => {
  const {
    selectedFriendName,
    setSelectedFriendName,
    friendsList,
    transactions,
    markAsPaid,
    deleteTransaction,
    setIsAddModalOpen,
    setSelectedTransaction,
    setWhatsAppTx,
    setIsWhatsAppModalOpen,
    settings,
  } = useApp();

  if (!selectedFriendName) return null;

  const friend = friendsList.find(
    (f) => f.name.toLowerCase() === selectedFriendName.toLowerCase()
  ) || {
    id: `friend-${selectedFriendName}`,
    name: selectedFriendName,
    phone: '',
    avatarSeed: selectedFriendName,
    totalBorrowed: 0,
    totalPaid: 0,
    totalPending: 0,
    transactionCount: 0,
  };

  const friendTransactions = transactions.filter(
    (tx) => tx.friendName.toLowerCase() === selectedFriendName.toLowerCase()
  );

  const pendingCount = friendTransactions.filter((tx) => tx.status === 'Pending').length;

  const handleMarkAllPaid = () => {
    friendTransactions
      .filter((tx) => tx.status === 'Pending')
      .forEach((tx) => markAsPaid(tx.id));
  };

  const handleOpenWhatsApp = (tx?: any) => {
    const targetTx = tx || friendTransactions.find((t) => t.status === 'Pending');
    if (targetTx) {
      setWhatsAppTx(targetTx);
      setIsWhatsAppModalOpen(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-6"
          id="friend-profile-modal-dialog"
        >
          {/* Header Cover Banner */}
          <div className="relative h-32 bg-gradient-to-r from-[#E53935] via-rose-900 to-zinc-900 p-6 flex items-start justify-between">
            <button
              onClick={() => setSelectedFriendName(null)}
              className="p-2 text-white/80 hover:text-white rounded-xl bg-black/30 hover:bg-black/50 transition-colors ml-auto"
              id="close-friend-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Card Main Info */}
          <div className="px-6 pb-6 relative -mt-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <img
                  src={generateAvatarSvg(friend.name)}
                  alt={friend.name}
                  className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-800 shadow-xl"
                />
                <div className="mb-1">
                  <h2 className="text-2xl font-extrabold text-white">{friend.name}</h2>
                  {friend.phone ? (
                    <a
                      href={`tel:${friend.phone}`}
                      className="text-xs text-zinc-400 hover:text-[#E53935] flex items-center gap-1 mt-0.5"
                    >
                      <PhoneCall className="w-3 h-3 text-emerald-400" />
                      {friend.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-0.5">No phone number saved</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {friend.phone && (
                  <a
                    href={`tel:${friend.phone}`}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                    title="Call Friend"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                  </a>
                )}

                {pendingCount > 0 && (
                  <button
                    onClick={() => handleOpenWhatsApp()}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    id="whatsapp-reminder-friend-btn"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Reminder
                  </button>
                )}

                {pendingCount > 0 && (
                  <button
                    onClick={handleMarkAllPaid}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    id="mark-all-paid-friend-btn"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark All Paid
                  </button>
                )}
              </div>
            </div>

            {/* Friend KPI Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Total Borrowed</span>
                <p className="text-lg font-extrabold text-white mt-0.5">
                  {formatCurrency(friend.totalBorrowed, settings.currency)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Total Paid</span>
                <p className="text-lg font-extrabold text-emerald-400 mt-0.5">
                  {formatCurrency(friend.totalPaid, settings.currency)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/30">
                <span className="text-[10px] font-semibold text-[#E53935] uppercase">Total Pending</span>
                <p className="text-lg font-extrabold text-[#E53935] mt-0.5">
                  {formatCurrency(friend.totalPending, settings.currency)}
                </p>
              </div>
            </div>

            {/* Transaction Ledger History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Transaction History ({friendTransactions.length})
                </h4>
                <button
                  onClick={() => {
                    setSelectedFriendName(null);
                    setIsAddModalOpen(true);
                  }}
                  className="text-xs text-[#E53935] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Item
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {friendTransactions.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No transactions recorded for this friend yet.
                  </p>
                ) : (
                  friendTransactions.map((tx) => {
                    const catInfo = getCategoryInfo(tx.category);
                    const CategoryIcon = ICON_MAP[catInfo.iconName] || MoreHorizontal;
                    const isPending = tx.status === 'Pending';

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTransaction(tx)}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${catInfo.bgColor} ${catInfo.color}`}>
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{tx.purpose}</p>
                            <p className="text-[11px] text-zinc-500">
                              {new Date(tx.date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              • {tx.category}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-white block">
                              {formatCurrency(tx.amount, settings.currency)}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase ${
                                isPending ? 'text-[#E53935]' : 'text-emerald-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </div>

                          {isPending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsPaid(tx.id);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              title="Mark Paid"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
