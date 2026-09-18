import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import { OrderRequest, RequestStatus } from '../types';
import {
  calculateAccountSummary,
  isRequestRejected,
  getRequestPrice,
  getRequestRemaining,
  getRequestPaid,
} from '../lib/calculations';
import { NewRequestModal } from './NewRequestModal';
import { DigitalDocumentCard } from './DigitalDocumentCard';
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
} from 'lucide-react';

export const UserPortal: React.FC = () => {
  const {
    currentUser,
    userRequests,
    notifications,
    settings,
    logoutUser,
    updateUserProfile,
    userCancelRequest,
    userEditRequest,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'requests' | 'timeline' | 'documents' | 'notifications' | 'profile'>('requests');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<OrderRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

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

  // Calculate user metrics using centralized helper (strictly excludes rejected requests)
  const userSummary = calculateAccountSummary(userRequests);
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
                  const actual = req.actualPrice || req.expectedPrice || 0;
                  const paid = req.amountPaid || (req.status === 'Paid' ? actual : 0);
                  const rem = req.remainingAmount ?? (req.status === 'Paid' ? 0 : Math.max(0, actual - paid));

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
                        <div className="text-left md:text-right">
                          <span className="text-xs text-zinc-500 font-bold block">
                            Total: {settings.currencySymbol}{actual.toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm font-extrabold text-white block">
                            Paid: {settings.currencySymbol}{paid.toLocaleString('en-IN')}
                          </span>
                          {req.extraCash && req.extraCash > 0 ? (
                            <span className="text-[10px] font-extrabold text-amber-400 block">
                              Extra Cash: {settings.currencySymbol}{req.extraCash.toLocaleString('en-IN')}
                            </span>
                          ) : null}
                          {rem > 0 && (
                            <span className="text-[10px] font-bold text-rose-400 block">
                              Due: {settings.currencySymbol}{rem.toLocaleString('en-IN')}
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
                  <DigitalDocumentCard key={req.id} transaction={req} showWhatsAppShare={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#E53935]" />
              Notifications & Updates
            </h3>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No notifications received yet.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-white font-bold">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">
                        {new Date(n.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-zinc-300">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

            <DigitalDocumentCard transaction={selectedReq} showWhatsAppShare={false} />
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {isNewRequestOpen && (
        <NewRequestModal
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
        />
      )}
    </div>
  );
};
