document.head.insertAdjacentHTML('beforeend', `
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared.css">
  <script src="https://unpkg.com/lucide@latest"></script>
`);

document.addEventListener('DOMContentLoaded', async function () {
  const navPlaceholder = document.getElementById('site-nav');
  if (navPlaceholder) {
    const res = await fetch('/nav.html');
    const html = await res.text();
    navPlaceholder.outerHTML = html;
    document.querySelectorAll('nav a').forEach(a => {
      if (a.pathname !== '/' && window.location.pathname.startsWith(a.pathname)) {
        a.classList.add('active');
      }
    });
  }

  const footerPlaceholder = document.getElementById('site-footer');
  if (footerPlaceholder) {
    const res = await fetch('/footer.html');
    const html = await res.text();
    footerPlaceholder.outerHTML = html;
  }

  // Init Lucide icons
  if (window.lucide) lucide.createIcons();
});
