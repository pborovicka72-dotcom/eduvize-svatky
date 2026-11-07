const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
const origin='https://test.skola.eduvize.cz',base=process.env.HOLIDAYS_TEST_API||'http://127.0.0.1:8794';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Loopback harness required');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'}),page=await context.newPage(),writes=[],errors=[];
 await context.addInitScript(()=>{window.EduvizeAdminAuth={ready:Promise.resolve(),status:()=>({connected:true,schoolId:'a'.repeat(32),profileId:'b'.repeat(32),scopes:[]}),getToken:()=> 'a'};});
 await context.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());if(u.origin!==origin)return route.abort();
  if(r.method()!=='GET'&&u.pathname.startsWith('/api/v1/'))writes.push({method:r.method(),path:u.pathname});
  let response=await route.fetch({url:base+u.pathname+u.search,maxRedirects:0});
  // Matches existing single-host release transformation; auth identity is test-only.
  if(u.pathname.startsWith('/eduvize-styly/')&&u.pathname.endsWith('.js')){
   const body=(await response.text()).replaceAll('https://eduvize-admin.onrender.com',origin).replaceAll('https://eduvize-design-system-api.onrender.com',origin).replaceAll('https://eduvize-dokumenty-api.onrender.com',origin);
   return route.fulfill({response,body});
  }
  return route.fulfill({response});
 });
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/eduvize-svatky/config.html',{waitUntil:'networkidle'});
 await page.locator('#country').selectOption('cz');
 await page.locator('#publication-create').click();await page.getByRole('status').filter({hasText:'Výstup založen jako koncept'}).waitFor();
 const count=writes.length;
 await page.locator('#openOutput').click();await page.getByRole('status').filter({hasText:'Výstup zatím není publikovaný'}).waitFor({timeout:5000}).catch(()=>{});
 assert.equal(writes.length,count,'Copy published draft');
 await page.locator('#publication-publish').click();await page.getByRole('status').filter({hasText:'Uložený koncept publikován'}).waitFor();
 await page.locator('#country').selectOption('sk');
 const n=writes.length;await page.locator('#openOutput').click();await page.getByRole('status').filter({hasText:'Publikovaný odkaz zkopírován'}).waitFor();
 const link=await page.evaluate(()=>navigator.clipboard.readText());assert.match(link,/^https:\/\/test\.skola\.eduvize\.cz\/o\/[a-f0-9]{32}$/);assert.equal(writes.length,n,'Copy changed server state');
 await page.locator('#publication-save').click();await page.getByRole('status').filter({hasText:'Koncept uložen'}).waitFor();
 await page.screenshot({path:'eduvize-svatky/audit/publication-admin.png',fullPage:true});
 assert.deepEqual(errors,[]);
 fs.writeFileSync('eduvize-svatky/audit/publication-admin-results.json',JSON.stringify({environment:'local-shared-api-synthetic-session',remoteTestVerified:false,copyDraftDoesNotPublish:true,copyDoesNotMutate:true,explicitSaveAndPublish:true,writes,errors},null,2));
 await browser.close();console.log('Publication administration flow passed');
})().catch(e=>{console.error(e);process.exit(1)});
