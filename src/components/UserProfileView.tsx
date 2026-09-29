import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useProactiveAI } from '../context/ProactiveAIContext';
import { processImageUpload, sanitizeInput } from '../lib/profileAndSupport';
import {
  User,
  Camera,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Globe,
  Bell,
  MessageSquare,
  Lock,
  Edit3,
  X,
  AlertCircle,
  Sparkles,
  Bot,
} from 'lucide-react';

export const UserProfileView: React.FC = () => {
  const { currentUser, updateUserProfile, showToast } = useApp();
  const { userProactiveEnabled, setUserProactiveEnabled } = useProactiveAI();

  const [activeSubTab, setActiveSubTab] = useState<'view' | 'edit' | 'security'>('view');

  // Edit form state
  const [photoPreview, setPhotoPreview] = useState<string>(currentUser?.profilePhoto || '');
  const [nickname, setNickname] = useState<string>(currentUser?.nickname || '');
  const [bio, setBio] = useState<string>(currentUser?.bio || '');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [address, setAddress] = useState<string>(currentUser?.address || '');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(currentUser?.preferredLanguage || 'English');
  const [notifPush, setNotifPush] = useState<boolean>(currentUser?.notificationPreferences?.push ?? true);
  const [notifWhatsApp, setNotifWhatsApp] = useState<boolean>(currentUser?.notificationPreferences?.whatsapp ?? true);
  const [notifEmail, setNotifEmail] = useState<boolean>(currentUser?.notificationPreferences?.email ?? true);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);
      const base64Data = await processImageUpload(file, {
        maxWidth: 320,
        maxHeight: 320,
        maxSizeBytes: 2.5 * 1024 * 1024,
        quality: 0.85,
      });
      setPhotoPreview(base64Data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const sanitizedNickname = sanitizeInput(nickname, 50);
      const sanitizedBio = sanitizeInput(bio, 180);
      const sanitizedEmail = sanitizeInput(email, 100);
      const sanitizedAddress = sanitizeInput(address, 200);

      await updateUserProfile({
        nickname: sanitizedNickname,
        bio: sanitizedBio,
        email: sanitizedEmail,
        address: sanitizedAddress,
        profilePhoto: photoPreview,
        preferredLanguage,
        notificationPreferences: {
          push: notifPush,
          whatsapp: notifWhatsApp,
          email: notifEmail,
        },
      });

      setActiveSubTab('view');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setPhotoPreview(currentUser.profilePhoto || '');
    setNickname(currentUser.nickname || '');
    setBio(currentUser.bio || '');
    setEmail(currentUser.email || '');
    setAddress(currentUser.address || '');
    setPreferredLanguage(currentUser.preferredLanguage || 'English');
    setNotifPush(currentUser.notificationPreferences?.push ?? true);
    setNotifWhatsApp(currentUser.notificationPreferences?.whatsapp ?? true);
    setNotifEmail(currentUser.notificationPreferences?.email ?? true);
    setErrorMessage(null);
    setActiveSubTab('view');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Sub-navigation tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('view');
              setErrorMessage(null);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'view'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="tab-sub-profile-view"
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('edit');
              setErrorMessage(null);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'edit'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="tab-sub-profile-edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('security');
              setErrorMessage(null);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'security'
                ? 'bg-[#E53935] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            id="tab-sub-profile-security"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Account & Privacy</span>
          </button>
        </div>

        {activeSubTab === 'view' && (
          <button
            type="button"
            onClick={() => setActiveSubTab('edit')}
            className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700/80 flex items-center gap-1.5 transition-all shadow-sm"
            id="btn-edit-profile-action"
          >
            <Edit3 className="w-3.5 h-3.5 text-rose-400" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* VIEW MODE: Clean DIGIZORT Customer Profile Card */}
      {activeSubTab === 'view' && (
        <div className="space-y-6">
          {/* Main Identity Hero Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/90 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
              {/* Profile Avatar / Photo */}
              <div className="relative shrink-0">
                {currentUser.profilePhoto ? (
                  <img
                    src={currentUser.profilePhoto}
                    alt={currentUser.fullName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-zinc-700 shadow-xl bg-zinc-950"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] flex items-center justify-center text-white font-black text-3xl shadow-xl border-2 border-rose-500/30">
                    {currentUser.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-black rounded-full shadow border-2 border-zinc-900" title="Active Verified Account">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {currentUser.nickname || currentUser.fullName}
                  </h2>
                  {currentUser.nickname && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      Nickname
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Customer
                  </span>
                </div>

                {currentUser.nickname && (
                  <p className="text-xs text-zinc-400">
                    Official Registered Name: <strong className="text-zinc-200">{currentUser.fullName}</strong>
                  </p>
                )}

                {currentUser.bio ? (
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-xl italic bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                    "{currentUser.bio}"
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    No bio added yet. Click <span className="text-rose-400 font-bold cursor-pointer" onClick={() => setActiveSubTab('edit')}>Edit Profile</span> to set a bio and nickname.
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 font-bold">Customer ID:</span>
                    <span className="font-mono text-white font-bold bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800">
                      #{currentUser.mobileNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Member since {new Date(currentUser.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details & Preferences Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Identifiers */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Phone className="w-4 h-4 text-rose-400" />
                <span>Contact & Identity Records</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Registered Mobile</span>
                  <span className="font-mono text-white font-extrabold flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-zinc-500" />
                    {currentUser.mobileNumber}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Email Address</span>
                  <span className="text-zinc-200 font-semibold">{currentUser.email || 'Not Provided'}</span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Delivery / Billing Address</span>
                  <span className="text-zinc-200 font-semibold truncate max-w-[200px]" title={currentUser.address}>
                    {currentUser.address || 'Not Provided'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 font-bold">Preferred Language</span>
                  <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    {currentUser.preferredLanguage || 'English'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Notification Channels</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-zinc-300 font-bold">Browser Push Alerts</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${currentUser.notificationPreferences?.push !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                    {currentUser.notificationPreferences?.push !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-zinc-300 font-bold">WhatsApp Updates</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${currentUser.notificationPreferences?.whatsapp !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                    {currentUser.notificationPreferences?.whatsapp !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span className="text-zinc-300 font-bold">Email Notifications</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${currentUser.notificationPreferences?.email !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                    {currentUser.notificationPreferences?.email !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="pt-2 text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Configured specifically for your account communications.</span>
                </div>
              </div>
            </div>

            {/* DIGIZORT Proactive AI Assistant Preference (Prompt Section 1, 3, 4) */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span>Proactive AI Assistance</span>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Shows gentle contextual assistance when you appear stuck on requests or payments
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !userProactiveEnabled;
                    setUserProactiveEnabled(nextVal);
                    showToast(nextVal ? 'Proactive AI guidance enabled' : 'Proactive AI guidance muted');
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    userProactiveEnabled ? 'bg-amber-500' : 'bg-zinc-800'
                  }`}
                  id="toggle-proactive-ai-user"
                  title="Toggle Proactive AI Help"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      userProactiveEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Current Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    userProactiveEnabled
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
                >
                  {userProactiveEnabled ? 'Active & Helpful' : 'Quiet Mode (Turned Off)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODE: Dedicated Edit Profile Form */}
      {activeSubTab === 'edit' && (
        <form onSubmit={handleSaveChanges} className="space-y-6">
          {/* Profile Photo Section */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#E53935]" />
              <span>Profile Photo</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-3xl object-cover border-2 border-zinc-700 bg-zinc-950 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-zinc-950 border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="profile-photo-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all border border-zinc-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-500/30 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Accepted formats: JPG, PNG, WEBP. Max size: 2.5MB. Photos are safely processed and stored in high resolution.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Info & Display Name */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#E53935]" />
              <span>Identity & Display Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nickname / Display Name
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Dheeraj"
                  maxLength={50}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  This friendly name appears on your dashboard greeting.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Registered Legal Full Name</span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.fullName}
                  className="w-full bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Legally bound to official payment statements & invoices.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300">
                  About Me / Bio
                </label>
                <span className="text-[10px] text-zinc-500">{bio.length}/180</span>
              </div>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={180}
                placeholder="Share a short headline or bio (e.g. Tech enthusiast • Designer • Gaming)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#E53935]" />
              <span>Contact & Regional Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Registered Mobile Number</span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Account ID
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.mobileNumber}
                  className="w-full bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  maxLength={100}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Delivery / Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, State, Postal Code"
                  maxLength={200}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Preferred Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
                >
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam (മലയാളം)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notification Preferences</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Real-time Browser Push Alerts</span>
                  <span className="text-[11px] text-zinc-400">Receive instant updates on price adjustments and order steps</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPush}
                  onChange={(e) => setNotifPush(e.target.checked)}
                  className="w-4 h-4 accent-[#E53935] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">WhatsApp Order Confirmations</span>
                  <span className="text-[11px] text-zinc-400">Official dispatch receipts and milestone messages</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifWhatsApp}
                  onChange={(e) => setNotifWhatsApp(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                <div>
                  <span className="text-xs font-bold text-white block">Email Transaction Summaries</span>
                  <span className="text-[11px] text-zinc-400">Payment receipts and monthly activity statements</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="py-2.5 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-rose-900/30 transition-all flex items-center gap-2"
              id="btn-save-profile-changes"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECURITY & PRIVACY VIEW */}
      {activeSubTab === 'security' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Private Customer Profile</h3>
                <p className="text-xs text-zinc-400">
                  DIGIZORT Customer Order & Cash Tracker Architecture
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Your account is a strictly <strong>private customer profile</strong>. DIGIZORT never shares, exposes, or makes public:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
                <li>Your phone number, email address, or physical address</li>
                <li>Your Available DIGIZORT Balance and ledger transactions</li>
                <li>Your order requests, history, and uploaded attachments</li>
                <li>Your payment confirmations and digital statements</li>
              </ul>
              <p className="pt-2 text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Protected by database security rules and isolated query boundaries.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
