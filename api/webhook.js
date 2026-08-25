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
    const { userId, productId } = session.metadata;
    const amountPaid = session.amount_total;
    const customerEmail = session.customer_email || session.customer_details?.email;

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
