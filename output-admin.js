/* One ordinary V2 controller; native settings saves remain independent. */
(function(root){'use strict';
 async function start(){
  const d=root.document,status=d.getElementById('result'),generateButton=d.getElementById('generateOutput');
  try{
   await root.EduvizeAdminAuth.ready;
   if(root.EduvizeOutputActions?.schemaVersion!==2)throw Error('Společné akce výstupů nejsou dostupné.');
   const context=()=>{
    const s=root.EduvizeAdminAuth.status();
    if(!s.connected||!s.schoolId||!/^[a-f0-9]{32}$/.test(s.profileId||''))throw Error('Přihlaste se a vyberte uložený školní profil.');
    return {schoolId:String(s.schoolId),profileId:s.profileId,appId:'holidays',presentation:root.EduvizeHolidaysOutputSettings.presentationFromControls()};
   };
   const reader=root.EduvizeSavedOutputSettings.create();
   const client=root.EduvizeOutputClient.create({getAuthorization:async()=>{
    await root.EduvizeAdminAuth.ready;
    const token=root.EduvizeAdminAuth.getToken('configurations')||root.EduvizeAdminAuth.getToken('documents');
    if(!token)throw Error('Přihlášení vypršelo.');return 'Bearer '+token;
   }});
   const draft=root.EduvizeHolidaysOutputSettings.createDraftGetter({context,loadSaved:async c=>(await reader.load(c)).config});
   const actions=root.EduvizeOutputActions.mount({client,context,draft,elements:{generateButton,copyButton:d.getElementById('openOutput'),openButton:d.getElementById('save'),status}});
   root.EduvizeHolidaysOutputActions=actions;
   let seq=0;
   async function refresh(){const ticket=++seq;try{await actions.refresh();}catch{if(ticket===seq)generateButton.textContent='Vygenerovat odkaz';}}
   let pending;
   const schedule=()=>{clearTimeout(pending);pending=setTimeout(refresh,100);};
   for(const event of ['eduvize-profile-selected','eduvize-admin-auth-change'])root.addEventListener(event,schedule);
   d.getElementById('viewMode').addEventListener('change',schedule);
   // Existing picker changes canonical geometry through ordinary buttons.
   d.addEventListener('click',e=>{if(e.target.closest('#ev-segments button,.edu-web-preview-controls button'))schedule();});
   // Shared profile controls may mount after this script. Only place the NEW button;
   // never move or rebind any of the existing save/copy/open controls.
   const place=()=>{const copy=d.getElementById('openOutput');if(copy.previousElementSibling!==generateButton)copy.before(generateButton);};
   const observer=new MutationObserver(place);observer.observe(generateButton.parentElement,{childList:true});place();
   await refresh();
  }catch(e){generateButton.disabled=true;status.textContent=e.message||'Výstup není dostupný.';}
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
