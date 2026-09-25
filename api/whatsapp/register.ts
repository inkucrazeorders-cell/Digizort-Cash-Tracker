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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return sendJsonResponse(res, 200, { success: true });
  }

  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, {
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { pin } = req.body || {};
    if (!pin || String(pin).length !== 6) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Invalid PIN',
        details: 'A 6-digit numeric PIN is required to register phone number with WhatsApp Cloud API.',
      });
    }

    const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    if (!token || !phoneNumberId) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing credentials',
        details: 'WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.',
      });
    }

    const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/register`;
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: String(pin),
      }),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return sendJsonResponse(res, response.status, {
        success: false,
        error: data?.error?.message || 'Failed to register with WhatsApp Cloud API',
        details: data?.error?.error_user_msg || data?.error?.details || JSON.stringify(data?.error || data),
      });
    }

    return sendJsonResponse(res, 200, {
      success: true,
      message: 'Phone number successfully registered with WhatsApp Cloud API!',
      data,
    });
  } catch (err: any) {
    return sendJsonResponse(res, 500, {
      success: false,
      error: 'Registration error',
      details: err?.message || 'Server error during WhatsApp registration.',
    });
  }
}
