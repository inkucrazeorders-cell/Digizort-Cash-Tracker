import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileAuthScreen } from './components/MobileAuthScreen';
import { UserPortal } from './components/UserPortal';
import { AdminPanel } from './components/AdminPanel';
import { SplashLoadingScreen } from './components/SplashLoadingScreen';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, Mic } from 'lucide-react';

const MainViewRouter: React.FC = () => {
  const { appMode } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  if (isLoading) {
    return <SplashLoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {appMode === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MobileAuthScreen />
          </motion.div>
        )}

        {appMode === 'user_portal' && (
          <motion.div
            key="user_portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <UserPortal />
          </motion.div>
        )}

        {appMode === 'admin_panel' && (
          <motion.div
            key="admin_panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AdminPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Gemini AI Studio Assistant Button */}
      {appMode !== 'auth' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-rose-600 via-[#E53935] to-amber-600 hover:brightness-110 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-rose-600/35 border border-white/20 transition-all active:scale-95"
            id="btn-open-gemini-assistant"
            title="Open DIGIZORT Gemini AI Assistant & Live Voice"
          >
            <div className="relative">
              <Sparkles className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span className="hidden sm:inline">DIGIZORT AI &amp; Voice</span>
            <span className="sm:hidden font-black">AI</span>
          </button>
        </div>
      )}

      {/* Gemini Assistant & Live Voice Modal */}
      <GeminiAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainViewRouter />
    </AppProvider>
  );
}
