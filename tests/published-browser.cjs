/* Real local shared API + app adapter; no fabricated snapshot/licence responses. */
const {chromium,request}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
const base=process.env.HOLIDAYS_TEST_API||'http://127.0.0.1:8794',origin='https://test.skola.eduvize.cz';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Loopback integration harness required');
(async()=>{
 const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Authorization:'Bearer a'}});
 const mutate=async(method,url,data)=>{const r=await api[method](url,{data,headers:{'Idempotency-Key':crypto.randomUUID()}});assert.ok(r.ok(),await r.text());return r.json()};
 const fixtures=JSON.parse(fs.readFileSync('eduvize-svatky/tests/fixtures/presentation.json','utf8'));
 const payload={country:'cz',monthFormat:'text',days:3,tomorrow:true,holidays:true,significant:true,nameDetails:true};
 const assembly=await mutate('post','/api/v1/output-assemblies',{schemaVersion:1,appId:'holidays',profileId:'b'.repeat(32)});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const results=[];
 for(const [label,presentation] of Object.entries({...fixtures,'kiosk-landscape':{mode:'kiosk',interaction:'interactive',kioskLayout:'tiles',geometry:{registryId:'kiosk-viewport',registryVersion:1,orientation:'landscape',width:1920,height:1080}}})){
  const draft={schemaVersion:1,payloadVersion:1,payload,presentation};
  let o=await mutate('post','/api/v1/outputs',{schemaVersion:1,appId:'holidays',profileId:'b'.repeat(32),assemblyId:assembly.id,draft});
  o=await mutate('post','/api/v1/outputs/'+o.id+'/publish',{expectedRevision:o.revision});
  const context=await browser.newContext({viewport:label==='kiosk'?{width:1080,height:1920}:{width:1920,height:1080},serviceWorkers:'block'}),page=await context.newPage(),network=[],errors=[],denied=[];
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());network.push(u.origin+u.pathname);
   if(u.origin!==origin){denied.push(u.origin+u.pathname);return route.abort();}
   const response=await route.fetch({url:base+u.pathname+u.search,maxRedirects:0});return route.fulfill({response});
  });
  await page.clock.install({time:new Date('2026-11-03T11:00:00Z')});
  await page.addInitScript(()=>{localStorage.setItem('eduvize-holidays-config',JSON.stringify({country:'sk',days:6}));localStorage.setItem('eduvize-profile-selection-v1','d'.repeat(32))});
  page.on('pageerror',e=>errors.push(e.message));
  const resolver=await api.get('/o/'+o.id,{maxRedirects:0});assert.equal(resolver.status(),307);
  await page.goto(origin+resolver.headers().location,{waitUntil:'networkidle'});
  await page.locator('.name-profile-heading').first().waitFor();
  assert.ok((await page.locator('main').innerText()).includes('Hubert'));
  assert.equal(await page.locator('html').getAttribute('data-output-mode'),presentation.mode);
  assert.equal(await page.locator('html').getAttribute('data-kiosk-header'),presentation.mode==='kiosk'?(presentation.kioskLayout==='menu'?'light':'dark'):null);
  assert.ok(!network.some(u=>u.includes('onrender.com')),'Render attempted');assert.deepEqual(errors,[]);
  const privateRead=await api.get('/api/v1/outputs/'+o.id);assert.equal(privateRead.status(),200);
  const d={...draft,payload:{...payload,country:'sk'}};
  const saved=await mutate('put','/api/v1/outputs/'+o.id+'/draft',{expectedRevision:o.revision,draft:d});
  assert.equal((await(await api.get('/api/public/v1/outputs/'+o.id)).json()).payload.country,'cz');
  const linked=await(await api.get('/api/v1/outputs/'+o.id+'/link')).json();assert.equal(linked.url,o.url);
  const initialTheme=await page.locator('html').evaluate(el=>el.style.getPropertyValue('--ev-primary'));
  let other=null;
  if(label==='web'){
   const otherApi=await request.newContext({baseURL:base,extraHTTPHeaders:{Authorization:'Bearer c'}});
   const post=async(path,data)=>{const r=await otherApi.post(path,{data,headers:{'Idempotency-Key':crypto.randomUUID()}});assert.ok(r.ok(),await r.text());return r.json()};
   const a=await post('/api/v1/output-assemblies',{schemaVersion:1,appId:'holidays',profileId:'d'.repeat(32)});
   let x=await post('/api/v1/outputs',{schemaVersion:1,appId:'holidays',profileId:'d'.repeat(32),assemblyId:a.id,draft:{...draft,payload:{...payload,country:'sk',days:1}}});
   x=await post('/api/v1/outputs/'+x.id+'/publish',{expectedRevision:x.revision});
   other=await context.newPage();await other.clock.install({time:new Date('2026-11-03T11:00:00Z')});
   await other.goto(origin+'/eduvize-svatky/published.html?edu-output='+x.id,{waitUntil:'networkidle'});
   assert.ok((await other.locator('main').innerText()).includes('Dnes oslavuje'));
   await otherApi.dispose();
  }

  await api.post('/__test/theme',{data:{color:'#abcdef'}});await page.clock.fastForward(61000);await page.waitForTimeout(500);
  if(other){await other.clock.fastForward(61000);await other.waitForTimeout(500);assert.equal(await other.locator('html').evaluate(el=>el.style.getPropertyValue('--ev-primary')),'#556677');await other.close();}
  const theme=await page.locator('html').evaluate(el=>el.style.getPropertyValue('--ev-primary'));assert.equal(theme,'#abcdef');
  await page.screenshot({path:'eduvize-svatky/audit/published-'+label+'.png',fullPage:true});
  await mutate('post','/api/v1/outputs/'+o.id+'/revoke',{expectedRevision:saved.revision});
  await page.clock.fastForward(61000);await page.waitForTimeout(500);assert.ok(await page.locator('main').isHidden());
  assert.equal((await api.get('/api/public/v1/outputs/'+o.id)).status(),410);
  results.push({label,id:o.id,presentation,rendered:'Hubert',unrelatedLocalProfileIgnored:true,draftDoesNotPublish:true,linkStable:true,themeChanged:theme!==initialTheme,revokeClears:true,network,denied,errors});
  await context.close();await api.post('/__test/theme',{data:{color:'#112233'}});
 }
 fs.writeFileSync('eduvize-svatky/audit/published-browser-results.json',JSON.stringify({environment:'local-loopback-shared-api',remoteTestVerified:false,results},null,2));
 await browser.close();await api.dispose();console.log('Published browser cases passed: '+results.length);
})().catch(e=>{console.error(e);process.exit(1)});
