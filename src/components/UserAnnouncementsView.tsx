import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Announcement, AnnouncementType } from '../types';
import {
  Megaphone,
  CheckCircle2,
  Calendar,
  X,
  Search,
  Filter,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Clock,
  ArrowRight,
  Inbox,
  Bell,
} from 'lucide-react';

export const UserAnnouncementsView: React.FC = () => {
  const {
    currentUser,
    userAnnouncements,
    unreadAnnouncementsCount,
    markAnnouncementAsRead,
    markAllAnnouncementsAsRead,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterReadStatus, setFilterReadStatus] = useState<'All' | 'Unread' | 'Read'>('All');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  if (!currentUser) return null;

  // Filter announcements
  const filteredAnnouncements = userAnnouncements.filter((ann) => {
    const isRead = ann.readByUserMobiles?.includes(currentUser.mobileNumber);
    if (filterReadStatus === 'Unread' && isRead) return false;
    if (filterReadStatus === 'Read' && !isRead) return false;

    if (filterType !== 'All' && ann.type !== filterType) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchMsg = ann.message.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }
    return true;
  });

  const handleOpenAnnouncement = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    // Mark as read if not already read
    if (!ann.readByUserMobiles?.includes(currentUser.mobileNumber)) {
      markAnnouncementAsRead(ann.id);
    }
  };

  const getTypeBadge = (annType: AnnouncementType) => {
    switch (annType) {
      case 'General Update':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            General Update
          </span>
        );
      case 'Maintenance':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Maintenance
          </span>
        );
      case 'New Feature':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            New Feature
          </span>
        );
      case 'Event':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/15 text-pink-300 border border-pink-500/30">
            Event
          </span>
        );
      case 'Reward':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Reward
          </span>
        );
      case 'Important Notice':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Important Notice
          </span>
        );
      case 'Service Update':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            Service Update
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/90 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white shadow-xl shadow-rose-950/40">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#E53935] uppercase tracking-widest block">
                  DIGIZORT BROADCASTS
                </span>
                {unreadAnnouncementsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                    {unreadAnnouncementsCount} unread
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Official Announcements
              </h2>
            </div>
          </div>

          {unreadAnnouncementsCount > 0 && (
            <button
              type="button"
              onClick={markAllAnnouncementsAsRead}
              className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl pt-2">
          Stay informed about official system updates, scheduled maintenance windows, feature releases, and exclusive customer rewards.
        </p>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterReadStatus}
            onChange={(e) => setFilterReadStatus(e.target.value as any)}
            className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
          >
            <option value="All">All Read &amp; Unread</option>
            <option value="Unread">Unread Only</option>
            <option value="Read">Read Only</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#E53935]"
          >
            <option value="All">All Categories</option>
            <option value="General Update">General Update</option>
            <option value="Maintenance">Maintenance</option>
            <option value="New Feature">New Feature</option>
            <option value="Event">Event</option>
            <option value="Reward">Reward</option>
            <option value="Important Notice">Important Notice</option>
            <option value="Service Update">Service Update</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-2">
          <Inbox className="w-12 h-12 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-300">No announcements found</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery || filterType !== 'All' || filterReadStatus !== 'All'
              ? 'Try clearing your filters or search terms.'
              : 'You are all caught up! New broadcasts and updates will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((ann) => {
            const isRead = ann.readByUserMobiles?.includes(currentUser.mobileNumber);
            const dateStr = ann.publishedAt
              ? new Date(ann.publishedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently';

            return (
              <div
                key={ann.id}
                onClick={() => handleOpenAnnouncement(ann)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-3.5 relative overflow-hidden group flex flex-col justify-between ${
                  !isRead
                    ? 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/20 border-rose-500/40 hover:border-rose-500/70 shadow-lg'
                    : 'bg-zinc-900/80 border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                {/* Optional Top Image */}
                {ann.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden max-h-40 border border-zinc-800/80">
                    <img
                      src={ann.imageUrl}
                      alt={ann.title}
                      className="w-full h-36 object-cover bg-zinc-950 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(ann.type)}
                      {!isRead ? (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          Unread
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                          <CheckCircle2 className="w-3 h-3 text-zinc-600" />
                          Read
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-white group-hover:text-rose-400 transition-colors leading-snug">
                    {ann.title}
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {ann.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-rose-400 font-bold">
                  <span>Read Announcement</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL ANNOUNCEMENT MODAL */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {getTypeBadge(selectedAnnouncement.type)}
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {selectedAnnouncement.publishedAt
                      ? new Date(selectedAnnouncement.publishedAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Official Announcement'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {selectedAnnouncement.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {selectedAnnouncement.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-zinc-800">
                  <img
                    src={selectedAnnouncement.imageUrl}
                    alt={selectedAnnouncement.title}
                    className="w-full max-h-72 object-cover bg-zinc-950"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedAnnouncement.message}
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-rose-500" />
                  <span>Published by <strong>DIGIZORT Team</strong></span>
                </div>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Broadcast
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="py-2.5 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
