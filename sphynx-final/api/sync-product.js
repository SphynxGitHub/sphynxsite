// api/sync-product.js
// Creates or updates Stripe products/prices when store manager saves a product
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    productId,           // internal Supabase product ID
    name,
    description,
    price,               // in cents
    image_url,
    existingStripeProductId,
    existingStripePriceId,
    toggleActive,        // { active: bool } — just archive/unarchive
    deleteProduct,       // true — archive the product
  } = req.body;

  try {
    // --- ARCHIVE (delete) ---
    if (deleteProduct && existingStripeProductId) {
      await stripe.products.update(existingStripeProductId, { active: false });
      return res.status(200).json({ success: true });
    }

    // --- TOGGLE ACTIVE ---
    if (toggleActive !== undefined && existingStripeProductId) {
      await stripe.products.update(existingStripeProductId, { active: req.body.active });
      return res.status(200).json({ success: true });
    }

    // --- CREATE OR UPDATE PRODUCT ---
    let stripeProductId = existingStripeProductId;
    let stripePriceId = existingStripePriceId;

    const productData = {
      name,
      description,
      images: image_url ? [image_url] : [],
    };

    if (stripeProductId) {
      // Update existing product
      await stripe.products.update(stripeProductId, productData);
    } else {
      // Create new product
      const product = await stripe.products.create({ ...productData, metadata: { supabase_id: productId || '' } });
      stripeProductId = product.id;
    }

    // Stripe prices are immutable — if price changed, archive old and create new
    if (stripePriceId) {
      const existingPrice = await stripe.prices.retrieve(stripePriceId);
      if (existingPrice.unit_amount !== price) {
        // Archive old price
        await stripe.prices.update(stripePriceId, { active: false });
        stripePriceId = null;
      }
    }

    if (!stripePriceId) {
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: price,
        currency: 'usd',
      });
      stripePriceId = newPrice.id;
    }

    return res.status(200).json({ stripeProductId, stripePriceId });

  } catch (err) {
    console.error('Stripe sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
