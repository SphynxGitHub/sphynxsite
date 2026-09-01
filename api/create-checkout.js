const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const { priceId, productId, userId, discountCode } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' });
  }

  try {
    // 1. Retrieve the price from Stripe to check if it's recurring
    const price = await stripe.prices.retrieve(priceId);
    const isRecurring = price.type === 'recurring';

    const origin = req.headers.origin || 'https://sphynxsite.vercel.app';

    // 2. Handle optional discount codes
    const discounts = [];
    if (discountCode) {
      const couponSearch = await stripe.coupons.list({ limit: 10 });
      const matchingCoupon = couponSearch.data.find(
        (c) => c.id.toUpperCase() === discountCode.toUpperCase() && c.valid
      );
      if (matchingCoupon) {
        discounts.push({ coupon: matchingCoupon.id });
      }
    }

    // 3. Build Checkout Session configuration
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isRecurring ? 'subscription' : 'payment',
      success_url: `${origin}/store.html?success=true`,
      cancel_url: `${origin}/store.html?cancelled=true`,
      metadata: {
        product_id: productId || '',
        user_id: userId || '',
      },
      discounts,
    };

    // Prevent Stripe empty string validation error for client_reference_id
    if (userId && userId.trim() !== '') {
      sessionConfig.client_reference_id = userId;
    }

    // 4. Attach auto-cancel metadata tag to monthly subscriptions
    if (isRecurring && price.recurring?.interval === 'month') {
      sessionConfig.subscription_data = {
        metadata: {
          auto_cancel_12m: 'true',
          product_id: productId || '',
          user_id: userId || '',
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout creation error:', err);
    return res.status(500).json({ error: err.message });
  }
};
