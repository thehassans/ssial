import express from 'express';
import crypto from 'crypto';
import { auth, allowRoles } from '../middleware/auth.js';

const router = express.Router();

const MOYASAR_API_KEY = process.env.MOYASAR_SECRET_KEY;
const MOYASAR_PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY;
const MOYASAR_API_URL = 'https://api.moyasar.com/v1';

async function updateWebOrderFromPayment(payment) {
  try {
    const WebOrder = (await import('../models/WebOrder.js')).default;
    const webOrderId = payment?.metadata?.webOrderId || payment?.metadata?.web_order_id;
    if (!webOrderId) return;
    const status = String(payment?.status || '');
    const paymentStatus = status === 'paid' ? 'paid' : status === 'failed' ? 'failed' : 'pending';
    const method = String(payment?.source?.type || '');
    await WebOrder.findByIdAndUpdate(webOrderId, {
      paymentStatus,
      ...(method ? { paymentMethod: method } : {}),
      paymentId: payment?.id || null,
      paymentDetails: payment || {},
    });
  } catch (e) {
    console.error('Failed to update WebOrder from payment:', e);
  }
}

// Get publishable key for frontend
router.get('/config', (req, res) => {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '');
  const callbackUrl = host ? `${proto}://${host}/api/moyasar/callback` : '/api/moyasar/callback';
  res.json({
    publishableKey: MOYASAR_PUBLISHABLE_KEY,
    currency: 'SAR',
    callbackUrl,
  });
});

// Create a payment
router.post('/create-payment', async (req, res) => {
  try {
    const { amount, description, callbackUrl, metadata, source } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Amount should be in halalas (1 SAR = 100 halalas)
    const amountInHalalas = Math.round(amount * 100);

    const paymentData = {
      amount: amountInHalalas,
      currency: 'SAR',
      description: description || 'Order Payment',
      callback_url: callbackUrl,
      source: source, // { type: 'mada', ... } or { type: 'applepay', ... }
      metadata: metadata || {}
    };

    const response = await fetch(`${MOYASAR_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error('Moyasar payment creation failed:', payment);
      return res.status(response.status).json({ 
        error: payment.message || 'Payment creation failed',
        details: payment.errors 
      });
    }

    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount / 100, // Convert back to SAR
      currency: payment.currency,
      source: payment.source,
      transactionUrl: payment.source?.transaction_url
    });
  } catch (error) {
    console.error('Moyasar create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Verify payment status
router.get('/verify/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`
      }
    });

    const payment = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: payment.message || 'Payment verification failed' 
      });
    }

    if (String(req.query.apply || '') === '1') {
      await updateWebOrderFromPayment(payment);
    }

    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount / 100,
      currency: payment.currency,
      source: {
        type: payment.source?.type,
        company: payment.source?.company,
        name: payment.source?.name,
        message: payment.source?.message
      },
      metadata: payment.metadata,
      createdAt: payment.created_at
    });
  } catch (error) {
    console.error('Moyasar verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Webhook handler for payment callbacks
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-moyasar-signature'];
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const payload =
        req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid Moyasar webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    console.log('Moyasar webhook received:', event.type, event.data?.id);

    // Handle different event types
    switch (event.type) {
      case 'payment_paid':
        // Payment was successful
        await handlePaymentSuccess(event.data);
        break;
      case 'payment_failed':
        // Payment failed
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log('Unhandled Moyasar event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Moyasar webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment callback URL handler (redirect after 3DS)
router.get('/callback', async (req, res) => {
  try {
    const { id, status, message } = req.query;
    
    // Redirect to frontend with payment result
    const frontendUrl = process.env.FRONTEND_URL || '';
    const redirectUrl = `${frontendUrl}/checkout/payment-result?id=${id}&status=${status}&message=${encodeURIComponent(message || '')}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect('/checkout?error=payment_failed');
  }
});

// Helper functions
async function handlePaymentSuccess(paymentData) {
  try {
    await updateWebOrderFromPayment(paymentData);
    try {
      const Order = (await import('../models/Order.js')).default;
      const orderId = paymentData.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          'paymentDetails.moyasarPaymentId': paymentData.id,
          'paymentDetails.paidAt': new Date()
        });
      }
    } catch {}
  } catch (error) {
    console.error('Handle payment success error:', error);
  }
}

async function handlePaymentFailed(paymentData) {
  try {
    await updateWebOrderFromPayment(paymentData);
    try {
      const Order = (await import('../models/Order.js')).default;
      const orderId = paymentData.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'failed',
          'paymentDetails.failureReason': paymentData.source?.message
        });
      }
    } catch {}
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

// Initialize Apple Pay session
router.post('/applepay/session', async (req, res) => {
  try {
    const { validationUrl } = req.body;

    // Request Apple Pay session from Moyasar
    const response = await fetch(`${MOYASAR_API_URL}/applepay/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        validation_url: validationUrl,
        display_name: process.env.STORE_NAME || 'BuySial Store',
        domain_name: process.env.APPLE_PAY_DOMAIN || req.get('host')
      })
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Apple Pay session creation failed:', session);
      return res.status(response.status).json({ error: session.message });
    }

    res.json(session);
  } catch (error) {
    console.error('Apple Pay session error:', error);
    res.status(500).json({ error: 'Failed to create Apple Pay session' });
  }
});

router.post('/link-weborder', auth, allowRoles('customer'), async (req, res) => {
  try {
    const { webOrderId, paymentId, paymentDetails, paymentMethod, paymentStatus } = req.body || {};
    if (!webOrderId) return res.status(400).json({ error: 'webOrderId is required' });
    const WebOrder = (await import('../models/WebOrder.js')).default;
    const ord = await WebOrder.findOne({ _id: webOrderId, customerId: req.user.id });
    if (!ord) return res.status(404).json({ error: 'Order not found' });
    if (paymentMethod) ord.paymentMethod = String(paymentMethod);
    if (paymentStatus) ord.paymentStatus = String(paymentStatus);
    if (paymentId) ord.paymentId = String(paymentId);
    if (paymentDetails) ord.paymentDetails = paymentDetails;
    ord.markModified('paymentDetails');
    await ord.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});

router.post('/stcpay/initiate', auth, allowRoles('customer'), async (req, res) => {
  try {
    const { webOrderId, mobile } = req.body || {};
    if (!webOrderId) return res.status(400).json({ error: 'webOrderId is required' });
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });

    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || '');
    const callbackUrl = host ? `${proto}://${host}/api/moyasar/callback` : undefined;

    const WebOrder = (await import('../models/WebOrder.js')).default;
    const ord = await WebOrder.findOne({ _id: webOrderId, customerId: req.user.id }).lean();
    if (!ord) return res.status(404).json({ error: 'Order not found' });

    const amountInHalalas = Math.round(Number(ord.total || 0) * 100);
    if (!amountInHalalas || amountInHalalas < 1) return res.status(400).json({ error: 'Invalid amount' });

    const payload = {
      publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
      amount: amountInHalalas,
      currency: String(ord.currency || 'SAR'),
      description: `WebOrder ${String(ord._id)}`,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      metadata: { webOrderId: String(ord._id) },
      source: {
        type: 'stcpay',
        mobile: String(mobile),
        cashier: process.env.MOYASAR_STCPAY_CASHIER || 'cashier_1',
      },
    };

    const response = await fetch(`${MOYASAR_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const payment = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: payment.message || 'Payment initiation failed', details: payment.errors });
    }

    await (await import('../models/WebOrder.js')).default.findByIdAndUpdate(webOrderId, {
      paymentMethod: 'stcpay',
      paymentStatus: String(payment.status || 'pending'),
      paymentId: payment.id,
      paymentDetails: payment,
    });

    res.json({
      id: payment.id,
      status: payment.status,
      transactionUrl: payment.source?.transaction_url,
      referenceNumber: payment.source?.reference_number,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to initiate STC Pay' });
  }
});

router.post('/stcpay/proceed', auth, allowRoles('customer'), async (req, res) => {
  try {
    const { webOrderId, transactionUrl, otpValue } = req.body || {};
    if (!webOrderId) return res.status(400).json({ error: 'webOrderId is required' });
    if (!transactionUrl) return res.status(400).json({ error: 'transactionUrl is required' });
    if (!otpValue) return res.status(400).json({ error: 'otpValue is required' });

    const WebOrder = (await import('../models/WebOrder.js')).default;
    const ord = await WebOrder.findOne({ _id: webOrderId, customerId: req.user.id });
    if (!ord) return res.status(404).json({ error: 'Order not found' });

    const url = String(transactionUrl);
    if (!url.startsWith(`${MOYASAR_API_URL}/stc_pays/`)) {
      return res.status(400).json({ error: 'Invalid transactionUrl' });
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ otp_value: otpValue })
    });
    const payment = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: payment.message || 'OTP confirmation failed', details: payment.errors });
    }

    await updateWebOrderFromPayment(payment);
    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount / 100,
      currency: payment.currency,
      source: {
        type: payment.source?.type,
        message: payment.source?.message,
      },
      metadata: payment.metadata,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to proceed STC Pay' });
  }
});

export default router;
