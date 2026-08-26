// includes.js — loads nav and footer into every page automatically
// Just add <script src="/includes.js"></script> before </body> on each page

(async function () {
  // --- FAVICON ---
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/png';
  favicon.href = '/favicon.png';
  document.head.appendChild(favicon);
  // Determine base path (works on Vercel where all pages are at root)
  const base = '';

  // --- NAV ---
  const navPlaceholder = document.getElementById('site-nav');
  if (navPlaceholder) {
    const res = await fetch(`${base}/nav.html`);
    const html = await res.text();
    navPlaceholder.outerHTML = html;
    // Highlight current page link
    document.querySelectorAll('nav a').forEach(a => {
      if (a.href === window.location.href ||
          (a.pathname !== '/' && window.location.pathname.startsWith(a.pathname))) {
        a.classList.add('active');
      }
    });
  }

  // --- FOOTER ---
  const footerPlaceholder = document.getElementById('site-footer');
  if (footerPlaceholder) {
    const res = await fetch(`${base}/footer.html`);
    const html = await res.text();
    footerPlaceholder.outerHTML = html;
  }
})();
