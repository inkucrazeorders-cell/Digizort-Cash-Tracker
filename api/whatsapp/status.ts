import type { Request, Response } from 'express';

function sendJsonResponse(res: any, statusCode: number, data: any) {
  res.setHeader('Content-Type', 'application/json');
  if (typeof res.status === 'function') {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }

  if (typeof res.json === 'function') {
    res.json(data);
  } else {
    res.end(JSON.stringify(data));
  }
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return sendJsonResponse(res, 200, { success: true, message: 'OPTIONS OK' });
  }

  const hasToken = !!process.env.WHATSAPP_API_TOKEN || !!process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '507742449083763';
  const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '+91 8129043397';
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v26.0';

  return sendJsonResponse(res, 200, {
    configured: hasToken && !!phoneNumberId,
    hasToken,
    hasPhoneId: !!phoneNumberId,
    phoneNumberId,
    hasBusinessAccountId: !!businessAccountId,
    businessAccountId,
    senderNumber,
    apiVersion,
    platform: 'vercel',
  });
}
