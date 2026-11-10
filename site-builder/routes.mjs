import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'site-builder/routing-baseline.json'),'utf8'));
const pages=JSON.parse(fs.readFileSync(path.join(root,'content/pages.json'),'utf8'));
const overrides=[];
for(const rule of config.rewrites){
  if(rule.has || !rule.destination.startsWith('/experiments/original/'))continue;
  for(const [key,value] of [['experience','original'],['experiment_variant','old_setup']]){
    overrides.push({...rule,has:[{type:'query',key,value}]});
  }
  for(const key of ['gclid','gbraid','wbraid']){
    overrides.push({...rule,has:[{type:'query',key}]});
  }
}
const explicit=config.rewrites.filter(rule=>rule.has);
const assignedDriveway=explicit.filter(rule=>rule.destination.startsWith('/experiments/driveway/')).map(rule=>({...rule,has:[{type:'query',key:'experiment_variant',value:'driveway_offer'}]}));
const generated=pages.map(page=>({
  source:page.path,
  destination:page.path==='/'?'/generated':'/generated'+page.path
}));
config.framework=null;
config.buildCommand='npm run build';
config.outputDirectory='public';
config.rewrites=[
  ...explicit,...assignedDriveway,...overrides,...generated,
  {source:'/quote/home',destination:'/quote/home'},
  ...config.rewrites.filter(rule=>!rule.has)
];
config.headers.push({source:'/quote/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, follow'}]});
fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify(config,null,2)+'\n');
console.log('Updated generated routes; retained explicit experiments and paid entry rules.');
