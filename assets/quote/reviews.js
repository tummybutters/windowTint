// Existing website's Google review excerpts; photos are separate recent work, not identified reviewer vehicles.
(()=>{
// Curated rows mix vehicles and settings. Advance a full row so no photo carries over.
// Only use real work assets at least 900px wide; thumbnail-only work stays out of large tiles.
let photos=[
 [
  "/gallery/optimized/gallery-cards/bmw-m4-01.webp",
  "BMW M4 window tint by Obsidian",
  "50% 50%"
 ],
 [
  "/assets/paid-landing/tesla-model-y-front.webp",
  "Tesla Model Y window tint at a mobile appointment",
  "50% 72%"
 ],
 [
  "/gallery/optimized/gallery-cards/toyota-tacoma-01.webp",
  "Toyota Tacoma window tint by Obsidian",
  "50% 50%"
 ],
 [
  "/gallery/optimized/gallery-cards/lexus-gx-01.webp",
  "Lexus GX window tint by Obsidian",
  "50% 50%"
 ],
 [
  "/assets/paid-landing/mobile-porsche-side.webp",
  "Porsche 911 window tint at home",
  "50% 70%"
 ],
 [
  "/gallery/optimized/gallery-cards/cadillac-lyriq-01.webp",
  "Cadillac Lyriq window tint by Obsidian",
  "50% 50%"
 ],
 [
  "/gallery/optimized/gallery-cards/mercedes-benz-gls-01.webp",
  "Mercedes-Benz GLS window tint by Obsidian",
  "50% 60%"
 ],
 [
  "/gallery/optimized/gallery-cards/toyota-4runner-01.webp",
  "Toyota 4Runner window tint by Obsidian",
  "50% 50%"
 ],
 [
  "/gallery/optimized/gallery-cards/bmw-x3-01.webp",
  "BMW X3 window tint by Obsidian",
  "50% 50%"
 ],
 [
  "/gallery/optimized/gallery-cards/porsche-cayenne-coupe-01.webp",
  "Porsche Cayenne Coupe window tint by Obsidian",
  "50% 60%"
 ],
 [
  "/assets/paid-landing/tesla-model-y-rear.webp",
  "Tesla Model Y tinted rear glass",
  "50% 65%"
 ],
 [
  "/gallery/optimized/gallery-cards/toyota-tacoma-03.webp",
  "Toyota Tacoma finished tint, another angle",
  "50% 50%"
 ],
 [
  "/assets/paid-landing/tesla-glass-roof.webp",
  "Tesla panoramic glass",
  "50% 50%"
 ],
 [
  "/assets/paid-landing/mobile-porsche-rear.webp",
  "Porsche 911 finished tint, rear view",
  "50% 50%"
 ],
 [
  "/assets/paid-landing/mobile-porsche-front.webp",
  "Porsche 911 finished tint, front view",
  "50% 70%"
 ],
 [
  "/gallery/optimized/gallery-cards/bmw-x3-02.webp",
  "BMW X3 finished tint, another angle",
  "50% 50%"
 ],
 [
  "/gallery/optimized/gallery-cards/toyota-4runner-02.webp",
  "Toyota 4Runner finished tint, another angle",
  "50% 50%"
 ],
 [
  "/gallery/optimized/gallery-cards/porsche-cayenne-coupe-03.webp",
  "Porsche Cayenne Coupe finished tint, another angle",
  "50% 60%"
 ]
];
let proofPath=location.pathname;try{if(window.parent!==window&&window.parent.location.origin===location.origin)proofPath=window.parent.location.pathname}catch{}
if(proofPath.startsWith('/tesla-'))photos=[photos[1],photos[10],['/assets/paid-landing/tesla-glass-roof.webp','Tesla panoramic glass','50% 60%'],...photos.filter((_,i)=>i!==1&&i!==10&&i!==12)];
const phoneLayout=matchMedia('(max-width:700px)');let rowSize=phoneLayout.matches?1:3,rowCount=Math.ceil(photos.length/rowSize);
function rowPhotos(row){return photos.slice(row*rowSize,(row+1)*rowSize)}
function preloadNext(){rowPhotos((index+1)%rowCount).forEach(([src])=>{const image=new Image();image.src=src})}
const reviews=[['Mark Cruz','Definitely gives it a new look.'],['Ahmad Bond',"The truck looks very nice. I'm going to recommend you with friends and family."],['Corinna Townsend','Thanks again. I love the results.'],['Joe Le',"I appreciate your commitment to the detail."],['Alex Brockman','Best tinting service in OC! Whole car looks sleek now.'],['Nesha Bowman','The attention to detail is insane.']];
const root=document.querySelector('.proof'),images=document.querySelector('#work-photo-tiles'),review=document.querySelector('#review-content'),pause=document.querySelector('#review-pause');const reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,paused=reduced.matches,hover=false,focused=false,inView=false,busy=false;
function render(){images.innerHTML=rowPhotos(index).map(([src,alt,position])=>{return `<figure><img src="${src}" alt="${alt}" style="object-position:${position}" decoding="async" width="600" height="400" loading="lazy"></figure>`}).join('');const [name,quote]=reviews[index%reviews.length];review.replaceChildren();const meta=document.createElement('div');meta.className='review-meta';const stars=document.createElement('span');stars.className='review-stars';stars.textContent='★★★★★';stars.setAttribute('aria-label','5 out of 5 stars');const author=document.createElement('span');author.textContent=name;const link=document.createElement('a');link.href='https://www.google.com/search?q=Obsidian+Mobile+Window-Tinting+OC+Reviews';link.target='_blank';link.rel='noopener';link.textContent='Google review ↗';meta.append(stars,author,link);const quoteEl=document.createElement('blockquote');quoteEl.textContent='“'+quote+'”';review.append(meta,quoteEl);preloadNext()}
phoneLayout.addEventListener('change',()=>{rowSize=phoneLayout.matches?1:3;rowCount=Math.ceil(photos.length/rowSize);index=0;render()});
function sync(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Play carousel':'Pause carousel')}
async function advance(direction=1){if(busy)return;busy=true;root.classList.add('changing');if(!reduced.matches)await new Promise(r=>setTimeout(r,180));index=(index+direction+rowCount)%rowCount;render();root.classList.remove('changing');busy=false}
function manual(direction){paused=true;sync();advance(direction)}
document.querySelector('#review-prev').onclick=()=>manual(-1);document.querySelector('#review-next').onclick=()=>manual(1);pause.onclick=()=>{paused=!paused;sync()};root.addEventListener('mouseenter',()=>hover=true);root.addEventListener('mouseleave',()=>hover=false);root.addEventListener('focusin',()=>focused=true);root.addEventListener('focusout',e=>{focused=root.contains(e.relatedTarget)});root.addEventListener('touchstart',()=>{paused=true;sync()},{passive:true});new IntersectionObserver(entries=>inView=entries[0].isIntersecting,{threshold:.25}).observe(root);reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;sync()}});setInterval(()=>{if(!paused&&!hover&&!focused&&inView&&!document.hidden)advance()},6500);render();sync();
})();
