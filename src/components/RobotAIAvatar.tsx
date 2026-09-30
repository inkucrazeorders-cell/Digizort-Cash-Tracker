import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RobotState, useProactiveAI } from '../context/ProactiveAIContext';
import { Sparkles, Mic, MessageSquare, X, ArrowRight, Volume2, Radio } from 'lucide-react';

interface RobotAvatarProps {
  state?: RobotState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStateLabel?: boolean;
  className?: string;
}

export const RobotAIAvatarSVG: React.FC<RobotAvatarProps> = ({
  state = 'idle',
  size = 'md',
  showStateLabel = false,
  className = '',
}) => {
  const pixelSizes = {
    sm: 34,
    md: 46,
    lg: 68,
    xl: 96,
  };
  const dim = pixelSizes[size];

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isHelp = state === 'help_available';
  const isActivating = state === 'activating';

  // State-specific color accents
  const accentColor = isActivating
    ? '#10b981'
    : isListening
    ? '#06b6d4'
    : isThinking
    ? '#a855f7'
    : isSpeaking
    ? '#38bdf8'
    : isHelp
    ? '#fbbf24'
    : '#10b981';

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Living Motion Wrapper: Subtle breathing & floating (Section 1) */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: dim, height: dim }}
        animate={
          isActivating
            ? { scale: [1, 1.14, 1.02], y: [0, -4, 0], rotate: [0, -1.5, 1.5, 0] }
            : isSpeaking
            ? { y: [0, -2, 0, -1.5, 0], scale: [1, 1.03, 1] }
            : isListening
            ? { y: [0, -1.8, 0], scale: [1, 1.025, 1] }
            : isThinking
            ? { y: [0, -1.5, 0], rotate: [0, -1.8, 0, 1.8, 0] }
            : isHelp
            ? { y: [0, -3.5, 0], scale: [1, 1.05, 1], rotate: [0, 1.5, -1.5, 0] }
            : { y: [0, -2.5, 0], rotate: [0, 0.8, 0, -0.8, 0] } // idle floating & slight head tilt
        }
        transition={{
          duration: isActivating ? 0.35 : isSpeaking ? 1.4 : isThinking ? 2.4 : isHelp ? 1.8 : 4.0,
          repeat: isActivating ? 1 : Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Soft Pulsing Ambient / Reaction Ring (Section 2, 4, 5, Opening) */}
        {isActivating && (
          <motion.div
            className="absolute -inset-3 rounded-full border-2 border-emerald-400 bg-emerald-500/25 pointer-events-none"
            animate={{ scale: [1, 1.5, 1.1], opacity: [0.95, 0.2, 0.8] }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        )}
        {isListening && (
          <motion.div
            className="absolute -inset-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 pointer-events-none"
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.15, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        {isSpeaking && (
          <motion.div
            className="absolute -inset-2.5 rounded-full border border-sky-400/40 bg-sky-500/10 pointer-events-none"
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {isThinking && (
          <motion.div
            className="absolute -inset-2 rounded-full border border-purple-400/30 bg-purple-500/10 pointer-events-none"
            animate={{ scale: [0.98, 1.15, 0.98], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {isHelp && (
          <motion.div
            className="absolute -inset-2 rounded-full border border-amber-400/50 bg-amber-500/15 pointer-events-none"
            animate={{ scale: [1, 1.3, 1], opacity: [0.9, 0.25, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {state === 'idle' && (
          <div className="absolute -inset-1 rounded-full bg-emerald-500/5 blur-sm pointer-events-none opacity-40" />
        )}

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md relative z-10"
        >
          {/* Antenna Rod */}
          <line
            x1="50"
            y1="20"
            x2="50"
            y2="8"
            stroke="#71717a"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Dynamic Antenna Light Orb */}
          <circle
            cx="50"
            cy="7"
            r="5"
            className={
              isActivating
                ? 'fill-emerald-300 animate-ping'
                : isListening
                ? 'fill-cyan-400 animate-pulse'
                : isSpeaking
                ? 'fill-sky-400 animate-pulse'
                : isThinking
                ? 'fill-purple-400 animate-pulse'
                : isHelp
                ? 'fill-amber-400 animate-ping'
                : 'fill-emerald-400'
            }
          />
          <circle
            cx="50"
            cy="7"
            r="2"
            fill="#ffffff"
            className="opacity-90"
          />

          {/* Outer Head Chassis (Preserved DIGIZORT aesthetics) */}
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
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* --- LIVING EYES SYSTEM (Section 1, 2, 3, 4, 5, Activating) --- */}
          {isActivating ? (
            // Power-on wake-up flare
            <g className="animate-pulse">
              <ellipse cx="39" cy="46" rx="7" ry="8" fill="#34d399" />
              <circle cx="39" cy="46" r="3.5" fill="#ffffff" />
              <ellipse cx="61" cy="46" rx="7" ry="8" fill="#34d399" />
              <circle cx="61" cy="46" r="3.5" fill="#ffffff" />
            </g>
          ) : isListening ? (
            // Concentric listening wave rings
            <g>
              <circle cx="39" cy="48" r="7" fill="#06b6d4" className="animate-pulse" />
              <circle cx="61" cy="48" r="7" fill="#06b6d4" className="animate-pulse" />
              <circle cx="39" cy="48" r="3" fill="#ffffff" />
              <circle cx="61" cy="48" r="3" fill="#ffffff" />
            </g>
          ) : isThinking ? (
            // Scanning pulse beam with animated sweep
            <g>
              <g className="robot-scan">
                <rect x="42" y="46" width="16" height="4" rx="2" fill="#c084fc" />
              </g>
              <circle cx="36" cy="48" r="3" fill="#a855f7" className="animate-pulse" />
              <circle cx="50" cy="48" r="3" fill="#c084fc" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
              <circle cx="64" cy="48" r="3" fill="#a855f7" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
            </g>
          ) : isSpeaking ? (
            // Energetic expressive sky-blue eyes with voice pulse
            <g className="animate-pulse">
              <ellipse cx="39" cy="46" rx="6.5" ry="7.5" fill="#38bdf8" />
              <circle cx="41" cy="44" r="2.5" fill="#ffffff" />
              <ellipse cx="61" cy="46" rx="6.5" ry="7.5" fill="#38bdf8" />
              <circle cx="63" cy="44" r="2.5" fill="#ffffff" />
            </g>
          ) : isHelp ? (
            // Welcoming happy curved eyes
            <g>
              <path d="M33 48Q39 40 45 48" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M55 48Q61 40 67 48" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="49" cy="38" r="2" fill="#fde68a" />
            </g>
          ) : (
            // Natural friendly digital gaze with occasional natural blink (Section 1)
            <g className="robot-blink">
              <rect x="33" y="43" width="11" height="11" rx="4" fill="#34d399" />
              <circle cx="39" cy="46" r="2.2" fill="#ffffff" />
              <rect x="56" y="43" width="11" height="11" rx="4" fill="#34d399" />
              <circle cx="62" cy="46" r="2.2" fill="#ffffff" />
            </g>
          )}

          {/* --- DIGITAL MOUTH / SOUNDWAVE AREA (Section 2, 4) --- */}
          {isSpeaking ? (
            // Dynamically fluctuating soundwave bars synchronized with speech
            <g>
              <rect x="35" y="60" width="3" height="8" rx="1.5" fill="#38bdf8" className="robot-soundwave-bar-1" />
              <rect x="41" y="58" width="3.2" height="12" rx="1.6" fill="#7dd3fc" className="robot-soundwave-bar-2" />
              <rect x="48" y="57" width="4" height="14" rx="2" fill="#ffffff" className="robot-soundwave-bar-3" />
              <rect x="55" y="58" width="3.2" height="12" rx="1.6" fill="#7dd3fc" className="robot-soundwave-bar-2" />
              <rect x="62" y="60" width="3" height="8" rx="1.5" fill="#38bdf8" className="robot-soundwave-bar-1" />
            </g>
          ) : isListening ? (
            // Audio input wave that reacts while listening
            <g className="animate-pulse">
              <rect x="40" y="62" width="20" height="2.5" rx="1.25" fill="#06b6d4" />
              <circle cx="50" cy="63.2" r="3" fill="#22d3ee" />
            </g>
          ) : isThinking ? (
            // Processing 3 dots
            <g>
              <circle cx="44" cy="63" r="1.5" fill="#a855f7" className="animate-ping" />
              <circle cx="50" cy="63" r="1.5" fill="#c084fc" className="animate-ping" style={{ animationDelay: '0.15s' }} />
              <circle cx="56" cy="63" r="1.5" fill="#a855f7" className="animate-ping" style={{ animationDelay: '0.3s' }} />
            </g>
          ) : isHelp ? (
            // Friendly warm smile curve
            <path d="M40 61Q50 67 60 61" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            // Calm, sleek digital horizontal indicator
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
      </motion.div>

      {/* State Label Badge (Sections 2, 3, 4, 5, 6) */}
      {showStateLabel && state !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 2 }}
          className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border ${
            isActivating
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isListening
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : isThinking
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : isSpeaking
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : isHelp
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}
        >
          {isActivating && <Sparkles className="w-2.5 h-2.5 animate-spin text-emerald-400" />}
          {isListening && <Mic className="w-2.5 h-2.5 animate-pulse text-cyan-400" />}
          {isThinking && <Sparkles className="w-2.5 h-2.5 animate-spin text-purple-400" style={{ animationDuration: '3s' }} />}
          {isSpeaking && <Volume2 className="w-2.5 h-2.5 animate-bounce text-sky-400" />}
          {isHelp && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
          <span>
            {isActivating
              ? 'WAKING UP...'
              : isListening
              ? 'LISTENING...'
              : isThinking
              ? 'THINKING...'
              : isSpeaking
              ? 'SPEAKING...'
              : isHelp
              ? 'NEED HELP?'
              : 'READY'}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export const ProactiveAILauncher: React.FC = () => {
  const {
    promptState,
    dismissPrompt,
    acceptHelp,
    setIsAssistantOpen,
    openAssistantWithAnimation,
    robotState,
    adminConfig,
  } = useProactiveAI();

  const currentDisplayState: RobotState = promptState.isOpen ? 'help_available' : robotState;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none">
      {/* Non-Blocking Proactive Speech Bubble (Section 3 & 4 & 5) */}
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
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <RobotAIAvatarSVG state="help_available" size="sm" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                      {promptState.title}
                    </h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  </div>
                  <p className="text-[11px] font-bold text-zinc-400">Need help? I'm here.</p>
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

      {/* Floating Robot Launcher Button with Wake-Up Reaction (Opening Animation) */}
      <button
        type="button"
        onClick={() => openAssistantWithAnimation()}
        className={`pointer-events-auto group relative flex items-center gap-2.5 p-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 hover:brightness-110 text-white font-extrabold text-xs rounded-2xl shadow-xl transition-all active:scale-95 ${
          currentDisplayState === 'activating'
            ? 'scale-[1.05] border-emerald-500/80 shadow-emerald-500/25 ring-2 ring-emerald-500/40'
            : 'shadow-black/50 border border-zinc-700/80 hover:border-rose-500/50'
        }`}
        id="btn-open-gemini-assistant"
        title="Open DIGIZORT AI Assistant & Live Voice"
      >
        <div className="relative">
          <RobotAIAvatarSVG state={currentDisplayState} size="sm" />
          {promptState.isOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-950 animate-ping" />
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white">DIGIZORT AI</span>
            {currentDisplayState === 'activating' ? (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                WAKING UP...
              </span>
            ) : currentDisplayState === 'listening' ? (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                LISTENING...
              </span>
            ) : currentDisplayState === 'thinking' ? (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                THINKING...
              </span>
            ) : currentDisplayState === 'speaking' ? (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
                SPEAKING...
              </span>
            ) : (
              <Sparkles className="w-3 h-3 text-amber-400" />
            )}
          </div>

          <span className="text-[10px] text-zinc-400 font-medium -mt-0.5">
            {currentDisplayState === 'activating'
              ? 'Waking up DIGIZORT AI...'
              : currentDisplayState === 'help_available'
              ? 'Need help? Click me'
              : currentDisplayState === 'listening'
              ? 'Listening to your voice...'
              : currentDisplayState === 'thinking'
              ? 'Processing response...'
              : currentDisplayState === 'speaking'
              ? 'Speaking response...'
              : 'Chat & Voice Assistant'}
          </span>
        </div>
      </button>
    </div>
  );
};

