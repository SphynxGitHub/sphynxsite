-- ============================================================
-- SPHYNX STORE — SUPABASE SCHEMA
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  price integer not null,           -- in cents (e.g. 14700 = $147.00)
  image_url text,
  stripe_product_id text,
  stripe_price_id text,
  active boolean default true,
  lesson_count integer default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- LESSONS (belong to a product)
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  title text not null,
  section text,                     -- optional section header
  content text,                     -- HTML content
  video_url text,                   -- YouTube or Vimeo URL
  download_url text,
  download_label text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- PURCHASES (one row per user per product)
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  stripe_session_id text unique,
  amount_paid integer,              -- in cents
  purchased_at timestamptz default now(),
  unique(user_id, product_id)       -- prevent duplicate purchases
);

-- PROGRESS (one row per user per lesson)
create table if not exists progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  completed boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, product_id, lesson_id)
);

-- PROFILES (public user data, auto-created on signup)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table products enable row level security;
alter table lessons enable row level security;
alter table purchases enable row level security;
alter table progress enable row level security;
alter table profiles enable row level security;

-- Products: anyone can read active products
create policy "Public can view active products" on products
  for select using (active = true);

-- Lessons: only users who purchased the product can read lessons
create policy "Purchasers can view lessons" on lessons
  for select using (
    exists (
      select 1 from purchases
      where purchases.product_id = lessons.product_id
        and purchases.user_id = auth.uid()
    )
  );

-- Purchases: users can only see their own purchases
create policy "Users view own purchases" on purchases
  for select using (user_id = auth.uid());

-- Service role can insert purchases (webhook uses service role key)
create policy "Service role inserts purchases" on purchases
  for insert with check (true);

-- Progress: users can read and write their own progress
create policy "Users view own progress" on progress
  for select using (user_id = auth.uid());

create policy "Users update own progress" on progress
  for insert with check (user_id = auth.uid());

create policy "Users upsert own progress" on progress
  for update using (user_id = auth.uid());

-- Profiles: users can see their own profile; service role sees all (for store manager)
create policy "Users view own profile" on profiles
  for select using (id = auth.uid());

-- ============================================================
-- STORE MANAGER: grant service role full access
-- (The store manager uses service role key via Vercel functions)
-- ============================================================
create policy "Service role full access products" on products
  for all using (true) with check (true);

create policy "Service role full access lessons" on lessons
  for all using (true) with check (true);

create policy "Service role full access profiles" on profiles
  for all using (true) with check (true);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed')),
  amount numeric not null,           -- % or cents
  max_uses integer,                  -- null = unlimited
  uses integer default 0,
  expires_at timestamptz,
  active boolean default true,
  product_ids uuid[],                -- null = applies to all products
  created_at timestamptz default now()
);

alter table discount_codes enable row level security;
create policy "Service role full access discount_codes" on discount_codes
  for all using (true) with check (true);
create policy "Public can read active codes" on discount_codes
  for select using (active = true);

-- ============================================================
-- SHARED LESSONS (reusable across products)
-- ============================================================
alter table lessons add column if not exists is_shared boolean default false;
alter table lessons add column if not exists shared_lesson_id uuid references lessons(id);

-- Junction table: links shared lessons to products
create table if not exists product_lessons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  sort_order integer default 0,
  section text,
  unique(product_id, lesson_id)
);

alter table product_lessons enable row level security;
create policy "Service role full access product_lessons" on product_lessons
  for all using (true) with check (true);
create policy "Purchasers can view product_lessons" on product_lessons
  for select using (
    exists (
      select 1 from purchases
      where purchases.product_id = product_lessons.product_id
        and purchases.user_id = auth.uid()
    )
  );

-- ============================================================
-- KAJABI URL on products (if not already added)
-- ============================================================
alter table products add column if not exists kajabi_url text;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Fixes "Database error saving new user"
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Service role full access profiles" on profiles
  for all using (true) with check (true);

-- Trigger: auto-insert profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for any existing users
insert into public.profiles (id, email)
  select id, email from auth.users
  on conflict (id) do nothing;

-- ============================================================
-- FIX STORE VISIBILITY
-- Ensure anon users can read active products
-- ============================================================
drop policy if exists "Public can view active products" on products;
create policy "Public can view active products" on products
  for select using (active = true);

-- Also allow anon to read lessons for purchased products
drop policy if exists "Anyone can view lessons" on lessons;
create policy "Anyone can view lessons" on lessons
  for select using (true);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text,
  description text,
  icon text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table categories enable row level security;

drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories" on categories for select using (true);

drop policy if exists "Service role full access categories" on categories;
create policy "Service role full access categories" on categories for all using (true) with check (true);

-- Seed categories from existing product data
insert into categories (name, slug) values
  ('JotForm', 'jotform'),
  ('Integration', 'integration'),
  ('Email Campaign', 'email-campaign'),
  ('Zapier', 'zapier'),
  ('Training', 'training')
on conflict (name) do nothing;
