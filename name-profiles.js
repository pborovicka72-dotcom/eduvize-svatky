/* Name medallions are an optional part of Holidays, never a separate app. */
(function(root){
 const curated={
 Jan:{lead:'Krátké jméno s dlouhou historií',text:'Jan pochází z hebrejského jména Jóchanán. Jeho význam se obvykle překládá jako „Hospodin je milostivý“.',extra:'Domácí podoby: Honza, Honzík, Jenda a Jeník.',url:'https://cs.wiktionary.org/wiki/Jan',title:'Wikislovník – Jan'},
 Hubert:{lead:'Jméno spojené s bystrou myslí',text:'Hubert má germánské kořeny. Původní podoba Hugberaht spojuje výrazy pro mysl a jas či zářivost. Význam se proto vykládá jako člověk jasné mysli nebo duchaplný.',extra:'Ve světě: italsky Uberto, španělsky Huberto.',url:'https://cs.wikipedia.org/wiki/Hubert',title:'Wikipedie – Hubert'},
 Tereza:{lead:'Jméno s více výklady původu',text:'Tereza je jméno řeckého původu, jeho přesný význam však není jednoznačný. Jeden z výkladů ho spojuje se sklizní, jiný s létem.',extra:'Další podoby: Terezie, Teresa a Theresa.',url:'https://cs.wikipedia.org/wiki/Tereza',title:'Wikipedie – Tereza'}
 };

 const eventArticles={
 '01-01':'Nový rok','01-16':'Jan Palach','01-27':'Mezinárodní den památky obětí holokaustu',
 '03-08':'Mezinárodní den žen','03-28':'Den učitelů','04-22':'Den Země','05-01':'Svátek práce',
 '05-08':'Den vítězství','06-01':'Mezinárodní den dětí','07-05':'Cyril a Metoděj','07-06':'Jan Hus',
 '08-21':'Invaze vojsk Varšavské smlouvy do Československa','09-28':'Den české státnosti','10-28':'Den vzniku samostatného československého státu',
 '11-02':'Dušičky','11-11':'Den válečných veteránů','11-17':'Den boje za svobodu a demokracii a Mezinárodní den studentstva',
 '12-24':'Štědrý den','12-25':'Narození Páně','12-26':'Svatý Štěpán'
 };
 function eventProfile(day,events,options={}){
  const monthDay=day.slice(5),joined=events.map(e=>e.name).join(' ');
  if(options.holidays!==false){
   if(/^12-2[456]$/.test(monthDay))return {lead:events[0]?.name||'Vánoce',text:monthDay==='12-24'?'Štědrý den je v českém prostředí spojený se slavnostní večeří, vánočním stromkem a nadělováním dárků. V křesťanské tradici předchází oslavě narození Ježíše Krista.':monthDay==='12-25'?'První svátek vánoční připomíná v křesťanské tradici narození Ježíše Krista. Vánoce jsou zároveň časem rodinných setkání, koled a vánočních zvyků.':'Druhý svátek vánoční je spojený se svatým Štěpánem. K vánočnímu období patří koledování, návštěvy blízkých a společné rodinné chvíle.',extra:'',url:'https://cs.wikipedia.org/wiki/Vánoce',title:'Wikipedie – Vánoce'};
   const [y,m,d]=day.split('-').map(Number),a=y%19,b=Math.floor(y/100),c=y%100,h=(19*a+b-Math.floor(b/4)-Math.floor((b-Math.floor((b+8)/25)+1)/3)+15)%30,l=(32+2*(b%4)+2*Math.floor(c/4)-h-c%4)%7,q=Math.floor((a+11*h+22*l)/451),em=Math.floor((h+l-7*q+114)/31),ed=(h+l-7*q+114)%31+1;
   const delta=Math.round((Date.UTC(y,m-1,d)-Date.UTC(y,em-1,ed))/86400000);
   if([-2,0,1].includes(delta)||/velikono|veľkono|velký pátek|veľký piatok/i.test(joined))return {lead:events[0]?.name||'Velikonoční neděle',text:delta===-2?'Velký pátek připomíná v křesťanské tradici ukřižování a smrt Ježíše Krista. Je součástí velikonočního období, které vrcholí oslavou jeho zmrtvýchvstání.':delta===1?'Velikonoční pondělí je v českém prostředí spojené s pomlázkou, koledováním a zdobenými vejci. Tyto lidové zvyky doprovázejí křesťanskou oslavu zmrtvýchvstání Ježíše Krista.':'Velikonoce jsou nejvýznamnějšími křesťanskými svátky a připomínají zmrtvýchvstání Ježíše Krista. Jejich datum je pohyblivé; v lidových tradicích je provázejí vejce a další symboly jara.',extra:'',url:'https://cs.wikipedia.org/wiki/Velikonoce',title:'Wikipedie – Velikonoce'};
  }
  return null;
 }
 const pending=new Map();let sequence=0,currentKey='',current=null,box,queued=false;
 function normalize(s){return String(s).normalize('NFC').trim();}
 function names(value){return [...new Set(String(value||'').split(/[,;/•]|\s+a\s+/u).map(normalize).filter(n=>/^[\p{L} -]{2,40}$/u.test(n)))];}
 function shorten(text,max){if(text.length<=max)return text;const part=text.slice(0,max),end=part.lastIndexOf(' ');return part.slice(0,end>0?end:max).replace(/[,;:]$/,'')+'…';}
 function clean(text){return text.replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();}
 function extract(html,kind){
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('sup,table,.mw-editsection,.navbox,.reference').forEach(e=>e.remove());
  if(kind==='wiktionary'){
   const headings=[...doc.querySelectorAll('h2,h3,h4,h5')];let czech=false;
   for(const heading of headings){
    if(heading.tagName==='H2')czech=/^čeština$/i.test(clean(heading.textContent));
    if(!czech||!/^etymologie$/i.test(clean(heading.textContent)))continue;
    const parent=heading.parentElement.matches('.mw-heading')?heading.parentElement:heading;
    let n=parent.nextElementSibling,parts=[];
    while(n&&!n.matches('h2,h3,h4,h5,.mw-heading')){if(n.matches('p'))parts.push(clean(n.textContent));n=n.nextElementSibling;}
    const text=parts.join(' ');if(text.length>30)return text;
   }
  }else{
   const paragraphs=[...doc.querySelectorAll('.mw-parser-output > p,.mw-parser-output > section > p')];
   return paragraphs.map(p=>clean(p.textContent)).find(t=>/\bjméno\b/iu.test(t)&&/původ|odvoz|pocház|význam/iu.test(t))||'';
  }
  return '';
 }
 async function request(name,kind){
  const host=kind==='wiktionary'?'cs.wiktionary.org':'cs.wikipedia.org';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
   const url=new URL('https://'+host+'/w/api.php');url.search=new URLSearchParams({action:'parse',page:name,prop:'text|revid',format:'json',origin:'*',redirects:'1',disableeditsection:'1'});
   const response=await fetch(url,{signal:controller.signal});if(!response.ok)return null;
   const data=await response.json();if(!data.parse?.text?.['*'])return null;
   const text=kind==='event'?extractEvent(data.parse.text['*']):extract(data.parse.text['*'],kind);if(!text)return null;
   return {lead:'Původ a význam jména',text,extra:'',url:'https://'+host+'/w/index.php?title='+encodeURIComponent(data.parse.title)+'&oldid='+data.parse.revid,title:(kind==='wiktionary'?'Wikislovník':'Wikipedie')+' – '+data.parse.title};
  }catch{return null;}finally{clearTimeout(timer);}
 }
 function extractEvent(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('sup,table,.mw-editsection,.navbox,.reference,.hatnote').forEach(e=>e.remove());return [...doc.querySelectorAll('.mw-parser-output > p,.mw-parser-output > section > p')].map(e=>clean(e.textContent)).find(t=>t.length>70)||'';}
 async function lookup(name,kind='name'){
  if(kind==='name'&&curated[name])return curated[name];
  const lookupKey=kind+':'+name;
  if(pending.has(lookupKey))return pending.get(lookupKey);
  const task=(async()=>{
   const key='eduvize-calendar-profile-v3:'+lookupKey;
   try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Date.now()-saved.time<30*86400000&&saved.data?.url?.startsWith('https://cs.')&&saved.data.text)return saved.data;}catch{}
   const data=kind==='event'?await request(name,'event'):await request(name,'wiktionary')||await request(name,'wikipedia');
   if(data)try{localStorage.setItem(key,JSON.stringify({time:Date.now(),data}));}catch{}
   return data;
  })();pending.set(lookupKey,task);return task;
 }
 function node(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;}

 let timer=null,pages=[],pageIndex=0;
 let controls=null;
 const interactive=()=>root.EduvizeOutputModes?.isInteractive?.()||root.EduvizeOutputModes?.mode?.()==='kiosk';
 const isWeb=()=>root.EduvizeOutputModes?.mode?.()==='web';
 function showPage(index){
  if(!pages.length||!box)return;
  pageIndex=(index+pages.length)%pages.length;
  box.querySelectorAll('.name-profile').forEach(entry=>entry.hidden=true);
  const page=pages[pageIndex],entry=box.children[page.profile];entry.hidden=false;
  entry.querySelector('.name-profile-text').textContent=page.text;
  const profile=current[page.profile],title=document.querySelector('.holiday-feature-title'),label=document.querySelector('.holiday-feature-label');
  if(title)title.textContent=profile.kind==='name'?profile.lead.split(' · ')[0]:profile.lead;
  if(label)label.textContent=profile.kind==='name'?(currentCountry==='sk'?'Dnes oslavuje':'Dnes slaví'):(currentCountry==='sk'?'Dnešná pripomienka':'Dnešní připomínka');
  root.EduvizeHolidayArt?.fit();
  const count=entry.querySelector('.name-profile-count');
  count.textContent=pages.length>1?(pageIndex+1)+' / '+pages.length:'';
  if(controls){controls.hidden=pages.length<2||!interactive();controls.querySelector('[role=status]').textContent=(pageIndex+1)+' / '+pages.length;}
  // A shared date header stays compact; the reading area identifies the active subject.
 }

 // Keep each description on one screen. Shrink only 15%, then shorten the copy.
 function fitDescription(copy,full){
  copy.style.removeProperty('font-size');
  copy.textContent=full;
  const base=parseFloat(getComputedStyle(copy).fontSize);
  const fits=()=>copy.scrollHeight<=copy.clientHeight+1&&copy.scrollWidth<=copy.clientWidth+1;
  if(fits())return full;
  const minimum=Math.min(base,Math.max(20,base*.85));
  copy.style.fontSize=minimum+'px';
  if(fits()){
   let low=minimum,high=base;
   for(let i=0;i<10;i++){const mid=(low+high)/2;copy.style.fontSize=mid+'px';if(fits())low=mid;else high=mid;}
   copy.style.fontSize=low+'px';
   return full;
  }
  const words=full.trim().split(/\s+/u);
  let low=0,high=words.length;
  const excerpt=n=>words.slice(0,n).join(' ').replace(/[,;:]$/u,'')+'…';
  while(low<high){const mid=Math.ceil((low+high)/2);copy.textContent=excerpt(mid);if(fits())low=mid;else high=mid-1;}
  let result=excerpt(low);
  // Prefer a complete sentence when it uses most of the available space.
  const sentence=words.slice(0,low).join(' ').match(/^([\s\S]*[.!?])\s/u)?.[1];
  if(sentence&&sentence.length>=result.length*.75)result=sentence;
  copy.textContent=result;
  return result;
 }

 function fit(){
  queued=false;if(!box||!current)return;
  clearInterval(timer);timer=null;
  const web=isWeb(),host=document.getElementById('upcoming');
  host.classList.remove('calendar-side-details','calendar-tile-details');
  document.body.classList.add('calendar-reading');root.EduvizeOutputHeader?.update();
  document.body.classList.toggle('calendar-reading-web',web);
  host.classList.remove('hidden');box.hidden=false;
  const dayCards=[...document.querySelectorAll('#upcoming-grid>.upcoming-day')];
  dayCards.forEach(e=>e.hidden=false);
  const heading=host.querySelector('.section-heading'),grid=document.getElementById('upcoming-grid');
  heading.hidden=dayCards.length===0;grid.hidden=dayCards.length===0;
  host.classList.toggle('calendar-reading-only',dayCards.length===0);
  const text=heading.querySelector('h2');
  text.textContent=root.EduvizeCalendarCopy.daysHeading(dayCards.length,currentCountry);
  host.setAttribute('aria-label',dayCards.length?text.textContent:'O dnešním dni');
  document.getElementById('names-card').classList.add('hidden');
  document.getElementById('holiday-card').classList.add('hidden');
  pages=[];
  [...box.children].forEach((entry,i)=>{
   entry.hidden=false;
   const copy=entry.querySelector('.name-profile-text'),profile=current[i];
   const full=[profile.text,profile.extra].filter(Boolean).join(' ');
   copy.textContent=full;
   if(web){pages.push({profile:i,text:full});return;}
   if(root.EduvizeOutputModes?.mode?.()==='kiosk'){pages.push({profile:i,text:full});entry.hidden=true;return;}
   pages.push({profile:i,text:fitDescription(copy,full)});
   entry.hidden=true;
  });
  if(web){if(controls)controls.hidden=true;const title=document.querySelector('.holiday-feature-title');if(title&&current.length>1)title.textContent=currentCountry==='sk'?'Sviatky a meniny':'Svátky a jmeniny';return;}
  const byProfile=current.map((_,i)=>pages.filter(page=>page.profile===i));
  pages=[];for(let part=0;byProfile.some(list=>list.length>part);part++)for(const list of byProfile)if(list[part])pages.push(list[part]);
  showPage(Math.min(pageIndex,pages.length-1));
  if(pages.length>1&&!interactive())timer=setInterval(()=>{if(!document.hidden)showPage(pageIndex+1);},20000);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(fit);}}
 function draw(profiles){
  const host=document.getElementById('upcoming');
  if(!box){box=node('div','calendar-details');box.setAttribute('aria-label','Původ jména a význam dne');host.prepend(box);new ResizeObserver(schedule).observe(host);}
  if(!controls){
   controls=node('nav','calendar-detail-controls');controls.setAttribute('aria-label','Podrobnosti dne');
   const previous=node('button','','Předchozí'),status=node('span',''),next=node('button','','Další');
   previous.type=next.type='button';status.setAttribute('role','status');
   previous.onclick=()=>showPage(pageIndex-1);next.onclick=()=>showPage(pageIndex+1);
   controls.append(previous,status,next);host.append(controls);
  }
  current=profiles;box.replaceChildren();
  for(const profile of profiles){
   const entry=node('section','name-profile'),copy=node('div','name-profile-copy');
   const heading=node('h3','name-profile-heading',profile.lead),text=node('p','name-profile-text',profile.text);
   const footer=node('div','name-profile-footer'),source=node('div','name-profile-source');source.dataset.eduSourceDetails='';
   source.append(document.createTextNode('Zpracováno podle '));
   const link=node('a','',profile.title);link.href=profile.url;link.target='_blank';link.rel='noopener noreferrer';
   const license=node('a','','CC BY-SA 4.0');license.href='https://creativecommons.org/licenses/by-sa/4.0/';license.target='_blank';license.rel='noopener noreferrer';
   source.append(link,document.createTextNode(' · upraveno · '),license);
   footer.append(source,node('span','name-profile-count'));copy.append(heading,text,footer);
   const art=node('div','name-profile-art');art.setAttribute('aria-hidden','true');
   if(profile.kind==='event'&&root.EduvizeHolidayArt)art.innerHTML=root.EduvizeHolidayArt.svg(root.EduvizeHolidayArt.motif(currentDay,profile.lead,currentEvents)||18);
   else art.innerHTML='<svg viewBox="0 0 240 240" fill="none" stroke="currentColor" stroke-width="5" aria-hidden="true"><circle cx="120" cy="120" r="96" opacity=".12"/><rect x="53" y="102" width="134" height="88" rx="10"/><path d="M43 80h154v35H43zM120 80v110M120 80C62 80 69 25 99 42c14 8 21 38 21 38Zm0 0c58 0 51-55 21-38-14 8-21 38-21 38Z"/></svg>';
   entry.append(copy,art);box.append(entry);
  }
  schedule();
 }
 let currentCountry='cz',currentDay='',currentEvents=[];
 async function present(value,enabled,day='',events=[],options={}){
  const host=document.getElementById('upcoming');
  currentCountry=options.country||'cz';currentDay=day;currentEvents=events;
  const key=JSON.stringify([value,enabled,day,events.map(e=>e.name)]);
  if(key===currentKey){schedule();return;}currentKey=key;const ticket=++sequence;current=null;clearInterval(timer);timer=null;if(box)box.hidden=true;
  if(controls)controls.hidden=true;
  if(!enabled){document.body.classList.remove('calendar-reading','calendar-reading-web');return;}
  const profiles=[],event=eventProfile(day,events,options);
  if(event)profiles.push({...event,kind:'event'});
  else if(events.length){
   const article=eventArticles[day.slice(5)]||events[0].name;
   const data=await lookup(article,'event');if(ticket!==sequence)return;
   if(data)profiles.push({...data,lead:events[0].name,kind:'event'});
  }else if(day.slice(5)==='11-02'&&options.significant!==false){
   const data=await lookup('Dušičky','event');if(ticket!==sequence)return;
   if(data)profiles.push({...data,lead:'Památka zesnulých',kind:'event'});
  }
  if(profiles.length)draw(profiles);
  // The detail heading identifies its name even on dates with multiple namedays.
  for(const name of names(value)){
   const data=await lookup(name);if(ticket!==sequence)return;
   if(data)profiles.push({...data,lead:name+' · '+data.lead,kind:'name'});
  }
  if(profiles.length)draw(profiles);
 }
 root.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
 root.EduvizeNameProfiles=Object.freeze({present,names,extract,extractEvent,eventProfile,shorten});
})(window);
