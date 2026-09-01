const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { priceId, productId, userId, discountCode } = req.body;

    // Look up the product to see if this is a coaching prepaid block —
    // those get adjustable quantity (buy 5+ hours) and a different post-checkout flow.
    let product = null;
    if (productId) {
      const { data } = await supabase.from('products').select('category,name').eq('id', productId).single();
      product = data || null;
    }
    const isCoaching = (product?.category || '').toLowerCase().includes('coach');

    // Ask Stripe whether this price is recurring — if so, Checkout must run in
    // 'subscription' mode instead of 'payment'. This makes maintenance-plan
    // subscriptions (or any future recurring product) work automatically,
    // with no extra flags needed from the caller.
    const priceObj = await stripe.prices.retrieve(priceId);
    const isSubscription = priceObj.type === 'recurring';

    // Validate discount code if provided
    let stripeCouponId = null;
    let discountInfo = null;
    if (discountCode) {
      const { data: code } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.toUpperCase())
        .eq('active', true)
        .single();

      if (code) {
        // Check expiry
        if (code.expires_at && new Date(code.expires_at) < new Date()) {
          return res.status(400).json({ error: 'This discount code has expired.' });
        }
        // Check max uses
        if (code.max_uses && code.uses >= code.max_uses) {
          return res.status(400).json({ error: 'This discount code has reached its maximum uses.' });
        }
        // Check product restriction
        if (code.product_ids?.length && !code.product_ids.includes(productId)) {
          return res.status(400).json({ error: 'This discount code does not apply to this product.' });
        }

        // Create a Stripe coupon on the fly
        const couponParams = code.type === 'percentage'
          ? { percent_off: code.amount, duration: 'once' }
          : { amount_off: code.amount, currency: 'usd', duration: 'once' };

        const coupon = await stripe.coupons.create(couponParams);
        stripeCouponId = coupon.id;
        discountInfo = code;
      } else {
        return res.status(400).json({ error: 'Invalid or inactive discount code.' });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sphynxsite.vercel.app';

    const lineItem = { price: priceId, quantity: isCoaching ? 5 : 1 };
    if (isCoaching) {
      // Lets the buyer add extra hours at checkout, all at the same discounted per-hour rate.
      lineItem.adjustable_quantity = { enabled: true, minimum: 5, maximum: 40 };
    }

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: isCoaching
        ? `${siteUrl}/coaching-thank-you.html?session_id={CHECKOUT_SESSION_ID}`
        : `${siteUrl}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isCoaching ? `${siteUrl}/coaching.html` : `${siteUrl}/store.html`,
      metadata: { productId, userId: userId || '', type: isCoaching ? 'coaching_prepaid' : 'digital_product' },
      allow_promotion_codes: !stripeCouponId, // allow Stripe codes if no custom code
    };

    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Increment discount code uses
    if (discountInfo) {
      await supabase.from('discount_codes')
        .update({ uses: (discountInfo.uses || 0) + 1 })
        .eq('id', discountInfo.id);
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
};
