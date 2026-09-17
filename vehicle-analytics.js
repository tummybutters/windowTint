(() => {
  // Reuse the existing site's Google destinations; never send local/preview QA traffic.
  if (window.location.hostname !== 'www.obsidianautoworksoc.com') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const pageUrl = new URL(window.location.href);
  // Retain standard campaign attribution, never customer IDs or arbitrary query text.
  const safeUrl = new URL(pageUrl.origin + pageUrl.pathname);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid']) {
    const value = pageUrl.searchParams.get(key);
    if (value && /^[a-z0-9 _.-]{1,150}$/i.test(value) && !/\d{7,}/.test(value.replace(/[^0-9]/g, '')) && !value.includes('@')) {
      safeUrl.searchParams.set(key, value);
    }
  }
  let referrer = '';
  try { referrer = new URL(document.referrer).origin + '/'; } catch (_) { /* No referrer. */ }
  window.gtag('set', { page_location: safeUrl.href, page_referrer: referrer });
  window.gtag('js', new Date());
  window.gtag('config', 'G-TR9ET60HX3');
  window.gtag('config', 'AW-17846304809');
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-TR9ET60HX3';
  document.head.appendChild(script);
})();
