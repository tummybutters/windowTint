import fs from 'node:fs';
const file=process.argv[2]||'content/pages.json';
const pages=JSON.parse(fs.readFileSync(file));
const indexed=pages.filter(p=>p.division!=='shared');
const words=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
const normal=s=>words(s).join(' ');
const repeated=key=>{
 const grouped=new Map();for(const p of indexed){const value=normal(p[key]);if(value){const paths=grouped.get(value)||[];paths.push(p.path);grouped.set(value,paths)}}
 return [...grouped].filter(([,ps])=>ps.length>1).map(([text,paths])=>({text,paths}));
};
const blocks=new Map();for(const p of indexed)for(const s of p.sections||[]){if(words(s.body).length<35)continue;const key=normal(s.body);const paths=blocks.get(key)||[];paths.push(p.path);blocks.set(key,paths)}
const repeatedParagraphs=[...blocks].filter(([,ps])=>new Set(ps).size>1).map(([text,paths])=>({excerpt:text.slice(0,160),paths:[...new Set(paths)]}));
const shingles=indexed.map(p=>{const w=words((p.sections||[]).map(s=>s.body).join(' '));return new Set(w.slice(0,-4).map((_,i)=>w.slice(i,i+5).join(' ')))});
const nearDuplicates=[];for(let i=0;i<indexed.length;i++)for(let j=i+1;j<indexed.length;j++){let shared=0;const a=shingles[i],b=shingles[j];if(!a.size||!b.size)continue;for(const s of a)if(b.has(s))shared++;const overlap=shared/(a.size+b.size-shared);if(overlap>.35)nearDuplicates.push({pages:[indexed[i].path,indexed[j].path],fiveWordOverlap:Number(overlap.toFixed(3))})}
const generic=/choose your project|bring the details that make a recommendation useful|send the details for your vehicle|explore the service, review the relevant glass/i;
const genericPages=indexed.filter(p=>generic.test(p.intro+' '+(p.sections||[]).map(s=>s.heading).join(' '))).map(p=>p.path);
const relatedGroups=new Map();for(const p of indexed){const key=[...(p.relatedPaths||[])].sort().join('|');const paths=relatedGroups.get(key)||[];paths.push(p.path);relatedGroups.set(key,paths)}
const repeatedLinkSets=[...relatedGroups].filter(([,ps])=>ps.length>4).map(([links,paths])=>({links:links.split('|'),paths}));
const thinPages=indexed.map(p=>({path:p.path,words:words(p.intro+' '+(p.sections||[]).map(s=>s.body).join(' ')).length})).filter(p=>p.words<170);
const imageGroups=new Map();for(const p of indexed)if(p.image){const ps=imageGroups.get(p.image)||[];ps.push(p.path);imageGroups.set(p.image,ps)}
const report={pages:pages.length,reviewed:indexed.length,repeatedIntros:repeated('intro'),repeatedDescriptions:repeated('description'),repeatedParagraphs,nearDuplicates:nearDuplicates.sort((a,b)=>b.fiveWordOverlap-a.fiveWordOverlap),genericPages,repeatedLinkSets,thinPages,heroImageUsage:[...imageGroups].map(([image,paths])=>({image,paths})),pagesWithoutGenericHero:indexed.filter(p=>!p.image).length};
report.passed=!report.repeatedIntros.length&&!report.repeatedDescriptions.length&&!repeatedParagraphs.length&&!nearDuplicates.length&&!genericPages.length&&!repeatedLinkSets.length&&!thinPages.length;
console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;
