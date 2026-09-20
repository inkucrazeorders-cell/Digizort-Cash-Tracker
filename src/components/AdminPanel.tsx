import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import { OrderRequest, RequestStatus, AppUser } from '../types';
import {
  calculateAccountSummary,
  isRequestRejected,
  isRequestCancelled,
  isRequestEligibleForPayment,
  getRequestPrice,
  getRequestPaid,
  getRequestRemaining,
  allocatePaymentAcrossRequests,
} from '../lib/calculations';
import { AdminActionModal } from './AdminActionModal';
import { DigitalDocumentCard } from './DigitalDocumentCard';
import { BalanceManagementModal } from './BalanceManagementModal';
import { BalanceLedgerView } from './BalanceLedgerView';
import { AdminBalanceRequestsView } from './AdminBalanceRequestsView';
import {
  ShieldCheck,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  LogOut,
  Sparkles,
  ChevronRight,
  UserX,
  UserCheck,
  Trash2,
  Layers,
  FileText,
  PlusCircle,
  X,
  BarChart3,
  Calendar,
  CreditCard,
  Ban,
  CheckSquare,
  Square,
  ArrowRight,
  Coins,
  Receipt,
  Eye,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    allRequests,
    allUsers,
    groupPayments,
    balanceRequests,
    settings,
    logoutUser,
    adminSuspendUser,
    adminUnsuspendUser,
    adminDeleteUser,
    adminProcessGroupPayment,
    getUserBalanceInfo,
    showToast,
  } = useApp();

  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'requests' | 'group_payment' | 'balance_requests' | 'rejected' | 'users' | 'reports'
  >('dashboard');

  const pendingBalanceRequestsCount = balanceRequests.filter((r) => r.status === 'Pending').length;

  // Balance Action Modal State (Pay Balance / Use Balance)
  const [balanceModalUser, setBalanceModalUser] = useState<AppUser | null>(null);
  const [balanceModalMode, setBalanceModalMode] = useState<'pay' | 'use' | null>(null);
  const [balanceModalPreselectedReqId, setBalanceModalPreselectedReqId] = useState<string | undefined>(undefined);

  // Action Modal State
  const [selectedReq, setSelectedReq] = useState<OrderRequest | null>(null);
  const [modalAction, setModalAction] = useState<
    'accept' | 'reject' | 'status' | 'payment' | 'delete' | null
  >(null);

  // Group Payment State
  const [selectedGroupUserId, setSelectedGroupUserId] = useState<string>('');
  const [selectedGroupReqIds, setSelectedGroupReqIds] = useState<string[]>([]);
  const [groupCashReceivedInput, setGroupCashReceivedInput] = useState<string>('');
  const [groupPaymentNote, setGroupPaymentNote] = useState<string>('');
  const [isProcessingGroupPayment, setIsProcessingGroupPayment] = useState<boolean>(false);

  // Document Card Inspection Modal
  const [inspectDocReq, setInspectDocReq] = useState<OrderRequest | null>(null);

  // Filters for Active Requests
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<string>('All');

  // Filters for Rejected Requests
  const [rejectedSearch, setRejectedSearch] = useState('');

  // Filters for Users
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'All' | 'active' | 'suspended'>('All');

  // Selected User detail modal
  const [selectedUserDetail, setSelectedUserDetail] = useState<AppUser | null>(null);

  // Active (non-rejected) vs Rejected requests
  const activeRequests = allRequests.filter((r) => !isRequestRejected(r));
  const rejectedRequests = allRequests.filter((r) => isRequestRejected(r));

  // Stats calculation via calculations.ts (strictly separates rejected requests)
  const statsSummary = calculateAccountSummary(allRequests, groupPayments);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRequestsCount = activeRequests.filter(
    (r) => r.createdAt && r.createdAt.slice(0, 10) === todayStr
  ).length;

  const pendingRequestsCount = activeRequests.filter(
    (r) =>
      r.status === 'Pending Review' ||
      r.status === 'Accepted' ||
      r.status === 'Processing' ||
      r.status === 'Ordered' ||
      r.status === 'Waiting For Payment' ||
      r.status === 'Partially Paid'
  ).length;

  const completedRequestsCount = statsSummary.completedRequests;
  const pendingPaymentsCount = activeRequests.filter((r) => getRequestRemaining(r) > 0).length;

  const totalCollected = statsSummary.totalPaid;
  const totalPending = statsSummary.totalPending;
  const totalExtraCash = statsSummary.totalExtraCash;

  // Monthly Revenue Calculation (strictly non-rejected)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = activeRequests
    .filter((r) => r.createdAt && r.createdAt.slice(0, 7) === currentMonthStr)
    .reduce((sum, r) => sum + getRequestPaid(r), 0);

  // Filtered Active Requests (strictly separates rejected requests)
  const filteredRequests = allRequests.filter((r) => {
    // If status filter is 'All', strictly exclude rejected requests
    if (reqStatusFilter === 'All') {
      if (isRequestRejected(r)) return false;
    } else if (r.status !== reqStatusFilter) {
      return false;
    }

    if (reqSearch) {
      const q = reqSearch.toLowerCase();
      const matchesName = r.productName.toLowerCase().includes(q);
      const matchesUser = r.userName.toLowerCase().includes(q);
      const matchesMobile = r.userMobile.includes(q);
      const matchesId = r.id.toLowerCase().includes(q);
      if (!matchesName && !matchesUser && !matchesMobile && !matchesId) return false;
    }
    return true;
  });

  // Filtered Rejected Requests for the dedicated Rejected Requests tab
  const filteredRejectedRequests = rejectedRequests.filter((r) => {
    if (rejectedSearch) {
      const q = rejectedSearch.toLowerCase();
      const matchesName = r.productName.toLowerCase().includes(q);
      const matchesUser = r.userName.toLowerCase().includes(q);
      const matchesMobile = r.userMobile.includes(q);
      const matchesId = r.id.toLowerCase().includes(q);
      const matchesReason = (r.rejectionNote || r.adminNotes || '').toLowerCase().includes(q);
      if (!matchesName && !matchesUser && !matchesMobile && !matchesId && !matchesReason) return false;
    }
    return true;
  });

  // Filtered Users
  const filteredUsers = allUsers.filter((u) => {
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchesName = u.fullName.toLowerCase().includes(q);
      const matchesMobile = u.mobileNumber.includes(q);
      const matchesEmail = u.email ? u.email.toLowerCase().includes(q) : false;
      if (!matchesName && !matchesMobile && !matchesEmail) return false;
    }
    if (userStatusFilter !== 'All' && u.status !== userStatusFilter) return false;
    return true;
  });

  // Helper status badge
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'Paid':
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            Paid & Completed
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Partially Paid
          </span>
        );
      case 'Pending Review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40">
            Pending Review
          </span>
        );
      case 'Accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            Accepted
          </span>
        );
      case 'Rejected':
      case 'Cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40">
            {status}
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    if (allRequests.length === 0) {
      showToast('No requests available to export.');
      return;
    }
    const headers = ['Request ID', 'User Mobile', 'User Name', 'Product Name', 'Purpose', 'Status', 'Total Price', 'Paid Amount', 'Remaining', 'Created At'];
    const rows = allRequests.map((r) => [
      r.id,
      r.userMobile,
      `"${r.userName}"`,
      `"${r.productName}"`,
      `"${r.purpose}"`,
      r.status,
      r.actualPrice || r.expectedPrice || 0,
      r.amountPaid || 0,
      r.remainingAmount || 0,
      r.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DIGIZORT_ADMIN_REPORT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Admin Report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-xl px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={OFFICIAL_DIGIZORT_LOGO}
            alt="DIGIZORT Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_12px_rgba(225,29,72,0.4)]"
          />
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              DIGIZORT <span className="text-xs text-rose-400 font-bold uppercase">ADMIN PANEL</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              Order Request, Payment Tracking & Customer Management
            </p>
          </div>
        </div>

        <button
          onClick={logoutUser}
          className="p-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5"
          id="btn-admin-logout"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Exit Admin</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setAdminTab('dashboard')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'dashboard'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-dashboard"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Stats</span>
          </button>

          <button
            onClick={() => setAdminTab('requests')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'requests'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-requests"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Active Requests ({activeRequests.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('group_payment')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'group_payment'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-group-payment"
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Grouping</span>
          </button>

          <button
            onClick={() => setAdminTab('balance_requests')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'balance_requests'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-balance-requests"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Balance Requests ({balanceRequests.length})</span>
            {pendingBalanceRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] animate-pulse">
                {pendingBalanceRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('rejected')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-rejected"
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span>Rejected Requests ({rejectedRequests.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'users'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-users"
          >
            <Users className="w-4 h-4" />
            <span>Manage Customers ({allUsers.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('reports')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'reports'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-reports"
          >
            <FileText className="w-4 h-4" />
            <span>Reports & Exports</span>
          </button>
        </div>

        {/* TAB 1: DASHBOARD STATS */}
        {adminTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Pending Balance Requests Alert Banner */}
            {pendingBalanceRequestsCount > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-300">
                      {pendingBalanceRequestsCount} Customer Balance Payout Request{pendingBalanceRequestsCount > 1 ? 's' : ''} Pending Review
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Customers have submitted requests to withdraw/refund funds from their available balances.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAdminTab('balance_requests')}
                  className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition-all self-start sm:self-auto shrink-0 flex items-center gap-1.5"
                  id="btn-admin-dash-review-payouts"
                >
                  <span>Review Payout Requests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Realtime Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Today's Requests</span>
                <span className="text-3xl font-extrabold text-white block">{todayRequestsCount}</span>
                <span className="text-[10px] text-zinc-400">Created today</span>
              </div>

              <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Pending Requests</span>
                <span className="text-3xl font-extrabold text-blue-400 block">{pendingRequestsCount}</span>
                <span className="text-[10px] text-zinc-400">Needs processing</span>
              </div>

              <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Pending Payments</span>
                <span className="text-3xl font-extrabold text-amber-400 block">{pendingPaymentsCount}</span>
                <span className="text-[10px] text-zinc-400">Unpaid balance</span>
              </div>

              <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Completed Orders</span>
                <span className="text-3xl font-extrabold text-emerald-400 block">{completedRequestsCount}</span>
                <span className="text-[10px] text-zinc-400">Paid & Delivered</span>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Total Collected</span>
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-3xl font-extrabold text-emerald-400 block">
                  {settings.currencySymbol}
                  {totalCollected.toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-zinc-500">Realized revenue across all requests</p>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Total Pending</span>
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-3xl font-extrabold text-rose-400 block">
                  {settings.currencySymbol}
                  {totalPending.toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-zinc-500">Outstanding balances owed by customers</p>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Extra Cash Received</span>
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-3xl font-extrabold text-amber-400 block">
                  {settings.currencySymbol}
                  {totalExtraCash.toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-zinc-500">Overpayments / extra cash recorded</p>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Monthly Revenue</span>
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-3xl font-extrabold text-white block">
                  {settings.currencySymbol}
                  {monthlyRevenue.toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-zinc-500">Revenue collected in current month</p>
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Recent Order Requests & System Activity
              </h3>

              {allRequests.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No requests registered in the database yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allRequests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">{req.productName}</span>
                          <span className="text-zinc-400 font-semibold">({req.userName})</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{req.purpose} • #{req.id}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-rose-400">
                          {settings.currencySymbol}
                          {(req.actualPrice || req.expectedPrice || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-zinc-500">
                          {new Date(req.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ALL REQUESTS MANAGEMENT */}
        {adminTab === 'requests' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer name, mobile, product or ID..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  id="input-admin-search-requests"
                />
              </div>

              <select
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Accepted">Accepted</option>
                <option value="Processing">Processing</option>
                <option value="Ordered">Ordered</option>
                <option value="Waiting For Payment">Waiting For Payment</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Requests Table / Cards List */}
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-3xl space-y-2">
                <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No requests found</h4>
                <p className="text-xs text-zinc-500">
                  {allRequests.length === 0
                    ? 'No requests have been submitted by customers yet.'
                    : 'No requests match your current search and filter settings.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const actual = getRequestPrice(req);
                  const paid = getRequestPaid(req);
                  const rem = getRequestRemaining(req);

                  return (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">{req.productName}</span>
                          <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            {req.userName} ({req.userMobile})
                          </span>
                          {getStatusBadge(req.status)}
                          {req.extraCash && req.extraCash > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Extra Cash: {settings.currencySymbol}{req.extraCash.toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-zinc-300">{req.purpose}</p>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                          <span>Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                          <span>•</span>
                          <span>Doc ID: #{req.id}</span>
                          {req.productLink && (
                            <a
                              href={req.productLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>View Product Link</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800">
                        <div className="text-left sm:text-right text-xs">
                          <span className="text-zinc-400 block font-bold">
                            Total: {settings.currencySymbol}{actual.toLocaleString('en-IN')}
                          </span>
                          <span className="text-emerald-400 font-extrabold block">
                            Paid: {settings.currencySymbol}{paid.toLocaleString('en-IN')}
                          </span>
                          {rem > 0 ? (
                            <span className="text-rose-400 font-bold block">
                              Balance: {settings.currencySymbol}{rem.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-bold block">
                              Fully Settled
                            </span>
                          )}
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {req.status === 'Pending Review' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedReq(req);
                                  setModalAction('accept');
                                }}
                                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReq(req);
                                  setModalAction('reject');
                                }}
                                className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs rounded-xl transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setModalAction('status');
                            }}
                            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors"
                          >
                            Update Status
                          </button>

                          {rem > 0 && (
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setModalAction('payment');
                              }}
                              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                            >
                              Record Payment
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setModalAction('delete');
                            }}
                            className="py-2 px-3 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                            title="Delete Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>

                          <button
                            onClick={() => setInspectDocReq(req)}
                            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            title="View Document & Share"
                          >
                            <FileText className="w-3.5 h-3.5" />
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

        {/* TAB: PAYMENT GROUPING (BATCH SETTLEMENT) */}
        {adminTab === 'group_payment' && (() => {
          // Identify customers with unpaid, active requests
          const eligibleReqs = activeRequests.filter((r) => isRequestEligibleForPayment(r));
          const usersWithDue = allUsers.filter((u) =>
            eligibleReqs.some((r) => r.userMobile === u.mobileNumber || r.userId === u.id)
          );

          const currentCustomer = allUsers.find(
            (u) => u.id === selectedGroupUserId || u.mobileNumber === selectedGroupUserId
          );

          const customerUnpaidReqs = currentCustomer
            ? eligibleReqs.filter(
                (r) => r.userMobile === currentCustomer.mobileNumber || r.userId === currentCustomer.id
              )
            : [];

          const selectedReqsList = customerUnpaidReqs.filter((r) =>
            selectedGroupReqIds.includes(r.id)
          );

          const totalDueForSelected = selectedReqsList.reduce(
            (sum, r) => sum + getRequestRemaining(r),
            0
          );

          const cashReceivedNum = parseFloat(groupCashReceivedInput) || 0;
          const allocation = allocatePaymentAcrossRequests(selectedReqsList, cashReceivedNum);

          const handleToggleReq = (id: string) => {
            if (selectedGroupReqIds.includes(id)) {
              setSelectedGroupReqIds(selectedGroupReqIds.filter((x) => x !== id));
            } else {
              setSelectedGroupReqIds([...selectedGroupReqIds, id]);
            }
          };

          const handleSelectAll = () => {
            setSelectedGroupReqIds(customerUnpaidReqs.map((r) => r.id));
          };

          const handleDeselectAll = () => {
            setSelectedGroupReqIds([]);
          };

          const handleExecuteGroupPayment = async () => {
            if (!currentCustomer) {
              showToast('Please select a customer.');
              return;
            }
            if (selectedGroupReqIds.length === 0) {
              showToast('Please select at least one request to settle.');
              return;
            }
            if (cashReceivedNum <= 0) {
              showToast('Please enter a valid cash amount received.');
              return;
            }

            try {
              setIsProcessingGroupPayment(true);
              const gpId = await adminProcessGroupPayment(
                selectedGroupReqIds,
                cashReceivedNum,
                groupPaymentNote
              );
              showToast(`Group Payment #${gpId} processed successfully!`);
              setSelectedGroupReqIds([]);
              setGroupCashReceivedInput('');
              setGroupPaymentNote('');
            } catch (err: any) {
              showToast(`Failed to process group payment: ${err.message || 'Unknown error'}`);
            } finally {
              setIsProcessingGroupPayment(false);
            }
          };

          return (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Payment Grouping & Batch Settlement
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Settle multiple unpaid requests for the same customer in a single transaction with automated allocation and extra cash tracking.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Select Customer */}
              <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-400" />
                    <span>Select Customer with Unpaid Balances</span>
                  </label>
                  <span className="text-xs text-zinc-500">
                    {usersWithDue.length} customer(s) have pending balances
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {usersWithDue.length === 0 ? (
                    <div className="col-span-full p-8 text-center bg-zinc-950 border border-zinc-800/80 rounded-2xl text-xs text-zinc-500">
                      All customer requests are currently fully settled! No pending dues.
                    </div>
                  ) : (
                    usersWithDue.map((u) => {
                      const uUnpaid = eligibleReqs.filter(
                        (r) => r.userMobile === u.mobileNumber || r.userId === u.id
                      );
                      const uDue = uUnpaid.reduce((sum, r) => sum + getRequestRemaining(r), 0);
                      const isSelected =
                        selectedGroupUserId === u.id || selectedGroupUserId === u.mobileNumber;

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedGroupUserId(u.id);
                            // Auto select all requests for this customer initially
                            setSelectedGroupReqIds(uUnpaid.map((r) => r.id));
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-rose-600/10 border-rose-500 text-white ring-1 ring-rose-500'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <p className="font-extrabold text-sm text-white">{u.fullName}</p>
                            <p className="text-xs text-rose-400 font-bold">{u.mobileNumber}</p>
                            <span className="text-[11px] text-zinc-400">
                              {uUnpaid.length} unpaid request{uUnpaid.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-zinc-400 block">Total Due</span>
                            <span className="text-sm font-extrabold text-rose-400 block">
                              {settings.currencySymbol}{uDue.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Select Requests to Settle (if customer selected) */}
              {currentCustomer && (
                <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        Select Requests for {currentCustomer.fullName}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Choose which requests to include in this settlement batch.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-xl transition-colors"
                      >
                        Select All ({customerUnpaidReqs.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-xl transition-colors"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  {/* Requests Selection List */}
                  <div className="space-y-2.5">
                    {customerUnpaidReqs.map((req) => {
                      const rem = getRequestRemaining(req);
                      const isChecked = selectedGroupReqIds.includes(req.id);

                      return (
                        <div
                          key={req.id}
                          onClick={() => handleToggleReq(req.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                            isChecked
                              ? 'bg-rose-950/20 border-rose-500/50 text-white'
                              : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1 text-rose-500">
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-rose-500" />
                              ) : (
                                <Square className="w-5 h-5 text-zinc-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-white text-sm">
                                  {req.productName}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  #{req.id}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">{req.purpose}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-zinc-400 block">Current Due</span>
                            <span className="text-sm font-extrabold text-rose-400 block">
                              {settings.currencySymbol}{rem.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Price: {settings.currencySymbol}{getRequestPrice(req).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Batch Settlement Form */}
                  {selectedGroupReqIds.length > 0 && (
                    <div className="pt-4 border-t border-zinc-800 space-y-4">
                      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                              Selected Requests
                            </span>
                            <span className="text-2xl font-extrabold text-white block">
                              {selectedGroupReqIds.length}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                              Total Amount Due
                            </span>
                            <span className="text-2xl font-extrabold text-rose-400 block">
                              {settings.currencySymbol}{totalDueForSelected.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                              Extra Cash (Change / Credit)
                            </span>
                            <span className="text-2xl font-extrabold text-amber-400 block">
                              {settings.currencySymbol}{allocation.extraCash.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Cash Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-300">
                            Cash Received from Customer ({settings.currencySymbol}) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                              {settings.currencySymbol}
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              placeholder={`Enter amount e.g. ${totalDueForSelected}`}
                              value={groupCashReceivedInput}
                              onChange={(e) => setGroupCashReceivedInput(e.target.value)}
                              className="w-full pl-8 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-base font-extrabold text-white focus:outline-none focus:border-rose-500"
                              id="input-admin-group-cash"
                            />
                          </div>
                        </div>

                        {/* Payment Notes */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-300">
                            Payment Notes / Reference (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Counter Cash, GPay/PhonePe Ref, Settled in person..."
                            value={groupPaymentNote}
                            onChange={(e) => setGroupPaymentNote(e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                            id="input-admin-group-note"
                          />
                        </div>

                        {/* Allocation Preview Breakdown */}
                        {cashReceivedNum > 0 && (
                          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                            <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                              Allocation Preview
                            </h5>

                            <div className="space-y-1.5 text-xs">
                              {allocation.requestAllocations.map((alloc) => {
                                const reqObj = selectedReqsList.find((r) => r.id === alloc.requestId);
                                return (
                                  <div
                                    key={alloc.requestId}
                                    className="flex items-center justify-between py-1.5 border-b border-zinc-800/60 last:border-0"
                                  >
                                    <div>
                                      <span className="font-bold text-white block">
                                        {reqObj?.productName || `Request #${alloc.requestId}`}
                                      </span>
                                      <span className="text-[10px] text-zinc-500">
                                        Prev Paid: {settings.currencySymbol}{alloc.previousPaid}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-emerald-400 font-bold block">
                                        +{settings.currencySymbol}{alloc.allocatedPayment}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold ${
                                          alloc.newStatus === 'Paid'
                                            ? 'text-emerald-400'
                                            : 'text-amber-400'
                                        }`}
                                      >
                                        ➔ {alloc.newStatus} (Rem: {settings.currencySymbol}{alloc.newRemaining})
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {allocation.extraCash > 0 && (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                                  <Coins className="w-4 h-4 text-amber-400" />
                                  Extra Cash to return / credit:
                                </span>
                                <span className="text-amber-400 font-extrabold text-sm">
                                  {settings.currencySymbol}{allocation.extraCash.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Button */}
                        <button
                          type="button"
                          disabled={isProcessingGroupPayment || cashReceivedNum <= 0}
                          onClick={handleExecuteGroupPayment}
                          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                          id="btn-confirm-group-payment"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>
                            {isProcessingGroupPayment
                              ? 'Processing Atomic Group Settlement...'
                              : `Settle ${selectedGroupReqIds.length} Request(s) (${settings.currencySymbol}${allocation.amountSettled.toLocaleString('en-IN')})`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Past Group Payments History */}
              <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-rose-500" />
                    <span>Group Payments History ({groupPayments.length})</span>
                  </h4>
                  <span className="text-xs text-zinc-500">Atomic batch settlement records</span>
                </div>

                {groupPayments.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-6 text-center bg-zinc-950 rounded-2xl border border-zinc-800">
                    No group payments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {groupPayments.map((gp) => (
                      <div
                        key={gp.id}
                        className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-extrabold text-white text-sm">
                              Group Settlement #{gp.id}
                            </span>
                            <p className="text-xs text-rose-400 font-bold">
                              {gp.userName} ({gp.userMobile})
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-extrabold text-sm block">
                              Settled: {settings.currencySymbol}{gp.amountSettled.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              Received: {settings.currencySymbol}{gp.cashReceived.toLocaleString('en-IN')}
                            </span>
                            {gp.extraCash > 0 && (
                              <span className="text-amber-400 font-bold text-[11px] block">
                                Extra Cash: {settings.currencySymbol}{gp.extraCash.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between flex-wrap gap-2">
                          <span>Settled Requests: {gp.requestIds.length}</span>
                          <span>Admin: {gp.adminSignature}</span>
                          <span>{new Date(gp.createdAt).toLocaleString('en-IN')}</span>
                          {gp.notes && <span>Notes: {gp.notes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB: BALANCE REQUESTS */}
        {adminTab === 'balance_requests' && (
          <AdminBalanceRequestsView />
        )}

        {/* TAB: REJECTED REQUESTS (COMPLETE SEPARATION) */}
        {adminTab === 'rejected' && (
          <div className="space-y-4">
            {/* Search Box */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rejected requests by customer, mobile, product, ID, or rejection reason..."
                  value={rejectedSearch}
                  onChange={(e) => setRejectedSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  id="input-admin-search-rejected"
                />
              </div>
              <div className="text-xs text-zinc-400 font-bold px-2">
                Total Rejected: <span className="text-rose-400 font-extrabold">{rejectedRequests.length}</span>
              </div>
            </div>

            {filteredRejectedRequests.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-3xl space-y-2">
                <Ban className="w-12 h-12 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No rejected requests</h4>
                <p className="text-xs text-zinc-500">
                  {rejectedRequests.length === 0
                    ? 'There are currently no rejected requests in the system.'
                    : 'No rejected requests match your search criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRejectedRequests.map((req) => {
                  const actual = getRequestPrice(req);
                  return (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-3xl bg-zinc-900 border border-rose-900/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">{req.productName}</span>
                          <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            {req.userName} ({req.userMobile})
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            REJECTED
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300">{req.purpose}</p>

                        {/* Rejection Details Box */}
                        <div className="p-3 rounded-xl bg-zinc-950/80 border border-rose-900/40 text-xs space-y-1">
                          <div className="flex items-center gap-2 text-rose-300 font-bold">
                            <span>Reason for Rejection:</span>
                            <span className="text-white font-normal">
                              {req.rejectionNote || req.adminNotes || 'Request rejected by admin.'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                            <span>
                              Date & Time:{' '}
                              {req.rejectedAt
                                ? new Date(req.rejectedAt).toLocaleString('en-IN')
                                : new Date(req.updatedAt || req.createdAt).toLocaleString('en-IN')}
                            </span>
                            {req.rejectedBy && <span>Rejected By: {req.rejectedBy}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                          <span>Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                          <span>•</span>
                          <span>Request ID: #{req.id}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800">
                        <div className="text-left sm:text-right text-xs">
                          <span className="text-zinc-400 block font-bold">
                            Price: {settings.currencySymbol}{actual.toLocaleString('en-IN')}
                          </span>
                          <span className="text-zinc-500 text-[11px] block">
                            Excluded from balance
                          </span>
                        </div>

                        {/* Options: DELETE REQUEST & VIEW DETAILS */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setModalAction('delete');
                            }}
                            className="py-2 px-3.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Request</span>
                          </button>

                          <button
                            onClick={() => setInspectDocReq(req)}
                            className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
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

        {/* TAB 3: CUSTOMER USER MANAGEMENT */}
        {adminTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer by name, mobile number or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  id="input-admin-search-users"
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as any)}
                className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
              >
                <option value="All">All Users</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800 rounded-3xl space-y-2">
                <Users className="w-12 h-12 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No users found</h4>
                <p className="text-xs text-zinc-500">
                  {allUsers.length === 0
                    ? 'No customer users have registered in the database yet.'
                    : 'No users match your search query.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((usr) => {
                  const userReqs = allRequests.filter(
                    (r) => r.userMobile === usr.mobileNumber || r.userId === usr.id
                  );
                  const userSummary = calculateAccountSummary(userReqs);

                  return (
                    <div
                      key={usr.id}
                      className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-[#B71C1C] text-white font-extrabold flex items-center justify-center text-base">
                              {usr.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-white">{usr.fullName}</h4>
                              <p className="text-xs text-rose-400 font-bold">{usr.mobileNumber}</p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              usr.status === 'suspended'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            }`}
                          >
                            {usr.status}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-2 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block">Active Requests</span>
                            <span className="font-extrabold text-white block">
                              {userSummary.activeRequests}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block">Pending Due</span>
                            <span className="font-extrabold text-rose-400 block">
                              {settings.currencySymbol}{userSummary.outstandingBalance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {(() => {
                          const balInfo = getUserBalanceInfo(usr.mobileNumber, usr.id);
                          const avail = balInfo.availableBalance;

                          if (avail > 0) {
                            return (
                              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
                                    Available Balance / Credit
                                  </span>
                                  <span className="text-sm font-extrabold text-emerald-300">
                                    {settings.currencySymbol}{avail.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    onClick={() => {
                                      setBalanceModalUser(usr);
                                      setBalanceModalMode('pay');
                                    }}
                                    className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] rounded-xl flex-1 shadow-sm flex items-center justify-center gap-1 transition-all"
                                    title="Record returning cash to user"
                                  >
                                    <DollarSign className="w-3 h-3" />
                                    <span>Pay Balance</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setBalanceModalUser(usr);
                                      setBalanceModalMode('use');
                                    }}
                                    className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-xl flex-1 shadow-sm flex items-center justify-center gap-1 transition-all"
                                    title="Use balance credit"
                                  >
                                    <Coins className="w-3 h-3" />
                                    <span>Use Balance</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (balInfo.hasTransactions && avail === 0) {
                            return (
                              <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px]">
                                <span className="text-zinc-500 font-medium">Customer Balance:</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold uppercase flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Cleared ({settings.currencySymbol}0)</span>
                                </span>
                              </div>
                            );
                          }

                          if (userSummary.totalExtraCash > 0) {
                            return (
                              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px]">
                                <span className="text-amber-400 font-bold">Extra Cash:</span>
                                <span className="text-amber-300 font-extrabold">
                                  {settings.currencySymbol}{userSummary.totalExtraCash.toLocaleString('en-IN')}
                                </span>
                              </div>
                            );
                          }

                          return null;
                        })()}

                        {usr.email && (
                          <p className="text-[11px] text-zinc-400">Email: {usr.email}</p>
                        )}
                        {usr.address && (
                          <p className="text-[11px] text-zinc-400">Address: {usr.address}</p>
                        )}
                      </div>

                      {/* User Actions */}
                      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedUserDetail(usr)}
                          className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors flex-1"
                        >
                          View History
                        </button>

                        {usr.status === 'active' ? (
                          <button
                            onClick={() => adminSuspendUser(usr.id)}
                            className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            title="Suspend User"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => adminUnsuspendUser(usr.id)}
                            className="py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            title="Unsuspend User"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => adminDeleteUser(usr.id)}
                          className="py-2 px-3 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REPORTS & EXPORTS */}
        {adminTab === 'reports' && (
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-500" />
                  System Reports & Export Console
                </h3>
                <p className="text-xs text-zinc-400">
                  Export complete transaction history, payment records, and user ledgers.
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="py-3 px-5 bg-gradient-to-r from-rose-600 to-[#B71C1C] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2 transition-all shrink-0"
                id="btn-export-admin-csv"
              >
                <Download className="w-4 h-4" />
                <span>Export Report CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Active Requests</span>
                <span className="text-2xl font-extrabold text-white block">{activeRequests.length}</span>
                <p className="text-[11px] text-zinc-400">Excludes rejected items</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Rejected Requests</span>
                <span className="text-2xl font-extrabold text-rose-400 block">{rejectedRequests.length}</span>
                <p className="text-[11px] text-zinc-400">Completely isolated</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Customers</span>
                <span className="text-2xl font-extrabold text-white block">{allUsers.length}</span>
                <p className="text-[11px] text-zinc-400">Registered user accounts</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">System Balance Due</span>
                <span className="text-2xl font-extrabold text-rose-400 block">
                  {settings.currencySymbol}{totalPending.toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-zinc-400">Total active receivables</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Admin Action Modal */}
      {selectedReq && modalAction && (
        <AdminActionModal
          request={selectedReq}
          actionType={modalAction}
          onClose={() => {
            setSelectedReq(null);
            setModalAction(null);
          }}
          onOpenDoc={(updatedReq) => {
            setSelectedReq(null);
            setModalAction(null);
            setInspectDocReq(updatedReq);
          }}
        />
      )}

      {/* Inspect Document Modal */}
      {inspectDocReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectDocReq(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">Digital Document Inspector</h3>
              <p className="text-xs text-zinc-400">
                Customer: <span className="text-white font-bold">{inspectDocReq.userName}</span> ({inspectDocReq.userMobile})
              </p>
            </div>

            <DigitalDocumentCard transaction={inspectDocReq} showWhatsAppShare={true} />
          </div>
        </div>
      )}

      {/* Selected User Detail Modal */}
      {selectedUserDetail && (() => {
        const userAllReqs = allRequests.filter(
          (r) => r.userMobile === selectedUserDetail.mobileNumber || r.userId === selectedUserDetail.id
        );
        const userSummary = calculateAccountSummary(userAllReqs);
        const userBalInfo = getUserBalanceInfo(selectedUserDetail.mobileNumber, selectedUserDetail.id);
        const availableBalance = userBalInfo.availableBalance;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* User Header */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-[#B71C1C] text-white font-extrabold text-xl flex items-center justify-center">
                    {selectedUserDetail.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{selectedUserDetail.fullName}</h3>
                    <p className="text-xs text-rose-400 font-bold">{selectedUserDetail.mobileNumber}</p>
                    {selectedUserDetail.email && (
                      <p className="text-[11px] text-zinc-400">{selectedUserDetail.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {availableBalance > 0 && (
                    <>
                      <button
                        onClick={() => {
                          setBalanceModalUser(selectedUserDetail);
                          setBalanceModalMode('pay');
                        }}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                        id="btn-modal-pay-balance"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay Balance ({settings.currencySymbol}{availableBalance.toLocaleString('en-IN')})</span>
                      </button>
                      <button
                        onClick={() => {
                          setBalanceModalUser(selectedUserDetail);
                          setBalanceModalMode('use');
                        }}
                        className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                        id="btn-modal-use-balance"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Use Balance</span>
                      </button>
                    </>
                  )}

                  {userSummary.outstandingBalance > 0 && (
                    <button
                      onClick={() => {
                        const uid = selectedUserDetail.id;
                        setSelectedUserDetail(null);
                        setSelectedGroupUserId(uid);
                        setAdminTab('group_payment');
                      }}
                      className="py-2 px-3.5 bg-gradient-to-r from-rose-600 to-[#B71C1C] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Batch Settle in Payment Grouping</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Balance Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Active Requests</span>
                  <span className="text-xl font-extrabold text-white block">
                    {userSummary.activeRequests}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Paid</span>
                  <span className="text-xl font-extrabold text-emerald-400 block">
                    {settings.currencySymbol}{userSummary.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Pending Due</span>
                  <span className="text-xl font-extrabold text-rose-400 block">
                    {settings.currencySymbol}{userSummary.outstandingBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Available Balance / Credit</span>
                  <span className={`text-xl font-extrabold block ${availableBalance > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {settings.currencySymbol}{availableBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Request History for this user */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Customer Request Ledger ({userAllReqs.length})
                  </h4>
                  {userSummary.rejectedRequests > 0 && (
                    <span className="text-xs text-rose-400 font-bold">
                      {userSummary.rejectedRequests} rejected (excluded from dues)
                    </span>
                  )}
                </div>

                {userAllReqs.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-6 text-center bg-zinc-950 rounded-2xl border border-zinc-800">
                    No requests submitted by this user.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {userAllReqs.map((r) => {
                      const actual = getRequestPrice(r);
                      const paid = getRequestPaid(r);
                      const rem = getRequestRemaining(r);
                      const isRejected = isRequestRejected(r);

                      return (
                        <div
                          key={r.id}
                          className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                            isRejected
                              ? 'bg-rose-950/20 border-rose-900/40 text-zinc-400'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-white text-sm">{r.productName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">#{r.id}</span>
                              {getStatusBadge(r.status)}
                              {r.extraCash && r.extraCash > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Extra Cash: {settings.currencySymbol}{r.extraCash}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-zinc-400">{r.purpose}</p>
                            {isRejected && (
                              <p className="text-[11px] text-rose-300 font-medium">
                                Rejection Note: {r.rejectionNote || r.adminNotes || 'Rejected by admin'}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-850">
                            <div className="text-left md:text-right">
                              <span className="font-extrabold text-white block">
                                {settings.currencySymbol}{actual.toLocaleString('en-IN')}
                              </span>
                              {!isRejected ? (
                                <span className="block text-[10px] text-zinc-400">
                                  Paid: {settings.currencySymbol}{paid} | Rem: {settings.currencySymbol}{rem}
                                </span>
                              ) : (
                                <span className="block text-[10px] text-rose-400">
                                  Excluded from balance
                                </span>
                              )}
                            </div>

                            {/* Actions on this request */}
                            <div className="flex items-center gap-1.5">
                              {r.status === 'Pending Review' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedReq(r);
                                      setModalAction('accept');
                                    }}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                                    title="Accept Request"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedReq(r);
                                      setModalAction('reject');
                                    }}
                                    className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 rounded-lg text-xs font-bold border border-rose-500/30"
                                    title="Reject Request"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {!isRejected && rem > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedReq(r);
                                    setModalAction('payment');
                                  }}
                                  className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg"
                                >
                                  Pay
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedReq(r);
                                  setModalAction('status');
                                }}
                                className="py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px] rounded-lg"
                              >
                                Status
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedReq(r);
                                  setModalAction('delete');
                                }}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs transition-colors border border-rose-500/30"
                                title="Delete Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setInspectDocReq(r)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
                                title="View Document"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Balance Audit Ledger */}
              <div className="pt-4 border-t border-zinc-800">
                <BalanceLedgerView
                  transactions={userBalInfo.transactions}
                  title="Balance & Credit Transactions History"
                  emptyText="No credit or balance transactions recorded for this customer yet."
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Balance Action Modal (Pay Balance / Use Balance) */}
      {balanceModalUser && balanceModalMode && (
        <BalanceManagementModal
          user={balanceModalUser}
          mode={balanceModalMode}
          preselectedRequestId={balanceModalPreselectedReqId}
          onClose={() => {
            setBalanceModalUser(null);
            setBalanceModalMode(null);
            setBalanceModalPreselectedReqId(undefined);
          }}
        />
      )}
    </div>
  );
};
