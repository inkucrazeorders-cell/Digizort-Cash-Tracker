import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import { OrderRequest, RequestStatus } from '../types';
import {
  calculateAccountSummary,
  isRequestRejected,
  getRequestPrice,
  getOriginalPrice,
  getOfferSavings,
  getRequestRemaining,
  getRequestPaid,
  getRequestPendingExtraCash,
} from '../lib/calculations';
import { NewRequestModal } from './NewRequestModal';
import { DigitalDocumentCard } from './DigitalDocumentCard';
import { CustomerOrderUpdatedModal } from './CustomerOrderUpdatedModal';
import { pushManager, NotificationPermissionState } from '../lib/pushNotifications';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bell,
  User,
  LogOut,
  ShoppingBag,
  DollarSign,
  Search,
  Filter,
  Layers,
  Sparkles,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building,
  Mail,
  MapPin,
  X,
  Coins,
  ArrowDownToLine,
  TrendingDown,
} from 'lucide-react';
import { BalanceLedgerView } from './BalanceLedgerView';
import { RequestMoneyModal } from './RequestMoneyModal';
import { UserBalanceRequestsList } from './UserBalanceRequestsList';

export const UserPortal: React.FC = () => {
  const {
    currentUser,
    userRequests,
    notifications,
    unreadUserNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    balanceTransactions,
    settings,
    logoutUser,
    updateUserProfile,
    userCancelRequest,
    userEditRequest,
    getUserBalanceInfo,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'requests' | 'timeline' | 'documents' | 'notifications' | 'profile' | 'balance'>('requests');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isRequestMoneyOpen, setIsRequestMoneyOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<OrderRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Unread balance added notifications for real-time and offline popup notification
  const unreadBalanceAddedNotifs = notifications.filter(
    (n) => n.targetUserMobile === currentUser?.mobileNumber && n.type === 'balance_added' && !n.read
  );
  const activeBalancePopup = unreadBalanceAddedNotifs.length > 0 ? unreadBalanceAddedNotifs[0] : null;

  // Unread special offer notifications for real-time and offline popup notification
  const unreadOfferNotifs = notifications.filter(
    (n) => n.targetUserMobile === currentUser?.mobileNumber && n.type === 'special_offer' && !n.read
  );
  const activeOfferPopup = unreadOfferNotifs.length > 0 ? unreadOfferNotifs[0] : null;

  // Safe Customer View of Updated Order Modal (Part 4)
  const [updatedOrderModalReq, setUpdatedOrderModalReq] = useState<OrderRequest | null>(null);
  const [updatedOrderModalNotif, setUpdatedOrderModalNotif] = useState<any | null>(null);

  // Browser Push Notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermissionState>(pushManager.getPermission());
  const [isPushBannerDismissed, setIsPushBannerDismissed] = useState(() => {
    return localStorage.getItem('digizort_push_banner_dismissed') === 'true';
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.fullName || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editAddress, setEditAddress] = useState(currentUser?.address || '');

  if (!currentUser) return null;

  // Non-rejected user requests (active ledger)
  const nonRejectedUserRequests = userRequests.filter((req) => !isRequestRejected(req));

  // Filter user requests for display
  const filteredRequests = userRequests.filter((req) => {
    // If status filter is 'All', strictly exclude rejected requests as requested
    if (statusFilter === 'All') {
      if (isRequestRejected(req)) return false;
    } else if (req.status !== statusFilter) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = req.productName.toLowerCase().includes(q);
      const matchesPurpose = req.purpose.toLowerCase().includes(q);
      const matchesId = req.id.toLowerCase().includes(q);
      if (!matchesName && !matchesPurpose && !matchesId) return false;
    }
    return true;
  });

  // Calculate user metrics using centralized helper (strictly excludes rejected requests and includes balance transactions)
  const userTxs = balanceTransactions.filter(
    (t) => t.userMobile === currentUser.mobileNumber || t.userId === currentUser.id
  );
  const userSummary = calculateAccountSummary(userRequests, [], userTxs);
  const totalRequestsCount = nonRejectedUserRequests.length;
  const pendingRequestsCount = nonRejectedUserRequests.filter(
    (r) =>
      r.status === 'Pending Review' ||
      r.status === 'Accepted' ||
      r.status === 'Processing' ||
      r.status === 'Ordered' ||
      r.status === 'Waiting For Payment' ||
      r.status === 'Partially Paid'
  ).length;
  const totalPendingBalance = userSummary.totalPending;
  const totalPaidSoFar = userSummary.totalPaid;
  const totalExtraCash = userSummary.totalExtraCash;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await updateUserProfile({
        fullName: editName.trim(),
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      setIsEditingProfile(false);
      showToast('Profile updated successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'Paid':
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Paid & Completed
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Partially Paid
          </span>
        );
      case 'Pending Review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Pending Review
          </span>
        );
      case 'Accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            Accepted
          </span>
        );
      case 'Rejected':
      case 'Cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-xl px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={OFFICIAL_DIGIZORT_LOGO}
            alt="DIGIZORT Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_12px_rgba(229,57,53,0.35)]"
          />
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              DIGIZORT <span className="text-xs text-zinc-400 font-normal">USER PORTAL</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              Registered ID: <span className="text-white font-bold">{currentUser.mobileNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('notifications')}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors relative flex items-center justify-center"
            title="Notifications"
            id="btn-user-notifications-bell"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadUserNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#E53935] text-white font-extrabold text-[10px] min-w-[16px] text-center border-2 border-zinc-900 animate-pulse">
                {unreadUserNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsNewRequestOpen(true)}
            className="py-2 px-3.5 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E53935]/20 flex items-center gap-1.5 transition-all"
            id="btn-new-request-top"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Request</span>
          </button>

          <button
            onClick={logoutUser}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Logout"
            id="btn-user-logout"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Polite Browser Push Notification Banner (if not dismissed) */}
        {!isPushBannerDismissed && pushPermission === 'default' && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-200">
                Want instant real-time browser alerts when supplier discounts or updates are applied to your orders?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  const granted = await pushManager.requestPermission();
                  setPushPermission(pushManager.getPermission());
                  if (granted) {
                    showToast('Push notifications enabled!');
                  }
                }}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all shadow"
              >
                Enable
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('digizort_push_banner_dismissed', 'true');
                  setIsPushBannerDismissed(true);
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Welcome Banner & Metrics */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/90 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-[#E53935] uppercase tracking-widest block mb-1">
                CUSTOMER DASHBOARD
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Welcome, {currentUser.fullName}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage your active service requests, live payment status, and official confirmation records.
              </p>
            </div>

            <button
              onClick={() => setIsNewRequestOpen(true)}
              className="py-3 px-5 bg-[#E53935] hover:brightness-110 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Request</span>
            </button>
          </div>

          {/* User Store Credit & Balance Banner (When available or previously used) */}
          {(() => {
            const userBalInfo = getUserBalanceInfo(currentUser.mobileNumber, currentUser.id);
            const availableBalance = userBalInfo.availableBalance;
            const requestableBalance = userBalInfo.requestableBalance;

            if (availableBalance > 0) {
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-zinc-950 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                          Available Store Credit / Balance
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      </div>
                      <div className="text-2xl font-black text-white mt-0.5">
                        {settings.currencySymbol}{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {userBalInfo.pendingRequestedAmount > 0
                          ? `(Pending requests: ₹${userBalInfo.pendingRequestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                          : 'This balance is in your account and can be requested anytime.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <button
                      onClick={() => setIsRequestMoneyOpen(true)}
                      disabled={requestableBalance <= 0}
                      className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                      id="btn-user-banner-request-money"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Request Money</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('balance')}
                      className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition-all"
                      id="btn-user-view-balance-ledger"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            }

            if (userBalInfo.hasTransactions && availableBalance === 0) {
              return (
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Store Credit Balance: <strong className="text-white">{settings.currencySymbol}0</strong> (All previous balances have been settled/cleared)</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('balance')}
                    className="text-emerald-400 font-bold hover:underline shrink-0 text-xs"
                  >
                    View History
                  </button>
                </div>
              );
            }

            return null;
          })()}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                Total Requests
              </span>
              <span className="text-2xl font-extrabold text-white block">
                {totalRequestsCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                Active / In Review
              </span>
              <span className="text-2xl font-extrabold text-blue-400 block">
                {pendingRequestsCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                Pending Balance
              </span>
              <span className="text-2xl font-extrabold text-rose-400 block">
                {settings.currencySymbol}
                {totalPendingBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                Total Paid
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 block">
                {settings.currencySymbol}
                {totalPaidSoFar.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="user-tab-requests"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>My Requests ({totalRequestsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('balance')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'balance'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="user-tab-balance"
          >
            <Coins className="w-4 h-4" />
            <span>Credit & Balance ({getUserBalanceInfo(currentUser.mobileNumber, currentUser.id).transactions.length})</span>
            {getUserBalanceInfo(currentUser.mobileNumber, currentUser.id).availableBalance > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="user-tab-timeline"
          >
            <Layers className="w-4 h-4" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="user-tab-documents"
          >
            <FileText className="w-4 h-4" />
            <span>Documents & Shares</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="user-tab-notifications"
          >
            <Bell className="w-4 h-4" />
            <span>Notifications ({notifications.filter((n) => !n.read).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="user-tab-profile"
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>
        </div>

        {/* TAB 1: MY REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Search & Status Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search request name, purpose or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-[#E53935]"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Accepted">Accepted</option>
                <option value="Processing">Processing</option>
                <option value="Ordered">Ordered</option>
                <option value="Waiting For Payment">Waiting For Payment</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {/* Requests Cards List */}
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-3">
                <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">
                  {userRequests.length === 0
                    ? 'You have not submitted any order requests yet.'
                    : 'No requests match your filter.'}
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {userRequests.length === 0
                    ? "Click 'Create New Request' above to submit your first service or order request."
                    : 'Try clearing your search query or selecting a different status filter.'}
                </p>
                {userRequests.length === 0 && (
                  <button
                    onClick={() => setIsNewRequestOpen(true)}
                    className="py-2.5 px-4 bg-[#E53935] hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg inline-flex items-center gap-1.5 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Request Now</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const actual = getRequestPrice(req);
                  const paid = getRequestPaid(req);
                  const rem = getRequestRemaining(req);
                  const orig = getOriginalPrice(req);
                  const savings = getOfferSavings(req);
                  const hasOffer = req.offerApplied || (orig > 0 && actual < orig);

                  return (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 hover:border-zinc-700/90 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                      onClick={() => setSelectedReq(req)}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-rose-400 group-hover:text-[#E53935] transition-colors">
                            {req.productName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                            {req.requestType}
                          </span>
                          {getStatusBadge(req.status)}
                          {hasOffer && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Offer: Save {settings.currencySymbol}{savings.toLocaleString('en-IN')}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-300 font-medium">{req.purpose}</p>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                          <span>
                            Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span>•</span>
                          <span>Doc ID: #{req.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800/60">
                        <div className="text-left md:text-right space-y-0.5">
                          {hasOffer ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 md:justify-end">
                                <span className="text-[10px] text-zinc-500 line-through">
                                  Orig: {settings.currencySymbol}{orig.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  SPECIAL OFFER
                                </span>
                              </div>
                              <span className="text-xs font-black text-amber-400 block">
                                Special Offer: {settings.currencySymbol}{actual.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-400 block">
                                You Save: {settings.currencySymbol}{savings.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500 font-bold block">
                              Total: {settings.currencySymbol}{actual.toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-white block">
                            Paid: {settings.currencySymbol}{paid.toLocaleString('en-IN')}
                          </span>
                          {(() => {
                            const userBal = getUserBalanceInfo(currentUser.mobileNumber, currentUser.id);
                            const pendingExtra = getRequestPendingExtraCash(req);
                            if (userBal.availableBalance === 0 && (userBal.hasTransactions || req.extraCashPaid)) {
                              return (
                                <span className="text-[10px] font-extrabold text-emerald-400 block">
                                  Extra Cash: Cleared
                                </span>
                              );
                            }
                            if (pendingExtra > 0 || (userBal.availableBalance > 0 && req.extraCash)) {
                              const displayAmt = Math.min(
                                pendingExtra > 0 ? pendingExtra : userBal.availableBalance,
                                userBal.availableBalance > 0 ? userBal.availableBalance : pendingExtra
                              );
                              return (
                                <span className="text-[10px] font-extrabold text-amber-400 block">
                                  Extra Cash Pending: {settings.currencySymbol}{displayAmt.toLocaleString('en-IN')}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {rem > 0 && (
                            <span className="text-[11px] font-extrabold text-rose-400 block">
                              Current Amount Due: {settings.currencySymbol}{rem.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReq(req);
                            }}
                            className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                            title="View Details & Documents"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#E53935]" />
                Interactive Request Timeline
              </h3>
              <p className="text-xs text-zinc-400">
                Track every stage, review event, order processing step, and payment record across your requests.
              </p>
            </div>

            {userRequests.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No active timelines found.
              </div>
            ) : (
              <div className="space-y-6">
                {userRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div>
                        <h4 className="text-xs font-extrabold text-white">{req.productName}</h4>
                        <p className="text-[10px] text-zinc-400">{req.purpose} • #{req.id}</p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="border-l-2 border-zinc-800 pl-4 py-1 space-y-2 text-xs">
                      {req.timeline?.map((evt, idx) => (
                        <div key={evt.id || idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#E53935] ring-4 ring-zinc-950" />
                          <div className="flex items-center justify-between text-zinc-200 font-bold">
                            <span>{evt.title}</span>
                            <span className="text-[10px] text-zinc-500 font-normal">
                              {new Date(evt.timestamp).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {evt.notes && (
                            <p className="text-[10px] text-zinc-400 italic mt-0.5">"{evt.notes}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 space-y-2">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#E53935]" />
                Official Digital Documents
              </h3>
              <p className="text-xs text-zinc-400">
                View current status and download high-resolution PNG or printable PDF official statements.
              </p>
            </div>

            {userRequests.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No documents generated yet.
              </div>
            ) : (
              <div className="space-y-6">
                {userRequests.map((req) => (
                  <DigitalDocumentCard key={req.id} transaction={req} showWhatsAppShare={false} isAdminView={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#E53935]" />
                <span>Notifications & Updates</span>
                {unreadUserNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#E53935]/20 text-[#E53935] border border-[#E53935]/30 text-[10px] font-extrabold">
                    {unreadUserNotificationsCount} unread
                  </span>
                )}
              </h3>

              {unreadUserNotificationsCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead(currentUser.mobileNumber)}
                  className="py-1 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Browser Push Notifications Preference Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  pushPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Browser Push Notifications</h4>
                    {pushPermission === 'granted' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {pushPermission === 'granted'
                      ? 'You will receive real-time push alerts on your desktop / mobile browser.'
                      : pushPermission === 'denied'
                      ? 'Notifications are blocked in your browser settings.'
                      : 'Enable instant browser push alerts for supplier offers & price drops.'}
                  </p>
                </div>
              </div>
              {pushPermission !== 'granted' && pushPermission !== 'denied' && (
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await pushManager.requestPermission();
                    setPushPermission(pushManager.getPermission());
                    if (granted) {
                      showToast('Push notifications enabled!');
                    }
                  }}
                  className="py-1.5 px-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow transition-all shrink-0"
                >
                  Enable Push Alerts
                </button>
              )}
              {pushPermission === 'granted' && (
                <button
                  type="button"
                  onClick={async () => {
                    await pushManager.dispatchLocalNotification({
                      title: '🔔 DIGIZORT Notifications Active',
                      body: 'Real-time alert testing successful! You will receive live updates on supplier offers.',
                      tag: 'test-push',
                    });
                    showToast('Test push notification sent!');
                  }}
                  className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors shrink-0"
                >
                  Test Alert
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No notifications received yet.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                      n.type === 'special_offer'
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-sm text-zinc-200'
                        : n.read
                        ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400'
                        : 'bg-zinc-950 border-emerald-500/40 shadow-sm text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-white font-bold">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              n.type === 'special_offer' ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                        )}
                        {n.type === 'special_offer' && (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span>{n.title}</span>
                        {n.reason && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-semibold">
                            {n.reason}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-normal">
                          {new Date(n.timestamp).toLocaleString('en-IN')}
                        </span>
                        {!n.read && (
                          <button
                            onClick={() => markNotificationAsRead(n.id)}
                            className="text-[10px] text-zinc-400 hover:text-amber-400 font-bold underline"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {n.type === 'special_offer' && (n.originalPrice || n.offerPrice) && (
                      <div className="p-2 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between text-[11px] font-bold">
                        <div className="flex items-center gap-2">
                          {n.originalPrice && (
                            <span className="text-zinc-500 line-through">
                              Orig: {settings.currencySymbol}{n.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                          {n.offerPrice && (
                            <span className="text-amber-400">
                              Offer: {settings.currencySymbol}{n.offerPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {n.savings && (
                          <span className="text-emerald-400">
                            Save {settings.currencySymbol}{n.savings.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-zinc-300">{n.message}</p>

                    {n.requestId && (
                      <div className="pt-1 flex items-center justify-end gap-2">
                        {n.type === 'special_offer' && (
                          <button
                            type="button"
                            onClick={() => {
                              const req = userRequests.find((r) => r.id === n.requestId);
                              if (req) {
                                setUpdatedOrderModalReq(req);
                                setUpdatedOrderModalNotif(n);
                              }
                            }}
                            className="text-[10px] font-extrabold text-amber-400 hover:underline flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>View Updated Order</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const req = userRequests.find((r) => r.id === n.requestId);
                            if (req) {
                              setSelectedReq(req);
                            }
                            setActiveTab('requests');
                          }}
                          className="text-[10px] font-bold text-zinc-400 hover:text-white hover:underline flex items-center gap-1"
                        >
                          <span>View Statement #{n.requestId}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: CREDIT & BALANCE LEDGER */}
        {activeTab === 'balance' && (() => {
          const userBalInfo = getUserBalanceInfo(currentUser.mobileNumber, currentUser.id);
          const availableBalance = userBalInfo.availableBalance;
          const pendingRequestedAmount = userBalInfo.pendingRequestedAmount;
          const requestableBalance = userBalInfo.requestableBalance;
          const txs = userBalInfo.transactions;
          const userPayoutReqs = userBalInfo.balanceRequests;

          const totalAdded = txs
            .filter((t) => t.type === 'Balance Added')
            .reduce((sum, t) => sum + t.amount, 0);

          const totalReturned = txs
            .filter((t) => t.type === 'Balance Returned' || t.type === 'Balance Paid')
            .reduce((sum, t) => sum + t.amount, 0);

          const totalUsed = txs
            .filter((t) => t.type === 'Balance Used')
            .reduce((sum, t) => sum + t.amount, 0);

          return (
            <div className="space-y-6">
              {/* Prominent Available Balance Section */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block">
                      USER BALANCE SECTION
                    </span>
                    <span className="text-xs text-zinc-400 font-medium block">
                      Available Balance
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {settings.currencySymbol}
                        {availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {availableBalance > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active Credit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Request Money Action */}
                  <div className="flex flex-col sm:items-end gap-2">
                    <button
                      onClick={() => setIsRequestMoneyOpen(true)}
                      disabled={availableBalance <= 0 || requestableBalance <= 0}
                      className="py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                      id="btn-user-request-money"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>Request Money</span>
                    </button>
                    {pendingRequestedAmount > 0 && (
                      <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Pending Request: {settings.currencySymbol}{pendingRequestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-card details for pending / requestable breakdown */}
                {pendingRequestedAmount > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-300">
                      <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        You have <strong>{settings.currencySymbol}{pendingRequestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> awaiting admin payout review.
                      </span>
                    </div>
                    <div className="text-zinc-300 text-xs">
                      Available to request now: <strong className="text-emerald-400 font-black">{settings.currencySymbol}{requestableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Balance Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                    Available Balance
                  </span>
                  <span className={`text-2xl font-black block ${availableBalance > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {settings.currencySymbol}{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {availableBalance > 0 ? 'Current real-time credit' : 'All balances settled'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                    Pending Requests
                  </span>
                  <span className={`text-2xl font-black block ${pendingRequestedAmount > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {settings.currencySymbol}{pendingRequestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting admin review</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                    Total Credit Added
                  </span>
                  <span className="text-2xl font-black text-amber-400 block">
                    {settings.currencySymbol}{totalAdded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">From extra payments</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                    Returned / Paid Back
                  </span>
                  <span className="text-2xl font-black text-blue-400 block">
                    {settings.currencySymbol}{totalReturned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">Physically paid back to you</span>
                </div>
              </div>

              {/* USER BALANCE REQUESTS LIST */}
              <UserBalanceRequestsList requests={userPayoutReqs} />

              {/* USER BALANCE HISTORY */}
              <BalanceLedgerView
                transactions={txs}
                title="Account Balance History"
                emptyText="No credit or balance transactions recorded yet for your account."
              />
            </div>
          );
        })()}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 space-y-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white font-extrabold text-xl">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{currentUser.fullName}</h3>
                  <p className="text-xs text-zinc-400">{currentUser.mobileNumber}</p>
                </div>
              </div>

              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="py-2 px-3.5 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-[#E53935] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Registered Mobile</span>
                  <span className="font-extrabold text-white">{currentUser.mobileNumber}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Email Address</span>
                  <span className="font-semibold text-zinc-300">{currentUser.email || 'Not Provided'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Address</span>
                  <span className="font-semibold text-zinc-300">{currentUser.address || 'Not Provided'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Account Registration Date</span>
                  <span className="font-semibold text-zinc-300">
                    {new Date(currentUser.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Modal for Selected Request */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReq(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center justify-between pr-8">
                <h3 className="text-lg font-extrabold text-white">{selectedReq.productName}</h3>
                {selectedReq.status === 'Pending Review' && (
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to cancel this order request?')) {
                        await userCancelRequest(selectedReq.id);
                        setSelectedReq(null);
                      }
                    }}
                    className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl transition-all border border-rose-500/30"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400">{selectedReq.purpose} • #{selectedReq.id}</p>
            </div>

            <DigitalDocumentCard transaction={selectedReq} showWhatsAppShare={false} isAdminView={false} />
          </div>
        </div>
      )}

      {/* Customer Safe "View Updated Order" Modal (Part 4) */}
      {updatedOrderModalReq && (
        <CustomerOrderUpdatedModal
          order={updatedOrderModalReq}
          notification={updatedOrderModalNotif}
          onClose={() => {
            setUpdatedOrderModalReq(null);
            setUpdatedOrderModalNotif(null);
          }}
          onViewDocument={() => {
            const req = updatedOrderModalReq;
            setUpdatedOrderModalReq(null);
            setUpdatedOrderModalNotif(null);
            setSelectedReq(req);
          }}
        />
      )}

      {/* New Request Modal */}
      {isNewRequestOpen && (
        <NewRequestModal
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
        />
      )}

      {/* Request Money Modal */}
      {isRequestMoneyOpen && (() => {
        const balInfo = getUserBalanceInfo(currentUser.mobileNumber, currentUser.id);
        return (
          <RequestMoneyModal
            isOpen={isRequestMoneyOpen}
            onClose={() => setIsRequestMoneyOpen(false)}
            availableBalance={balInfo.availableBalance}
            pendingRequestedAmount={balInfo.pendingRequestedAmount}
            requestableBalance={balInfo.requestableBalance}
          />
        );
      })()}

      {/* Real-time & Offline-Resilient Animated "Balance Added" Popup */}
      <AnimatePresence>
        {activeBalancePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-emerald-500/40 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                    🎉
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 block">
                      Official Account Notice
                    </span>
                    <h3 className="text-lg font-extrabold text-white">Balance Added</h3>
                  </div>
                </div>
                <button
                  onClick={() => markNotificationAsRead(activeBalancePopup.id)}
                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/20 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Added to Balance:</span>
                  <span className="text-2xl font-black text-emerald-400">
                    +{settings.currencySymbol}{(activeBalancePopup.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {activeBalancePopup.reason && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Reason:</span>
                    <span className="text-white font-bold bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                      {activeBalancePopup.reason}
                    </span>
                  </div>
                )}
                {activeBalancePopup.newBalance !== undefined && (
                  <div className="flex items-center justify-between text-xs border-t border-zinc-800/80 pt-2 mt-2">
                    <span className="text-zinc-400 font-medium">New Available Balance:</span>
                    <span className="text-sm font-extrabold text-white">
                      {settings.currencySymbol}{(activeBalancePopup.newBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeBalancePopup.message}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    markNotificationAsRead(activeBalancePopup.id);
                    setActiveTab('balance');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4" />
                  <span>View Balance & History</span>
                </button>
                <button
                  onClick={() => markNotificationAsRead(activeBalancePopup.id)}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Animated Pop-in Notification: Special Supplier Offer */}
        {activeOfferPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 space-y-4 overflow-hidden"
            >
              {/* Glow Accent */}
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider block w-fit mb-0.5">
                      SPECIAL SUPPLIER OFFER
                    </span>
                    <h3 className="text-base font-extrabold text-white">
                      Price Reduced On Your Order!
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => markNotificationAsRead(activeOfferPopup.id)}
                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Price Comparison Card */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Original Price:</span>
                  <span className="line-through font-semibold text-zinc-400">
                    {settings.currencySymbol}
                    {(activeOfferPopup.originalPrice || activeOfferPopup.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-zinc-800/80 pt-2">
                  <span className="text-xs text-amber-400 font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Special Offer Price:
                  </span>
                  <span className="text-2xl font-black text-white">
                    {settings.currencySymbol}
                    {(activeOfferPopup.offerPrice || activeOfferPopup.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {activeOfferPopup.savings && activeOfferPopup.savings > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs font-black text-emerald-400">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      YOU SAVE:
                    </span>
                    <span className="text-sm">
                      {settings.currencySymbol}{activeOfferPopup.savings.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeOfferPopup.message}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const reqToOpen = userRequests.find((r) => r.id === activeOfferPopup.requestId);
                    markNotificationAsRead(activeOfferPopup.id);
                    if (reqToOpen) {
                      setUpdatedOrderModalReq(reqToOpen);
                      setUpdatedOrderModalNotif(activeOfferPopup);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-black" />
                  <span>View Updated Order</span>
                </button>
                <button
                  onClick={() => markNotificationAsRead(activeOfferPopup.id)}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
