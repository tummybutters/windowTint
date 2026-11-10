(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const mobileViewport = window.matchMedia('(max-width: 900px)');

  if (toggle && nav) {
    if (!nav.id) nav.id = 'site-navigation';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');

    function setMenu(open, returnFocus = false) {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open && mobileViewport.matches);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.inert = mobileViewport.matches && !open;
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.site-header')) setMenu(false);
    });
    mobileViewport.addEventListener('change', () => setMenu(false));
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
          count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}`;
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
