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

    // Look up the product to see if this is a coaching prepaid block or a maintenance plan
    let product = null;
    if (productId) {
      const { data } = await supabase.from('products').select('category,name').eq('id', productId).single();
      product = data || null;
    }
    const category = (product?.category || '').toLowerCase();
    const isCoaching = category.includes('coach');
    const isMaintenance = category.includes('maintenance');

    // Retrieve price object from Stripe
    const priceObj = await stripe.prices.retrieve(priceId);
    const isSubscription = !!priceObj.recurring;

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

    const lineItem = { price: priceId, quantity: isCoaching && !isSubscription ? 5 : 1 };
    if (isCoaching && !isSubscription) {
      lineItem.adjustable_quantity = { enabled: true, minimum: 5, maximum: 40 };
    }

    let successUrl = `${siteUrl}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`;
    let cancelUrl = `${siteUrl}/store.html`;
    let type = 'digital_product';

    if (isSubscription || isMaintenance) {
      successUrl = `${siteUrl}/maintenance-thank-you.html?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${siteUrl}/maintenance.html`;
      type = 'maintenance_subscription';
    } else if (isCoaching) {
      successUrl = `${siteUrl}/coaching-thank-you.html?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${siteUrl}/coaching.html`;
      type = 'coaching_prepaid';
    }

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { productId, userId: userId || '', type },
      allow_promotion_codes: !stripeCouponId,
    };

    // Safely assign client_reference_id only if non-empty to prevent Stripe 400 errors
    if (userId && userId.trim() !== '') {
      sessionParams.client_reference_id = userId;
    }

    // Attach 12-month auto-cancel tag to monthly recurring subscriptions
    if (isSubscription && priceObj.recurring?.interval === 'month') {
      sessionParams.subscription_data = {
        metadata: {
          auto_cancel_12m: 'true',
          product_id: productId || '',
          user_id: userId || '',
          type,
        },
      };
    }

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
