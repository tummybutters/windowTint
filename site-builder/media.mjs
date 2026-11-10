import fs from 'node:fs';
const file=new URL('../content/image-variants.json',import.meta.url);
const variants=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
const escape=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function imageTag(source,alt,{loading='lazy',sizes='(max-width: 760px) calc(100vw - 40px), 50vw',thumbnail=false,width=1200,height=1000}={}) {
 const src=source.startsWith('/')?source:'/'+source;
 const v=variants[src];
 const actual=thumbnail&&v?v.thumbnail:v?.display||src;
 const responsive=v&&!thumbnail?` srcset="${escape(v.thumbnail)} ${Math.min(320,v.width)}w, ${escape(v.display)} ${v.width}w" sizes="${escape(sizes)}"`:'';
 return `<img src="${escape(actual)}"${responsive} alt="${escape(alt)}" width="${thumbnail&&v?Math.min(320,v.width):v?.width||width}" height="${thumbnail&&v?Math.round(v.height*Math.min(320,v.width)/v.width):v?.height||height}" loading="${loading}" decoding="async">`;
}
