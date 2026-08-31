// api/admin-assign.js — assigns a product to a user (admin only)
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify manager password
  const { password, email, productId, amount } = req.body;
  if (password !== process.env.NEXT_PUBLIC_MANAGER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // service role bypasses RLS
  );

  try {
    // Find user by email
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({ error: 'No account found for that email. Ask them to sign up at /login.html first.' });
    }

    // Check if already purchased
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', profile.id)
      .eq('product_id', productId)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'This customer already has access to this product.' });
    }

    // Insert purchase using service role (bypasses RLS)
    const { error } = await supabase.from('purchases').insert({
      user_id: profile.id,
      product_id: productId,
      amount_paid: Math.round(parseFloat(amount || '0') * 100),
      purchased_at: new Date().toISOString()
    });

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
