import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

import sendHandler from './api/whatsapp/send';
import statusHandler from './api/whatsapp/status';
import registerHandler from './api/whatsapp/register';
import chatHandler from './api/chat';

dotenv.config();

function getGeminiApiKey(): string | null {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY;

  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Serve Service Worker for Web Push Notifications
  app.get('/firebase-messaging-sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(process.cwd(), 'public', 'firebase-messaging-sw.js'));
  });

  // Centralized WhatsApp endpoints
  app.all('/api/whatsapp/status', (req, res) => statusHandler(req, res));
  app.all('/api/whatsapp/send', (req, res) => sendHandler(req, res));
  app.all('/api/whatsapp/register', (req, res) => registerHandler(req, res));

  // Multi-turn Gemini Chatbot Endpoint
  app.all('/api/chat', (req, res) => chatHandler(req, res));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // WebSocket Server for Gemini 3.8 Live API real-time voice conversation
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs) => {
    let session: any = null;
    let isClosed = false;

    clientWs.on('close', () => {
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch {
          // ignore
        }
      }
    });

    clientWs.on('error', (err) => {
      console.error('Client WebSocket error:', err);
    });

    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        console.warn('DIGIZORT Voice AI notice: Missing GEMINI_API_KEY environment variable on server.');
        clientWs.send(
          JSON.stringify({
            error: '🤖 DIGIZORT Live Voice is temporarily unavailable. Please try again in a moment.',
          })
        );
        clientWs.close();
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        vertexai: false,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are the DIGIZORT Voice Assistant. You speak with customers and admins in real-time about orders, payments, cash tracking, balances, receipts, and customer service in a warm, professional, concise, conversational tone.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live API error:', err);
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || 'Live session error' }));
            }
          },
        },
      });

      if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ ready: true, model: 'gemini-3.8-live' }));
      }

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (e) {
          console.error('Error forwarding data to Gemini Live:', e);
        }
      });
    } catch (err: any) {
      console.error('Failed to initialize Gemini 3.8 Live session:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: err?.message || 'Could not connect to Gemini Live' }));
        clientWs.close();
      }
    }
  });

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
