import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import { OrderRequest, RequestStatus, AppUser } from '../types';
import { AdminActionModal } from './AdminActionModal';
import { DigitalDocumentCard } from './DigitalDocumentCard';
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
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    allRequests,
    allUsers,
    settings,
    logoutUser,
    adminSuspendUser,
    adminUnsuspendUser,
    adminDeleteUser,
    showToast,
  } = useApp();

  const [adminTab, setAdminTab] = useState<'dashboard' | 'requests' | 'users' | 'reports'>('dashboard');

  // Action Modal State
  const [selectedReq, setSelectedReq] = useState<OrderRequest | null>(null);
  const [modalAction, setModalAction] = useState<'accept' | 'reject' | 'status' | 'payment' | null>(null);

  // Document Card Inspection Modal
  const [inspectDocReq, setInspectDocReq] = useState<OrderRequest | null>(null);

  // Filters for Requests
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<string>('All');

  // Filters for Users
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'All' | 'active' | 'suspended'>('All');

  // Selected User detail modal
  const [selectedUserDetail, setSelectedUserDetail] = useState<AppUser | null>(null);

  // Stats calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRequestsCount = allRequests.filter(
    (r) => r.createdAt && r.createdAt.slice(0, 10) === todayStr
  ).length;

  const pendingRequestsCount = allRequests.filter(
    (r) => r.status === 'Pending Review' || r.status === 'Accepted' || r.status === 'Processing' || r.status === 'Ordered'
  ).length;

  const completedRequestsCount = allRequests.filter(
    (r) => r.status === 'Completed' || r.status === 'Paid'
  ).length;

  const pendingPaymentsCount = allRequests.filter(
    (r) => r.status === 'Waiting For Payment' || r.status === 'Partially Paid'
  ).length;

  const totalCollected = allRequests.reduce((sum, r) => {
    const actual = r.actualPrice || r.expectedPrice || 0;
    return sum + (r.amountPaid || (r.status === 'Paid' ? actual : 0));
  }, 0);

  const totalPending = allRequests.reduce((sum, r) => {
    const actual = r.actualPrice || r.expectedPrice || 0;
    const paid = r.amountPaid || (r.status === 'Paid' ? actual : 0);
    return sum + (r.remainingAmount ?? (r.status === 'Paid' ? 0 : Math.max(0, actual - paid)));
  }, 0);

  // Monthly Revenue Calculation
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = allRequests
    .filter((r) => r.createdAt && r.createdAt.slice(0, 7) === currentMonthStr)
    .reduce((sum, r) => {
      const actual = r.actualPrice || r.expectedPrice || 0;
      return sum + (r.amountPaid || (r.status === 'Paid' ? actual : 0));
    }, 0);

  // Filtered Requests
  const filteredRequests = allRequests.filter((r) => {
    if (reqSearch) {
      const q = reqSearch.toLowerCase();
      const matchesName = r.productName.toLowerCase().includes(q);
      const matchesUser = r.userName.toLowerCase().includes(q);
      const matchesMobile = r.userMobile.includes(q);
      const matchesId = r.id.toLowerCase().includes(q);
      if (!matchesName && !matchesUser && !matchesMobile && !matchesId) return false;
    }
    if (reqStatusFilter !== 'All' && r.status !== reqStatusFilter) return false;
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
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
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
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              adminTab === 'requests'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="admin-tab-requests"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>All Requests ({allRequests.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
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
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  const actual = req.actualPrice || req.expectedPrice || 0;
                  const paid = req.amountPaid || (req.status === 'Paid' ? actual : 0);
                  const rem = req.remainingAmount ?? (req.status === 'Paid' ? 0 : Math.max(0, actual - paid));

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
                          {rem > 0 && (
                            <span className="text-rose-400 font-bold block">
                              Balance: {settings.currencySymbol}{rem.toLocaleString('en-IN')}
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
                  const reqs = allRequests.filter((r) => r.userMobile === usr.mobileNumber);
                  const totalSpent = reqs.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
                  const pendingBal = reqs.reduce((sum, r) => {
                    const actual = r.actualPrice || r.expectedPrice || 0;
                    const paid = r.amountPaid || (r.status === 'Paid' ? actual : 0);
                    return sum + (r.remainingAmount ?? (r.status === 'Paid' ? 0 : Math.max(0, actual - paid)));
                  }, 0);

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
                            <span className="text-[10px] text-zinc-500 font-bold block">Requests</span>
                            <span className="font-extrabold text-white block">{reqs.length}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block">Pending Due</span>
                            <span className="font-extrabold text-rose-400 block">
                              {settings.currencySymbol}{pendingBal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total System Requests</span>
                <span className="text-2xl font-extrabold text-white block">{allRequests.length}</span>
                <p className="text-[11px] text-zinc-400">Registered across all customers</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Users</span>
                <span className="text-2xl font-extrabold text-white block">{allUsers.length}</span>
                <p className="text-[11px] text-zinc-400">Registered mobile identity users</p>
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
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUserDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-[#B71C1C] text-white font-extrabold text-xl flex items-center justify-center">
                {selectedUserDetail.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">{selectedUserDetail.fullName}</h3>
                <p className="text-xs text-rose-400 font-bold">{selectedUserDetail.mobileNumber}</p>
              </div>
            </div>

            {/* Request History for this user */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-zinc-400">
                User Order & Request History
              </h4>

              {allRequests.filter((r) => r.userMobile === selectedUserDetail.mobileNumber).length === 0 ? (
                <p className="text-xs text-zinc-500">No requests submitted by this user.</p>
              ) : (
                <div className="space-y-2">
                  {allRequests
                    .filter((r) => r.userMobile === selectedUserDetail.mobileNumber)
                    .map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">{r.productName}</p>
                          <p className="text-[10px] text-zinc-400">{r.purpose}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-rose-400">
                            {settings.currencySymbol}{(r.actualPrice || r.expectedPrice || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="block text-[10px] text-zinc-500">{r.status}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
