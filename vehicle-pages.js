(() => {
  const dialog = document.querySelector('.vehicle-lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  document.querySelectorAll('[data-vehicle-photo]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const source = link.querySelector('img');
      image.src = link.href;
      image.alt = source.alt;
      caption.textContent = source.alt;
      dialog.showModal();
    });
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  document.querySelectorAll('.vehicle-menu a').forEach((link) => {
    link.addEventListener('click', () => { link.closest('details').open = false; });
  });
})();
