// api/import-stripe.js
// Fetches all active Stripe products + prices and upserts them into Supabase
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
    // Fetch all active products from Stripe
    const products = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const page = await stripe.products.list({
        active: true,
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });
      products.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length) startingAfter = page.data[page.data.length - 1].id;
    }

    if (!products.length) {
      return res.status(200).json({ imported: 0, message: 'No active products found in Stripe' });
    }

    // For each product, fetch its default price
    const results = [];
    for (const product of products) {
      try {
        // Get the default price or first active price
        let price = null;
        if (product.default_price) {
          price = await stripe.prices.retrieve(product.default_price);
        } else {
          const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
          price = prices.data[0] || null;
        }

        if (!price) {
          results.push({ name: product.name, status: 'skipped', reason: 'No active price found' });
          continue;
        }

        // Map Stripe product to our schema
        // Try to guess category from product name/metadata
        const name = product.name || '';
        let category = product.metadata?.category || guessCategoryFromName(name);

        const payload = {
          name: product.name,
          description: product.description || '',
          category,
          price: price.unit_amount || 0,        // in cents
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          image_url: product.images?.[0] || null,
          active: true,
          lesson_count: 0,
          sort_order: 0,
        };

        // Upsert — update if stripe_product_id already exists, insert if not
        const { error } = await supabase
          .from('products')
          .upsert(payload, { onConflict: 'stripe_product_id', ignoreDuplicates: false });

        if (error) throw error;
        results.push({ name: product.name, status: 'imported', price: price.unit_amount, priceId: price.id });

      } catch (err) {
        results.push({ name: product.name, status: 'error', reason: err.message });
      }
    }

    const imported = results.filter(r => r.status === 'imported').length;
    const errors = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return res.status(200).json({ imported, errors, skipped, results });

  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message });
  }
};

function guessCategoryFromName(name) {
  const n = name.toLowerCase();
  if (n.includes('zapier') || n.includes('zap')) return 'Zapier';
  if (n.includes('jotform') || n.includes('form')) return 'JotForm';
  if (n.includes('email') || n.includes('campaign') || n.includes('drip')) return 'Email Campaign';
  if (n.includes('course') || n.includes('training') || n.includes('bootcamp')) return 'Training';
  if (n.includes('integration') || n.includes('wealthbox') || n.includes('redtail')) return 'Integration';
  return 'Training'; // default
}
