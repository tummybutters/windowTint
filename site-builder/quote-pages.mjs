import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {header,footer} from './components.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let html=fs.readFileSync(path.join(root,'architectural-window-film'),'utf8');
html=html.replace(/Obsidian Autoworks/g,'Obsidian Film Solutions').replace(/Obsidian%20Autoworks/g,'Obsidian%20Film%20Solutions');
html=html.replace(/<nav class="nav">[\s\S]*?<\/nav>/,header('home'));
html=html.replace(/<footer class="footer">[\s\S]*?<\/footer>/,footer('home'));
html=html.replace('<main class="residential-page">','<main id="main" class="residential-page">');
html=html.replace(/<meta[^>]+name=["']robots["'][^>]*>/gi,'');
html=html.replace('</head>','<meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/assets/site/style.css"><link rel="stylesheet" href="/assets/site/layout.css"><script defer src="/assets/site/interactions.js"></script></head>');
// Original page used relative asset paths at the root; quote routes are nested.
html=html.replace(/(src|href)="(?!https?:|\/|#|tel:|sms:|mailto:)([^"]+)"/g,'$1="/$2"');
fs.mkdirSync(path.join(root,'quote'),{recursive:true});
fs.writeFileSync(path.join(root,'quote/home.html'),html);
