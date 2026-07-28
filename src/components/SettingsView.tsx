import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { exportToCSV } from '../lib/utils';
import { CurrencyCode } from '../types';
import {
  Settings,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Moon,
  Sun,
  Shield,
  Trash2,
  Check,
  Cloud,
  User,
  LogOut,
  RefreshCw,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    transactions,
    resetToDemoData,
    showToast,
    userProfile,
    isCloudConnected,
    setIsAuthModalOpen,
    logoutUser,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencies: { code: CurrencyCode; name: string; symbol: string }[] = [
    { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
    { code: 'AED', name: 'UAE Dirham (AED)', symbol: 'AED ' },
    { code: 'CAD', name: 'Canadian Dollar (CA$)', symbol: 'CA$' },
  ];

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'digizort_cash_tracker_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON downloaded');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          localStorage.setItem('digizort_transactions_v1', JSON.stringify(parsed));
          window.location.reload();
        } else {
          showToast('Invalid backup file format');
        }
      } catch (err) {
        showToast('Error reading file');
      }
    };
    reader.readAsText(file);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-zinc-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#E53935]" />
          App Preferences &amp; Settings
        </h2>
        <p className="text-xs text-zinc-400">
          Manage display theme, currency defaults, and data backups
        </p>
      </div>

      <div className="space-y-6">
        {/* Cloud Firestore Sync Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Firebase Cloud Firestore Sync
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isCloudConnected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {isCloudConnected ? 'ACTIVE (REALTIME)' : 'GUEST MODE'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Data synchronizes automatically across desktop, laptop, mobile, and tablet
                </p>
              </div>
            </div>

            {isCloudConnected ? (
              <button
                onClick={logoutUser}
                className="py-2 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="py-2 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E53935]/20 flex items-center gap-1.5 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                Sign In / Sign Up
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">Logged-In Account</span>
              <span className="font-bold text-white block truncate">{userProfile.email}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">Sync Protocol</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                Firestore WebSocket Real-time Listener
              </span>
            </div>
          </div>
        </div>
        {/* Currency Setting */}
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl space-y-3">
          <h3 className="text-sm font-bold text-white">Default Currency</h3>
          <p className="text-xs text-zinc-400">Select preferred currency symbol for amounts</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {currencies.map((c) => {
              const isSelected = settings.currency === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => updateSettings({ currency: c.code })}
                  className={`p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#E53935]/15 border-[#E53935] text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{c.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#E53935]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Export & Backup */}
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Export &amp; Data Backup</h3>
          <p className="text-xs text-zinc-400">
            Download your transactions into spreadsheet CSV, JSON backup, or print a summary report
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => exportToCSV(transactions)}
              className="py-3 px-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              id="export-csv-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export to CSV
            </button>

            <button
              onClick={handleExportJSON}
              className="py-3 px-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              id="export-json-btn"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Export JSON Backup
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              id="import-json-btn"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              Import JSON
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Clear All Data */}
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl space-y-3">
          <h3 className="text-sm font-bold text-white">Data Reset</h3>
          <p className="text-xs text-zinc-400">
            Clear all current transactions and reset dashboard to clean empty state
          </p>

          <button
            onClick={resetToDemoData}
            className="py-3 px-5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-2xl flex items-center gap-2 transition-colors"
            id="clear-all-data-btn"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
