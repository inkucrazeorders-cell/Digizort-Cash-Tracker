import type { Request, Response } from 'express';
import { getWhatsAppConfigStatus } from './core';

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

  const config = getWhatsAppConfigStatus();
  let liveMeta: any = null;

  if (config.configured) {
    try {
      const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
      const apiVersion = config.apiVersion || 'v21.0';
      const metaUrl = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,status`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3500),
      });
      if (metaRes.ok) {
        liveMeta = await metaRes.json();
      }
    } catch {
      liveMeta = null;
    }
  }

  return sendJsonResponse(res, 200, {
    ...config,
    liveMeta,
    isMetaConnected: liveMeta?.status === 'CONNECTED',
    platform: 'vercel',
  });
}
