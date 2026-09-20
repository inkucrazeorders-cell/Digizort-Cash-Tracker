import React, { useState } from 'react';
import { BalanceRequest } from '../types';
import { useApp } from '../context/AppContext';
import {
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  CreditCard,
  User,
  Phone,
  FileText,
  DollarSign,
  ArrowDownToLine,
  ArrowRight,
} from 'lucide-react';

export const AdminBalanceRequestsView: React.FC = () => {
  const {
    balanceRequests,
    getUserBalanceInfo,
    adminApproveBalanceRequest,
    adminRejectBalanceRequest,
    settings,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Paid' | 'Rejected'>('All');

  // Modal State for Mark as Paid
  const [approveModalReq, setApproveModalReq] = useState<BalanceRequest | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<string>('UPI');
  const [customPayoutMethod, setCustomPayoutMethod] = useState<string>('');
  const [adminPayoutNote, setAdminPayoutNote] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Modal State for Reject
  const [rejectModalReq, setRejectModalReq] = useState<BalanceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Filtering
  const filteredRequests = balanceRequests.filter((req) => {
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = req.userName?.toLowerCase().includes(q);
      const matchMobile = req.userMobile?.toLowerCase().includes(q);
      const matchId = req.id?.toLowerCase().includes(q);
      const matchNotes = req.userNotes?.toLowerCase().includes(q);
      if (!matchName && !matchMobile && !matchId && !matchNotes) return false;
    }
    return true;
  });

  const pendingCount = balanceRequests.filter((r) => r.status === 'Pending').length;
  const paidCount = balanceRequests.filter((r) => r.status === 'Paid').length;
  const rejectedCount = balanceRequests.filter((r) => r.status === 'Rejected').length;

  const handleConfirmApprove = async () => {
    if (!approveModalReq) return;
    try {
      setIsApproving(true);
      const methodToUse = payoutMethod === 'Other' ? customPayoutMethod.trim() || 'Manual Payout' : payoutMethod;
      await adminApproveBalanceRequest(approveModalReq.id, adminPayoutNote.trim() || undefined, methodToUse);
      setIsApproving(false);
      setApproveModalReq(null);
      setAdminPayoutNote('');
      setCustomPayoutMethod('');
    } catch (err: any) {
      setIsApproving(false);
      showToast(err?.message || 'Failed to approve payout request.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    try {
      setIsRejecting(true);
      await adminRejectBalanceRequest(rejectModalReq.id, rejectionReason.trim() || 'Request declined by admin');
      setIsRejecting(false);
      setRejectModalReq(null);
      setRejectionReason('');
    } catch (err: any) {
      setIsRejecting(false);
      showToast(err?.message || 'Failed to reject request.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">
            BALANCE MANAGEMENT
          </span>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Customer Balance Payout Requests</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review, approve/mark as paid, or decline balance withdrawal requests submitted by users.
          </p>
        </div>

        {/* Status Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300 font-medium">Pending:</span>
            <span className="text-amber-400 font-black">{pendingCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-300 font-medium">Paid:</span>
            <span className="text-emerald-400 font-black">{paidCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-zinc-300 font-medium">Rejected:</span>
            <span className="text-rose-400 font-black">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone number, request ID, or notes..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2 pl-9 pr-4 text-white text-xs outline-none transition-colors"
            id="input-admin-search-bal-requests"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'Pending', 'Paid', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-750'
              }`}
              id={`filter-bal-req-${tab.toLowerCase()}`}
            >
              {tab === 'All' ? `All Requests (${balanceRequests.length})` : `${tab} (${balanceRequests.filter(r => r.status === tab).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Cards */}
      {filteredRequests.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 rounded-3xl border border-zinc-800/80 space-y-2">
          <Coins className="w-9 h-9 text-zinc-600 mx-auto" />
          <p className="text-sm text-zinc-300 font-bold">No balance requests found</p>
          <p className="text-xs text-zinc-500">
            {searchQuery || statusFilter !== 'All'
              ? 'Try changing your search query or filter selection.'
              : 'Users will appear here when they request payouts from their available balances.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'Pending';
            const isPaid = req.status === 'Paid';
            const isRejected = req.status === 'Rejected';
            const isCancelled = req.status === 'Cancelled';

            // Authoritative user balance at time of inspection
            const userBalInfo = getUserBalanceInfo(req.userMobile, req.userId);
            const currentAvailable = userBalInfo.availableBalance;

            return (
              <div
                key={req.id}
                className={`p-5 rounded-3xl bg-zinc-900 border transition-all ${
                  isPending
                    ? 'border-amber-500/40 shadow-lg shadow-amber-950/20'
                    : isPaid
                    ? 'border-emerald-500/20'
                    : 'border-zinc-800'
                }`}
                id={`admin-bal-req-card-${req.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: User Details, Request ID, Date */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {isPaid && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Paid</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Cancelled by User
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-zinc-500 font-bold">#{req.id}</span>
                      <span className="text-[11px] text-zinc-500">•</span>
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {req.date} at {req.time}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm font-extrabold text-white">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{req.userName || 'Customer'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-300 font-mono">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{req.userMobile}</span>
                      </div>
                    </div>

                    {/* Notes & Details */}
                    {req.userNotes && (
                      <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300">
                        <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                          User Payment Request Note:
                        </span>
                        <p className="italic mt-0.5">"{req.userNotes}"</p>
                      </div>
                    )}

                    {/* Processed Info */}
                    {isPaid && (
                      <div className="text-xs text-emerald-400/90 flex items-center gap-2 flex-wrap pt-1">
                        <span>Paid via: <strong>{req.payoutMethod || 'Cash/UPI'}</strong></span>
                        {req.adminNotes && <span>• Note: "{req.adminNotes}"</span>}
                        {req.processedAt && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ({new Date(req.processedAt).toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    )}

                    {isRejected && (
                      <div className="text-xs text-rose-400 flex items-center gap-1.5 flex-wrap pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Rejection Reason: {req.adminNotes || 'Declined by admin'}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Balance & Financial Context */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90 text-xs space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Requested:</span>
                      <span className="text-base font-black text-white">
                        {settings.currencySymbol}
                        {req.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                      <span className="text-zinc-400">Current Balance:</span>
                      <span className="text-emerald-400 font-extrabold font-mono">
                        {settings.currencySymbol}
                        {currentAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {isPending && (
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px]">
                        <span className="text-zinc-500">After Payout:</span>
                        <span className="text-zinc-300 font-bold font-mono">
                          {settings.currencySymbol}
                          {Math.max(0, currentAvailable - req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 justify-end shrink-0 flex-wrap">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => {
                            setApproveModalReq(req);
                            setPayoutMethod('Cash');
                            setAdminPayoutNote('Paid user balance in cash');
                          }}
                          className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                          id={`btn-admin-pay-cash-req-${req.id}`}
                          title="Mark that you paid this user balance in cash"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Mark Paid (Cash)</span>
                        </button>

                        <button
                          onClick={() => {
                            setApproveModalReq(req);
                            setPayoutMethod('UPI');
                            setAdminPayoutNote('');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                          id={`btn-admin-pay-req-${req.id}`}
                          title="Pay via UPI, Bank or other methods"
                        >
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                          <span>Other / UPI</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectModalReq(req);
                            setRejectionReason('');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 border border-zinc-700 hover:border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
                          id={`btn-admin-reject-req-${req.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">
                        {isPaid ? 'Payout Recorded' : isRejected ? 'Declined' : 'No Actions'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: MARK AS PAID (APPROVE) */}
      {approveModalReq && (() => {
        const userBalInfo = getUserBalanceInfo(approveModalReq.userMobile, approveModalReq.userId);
        const availableBalance = userBalInfo.availableBalance;
        const balanceAfterPayout = Math.max(0, availableBalance - approveModalReq.amount);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">Confirm Balance Payout</h4>
                    <p className="text-xs text-zinc-400">Mark payout request as Paid & deduct balance</p>
                  </div>
                </div>
                <button
                  onClick={() => setApproveModalReq(null)}
                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User & Financial Summary */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">User:</span>
                  <span className="text-white font-bold">
                    {approveModalReq.userName} ({approveModalReq.userMobile})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Requested Amount:</span>
                  <span className="text-amber-400 font-extrabold text-sm">
                    {settings.currencySymbol}
                    {approveModalReq.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Current Available Balance:</span>
                  <span className="text-white font-extrabold">
                    {settings.currencySymbol}
                    {availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                    Balance after payout:
                  </span>
                  <span className="text-emerald-400 font-black text-sm font-mono">
                    {settings.currencySymbol}
                    {balanceAfterPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {approveModalReq.userNotes && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                      Customer Note / Payment Details:
                    </span>
                    <p className="text-zinc-300 italic mt-0.5">"{approveModalReq.userNotes}"</p>
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Payment Method Used:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'UPI', 'Bank Transfer', 'GPay', 'PhonePe', 'Other'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPayoutMethod(method);
                        if (method === 'Cash' && !adminPayoutNote) {
                          setAdminPayoutNote('Paid user balance in cash');
                        }
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        payoutMethod === method
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {method === 'Cash' && <DollarSign className="w-3.5 h-3.5" />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
                {payoutMethod === 'Other' && (
                  <input
                    type="text"
                    value={customPayoutMethod}
                    onChange={(e) => setCustomPayoutMethod(e.target.value)}
                    placeholder="Specify payment method..."
                    className="w-full mt-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                  />
                )}
              </div>

              {/* Admin Note (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Admin Note <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={adminPayoutNote}
                  onChange={(e) => setAdminPayoutNote(e.target.value)}
                  placeholder="e.g. UPI Ref: 1234567890 or Paid in cash at desk"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-white text-xs outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalReq(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={isApproving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                  id="btn-confirm-approve-payout"
                >
                  {isApproving
                    ? 'Processing...'
                    : payoutMethod === 'Cash'
                    ? `Confirm Paid in Cash (${settings.currencySymbol}${approveModalReq.amount.toLocaleString('en-IN')})`
                    : 'Confirm & Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: REJECT REQUEST */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">Reject Balance Request</h4>
                  <p className="text-xs text-zinc-400">Balance will NOT be deducted</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalReq(null)}
                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No balance will be deducted.</span>
              </p>
              <p className="text-[11px] text-zinc-400">
                Rejecting this request will release any temporary reservation so the customer can use their balance or request again with updated details.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">
                Rejection Reason <span className="text-zinc-500 font-normal">(Provided to user)</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incorrect UPI ID, please provide active UPI address or collect cash in person"
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3 text-white text-xs outline-none"
                id="input-reject-reason"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all"
                id="btn-confirm-reject-payout"
              >
                {isRejecting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
