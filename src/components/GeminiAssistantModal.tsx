import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProactiveAI } from '../context/ProactiveAIContext';
import { RobotAIAvatarSVG } from './RobotAIAvatar';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  Zap,
  Brain,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  AlertCircle,
  Loader2,
  Volume2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const PRESET_ROLES = [
  {
    id: 'concierge',
    title: 'DIGIZORT Concierge',
    icon: '💼',
    desc: 'Order tracking, payment verification, balances & refunds',
    instruction:
      'You are DIGIZORT AI, the official virtual financial concierge for DIGIZORT Cash & Order Management. You help users and administrators track orders, understand payment verification, audit balances and refunds, and answer questions clearly, professionally, and concisely in English or Hindi as preferred by the user.',
  },
  {
    id: 'financial',
    title: 'Financial Specialist',
    icon: '📊',
    desc: 'Pricing calculations, supplier discounts & balance arithmetic',
    instruction:
      'You are DIGIZORT Financial Specialist. You provide accurate mathematical guidance on order pricing, remaining balance calculation, supplier discounts, extra cash balances, and partial settlements. Always format amounts clearly in Indian Rupees (₹).',
  },
  {
    id: 'support',
    title: 'Customer Support',
    icon: '🛠️',
    desc: 'Bank transfers, UPI, statements & support resolution',
    instruction:
      'You are DIGIZORT Customer Support Specialist. You help customers with payment verification methods (Cash, UPI, Bank Transfer), explaining transaction receipts, resolution of rejected payments, and general customer care with extreme politeness.',
  },
  {
    id: 'custom',
    title: 'Custom Persona',
    icon: '✏️',
    desc: 'Enter your own custom system instructions',
    instruction: '',
  },
];

const MODELS = [
  {
    id: 'gemini-3.5-flash' as const,
    label: 'digizort-flash',
    title: 'DIGIZORT Flash',
    desc: 'General tasks, payments & rapid answers',
    badge: 'Recommended',
    icon: Zap,
  },
  {
    id: 'gemini-3.1-flash-lite' as const,
    label: 'flash-lite',
    title: 'Flash Lite',
    desc: 'Ultra-low latency lightweight speed inquiries',
    badge: 'Fastest',
    icon: Sparkles,
  },
  {
    id: 'gemini-3.1-pro-preview' as const,
    label: 'pro-preview',
    title: 'Pro Reasoning',
    desc: 'Complex mathematical & financial auditing',
    badge: 'Deep',
    icon: Brain,
  },
];

const SUGGESTED_PROMPTS = [
  { icon: '💳', text: 'How does payment verification work in DIGIZORT?' },
  { icon: '💰', text: 'How is store balance deducted during order placement?' },
  { icon: '📋', text: 'What should I do if my payment verification is rejected?' },
  { icon: '⚖️', text: 'Can an admin record partial cash payments?' },
];

export const GeminiAssistantModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    assistantInitialTab,
    assistantInitialMessage,
    robotState,
    setRobotState,
    promptState,
  } = useProactiveAI();

  const [activeTab, setActiveTab] = useState<'chat' | 'live'>('chat');

  // --- Chatbot State ---
  const [model, setModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview'>('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState(PRESET_ROLES[0].id);
  const [customInstruction, setCustomInstruction] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Hello! I am your DIGIZORT AI Assistant. You can ask me anything about your orders, payment verification, balances, supplier offers, and financial statements. You can also switch to the **Voice** tab to speak with me in real-time!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // --- Live Voice State (gemini-3.8-live) ---
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking'>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- AI Welcome Animation & Awakening Sequence ---
  const [isAwakening, setIsAwakening] = useState(true);
  const [isWelcomeRevealed, setIsWelcomeRevealed] = useState(false);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setIsWelcomeRevealed(true);
    }, 280);

    const readyTimer = setTimeout(() => {
      setIsAwakening(false);
    }, 550);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  // Synchronize modal tab and pre-filled message with proactive AI choices
  useEffect(() => {
    if (isOpen) {
      if (assistantInitialTab === 'live') {
        setActiveTab('live');
      } else {
        setActiveTab('chat');
        if (assistantInitialMessage) {
          setInputMessage(assistantInitialMessage);
        }
      }
    }
  }, [isOpen, assistantInitialTab, assistantInitialMessage]);

  // Sync robot avatar animation state
  useEffect(() => {
    if (!isOpen) return;
    if (isAwakening) return;
    if (liveStatus === 'speaking') {
      setRobotState('speaking');
    } else if (liveStatus === 'connected') {
      setRobotState('listening');
    } else if (liveStatus === 'connecting' || isSending) {
      setRobotState('thinking');
    } else {
      setRobotState('idle');
    }
  }, [liveStatus, isSending, isOpen, isAwakening, setRobotState]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isSending]);

  // Clean up live voice on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopLiveSession();
      setRobotState('idle');
    }
    return () => {
      stopLiveSession();
      setRobotState('idle');
    };
  }, [isOpen, setRobotState]);

  // Handle Send Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsSending(true);

    const activeRoleObj = PRESET_ROLES.find((r) => r.id === selectedRole);
    const baseInstruction =
      selectedRole === 'custom'
        ? customInstruction.trim() || activeRoleObj?.instruction
        : activeRoleObj?.instruction;

    const pageContextNote = `\n\n[USER INTERFACE CONTEXT: Currently active area="${promptState.contextType}", step="${promptState.step || 'default'}", relatedRequest="${promptState.requestId || 'none'}". Guide the user concisely with accurate DIGIZORT rules.]`;
    const systemInstruction = (baseInstruction || '') + pageContextNote;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          systemInstruction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const modelMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'model',
        content: data.reply || 'I received your message, but no content was returned.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
      setRobotState('speaking');
      setTimeout(() => {
        setRobotState('idle');
      }, 2400);
    } catch (err: any) {
      let rawText = err?.message || 'DIGIZORT AI couldn\'t complete that request.';
      if (rawText.includes('Could not load the default credentials')) {
        rawText = 'Missing GEMINI_API_KEY environment variable. Please configure GEMINI_API_KEY in your Vercel Project Settings → Environment Variables to enable DIGIZORT AI.';
      }
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'model',
        content: `⚠️ ${rawText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert Float32 to 16-bit PCM little endian and base64
  const floatTo16BitPCMBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Play audio chunk at 24kHz gaplessly
  const playAudioChunk = (audioCtx: AudioContext, base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      activeSourcesRef.current.push(source);

      setLiveStatus('speaking');
      setAudioLevel(0.85);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setLiveStatus('connected');
          setAudioLevel(0.1);
        }
      };
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  // Start Live Session (gemini-3.8-live)
  const startLiveSession = async () => {
    setLiveError(null);
    setLiveStatus('connecting');

    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser or context (requires HTTPS).');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (mediaErr: any) {
        const isPermIssue =
          mediaErr?.name === 'NotAllowedError' ||
          mediaErr?.name === 'PermissionDeniedError' ||
          mediaErr?.name === 'SecurityError' ||
          mediaErr?.message?.toLowerCase().includes('permission') ||
          mediaErr?.message?.toLowerCase().includes('denied') ||
          mediaErr?.message?.toLowerCase().includes('not allowed');

        if (isPermIssue) {
          throw mediaErr;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      inputAudioCtxRef.current = inputAudioCtx;

      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = outputAudioCtx.currentTime;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.ready) {
            setLiveStatus('connected');
          }
          if (msg.audio && outputAudioCtxRef.current) {
            playAudioChunk(outputAudioCtxRef.current, msg.audio);
          }
          if (msg.interrupted) {
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {}
            });
            activeSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setLiveStatus('connected');
            setAudioLevel(0.1);
          }
          if (msg.error) {
            setLiveError(msg.error);
          }
        } catch (e) {
          console.warn('WebSocket message parsing error:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection error:', e);
        setLiveError('Live Voice connection could not be established. Ensure server is running or switch to Chat.');
        setLiveStatus('disconnected');
      };

      ws.onclose = () => {
        setLiveStatus('disconnected');
      };

      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        if (liveStatus !== 'speaking') {
          setAudioLevel(Math.min(1, rms * 5));
        }

        const base64Audio = floatTo16BitPCMBase64(inputData);
        ws.send(JSON.stringify({ audio: base64Audio }));
      };

      source.connect(processor);
      processor.connect(inputAudioCtx.destination);
    } catch (err: any) {
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.message?.toLowerCase().includes('denied') ||
        err?.message?.toLowerCase().includes('not allowed');

      if (isPermissionDenied) {
        console.warn('Microphone permission not granted:', err?.message || err);
        setLiveError(
          'Microphone permission is required for Live Voice. Please allow microphone access in your browser (check the 🔒 or 🎙️ icon in your address bar), or continue with text chat.'
        );
      } else {
        console.warn('Voice live session error:', err?.message || err);
        setLiveError(err?.message || 'Could not access microphone or connect to Live API.');
      }
      setLiveStatus('disconnected');
      stopLiveSession();
    }
  };

  // Stop Live Session
  const stopLiveSession = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch {}
      outputAudioCtxRef.current = null;
    }

    activeSourcesRef.current = [];
    setLiveStatus('disconnected');
    setAudioLevel(0);
  };

  const handleClose = () => {
    stopLiveSession();
    setRobotState('idle');
    onClose();
  };

  const currentModelObj = MODELS.find((m) => m.id === model) || MODELS[0];
  const currentRoleObj = PRESET_ROLES.find((r) => r.id === selectedRole) || PRESET_ROLES[0];

  return (
    <motion.div
      key="digizort-assistant-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md overflow-hidden select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <motion.div
        key="digizort-assistant-panel"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl bg-[#0d0e12]/95 border border-zinc-800/90 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col h-[88vh] max-h-[800px] overflow-hidden select-auto relative"
      >
        {/* Subtle decorative glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent pointer-events-none" />

        {/* ================= HEADER REDESIGN (Section 7) ================= */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-950/70 backdrop-blur-xl shrink-0">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-white shadow-md shadow-black/60 overflow-hidden shrink-0">
              <RobotAIAvatarSVG state={isAwakening ? 'activating' : robotState} size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  DIGIZORT AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isAwakening ? 'animate-ping' : ''}`} />
                  <span>{isAwakening ? 'Waking Up' : 'Online • Ready'}</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
                Virtual Assistant &amp; Financial Concierge
              </p>
            </div>
          </div>

          {/* Right: Segmented Tab Switcher + Action Controls */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  stopLiveSession();
                  setActiveTab('chat');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'live'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              </button>
            </div>

            {/* Clear conversation button */}
            {activeTab === 'chat' && (
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: 'reset',
                      role: 'model',
                      content: 'Conversation history cleared. How may I assist you today?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
                title="Clear conversation history"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= TAB 1: MODERN MULTI-TURN CHATBOT ================= */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Secondary Controls Bar: Modern Compact Model & Role Selectors (Sections 8 & 9) */}
            <div className="px-4 py-2.5 sm:px-6 bg-zinc-950/60 border-b border-zinc-800/70 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 z-20">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Compact Model Selector (Section 8) */}
                <div className="relative" ref={modelMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModelMenuOpen(!isModelMenuOpen);
                      setIsRoleMenuOpen(false);
                    }}
                    className="py-1 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Select AI Model"
                  >
                    <currentModelObj.icon className="w-3 h-3 text-amber-400" />
                    <span>{currentModelObj.label}</span>
                    <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isModelMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl shadow-black/80 z-30"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Select AI Engine
                        </div>
                        {MODELS.map((m) => {
                          const Icon = m.icon;
                          const isSelected = model === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setModel(m.id);
                                setIsModelMenuOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                                isSelected
                                  ? 'bg-zinc-800 text-white shadow-sm'
                                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800/80 text-zinc-400'}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-black">{m.label}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                                    {m.badge}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{m.desc}</p>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Compact Role Selector (Section 9) */}
                <div className="relative" ref={roleMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleMenuOpen(!isRoleMenuOpen);
                      setIsModelMenuOpen(false);
                    }}
                    className="py-1 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Select Assistant Role"
                  >
                    <span>{currentRoleObj.icon}</span>
                    <span>{currentRoleObj.title}</span>
                    <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isRoleMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl shadow-black/80 z-30"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Assistant Persona
                        </div>
                        {PRESET_ROLES.map((r) => {
                          const isSelected = selectedRole === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setSelectedRole(r.id);
                                setIsRoleMenuOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                                isSelected
                                  ? 'bg-zinc-800 text-white shadow-sm'
                                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                              }`}
                            >
                              <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-black truncate">{r.title}</div>
                                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{r.desc}</p>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Multi-turn memory active</span>
              </div>
            </div>

            {/* Custom Instruction Bar (if Custom Persona is selected) */}
            {selectedRole === 'custom' && (
              <div className="px-4 py-2 sm:px-6 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2 text-xs">
                <span className="text-zinc-400 shrink-0 font-medium">Custom Persona:</span>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="e.g. You are a strict auditor who verifies order amounts and payments..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-rose-500/80"
                />
              </div>
            )}

            {/* Conversation Area (Section 10 & 11) */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                const isWelcome = m.id === 'welcome';
                const isError = m.content.startsWith('⚠️');

                return (
                  <motion.div
                    key={m.id}
                    initial={isWelcome ? { opacity: 0, y: 12, scale: 0.98 } : { opacity: 0, y: 8 }}
                    animate={
                      isWelcome
                        ? isWelcomeRevealed
                          ? { opacity: 1, y: 0, scale: 1 }
                          : { opacity: 0, y: 12, scale: 0.98 }
                        : { opacity: 1, y: 0 }
                    }
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar Icon */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-md ${
                        isUser
                          ? 'bg-zinc-800 border border-zinc-700/80 text-zinc-200'
                          : 'bg-zinc-900 border border-zinc-800 text-rose-400'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[85%] sm:max-w-[80%] space-y-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed relative group ${
                          isUser
                            ? 'bg-gradient-to-r from-rose-600 to-[#b71c1c] text-white rounded-tr-sm shadow-md shadow-rose-950/20'
                            : isError
                            ? 'bg-rose-950/30 border border-rose-800/40 text-rose-200 rounded-tl-sm shadow-sm'
                            : 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-100 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap select-text">{m.content}</p>

                        {!isUser && !isError && (
                          <button
                            type="button"
                            onClick={() => handleCopy(m.id, m.content)}
                            className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy response"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] text-zinc-500 font-medium px-1 block">
                        {m.timestamp}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Modern AI Thinking Indicator (Section 11) */}
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-400 shrink-0 shadow-md">
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 text-xs text-zinc-300 flex items-center gap-2.5 shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                    <span>
                      Digizort AI is thinking({model === 'gemini-3.5-flash' ? 'digizort-flash' : model === 'gemini-3.1-flash-lite' ? 'digizort-lite' : 'digizort-pro'})...
                    </span>
                    <span className="flex items-center gap-1 text-rose-400 font-black">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Chips (Section 14: Wrapped Chips, No ugly horizontal scrollbars) */}
            {messages.length <= 2 && (
              <div className="px-4 py-2.5 sm:px-6 border-t border-zinc-800/70 bg-zinc-950/40 flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-zinc-500 shrink-0">Suggested:</span>
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt.text)}
                    className="py-1 px-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{prompt.icon}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Floating Input Dock (Section 13) */}
            <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 sm:p-2 focus-within:border-rose-500/70 focus-within:ring-1 focus-within:ring-rose-500/20 transition-all shadow-inner">
                {/* Voice Shortcut Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('live')}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors shrink-0"
                  title="Switch to Voice Mode"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask DIGIZORT AI about orders, payments, verification, or balances..."
                  className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-[13px] text-white placeholder-zinc-500 focus:outline-none"
                />

                {/* Send Button with State Transitions (Section 13) */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isSending || !inputMessage.trim()}
                  className="py-2 px-3.5 sm:px-4 bg-gradient-to-r from-rose-600 to-[#b71c1c] hover:brightness-110 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-950/20 flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
                >
                  {isSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isSending ? 'Thinking' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MODERN REAL-TIME LIVE VOICE MODE (Section 15) ================= */}
        {activeTab === 'live' && (
          <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-8 overflow-y-auto">
            {/* Live Model Badge */}
            <div className="w-full flex items-center justify-between text-xs border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-extrabold text-white">DIGIZORT Live Voice Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  digizort-live
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">Ultra-low latency PCM Audio</span>
            </div>

            {/* Central Animated Hero Orb Visualizer (Section 15) */}
            <div className="my-auto flex flex-col items-center text-center space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Glowing Outer Rings Responding to Live State */}
                <motion.div
                  animate={{
                    scale:
                      liveStatus === 'connected' || liveStatus === 'speaking'
                        ? [1, 1.25 + audioLevel * 0.5, 1]
                        : [1, 1.08, 1],
                    opacity:
                      liveStatus === 'connected' || liveStatus === 'speaking'
                        ? [0.25, 0.5 + audioLevel * 0.4, 0.25]
                        : [0.1, 0.2, 0.1],
                  }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-700 blur-3xl pointer-events-none"
                />

                {/* Orb Core with Living Animated DIGIZORT AI Avatar */}
                <div
                  className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all ${
                    liveStatus === 'speaking'
                      ? 'bg-zinc-950 border-2 border-sky-400/80 shadow-sky-500/30'
                      : liveStatus === 'connected'
                      ? 'bg-zinc-950 border-2 border-cyan-400/80 shadow-cyan-500/30'
                      : liveStatus === 'connecting'
                      ? 'bg-zinc-950 border-2 border-purple-500/80 shadow-purple-500/30 animate-pulse'
                      : 'bg-zinc-950 border-2 border-zinc-800'
                  }`}
                >
                  <RobotAIAvatarSVG
                    state={
                      liveStatus === 'speaking'
                        ? 'speaking'
                        : liveStatus === 'connected'
                        ? 'listening'
                        : liveStatus === 'connecting'
                        ? 'thinking'
                        : 'idle'
                    }
                    size="lg"
                    showStateLabel={true}
                  />
                </div>
              </div>

              {/* Dynamic Soundwave Equalizer Bars */}
              {(liveStatus === 'connected' || liveStatus === 'speaking') && (
                <div className="flex items-center gap-1.5 h-6">
                  {[0.4, 0.8, 1.2, 0.9, 0.6, 1.1, 0.7].map((factor, idx) => (
                    <motion.div
                      key={idx}
                      animate={{
                        height: liveStatus === 'speaking'
                          ? [6, 20 * factor * (audioLevel + 0.3), 6]
                          : [4, 14 * factor * (audioLevel + 0.2), 4],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.5 + idx * 0.1,
                        ease: 'easeInOut',
                      }}
                      className={`w-1 rounded-full ${
                        liveStatus === 'speaking' ? 'bg-sky-400' : 'bg-cyan-400'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Status Message */}
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">
                  {liveStatus === 'speaking'
                    ? 'DIGIZORT AI is speaking...'
                    : liveStatus === 'connected'
                    ? isMuted
                      ? 'Microphone Muted'
                      : 'Listening... Speak naturally!'
                    : liveStatus === 'connecting'
                    ? 'Connecting to DIGIZORT Live Voice...'
                    : 'Real-Time Voice Ready'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  {liveStatus === 'connected' || liveStatus === 'speaking'
                    ? 'Real-time bidirectional speech conversation with ultra-low latency.'
                    : 'Tap "Start Voice Conversation" to talk directly with DIGIZORT AI using digizort-live.'}
                </p>
              </div>

              {/* Clean Error State Banner with Try Again & Switch to Chat (Section 18) */}
              {liveError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex flex-col gap-2.5 max-w-md w-full">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed">{liveError}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-rose-500/20">
                    <button
                      type="button"
                      onClick={startLiveSession}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopLiveSession();
                        setActiveTab('chat');
                      }}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      Switch to Chat
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Live Controls */}
            <div className="w-full flex items-center justify-center gap-3 pt-4 border-t border-zinc-800">
              {liveStatus === 'disconnected' ? (
                <button
                  type="button"
                  onClick={startLiveSession}
                  className="py-3 px-6 bg-gradient-to-r from-rose-600 to-[#B71C1C] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-rose-600/30 transition-all flex items-center gap-2 active:scale-[0.98]"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Start Voice Conversation</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isMuted
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopLiveSession}
                    className="py-2.5 px-5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 active:scale-[0.98]"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Voice Call</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
