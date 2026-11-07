/* Real test-domain acceptance. Reads existing private school fixtures; never creates profiles. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,request}=require('playwright');
const BASE='https://test.skola.eduvize.cz';
if(process.env.HOLIDAYS_TEST_GATE_RELEASED!=='1')throw Error('Remote acceptance is on hold until the server security owner explicitly releases the gate policy.');
const access=process.env.HOLIDAYS_TEST_ACCESS_FILE,stateFile=process.env.HOLIDAYS_TEST_STATE_FILE,reportFile=process.env.HOLIDAYS_TEST_REPORT;
if(!access||!stateFile||!reportFile||!process.env.EDUVIZE_TEST_RELEASE)throw Error('Private fixtures, state, report and release are required');
let stage='initialization',browser,report={environment:BASE,release:process.env.EDUVIZE_TEST_RELEASE,startedAt:new Date().toISOString(),profilesCreated:0,productionChanged:false,checks:[],network:[],renderAttempts:[],pageErrors:[]},state={operations:{},outputs:{}};
const checkpoint=()=>{fs.writeFileSync(stateFile,JSON.stringify(state,null,2),{mode:0o600});fs.chmodSync(stateFile,0o600)};
const record=(name,data={})=>{report.checks.push({name,...data});console.log('PASS '+name)};
(async()=>{
 assert.equal(fs.statSync(access).mode&0o077,0,'Fixtures must be private');
 const fixtures=JSON.parse(fs.readFileSync(access,'utf8'));
 assert.ok(Array.isArray(fixtures)&&fixtures.length>=2&&fixtures[0].schoolId!==fixtures[1].schoolId);
 const actors=fixtures.slice(0,2);assert.ok(actors.every(a=>a.token?.startsWith('edu_')&&/^[a-f0-9]{32}$/.test(a.profileId)));
 assert.ok(typeof actors[0].profileThemeId==='string','Server must confirm the existing explicit theme mapping before a reversible style test');
 if(fs.existsSync(stateFile))state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
 const api=await Promise.all(actors.map(a=>request.newContext({baseURL:BASE,extraHTTPHeaders:{Authorization:'Bearer '+a.token},ignoreHTTPSErrors:false})));
 const anon=await request.newContext({baseURL:BASE});
 async function read(ctx,url,status=200){const r=await ctx.get(url,{maxRedirects:0});assert.equal(r.status(),status,stage+' HTTP '+r.status());return status===200?r.json():r;}
 async function mutate(ctx,method,url,body,name){
  const encoded=JSON.stringify(body),existing=state.operations[name];
  if(existing&&existing.body!==encoded)throw Error('Pending operation has different body');
  const operation=existing||{key:crypto.randomUUID(),body:encoded};state.operations[name]=operation;checkpoint();
  const r=await ctx[method](url,{data:body,headers:{'Idempotency-Key':operation.key}});
  assert.ok(r.ok(),stage+' HTTP '+r.status());const value=await r.json();delete state.operations[name];checkpoint();return value;
 }
 stage='deployment';
 const html=await anon.get('/eduvize-svatky/published.html');assert.equal(html.status(),200);
 const source=await html.text();assert.ok(source.includes('output-runtime.js')&&!source.includes('output-modes.js'));
 record('published renderer deployed');
 const sessions=await Promise.all(api.map(c=>read(c,'/api/admin-session')));assert.ok(sessions.every((s,i)=>s.schoolId===actors[i].schoolId&&s.profileId===actors[i].profileId));
 record('existing school sessions validated');report.profileRoles=actors.map((a,i)=>({role:i?'B':'A',profileId:a.profileId,purpose:'holidays publication/isolation acceptance'}));
 const payload={country:'cz',monthFormat:'text',days:3,tomorrow:true,holidays:true,significant:true,nameDetails:true};
 const web={mode:'web',geometry:null,interaction:'display',kioskLayout:null};
 async function ensureOutput(role,actorIndex){
  if(state.outputs[role])return read(api[actorIndex],'/api/v1/outputs/'+state.outputs[role]);
  const a=actors[actorIndex],c=api[actorIndex];
  const existing=await read(c,'/api/v1/output-assemblies?'+new URLSearchParams({appId:'holidays',profileId:a.profileId}));
  const assembly=existing.items[0]||await mutate(c,'post','/api/v1/output-assemblies',{schemaVersion:1,appId:'holidays',profileId:a.profileId},role+':assembly');
  const output=await mutate(c,'post','/api/v1/outputs',{schemaVersion:1,appId:'holidays',profileId:a.profileId,assemblyId:assembly.id,draft:{schemaVersion:1,payloadVersion:1,payload:{...payload,country:actorIndex?'sk':'cz'},presentation:web}},role+':create');
  state.outputs[role]=output.id;checkpoint();return output;
 }
 stage='prepare publication';let primary=await ensureOutput('primary',0),other=await ensureOutput('isolation',1),revocable=await ensureOutput('revocation',0);
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 async function context(auth=null){
  const ctx=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'});
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());report.network.push(u.origin+u.pathname);if(u.hostname==='onrender.com'||u.hostname.endsWith('.onrender.com')){report.renderAttempts.push(u.origin+u.pathname);return route.abort();}return route.continue();});
  if(auth){await ctx.addInitScript(({base,session})=>{if(location.origin===base)sessionStorage.setItem('eduvize-admin-session-v1',JSON.stringify(session))},{base:BASE,session:auth});}
  ctx.on('page',p=>p.on('pageerror',()=>report.pageErrors.push({stage,name:'application exception'})));return ctx;
 }
 const admin=await context({...sessions[0],token:actors[0].token}),page=await admin.newPage();
 stage='administration';await page.goto(BASE+'/eduvize-svatky/config.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.EduvizeAdminAuth?.status().connected);
 await page.locator('#publication-refresh').click();await page.locator('#publication-output option[value="'+primary.id+'"]').waitFor({state:'attached'});await page.locator('#publication-output').selectOption(primary.id);
 await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Vybraný výstup'));
 if(primary.state==='draft'){
  const before=primary.revision;await page.locator('#openOutput').click();await page.waitForTimeout(700);
  assert.equal((await read(api[0],'/api/v1/outputs/'+primary.id)).revision,before);
  await page.locator('#publication-publish').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('publikován'));
 }
 primary=await read(api[0],'/api/v1/outputs/'+primary.id);const initial=await read(anon,'/api/public/v1/outputs/'+primary.id);const url=(await read(api[0],'/api/v1/outputs/'+primary.id+'/link')).url;
 assert.equal(url,BASE+'/o/'+primary.id);record('real administration selection and explicit publish');
 const beforeCopy=primary.revision;await page.locator('#openOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('zkopírován'));
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),url);assert.equal((await read(api[0],'/api/v1/outputs/'+primary.id)).revision,beforeCopy);record('copy is read-only');
 const viewer=await context(),view=await viewer.newPage();await view.addInitScript(()=>{localStorage.setItem('eduvize-profile-selection-v1','f'.repeat(32));localStorage.setItem('eduvize-holidays-config',JSON.stringify({country:'sk',days:6}));});
 await view.goto(url,{waitUntil:'networkidle'});await view.waitForFunction(()=>!!window.EduvizePublishedOutput);assert.ok((await view.locator('main').innerText()).trim().length>10);record('anonymous resolver and actual content with unrelated browser draft');
 stage='draft isolation';await page.locator('#country').selectOption('sk');await page.locator('#publication-save').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Koncept uložen'));
 const saved=await read(api[0],'/api/v1/outputs/'+primary.id);assert.equal((await read(anon,'/api/public/v1/outputs/'+primary.id)).payload.country,initial.payload.country);
 await page.locator('#openOutput').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('zkopírován'));assert.equal((await read(api[0],'/api/v1/outputs/'+primary.id)).revision,saved.revision);record('saved draft and copy preserve last publication');
 await page.locator('#publication-publish').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('publikován'));assert.equal((await read(api[0],'/api/v1/outputs/'+primary.id+'/link')).url,url);record('republish preserves URL');
 stage='cross school';await read(api[1],'/api/v1/outputs/'+primary.id,404);await read(anon,'/api/v1/outputs/'+primary.id,401);record('foreign school and anonymous administration denied');
 async function publish(c,o,presentation,country,tag){const d={schemaVersion:1,payloadVersion:1,payload:{...payload,country},presentation};o=await mutate(c,'put','/api/v1/outputs/'+o.id+'/draft',{expectedRevision:o.revision,draft:d},tag+':save');return mutate(c,'post','/api/v1/outputs/'+o.id+'/publish',{expectedRevision:o.revision},tag+':publish');}
 stage='presentation matrix';primary=await read(api[0],'/api/v1/outputs/'+primary.id);
 const matrix=[web,...[['landscape',6,4],['portrait',3,2]].map(([orientation,layoutId,segmentId])=>({mode:'nsp',interaction:'display',kioskLayout:null,geometry:{registryId:'nsp-4k',registryVersion:1,orientation,layoutId,segmentId}})),...['menu','tiles'].flatMap(kioskLayout=>['landscape','portrait'].map(orientation=>({mode:'kiosk',interaction:'interactive',kioskLayout,geometry:{registryId:'kiosk-viewport',registryVersion:1,orientation,width:orientation==='landscape'?1920:1080,height:orientation==='landscape'?1080:1920}})))];
 for(let i=0;i<matrix.length;i++){
  const p=matrix[i];primary=await publish(api[0],primary,p,'cz','matrix-'+i);await view.setViewportSize(p.geometry?.orientation==='portrait'?{width:1080,height:1920}:{width:1920,height:1080});await view.goto(url,{waitUntil:'networkidle'});
  await view.waitForFunction(mode=>window.EduvizePublishedOutput?.presentation.mode===mode,p.mode);
  const text=await view.locator('main').innerText();assert.ok(text.trim().length>10);assert.ok(await view.locator('main').isVisible());
  if(p.mode==='kiosk')assert.equal(await view.locator('html').getAttribute('data-kiosk-header'),p.kioskLayout==='menu'?'light':'dark');
  await view.screenshot({path:path.join(path.dirname(reportFile),'holidays-matrix-'+i+'.png'),fullPage:true});record('presentation '+i,{presentation:p,contentLength:text.length});
 }
 primary=await publish(api[0],primary,web,'cz','restore-web');other=await publish(api[1],other,web,'sk','isolation');
 stage='profile style';const themeBefore=await read(anon,'/api/public/v1/outputs/'+primary.id+'/theme'),otherTheme=await read(anon,'/api/public/v1/outputs/'+other.id+'/theme');
 const themes=await read(api[0],'/api/design-system/themes?profileId='+actors[0].profileId),old=themes.find(t=>t.active),alternative=themes.find(t=>t.id!==old?.id&&t.config.colors.primary!==themeBefore.colors.primary);
 assert.equal(old?.id,actors[0].profileThemeId,'Profile theme no longer matches the server fixture');
 assert.ok(old&&alternative,'Need two existing themes for scoped style test; do not create global themes');
 await view.goto(url,{waitUntil:'networkidle'});await view.waitForFunction(()=>!!window.EduvizePublishedOutput);
 try{
  const change=await api[0].post('/api/design-system/profile-theme',{data:{themeId:alternative.id}});assert.ok(change.ok());
  await view.waitForFunction(color=>document.documentElement.style.getPropertyValue('--ev-primary')===color,alternative.config.colors.primary,{timeout:85000});
  assert.deepEqual(await read(anon,'/api/public/v1/outputs/'+other.id+'/theme'),otherTheme);assert.equal(view.url(),BASE+'/eduvize-svatky/published.html?edu-output='+primary.id);record('profile style polls at same URL and isolates second school');
 }finally{const restore=await api[0].post('/api/design-system/profile-theme',{data:{themeId:old.id}});assert.ok(restore.ok());}
 stage='revocation';revocable=await read(api[0],'/api/v1/outputs/'+revocable.id);revocable=await publish(api[0],revocable,web,'cz','revocation-ready');await view.goto(BASE+'/o/'+revocable.id,{waitUntil:'networkidle'});await view.waitForFunction(()=>!!window.EduvizePublishedOutput);
 await mutate(api[0],'post','/api/v1/outputs/'+revocable.id+'/revoke',{expectedRevision:revocable.revision},'revocation');await view.locator('main').waitFor({state:'hidden',timeout:85000});await read(anon,'/api/public/v1/outputs/'+revocable.id,410);record('revoke clears open output');
 assert.deepEqual(report.renderAttempts,[]);assert.deepEqual(report.pageErrors,[]);report.preservedOutput=url;report.outputs=state.outputs;report.success=true;report.finishedAt=new Date().toISOString();
 await browser.close();await Promise.all([...api,anon].map(c=>c.dispose()));fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log('PASS remote acceptance; no Render requests');
})().catch(async()=>{report.success=false;report.failedStage=stage;report.finishedAt=new Date().toISOString();fs.writeFileSync(reportFile,JSON.stringify(report,null,2));await browser?.close().catch(()=>{});console.error('Remote acceptance failed at stage: '+stage);process.exitCode=1;});
