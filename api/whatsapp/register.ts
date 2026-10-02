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
    const { pin, action, code, codeMethod } = req.body || {};
    const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
    let apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    const matchVer = apiVersion.match(/v?(\d+)/);
    if (matchVer && Number(matchVer[1]) > 22) {
      apiVersion = 'v21.0';
    }

    if (!token || !phoneNumberId) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing credentials',
        details: 'WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured in server environment variables.',
      });
    }

    // 1. Request verification SMS code from Meta
    if (action === 'request_code') {
      const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/request_code`;
      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_method: codeMethod === 'VOICE' ? 'VOICE' : 'SMS',
          language: 'en',
        }),
      });

      const data: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return sendJsonResponse(res, response.status, {
          success: false,
          error: data?.error?.message || 'Failed to request verification code from Meta',
          details: data?.error?.error_user_msg || data?.error?.details || JSON.stringify(data?.error || data),
        });
      }
      return sendJsonResponse(res, 200, {
        success: true,
        message: 'Verification code requested from Meta! Check SMS on your phone.',
        data,
      });
    }

    // 2. Verify code received via SMS
    if (action === 'verify_code') {
      if (!code || String(code).trim().length < 4) {
        return sendJsonResponse(res, 400, {
          success: false,
          error: 'Invalid verification code',
          details: 'Please provide the numeric code received via SMS.',
        });
      }
      const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/verify_code`;
      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: String(code).trim(),
        }),
      });

      const data: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return sendJsonResponse(res, response.status, {
          success: false,
          error: data?.error?.message || 'Failed to verify code with Meta',
          details: data?.error?.error_user_msg || data?.error?.details || JSON.stringify(data?.error || data),
        });
      }
      return sendJsonResponse(res, 200, {
        success: true,
        message: 'Phone number code successfully verified with Meta! Now complete 6-digit PIN registration.',
        data,
      });
    }

    // 3. Register 6-digit PIN on Cloud API (default action)
    if (!pin || String(pin).replace(/\D/g, '').length !== 6) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Invalid PIN',
        details: 'A 6-digit numeric PIN is required to register phone number with WhatsApp Cloud API.',
      });
    }

    const cleanPin = String(pin).replace(/\D/g, '');
    const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/register`;
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: cleanPin,
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
