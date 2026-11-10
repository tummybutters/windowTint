(function () {
 const selector='img[data-deferred-src]';
 function load(img){
  const src=img.getAttribute('data-deferred-src');if(!src)return;
  const srcset=img.getAttribute('data-deferred-srcset');
  if(srcset)img.setAttribute('srcset',srcset);
  img.setAttribute('src',src);
  img.removeAttribute('data-deferred-src');img.removeAttribute('data-deferred-srcset');
 }
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){load(entry.target);observer.unobserve(entry.target)}
 },{rootMargin:'300px 0px'}):null;
 function observe(root=document){for(const img of root.querySelectorAll(selector)){if(observer)observer.observe(img);else load(img)}}
 window.ObsidianMedia={observe};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>observe());else observe();
})();
