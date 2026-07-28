import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, Award, Clock, DollarSign, Tag, Users, Zap } from 'lucide-react';

export const StatisticsView: React.FC = () => {
  const { transactions, friendsList, settings } = useApp();

  const stats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        avgPending: 0,
        avgTransaction: 0,
        largestPending: null as any,
        mostFrequentFriend: 'None',
        mostUsedCategory: 'None',
      };
    }

    const pendingList = transactions.filter((t) => t.status === 'Pending');
    const totalPendingAmount = pendingList.reduce((acc, t) => acc + t.amount, 0);
    const totalAllAmount = transactions.reduce((acc, t) => acc + t.amount, 0);

    const avgPending = pendingList.length > 0 ? totalPendingAmount / pendingList.length : 0;
    const avgTransaction = totalAllAmount / transactions.length;

    const sortedPending = [...pendingList].sort((a, b) => b.amount - a.amount);
    const largestPending = sortedPending[0] || null;

    // Friend counts
    const friendCounts = new Map<string, number>();
    transactions.forEach((t) => {
      friendCounts.set(t.friendName, (friendCounts.get(t.friendName) || 0) + 1);
    });
    let topFriend = 'None';
    let maxFriendCount = 0;
    friendCounts.forEach((count, name) => {
      if (count > maxFriendCount) {
        maxFriendCount = count;
        topFriend = name;
      }
    });

    // Category counts
    const catCounts = new Map<string, number>();
    transactions.forEach((t) => {
      catCounts.set(t.category, (catCounts.get(t.category) || 0) + 1);
    });
    let topCategory = 'None';
    let maxCatCount = 0;
    catCounts.forEach((count, cat) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = cat;
      }
    });

    return {
      avgPending,
      avgTransaction,
      largestPending,
      mostFrequentFriend: topFriend,
      mostUsedCategory: topCategory,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#E53935]" />
          Key Cash Flow Insights &amp; Statistics
        </h2>
        <p className="text-xs text-zinc-400">
          Automated metrics and historical averages calculated across all records
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="p-16 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-3">
          <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No statistics available yet.</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Add transactions to view automated cash flow insights and statistics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Average Pending</span>
            <div className="p-2 rounded-xl bg-[#E53935]/15 text-[#E53935]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {formatCurrency(stats.avgPending, settings.currency)}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Average per pending request</p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Average Transaction</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {formatCurrency(stats.avgTransaction, settings.currency)}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Overall mean ticket size</p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Largest Single Pending</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-400">
            {stats.largestPending
              ? formatCurrency(stats.largestPending.amount, settings.currency)
              : 'None'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 truncate">
            {stats.largestPending
              ? `${stats.largestPending.friendName} (${stats.largestPending.purpose})`
              : 'No pending items'}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Most Frequent Friend</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-white">{stats.mostFrequentFriend}</h3>
          <p className="text-xs text-zinc-500 mt-1">Highest transaction count</p>
        </div>

        {/* Metric 5 */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Most Used Category</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-white">{stats.mostUsedCategory}</h3>
          <p className="text-xs text-zinc-500 mt-1">Top spending category</p>
        </div>
      </div>
      )}
    </div>
  );
};
