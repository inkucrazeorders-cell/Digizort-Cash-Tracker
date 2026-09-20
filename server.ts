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
    const hasToken = !!process.env.WHATSAPP_API_TOKEN || !!process.env.WHATSAPP_ACCESS_TOKEN;
    const hasPhoneId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    const senderNumber = process.env.WHATSAPP_SENDER_NUMBER || '8129043397';

    res.json({
      configured: hasToken && hasPhoneId,
      hasToken,
      hasPhoneId,
      senderNumber,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    });
  });

  // Automated WhatsApp message dispatch endpoint via WhatsApp Cloud API
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const { to, message, requestId, customerName } = req.body;

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

      // If credentials are not configured, reject with clear instructions so the message is not falsely marked as sent
      if (!token || !phoneNumberId) {
        return res.status(400).json({
          success: false,
          code: 'CREDENTIALS_REQUIRED',
          error:
            'WhatsApp Cloud API credentials are not yet configured. Please set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your environment variables.',
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
        console.error('Meta WhatsApp Cloud API error:', data);
        return res.status(metaResponse.status >= 400 && metaResponse.status < 500 ? metaResponse.status : 502).json({
          success: false,
          error: errorDetail,
          metaErrorCode: data?.error?.code,
          details: data?.error,
        });
      }

      const messageId = data?.messages?.[0]?.id || 'delivered';
      console.log(`WhatsApp message dispatched successfully to ${cleanedPhone} (ID: ${messageId})`);

      return res.json({
        success: true,
        messageId,
        recipient: cleanedPhone,
        customerName: customerName || 'Customer',
        requestId: requestId || 'N/A',
        status: 'accepted',
      });
    } catch (err: any) {
      console.error('Server error dispatching WhatsApp message:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Server error occurred while dispatching WhatsApp message.',
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
