// Inject critical assets into <head> immediately
document.head.insertAdjacentHTML('beforeend', `
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared.css">
`);

// Load Lucide then wire up nav, footer and icons
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  // Load Lucide first
  await loadScript('https://unpkg.com/lucide@latest');

  // Inject nav
  const navEl = document.getElementById('site-nav');
  if (navEl) {
    const res = await fetch('/nav.html');
    const html = await res.text();
    navEl.outerHTML = html;
    document.querySelectorAll('nav a').forEach(a => {
      if (a.pathname !== '/' && window.location.pathname.startsWith(a.pathname)) {
        a.classList.add('active');
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

  // Now init all icons — nav, footer and page content all present
  lucide.createIcons();
});
