import React from 'react';
import { BalanceRequest } from '../types';
import { Clock, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowDownToLine } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface UserBalanceRequestsListProps {
  requests: BalanceRequest[];
}

export const UserBalanceRequestsList: React.FC<UserBalanceRequestsListProps> = ({ requests }) => {
  const { userCancelBalanceRequest, settings } = useApp();

  if (requests.length === 0) {
    return (
      <div className="p-5 text-center bg-zinc-950/70 rounded-2xl border border-zinc-800/80 space-y-1.5">
        <ArrowDownToLine className="w-7 h-7 text-zinc-600 mx-auto" />
        <p className="text-xs text-zinc-400 font-medium">No balance payout requests submitted yet.</p>
        <p className="text-[11px] text-zinc-500">
          When you have an available balance, you can request your funds here at any time.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending</span>
          </span>
        );
      case 'Paid':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Paid / Approved</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Rejected</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
          <span>Balance Payout Requests ({requests.length})</span>
        </h4>
      </div>

      <div className="space-y-2.5">
        {requests.map((req) => {
          const isPending = req.status === 'Pending';
          const isPaid = req.status === 'Paid';
          const isRejected = req.status === 'Rejected';

          return (
            <div
              key={req.id}
              className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors hover:border-zinc-700"
            >
              {/* Left Column: ID, Status, Date, Notes */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(req.status)}
                  <span className="text-[10px] font-mono text-zinc-500">#{req.id}</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {req.date} at {req.time}
                  </span>
                  {req.userNotes && (
                    <span className="text-zinc-300">
                      Your note: <span className="italic text-zinc-400">"{req.userNotes}"</span>
                    </span>
                  )}
                </div>

                {/* Status-specific Note/Action Date info */}
                {isPending && (
                  <p className="text-[11px] text-amber-300/90 font-medium">
                    Waiting for admin review & processing
                  </p>
                )}

                {isPaid && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-2 flex-wrap">
                    <span>
                      {req.adminNotes
                        ? req.adminNotes
                        : `Paid via ${req.payoutMethod || 'Cash/UPI'}`}
                    </span>
                    {req.processedAt && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        (Processed: {new Date(req.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                      </span>
                    )}
                  </div>
                )}

                {isRejected && (
                  <div className="text-[11px] text-rose-400 flex items-center gap-1.5 flex-wrap">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>
                      Reason: {req.adminNotes || 'Request could not be processed by admin'}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Amount & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                <div className="text-left md:text-right">
                  <span className="text-base font-black text-white block">
                    {settings.currencySymbol}
                    {req.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Requested Amount</span>
                </div>

                {isPending && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this balance request?')) {
                        userCancelBalanceRequest(req.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-500/30 transition-colors ml-2"
                    title="Cancel pending request"
                    id={`btn-cancel-req-${req.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
