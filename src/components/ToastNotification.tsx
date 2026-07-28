import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastNotification: React.FC = () => {
  const { toastMessage } = useApp();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900/90 border border-zinc-700/80 text-white rounded-xl shadow-2xl backdrop-blur-md max-w-sm"
          id="toast-notification-popup"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E53935]/20 text-[#E53935] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-zinc-100 flex-1">{toastMessage}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
