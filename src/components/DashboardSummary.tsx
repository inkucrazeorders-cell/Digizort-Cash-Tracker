import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import {
  Clock,
  CheckCircle2,
  Users,
  Receipt,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const DashboardSummary: React.FC = () => {
  const { transactions, friendsList, settings, setCurrentView, setFilters } = useApp();

  const totalPending = transactions
    .filter((t) => t.status === 'Pending')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCollected = transactions
    .filter((t) => t.status === 'Paid')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingFriendsCount = friendsList.filter((f) => f.totalPending > 0).length;

  const completedCount = transactions.filter((t) => t.status === 'Paid').length;

  const pendingCount = transactions.filter((t) => t.status === 'Pending').length;

  const cards = [
    {
      id: 'pending-amount',
      title: 'Total Pending Amount',
      value: formatCurrency(totalPending, settings.currency),
      subtext: `${pendingCount} items waiting for payment`,
      icon: Clock,
      iconBg: 'bg-[#E53935]/15 text-[#E53935]',
      borderHover: 'hover:border-[#E53935]/50',
      glow: 'shadow-[#E53935]/10',
      action: () => {
        setFilters((prev) => ({ ...prev, status: 'Pending' }));
        setCurrentView('transactions');
      },
    },
    {
      id: 'collected-amount',
      title: 'Total Collected',
      value: formatCurrency(totalCollected, settings.currency),
      subtext: `${completedCount} payments cleared`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      glow: 'shadow-emerald-500/10',
      action: () => {
        setFilters((prev) => ({ ...prev, status: 'Paid' }));
        setCurrentView('transactions');
      },
    },
    {
      id: 'pending-friends',
      title: 'Pending Friends',
      value: `${pendingFriendsCount} Friends`,
      subtext: 'People with unpaid balances',
      icon: Users,
      iconBg: 'bg-amber-500/15 text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      glow: 'shadow-amber-500/10',
      action: () => {
        setCurrentView('friends');
      },
    },
    {
      id: 'completed-transactions',
      title: 'Completed Transactions',
      value: `${completedCount} Paid`,
      subtext: `Out of ${transactions.length} total entries`,
      icon: Receipt,
      iconBg: 'bg-blue-500/15 text-blue-400',
      borderHover: 'hover:border-blue-500/50',
      glow: 'shadow-blue-500/10',
      action: () => {
        setCurrentView('transactions');
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
            onClick={card.action}
            className={`p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl shadow-lg ${card.glow} ${card.borderHover} cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden`}
            id={`summary-card-${card.id}`}
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Main Value */}
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {card.value}
              </h3>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </div>

            {/* Subtext */}
            <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
              {card.subtext}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};
