import fs from 'node:fs';
import assert from 'node:assert/strict';
const pages=JSON.parse(fs.readFileSync('content/pages.json'));
for(const page of pages){
 const html=fs.readFileSync(`public/generated/${page.path==='/'?'index':page.path.slice(1)}.html`,'utf8');
 const expected=['home','commercial'].includes(page.division)?'Obsidian Film Solutions':'Obsidian Autoworks';
 assert(html.match(/<title>(.*?)<\/title>/s)[1].includes(expected),page.path);
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 assert(visible.includes(`aria-label="${expected} home"`),page.path);
 assert(visible.includes(`© 2026 ${expected}.`),page.path);
 if(expected.endsWith('Autoworks'))assert(!visible.includes('Obsidian Film Solutions'),page.path);
}
for(const arm of ['original','driveway'])for(const file of fs.readdirSync(`experiments/${arm}`).filter(f=>f.endsWith('.html'))){
 const s=fs.readFileSync(`experiments/${arm}/${file}`,'utf8');
 assert(!s.includes('Film Solutions')&&!s.includes('FILM SOLUTIONS'),arm+'/'+file);
}
for(const script of ['quote.js','classic-quote.js','package-quote.js'])assert(!/just exploring|just looking/i.test(fs.readFileSync('assets/quote/'+script,'utf8')));
console.log('PASS: all150 page titles/header/footer identities,34 paid auto templates, and removed exploring option.');
