import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-800/80 bg-zinc-950/80 py-8 px-4 sm:px-8 mt-auto backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <img
            src={OFFICIAL_DIGIZORT_LOGO}
            alt="DIGIZORT Logo"
            className="w-6 h-6 object-contain"
          />
          <span className="font-semibold text-zinc-300 tracking-wider">
            DIGIZORT CASH TRACKER
          </span>
          <span className="hidden sm:inline text-zinc-700">•</span>
          <span className="hidden sm:inline">Order Request & Payment Management</span>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400">
          <span>Designed &amp; Developed by</span>
          <span className="font-bold text-[#E53935] hover:underline cursor-pointer">
            DIGIZORT
          </span>
        </div>

        <div className="flex items-center gap-4 text-zinc-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Cloud Encrypted Platform
          </span>
        </div>
      </div>
    </footer>
  );
};
