const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata || {};
    const amountPaid = session.amount_total;
    const customerEmail = session.customer_email || session.customer_details?.email;

    // ── Prepaid coaching block ────────────────────────────────
    if (meta.type === 'coaching_prepaid') {
      let hoursPurchased = 5;
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
        hoursPurchased = lineItems.data.reduce((sum, li) => sum + (li.quantity || 0), 0) || 5;
      } catch (e) {
        console.error('Could not read line items for coaching session:', e.message);
      }

      const bookingLinks = {
        arielle30: 'https://calendly.com/sphynx/coaching-call?duration=30',
        arielle60: 'https://calendly.com/sphynx/coaching-call?duration=60',
        chad30: 'https://calendly.com/chad-sphynxautomation/coaching-call?duration=30',
        chad60: 'https://calendly.com/chad-sphynxautomation/coaching-call?duration=60',
      };

      // Optional record-keeping — safe to leave in even before the table exists.
      try {
        await supabase.from('coaching_purchases').insert({
          email: customerEmail,
          hours_purchased: hoursPurchased,
          amount_paid: amountPaid,
          stripe_session_id: session.id,
          purchased_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('coaching_purchases insert skipped:', e.message);
      }

      try {
        if (process.env.ZAPIER_WEBHOOK_URL) {
          await fetch(process.env.ZAPIER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'coaching_prepaid_purchase',
              email: customerEmail,
              hoursPurchased,
              amountPaid,
              sessionId: session.id,
              bookingLinks,
            }),
          });
        }
      } catch (err) {
        console.error('Error sending coaching purchase notification:', err);
      }

      return res.status(200).json({ received: true });
    }

    // ── Digital product / course purchase ────────────────────
    const { userId, productId } = meta;

    try {
      await supabase.from('purchases').insert({
        user_id: userId,
        product_id: productId,
        amount_paid: amountPaid,
        stripe_session_id: session.id,
        purchased_at: new Date().toISOString(),
      });

      const { data: product } = await supabase
        .from('products')
        .select('name, category')
        .eq('id', productId)
        .single();

      if (process.env.ZAPIER_WEBHOOK_URL) {
        await fetch(process.env.ZAPIER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerEmail,
            userId,
            productId,
            productName: product?.name || 'Your Purchase',
            courseUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/course.html?id=${productId}`,
            loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login.html`,
          }),
        });
      }
    } catch (err) {
      console.error('Error recording purchase:', err);
    }
  }

  return res.status(200).json({ received: true });
};
