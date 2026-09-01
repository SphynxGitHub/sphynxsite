const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Buffer raw request body for Stripe signature validation
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Method Not Allowed');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } else {
      event = JSON.parse(buf.toString());
    }
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const productId = session.metadata?.product_id;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const amountPaid = session.amount_total || 0;

        if (userId && productId) {
          // Record purchase in Supabase
          await supabase.from('purchases').insert({
            user_id: userId,
            product_id: productId,
            amount_paid: amountPaid,
            stripe_checkout_id: session.id,
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          // Fetch subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          // Check if subscription has the 12-month auto-cancel marker
          if (subscription.metadata?.auto_cancel_12m === 'true') {
            // Count total successfully paid invoices for this subscription
            const paidInvoices = await stripe.invoices.list({
              subscription: subscriptionId,
              status: 'paid',
            });

            // If 12 payments have been collected, mark to cancel at end of 12th month
            if (paidInvoices.data.length >= 12) {
              await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
              });
              console.log(`Subscription ${subscriptionId} scheduled for cancellation after 12 payments.`);
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err.message });
  }
};
