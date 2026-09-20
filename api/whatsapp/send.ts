import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Support CORS for preflight & cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`,
    });
  }

  try {
    const { to, message, requestId, customerName } = req.body || {};

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: both "to" (phone number) and "message" are required.',
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
      return res.status(400).json({
        success: false,
        error: `Invalid recipient phone number format: "${to}". Please verify customer mobile number.`,
      });
    }

    const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    if (!token || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        code: 'CREDENTIALS_REQUIRED',
        error:
          'WhatsApp Cloud API credentials are not configured in Vercel environment variables. Please set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID, or use direct WhatsApp sharing.',
        configured: false,
      });
    }

    // Send message via Meta WhatsApp Business Cloud API
    const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
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

    const data = await metaResponse.json();

    if (!metaResponse.ok) {
      const errorDetail =
        data?.error?.message ||
        data?.error?.error_data?.details ||
        `WhatsApp Cloud API returned error code ${metaResponse.status}`;
      return res.status(metaResponse.status >= 400 && metaResponse.status < 500 ? metaResponse.status : 502).json({
        success: false,
        error: errorDetail,
        metaErrorCode: data?.error?.code,
        details: data?.error,
      });
    }

    const messageId = data?.messages?.[0]?.id || 'delivered';

    return res.status(200).json({
      success: true,
      messageId,
      recipient: cleanedPhone,
      customerName: customerName || 'Customer',
      requestId: requestId || 'N/A',
      status: 'accepted',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error dispatching WhatsApp message.',
    });
  }
}
