import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Announcement,
  AnnouncementType,
  AnnouncementAudienceType,
  AnnouncementStatus,
  RequestType,
} from '../types';
import { processImageUpload, sanitizeInput } from '../lib/profileAndSupport';
import {
  Megaphone,
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Users,
  User,
  Layers,
  Send,
  Bell,
  Archive,
  Eye,
  Edit3,
  X,
  Search,
  AlertCircle,
  Sparkles,
  BarChart3,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Check,
} from 'lucide-react';

export const AdminAnnouncementsView: React.FC = () => {
  const {
    announcements,
    allUsers,
    allRequests,
    createAnnouncement,
    updateAnnouncementDraft,
    publishAnnouncementNow,
    scheduleAnnouncement,
    cancelScheduledAnnouncement,
    archiveAnnouncement,
    showToast,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<
    'all' | 'create' | 'published' | 'scheduled' | 'drafts' | 'archived'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Create / Edit Form State
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('General Update');
  const [imageUrl, setImageUrl] = useState('');
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>('everyone');
  const [selectedUserMobiles, setSelectedUserMobiles] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>('Product Purchase');
  const [sendPush, setSendPush] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [expiresDateTime, setExpiresDateTime] = useState('');
  const [userSearchText, setUserSearchText] = useState('');

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [inspectAnnouncement, setInspectAnnouncement] = useState<Announcement | null>(null);

  // Compute available actual services from database requests
  const availableServices = Array.from(
    new Set(allRequests.map((r) => r.requestType).filter(Boolean))
  ) as string[];

  // Helper to count recipients for selected service
  const getServiceUserCount = (serviceName: string) => {
    return new Set(
      allRequests
        .filter((r) => r.requestType === serviceName && r.userMobile)
        .map((r) => r.userMobile)
    ).size;
  };

  // Compute preview recipient count
  const computeRecipientCount = (): number => {
    if (audienceType === 'everyone') {
      return allUsers.length;
    }
    if (audienceType === 'selected_users' || audienceType === 'specific_user') {
      return selectedUserMobiles.length;
    }
    if (audienceType === 'service_users') {
      return getServiceUserCount(selectedService);
    }
    return 0;
  };

  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const dataUrl = await processImageUpload(file, {
        maxWidth: 1200,
        maxHeight: 600,
        maxSizeBytes: 2.5 * 1024 * 1024,
        quality: 0.85,
      });
      setImageUrl(dataUrl);
    } catch (err: any) {
      showToast(err.message || 'Failed to process image');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleResetForm = () => {
    setEditingDraftId(null);
    setTitle('');
    setMessage('');
    setType('General Update');
    setImageUrl('');
    setAudienceType('everyone');
    setSelectedUserMobiles([]);
    setSelectedService(availableServices[0] || 'Product Purchase');
    setSendPush(false);
    setScheduleDateTime('');
    setExpiresDateTime('');
    setShowPreviewModal(false);
  };

  // Load draft into form
  const handleEditDraft = (draft: Announcement) => {
    setEditingDraftId(draft.id);
    setTitle(draft.title);
    setMessage(draft.message);
    setType(draft.type);
    setImageUrl(draft.imageUrl || '');
    setAudienceType(draft.audienceType);
    setSelectedUserMobiles(draft.targetUserMobiles || []);
    setSelectedService(draft.targetService || availableServices[0] || 'Product Purchase');
    setSendPush(draft.sendPush);
    setScheduleDateTime(draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : '');
    setExpiresDateTime(draft.expiresAt ? draft.expiresAt.slice(0, 16) : '');
    setActiveSubTab('create');
  };

  // Submit Handler
  const handleSaveAnnouncement = async (targetStatus: AnnouncementStatus) => {
    if (!title.trim() || !message.trim()) {
      showToast('Please provide a title and message content.');
      return;
    }

    if (
      (audienceType === 'selected_users' || audienceType === 'specific_user') &&
      selectedUserMobiles.length === 0
    ) {
      showToast('Please select at least one customer.');
      return;
    }

    if (targetStatus === 'scheduled' && !scheduleDateTime) {
      showToast('Please select a scheduled date and time.');
      return;
    }

    // Map targeted user names
    const targetUserNames = selectedUserMobiles.map((mob) => {
      const u = allUsers.find((usr) => usr.mobileNumber === mob);
      return u ? u.fullName : mob;
    });

    try {
      if (editingDraftId) {
        await updateAnnouncementDraft(editingDraftId, {
          title: sanitizeInput(title, 120),
          message: sanitizeInput(message, 3000),
          type,
          imageUrl,
          audienceType,
          targetUserMobiles: selectedUserMobiles,
          targetUserNames,
          targetService: audienceType === 'service_users' ? selectedService : undefined,
          sendPush,
          status: targetStatus,
          scheduledAt: scheduleDateTime ? new Date(scheduleDateTime).toISOString() : '',
          expiresAt: expiresDateTime ? new Date(expiresDateTime).toISOString() : '',
          recipientCount: computeRecipientCount(),
          publishedAt: targetStatus === 'published' ? new Date().toISOString() : '',
        });
      } else {
        await createAnnouncement({
          title: sanitizeInput(title, 120),
          message: sanitizeInput(message, 3000),
          type,
          imageUrl,
          audienceType,
          targetUserMobiles: selectedUserMobiles,
          targetUserNames,
          targetService: audienceType === 'service_users' ? selectedService : undefined,
          sendPush,
          status: targetStatus,
          scheduledAt: scheduleDateTime ? new Date(scheduleDateTime).toISOString() : '',
          expiresAt: expiresDateTime ? new Date(expiresDateTime).toISOString() : '',
        });
      }

      handleResetForm();
      setActiveSubTab(
        targetStatus === 'published' ? 'published' : targetStatus === 'scheduled' ? 'scheduled' : 'drafts'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to save announcement.');
    }
  };

  // Toggle user selection
  const handleToggleUser = (mobileNumber: string) => {
    if (audienceType === 'specific_user') {
      setSelectedUserMobiles([mobileNumber]);
    } else {
      setSelectedUserMobiles((prev) =>
        prev.includes(mobileNumber) ? prev.filter((m) => m !== mobileNumber) : [...prev, mobileNumber]
      );
    }
  };

  // Metrics
  const totalCount = announcements.length;
  const publishedCount = announcements.filter((a) => a.status === 'published').length;
  const scheduledCount = announcements.filter((a) => a.status === 'scheduled').length;
  const draftCount = announcements.filter((a) => a.status === 'draft').length;
  const archivedCount = announcements.filter(
    (a) => a.status === 'archived' || a.status === 'expired'
  ).length;

  // Filter announcements
  const filteredAnnouncements = announcements.filter((ann) => {
    if (activeSubTab === 'published' && ann.status !== 'published') return false;
    if (activeSubTab === 'scheduled' && ann.status !== 'scheduled') return false;
    if (activeSubTab === 'drafts' && ann.status !== 'draft') return false;
    if (
      activeSubTab === 'archived' &&
      ann.status !== 'archived' &&
      ann.status !== 'expired'
    )
      return false;

    if (typeFilter !== 'All' && ann.type !== typeFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchMsg = ann.message.toLowerCase().includes(q);
      const matchId = ann.id.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchId) return false;
    }
    return true;
  });

  const getTypeBadge = (annType: AnnouncementType) => {
    switch (annType) {
      case 'General Update':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            General Update
          </span>
        );
      case 'Maintenance':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Maintenance
          </span>
        );
      case 'New Feature':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            New Feature
          </span>
        );
      case 'Event':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/15 text-pink-300 border border-pink-500/30">
            Event
          </span>
        );
      case 'Reward':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Reward
          </span>
        );
      case 'Important Notice':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Important Notice
          </span>
        );
      case 'Service Update':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            Service Update
          </span>
        );
    }
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Scheduled
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Draft
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Expired
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center gap-1">
            <Archive className="w-3 h-3" /> Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total</span>
          <span className="text-2xl font-black text-white block">{totalCount}</span>
          <span className="text-[10px] text-zinc-400">All records</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">Published</span>
          <span className="text-2xl font-black text-emerald-400 block">{publishedCount}</span>
          <span className="text-[10px] text-zinc-400">Live in user portals</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-blue-400 uppercase block">Scheduled</span>
          <span className="text-2xl font-black text-blue-400 block">{scheduledCount}</span>
          <span className="text-[10px] text-zinc-400">Future publication</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase block">Drafts</span>
          <span className="text-2xl font-black text-zinc-300 block">{draftCount}</span>
          <span className="text-[10px] text-zinc-400">Unpublished work</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-amber-500 uppercase block">Archived / Expired</span>
          <span className="text-2xl font-black text-amber-400 block">{archivedCount}</span>
          <span className="text-[10px] text-zinc-400">Historical records</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'all'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>All Announcements ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setActiveSubTab('create');
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'create'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{editingDraftId ? 'Edit Draft' : 'Create Announcement'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('published')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'published'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Published ({publishedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('scheduled')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'scheduled'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Scheduled ({scheduledCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('drafts')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'drafts'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Drafts ({draftCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('archived')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'archived'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Expired / Archived ({archivedCount})</span>
          </button>
        </div>

        {activeSubTab !== 'create' && (
          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setActiveSubTab('create');
            }}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-1.5 shadow transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {/* VIEW: CREATE / EDIT ANNOUNCEMENT */}
      {activeSubTab === 'create' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-rose-500" />
                  <span>{editingDraftId ? 'Edit Announcement Draft' : 'Create New Announcement'}</span>
                </h3>
                <p className="text-xs text-zinc-400 pt-0.5">
                  Compose broadcasts or targeted updates for DIGIZORT customers.
                </p>
              </div>

              {editingDraftId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Announcement Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 🚀 DIGIZORT Cash Tracker Update"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Announcement Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AnnouncementType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="General Update">General Update</option>
                    <option value="Maintenance">Scheduled Maintenance</option>
                    <option value="New Feature">New Feature</option>
                    <option value="Event">Event</option>
                    <option value="Reward">Reward / Cashback</option>
                    <option value="Important Notice">Important Notice</option>
                    <option value="Service Update">Service Update</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-300">
                    Announcement Message Content *
                  </label>
                  <span className="text-[10px] text-zinc-500">{message.length}/3000</span>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder="Compose your announcement message... Line breaks and paragraphs are preserved. Keep instructions clear and helpful."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={3000}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 leading-relaxed font-sans"
                />
              </div>

              {/* Optional Image Banner */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300">
                  Optional Image Banner
                </label>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-800 max-h-48 group">
                    <img src={imageUrl} alt="Banner" className="w-full h-48 object-cover bg-zinc-950" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full py-4 bg-zinc-950 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl text-zinc-400 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <ImageIcon className="w-4 h-4 text-rose-500" />
                    <span>{isUploadingImage ? 'Processing Image...' : 'Upload Announcement Banner (JPG, PNG, WEBP)'}</span>
                  </button>
                )}
              </div>

              {/* Audience Selection */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Audience Selection</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceType('everyone')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      audienceType === 'everyone'
                        ? 'bg-rose-600/20 border-rose-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Users className="w-4 h-4 text-rose-400" />
                      {audienceType === 'everyone' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    <span>Everyone</span>
                    <span className="block text-[10px] text-zinc-500 font-normal">All active users ({allUsers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('selected_users')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      audienceType === 'selected_users'
                        ? 'bg-rose-600/20 border-rose-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Users className="w-4 h-4 text-blue-400" />
                      {audienceType === 'selected_users' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <span>Selected Users</span>
                    <span className="block text-[10px] text-zinc-500 font-normal">Multi-user target</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('specific_user')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      audienceType === 'specific_user'
                        ? 'bg-rose-600/20 border-rose-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <User className="w-4 h-4 text-emerald-400" />
                      {audienceType === 'specific_user' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span>Specific User</span>
                    <span className="block text-[10px] text-zinc-500 font-normal">Single customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('service_users')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      audienceType === 'service_users'
                        ? 'bg-rose-600/20 border-rose-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Layers className="w-4 h-4 text-amber-400" />
                      {audienceType === 'service_users' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span>By Service</span>
                    <span className="block text-[10px] text-zinc-500 font-normal">Real request category</span>
                  </button>
                </div>

                {/* Sub-selector: Specific/Selected Users */}
                {(audienceType === 'selected_users' || audienceType === 'specific_user') && (
                  <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-bold">
                        {audienceType === 'specific_user'
                          ? 'Select Target Customer:'
                          : `Selected Customers (${selectedUserMobiles.length}):`}
                      </span>
                      {selectedUserMobiles.length > 0 && audienceType === 'selected_users' && (
                        <button
                          type="button"
                          onClick={() => setSelectedUserMobiles([])}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search customers by name or mobile..."
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {allUsers
                        .filter((u) => {
                          if (!userSearchText) return true;
                          const q = userSearchText.toLowerCase();
                          return (
                            u.fullName.toLowerCase().includes(q) ||
                            u.mobileNumber.includes(q) ||
                            (u.nickname && u.nickname.toLowerCase().includes(q))
                          );
                        })
                        .map((u) => {
                          const isSelected = selectedUserMobiles.includes(u.mobileNumber);
                          return (
                            <div
                              key={u.mobileNumber}
                              onClick={() => handleToggleUser(u.mobileNumber)}
                              className={`p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-rose-500/20 border border-rose-500/40 text-white'
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-[10px]">
                                  {u.fullName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-white block leading-tight">{u.fullName}</span>
                                  <span className="text-[10px] text-zinc-400 font-mono">{u.mobileNumber}</span>
                                </div>
                              </div>
                              <input
                                type={audienceType === 'specific_user' ? 'radio' : 'checkbox'}
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-rose-500 w-3.5 h-3.5"
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Sub-selector: Service Category */}
                {audienceType === 'service_users' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <label className="block text-xs font-bold text-zinc-300">
                      Target Service Category (from real request records):
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      {availableServices.map((svc) => (
                        <option key={svc} value={svc}>
                          {svc} — ({getServiceUserCount(svc)} active customers with orders)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-zinc-500">
                      Delivered strictly to customers who have actual service requests under "{selectedService}".
                    </p>
                  </div>
                )}

                {/* Audience Summary Banner */}
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                  <span>Targeted Audience:</span>
                  <span className="font-extrabold text-white">
                    {audienceType === 'everyone' && `All Users (${allUsers.length} recipients)`}
                    {audienceType === 'selected_users' && `${selectedUserMobiles.length} selected recipients`}
                    {audienceType === 'specific_user' && (selectedUserMobiles.length ? `1 recipient (${selectedUserMobiles[0]})` : 'None selected')}
                    {audienceType === 'service_users' && `${getServiceUserCount(selectedService)} recipients with ${selectedService} requests`}
                  </span>
                </div>
              </div>

              {/* Delivery & Scheduling Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Push Notification Toggle */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Send Push Notification</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 block pt-0.5">
                      Sends immediate browser notification on publication
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendPush}
                    onChange={(e) => setSendPush(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />
                </div>

                {/* Schedule Picker */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Schedule for Later (Optional)</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Expiration Picker */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" />
                    <span>Auto-Expire Date (Optional)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={expiresDateTime}
                      onChange={(e) => setExpiresDateTime(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    {expiresDateTime && (
                      <button
                        type="button"
                        onClick={() => setExpiresDateTime('')}
                        className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                disabled={!title.trim() || !message.trim()}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Preview Before Publishing</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveAnnouncement('draft')}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
                >
                  Save Draft
                </button>

                {scheduleDateTime ? (
                  <button
                    type="button"
                    onClick={() => handleSaveAnnouncement('scheduled')}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow flex items-center gap-1.5 transition-all"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Schedule Announcement</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveAnnouncement('published')}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-rose-950/40 flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Publish Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ANNOUNCEMENT LIST / HISTORY */}
      {activeSubTab !== 'create' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search announcements by title, content, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
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

          {filteredAnnouncements.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-2">
              <Megaphone className="w-12 h-12 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300">No announcements found</h4>
              <p className="text-xs text-zinc-500">
                {activeSubTab === 'published'
                  ? 'No published announcements.'
                  : activeSubTab === 'scheduled'
                  ? 'No scheduled announcements queued.'
                  : activeSubTab === 'drafts'
                  ? 'No drafts saved.'
                  : 'Click "New Announcement" above to create an announcement.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredAnnouncements.map((ann) => {
                const readCount = ann.readByUserMobiles?.length || 0;
                const recipientCount = ann.recipientCount || 1;
                const readPercent = Math.min(100, Math.round((readCount / recipientCount) * 100));

                return (
                  <div
                    key={ann.id}
                    className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Content */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-zinc-400 font-extrabold text-xs">#{ann.id}</span>
                          {getTypeBadge(ann.type)}
                          {getStatusBadge(ann.status)}
                          {ann.sendPush && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Bell className="w-3 h-3" /> Push Enabled
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-extrabold text-white pt-1">{ann.title}</h4>
                        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed whitespace-pre-line">
                          {ann.message}
                        </p>

                        {/* Audience Info */}
                        <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Audience: </span>
                            <strong className="text-white">
                              {ann.audienceType === 'everyone' && 'All Users'}
                              {ann.audienceType === 'selected_users' && `Selected (${ann.recipientCount} users)`}
                              {ann.audienceType === 'specific_user' && 'Single User'}
                              {ann.audienceType === 'service_users' && `Service: ${ann.targetService}`}
                            </strong>
                          </div>

                          {ann.publishedAt && (
                            <>
                              <span>•</span>
                              <span>Published: {new Date(ann.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}

                          {ann.scheduledAt && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">Scheduled: {new Date(ann.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}

                          {ann.expiresAt && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">Expires: {new Date(ann.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setInspectAnnouncement(ann)}
                          className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>View</span>
                        </button>

                        {ann.status === 'draft' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditDraft(ann)}
                              className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => publishAnnouncementNow(ann.id)}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow"
                            >
                              <span>Publish Now</span>
                            </button>
                          </>
                        )}

                        {ann.status === 'scheduled' && (
                          <>
                            <button
                              type="button"
                              onClick={() => cancelScheduledAnnouncement(ann.id)}
                              className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Unschedule</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => publishAnnouncementNow(ann.id)}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow"
                            >
                              <span>Publish Now</span>
                            </button>
                          </>
                        )}

                        {ann.status === 'published' && (
                          <button
                            type="button"
                            onClick={() => archiveAnnouncement(ann.id)}
                            className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Read Statistics (only for published items) */}
                    {ann.status === 'published' && (
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-4 text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Read Statistics:</span>
                          </div>
                          <span>Recipients: <strong className="text-white">{recipientCount}</strong></span>
                          <span>Read: <strong className="text-emerald-400">{readCount}</strong></span>
                          <span>Unread: <strong className="text-zinc-400">{Math.max(0, recipientCount - readCount)}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-28 bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${readPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-zinc-400">{readPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PREVIEW BEFORE PUBLISHING MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-extrabold text-white">Announcement Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Customer Card */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Banner"
                  className="w-full h-44 rounded-xl object-cover border border-zinc-800"
                />
              )}
              <div className="flex items-center gap-2">
                {getTypeBadge(type)}
                <span className="text-[10px] text-zinc-500">Just now</span>
              </div>
              <h4 className="text-base font-extrabold text-white">{title || 'Untitled Announcement'}</h4>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {message || 'No message provided.'}
              </p>
            </div>

            {/* Delivery Details */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Target Audience:</span>
                <span className="font-bold text-white capitalize">{audienceType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Recipients:</span>
                <span className="font-bold text-emerald-400">{computeRecipientCount()} users</span>
              </div>
              {sendPush && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Push Notification:</span>
                  <span className="font-bold text-amber-400">Yes (enabled)</span>
                </div>
              )}
              {scheduleDateTime && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Scheduled Date:</span>
                  <span className="font-bold text-blue-400">{new Date(scheduleDateTime).toLocaleString('en-IN')}</span>
                </div>
              )}
              {expiresDateTime && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Expiration Date:</span>
                  <span className="font-bold text-rose-400">{new Date(expiresDateTime).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="py-2 px-4 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveAnnouncement('draft')}
                className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"
              >
                Save Draft
              </button>

              {scheduleDateTime ? (
                <button
                  type="button"
                  onClick={() => handleSaveAnnouncement('scheduled')}
                  className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow"
                >
                  Schedule
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveAnnouncement('published')}
                  className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow"
                >
                  Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT ANNOUNCEMENT MODAL */}
      {inspectAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-400 text-xs">#{inspectAnnouncement.id}</span>
                  {getTypeBadge(inspectAnnouncement.type)}
                  {getStatusBadge(inspectAnnouncement.status)}
                </div>
                <h3 className="text-base font-extrabold text-white pt-1">{inspectAnnouncement.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectAnnouncement(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectAnnouncement.imageUrl && (
              <img
                src={inspectAnnouncement.imageUrl}
                alt="Banner"
                className="w-full max-h-56 object-cover rounded-2xl border border-zinc-800"
              />
            )}

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {inspectAnnouncement.message}
            </div>

            {/* Read Stats */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              <span className="font-bold text-zinc-300 block">Performance &amp; Delivery Stats:</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-zinc-900">
                  <span className="text-[10px] text-zinc-500 block">Targeted</span>
                  <span className="text-sm font-black text-white">{inspectAnnouncement.recipientCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900">
                  <span className="text-[10px] text-zinc-500 block">Read</span>
                  <span className="text-sm font-black text-emerald-400">{inspectAnnouncement.readByUserMobiles?.length || 0}</span>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900">
                  <span className="text-[10px] text-zinc-500 block">Unread</span>
                  <span className="text-sm font-black text-zinc-400">
                    {Math.max(0, inspectAnnouncement.recipientCount - (inspectAnnouncement.readByUserMobiles?.length || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectAnnouncement(null)}
                className="py-2 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
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
