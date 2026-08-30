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

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${siteUrl}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/store.html`,
      metadata: { productId, userId: userId || '' },
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
