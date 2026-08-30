#!/bin/bash
# Sphynx build script — installs dependencies and replaces __VARIABLE__ placeholders

set -e  # Exit on any error

echo "Starting Sphynx build..."

# Install npm dependencies (needed for API functions)
echo "Installing dependencies..."
npm install
echo "  ✓ Dependencies installed"

# Files to process for placeholder replacement
FILES=(
  "pricing.html"
  "store.html"
  "store-manager.html"
  "dashboard.html"
  "course.html"
  "login.html"
  "lib/supabase.js"
  "includes.js"
  "product.html"
)

echo "Replacing environment variable placeholders..."
for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    sed -i \
      -e "s|__NEXT_PUBLIC_SUPABASE_URL__|${NEXT_PUBLIC_SUPABASE_URL}|g" \
      -e "s|__NEXT_PUBLIC_SUPABASE_ANON_KEY__|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" \
      -e "s|__NEXT_PUBLIC_PORTAL_SUPABASE_URL__|${NEXT_PUBLIC_PORTAL_SUPABASE_URL}|g" \
      -e "s|__NEXT_PUBLIC_PORTAL_SUPABASE_ANON_KEY__|${NEXT_PUBLIC_PORTAL_SUPABASE_ANON_KEY}|g" \
      -e "s|__NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__|${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}|g" \
      -e "s|__NEXT_PUBLIC_MANAGER_PASSWORD__|${NEXT_PUBLIC_MANAGER_PASSWORD}|g" \
      -e "s|__NEXT_PUBLIC_SITE_URL__|${NEXT_PUBLIC_SITE_URL}|g" \
      -e "s|__ZAPIER_ESTIMATE_WEBHOOK_URL__|${ZAPIER_ESTIMATE_WEBHOOK_URL}|g" \
      "$FILE"
    echo "  ✓ Processed $FILE"
  else
    echo "  — Skipped $FILE (not found)"
  fi
done

echo "Build complete."
