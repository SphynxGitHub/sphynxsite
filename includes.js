// Add favicon immediately — runs in <head> before browser looks for it
document.write('<link rel="icon" type="image/png" href="/favicon.png">');

// Load nav and footer after DOM is ready
document.addEventListener('DOMContentLoaded', async function () {
  const base = '';

  // --- NAV ---
  const navPlaceholder = document.getElementById('site-nav');
  if (navPlaceholder) {
    const res = await fetch(`${base}/nav.html`);
    const html = await res.text();
    navPlaceholder.outerHTML = html;
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
});
