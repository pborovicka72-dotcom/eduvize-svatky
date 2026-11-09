/* Native adapter for the sole shared Save / Copy / Preview workflow. */
(function(root){'use strict';
 async function start(){
  const d=root.document,status=d.getElementById('result');
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
   const previewDraftUrl=()=>{
    const url=new URL(outputUrl(),root.location.href);url.searchParams.set('preview','1');return url;
   };
   const actions=root.EduvizeOutputActions.mount({workflow:'saved-copy-preview',client,context,draft,previewDraftUrl,elements:{copyButton:d.getElementById('openOutput'),openButton:d.getElementById('save'),status}});
   if(actions.workflow!=='saved-copy-preview'||typeof actions.withSavedCommit!=='function')throw Error('Společný postup ukládání není dostupný.');
   root.EduvizeHolidaysOutputActions=actions;
   root.EduvizeProfileAdapter.outputActions=actions;
   const settingsSave=d.querySelector('[data-edu-profile-save]');if(settingsSave)settingsSave.textContent='Uložit nastavení';
  }catch(e){d.getElementById('openOutput').disabled=true;d.getElementById('save').disabled=true;status.textContent=e.message||'Výstup není dostupný.';}
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
