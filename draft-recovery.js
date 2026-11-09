/* Native calendar draft projection only. Scoped storage and explicit restore belong to Profiles. */
(function(root){'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v));
 const invalid=()=>{throw Error('Rozpracované nastavení Svátků není platné.');};
 function segment(v){
  if(v==null)return null;
  const {orientation,style,block}=v;
  if(!['landscape','portrait'].includes(orientation)||!Number.isSafeInteger(style)||style<1||style>(orientation==='portrait'?5:8)||!Number.isSafeInteger(block)||block<1||block>4)invalid();
  root.EduvizeOutputActions.canonicalSlot({mode:'nsp',geometry:{registryId:'nsp-4k',registryVersion:1,orientation,layoutId:style,segmentId:block}});
  return {orientation,style,block};
 }
 function presentation(v){
  if(v==null)return null;
  if(!['web','nsp','kiosk'].includes(v.mode)||!['display','interactive'].includes(v.interaction))invalid();
  let geometry=null,kioskLayout=null;
  if(v.mode==='web'){if(v.geometry!==null)invalid();}
  else if(v.mode==='nsp'){
   const g=v.geometry;if(!g||g.registryId!=='nsp-4k'||g.registryVersion!==1)invalid();
   const s=segment({orientation:g.orientation,style:g.layoutId,block:g.segmentId});
   geometry={registryId:'nsp-4k',registryVersion:1,orientation:s.orientation,layoutId:s.style,segmentId:s.block};
  }else{
   const g=v.geometry;if(!g||g.registryId!=='kiosk-viewport'||g.registryVersion!==1||![g.width,g.height].every(n=>Number.isSafeInteger(n)&&n>=240&&n<=8192)||!['landscape','portrait'].includes(g.orientation)||(g.orientation==='portrait')!==(g.height>g.width)||!['menu','tiles'].includes(v.kioskLayout)||v.interaction!=='interactive')invalid();
   geometry={registryId:'kiosk-viewport',registryVersion:1,orientation:g.orientation,width:g.width,height:g.height};kioskLayout=v.kioskLayout;
  }
  const p={mode:v.mode,geometry,interaction:v.interaction,kioskLayout};root.EduvizeOutputActions.canonicalSlot(p);return p;
 }
 function clean(value){
  if(value?.schemaVersion!==1||value.recoveryVersion!==1||!['web','nsp','kiosk'].includes(value.values?.viewMode))invalid();
  const values={viewMode:value.values.viewMode,...root.EduvizeHolidaysOutputSettings.payload(value)};
  const p=presentation(value.presentation);
  if(p&&p.mode!==values.viewMode)invalid();
  const result={schemaVersion:1,recoveryVersion:1,values,segment:segment(value.segment),presentation:p};
  if(value.outputInteraction!==undefined){if(!['display','interactive'].includes(value.outputInteraction))invalid();result.outputInteraction=value.outputInteraction;}
  if(value.outputKioskLayout!==undefined){if(!['menu','tiles'].includes(value.outputKioskLayout))invalid();result.outputKioskLayout=value.outputKioskLayout;}
  return result;
 }
 function read(){
  return clean({schemaVersion:1,recoveryVersion:1,values:root.EduvizeProfiles.fields(['viewMode','country','monthFormat','days','tomorrow','holidays','significant','nameDetails']).read(),segment:root.EduvizeProfiles.segment(),presentation:root.EduvizeHolidaysOutputSettings.readNativePresentation(),outputInteraction:root.EduvizeOutputModes.selection(),outputKioskLayout:root.EduvizeOutputModes.layoutSelection()});
 }
 async function apply(value){
  const config=clean(copy(value));
  if(config.outputInteraction)root.EduvizeOutputModes.setInteraction(config.outputInteraction,{notify:false});
  if(config.outputKioskLayout)root.EduvizeOutputModes.setKioskLayout(config.outputKioskLayout,{notify:false});
  root.EduvizeProfiles.fields(['viewMode','country','monthFormat','days','tomorrow','holidays','significant','nameDetails']).apply(config.values);
  root.EduvizeProfiles.applySegment(config.segment);
  if(config.presentation){
   try{await root.EduvizeHolidaysOutputSettings.applyPresentation(config.presentation);}
   catch(e){if(e.code==='DEPENDENCY_UNAVAILABLE')return {presentationPending:true};throw e;}
  }
  return {presentationPending:!config.presentation};
 }
 root.EduvizeHolidaysRecovery=Object.freeze({clean,adapter:Object.freeze({read,apply,clean})});
})(typeof window==='undefined'?globalThis:window);
