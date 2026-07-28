import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Receipt,
  Users,
  BarChart3,
  TrendingUp,
  Trash2,
  Settings,
  Bell,
  Plus,
  Search,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cloud,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Header: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    clearAllNotifications,
    userProfile,
    setIsAuthModalOpen,
    setIsAddModalOpen,
    logoutUser,
    filters,
    setFilters,
    setSelectedTransaction,
    transactions,
    isCloudConnected,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'statistics', label: 'Statistics', icon: TrendingUp },
    { id: 'trash', label: 'Trash', icon: Trash2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const handleNotificationClick = (transactionId?: string) => {
    if (transactionId) {
      const tx = transactions.find((t) => t.id === transactionId);
      if (tx) {
        setSelectedTransaction(tx);
      }
    }
    setIsNotifOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 group focus:outline-none"
            id="brand-logo-btn"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E53935] to-[#B71C1C] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-[#E53935]/20 group-hover:scale-105 transition-transform">
              D
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-white text-base tracking-tight leading-none group-hover:text-[#E53935] transition-colors">
                DIGIZORT
              </span>
              <span className="text-[10px] font-medium text-zinc-400 tracking-widest uppercase mt-0.5">
                CASH TRACKER
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
                id={`nav-item-${item.id}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadge"
                    className="absolute inset-0 bg-[#E53935] rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Trigger */}
          <div className="hidden sm:flex items-center relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search friends, purpose..."
              value={filters.searchQuery}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
                if (currentView !== 'transactions') {
                  setCurrentView('transactions');
                }
              }}
              className="pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#E53935]/60 focus:ring-1 focus:ring-[#E53935]/30 w-36 md:w-48 transition-all"
              id="header-quick-search-input"
            />
          </div>

          {/* Add Entry FAB/Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E53935] to-[#D32F2F] text-white font-medium text-xs shadow-md shadow-[#E53935]/20 hover:brightness-110 active:scale-95 transition-all"
            id="add-entry-header-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Entry</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors relative"
              id="notifications-bell-btn"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E53935] text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-950">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
                  id="notifications-popover"
                >
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#E53935]" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Notifications
                      </h4>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            handleNotificationClick(n.transactionId);
                          }}
                          className={`p-3.5 transition-colors cursor-pointer hover:bg-zinc-800/50 flex items-start gap-3 ${
                            !n.read ? 'bg-[#E53935]/5' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === 'overdue' && (
                              <AlertCircle className="w-4 h-4 text-[#E53935]" />
                            )}
                            {n.type === 'reminder' && (
                              <Clock className="w-4 h-4 text-amber-400" />
                            )}
                            {n.type === 'paid' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {n.type === 'info' && (
                              <Sparkles className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-100">{n.title}</p>
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-zinc-500 mt-1 block">
                              {new Date(n.timestamp).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile / Auth Menu */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors"
              id="user-profile-menu-btn"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#E53935] to-rose-400 flex items-center justify-center text-white text-xs font-bold relative">
                {userProfile.name[0]?.toUpperCase() || 'U'}
                <span
                  className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                    isCloudConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  title={isCloudConnected ? 'Cloud Realtime Synced' : 'Guest Mode (Local Storage)'}
                />
              </div>
            </button>

            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-60 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-2"
                  id="profile-dropdown-menu"
                >
                  <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate">{userProfile.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isCloudConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        <Cloud className="w-3 h-3" />
                        {isCloudConnected ? 'Cloud Synced' : 'Local Guest'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{userProfile.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setCurrentView('settings');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    Account Settings
                  </button>

                  {!userProfile.isLoggedIn || userProfile.isGuest ? (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#E53935] hover:bg-[#E53935]/10 flex items-center gap-2 transition-colors font-medium"
                    >
                      <User className="w-3.5 h-3.5" />
                      Sign In / Login
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logoutUser();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white"
            id="mobile-menu-trigger-btn"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-b border-zinc-800 bg-zinc-950 px-4 pt-2 pb-4 space-y-2 overflow-hidden"
            id="mobile-navigation-drawer"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#E53935] text-white shadow-lg shadow-[#E53935]/20 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
