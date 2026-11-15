import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderFilmSection} from '../site-builder/project-film.mjs';
test('only the homepage and gallery receive the reviewed clip, with native manual playback',()=>{
 for(const route of ['/','/window-tinting-gallery']){
  const html=renderFilmSection(route);
  assert.match(html,/controls playsinline preload="none"/);
  assert.match(html,/bmw-ix-driveway-v1\.mp4/);
  assert.match(html,/bmw-ix-driveway-v1\.jpg/);
  assert.doesNotMatch(html,/autoplay|\sloop\b|iframe|googlevideo|instagram\.com/);
  assert.match(html,/VideoObject/);
 }
 for(const route of ['/car-window-tinting-near-me','/package','/commercial-window-film','/architectural-window-film'])assert.equal(renderFilmSection(route),'');
 assert.match(renderFilmSection('/'),/href="\/window-tinting-gallery#gallery-work"/);
 assert.match(renderFilmSection('/window-tinting-gallery'),/href="\/car-window-tinting-near-me#quote"/);
});
test('pending or unreviewed entries do not create a player, empty wrapper or schema',()=>{
 assert.equal(renderFilmSection('/',{entries:[{status:'needs-original'}]}),'');
 assert.equal(renderFilmSection('/',{entries:[{status:'ready',provenanceVerified:false}]}),'');
 assert.equal(renderFilmSection('/',{entries:[]}),'');
});
test('engagement tracking has no conversion claim or customer/query-string data',()=>{
 const js=fs.readFileSync(new URL('../assets/media/project-film.js',import.meta.url),'utf8');
 assert.match(js,/project_video_play/);assert.match(js,/project_video_complete/);
 assert.doesNotMatch(js,/conversion|generate_lead|location\.search|location\.href|fetch\(|XMLHttpRequest/);
});
