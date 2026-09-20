import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasToken = !!process.env.WHATSAPP_API_TOKEN || !!process.env.WHATSAPP_ACCESS_TOKEN;
  const hasPhoneId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
  const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '8129043397';

  return res.status(200).json({
    configured: hasToken && hasPhoneId,
    hasToken,
    hasPhoneId,
    senderNumber,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    platform: 'vercel',
  });
}
