/* Name medallions are an optional part of Holidays, never a separate app. */
(function(root){
 const curated={
 Jan:{lead:'Krátké jméno s dlouhou historií',text:'Jan pochází z hebrejského jména Jóchanán. Jeho význam se obvykle překládá jako „Hospodin je milostivý“.',extra:'Domácí podoby: Honza, Honzík, Jenda a Jeník.',url:'https://cs.wiktionary.org/wiki/Jan',title:'Wikislovník – Jan'},
 Hubert:{lead:'Jméno spojené s bystrou myslí',text:'Hubert má germánské kořeny. Původní podoba Hugberaht spojuje výrazy pro mysl a jas či zářivost. Význam se proto vykládá jako člověk jasné mysli nebo duchaplný.',extra:'Ve světě: italsky Uberto, španělsky Huberto.',url:'https://cs.wikipedia.org/wiki/Hubert',title:'Wikipedie – Hubert'},
 Tereza:{lead:'Jméno s více výklady původu',text:'Tereza je jméno řeckého původu, jeho přesný význam však není jednoznačný. Jeden z výkladů ho spojuje se sklizní, jiný s létem.',extra:'Další podoby: Terezie, Teresa a Theresa.',url:'https://cs.wikipedia.org/wiki/Tereza',title:'Wikipedie – Tereza'}
 };
 const pending=new Map();let sequence=0,currentKey='',current=null,box,queued=false;
 function normalize(s){return String(s).normalize('NFC').trim();}
 function names(value){return [...new Set(String(value||'').split(/[,;/•]|\s+a\s+/u).map(normalize).filter(n=>/^[\p{L} -]{2,40}$/u.test(n)))];}
 function shorten(text,max){if(text.length<=max)return text;const part=text.slice(0,max),end=part.lastIndexOf(' ');return part.slice(0,end>0?end:max).replace(/[,;:]$/,'')+'…';}
 function clean(text){return text.replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();}
 function extract(html,kind){
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('sup,table,.mw-editsection,.navbox,.reference').forEach(e=>e.remove());
  if(kind==='wiktionary'){
   const headings=[...doc.querySelectorAll('h2,h3')];let czech=false;
   for(const heading of headings){
    if(heading.tagName==='H2')czech=/^čeština$/i.test(clean(heading.textContent));
    if(!czech||!/^etymologie$/i.test(clean(heading.textContent)))continue;
    const parent=heading.parentElement.matches('.mw-heading')?heading.parentElement:heading;
    let n=parent.nextElementSibling,parts=[];
    while(n&&!n.matches('h2,h3,.mw-heading')){if(n.matches('p'))parts.push(clean(n.textContent));n=n.nextElementSibling;}
    const text=parts.join(' ');if(text.length>30)return shorten(text,480);
   }
  }else{
   const paragraphs=[...doc.querySelectorAll('.mw-parser-output > p,.mw-parser-output > section > p')];
   return shorten(paragraphs.map(p=>clean(p.textContent)).find(t=>/\bjméno\b/iu.test(t)&&/původ|odvoz|pocház|význam/iu.test(t))||'',480);
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
   const text=extract(data.parse.text['*'],kind);if(!text)return null;
   return {lead:'Původ a význam jména',text,extra:'',url:'https://'+host+'/w/index.php?title='+encodeURIComponent(data.parse.title)+'&oldid='+data.parse.revid,title:(kind==='wiktionary'?'Wikislovník':'Wikipedie')+' – '+data.parse.title};
  }catch{return null;}finally{clearTimeout(timer);}
 }
 async function lookup(name){
  if(curated[name])return curated[name];
  if(pending.has(name))return pending.get(name);
  const task=(async()=>{
   const key='eduvize-name-profile-v1:'+name;
   try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Date.now()-saved.time<30*86400000&&saved.data?.url?.startsWith('https://cs.')&&saved.data.text)return saved.data;}catch{}
   const data=await request(name,'wiktionary')||await request(name,'wikipedia');
   if(data)try{localStorage.setItem(key,JSON.stringify({time:Date.now(),data}));}catch{}
   return data;
  })();pending.set(name,task);return task;
 }
 function node(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;}
 function fit(){
  queued=false;if(!box||!current)return;
  const card=box.parentElement;card.classList.remove('hidden');const web=root.EduvizeOutputModes?.mode?.()==='web';
  box.hidden=false;box.querySelector('.name-profile-extra').hidden=false;box.querySelector('.name-profile-text').textContent=current.text;
  if(web)return;
  // Preserve the existing reading scale; reduce detail before touching the primary name.
  const fits=()=>card.scrollHeight<=card.clientHeight+1;
  if(!fits())box.querySelector('.name-profile-extra').hidden=true;
  if(!fits())box.querySelector('.name-profile-text').textContent=shorten(current.text,170);
  if(!fits()){box.hidden=true;card.classList.add('hidden');}
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(fit);}}
 function draw(profile,name){
  if(!box){box=node('section','name-profile');box.setAttribute('aria-label','O jménu');document.getElementById('names-card').append(box);new ResizeObserver(schedule).observe(box.parentElement);}
  box.parentElement.classList.add('name-profile-card');box.parentElement.classList.remove('hidden');box.replaceChildren();current=profile;
  box.append(node('h3','name-profile-heading',name+' · '+profile.lead),node('p','name-profile-text',profile.text),node('p','name-profile-extra',profile.extra));
  const source=node('div','name-profile-source');source.dataset.eduSourceDetails='';
  source.append(document.createTextNode('Zpracováno podle '));
  const link=node('a','',profile.title);link.href=profile.url;link.target='_blank';link.rel='noopener noreferrer';
  const license=node('a','','CC BY-SA 4.0');license.href='https://creativecommons.org/licenses/by-sa/4.0/';license.target='_blank';license.rel='noopener noreferrer';
  source.append(link,document.createTextNode(' · upraveno · '),license);box.append(source);schedule();
 }
 async function present(value,enabled){
  const key=(enabled?'1:':'0:')+value;
  if(key===currentKey){schedule();return;}currentKey=key;const ticket=++sequence;current=null;if(box){box.hidden=true;box.parentElement.classList.remove('name-profile-card');}
  document.querySelector('.calendar-metrics')?.classList.remove('name-profiles-enabled');
  if(!enabled)return;
  const list=names(value);
  // Non-name calendar entries (e.g. All Souls' Day) do not get a fabricated profile.
  for(const name of list){const data=await lookup(name);if(ticket!==sequence)return;if(data){document.querySelector('.calendar-metrics')?.classList.add('name-profiles-enabled');draw(data,name);return;}}
 }
 root.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
 root.EduvizeNameProfiles=Object.freeze({present,names,extract,shorten});
})(window);
