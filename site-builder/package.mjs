import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public');
const browserDirectories=new Set([
  'ads-assets','assets','gallery','experiments','quote','package','driveway-package','generated',
  'commercial-window-tinting-orange-county','office-window-tinting-orange-county',
  'tesla-model-3-window-tint','tesla-model-y-window-tint'
]);
const browserExtensions=new Set(['.html','.htm','.js','.css','.jpg','.jpeg','.png','.webp','.avif','.gif','.svg','.ico','.woff','.woff2','.ttf','.otf','.mp4','.webm']);
const rootFiles=new Set(['robots.txt','sitemap.xml']);
let count=0;
let bytes=0;

function browserFile(filename,relative){
  if(browserExtensions.has(path.extname(filename).toLowerCase()))return true;
  if(rootFiles.has(relative)||relative==='assets/fonts/OFL.txt')return true;
  if(path.extname(filename))return false;
  const handle=fs.openSync(filename,'r');
  const buffer=Buffer.alloc(512);
  let length;
  try{length=fs.readSync(handle,buffer,0,buffer.length,0)}finally{fs.closeSync(handle)}
  return /<!doctype\s+html|<html\b/i.test(buffer.subarray(0,length).toString('utf8'));
}

function copyDirectory(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
    const source=path.join(directory,entry.name);
    const relative=path.relative(root,source);
    if(entry.isDirectory()){
      if(directory!==root||browserDirectories.has(entry.name))copyDirectory(source);
      continue;
    }
    if(!entry.isFile()||!browserFile(source,relative))continue;
    const target=path.join(output,relative);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(source,target);
    count++;
    bytes+=fs.statSync(source).size;
  }
}

// public/ contains only regenerated browser output; source and API code stay outside it.
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output);
copyDirectory(root);
console.log(`Packaged ${count} browser files (${(bytes/1024/1024).toFixed(1)} MiB) into public/.`);
