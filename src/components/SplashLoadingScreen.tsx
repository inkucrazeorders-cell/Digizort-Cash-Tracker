import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';

interface SplashLoadingScreenProps {
  onComplete: () => void;
}

export const SplashLoadingScreen: React.FC<SplashLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2200; // 2.2 seconds total duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(currentProgress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute w-[350px] h-[350px] bg-[#E53935]/15 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute w-[250px] h-[250px] bg-[#B71C1C]/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative mb-6"
        >
          {/* Subtle Outer Glowing Ring */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#E53935]/30 to-[#B71C1C]/30 blur-xl opacity-75 animate-pulse" />
          
          <img
            src={OFFICIAL_DIGIZORT_LOGO}
            alt="DIGIZORT Logo"
            className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_0_25px_rgba(229,57,53,0.4)] relative z-10"
          />
        </motion.div>

        {/* Branding Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-1 mb-8"
        >
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            DIGIZORT
          </h1>
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest">
            Customer Order & Payment Management
          </p>
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2">
          <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-[#E53935] to-[#B71C1C] rounded-full shadow-[0_0_12px_rgba(229,57,53,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
            <span>Loading System...</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
