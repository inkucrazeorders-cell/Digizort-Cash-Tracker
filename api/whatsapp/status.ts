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

  return sendJsonResponse(res, 200, {
    ...config,
    platform: 'vercel',
  });
}
