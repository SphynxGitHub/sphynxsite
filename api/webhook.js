// api/webhook.js
// Receives Stripe payment events, records purchases in Supabase, triggers Zapier
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — can bypass RLS
);

export const config = { api: { bodyParser: false } }; // Stripe needs raw body

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, productId } = session.metadata;
    const amountPaid = session.amount_total; // in cents
    const customerEmail = session.customer_email || session.customer_details?.email;

    try {
      // 1. Record purchase in Supabase
      const { error: purchaseError } = await supabase.from('purchases').insert({
        user_id: userId,
        product_id: productId,
        amount_paid: amountPaid,
        stripe_session_id: session.id,
        purchased_at: new Date().toISOString(),
      });
      if (purchaseError) throw purchaseError;

      // 2. Get product details for the email
      const { data: product } = await supabase
        .from('products')
        .select('name, category')
        .eq('id', productId)
        .single();

      // 3. Trigger Zapier webhook (sends welcome/access email)
      if (process.env.ZAPIER_WEBHOOK_URL) {
        await fetch(process.env.ZAPIER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerEmail,
            userId,
            productId,
            productName: product?.name || 'Your Purchase',
            productCategory: product?.category,
            amountPaid: (amountPaid / 100).toFixed(2),
            courseUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/course.html?id=${productId}`,
            loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login.html`,
            purchasedAt: new Date().toISOString(),
          }),
        });
      }

      console.log(`Purchase recorded: ${customerEmail} → ${productId}`);
    } catch (err) {
      console.error('Error recording purchase:', err);
      // Still return 200 so Stripe doesn't retry endlessly
    }
  }

  return res.status(200).json({ received: true });
}
