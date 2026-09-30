import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

// Ensure environment variables are loaded from .env when running in serverless or local environments
dotenv.config();

// Helper to safely extract Gemini API key from common environment variable names
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

// Optional support for Google Cloud Service Account credentials (if using Vertex AI on Vercel)
function getServiceAccountCredentials(): any | null {
  const saRaw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_CREDENTIALS;

  if (saRaw && typeof saRaw === 'string' && saRaw.trim().length > 0) {
    try {
      return JSON.parse(saRaw);
    } catch {
      return null;
    }
  }
  return null;
}

export default async function chatHandler(req: Request, res: Response) {
  // Support CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse request body safely
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body' });
    }
  }

  const { model, messages, systemInstruction } = body || {};

  // Valid model selection according to specification:
  // - gemini-3.1-pro-preview for complex tasks
  // - gemini-3.8-flash / gemini-3.5-flash / digizort-flash for general tasks (default)
  // - gemini-3.1-flash-lite for tasks that should happen fast
  const modelMap: Record<string, string> = {
    'digizort-flash': 'gemini-3.5-flash',
    'gemini-3.5-flash': 'gemini-3.5-flash',
    'gemini-3.8-flash': 'gemini-3.8-flash',
    'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
  };
  const targetModel = modelMap[model] || 'gemini-3.5-flash';

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Check for authentication credentials server-side
  const apiKey = getGeminiApiKey();
  const saCredentials = getServiceAccountCredentials();

  // If neither an API key nor Service Account is found, return a clear, actionable error
  // instead of allowing @google/genai to trigger GoogleAuth ADC failure ("Could not load the default credentials")
  if (!apiKey && !saCredentials) {
    return res.status(503).json({
      error:
        'AI service configuration notice: Missing GEMINI_API_KEY environment variable. Please configure GEMINI_API_KEY (or GOOGLE_API_KEY) in your Vercel Project Settings → Environment Variables to enable DIGIZORT AI chat.',
    });
  }

  try {
    let ai: GoogleGenAI;

    if (saCredentials) {
      // Vertex AI service-account authentication without requiring local ADC files
      ai = new GoogleGenAI({
        vertexai: true,
        project: saCredentials.project_id || process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        googleAuthOptions: {
          credentials: saCredentials,
        },
      });
    } else {
      // Standard Gemini API authentication with vertexai explicitly false to avoid ADC fallback
      ai = new GoogleGenAI({
        apiKey: apiKey!,
        vertexai: false,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || m.text || '') }],
    }));

    const defaultInstruction =
      'You are DIGIZORT AI, the official virtual concierge and assistant for the DIGIZORT Cash & Order Management System. You help users and administrators track orders, understand payment verification, audit balances and refunds, and answer questions clearly, professionally, and concisely in English or Hindi as preferred by the user.';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction || defaultInstruction,
      },
    });

    const reply = response.text || '';
    return res.json({ reply, model: targetModel });
  } catch (err: any) {
    console.error('Chat error:', err);
    const rawMsg = err?.message || 'Chat generation failed';

    // Intercept Google Cloud ADC or raw authentication error strings
    if (
      rawMsg.includes('Could not load the default credentials') ||
      rawMsg.includes('credentials') ||
      rawMsg.includes('API key not valid') ||
      rawMsg.includes('UNAUTHENTICATED')
    ) {
      return res.status(500).json({
        error:
          'AI authentication error: Server could not authenticate with Gemini. Please ensure a valid GEMINI_API_KEY or GOOGLE_API_KEY is configured in your Vercel Project Settings → Environment Variables.',
      });
    }

    return res.status(500).json({ error: rawMsg });
  }
}
