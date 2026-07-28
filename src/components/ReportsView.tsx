import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Users } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { transactions, friendsList, settings } = useApp();

  // Category Pie Data
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((tx) => {
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
    });

    const colors = [
      '#E53935',
      '#3B82F6',
      '#10B981',
      '#8B5CF6',
      '#F59E0B',
      '#EC4899',
      '#6366F1',
      '#14B8A6',
    ];

    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [transactions]);

  // Pending vs Collected Pie Data
  const statusData = useMemo(() => {
    const pending = transactions
      .filter((t) => t.status === 'Pending')
      .reduce((a, b) => a + b.amount, 0);
    const paid = transactions
      .filter((t) => t.status === 'Paid')
      .reduce((a, b) => a + b.amount, 0);

    return [
      { name: 'Pending', value: pending, color: '#E53935' },
      { name: 'Collected', value: paid, color: '#10B981' },
    ];
  }, [transactions]);

  // Top Friends Owed Bar Data
  const topFriendsData = useMemo(() => {
    return friendsList
      .slice(0, 5)
      .map((f) => ({
        name: f.name.split(' ')[0],
        pending: f.totalPending,
        paid: f.totalPaid,
      }));
  }, [friendsList]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#E53935]" />
            Financial Analytics &amp; Reports
          </h2>
          <p className="text-xs text-zinc-400">
            Visual breakdown of cash flow, category distribution, and borrower insights
          </p>
        </div>
      </div>

      {/* Chart Grid */}
      {transactions.length === 0 ? (
        <div className="p-16 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-3">
          <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No data available yet.</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Add transactions to view reports and financial analytics charts in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Status Distribution */}
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Pending vs. Collected Amount
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val), settings.currency), 'Amount']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }}
                  verticalAlign="bottom"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Friends Bar Chart */}
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E53935]" />
              Top Friends by Pending Balance
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFriendsData}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val), settings.currency), 'Pending']}
                />
                <Bar dataKey="pending" fill="#E53935" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Category Breakdown */}
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Category Share Breakdown
            </h3>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cat-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val), settings.currency), 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
