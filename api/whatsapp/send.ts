import type { Request, Response } from 'express';
import { sendWhatsAppMessageCore } from './core';

// Helper to safely parse body across all Vercel serverless runtimes
async function getRequestBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  // Fallback if req.body was not pre-parsed by the runtime
  return new Promise((resolve) => {
    let data = '';
    if (typeof req.on !== 'function' || req.readableEnded) {
      return resolve({});
    }
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Helper to guarantee standard JSON response on Vercel Serverless
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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return sendJsonResponse(res, 200, { success: true, message: 'OPTIONS OK' });
  }

  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, {
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`,
      details: 'This endpoint only accepts POST requests for WhatsApp message delivery.',
    });
  }

  try {
    const body = await getRequestBody(req);
    const { to, message, requestId, customerName, template } = body || {};

    const result = await sendWhatsAppMessageCore({
      to,
      message,
      requestId,
      customerName,
      template,
    });

    if (result.success) {
      return sendJsonResponse(res, 200, result);
    } else {
      // Determine HTTP status: 400 for config/validation, 502 for upstream Meta reject
      const httpCode = result.code && Number(result.code) >= 400 && Number(result.code) < 500 ? 400 : 502;
      return sendJsonResponse(res, httpCode, result);
    }
  } catch (err: any) {
    console.error('[WhatsApp API Handler] Fatal error:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: 'WhatsApp API error',
      details: err?.message || 'Unknown internal server error while dispatching WhatsApp message.',
    });
  }
}
