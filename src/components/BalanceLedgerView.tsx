import React from 'react';
import { BalanceTransaction } from '../types';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Receipt,
  User,
} from 'lucide-react';

interface BalanceLedgerViewProps {
  transactions: BalanceTransaction[];
  title?: string;
  emptyText?: string;
}

export const BalanceLedgerView: React.FC<BalanceLedgerViewProps> = ({
  transactions,
  title = 'Balance & Credit Audit Ledger',
  emptyText = 'No balance transactions recorded yet.',
}) => {
  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center bg-zinc-950/70 rounded-2xl border border-zinc-800/80 space-y-2">
        <Receipt className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="text-xs text-zinc-400 font-medium">{emptyText}</p>
        <p className="text-[11px] text-zinc-500">
          Any overpayments, returns, or balance deductions will be permanently recorded here with full audit trails.
        </p>
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Balance Added':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-amber-400" />
            <span>Balance Added</span>
          </span>
        );
      case 'Balance Returned':
      case 'Balance Paid':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
            <span>{type === 'Balance Paid' ? 'Balance Paid' : 'Balance Returned'}</span>
          </span>
        );
      case 'Balance Used':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <Receipt className="w-3 h-3 text-blue-400" />
            <span>Balance Used</span>
          </span>
        );
      case 'Money Requested':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Money Requested</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status?: string, type?: string) => {
    const effectiveStatus = status || (type === 'Money Requested' ? 'Pending' : 'Completed');
    switch (effectiveStatus) {
      case 'Completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse">
            Pending
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-500/30">
            Rejected
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>
            {title} ({transactions.length})
          </span>
        </h4>
      </div>

      <div className="space-y-2.5">
        {transactions.map((tx) => {
          const isCredit = tx.type === 'Balance Added';
          const isDebit = tx.type === 'Balance Returned' || tx.type === 'Balance Paid' || tx.type === 'Balance Used';
          const isRequested = tx.type === 'Money Requested';
          const isCleared = tx.remainingBalance === 0 && !isRequested;

          return (
            <div
              key={tx.id}
              className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors hover:border-zinc-700"
            >
              {/* Left Column: Type, Status, Date, ID, Notes */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(tx.type)}
                  {getStatusBadge(tx.status, tx.type)}

                  {isCleared && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Balance Cleared</span>
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-zinc-500">#{tx.id}</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {tx.date} at {tx.time}
                  </span>
                  {tx.relatedRequestId && (
                    <span className="text-zinc-300 font-medium">
                      Order: <span className="text-white font-bold">#{tx.relatedRequestId}</span>
                      {tx.relatedRequestTitle ? ` (${tx.relatedRequestTitle})` : ''}
                    </span>
                  )}
                  {tx.relatedBalanceRequestId && (
                    <span className="text-zinc-300 font-medium">
                      Payout Req: <span className="text-white font-bold">#{tx.relatedBalanceRequestId}</span>
                    </span>
                  )}
                </div>

                {tx.notes && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Note: "{tx.notes}"
                  </p>
                )}
              </div>

              {/* Right Column: Amount & Balance Progression */}
              <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                <div className="text-left md:text-right">
                  <span
                    className={`text-sm font-extrabold block ${
                      isCredit
                        ? 'text-amber-400'
                        : isDebit
                        ? 'text-emerald-400'
                        : isRequested
                        ? 'text-purple-400'
                        : 'text-white'
                    }`}
                  >
                    {isCredit ? '+' : isDebit ? '-' : ''}₹{tx.amount.toLocaleString('en-IN')}
                  </span>

                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {isRequested ? (
                      <span>
                        Balance: <span className="text-white font-bold">₹{tx.previousBalance.toLocaleString('en-IN')}</span> (Held: ₹{tx.amount.toLocaleString('en-IN')})
                      </span>
                    ) : (
                      <span>
                        Balance After:{' '}
                        <span
                          className={
                            tx.remainingBalance === 0
                              ? 'text-emerald-400 font-bold'
                              : 'text-white font-bold'
                          }
                        >
                          ₹{tx.remainingBalance.toLocaleString('en-IN')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
