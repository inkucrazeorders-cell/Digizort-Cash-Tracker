import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Status & configuration check for WhatsApp Cloud API (Safe, no secrets exposed)
  app.get('/api/whatsapp/status', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const hasToken = !!process.env.WHATSAPP_API_TOKEN || !!process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '507742449083763';
    const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '+91 8129043397';
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v26.0';

    res.json({
      configured: hasToken && !!phoneNumberId,
      hasToken,
      hasPhoneId: !!phoneNumberId,
      phoneNumberId,
      hasBusinessAccountId: !!businessAccountId,
      businessAccountId,
      senderNumber,
      apiVersion,
      platform: 'express',
    });
  });

  // Automated WhatsApp message dispatch endpoint via WhatsApp Cloud API
  app.post('/api/whatsapp/send', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { to, message, requestId, customerName } = req.body || {};

      if (!to || !message) {
        return res.status(400).json({
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
        return res.status(400).json({
          success: false,
          error: 'Invalid recipient phone number format',
          details: `Phone number "${to}" is invalid. Please verify the customer mobile number.`,
        });
      }

      const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
      const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '507742449083763';
      const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '+91 8129043397';
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v26.0';

      // Safe server-side debug logging: check env variables presence without exposing token
      console.log('[WhatsApp API Server] Environment check:', {
        hasToken: !!token,
        hasPhoneNumberId: !!phoneNumberId,
        hasBusinessAccountId: !!businessAccountId,
        configuredSenderNumber: senderNumber,
        apiVersion,
      });

      if (!token || !phoneNumberId) {
        console.warn('[WhatsApp API Server] Missing credentials: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
        return res.status(400).json({
          success: false,
          error: 'WhatsApp API error: Missing credentials',
          details:
            'WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured in environment variables.',
        });
      }

      // Send message via Meta WhatsApp Business Cloud API
      const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      console.log('[WhatsApp API Server] Calling endpoint:', metaUrl, `to: ${cleanedPhone}`);

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
      console.log(`[WhatsApp API Server] Meta API HTTP ${statusCode} response:`, JSON.stringify(data));

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

        return res.status(statusCode >= 400 && statusCode < 500 ? statusCode : 502).json({
          success: false,
          error: errorMsg,
          code: data?.error?.code,
          details: details,
          isUnregistered,
        });
      }

      const messageId = data?.messages?.[0]?.id || 'delivered';
      console.log(`[WhatsApp API Server] Message sent to ${cleanedPhone} (ID: ${messageId})`);

      return res.status(200).json({
        success: true,
        message: 'WhatsApp message sent successfully',
        message_id: messageId,
        recipient: cleanedPhone,
        customer_name: customerName || 'Customer',
        request_id: requestId || 'N/A',
      });
    } catch (err: any) {
      console.error('[WhatsApp API Server] Fatal error:', err);
      return res.status(500).json({
        success: false,
        error: 'WhatsApp API error',
        details: err?.message || 'Server error occurred while dispatching WhatsApp message.',
      });
    }
  });

  // Register phone number with WhatsApp Cloud API using 6-digit PIN
  app.post('/api/whatsapp/register', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { pin } = req.body || {};
      if (!pin || String(pin).length !== 6) {
        return res.status(400).json({
          success: false,
          error: 'Invalid PIN',
          details: 'A 6-digit numeric PIN is required for WhatsApp Cloud API registration.',
        });
      }

      const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '496013146934162';
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v26.0';

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
        return res.status(response.status).json({
          success: false,
          error: data?.error?.message || 'Failed to register with WhatsApp Cloud API',
          details: data?.error?.error_user_msg || data?.error?.details || JSON.stringify(data?.error || data),
        });
      }

      return res.json({
        success: true,
        message: 'Phone number successfully registered with WhatsApp Cloud API!',
        data,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Registration error',
        details: err?.message || 'Server error during registration.',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
