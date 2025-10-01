const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Price IDs for subscription plans (replace with your actual Stripe price IDs)
const PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic_monthly',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
};

// Create checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId, userId, userEmail } = req.body;
    
    if (!PRICE_IDS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/subscription-dashboard?session_id={CHECKOUT_SESSION_ID}&success=true&plan=${planId}`,
      cancel_url: `${req.headers.origin}/subscription-dashboard?canceled=true`,
      metadata: {
        userId: userId,
        planId: planId
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId
        }
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify session and get details
app.post('/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      res.json({
        success: true,
        subscription: session.subscription,
        customer: session.customer,
        metadata: session.metadata
      });
    } else {
      res.json({ success: false, message: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle Stripe events
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment succeeded:', session.id);
      // Here you would update your database with the successful payment
      break;
    case 'invoice.payment_failed':
      const invoice = event.data.object;
      console.log('Payment failed:', invoice.id);
      // Here you would handle failed payments
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Stripe server running on port ${PORT}`);
  console.log(`Make sure to set your Stripe secret key in environment variables`);
});