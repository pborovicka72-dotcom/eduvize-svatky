/* All public links are obtained by read-only calls to the coordinated registry. */
(function(root){'use strict';
 const status=document.getElementById('result'),select=document.getElementById('publication-output');
 let busy=false,scope='',selected=null;
 const report=text=>{status.textContent=text;};
 const client=root.EduvizeOutputClient.create({getAuthorization:async()=>{
  await root.EduvizeAdminAuth.ready;const token=root.EduvizeAdminAuth.getToken();return token?'Bearer '+token:null;
 }});
 function context(){
  const s=root.EduvizeAdminAuth.status();
  if(!s.connected||!s.schoolId||!/^[a-f0-9]{32}$/.test(s.profileId||''))throw Error('Přihlaste se a vyberte školní profil.');
  const next=s.schoolId+':'+s.profileId;if(next!==scope){scope=next;selected=null;select.replaceChildren(new Option('Vyberte výstup',''));}
  return {appId:'holidays',profileId:s.profileId};
 }
 function draft(){
  const v=values(),mode=v.viewMode,{viewMode,...payload}=v;
  let geometry=null;
  if(mode==='nsp'){
   const s=root.EduvizeSegmentSelection.params();
   geometry={registryId:'nsp-4k',registryVersion:1,orientation:s.orientation,layoutId:Number(s.style),segmentId:Number(s.block)};
  }else if(mode==='kiosk'){
   const orientation=document.getElementById('publication-orientation').value;
   geometry={registryId:'kiosk-viewport',registryVersion:1,orientation,width:orientation==='portrait'?1080:1920,height:orientation==='portrait'?1920:1080};
  }
  return {schemaVersion:1,payloadVersion:1,payload,presentation:{mode,geometry,interaction:mode==='kiosk'?'interactive':root.EduvizeOutputModes.selection(),kioskLayout:mode==='kiosk'?root.EduvizeOutputModes.layoutSelection():null}};
 }
 async function mutation(name,body,callback){
  // Persist key+body before I/O. After a lost response, an identical retry replays the result.
  const key='holidays-output-v1:'+scope+':'+name;let operation;
  try{operation=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(operation&&JSON.stringify(operation.body)!==JSON.stringify(body))throw Error('Nejprve zopakujte nedokončenou operaci s původními hodnotami.');
  if(!operation){operation={key:client.newOperation(),body};sessionStorage.setItem(key,JSON.stringify(operation));}
  try{const result=await callback(operation.body,operation.key);sessionStorage.removeItem(key);return result;}
  catch(e){if(e.status&&e.status<500&&e.status!==401)sessionStorage.removeItem(key);throw e;}
 }
 async function action(callback){if(busy)return;busy=true;try{context();await callback();}catch(e){report(e.message);}finally{busy=false;}}
 async function list(){
  const c=context(),items=[];let after;
  do{const page=await client.listOutputs({...c,after});items.push(...page.items);after=page.nextCursor;}while(after);
  select.replaceChildren(new Option('Vyberte výstup',''),...items.map(o=>new Option(o.id.slice(0,8)+' · '+o.state,o.id)));
  if(selected)select.value=selected.id;
  report('Načteno '+items.length+' výstupů.');
 }
 function apply(output){
  if(!output?.draft)return;
  const {payload,presentation:p}=output.draft;
  for(const [key,value] of Object.entries(payload)){
   const field=document.getElementById(key);if(!field)continue;
   if(field.type==='checkbox')field.checked=value;else field.value=String(value);
  }
  document.getElementById('viewMode').value=p.mode;
  if(p.geometry?.registryId==='nsp-4k')root.EduvizeSegmentSelection.set({orientation:p.geometry.orientation,style:p.geometry.layoutId,block:p.geometry.segmentId});
  if(p.mode==='kiosk')document.getElementById('publication-orientation').value=p.geometry.orientation;
  root.EduvizeOutputModes.setInteraction(p.interaction,{notify:false});
  if(p.kioskLayout)root.EduvizeOutputModes.setKioskLayout(p.kioskLayout,{notify:false});
  document.getElementById('viewMode').dispatchEvent(new Event('change',{bubbles:true}));
  updateTomorrow();
 }
 select.onchange=()=>action(async()=>{selected=select.value?await client.getOutput(select.value):null;apply(selected);report(selected?'Vybraný výstup: '+selected.id:'Vyberte výstup.');});
 document.getElementById('publication-refresh').onclick=()=>action(list);
 document.getElementById('publication-create').onclick=()=>action(async()=>{
  const c=context(),key='holidays-output-v1:'+scope+':creation';
  let job;try{job=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(!job){job={draft:draft()};sessionStorage.setItem(key,JSON.stringify(job));}
  if(!job.assemblyId){const a=await mutation('assembly', {schemaVersion:1,...c},(b,k)=>client.createAssembly(b,k));job.assemblyId=a.id;sessionStorage.setItem(key,JSON.stringify(job));}
  selected=await mutation('create',{schemaVersion:1,...c,assemblyId:job.assemblyId,draft:job.draft},(b,k)=>client.createOutput(b,k));
  sessionStorage.removeItem(key);await list();report('Výstup založen jako koncept. Zveřejnění vyžaduje Publikovat.');
 });
 document.getElementById('publication-save').onclick=()=>action(async()=>{
  if(!selected)throw Error('Vyberte výstup.');
  selected=await mutation('save:'+selected.id,{expectedRevision:selected.revision,draft:draft()},(b,k)=>client.saveDraft(selected.id,b,k));report('Koncept uložen. Publikovaný výstup se nezměnil.');
 });
 document.getElementById('publication-publish').onclick=()=>action(async()=>{
  if(!selected)throw Error('Vyberte výstup.');
  selected=await mutation('publish:'+selected.id,{expectedRevision:selected.revision},(b,k)=>client.publishOutput(selected.id,b,k));report('Uložený koncept publikován.');
 });
 async function link(){context();if(!selected)throw Error('Vyberte publikovaný výstup.');return (await client.getOutputLink(selected.id)).url;}
 root.EduvizeHolidaysPublication=Object.freeze({copy:()=>action(async()=>{await navigator.clipboard.writeText(await link());report('Publikovaný odkaz zkopírován.');}),open:()=>action(async()=>{location.assign(await link());})});
})(window);
