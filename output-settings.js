/* Adapter for ordinary shared output actions. No UI, storage, network or resolver. */
(function(root){'use strict';
 const keys=['country','monthFormat','days','tomorrow','holidays','significant','nameDetails'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 function fail(message,code='SETTINGS_REQUIRED'){throw Object.assign(new Error(message),{code});}
 function payload(config){
  const v=config?.values;
  if(!v||typeof v!=='object')fail('Chybí uložené nastavení Svátků.');
  const result=Object.fromEntries(keys.map(k=>[k,v[k]]));
  // Existing form/profile field serializer stores select values as strings.
  if(typeof result.days==='string'&&/^[0-6]$/.test(result.days))result.days=Number(result.days);
  if(!['cz','sk'].includes(result.country)||!['text','number'].includes(result.monthFormat)||!Number.isInteger(result.days)||result.days<0||result.days>6||keys.slice(3).some(k=>typeof result[k]!=='boolean'))fail('Uložené nastavení Svátků není platné.');
  return result;
 }
 function createDraftGetter({loadSaved,context}){
  if(typeof loadSaved!=='function'||typeof context!=='function')throw TypeError('Authoritative saved config reader and shared presentation required');
  return async()=>{
   const before=clone(context());
   if(before.appId!=='holidays'||!before.schoolId||!before.profileId)fail('Nejprve vyberte uložený školní profil.');
   const saved=await loadSaved(before); // Owner supplies ordinary authenticated profile read.
   if(JSON.stringify(before)!==JSON.stringify(context()))fail('Školní profil nebo výstup se změnil.');
   const p=saved.presentation&&clone(saved.presentation);
   if(!p)fail('Nejprve uložte nastavení výstupu do Eduvize.');
   if(root.EduvizeOutputActions.canonicalSlot(p)!==root.EduvizeOutputActions.canonicalSlot(before.presentation))fail('Nejprve uložte zvolený režim a rozměry do Eduvize.');
   if(!['web','nsp','kiosk'].includes(p?.mode))fail('Chybí společné nastavení výstupu.');
   return {schemaVersion:1,payloadVersion:1,payload:payload(saved),presentation:p};
  };
 }
 function presentationFromControls(){
  const mode=root.document.getElementById('viewMode').value;
  let geometry=null;
  if(mode==='nsp'){
   const s=root.EduvizeSegmentSelection?.params();
   if(!s)fail('Vyberte segment NSP.');
   geometry={registryId:'nsp-4k',registryVersion:1,orientation:s.orientation,layoutId:Number(s.style),segmentId:Number(s.block)};
  }else if(mode==='kiosk'){
   const frame=root.document.querySelector('#ev-preview iframe[data-preview-width]');
   const width=Number(frame?.getAttribute('data-preview-width')),height=Number(frame?.getAttribute('data-preview-height'));
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<240||height<240)fail('Počkejte na načtení náhledu kiosku.');
   geometry={registryId:'kiosk-viewport',registryVersion:1,orientation:height>width?'portrait':'landscape',width,height};
  }
  const p={mode,geometry,interaction:mode==='kiosk'?'interactive':root.EduvizeOutputModes.selection(),kioskLayout:mode==='kiosk'?root.EduvizeOutputModes.layoutSelection():null};
  root.EduvizeOutputActions.canonicalSlot(p);
  return p;
 }
 async function applyPresentation(p){
  root.EduvizeOutputActions.canonicalSlot(p);
  if(p.kioskLayout)root.EduvizeOutputModes.setKioskLayout(p.kioskLayout,{notify:false});
  root.EduvizeOutputModes.setInteraction(p.interaction,{notify:false});
  const mode=root.document.getElementById('viewMode');mode.value=p.mode;mode.dispatchEvent(new Event('change',{bubbles:true}));
  if(p.mode==='nsp')root.EduvizeSegmentSelection.set({orientation:p.geometry.orientation,style:p.geometry.layoutId,block:p.geometry.segmentId});
  if(p.mode==='kiosk'){
   if(root.EduvizeSegmentSelection?.setKioskGeometry?.(p.geometry)!==true)fail('Uložené rozměry kiosku nyní nelze obnovit.','DEPENDENCY_UNAVAILABLE');
  }
 }
 function readNativePresentation(){try{return presentationFromControls();}catch{return null;}}
 root.EduvizeHolidaysOutputSettings=Object.freeze({payload,createDraftGetter,presentationFromControls,readNativePresentation,applyPresentation});
})(typeof window==='undefined'?globalThis:window);
