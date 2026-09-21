// Existing website's Google review excerpts; photos are separate recent work, not identified reviewer vehicles.
(()=>{
// Curated rows mix vehicles and settings. Advance a full row so no photo carries over.
let photos=[
 ['/gallery/optimized/home-proof/recent-work-11.jpg','Red Ferrari at a mobile tint appointment'],
 ['/gallery/optimized/home-proof/recent-work-23.jpg','White Ford Raptor with finished window tint'],
 ['/assets/quote/work-bmw.jpg','BMW window tint by Obsidian'],
 ['/gallery/optimized/home-proof/recent-work-04.jpg','Tesla Model 3 with finished window tint'],
 ['/assets/quote/work-lexus.jpg','Lexus window tint by Obsidian'],
 ['/gallery/optimized/home-proof/recent-work-12.jpg','White Corvette with finished window tint'],
 ['/assets/quote/work-mercedes.jpg','Mercedes window tint by Obsidian'],
 ['/assets/quote/work-truck.jpg','Toyota Tacoma window tint by Obsidian'],
 ['/gallery/optimized/home-proof/recent-work-10.jpg','Orange classic Porsche at a mobile appointment'],
 ['/gallery/optimized/gallery-cards/cadillac-lyriq-01.webp','Cadillac Lyriq window tint by Obsidian'],
 ['/gallery/optimized/home-proof/recent-work-02.jpg','Tesla Model Y with finished window tint'],
 ['/gallery/optimized/home-proof/recent-work-19.jpg','Black performance sedan with finished window tint'],
 ['/assets/quote/work-4runner.jpg','Toyota 4Runner window tint by Obsidian'],
 ['/gallery/optimized/gallery-cards/bmw-x3-01.webp','BMW X3 window tint by Obsidian'],
 ['/gallery/optimized/home-proof/recent-work-16.jpg','Dark vehicle after a mobile tint installation'],
 ['/assets/quote/work-porsche.jpg','Porsche window tint by Obsidian'],
 ['/gallery/optimized/home-proof/recent-work-13.jpg','Tesla white interior and panoramic glass'],
 ['/gallery/optimized/home-proof/recent-work-21.jpg','White luxury SUV with finished window tint']
];
// Lead with authentic Tesla work on Tesla entry pages; retain other shop work for variety.
let proofPath=location.pathname;try{if(window.parent!==window&&window.parent.location.origin===location.origin)proofPath=window.parent.location.pathname}catch{}
if(proofPath.startsWith('/tesla-'))photos=[
 ['/gallery/optimized/home-proof/recent-work-02.jpg','Tesla Model Y tint, rear view'],
 ['/gallery/optimized/home-proof/recent-work-04.jpg','Tesla Model 3 window tint'],
 ['/assets/paid-landing/tesla-glass-roof.webp','Tesla panoramic glass'],
 ...photos.filter(([src])=>!['recent-work-04.jpg','recent-work-02.jpg','recent-work-13.jpg'].some(name=>src.endsWith(name)))
];
const phoneLayout=matchMedia('(max-width:700px)');let rowSize=phoneLayout.matches?1:3,rowCount=Math.ceil(photos.length/rowSize);
function rowPhotos(row){return photos.slice(row*rowSize,(row+1)*rowSize)}
function preloadNext(){rowPhotos((index+1)%rowCount).forEach(([src])=>{const image=new Image();image.src=src})}
const reviews=[['Mark Cruz','Definitely gives it a new look.'],['Ahmad Bond',"The truck looks very nice. I'm going to recommend you with friends and family."],['Corinna Townsend','Thanks again. I love the results.'],['Joe Le',"I appreciate your commitment to the detail."],['Alex Brockman','Best tinting service in OC! Whole car looks sleek now.'],['Nesha Bowman','The attention to detail is insane.']];
const root=document.querySelector('.proof'),images=document.querySelector('#work-photos'),review=document.querySelector('#review-content'),pause=document.querySelector('#review-pause');const reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,paused=reduced.matches,hover=false,focused=false,inView=false,busy=false;
function render(){images.innerHTML=rowPhotos(index).map(([src,alt])=>{return `<figure><img src="${src}" alt="${alt}" width="600" height="400" loading="lazy"></figure>`}).join('');const [name,quote]=reviews[index%reviews.length];review.replaceChildren();const meta=document.createElement('div');meta.className='review-meta';const stars=document.createElement('span');stars.className='review-stars';stars.textContent='★★★★★';stars.setAttribute('aria-label','5 out of 5 stars');const author=document.createElement('span');author.textContent=name;const link=document.createElement('a');link.href='https://www.google.com/search?q=Obsidian+Mobile+Window-Tinting+OC+Reviews';link.target='_blank';link.rel='noopener';link.textContent='Google review ↗';meta.append(stars,author,link);const quoteEl=document.createElement('blockquote');quoteEl.textContent='“'+quote+'”';review.append(meta,quoteEl);preloadNext()}
phoneLayout.addEventListener('change',()=>{rowSize=phoneLayout.matches?1:3;rowCount=Math.ceil(photos.length/rowSize);index=0;render()});
function sync(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Play carousel':'Pause carousel')}
async function advance(direction=1){if(busy)return;busy=true;root.classList.add('changing');if(!reduced.matches)await new Promise(r=>setTimeout(r,180));index=(index+direction+rowCount)%rowCount;render();root.classList.remove('changing');busy=false}
function manual(direction){paused=true;sync();advance(direction)}
document.querySelector('#review-prev').onclick=()=>manual(-1);document.querySelector('#review-next').onclick=()=>manual(1);pause.onclick=()=>{paused=!paused;sync()};root.addEventListener('mouseenter',()=>hover=true);root.addEventListener('mouseleave',()=>hover=false);root.addEventListener('focusin',()=>focused=true);root.addEventListener('focusout',e=>{focused=root.contains(e.relatedTarget)});root.addEventListener('touchstart',()=>{paused=true;sync()},{passive:true});new IntersectionObserver(entries=>inView=entries[0].isIntersecting,{threshold:.25}).observe(root);reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;sync()}});setInterval(()=>{if(!paused&&!hover&&!focused&&inView&&!document.hidden)advance()},6500);render();sync();
})();
