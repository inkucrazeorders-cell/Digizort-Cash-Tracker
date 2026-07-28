import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  MessageSquare,
  BarChart,
  Users,
  Smartphone,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView, setIsAuthModalOpen } = useApp();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden flex flex-col justify-between">
      {/* Animated Glowing Ambient Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E53935]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 flex-1 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-[#E53935] shadow-lg shadow-[#E53935]/10"
          >
            <Zap className="w-3.5 h-3.5 text-[#E53935]" />
            Premium Fintech Cash Tracker
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]"
          >
            DIGIZORT <br />
            <span className="bg-gradient-to-r from-[#E53935] via-rose-500 to-amber-500 bg-clip-text text-transparent">
              CASH TRACKER
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl font-medium text-zinc-300"
          >
            Never Forget Who Owes You Money.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Track every payment, online order, recharge, ticket booking, and borrowed amount from your friends in one simple, elegant place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#E53935] to-[#B71C1C] text-white font-bold text-sm shadow-xl shadow-[#E53935]/25 hover:brightness-110 active:scale-98 transition-all flex items-center gap-2 group"
              id="landing-get-started-btn"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-6 py-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-semibold text-sm hover:bg-zinc-800 transition-all flex items-center gap-2"
              id="landing-view-dashboard-btn"
            >
              View Dashboard
            </button>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24"
        >
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl hover:border-[#E53935]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 text-[#E53935] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">1-Click WhatsApp Reminders</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Auto-generate polite, friendly reminder messages with exact item names and amounts. Send via WhatsApp instantly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl hover:border-[#E53935]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Visual Reports &amp; Stats</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Track pending vs collected amounts, category distribution, and top friends with interactive charts and insights.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl hover:border-[#E53935]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Friend Profile Hubs</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Dedicated ledger history for every friend. See total borrowed, paid, pending, and mark full balances paid in seconds.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
