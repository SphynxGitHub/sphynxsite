// api/admin-users.js — returns all users + purchases for store manager
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  if (password !== process.env.NEXT_PUBLIC_MANAGER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const [{ data: profiles }, { data: purchases }] = await Promise.all([
      supabase.from('profiles').select('id,email,full_name,created_at').order('created_at', { ascending: false }),
      supabase.from('purchases').select('id,user_id,purchased_at,amount_paid,products(name)')
    ]);

    return res.status(200).json({ profiles: profiles || [], purchases: purchases || [] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
