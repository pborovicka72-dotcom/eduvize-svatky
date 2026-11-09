import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function readConfig()'),html.indexOf('cfg=readConfig();'));
const defaults={viewMode:'nsp',country:'cz',monthFormat:'text',days:0,tomorrow:true,holidays:true,significant:true,nameDetails:true};
const run=query=>{const scope={defaults,params:new URLSearchParams(query),localStorage:{getItem(){throw Error('Public output consulted local draft')}}};vm.runInNewContext(source,scope);return scope.readConfig()};
assert.equal(run('').country,'cz');assert.equal(run('').days,0);
const chosen=run('country=sk&days=4&nameDetails=0&viewMode=kiosk');assert.equal(chosen.country,'sk');assert.equal(chosen.days,4);assert.equal(chosen.nameDetails,false);assert.equal(chosen.viewMode,'kiosk');
assert.equal(run('days=99').days,6);assert.equal(run('days=-2').days,0);assert.equal(run('days=oops').days,0);
for(const file of ['index.html','config.html']){const s=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.ok(!s.includes('.onrender.com'));assert.ok(!s.includes('https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/'));}
console.log('Public calendar configuration is isolated from browser drafts; local assets have no direct Render URL.');
