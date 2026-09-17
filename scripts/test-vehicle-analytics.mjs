import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../vehicle-analytics.js', import.meta.url), 'utf8');
for (const hostname of ['localhost', '127.0.0.1', 'example.vercel.app', 'www.obsidianautoworksoc.com']) {
  const scripts = [];
  const window = { location: { hostname, href: `https://${hostname}/toyota-tacoma-window-tinting?phone=5551234567&cid=private&utm_source=google&utm_campaign=customer%40example.com#private` } };
  vm.runInNewContext(source, { URL, window, document: { referrer: 'https://example.com/?email=private@example.com', createElement: () => ({}), head: { appendChild: (script) => scripts.push(script) } } });
  if (hostname === 'www.obsidianautoworksoc.com') {
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TR9ET60HX3');
    assert.equal(scripts[0].async, true);
    assert.equal(window.dataLayer.length, 4);
    assert.equal(window.dataLayer[0][0], 'set');
    assert.equal(window.dataLayer[0][1].page_location, 'https://www.obsidianautoworksoc.com/toyota-tacoma-window-tinting?utm_source=google');
    assert.equal(window.dataLayer[0][1].page_referrer, 'https://example.com/');
    assert.equal(window.dataLayer[2][1], 'G-TR9ET60HX3');
    assert.equal(window.dataLayer[3][1], 'AW-17846304809');
  } else {
    assert.equal(scripts.length, 0);
    assert.equal(window.dataLayer, undefined);
  }
}
console.log('PASS: existing Google analytics IDs on canonical production host only; no local/preview Google traffic.');
