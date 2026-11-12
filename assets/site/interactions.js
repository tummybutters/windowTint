(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const header = document.querySelector('.site-header');
  const mobileViewport = window.matchMedia('(max-width: 900px)');

  if (toggle && nav && header) {
    if (!nav.id) nav.id = 'site-navigation';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    header.insertAdjacentElement('afterend', backdrop);
    const background = [...document.querySelectorAll('main, .site-footer, .sticky-quote')];
    const previousInert = new Map();
    let menuOpen = false;

    function setMenu(requestedOpen, returnFocus = false) {
      const open = requestedOpen && mobileViewport.matches;
      menuOpen = open;
      nav.classList.toggle('is-open', open);
      header.classList.toggle('menu-is-open', open);
      backdrop.classList.toggle('is-visible', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.inert = mobileViewport.matches && !open;

      background.forEach(element => {
        if (open) {
          if (!previousInert.has(element)) previousInert.set(element, element.inert);
          element.inert = true;
        } else if (previousInert.has(element)) {
          element.inert = previousInert.get(element);
          previousInert.delete(element);
        }
      });
      if (returnFocus) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', () => {
      setMenu(!menuOpen);
      if (menuOpen) nav.querySelector('a[href]')?.focus({ preventScroll: true });
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) setMenu(false);
    });
    backdrop.addEventListener('click', () => setMenu(false, true));
    document.addEventListener('keydown', event => {
      if (!menuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false, true);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...header.querySelectorAll('a[href], button:not([disabled])')]
        .filter(element => element.getClientRects().length && !element.closest('[inert]'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !header.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !header.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus({ preventScroll: true });
      }
    });
    mobileViewport.addEventListener('change', () => setMenu(false));
    window.addEventListener('pageshow', () => setMenu(false));
    setMenu(false);
  }

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const filters = [...gallery.querySelectorAll('[data-gallery-filter]')];
    const items = [...gallery.querySelectorAll('[data-gallery-category]')];
    const count = gallery.querySelector('[data-gallery-count]');
    filters.forEach(button => {
      button.addEventListener('click', () => {
        const selected = button.dataset.galleryFilter;
        items.forEach(item => {
          item.hidden = selected !== 'all' && !item.dataset.galleryCategory.split(' ').includes(selected);
        });
        filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
        if (count) {
          const visible = items.filter(item => !item.hidden).length;
          count.textContent = `${visible} ${visible === 1 ? 'collection' : 'collections'}`;
        }
      });
    });
  });

  const photoLinks = [...document.querySelectorAll('a[data-lightbox]')];
  if (!photoLinks.length || typeof HTMLDialogElement === 'undefined') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'photo-dialog';
  dialog.setAttribute('aria-label', 'Installation photograph');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'photo-close';
  close.setAttribute('aria-label', 'Close photograph');
  close.textContent = '×';
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  const caption = document.createElement('figcaption');
  figure.append(image, caption);
  dialog.append(close, figure);
  document.body.append(dialog);
  let opener = null;

  photoLinks.forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || 'Obsidian installation photograph';
      caption.textContent = link.dataset.caption || image.alt;
      dialog.showModal();
      document.body.classList.add('lightbox-open');
      close.focus();
    });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('lightbox-open');
    image.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
})();
