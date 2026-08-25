// api/create-checkout.js
// Creates a Stripe Checkout session and returns the session ID to the frontend
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { priceId, productId, userId, email } = req.body;

  if (!priceId || !userId) {
    return res.status(400).json({ error: 'Missing priceId or userId' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, productId },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store.html?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store.html?cancelled=1`,
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
