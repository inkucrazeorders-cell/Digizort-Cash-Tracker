import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { getCategoryInfo } from '../data/categories';
import { generateAvatarSvg, formatCurrency } from '../lib/utils';
import { Transaction } from '../types';
import { RecordPaymentModal } from './RecordPaymentModal';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageSquare,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  ChevronDown,
  RotateCcw,
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
  X,
  PhoneCall,
  Share2,
  DollarSign,
  FileText,
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

export const RecentTransactions: React.FC = () => {
  const {
    transactions,
    filters,
    setFilters,
    resetFilters,
    deleteTransaction,
    setSelectedTransaction,
    setSelectedFriendName,
    setCurrentView,
    setWhatsAppTx,
    setIsWhatsAppModalOpen,
    settings,
  } = useApp();

  const [paymentTx, setPaymentTx] = useState<Transaction | null>(null);

  // Filter & Search Logic
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const matchesName = tx.friendName.toLowerCase().includes(q);
          const matchesPurpose = tx.purpose.toLowerCase().includes(q);
          const matchesPhone = tx.phone?.toLowerCase().includes(q) || false;
          const matchesAmount = tx.amount.toString().includes(q);
          const matchesCategory = tx.category.toLowerCase().includes(q);

          if (
            !matchesName &&
            !matchesPurpose &&
            !matchesPhone &&
            !matchesAmount &&
            !matchesCategory
          ) {
            return false;
          }
        }

        // Status
        if (filters.status !== 'All' && tx.status !== filters.status) {
          return false;
        }

        // Category
        if (filters.category && filters.category !== 'All' && tx.category !== filters.category) {
          return false;
        }

        // Timeframe
        if (filters.timeframe !== 'All') {
          const txDate = new Date(tx.date);
          const now = new Date();

          if (filters.timeframe === 'This Week') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (txDate < oneWeekAgo) return false;
          } else if (filters.timeframe === 'This Month') {
            if (
              txDate.getMonth() !== now.getMonth() ||
              txDate.getFullYear() !== now.getFullYear()
            ) {
              return false;
            }
          } else if (filters.timeframe === 'This Year') {
            if (txDate.getFullYear() !== now.getFullYear()) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'date-desc')
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (filters.sortBy === 'date-asc')
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (filters.sortBy === 'amount-desc') return b.amount - a.amount;
        if (filters.sortBy === 'amount-asc') return a.amount - b.amount;
        if (filters.sortBy === 'name-asc') return a.friendName.localeCompare(b.friendName);
        return 0;
      });
  }, [transactions, filters]);

  const openWhatsAppModal = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setWhatsAppTx(tx);
    setIsWhatsAppModalOpen(true);
  };

  const openPaymentModal = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentTx(tx);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by friend, purpose, phone, amount..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-10 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            id="transactions-search-input"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Badges & Selects */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as any,
              }))
            }
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-[#E53935]"
            id="status-filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Only</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid Only</option>
          </select>

          {/* Timeframe Filter */}
          <select
            value={filters.timeframe}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                timeframe: e.target.value as any,
              }))
            }
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-[#E53935]"
            id="timeframe-filter-select"
          >
            <option value="All">All Time</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </select>

          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                sortBy: e.target.value as any,
              }))
            }
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-[#E53935]"
            id="sort-by-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
            <option value="name-asc">Friend Name A-Z</option>
          </select>

          {/* Reset Filters button if active */}
          {(filters.searchQuery ||
            filters.status !== 'All' ||
            filters.timeframe !== 'All' ||
            filters.category !== 'All') && (
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1"
              title="Reset Filters"
              id="reset-filters-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / Cards List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 mb-1">
              {transactions.length === 0
                ? "No transactions yet. Click 'Add Entry' to create your first transaction."
                : 'No matching transactions found.'}
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {transactions.length === 0
                ? 'Your added entries will appear here in real-time.'
                : 'Try adjusting your search query or status filter.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const catInfo = getCategoryInfo(tx.category);
            const CategoryIcon = ICON_MAP[catInfo.iconName] || MoreHorizontal;
            const avatarUrl = generateAvatarSvg(tx.friendName);
            const isFullyPaid = tx.status === 'Paid';
            const isPartiallyPaid = tx.status === 'Partially Paid';
            const remaining =
              tx.remainingAmount ?? (isFullyPaid ? 0 : tx.amount - (tx.amountPaid || 0));

            return (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedTransaction(tx)}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group hover:bg-zinc-900/90"
                id={`tx-row-${tx.id}`}
              >
                {/* Left Info */}
                <div className="flex items-center gap-3.5">
                  {/* Friend Avatar */}
                  <img
                    src={avatarUrl}
                    alt={tx.friendName}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-zinc-700/60 shadow-md group-hover:scale-105 transition-transform"
                  />

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFriendName(tx.friendName);
                          setCurrentView('friends');
                        }}
                        className="font-bold text-sm text-white hover:text-[#E53935] transition-colors"
                      >
                        {tx.friendName}
                      </button>

                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}
                      >
                        <CategoryIcon className="w-3 h-3" />
                        {tx.category}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 font-medium mt-0.5">{tx.purpose}</p>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                      <span>
                        {new Date(tx.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {tx.phone && (
                        <>
                          <span>•</span>
                          <span>{tx.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Quick Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800/60">
                  {/* Amount & Status Badge */}
                  <div className="text-left sm:text-right">
                    <span className="text-base font-extrabold text-white tracking-tight block">
                      {formatCurrency(tx.amount, settings.currency)}
                    </span>

                    {isPartiallyPaid && (
                      <span className="text-[10px] font-bold text-rose-400 block">
                        Bal: {formatCurrency(remaining, settings.currency)}
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase mt-1 ${
                        isFullyPaid
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isPartiallyPaid
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-[#E53935]/15 text-[#E53935] border border-[#E53935]/30'
                      }`}
                    >
                      {isFullyPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Paid
                        </>
                      ) : isPartiallyPaid ? (
                        <>
                          <DollarSign className="w-3 h-3 text-amber-400" />
                          Partial
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Pending
                        </>
                      )}
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Record Payment Button if pending or partial */}
                    {!isFullyPaid && (
                      <button
                        onClick={(e) => openPaymentModal(tx, e)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1"
                        title="Record Friend Payment"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                    )}

                    {/* Digital Document Card / WhatsApp Modal */}
                    <button
                      onClick={(e) => openWhatsAppModal(tx, e)}
                      className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                      title="View Digital Document Card"
                      id={`whatsapp-btn-${tx.id}`}
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                    </button>

                    {/* Move to Trash */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTransaction(tx.id);
                      }}
                      className="p-2 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Move to Trash"
                      id={`delete-btn-${tx.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Record Payment Sub-Modal */}
      {paymentTx && (
        <RecordPaymentModal
          transaction={paymentTx}
          isOpen={!!paymentTx}
          onClose={() => setPaymentTx(null)}
        />
      )}
    </div>
  );
};
