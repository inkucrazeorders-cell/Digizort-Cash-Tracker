import type { Request, Response } from 'express';

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
  // Always return JSON responses
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
    const { to, message, requestId, customerName } = body || {};

    if (!to || !message) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing required fields',
        details: 'Both "to" (phone number) and "message" are required.',
      });
    }

    // Format recipient phone number: remove non-digits, ensure country code (default 91 for India)
    let cleanedPhone = String(to).replace(/\D/g, '');
    if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
      cleanedPhone = cleanedPhone.slice(1);
    }
    if (cleanedPhone.length === 10) {
      cleanedPhone = `91${cleanedPhone}`;
    }

    if (cleanedPhone.length < 10) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Invalid recipient phone number format',
        details: `Phone number "${to}" is invalid. Please verify the customer mobile number.`,
      });
    }

    const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '507742449083763';
    const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '+91 8129043397';
    // API version configured to v26.0 as required
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v26.0';

    // Safe server-side debug logging: check env variables presence without exposing token
    console.log('[WhatsApp API Serverless] Environment check:', {
      hasToken: !!token,
      hasPhoneNumberId: !!phoneNumberId,
      hasBusinessAccountId: !!businessAccountId,
      configuredSenderNumber: senderNumber,
      apiVersion,
    });

    if (!token || !phoneNumberId) {
      console.warn('[WhatsApp API Serverless] Missing credentials: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'WhatsApp API error: Missing credentials',
        details:
          'WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured in Vercel Environment Variables. Verify settings in Vercel Dashboard → Project Settings → Environment Variables.',
      });
    }

    // Construct Meta WhatsApp Business Cloud API request URL
    const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    console.log('[WhatsApp API Serverless] Calling endpoint:', metaUrl, `to: ${cleanedPhone}`);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const statusCode = metaResponse.status;
    let data: any = {};
    const rawText = await metaResponse.text();

    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    // Log response status and body (NEVER logging the token)
    console.log(`[WhatsApp API Serverless] Meta API HTTP ${statusCode} response:`, JSON.stringify(data));

    if (!metaResponse.ok) {
      let errorMsg =
        data?.error?.message ||
        data?.error?.error_data?.details ||
        `WhatsApp Cloud API returned error (HTTP ${statusCode})`;
      let details = data?.error?.error_user_msg || data?.error?.details || JSON.stringify(data?.error || data);

      const isUnregistered =
        data?.error?.code === 133010 ||
        errorMsg.includes('133010') ||
        errorMsg.includes('Account not registered');

      if (isUnregistered) {
        errorMsg = 'Sender number (+91 8129043397) is active on WhatsApp Business Mobile App.';
        details = 'Meta Cloud API requires 2-step PIN registration, OR you can send directly via your WhatsApp app with 1 tap.';
      }

      const httpCode = statusCode >= 400 && statusCode < 500 ? statusCode : 502;
      return sendJsonResponse(res, httpCode, {
        success: false,
        error: errorMsg,
        code: data?.error?.code,
        details: details,
        isUnregistered,
      });
    }

    const messageId = data?.messages?.[0]?.id || 'delivered';

    return sendJsonResponse(res, 200, {
      success: true,
      message: 'WhatsApp message sent successfully',
      message_id: messageId,
      recipient: cleanedPhone,
      customer_name: customerName || 'Customer',
      request_id: requestId || 'N/A',
    });
  } catch (err: any) {
    console.error('[WhatsApp API Serverless] Fatal error:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: 'WhatsApp API error',
      details: err?.message || 'Unknown internal server error while dispatching WhatsApp message.',
    });
  }
}
