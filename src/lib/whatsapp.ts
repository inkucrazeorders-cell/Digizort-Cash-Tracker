/**
 * Client-Side WhatsApp Helper Utilities
 * Dispatches messages via the secure backend route (/api/whatsapp/send)
 * NEVER handles or exposes secret API tokens on the client.
 */

/**
 * Normalizes phone numbers to standard E.164 digits without leading plus.
 * E.g.: '+91 81290 43397' -> '918129043397'
 *       '8129043397'      -> '918129043397' (defaults 10-digit Indian numbers to 91)
 *       '08129043397'     -> '918129043397'
 *       '918129043397'    -> '918129043397'
 */
export function normalizeWhatsAppNumber(rawPhone?: string | number | null): string | null {
  if (!rawPhone) return null;
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  // Remove leading zeros
  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Prepend India country code if 10-digit standard Indian mobile
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  // Valid international numbers must be between 10 and 15 digits
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Formats the official WhatsApp confirmation message for WORKFLOW 2 (New Customer Submission).
 */
export function formatSubmissionWhatsAppMessage(params: {
  customerName: string;
  requestId: string;
  productName: string;
  amount: number;
  currencySymbol?: string;
  submittedAt?: Date | string;
}): string {
  const dateObj = params.submittedAt ? new Date(params.submittedAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDateTime = `${dateStr} at ${timeStr}`;
  const sym = params.currencySymbol || '₹';
  const formattedAmount = `${sym}${params.amount.toLocaleString('en-IN')}`;

  return `DIGIZORT — REQUEST SUBMITTED

Hello ${params.customerName} 👋

Thank you for submitting your request to DIGIZORT.

📋 REQUEST DETAILS

Request ID: #${params.requestId}
Product / Service: ${params.productName}
Requested Amount: ${formattedAmount}
Submitted On: ${formattedDateTime}

✅ Your request has been successfully submitted.

Our team will now evaluate and verify your request.

Please wait for further updates from the DIGIZORT team. We will notify you when there is an update regarding your request.

Thank you for choosing DIGIZORT.

Make world with amazing technology.`;
}

/**
 * Dispatches a WhatsApp message via the secure server-side API endpoint (/api/whatsapp/send).
 */
export async function sendWhatsAppViaServer(params: {
  to: string;
  message: string;
  requestId?: string;
  customerName?: string;
  template?: any;
}): Promise<{
  success: boolean;
  messageId?: string;
  recipient?: string;
  error?: string;
  details?: string;
  isUnregistered?: boolean;
  isWindowExpired?: boolean;
}> {
  const normalizedPhone = normalizeWhatsAppNumber(params.to);
  if (!normalizedPhone) {
    return {
      success: false,
      error: 'Invalid recipient phone number format',
      details: `Phone number "${params.to}" is missing or invalid. Please check customer profile.`,
    };
  }

  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: normalizedPhone,
        message: params.message,
        requestId: params.requestId,
        customerName: params.customerName,
        template: params.template,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!data) {
      const rawText = await response.text();
      const snippet = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      return {
        success: false,
        error: `Server HTTP ${response.status}`,
        details: snippet || 'Backend endpoint /api/whatsapp/send returned a non-JSON response.',
      };
    }

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: data.message_id || data.messageId || 'sent',
        recipient: normalizedPhone,
      };
    }

    return {
      success: false,
      error: data.error || 'WhatsApp delivery failed',
      details: data.details || 'Meta WhatsApp Cloud API rejected the request.',
      isUnregistered: !!data.isUnregistered,
      isWindowExpired: !!data.isWindowExpired,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Network connection failure',
      details: err?.message || 'Could not reach server endpoint /api/whatsapp/send.',
    };
  }
}

/**
 * Checks WhatsApp Cloud API configuration status from the server without exposing secrets.
 */
export async function fetchWhatsAppConfigStatus(): Promise<{
  configured: boolean;
  hasToken: boolean;
  hasPhoneId: boolean;
  senderNumber?: string;
  apiVersion?: string;
}> {
  try {
    const res = await fetch('/api/whatsapp/status', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return { configured: false, hasToken: false, hasPhoneId: false };
    }
    const data = await res.json();
    return {
      configured: !!data.configured,
      hasToken: !!data.hasToken,
      hasPhoneId: !!data.hasPhoneId,
      senderNumber: data.senderNumber,
      apiVersion: data.apiVersion,
    };
  } catch {
    return { configured: false, hasToken: false, hasPhoneId: false };
  }
}
