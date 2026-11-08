/* Local real V2 registry/actions + real profile UI. Only auth/profile storage are synthetic. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin='https://test.skola.eduvize.cz',base=process.env.HOLIDAYS_TEST_API||'http://127.0.0.1:8797',frozen=process.env.HOLIDAYS_ACTIONS_V2;
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)||!frozen||!process.env.HOLIDAYS_NSP_SOURCE)throw Error('Loopback and exact frozen shared source required');
(async()=>{
 let lastPage;const errors=[];
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'});
 const values={viewMode:'web',country:'cz',monthFormat:'text',days:'0',tomorrow:true,holidays:true,significant:true,nameDetails:true};
 let config={schemaVersion:1,values,segment:{orientation:'landscape',style:1,block:1}},revision=1,profileWrites=0;const writes=[];
 const auth=`window.EduvizeAdminAuth={ready:Promise.resolve(),status:()=>({connected:true,schoolId:'${'a'.repeat(32)}',profileId:'${'b'.repeat(32)}',expiresAt:9999999999,scopes:['configurations','documents']}),getToken:()=> 'a',refresh:async()=>{},fetch:(url,options={})=>fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer a'}}),selectProfile:async()=>{}};`;
 async function routeAll(route){
  const req=route.request(),u=new URL(req.url());if(u.origin!==origin)return route.abort();
  if(u.pathname.endsWith('/nsp-segments.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(process.env.HOLIDAYS_NSP_SOURCE,'utf8')});
  if(u.pathname.endsWith('/admin-auth.js'))return route.fulfill({contentType:'text/javascript',body:auth});
  if(u.pathname.endsWith('/output-client.js')||u.pathname.endsWith('/output-actions.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(frozen,'source/design-system',path.basename(u.pathname)),'utf8')});
  if(u.pathname.startsWith('/api/admin/configuration-profiles')){
   if(req.method()==='PUT'){const body=req.postDataJSON();assert.equal(body.expectedRevision,revision);config=body.config;revision++;profileWrites++;return route.fulfill({json:{revision}});}
   if(u.pathname.endsWith('configuration-profiles'))return route.fulfill({json:{items:[{id:'b'.repeat(32),name:'Synthetic existing profile'}]}});
   return route.fulfill({json:{id:'b'.repeat(32),name:'Synthetic existing profile',revision,apps:{holidays:{revision,config}}}});
  }
  if(req.method()!=='GET'&&u.pathname.startsWith('/api/v1/'))writes.push({method:req.method(),path:u.pathname});
  const response=await route.fetch({url:base+u.pathname+u.search,maxRedirects:0});
  // Playwright redirect chains escape route matching; follow the verified real
  // resolver target as a new local-routed navigation, never contact remote TEST.
  if(u.pathname.startsWith('/o/')&&response.status()===307){
   const target=response.headers().location;assert.match(target,/^\/eduvize-svatky\/published\.html\?edu-output=[a-f0-9]{32}$/);
   return route.fulfill({contentType:'text/html',body:'<script>location.replace('+JSON.stringify(target)+')</script>'});
  }
  if(u.pathname.startsWith('/eduvize-styly/')&&u.pathname.endsWith('.js')){
   let body=await response.text();body=body.replaceAll('https://eduvize-dokumenty-api.onrender.com',origin).replaceAll('https://eduvize-admin.onrender.com',origin).replaceAll('https://eduvize-design-system-api.onrender.com',origin).replaceAll('https://pborovicka72-dotcom.github.io',origin);
   return route.fulfill({response,body});
  }
  return route.fulfill({response});
 }
 await context.route('**/*',routeAll);const page=await context.newPage();lastPage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-03T11:00:00Z')});
 await page.goto(origin+'/eduvize-svatky/config.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.EduvizeHolidaysOutputActions);
 await page.locator('[data-edu-profile-save]').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-edu-profile-save]').disabled);
 assert.equal(await page.locator('[id^="publication-"]').count(),0);
 assert.deepEqual(await page.locator('#generateOutput').evaluate(el=>[...el.parentElement.querySelectorAll('button')].map(x=>x.dataset.eduProfileSave!==undefined?'cloud-save':x.id)),['cloud-save','saveSettings','generateOutput','openOutput','save']);
 await page.locator('#generateOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('uložte'));assert.equal(writes.length,0);
 await page.locator('[data-edu-profile-save]').click();await page.waitForFunction(()=>document.querySelector('[data-edu-profile-panel] .edu-profile-panel__status').textContent.includes('Uloženo do Eduvize'));
 assert.equal(profileWrites,1);assert.equal(writes.length,0);assert.equal(config.presentation.mode,'web');assert.equal(config.presentation.geometry,null);assert.ok(config.values&&config.segment&&!config.data);
 await page.locator('#generateOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Odkaz je připravený'));
 await page.locator('#openOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('zkopírován'));
 const url=await page.evaluate(()=>navigator.clipboard.readText());assert.match(url,/^https:\/\/test\.skola\.eduvize\.cz\/o\/[a-f0-9]{32}$/);const n=writes.length;
 await page.locator('#saveSettings').click();assert.equal(writes.length,n);
 await page.locator('#country').selectOption('sk');await page.locator('#generateOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent==='Odkaz je připravený.');
 const id=url.split('/').pop();let snap=await(await context.request.get(base+'/api/public/v1/outputs/'+id)).json();assert.equal(snap.payload.country,'cz','Unsaved form must not publish');
 const beforeSave=writes.length;await page.locator('[data-edu-profile-save]').click();await page.waitForFunction(()=>document.querySelector('[data-edu-profile-panel] .edu-profile-panel__status').textContent.includes('Uloženo do Eduvize'));assert.equal(writes.length,beforeSave);
 await page.locator('#generateOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent==='Odkaz je připravený.');snap=await(await context.request.get(base+'/api/public/v1/outputs/'+id)).json();assert.equal(snap.payload.country,'sk');
 await page.locator('#openOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('zkopírován'));assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),url);
 // Fresh browser with no journal: Copy/Open must discover only through V2 GET lookup.
 const second=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'});await second.route('**/*',routeAll);const other=await second.newPage();
 await other.goto(origin+'/eduvize-svatky/config.html',{waitUntil:'domcontentloaded'});await other.waitForFunction(()=>!!window.EduvizeHolidaysOutputActions);
 const beforeCopy=writes.length;await other.locator('#openOutput').click();await other.waitForFunction(()=>document.querySelector('#result').textContent.includes('zkopírován'));assert.equal(await other.evaluate(()=>navigator.clipboard.readText()),url);assert.equal(writes.length,beforeCopy);
 await other.locator('#save').click();await other.waitForURL(/published\.html\?edu-output=/);await other.waitForFunction(()=>!!window.EduvizePublishedOutput&&document.querySelector('main').innerText.includes('Dnes oslavuje'));assert.ok((await other.locator('main').innerText()).includes('Dnes oslavuje'));assert.equal(writes.length,beforeCopy);
 // Save the actual kiosk preview viewport and all Presentation fields without registry writes.
 await page.locator('#viewMode').selectOption('kiosk');await page.locator('.edu-web-preview-controls button').nth(1).click();await page.waitForFunction(()=>document.querySelector('#ev-preview iframe')?.getAttribute('data-preview-height')==='3840');
 const beforeKiosk=writes.length;await page.locator('[data-edu-profile-save]').click();await page.waitForFunction(()=>document.querySelector('[data-edu-profile-panel] .edu-profile-panel__status').textContent.includes('Uloženo do Eduvize'));assert.equal(writes.length,beforeKiosk);assert.deepEqual(config.presentation.geometry,{registryId:'kiosk-viewport',registryVersion:1,orientation:'portrait',width:2160,height:3840});assert.equal(config.presentation.interaction,'interactive');assert.ok(['menu','tiles'].includes(config.presentation.kioskLayout));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#viewMode').value==='kiosk'&&document.querySelector('#ev-preview iframe')?.getAttribute('data-preview-height')==='3840');
 assert.equal(writes.length,beforeKiosk);
 await page.screenshot({path:'eduvize-svatky/audit/output-admin-v2.png',fullPage:true});assert.deepEqual(errors,[]);
 fs.writeFileSync('eduvize-svatky/audit/output-admin-v2-results.json',JSON.stringify({environment:'local-real-v2-registry-actions-synthetic-profile-auth',remoteTestVerified:false,saveDoesNotPublish:true,fullPresentationSaved:true,nativeEnvelopePreserved:true,unsavedChangesNotPublished:true,stableUpdateURL:true,freshBrowserCopyOpenGETOnly:true,technicalPanelRemoved:true,controlOrderPreserved:true,profileWrites,registryWrites:writes.length,errors},null,2));
 await second.close();await context.close();console.log('Ordinary V2 administration flow passed');
 }catch(e){console.error('failure',e.message);if(lastPage)console.error(await lastPage.evaluate(()=>({result:document.querySelector('#result')?.textContent,profile:document.querySelector('[data-edu-profile-panel]')?.textContent,actionReady:!!window.EduvizeHolidaysOutputActions,segment:window.EduvizeSegmentSelection?.params(),mode:document.querySelector('#viewMode')?.value})));console.error('pageErrors',errors);throw e;}finally{for(const c of browser.contexts())await c.unrouteAll({behavior:'ignoreErrors'});await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
