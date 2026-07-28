import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateAvatarSvg, formatCurrency } from '../lib/utils';
import { Users, Phone, ArrowRight, Plus, Search, MessageSquare } from 'lucide-react';

export const FriendsView: React.FC = () => {
  const {
    friendsList,
    setSelectedFriendName,
    setIsAddModalOpen,
    setWhatsAppTx,
    setIsWhatsAppModalOpen,
    transactions,
    settings,
  } = useApp();

  const [search, setSearch] = useState('');

  const filteredFriends = friendsList.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.phone && f.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E53935]" />
            Friends &amp; Borrowers ({friendsList.length})
          </h2>
          <p className="text-xs text-zinc-400">
            View total balances, contact info, and transaction history per friend
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-[#E53935] to-[#B71C1C] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E53935]/20 hover:brightness-110 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          id="add-friend-entry-btn"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Filter friends by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
          id="friends-search-input"
        />
      </div>

      {/* Friends Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFriends.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 mb-1">
              {friendsList.length === 0 ? 'No friends added yet.' : 'No friends match your filter.'}
            </h4>
            <p className="text-xs text-zinc-500">
              When you add transactions for friends, they will automatically appear here.
            </p>
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => setSelectedFriendName(friend.name)}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-[#E53935]/40 transition-all cursor-pointer group hover:-translate-y-1 relative"
            >
              <div className="flex items-center gap-3.5 mb-4">
                <img
                  src={generateAvatarSvg(friend.name)}
                  alt={friend.name}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-white truncate group-hover:text-[#E53935] transition-colors">
                    {friend.name}
                  </h3>
                  {friend.phone ? (
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {friend.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-500 mt-0.5">No phone saved</p>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Pending</span>
                  <span
                    className={`font-extrabold ${
                      friend.totalPending > 0 ? 'text-[#E53935]' : 'text-emerald-400'
                    }`}
                  >
                    {formatCurrency(friend.totalPending, settings.currency)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Entries</span>
                  <span className="font-bold text-zinc-200">
                    {friend.transactionCount} items
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
