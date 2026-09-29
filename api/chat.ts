import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export default async function chatHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { model, messages, systemInstruction } = req.body || {};

  // Valid model selection according to specification:
  // - gemini-3.1-pro-preview for complex tasks
  // - gemini-3.5-flash for general tasks (default)
  // - gemini-3.1-flash-lite for tasks that should happen fast
  const validModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  const targetModel = validModels.includes(model) ? model : 'gemini-3.5-flash';

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
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
    return res.status(500).json({ error: err?.message || 'Chat generation failed' });
  }
}
