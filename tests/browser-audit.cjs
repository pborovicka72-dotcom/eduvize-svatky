const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 const results=[];
 const baseline=await browser.newContext(),bp=await baseline.newPage(),denied=[];
 await baseline.route('**/*',r=>{if(new URL(r.request().url()).hostname.endsWith('onrender.com')){denied.push(r.request().url());return r.abort();}return r.continue()});
 await bp.goto('http://127.0.0.1:8793/eduvize-svatky/index.html?viewMode=nsp',{waitUntil:'networkidle'});
 results.push({baseline:true,license:await bp.locator('html').getAttribute('data-edu-license'),blocked:denied});await bp.screenshot({path:'eduvize-svatky/audit/render-blocked-baseline.png'});await baseline.close();
 async function routeTest(context,blocked){
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname.endsWith('onrender.com')){blocked.push(u.href);return route.abort();}
   if(u.pathname==='/api/public/broadcast-status')return route.fulfill({json:{active:true,serverTime:Date.now()/1000,expiresAt:null}});
   // Emulate the documented single-host build, not the missing real backend.
   if(u.pathname.startsWith('/eduvize-styly/design-system/')&&u.pathname.endsWith('.js')){
    let body=fs.readFileSync('.'+u.pathname,'utf8').replaceAll('https://eduvize-admin.onrender.com',u.origin).replaceAll('https://eduvize-design-system-api.onrender.com',u.origin).replaceAll('https://eduvize-dokumenty-api.onrender.com',u.origin);
    return route.fulfill({body,contentType:'application/javascript'});
   }
   if(u.pathname.startsWith('/api/'))return route.fulfill({status:401,json:{detail:'Isolated test: no administrator session'}});
   return route.continue();
  });
 }

 for(const [mode,w,h] of [['web',1280,900],['nsp',1920,1080],['kiosk',1920,1080],['kiosk',1080,1920],['nsp',960,360]]){
  const context=await browser.newContext({viewport:{width:w,height:h}}),page=await context.newPage();const blocked=[],errors=[];
  await routeTest(context,blocked);
  // Local unrelated draft must not affect the public preview.
  await context.addInitScript(()=>localStorage.setItem('eduvize-holidays-config',JSON.stringify({country:'sk',days:6})));
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:8793/eduvize-svatky/index.html?viewMode=${mode}&preview=1&previewDate=2026-12-24&days=0`,{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  const read=()=>page.evaluate(()=>({title:document.querySelector('.name-profile:not([hidden]) h3')?.textContent,controls:!!document.querySelector('.calendar-detail-controls:not([hidden])'),country:cfg.country,days:cfg.days,profiles:document.querySelectorAll('.name-profile').length,bodyWidth:document.body.scrollWidth,viewWidth:innerWidth,text:document.querySelector('main').innerText.slice(0,900)}));
  const before=await read();let after=null;
  if(mode==='kiosk'&&before.controls){await page.getByRole('button',{name:'Další',exact:true}).click();after=await read();if(before.title===after.title)throw Error('Kiosk navigation did not advance');}
  if(mode==='kiosk'&&w===1920){await page.waitForTimeout(21000);if((await read()).title!==after.title)throw Error('Kiosk changed automatically');}
  if(before.country!=='cz'||before.days!==0)throw Error('Local draft leaked into output');
  if(!before.text.includes('24'))throw Error('Missing date '+JSON.stringify(before));
  await page.screenshot({path:`eduvize-svatky/audit/${mode}-${w}x${h}.png`,fullPage:true});
  results.push({mode,w,h,before,after,blocked,errors});await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();const blocked=[],errors=[];
 await routeTest(context,blocked);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8793/eduvize-svatky/config.html',{waitUntil:'networkidle'});await page.waitForTimeout(1500);
 results.push({admin:true,frames:page.frames().map(f=>f.url()),blocked,errors,text:(await page.locator('body').innerText()).slice(0,1600)});
 await page.screenshot({path:'eduvize-svatky/audit/admin.png',fullPage:true});
 for(const mode of ['web','kiosk']){
  await page.locator('#viewMode').selectOption(mode);await page.waitForTimeout(1800);
  const frame=page.frames().find(f=>f.url().includes('/index.html'));
  if(!frame)throw Error('Missing preview '+mode);
  const actual=await frame.locator('html').getAttribute('data-output-mode');
  if(actual!==mode)throw Error('Preview mode mismatch '+mode+' '+actual);
  results.push({preview:true,mode,actual,content:(await frame.locator('main').innerText()).slice(0,200)});
 }

 fs.writeFileSync('eduvize-svatky/audit/browser-results.json',JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
