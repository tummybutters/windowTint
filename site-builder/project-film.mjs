import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {renderProjectVideo} from '../assets/media/project-video.mjs';
import {button,origin,escape as e} from './components.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(new URL('../content/project-videos.json',import.meta.url),'utf8')).videos;
export function renderFilmSection(pagePath,{entries=catalog,siteRoot=root}={}){
 if(!['/','/window-tinting-gallery'].includes(pagePath))return '';
 const entry=entries.find(item=>item.status==='ready'&&item.provenanceVerified===true);
 if(!entry||!/^[a-z0-9-]+$/.test(entry.id||''))return '';
 const fallbackHref=entry.id==='bmw-ix-driveway'?'/watch-bmw-ix-driveway':entry.src;
 const player=renderProjectVideo(entry,{root:siteRoot,fallbackHref});if(!player)return '';
 const schema={"@context":"https://schema.org","@type":"VideoObject",name:entry.title,description:entry.caption,thumbnailUrl:origin+entry.poster,contentUrl:origin+entry.src,uploadDate:entry.uploadedOn,duration:`PT${entry.durationSeconds}S`};
 return `<section class="section container project-film" id="project-film" aria-labelledby="project-film-title"><div class="project-film-copy"><p class="eyebrow">From our work</p><h2 id="project-film-title">The finish.<br><em>In motion.</em></h2><p>${e(entry.caption)}</p>${pagePath==='/'?button('View the gallery','/window-tinting-gallery#gallery-work',true):button('Get my tint quote','/car-window-tinting-near-me#quote',true)}</div>${player.replace('<video ',`<video data-project-video="${entry.id}" `)}</section><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
}
