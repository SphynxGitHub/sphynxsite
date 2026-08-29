// ============================================================
// SPHYNX INCLUDES — favicon, fonts, CSS, nav, footer, wallpaper
// ============================================================

// 1. Inject critical assets into <head> immediately
document.head.insertAdjacentHTML('beforeend', `
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared.css">
`);

// 2. Hero background SVG — edit here to update every page hero
const HERO_BG = `<svg class="hero-bg-svg" viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="1200" height="340" fill="#0b1f3a"/>
  <rect x="0" y="0" width="1200" height="110" fill="#1a3d5c"/>
  <rect x="0" y="110" width="200" height="230" fill="#12304a"/>
  <path d="M1200 110 A580 580 0 0 1 620 340 L1200 340 Z" fill="#c87d1a" opacity=".88"/>
  <path d="M1200 110 A380 380 0 0 1 820 340 L1200 340 Z" fill="#9b3025" opacity=".7"/>
  <circle cx="0" cy="340" r="140" fill="#1d6a5c"/>
  <circle cx="0" cy="340" r="64" fill="#00c2a8" opacity=".65"/>
</svg>`;

// 3. Wallpaper SVG — V3 edge-hugging scene, edit here to update all pages
const WALLPAPER = `<svg id="sphynx-wallpaper" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;overflow:visible">
  <defs>
    <linearGradient id="wfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7f9fc" stop-opacity="0"/>
      <stop offset="8%" stop-color="#f7f9fc" stop-opacity="1"/>
      <stop offset="92%" stop-color="#f7f9fc" stop-opacity="1"/>
      <stop offset="100%" stop-color="#f7f9fc" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- LEFT EDGE — shapes flow down the left side -->
  <path d="M0 80 A110 110 0 0 1 110 190 L0 190 Z" fill="#c87d1a" opacity=".22"/>
  <path d="M0 190 A90 90 0 0 0 90 100 L0 100 Z" fill="#9b3025" opacity=".19"/>
  <circle cx="0" cy="340" r="75" fill="#1d6a5c" opacity=".2"/>
  <path d="M0 460 A95 95 0 0 1 95 365 L0 365 Z" fill="#0b1f3a" opacity=".14"/>
  <circle cx="0" cy="580" r="65" fill="#c87d1a" opacity=".2"/>
  <path d="M0 700 A85 85 0 0 0 85 615 L0 615 Z" fill="#9b3025" opacity=".18"/>
  <circle cx="0" cy="820" r="70" fill="#1d6a5c" opacity=".19"/>
  <circle cx="0" cy="820" r="30" fill="#00c2a8" opacity=".22"/>
  <path d="M0 960 A100 100 0 0 1 100 860 L0 860 Z" fill="#c87d1a" opacity=".2"/>
  <circle cx="0" cy="1080" r="60" fill="#0b1f3a" opacity=".13"/>
  <path d="M0 1200 A90 90 0 0 0 90 1110 L0 1110 Z" fill="#1d6a5c" opacity=".18"/>
  <circle cx="0" cy="1340" r="68" fill="#9b3025" opacity=".17"/>
  <path d="M0 1480 A80 80 0 0 1 80 1400 L0 1400 Z" fill="#c87d1a" opacity=".19"/>

  <!-- RIGHT EDGE — offset from left so they don't mirror perfectly -->
  <path d="M100vw 120 A120 120 0 0 0 calc(100vw - 120px) 240 L100vw 240 Z" fill="#1d6a5c" opacity=".21"/>
  <circle cx="100vw" cy="300" r="70" fill="#9b3025" opacity=".17"/>
  <path d="M100vw 390 A95 95 0 0 0 calc(100vw - 95px) 295 L100vw 295 Z" fill="#c87d1a" opacity=".19"/>
  <circle cx="100vw" cy="530" r="60" fill="#0b1f3a" opacity=".13"/>
  <circle cx="100vw" cy="530" r="26" fill="#00c2a8" opacity=".22"/>
  <path d="M100vw 650 A110 110 0 0 0 calc(100vw - 110px) 540 L100vw 540 Z" fill="#1d6a5c" opacity=".2"/>
  <circle cx="100vw" cy="780" r="65" fill="#c87d1a" opacity=".2"/>
  <path d="M100vw 900 A85 85 0 0 0 calc(100vw - 85px) 815 L100vw 815 Z" fill="#9b3025" opacity=".18"/>
  <circle cx="100vw" cy="1020" r="55" fill="#1d6a5c" opacity=".19"/>
  <path d="M100vw 1140 A100 100 0 0 0 calc(100vw - 100px) 1040 L100vw 1040 Z" fill="#0b1f3a" opacity=".13"/>
  <circle cx="100vw" cy="1260" r="62" fill="#c87d1a" opacity=".19"/>
  <circle cx="100vw" cy="1260" r="28" fill="#00c2a8" opacity=".21"/>
  <path d="M100vw 1400 A90 90 0 0 0 calc(100vw - 90px) 1310 L100vw 1310 Z" fill="#9b3025" opacity=".17"/>

  <!-- A few subtle centre accents so it doesn't feel too edge-only -->
  <circle cx="50vw" cy="200" r="14" fill="#00c2a8" opacity=".18"/>
  <circle cx="50vw" cy="700" r="12" fill="#9b3025" opacity=".14"/>
  <circle cx="50vw" cy="1200" r="13" fill="#c87d1a" opacity=".14"/>
</svg>`;

// 4. Wire everything up after DOM is ready
document.addEventListener('DOMContentLoaded', async function () {

  // Inject wallpaper as first child of body (behind everything)
  document.body.insertAdjacentHTML('afterbegin', WALLPAPER);

  // Make sure body and content sit above wallpaper
  document.body.style.position = 'relative';
  document.body.style.zIndex = '1';
  document.body.style.background = 'transparent';

  // Load Lucide icons
  await loadScript('https://unpkg.com/lucide@latest');

  // Inject nav
  const navEl = document.getElementById('site-nav');
  if (navEl) {
    const res = await fetch('/nav.html');
    const html = await res.text();
    navEl.outerHTML = html;

    // Inject hero background into page-hero if present
    const hero = document.querySelector('.page-hero');
    if (hero) {
      hero.style.position = 'relative';
      hero.style.overflow = 'hidden';
      hero.insertAdjacentHTML('afterbegin', HERO_BG);
    }
    // Make sure page-hero-inner sits above the bg SVG
    const heroInner = document.querySelector('.page-hero-inner');
    if (heroInner) heroInner.style.position = 'relative';
    // CRITICAL: nav must always be on top — re-enforce after hero injection
    const navEl2 = document.querySelector('nav');
    if (navEl2) navEl2.style.zIndex = '1000';

    // Active link highlighting
    document.querySelectorAll('nav a').forEach(a => {
      if (a.pathname !== '/' && window.location.pathname.startsWith(a.pathname)) {
        a.classList.add('active');
      }
    });

    // Dropdown hover with delay buffer so menu stays open while mouse moves
    document.querySelectorAll('.has-dropdown').forEach(function(item) {
      var timeout;
      item.addEventListener('mouseenter', function() {
        clearTimeout(timeout);
        document.querySelectorAll('.has-dropdown').forEach(el => el.classList.remove('open'));
        item.classList.add('open');
      });
      item.addEventListener('mouseleave', function() {
        timeout = setTimeout(function() { item.classList.remove('open'); }, 300);
      });
      var dropdown = item.querySelector('.dropdown');
      if (dropdown) {
        dropdown.addEventListener('mouseenter', function() { clearTimeout(timeout); });
        dropdown.addEventListener('mouseleave', function() {
          timeout = setTimeout(function() { item.classList.remove('open'); }, 300);
        });
      }
    });
  }

  // Inject footer
  const footerEl = document.getElementById('site-footer');
  if (footerEl) {
    const res = await fetch('/footer.html');
    const html = await res.text();
    footerEl.outerHTML = html;
  }

  // Init Lucide icons
  lucide.createIcons();
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
