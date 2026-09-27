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
  RotateCcw,
  Edit3,
  Ban,
  AlertCircle,
} from 'lucide-react';

interface BalanceLedgerViewProps {
  transactions: BalanceTransaction[];
  title?: string;
  emptyText?: string;
  isAdmin?: boolean;
  onReverseTransaction?: (tx: BalanceTransaction) => void;
  onEditTransaction?: (tx: BalanceTransaction) => void;
  onCancelTransaction?: (tx: BalanceTransaction) => void;
}

export const BalanceLedgerView: React.FC<BalanceLedgerViewProps> = ({
  transactions,
  title = 'Balance & Credit Audit Ledger',
  emptyText = 'No balance transactions recorded yet.',
  isAdmin = false,
  onReverseTransaction,
  onEditTransaction,
  onCancelTransaction,
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
      case 'Balance Reversal':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Balance Reversal</span>
          </span>
        );
      case 'Balance Correction':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Balance Correction</span>
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

  const getStatusBadge = (status?: string, type?: string, newIntendedAmount?: number) => {
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
      case 'Reversed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reversed</span>
          </span>
        );
      case 'Corrected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-950/80 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Edit3 className="w-2.5 h-2.5" />
            <span>Corrected{newIntendedAmount !== undefined ? ` to ₹${newIntendedAmount.toLocaleString('en-IN')}` : ''}</span>
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
          const isCredit = tx.type === 'Balance Added' || (tx.type === 'Balance Correction' && tx.remainingBalance > tx.previousBalance);
          const isDebit =
            tx.type === 'Balance Returned' ||
            tx.type === 'Balance Paid' ||
            tx.type === 'Balance Used' ||
            tx.type === 'Balance Reversal' ||
            (tx.type === 'Balance Correction' && tx.remainingBalance < tx.previousBalance);
          const isRequested = tx.type === 'Money Requested';
          const isCleared = tx.remainingBalance === 0 && !isRequested;

          // Check if this is an Admin-created credit eligible for management
          const isAdminGrant =
            tx.actor === 'ADMIN' &&
            (tx.type === 'Balance Added' || tx.type === 'Balance Adjustment');
          const isReversible =
            isAdmin &&
            isAdminGrant &&
            tx.status !== 'Cancelled' &&
            tx.status !== 'Reversed';

          return (
            <div
              key={tx.id}
              className={`p-3.5 rounded-2xl bg-zinc-950 border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                tx.status === 'Cancelled' || tx.status === 'Reversed'
                  ? 'border-zinc-850 opacity-80 bg-zinc-950/50'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Left Column: Type, Status, Date, ID, Notes, Audit trails */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(tx.type)}
                  {getStatusBadge(tx.status, tx.type, tx.newIntendedAmount)}

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
                  {tx.relatedTransactionId && (
                    <span className="text-zinc-400 font-mono text-[10px]">
                      Ref: <span className="text-zinc-300">#{tx.relatedTransactionId}</span>
                    </span>
                  )}
                </div>

                {tx.notes && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Note: "{tx.notes}"
                  </p>
                )}

                {/* Audit metadata details */}
                {tx.cancelledAt && (
                  <p className="text-[10px] text-rose-400 font-medium">
                    Cancelled by {tx.cancelledBy || 'ADMIN'} on{' '}
                    {new Date(tx.cancelledAt).toLocaleDateString('en-IN')}: "{tx.cancelReason || 'Cancelled'}"
                  </p>
                )}
                {tx.reversedAt && (
                  <p className="text-[10px] text-amber-400 font-medium">
                    Reversed by {tx.reversedBy || 'ADMIN'} on{' '}
                    {new Date(tx.reversedAt).toLocaleDateString('en-IN')}: "{tx.reversalReason || 'Reversed'}"
                  </p>
                )}
                {tx.correctedAt && (
                  <p className="text-[10px] text-blue-400 font-medium">
                    Corrected by {tx.correctedBy || 'ADMIN'} on{' '}
                    {new Date(tx.correctedAt).toLocaleDateString('en-IN')}: "{tx.correctionReason || 'Corrected'}"
                  </p>
                )}
              </div>

              {/* Right Column: Amount & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                <div className="text-left md:text-right">
                  <span
                    className={`text-sm font-extrabold block ${
                      tx.status === 'Cancelled'
                        ? 'text-zinc-500 line-through'
                        : isCredit
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

                {/* Admin Management Actions for Admin-created credits */}
                {isReversible && (
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 flex-wrap">
                    {onEditTransaction && (
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="py-1 px-2 bg-blue-500/15 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[10px] font-bold border border-blue-500/30 flex items-center gap-1 transition-all"
                        title="Edit / Correct intended credit amount"
                        id={`btn-edit-credit-${tx.id}`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}

                    {onReverseTransaction && (
                      <button
                        type="button"
                        onClick={() => onReverseTransaction(tx)}
                        className="py-1 px-2 bg-amber-500/15 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 transition-all"
                        title="Reverse balance credit"
                        id={`btn-reverse-credit-${tx.id}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reverse</span>
                      </button>
                    )}

                    {onCancelTransaction && (
                      <button
                        type="button"
                        onClick={() => onCancelTransaction(tx)}
                        className="py-1 px-2 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 transition-all"
                        title="Cancel this balance credit"
                        id={`btn-cancel-credit-${tx.id}`}
                      >
                        <Ban className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
