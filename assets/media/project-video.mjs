// Build-time component. Source footage and its provenance must be reviewed before
// status becomes ready; unavailable media produces no public markup.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const siteRoot=fileURLToPath(new URL('../../',import.meta.url));
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function localFile(src,root,extensions){
  if(typeof src!=='string'||!/^\/assets\/media\/[a-z0-9/_-]+\.[a-z0-9]+$/i.test(src)||!extensions.includes(path.extname(src).toLowerCase()))return null;
  try{
    const base=fs.realpathSync(root),file=fs.realpathSync(path.join(base,src.slice(1)));
    return file.startsWith(base+path.sep)&&fs.statSync(file).isFile()&&fs.statSync(file).size>0?file:null;
  }catch{return null;}
}
export function renderProjectVideo(entry,{root=siteRoot,fallbackHref=entry?.src}={}){
  if(!entry||entry.status!=='ready'||entry.provenanceVerified!==true||!entry.title||!Number.isFinite(entry.durationSeconds)||entry.durationSeconds<=0||entry.durationSeconds>30)return '';
  const file=localFile(entry.src,root,['.mp4','.webm']);
  if(!file||!localFile(entry.poster,root,['.webp','.jpg','.jpeg','.png']))return '';
  const header=Buffer.alloc(12);let handle;
  try{handle=fs.openSync(file,'r');fs.readSync(handle,header,0,12,0);}catch{return '';}finally{if(handle!==undefined)fs.closeSync(handle);}
  const mp4=path.extname(file).toLowerCase()==='.mp4';
  if(mp4?header.toString('ascii',4,8)!=='ftyp':header.readUInt32BE(0)!==0x1a45dfa3)return '';
  const width=Number.isInteger(entry.width)&&entry.width>0?entry.width:1280;
  const height=Number.isInteger(entry.height)&&entry.height>0?entry.height:720;
  return `<figure class="project-video"><div class="project-video-stage" style="--media-ratio:${width}/${height}"><video controls playsinline preload="none" poster="${escapeHTML(entry.poster)}" width="${width}" height="${height}" aria-label="${escapeHTML(entry.title)}"><source src="${escapeHTML(entry.src)}" type="${mp4?'video/mp4':'video/webm'}">Your browser does not support embedded video. <a href="${escapeHTML(fallbackHref)}">Watch the project clip.</a></video><button class="project-video-play" type="button" hidden aria-label="Play ${escapeHTML(entry.title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></button></div></figure>`;
}
