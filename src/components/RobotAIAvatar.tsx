import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RobotState, useProactiveAI } from '../context/ProactiveAIContext';
import { Sparkles, Mic, MessageSquare, X, ArrowRight, Volume2 } from 'lucide-react';

interface RobotAvatarProps {
  state?: RobotState;
  size?: 'sm' | 'md' | 'lg';
}

export const RobotAIAvatarSVG: React.FC<RobotAvatarProps> = ({ state = 'idle', size = 'md' }) => {
  const pixelSizes = {
    sm: 32,
    md: 44,
    lg: 60,
  };
  const dim = pixelSizes[size];

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isHelp = state === 'help_available';

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Antenna */}
        <line x1="50" y1="20" x2="50" y2="8" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />
        <circle
          cx="50"
          cy="7"
          r="5"
          className={
            isListening || isSpeaking
              ? 'fill-rose-500 animate-pulse'
              : isHelp
              ? 'fill-amber-400 animate-ping'
              : 'fill-rose-500'
          }
        />

        {/* Outer Head Chassis */}
        <rect
          x="15"
          y="20"
          width="70"
          height="62"
          rx="22"
          fill="url(#chassisGrad)"
          stroke="#3f3f46"
          strokeWidth="3"
        />

        {/* Ear Bolts */}
        <rect x="7" y="42" width="8" height="18" rx="4" fill="#52525b" />
        <rect x="85" y="42" width="8" height="18" rx="4" fill="#52525b" />

        {/* Dark Visor / Digital Screen */}
        <rect
          x="23"
          y="29"
          width="54"
          height="44"
          rx="14"
          fill="#09090b"
          stroke="#27272a"
          strokeWidth="2"
        />

        {/* Subtle Screen Reflection */}
        <path
          d="M26 33C30 31 38 31 46 31"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* LED Eyes */}
        {isListening ? (
          // Concentric listening wave rings
          <g>
            <circle cx="39" cy="48" r="7" fill="#06b6d4" className="animate-pulse" />
            <circle cx="61" cy="48" r="7" fill="#06b6d4" className="animate-pulse" />
            <circle cx="39" cy="48" r="3" fill="#ffffff" />
            <circle cx="61" cy="48" r="3" fill="#ffffff" />
          </g>
        ) : isThinking ? (
          // Scanning pulse beam
          <g>
            <rect x="30" y="46" width="40" height="4" rx="2" fill="#a855f7" className="animate-pulse" />
            <circle cx="50" cy="48" r="4" fill="#f3e8ff" />
          </g>
        ) : isSpeaking ? (
          // Speaking animated eyes
          <g>
            <ellipse cx="39" cy="45" rx="6" ry="7" fill="#38bdf8" />
            <circle cx="41" cy="43" r="2" fill="#ffffff" />
            <ellipse cx="61" cy="45" rx="6" ry="7" fill="#38bdf8" />
            <circle cx="63" cy="43" r="2" fill="#ffffff" />
          </g>
        ) : isHelp ? (
          // Winking or welcoming happy curved eyes
          <g>
            <path d="M33 48Q39 40 45 48" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M55 48Q61 40 67 48" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="49" cy="38" r="2" fill="#fde68a" />
          </g>
        ) : (
          // Normal friendly digital gaze
          <g>
            <rect x="33" y="43" width="11" height="11" rx="4" fill="#34d399" />
            <circle cx="39" cy="46" r="2" fill="#ffffff" />
            <rect x="56" y="43" width="11" height="11" rx="4" fill="#34d399" />
            <circle cx="62" cy="46" r="2" fill="#ffffff" />
          </g>
        )}

        {/* Digital Mouth / Soundwave Indicator */}
        {isSpeaking ? (
          // Animated soundwave bars
          <g className="animate-pulse">
            <rect x="36" y="61" width="3" height="6" rx="1.5" fill="#38bdf8" />
            <rect x="42" y="59" width="3" height="10" rx="1.5" fill="#38bdf8" />
            <rect x="48" y="58" width="4" height="12" rx="2" fill="#ffffff" />
            <rect x="55" y="59" width="3" height="10" rx="1.5" fill="#38bdf8" />
            <rect x="61" y="61" width="3" height="6" rx="1.5" fill="#38bdf8" />
          </g>
        ) : isListening ? (
          <path d="M42 63H58" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
        ) : isHelp ? (
          <path d="M40 61Q50 67 60 61" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M42 63H58" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Chassis Gradient Definition */}
        <defs>
          <linearGradient id="chassisGrad" x1="15" y1="20" x2="85" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#27272a" />
            <stop offset="1" stopColor="#18181b" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export const ProactiveAILauncher: React.FC = () => {
  const {
    promptState,
    dismissPrompt,
    acceptHelp,
    setIsAssistantOpen,
    robotState,
    adminConfig,
  } = useProactiveAI();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none">
      {/* Non-Blocking Proactive Speech Bubble (Section 3 & 4) */}
      <AnimatePresence>
        {promptState.isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="pointer-events-auto mb-3 w-[92vw] max-w-sm sm:max-w-md bg-zinc-900/95 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/60 relative overflow-hidden"
            role="dialog"
            aria-live="polite"
          >
            {/* Glow accent */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <RobotAIAvatarSVG state="help_available" size="sm" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                      {promptState.title}
                    </h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  </div>
                  <p className="text-[11px] font-bold text-zinc-400">Need any help? I'm here.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissPrompt}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Proactive Message */}
            <p className="text-xs text-zinc-200 leading-relaxed mt-2.5 mb-3.5">
              "{promptState.message}"
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => acceptHelp('chat')}
                className="py-2 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 flex-1 justify-center"
                id="btn-proactive-help-me"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Yes, Help Me</span>
              </button>

              {adminConfig.voicePromptEnabled && (
                <button
                  type="button"
                  onClick={() => acceptHelp('live')}
                  className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs rounded-xl border border-zinc-700/80 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Talk directly with DIGIZORT AI in voice mode"
                  id="btn-proactive-voice-help"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>Talk to AI</span>
                </button>
              )}

              <button
                type="button"
                onClick={dismissPrompt}
                className="py-2 px-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium text-xs rounded-xl transition-colors"
                id="btn-proactive-dismiss"
              >
                I'll Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Robot Launcher Button */}
      <button
        type="button"
        onClick={() => setIsAssistantOpen(true)}
        className="pointer-events-auto group relative flex items-center gap-2.5 p-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 hover:brightness-110 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-black/50 border border-zinc-700/80 hover:border-rose-500/50 transition-all active:scale-95"
        id="btn-open-gemini-assistant"
        title="Open DIGIZORT Gemini AI Assistant & Live Voice"
      >
        <div className="relative">
          <RobotAIAvatarSVG state={promptState.isOpen ? 'help_available' : robotState} size="sm" />
          {promptState.isOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-950 animate-ping" />
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-black text-white flex items-center gap-1">
            DIGIZORT AI
            <Sparkles className="w-3 h-3 text-amber-400" />
          </span>
          <span className="text-[10px] text-zinc-400 font-medium -mt-0.5">
            {promptState.isOpen ? 'Help Available' : 'Chat & Voice Assistant'}
          </span>
        </div>
      </button>
    </div>
  );
};
