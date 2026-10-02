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
  directWhatsAppUrl: string;
}> {
  const normalizedPhone = normalizeWhatsAppNumber(params.to);
  const fallbackUrl = `https://wa.me/${normalizedPhone || ''}?text=${encodeURIComponent(params.message || '')}`;

  if (!normalizedPhone) {
    return {
      success: false,
      error: 'Invalid recipient phone number format',
      details: `Phone number "${params.to}" is missing or invalid. Please check customer profile.`,
      directWhatsAppUrl: fallbackUrl,
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

    let data: any = null;
    try {
      const rawText = await response.text();
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!data) {
      return {
        success: false,
        error: `Server HTTP ${response.status}`,
        details: 'Backend endpoint /api/whatsapp/send returned an unexpected response.',
        directWhatsAppUrl: fallbackUrl,
      };
    }

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: data.message_id || data.messageId || 'sent',
        recipient: normalizedPhone,
        directWhatsAppUrl: fallbackUrl,
      };
    }

    return {
      success: false,
      error: data.error || 'WhatsApp delivery failed',
      details: data.details || 'Meta WhatsApp Cloud API rejected the request.',
      isUnregistered: !!data.isUnregistered,
      isWindowExpired: !!data.isWindowExpired,
      directWhatsAppUrl: data.directWhatsAppUrl || fallbackUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Network connection failure',
      details: err?.message || 'Could not reach server endpoint /api/whatsapp/send.',
      directWhatsAppUrl: fallbackUrl,
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

/**
 * Formats the official DIGIZORT WhatsApp Welcome message with password security notice.
 * NEVER includes plaintext passwords.
 */
export function formatWelcomeAuthWhatsAppMessage(params: {
  customerName: string;
  mobileNumber: string;
  userId: string;
}): string {
  return `DIGIZORT

Welcome to DIGIZORT, ${params.customerName}! 👋

Your DIGIZORT account has been successfully secured with password login.

Account Details:
━━━━━━━━━━━━━━
Name: ${params.customerName}
Mobile: ${params.mobileNumber}
Account ID: ${params.userId}
━━━━━━━━━━━━━━

You can now securely access your DIGIZORT User Portal using your registered mobile number and password.

🔐 Password: For your security, your password is never displayed or sent through WhatsApp.

If you forgot your password, use the "Forgot Password?" option on the DIGIZORT login page.

Thank you for using DIGIZORT.

Make world with amazing technology.

— DIGIZORT Team`;
}

/**
 * Formats the official DIGIZORT WhatsApp Security Upgrade message for existing users.
 * NEVER includes plaintext passwords.
 */
export function formatPasswordUpgradedWhatsAppMessage(params: {
  customerName: string;
  mobileNumber: string;
  userId: string;
}): string {
  return `DIGIZORT

Hello ${params.customerName}! 👋

Your DIGIZORT account security has been successfully upgraded.

Your account now uses secure password login.

Account:
Name: ${params.customerName}
Mobile: ${params.mobileNumber}
Account ID: ${params.userId}

🔐 Your password is private and is not displayed or sent by DIGIZORT.

Please keep your password secure and do not share it with anyone.

You can use "Forgot Password?" on the login page if you ever need to reset it.

Welcome to the upgraded DIGIZORT experience.

— DIGIZORT Team`;
}

/**
 * Formats the official DIGIZORT WhatsApp message when payment verification is approved (Section 22).
 */
export function formatPaymentVerifiedWhatsAppMessage(params: {
  customerName: string;
  requestId: string;
  paymentMethod: string;
  amount: number;
  currencySymbol?: string;
}): string {
  const sym = params.currencySymbol || '₹';
  return `DIGIZORT

Hello ${params.customerName} 👋

Your payment verification for Request #${params.requestId} has been completed.

Payment Method: ${params.paymentMethod}
Amount: ${sym}${params.amount.toLocaleString('en-IN')}
Status: VERIFIED ✓

Your payment has been successfully recorded by DIGIZORT.

Thank you for using DIGIZORT.

— DIGIZORT Team`;
}

/**
 * Formats the official DIGIZORT WhatsApp message when payment verification is rejected (Section 22).
 */
export function formatPaymentRejectedWhatsAppMessage(params: {
  customerName: string;
  requestId: string;
  paymentMethod: string;
  amount: number;
  reason: string;
  currencySymbol?: string;
}): string {
  const sym = params.currencySymbol || '₹';
  return `DIGIZORT

Hello ${params.customerName} 👋

Your payment verification for Request #${params.requestId} could not be verified.

Payment Method: ${params.paymentMethod}
Amount: ${sym}${params.amount.toLocaleString('en-IN')}

Reason:
${params.reason}

Please review the payment details and submit a new verification request if required.

— DIGIZORT Team`;
}
