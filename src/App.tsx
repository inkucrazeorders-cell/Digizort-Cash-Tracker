import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileAuthScreen } from './components/MobileAuthScreen';
import { UserPortal } from './components/UserPortal';
import { AdminPanel } from './components/AdminPanel';
import { SplashLoadingScreen } from './components/SplashLoadingScreen';
import { motion, AnimatePresence } from 'motion/react';

const MainViewRouter: React.FC = () => {
  const { appMode } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <SplashLoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
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
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainViewRouter />
    </AppProvider>
  );
}
