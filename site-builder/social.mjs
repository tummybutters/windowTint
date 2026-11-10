import {imageTag} from './media.mjs';
import fs from 'node:fs';
import {escape as e} from './components.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../content/social.json', import.meta.url),'utf8'));
export function instagramSection() {
  if(!data.instagram)return '';
  const {url,handle}=data.instagram;
  if(!/^https:\/\/www\.instagram\.com\/[a-zA-Z0-9_.]+\/$/.test(url))throw new Error('Expected a public Instagram profile URL');
  return `<section class="section container instagram-section" id="instagram" aria-labelledby="instagram-heading"><div class="instagram-heading"><div><p class="eyebrow">The work, beyond the website</p><h2 id="instagram-heading">See what rolls<br><em>through next.</em></h2></div><div class="instagram-intro"><p>A closer look at the cars, the details and the work. Follow Obsidian on Instagram.</p><a class="instagram-follow" href="${e(url)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none"/></svg><span>${e(handle)}</span><span aria-hidden="true">↗</span></a></div></div><a class="instagram-gallery" href="${e(url)}" target="_blank" rel="noopener" aria-label="Visit ${e(handle)} on Instagram, opens in a new tab">${data.images.map((image,i)=>`<span class="instagram-photo instagram-photo--${i+1}">${imageTag(image.src,image.alt,{sizes:'(max-width: 760px) 45vw, 30vw'})}${i===2?'<span class="instagram-photo-label">Follow the work <span aria-hidden="true">↗</span></span>':''}</span>`).join('')}</a><p class="instagram-caption">A few favorites from the Obsidian project gallery.</p></section>`;
}
