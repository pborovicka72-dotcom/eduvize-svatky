/* Published v1 only. Identity, licence, style and revision polling belong to the shared runtime. */
(function(root){'use strict';
const $=id=>document.getElementById(id),main=document.querySelector('main'),status=$('publication-status');
let generation=0;
let cfg=null,metrics=null,active=false,timer=null,fetchController=null,calendarPromise=null;
function stop(){++generation;active=false;clearInterval(timer);timer=null;fetchController?.abort();calendarPromise=null;root.EduvizeNameProfiles.clear();}
async function calendarDay(country,date){
 if(!active)throw Error('Stopped');
 if(!calendarPromise)calendarPromise=fetch('./calendar.json',{cache:'no-cache',signal:fetchController.signal}).then(r=>{if(!r.ok)throw Error('Calendar unavailable');return r.json()}).catch(e=>{calendarPromise=null;throw e;});
 const all=await calendarPromise,data=all[country]?.[date];if(!data)throw Error('Calendar date unavailable');return data;
}
const locale=()=>cfg.country==="sk"?"sk-SK":"cs-CZ";
let displayPolicy=null;
function layout(){
 const web=cfg.viewMode==='web';document.body.classList.toggle('web-mode',web);
 if(web){document.body.classList.remove('ev-modern');document.body.dataset.segmentLayout='web';displayPolicy={upcomingDays:cfg.days,columns:Math.min(3,cfg.days||1),minFont:12};}
 else {displayPolicy=window.EduvizeHolidaysLayout.apply(document.body,cfg,metrics.geometry.width,metrics.geometry.height);}
}

function localDate(){return new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Prague'}));}
function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function setText(id,value){$(id).textContent=value}
async function update(){const ticket=generation;$('names-card').querySelector('.metric-name').textContent=cfg.country==='sk'?'Dnes oslavuje':'Dnes slaví';$('holiday-card').querySelector('.metric-name').textContent=cfg.country==='sk'?'Kalendárne sviatky':'Kalendářní svátky';const now=localDate(),day=iso(now),next=new Date(now);next.setDate(next.getDate()+1);
setText("weekday",new Intl.DateTimeFormat(locale(),{weekday:"long"}).format(now));setText("date",(cfg.monthFormat==="number"?new Intl.DateTimeFormat(locale(),{day:"numeric",month:"2-digit"}).format(now):new Intl.DateTimeFormat(locale(),{day:"numeric",month:"long"}).format(now)));setText("year",String(now.getFullYear()));
$("holiday-card").classList.add("hidden");$("names-card").classList.add("hidden");$("tomorrow").classList.toggle("hidden",!cfg.tomorrow||displayPolicy.upcomingDays>0);
try{const data=await calendarDay(cfg.country,day);if(!active||ticket!==generation)return;$("calendar-status").hidden=true;const hasNameday=data.nameday_status!=="unavailable"&&Boolean(String(data.nameday||"").trim());$("names-card").classList.toggle("hidden",!hasNameday);setText("names",hasNameday?data.nameday:"");const events=(data.holidays||[]).filter(x=>x.type==="significant"?cfg.significant:cfg.holidays);$("holiday-card").classList.toggle("hidden",events.length===0);setText("holiday",events.map(x=>x.name).join(" • "));setText("holiday-note",events.length?events.map(x=>x.type==="significant"?(cfg.country==="sk"?"Pamätný deň":"Významný den"):x.day_off?(cfg.country==="sk"?"Deň pracovného pokoja":"Den pracovního klidu"):(cfg.country==="sk"?"Sviatok – pracovný deň":"Svátek – pracovní den")).filter((x,i,a)=>a.indexOf(x)===i).join(" • "):"");$("names").classList.toggle("long",(data.nameday||"").length>19);if(cfg.tomorrow&&displayPolicy.upcomingDays===0){try{const t=await calendarDay(cfg.country,iso(next));if(!active||ticket!==generation)return;setText("tomorrow",t.nameday_status==="unavailable"?"":(cfg.country==="sk"?"Zajtra: ":"Zítra: ")+(t.nameday||"—"));}catch{setText("tomorrow","");}}window.EduvizeHolidayArt.present(day,data,events,cfg);await renderUpcoming(now,ticket);if(!active||ticket!==generation)return;void window.EduvizeNameProfiles.present(hasNameday?data.nameday:"",cfg.nameDetails,day,events,cfg);}catch(e){if(!active||ticket!==generation)return;$("calendar-status").hidden=false;$("calendar-status").textContent="Kalendář se nepodařilo načíst. Zkusíme to znovu při další aktualizaci.";$("names-card").classList.add("hidden");setText("names","");void window.EduvizeNameProfiles.present("",false);$("holiday-card").classList.add("hidden");setText("tomorrow","");$("upcoming").classList.add("hidden");}}

function eventFilter(e){return e.type==="significant"?cfg.significant:cfg.holidays}
async function renderUpcoming(today,ticket=generation){
 const visibleDays=displayPolicy.upcomingDays;
 const panel=$("upcoming"),grid=$("upcoming-grid");panel.querySelector("h2").textContent=window.EduvizeCalendarCopy.daysHeading(visibleDays,cfg.country);panel.setAttribute("aria-label",panel.querySelector("h2").textContent);panel.classList.toggle("hidden",visibleDays===0);grid.replaceChildren();
 panel.querySelector('.section-heading').hidden=visibleDays===0;grid.hidden=visibleDays===0;if(visibleDays===0)return;
 const dates=Array.from({length:visibleDays},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()+i+1);return d});
 const results=await Promise.all(dates.map(async d=>{try{return await calendarDay(cfg.country,iso(d))}catch{return null}}));if(!active||ticket!==generation)return;
 dates.forEach((d,i)=>{
 const data=results[i],card=document.createElement("article");card.className="upcoming-day";
 const title=document.createElement("div");title.className="upcoming-date";title.textContent=new Intl.DateTimeFormat(locale(),{weekday:"short",day:"numeric",month:cfg.monthFormat==="number"?"numeric":"short"}).format(d);
 const names=document.createElement("div");names.className="upcoming-name";names.textContent=data?.nameday||"";if(!names.textContent)names.classList.add("empty");
 card.append(title,names);
 const events=(data?.holidays||[]).filter(eventFilter);if(events.length){card.classList.add(events.some(e=>e.type!=="significant")?"is-public-holiday":"is-significant-day");const note=document.createElement("div");note.className="upcoming-event"+(!names.textContent?" primary-event":"");note.textContent=events.map(e=>e.name).join(" • ");card.append(note)}
 grid.append(card);
 });
 const columns=Math.max(1,Math.min(visibleDays,displayPolicy.columns));grid.style.setProperty("--calendar-columns",String(columns));grid.style.setProperty("--calendar-rows",String(Math.ceil(visibleDays/columns)));requestAnimationFrame(()=>requestAnimationFrame(fitUpcomingText));
}


function fitUpcomingText(){window.EduvizeHolidaysLayout.fit(document.body,displayPolicy?.minFont||12);}





function size(){
 if(!metrics||!cfg)return;
 const html=document.documentElement,mode=cfg.viewMode,w=metrics.geometry.width,h=metrics.geometry.height;
 for(const name of ['web','nsp','kiosk'])html.classList.toggle(name+'-output',mode===name);
 main.style.cssText='';main.style.setProperty('--published-height',h+'px');
 html.dataset.secondarySources=(mode!=='web'&&(w/h>=2.7||(w<=1200&&h<=720)))?'hidden':'visible';
 if(mode!=='web')Object.assign(main.style,{width:w+'px',height:h+'px',position:'absolute',left:'50%',top:'0',transform:'translateX(-50%) scale('+Math.min(innerWidth/w,innerHeight/h)+')',transformOrigin:'top center'});
 for(const [k,v] of Object.entries(metrics.header))main.style.setProperty('--edu-header-'+k,v+'px');
 for(const [k,v] of Object.entries(metrics.text))main.style.setProperty('--edu-text-'+k,v+'px');
 layout();
}
root.addEventListener('resize',()=>{if(active){size();update();}});
try{root.EduvizeOutputRuntime.start({appId:'holidays',
 async render(snapshot,m,{signal}){
  stop();metrics=m;cfg={...snapshot.payload,viewMode:snapshot.presentation.mode};
  active=true;fetchController=new AbortController();signal.addEventListener('abort',stop,{once:true});
  main.hidden=false;status.hidden=true;size();await update();
  if(active)timer=setInterval(()=>{calendarPromise=null;update();},60000);
 },
 clear(){stop();main.hidden=true;status.hidden=false;status.textContent='Výstup není dostupný.';},
 onError(){if(!active){status.hidden=false;status.textContent='Výstup se nepodařilo ověřit. Zkusíme to znovu.';}}
});}catch{stop();main.hidden=true;status.hidden=false;status.textContent='Výstup není dostupný.';}
})(window);
