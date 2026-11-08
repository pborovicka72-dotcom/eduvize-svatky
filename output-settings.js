/* Adapter for ordinary shared output actions. No UI, storage, network or resolver. */
(function(root){'use strict';
 const keys=['country','monthFormat','days','tomorrow','holidays','significant','nameDetails'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 function payload(config){
  const v=config?.values;
  if(!v||typeof v!=='object')throw Error('Chybí uložené nastavení Svátků.');
  const result=Object.fromEntries(keys.map(k=>[k,v[k]]));
  // Existing form/profile field serializer stores select values as strings.
  if(typeof result.days==='string'&&/^[0-6]$/.test(result.days))result.days=Number(result.days);
  if(!['cz','sk'].includes(result.country)||!['text','number'].includes(result.monthFormat)||!Number.isInteger(result.days)||result.days<0||result.days>6||keys.slice(3).some(k=>typeof result[k]!=='boolean'))throw Error('Uložené nastavení Svátků není platné.');
  return result;
 }
 function createDraftGetter({loadSaved,context,presentation}){
  if(typeof loadSaved!=='function'||typeof context!=='function'||typeof presentation!=='function')throw TypeError('Authoritative saved config reader and shared presentation required');
  return async()=>{
   const before=clone(context());
   if(before.appId!=='holidays'||!before.schoolId||!before.profileId)throw Error('Nejprve vyberte uložený školní profil.');
   const saved=await loadSaved(before); // Owner supplies ordinary authenticated profile read.
   if(JSON.stringify(before)!==JSON.stringify(context()))throw Error('Školní profil nebo výstup se změnil.');
   const p=clone(presentation());
   if(!['web','nsp','kiosk'].includes(p?.mode))throw Error('Chybí společné nastavení výstupu.');
   return {schemaVersion:1,payloadVersion:1,payload:payload(saved),presentation:p};
  };
 }
 root.EduvizeHolidaysOutputSettings=Object.freeze({payload,createDraftGetter});
})(typeof window==='undefined'?globalThis:window);
