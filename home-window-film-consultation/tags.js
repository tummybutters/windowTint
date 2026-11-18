(() => {
  const params = new URLSearchParams(location.search);
  if (location.hostname !== 'www.obsidianautoworksoc.com' ||
      /^(internal|qa|test)$/i.test(params.get('utm_source') || '') ||
      /^(internal|qa|test)$/i.test(params.get('utm_medium') || '')) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-TR9ET60HX3');
  window.gtag('config', 'AW-17846304809');
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-TR9ET60HX3';
  document.head.append(script);
})();
