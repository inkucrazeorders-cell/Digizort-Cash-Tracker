import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProactiveAI } from '../context/ProactiveAIContext';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  Layers,
  Zap,
  Brain,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
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
    title: '💼 DIGIZORT Concierge',
    desc: 'Order tracking, payment verification, balances & refunds',
    instruction:
      'You are DIGIZORT AI, the official virtual financial concierge for DIGIZORT Cash & Order Management. You help users and administrators track orders, understand payment verification, audit balances and refunds, and answer questions clearly, professionally, and concisely in English or Hindi as preferred by the user.',
  },
  {
    id: 'financial',
    title: '📊 Financial & Calculations Specialist',
    desc: 'Pricing calculations, supplier offers & store balance arithmetic',
    instruction:
      'You are DIGIZORT Financial Specialist. You provide accurate mathematical guidance on order pricing, remaining balance calculation, supplier discounts, extra cash balances, and partial settlements. Always format amounts clearly in Indian Rupees (₹).',
  },
  {
    id: 'support',
    title: '🛠️ Customer Support Specialist',
    desc: 'Bank transfers, UPI, statements & support tickets',
    instruction:
      'You are DIGIZORT Customer Support Specialist. You help customers with payment verification methods (Cash, UPI, Bank Transfer), explaining transaction receipts, resolution of rejected payments, and general customer care with extreme politeness.',
  },
  {
    id: 'custom',
    title: '✏️ Custom Persona',
    desc: 'Enter your own custom system instruction',
    instruction: '',
  },
];

const SUGGESTED_PROMPTS = [
  'How does the payment verification process work in DIGIZORT?',
  'What should I do if my payment verification is rejected?',
  'How does the store balance get deducted during order placement?',
  'Can an admin record partial cash payments?',
];

export const GeminiAssistantModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    assistantInitialTab,
    assistantInitialMessage,
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Hello! I am your DIGIZORT AI Assistant. You can ask me anything about your orders, payment verification, balances, supplier offers, and financial statements. You can also switch to the **Live Voice** tab to talk to me in real-time!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (liveStatus === 'speaking') {
      setRobotState('speaking');
    } else if (liveStatus === 'connected') {
      setRobotState('listening');
    } else if (liveStatus === 'connecting' || isSending) {
      setRobotState('thinking');
    } else {
      setRobotState('idle');
    }
  }, [liveStatus, isSending, isOpen, setRobotState]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

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
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'model',
        content: `⚠️ Error: ${err?.message || 'Unable to connect to Gemini API. Please verify server connection.'}`,
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

      // Schedule gapless playback
      const currentTime = audioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      activeSourcesRef.current.push(source);

      setLiveStatus('speaking');
      setAudioLevel(0.8);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setLiveStatus('connected');
          setAudioLevel(0.1);
        }
      };
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  // Start Live Session (gemini-3.8-live)
  const startLiveSession = async () => {
    setLiveError(null);
    setLiveStatus('connecting');

    try {
      // 1. Initialize Microphones
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
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

      // 2. Connect WebSocket
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
            // Stop current playback immediately
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
          console.error('WebSocket message parsing error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket connection error:', e);
        setLiveError('WebSocket connection failed. Ensure server is running.');
        setLiveStatus('disconnected');
      };

      ws.onclose = () => {
        setLiveStatus('disconnected');
      };

      // 3. Audio Processing & Mic Streaming
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Calculate basic audio visualizer RMS
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
      console.error('Error starting live session:', err);
      setLiveError(err?.message || 'Could not access microphone or connect to Live API.');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[820px] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-amber-600 to-[#E53935] flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">DIGIZORT AI Studio</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Gemini 3
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Multi-turn Chat &amp; Real-Time Voice Conversations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-1">
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
                <span>Voice (Live API)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: GEMINI MULTI-TURN CHATBOT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Model & Role Selection Bar */}
            <div className="p-3 bg-zinc-950/70 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400 font-bold text-[11px]">Model:</span>
                <div className="inline-flex rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3.5-flash')}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                      model === 'gemini-3.5-flash'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="General Tasks (Default)"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>gemini-3.5-flash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3.1-flash-lite')}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                      model === 'gemini-3.1-flash-lite'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Fast Tasks"
                  >
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>flash-lite</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3.1-pro-preview')}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                      model === 'gemini-3.1-pro-preview'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Complex Reasoning Tasks"
                  >
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span>pro-preview</span>
                  </button>
                </div>
              </div>

              {/* Role Preset Selector */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-bold text-[11px]">Role:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-zinc-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Instruction Input if custom role selected */}
            {selectedRole === 'custom' && (
              <div className="px-4 py-2 bg-zinc-950/90 border-b border-zinc-800 flex items-center gap-2 text-xs">
                <span className="text-zinc-400 shrink-0 font-medium">System Instruction:</span>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="e.g. You are a strict auditor who reviews ledger calculations..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Scrollable Chat History Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                        isUser
                          ? 'bg-zinc-700 text-white'
                          : 'bg-gradient-to-tr from-rose-600 to-amber-600'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[85%] space-y-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed relative group ${
                          isUser
                            ? 'bg-rose-600 text-white rounded-tr-sm shadow-md'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap select-text">{m.content}</p>

                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(m.id, m.content)}
                            className="absolute top-2 right-2 p-1 rounded-md bg-zinc-800/80 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                    <span>Gemini is thinking ({model})...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Chips */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-zinc-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="py-1 px-2.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-[11px] whitespace-nowrap transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/95 flex items-center gap-2 shrink-0">
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
                className="p-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shrink-0"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

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
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputMessage.trim()}
                className="py-2.5 px-4 bg-gradient-to-r from-rose-600 to-[#B71C1C] hover:brightness-110 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all shrink-0 active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: GEMINI 3.8 LIVE VOICE CONVERSATION */}
        {activeTab === 'live' && (
          <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-8 overflow-y-auto">
            {/* Live Model Badge */}
            <div className="w-full flex items-center justify-between text-xs border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="font-extrabold text-white">Live API Voice Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  gemini-3.8-live
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">16kHz Input • 24kHz Output PCM</span>
            </div>

            {/* Central Animated Orb Visualizer */}
            <div className="my-auto flex flex-col items-center text-center space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Glowing Outer Rings */}
                <motion.div
                  animate={{
                    scale: liveStatus === 'connected' || liveStatus === 'speaking' ? [1, 1.25 + audioLevel * 0.5, 1] : 1,
                    opacity: liveStatus === 'connected' || liveStatus === 'speaking' ? [0.2, 0.45, 0.2] : 0.1,
                  }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-red-600 blur-2xl pointer-events-none"
                />

                {/* Orb Core */}
                <div
                  className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                    liveStatus === 'speaking'
                      ? 'bg-gradient-to-tr from-amber-500 to-rose-600 shadow-rose-500/50 scale-105 ring-4 ring-rose-400/50'
                      : liveStatus === 'connected'
                      ? 'bg-gradient-to-tr from-rose-600 to-zinc-800 shadow-rose-900/50'
                      : liveStatus === 'connecting'
                      ? 'bg-zinc-800 animate-pulse'
                      : 'bg-zinc-850'
                  }`}
                >
                  {liveStatus === 'connecting' ? (
                    <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
                  ) : liveStatus === 'speaking' ? (
                    <Volume2 className="w-12 h-12 text-white animate-pulse" />
                  ) : liveStatus === 'connected' ? (
                    <Mic className="w-12 h-12 text-white" />
                  ) : (
                    <MicOff className="w-12 h-12 text-zinc-500" />
                  )}
                </div>
              </div>

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
                    ? 'Connecting to Gemini 3.8 Live API...'
                    : 'Real-Time Voice Ready'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  {liveStatus === 'connected' || liveStatus === 'speaking'
                    ? 'Real-time bidirectional speech conversation with ultra-low latency.'
                    : 'Tap "Start Voice Conversation" to talk directly with DIGIZORT AI using gemini-3.8-live.'}
                </p>
              </div>

              {liveError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 max-w-md">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{liveError}</span>
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
    </div>
  );
};
