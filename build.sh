#!/bin/bash
# Sphynx build script — replaces __VARIABLE__ placeholders with Vercel env vars

echo "Starting Sphynx build..."

# List of files to process
FILES=(
  "pricing.html"
  "store.html"
  "store-manager.html"
  "dashboard.html"
  "course.html"
  "login.html"
  "lib/supabase.js"
  "includes.js"
)

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
      "$FILE"
    echo "  ✓ Processed $FILE"
  fi
done

echo "Build complete."
