# Sphynx Store — Setup Guide

Full e-commerce system with Stripe payments, Supabase auth + database, Vercel hosting, and Zapier email triggers.

---

## Architecture

```
Customer visits /store.html
  → clicks Buy Now
  → /api/create-checkout.js (Vercel function)
  → Stripe Checkout page
  → payment completes
  → Stripe fires webhook
  → /api/webhook.js records purchase in Supabase + calls Zapier
  → Zapier sends welcome email with login link
  → Customer clicks login link → /login.html → magic link email
  → Logs in → /dashboard.html → /course.html
```

---

## Step 1 — Supabase Setup (~10 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **API keys** (Settings → API)
3. Go to **SQL Editor → New Query**
4. Paste the entire contents of `supabase-schema.sql` and click **Run**
5. Go to **Authentication → Settings**:
   - Enable **Email** provider
   - Enable **Magic Link** (disable password sign-in for cleaner UX)
   - Set **Site URL** to your Vercel URL (e.g. `https://your-project.vercel.app`)
   - Add `https://your-project.vercel.app/dashboard.html` to **Redirect URLs**

---

## Step 2 — Stripe Setup (~5 min)

1. Go to [stripe.com](https://stripe.com) → Developers → API Keys
   - Copy your **Publishable key** (`pk_live_...`)
   - Copy your **Secret key** (`sk_live_...`)

2. Set up the **webhook**:
   - Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://your-project.vercel.app/api/webhook`
   - Events to listen for: `checkout.session.completed`
   - Copy the **Signing secret** (`whsec_...`)

> **Note:** Products and prices are created automatically by the Store Manager — you don't need to add them in Stripe manually.

---

## Step 3 — Zapier Setup (~5 min)

1. Create a new Zap: **Trigger = Webhooks by Zapier (Catch Hook)**
2. Copy the webhook URL Zapier gives you
3. Add this as `ZAPIER_WEBHOOK_URL` in your environment variables
4. Set up actions in Zapier (e.g. send email via Mailchimp/Gmail):
   - Use `{{email}}` for the customer's email
   - Use `{{productName}}` for what they bought
   - Use `{{courseUrl}}` for their direct course link
   - Use `{{loginUrl}}` for the login page

---

## Step 4 — Vercel Deployment (~5 min)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Go to **Settings → Environment Variables** and add ALL variables from `.env.example`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API Keys |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `NEXT_PUBLIC_MANAGER_PASSWORD` | Choose your own strong password |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL |
| `ZAPIER_WEBHOOK_URL` | From Step 3 |

4. Click **Deploy**

---

## Step 5 — Add Your Products (~variable)

1. Go to `https://your-project.vercel.app/store-manager.html`
2. Enter your manager password
3. Click **+ Add Product**
4. Fill in name, category, description, price, image URL, and lessons
5. Click **Save & Sync to Stripe** — the product and price are created in Stripe automatically
6. Repeat for all products

> **Images:** You can use the existing Kajabi CDN image URLs from your current store — they'll keep working.

---

## Step 6 — Connect Your Domain (optional)

1. In Vercel → Settings → Domains → Add `store.sphynxautomation.com` (or whatever subdomain)
2. Add a CNAME record at your domain registrar pointing to `cname.vercel-dns.com`
3. Update `NEXT_PUBLIC_SITE_URL` to your custom domain

---

## Pages

| URL | Who sees it |
|---|---|
| `/store.html` | Everyone — public product grid |
| `/login.html` | Customers — magic link sign-in |
| `/dashboard.html` | Logged-in customers — their purchases |
| `/course.html?id=XXX` | Customers who purchased that product |
| `/store-manager.html` | You only — password protected admin |

---

## Zapier Email Template (copy-paste starter)

**Subject:** Your Sphynx purchase: {{productName}}

**Body:**
```
Hi there,

Thank you for purchasing {{productName}}!

You can access your course here:
{{courseUrl}}

If you haven't logged in before, use this link to sign in:
{{loginUrl}}

Enter your email and we'll send you a magic link — no password needed.

Questions? Reply to this email and we'll help.

— The Sphynx Team
```

---

## Cost Summary

| Service | Cost |
|---|---|
| Vercel (Hobby plan) | $0/mo |
| Supabase (Free tier) | $0/mo (up to 50k MAU, 500MB DB) |
| Stripe | 2.9% + $0.30 per transaction |
| Zapier | Your existing plan |
| **Total fixed cost** | **$0/mo** |

At $2,000/year revenue: ~$60/year in Stripe fees vs $2,500/year for Kajabi.
