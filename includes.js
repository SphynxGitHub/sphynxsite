// Inject favicon into <head> immediately
document.head.insertAdjacentHTML('beforeend', '<link rel="icon" type="image/png" href="/favicon.png">');

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
});
