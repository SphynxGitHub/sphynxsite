const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const {
    productId, name, description, price, image_url,
    existingStripeProductId, existingStripePriceId,
    toggleActive, deleteProduct, active,
    billingInterval, // e.g. 'month' for a recurring subscription price; omit/blank for one-time
  } = req.body;

  try {
    if (deleteProduct && existingStripeProductId) {
      await stripe.products.update(existingStripeProductId, { active: false });
      return res.status(200).json({ success: true });
    }

    if (toggleActive !== undefined && existingStripeProductId) {
      await stripe.products.update(existingStripeProductId, { active });
      return res.status(200).json({ success: true });
    }

    let stripeProductId = existingStripeProductId;
    let stripePriceId = existingStripePriceId;

    const productData = {
      name,
      description,
      images: image_url ? [image_url] : [],
    };

    if (stripeProductId) {
      await stripe.products.update(stripeProductId, productData);
    } else {
      const product = await stripe.products.create({ ...productData, metadata: { supabase_id: productId || '' } });
      stripeProductId = product.id;
    }

    if (stripePriceId) {
      const existingPrice = await stripe.prices.retrieve(stripePriceId);
      const currentInterval = existingPrice.recurring?.interval || null;
      const wantedInterval = billingInterval || null;
      if (existingPrice.unit_amount !== price || currentInterval !== wantedInterval) {
        await stripe.prices.update(stripePriceId, { active: false });
        stripePriceId = null;
      }
    }

    if (!stripePriceId) {
      const priceParams = {
        product: stripeProductId,
        unit_amount: price,
        currency: 'usd',
      };
      if (billingInterval) {
        priceParams.recurring = { interval: billingInterval };
      }
      const newPrice = await stripe.prices.create(priceParams);
      stripePriceId = newPrice.id;
    }

    return res.status(200).json({ stripeProductId, stripePriceId });
  } catch (err) {
    console.error('Stripe sync error:', err);
    return res.status(500).json({ error: err.message });
  }
};
