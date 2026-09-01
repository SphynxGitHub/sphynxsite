const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const {
    productId, name, description, price, image_url,
    existingStripeProductId, existingStripePriceId,
    toggleActive, deleteProduct, active,
    billingInterval, // Pass 'month', 'year', or 'one_time' (or derive from product_type)
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
      images: image_url ? [image_url] : [],
    };

    // Prevent Stripe empty string validation error
    if (description && description.trim() !== '') {
      productData.description = description;
    }

    if (stripeProductId) {
      await stripe.products.update(stripeProductId, productData);
    } else {
      const product = await stripe.products.create({ ...productData, metadata: { supabase_id: productId || '' } });
      stripeProductId = product.id;
    }

    // Check existing price details
    if (stripePriceId) {
      const existingPrice = await stripe.prices.retrieve(stripePriceId);
      const isExistingRecurring = existingPrice.type === 'recurring';
      const existingInterval = existingPrice.recurring?.interval;
      const targetRecurring = billingInterval && billingInterval !== 'one_time';

      // Archive price if unit_amount OR billing type/interval changes
      const priceMismatch = existingPrice.unit_amount !== price;
      const typeMismatch = isExistingRecurring !== targetRecurring;
      const intervalMismatch = targetRecurring && existingInterval !== billingInterval;

      if (priceMismatch || typeMismatch || intervalMismatch) {
        await stripe.prices.update(stripePriceId, { active: false });
        stripePriceId = null;
      }
    }

    // Create a new price if needed
    if (!stripePriceId) {
      const priceConfig = {
        product: stripeProductId,
        unit_amount: price,
        currency: 'usd',
      };

      // Add recurring parameter for subscriptions
      if (billingInterval && billingInterval !== 'one_time') {
        priceConfig.recurring = { interval: billingInterval }; // e.g., 'month' or 'year'
      }

      const newPrice = await stripe.prices.create(priceConfig);
      stripePriceId = newPrice.id;
    }

    return res.status(200).json({ stripeProductId, stripePriceId });
  } catch (err) {
    console.error('Stripe sync error:', err);
    return res.status(500).json({ error: err.message });
  }
};
