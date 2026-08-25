// lib/supabase.js — shared Supabase client for all frontend pages
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = '__NEXT_PUBLIC_SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__NEXT_PUBLIC_SUPABASE_ANON_KEY__';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get currently logged-in user (or null)
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get all purchases for a user
export async function getUserPurchases(userId) {
  const { data, error } = await supabase
    .from('purchases')
    .select('product_id, purchased_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

// Get all published products
export async function getProducts(category = null) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name');
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Get progress for a user on a product
export async function getProgress(userId, productId) {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
  return data || [];
}

// Mark a lesson complete/incomplete
export async function toggleLesson(userId, productId, lessonId, completed) {
  const { error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, product_id: productId, lesson_id: lessonId, completed },
             { onConflict: 'user_id,product_id,lesson_id' });
  if (error) throw error;
}
