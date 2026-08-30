// api/diagnose.js
// Temporary diagnostic endpoint — delete after debugging
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  const results = {};

  // Check env vars are present (don't expose values)
  results.env = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? `set (${process.env.STRIPE_SECRET_KEY.slice(0,7)}...)` : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `set (${process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0,30)}...)` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `set (${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0,10)}...)` : 'MISSING',
  };

  // Test Stripe connection
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const products = await stripe.products.list({ limit: 3, active: true });
    results.stripe = {
      status: 'ok',
      productCount: products.data.length,
      sample: products.data.map(p => ({ id: p.id, name: p.name, defaultPrice: p.default_price }))
    };
  } catch(e) {
    results.stripe = { status: 'error', message: e.message };
  }

  // Test Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await supabase.from('products').select('id, name').limit(3);
    if (error) throw error;
    results.supabase = { status: 'ok', existingProducts: data?.length || 0, sample: data };
  } catch(e) {
    results.supabase = { status: 'error', message: e.message };
  }

  return res.status(200).json(results);
};
