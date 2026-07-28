import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

export const TrashView: React.FC = () => {
  const {
    deletedTransactions,
    restoreTransaction,
    permanentlyDeleteTransaction,
    emptyTrash,
    settings,
  } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            Trash Bin ({deletedTransactions.length})
          </h2>
          <p className="text-xs text-zinc-400">
            Deleted items remain here until permanently cleared or restored
          </p>
        </div>

        {deletedTransactions.length > 0 && (
          <button
            onClick={emptyTrash}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            id="empty-trash-btn"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Empty Trash Completely
          </button>
        )}
      </div>

      {deletedTransactions.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
          <Trash2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-zinc-300 mb-1">Trash is Empty</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Any deleted entries will show up here so you can easily restore them if needed.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deletedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-bold text-white">{tx.friendName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{tx.purpose} • {tx.category}</p>
                <span className="text-[10px] text-zinc-500">
                  Deleted on {tx.deletedAt ? new Date(tx.deletedAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">
                  {formatCurrency(tx.amount, settings.currency)}
                </span>

                <button
                  onClick={() => restoreTransaction(tx.id)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Restore"
                  id={`restore-btn-${tx.id}`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  Restore
                </button>

                <button
                  onClick={() => permanentlyDeleteTransaction(tx.id)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                  title="Delete Forever"
                  id={`perm-delete-btn-${tx.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
