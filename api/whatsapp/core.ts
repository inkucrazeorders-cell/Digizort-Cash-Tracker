/**
 * Core WhatsApp Cloud API Service
 * Centralized, secure server-side logic for dispatching WhatsApp messages via Meta Graph API.
 * 
 * IMPORTANT: This file runs ONLY on the server (Node / Express / Vercel Serverless).
 * Secrets such as WHATSAPP_API_TOKEN are NEVER exposed to the client browser.
 */

export interface WhatsAppConfig {
  hasToken: boolean;
  hasPhoneId: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  senderNumber: string;
  apiVersion: string;
  configured: boolean;
}

export interface SendWhatsAppResult {
  success: boolean;
  message?: string;
  message_id?: string;
  recipient?: string;
  request_id?: string;
  customer_name?: string;
  error?: string;
  code?: number | string;
  details?: string;
  isUnregistered?: boolean;
  isWindowExpired?: boolean;
}

/**
 * Normalizes phone numbers to standard E.164 without leading plus.
 * Handles Indian numbers (10 digits -> prepends 91), strips leading 0s, symbols, and spaces.
 */
export function normalizeRecipientPhone(rawPhone?: string | number | null): string | null {
  if (!rawPhone) return null;
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  // Strip leading zeroes (e.g. 09876543210 -> 9876543210)
  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // If 10 digits, default to India country code 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  // International WhatsApp numbers range from 10 to 15 digits
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Retrieves the current WhatsApp configuration status safely without exposing secrets.
 */
export function getWhatsAppConfigStatus(): WhatsAppConfig {
  const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '507742449083763';
  const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '+91 8129043397';
  // Use configured API version or stable current default v21.0
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

  const hasToken = !!token && token.trim().length > 0;
  const hasPhoneId = !!phoneNumberId && phoneNumberId.trim().length > 0;

  return {
    hasToken,
    hasPhoneId,
    phoneNumberId,
    businessAccountId,
    senderNumber,
    apiVersion,
    configured: hasToken && hasPhoneId,
  };
}

/**
 * Dispatches a WhatsApp message using the Meta WhatsApp Business Cloud API.
 * Runs strictly server-side.
 */
export async function sendWhatsAppMessageCore(params: {
  to: string;
  message: string;
  requestId?: string;
  customerName?: string;
  template?: {
    name: string;
    language?: { code: string };
    components?: any[];
  };
}): Promise<SendWhatsAppResult> {
  const { to, message, requestId, customerName, template } = params;

  if (!to || (!message && !template)) {
    return {
      success: false,
      error: 'Missing required parameters',
      details: 'Recipient phone number and message text (or template) are required.',
    };
  }

  const cleanedPhone = normalizeRecipientPhone(to);
  if (!cleanedPhone) {
    return {
      success: false,
      error: 'Invalid recipient phone number format',
      details: `Phone number "${to}" could not be normalized into a valid WhatsApp mobile number.`,
    };
  }

  const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

  // Server-side audit log (NEVER logs the token)
  console.log('[WhatsApp Cloud API] Dispatching message:', {
    to: cleanedPhone,
    requestId: requestId || 'N/A',
    hasToken: !!token,
    phoneNumberId,
    apiVersion,
  });

  if (!token || !phoneNumberId) {
    console.warn('[WhatsApp Cloud API] Missing environment variables: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
    return {
      success: false,
      error: 'WhatsApp automation is not configured. Add the required server-side environment variables.',
      details:
        'WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set in your Vercel Project Settings → Environment Variables.',
    };
  }

  const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  // Build Meta API payload: support template if provided/configured, otherwise text message
  let payload: any;
  if (template && template.name) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanedPhone,
      type: 'template',
      template: {
        name: template.name,
        language: template.language || { code: 'en' },
        components: template.components || [],
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };
  }

  try {
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

    console.log(`[WhatsApp Cloud API] Meta API HTTP ${statusCode} response:`, JSON.stringify(data));

    if (!metaResponse.ok) {
      const errCode = data?.error?.code;
      let errorMsg = data?.error?.message || `WhatsApp Cloud API error (HTTP ${statusCode})`;
      let details = data?.error?.error_user_msg || data?.error?.details || JSON.stringify(data?.error || data);

      const isUnregistered =
        errCode === 133010 ||
        errorMsg.includes('133010') ||
        errorMsg.toLowerCase().includes('account not registered');

      const isWindowExpired =
        errCode === 131047 ||
        errorMsg.includes('131047') ||
        errorMsg.toLowerCase().includes('24 hours');

      if (isUnregistered) {
        errorMsg = 'Sender number is not registered on WhatsApp Cloud API (Code 133010)';
        details =
          'The sender number (+91 8129043397) has not completed Cloud API registration or is active on the mobile app. Complete registration in Meta WhatsApp Business Manager.';
      } else if (isWindowExpired) {
        errorMsg = 'Meta 24-hour customer window restriction (Code 131047)';
        details =
          'Freeform WhatsApp messages can only be sent within 24 hours of customer interaction. Outside 24 hours, an approved WhatsApp Message Template is required.';
      } else if (errCode === 190 || errCode === 102) {
        errorMsg = 'Invalid or expired WhatsApp API Token';
        details =
          'The WHATSAPP_API_TOKEN in server environment variables is invalid or expired. Generate a permanent System User Token in Meta Business Suite.';
      }

      return {
        success: false,
        error: errorMsg,
        code: errCode,
        details: details,
        isUnregistered,
        isWindowExpired,
      };
    }

    const messageId = data?.messages?.[0]?.id || 'delivered';
    console.log(`[WhatsApp Cloud API] Successfully dispatched message to ${cleanedPhone} (ID: ${messageId})`);

    return {
      success: true,
      message: 'WhatsApp message sent successfully',
      message_id: messageId,
      recipient: cleanedPhone,
      request_id: requestId || 'N/A',
      customer_name: customerName || 'Customer',
    };
  } catch (fetchErr: any) {
    console.error('[WhatsApp Cloud API] Network error during Meta API fetch:', fetchErr);
    return {
      success: false,
      error: 'WhatsApp network connection failure',
      details: fetchErr?.message || 'Failed to establish connection with Meta WhatsApp Cloud API servers.',
    };
  }
}
