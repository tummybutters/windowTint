(() => {
 const cards=[...document.querySelectorAll('[data-vehicle-category]')],filters=[...document.querySelectorAll('[data-gallery-filter]')];
 const count=document.querySelector('#gallery-count'),dialog=document.querySelector('#work-lightbox');
 if(!cards.length||!dialog)return;
 const image=dialog.querySelector('img'),caption=dialog.querySelector('figcaption');let activeLinks=[],index=0,opener=null;
 function filter(value){cards.forEach(card=>card.hidden=value!=='all'&&!card.dataset.vehicleCategory.split(' ').includes(value));filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.galleryFilter===value)));const visible=cards.filter(c=>!c.hidden);count.textContent=`${visible.length} vehicles · ${visible.reduce((n,c)=>n+c.querySelectorAll('.car-card__image-link').length,0)} photos`}
 filters.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.galleryFilter)));
 function show(){const link=activeLinks[index];image.src=link.href;image.alt=link.querySelector('img')?.alt||'Obsidian window tint installation';caption.textContent=`${image.alt} · ${index+1} / ${activeLinks.length}`}
 function open(link,trigger){opener=trigger;activeLinks=cards.filter(c=>!c.hidden).flatMap(c=>[...c.querySelectorAll('.car-card__image-link')]);index=activeLinks.indexOf(link);if(index<0)return;show();dialog.showModal();dialog.querySelector('.work-lightbox-close').focus()}
 cards.forEach(card=>{const links=[...card.querySelectorAll('.car-card__image-link')];links.forEach(link=>link.addEventListener('click',event=>{event.preventDefault();open(link,link)}));if(links.length>3){const more=document.createElement('a');more.className='gallery-view-all';more.href=links[3].href;more.textContent=`View all ${links.length} photos`;more.addEventListener('click',event=>{event.preventDefault();open(links[0],more)});card.querySelector('.car-card__info').append(more)}});
 function next(direction){index=(index+direction+activeLinks.length)%activeLinks.length;show()}
 dialog.querySelector('.work-lightbox-close').addEventListener('click',()=>dialog.close());dialog.querySelector('.work-lightbox-prev').addEventListener('click',()=>next(-1));dialog.querySelector('.work-lightbox-next').addEventListener('click',()=>next(1));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();next(1)}if(event.key==='ArrowLeft'){event.preventDefault();next(-1)}});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
 dialog.addEventListener('close',()=>{image.removeAttribute('src');opener?.focus({preventScroll:true})});filter('all');
})();
