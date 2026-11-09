/* Private saved settings reader; no writes, publication or browser-state authority. */
(function(root){'use strict';
 const ID=/^[a-f0-9]{32}$/;
 const copy=value=>JSON.parse(JSON.stringify(value));
 function error(code,message){throw Object.assign(new Error(message),{code});}
 function create({auth=root.EduvizeAdminAuth,profiles=root.EduvizeProfiles}={}){
  function identity(){
   const value=auth?.status?.(),token=auth?.getToken?.('configurations')||auth?.getToken?.('documents');
   if(!value?.connected||!value.schoolId||!ID.test(value.profileId||'')||!token)
    error('CONTEXT_REQUIRED','Přihlaste se účtem školy a vyberte uložený profil.');
   return {schoolId:String(value.schoolId),profileId:value.profileId,token};
  }
  function unchanged(before,context){
   const after=identity();
   if(before.schoolId!==after.schoolId||before.profileId!==after.profileId||before.token!==after.token||
      String(context.schoolId)!==after.schoolId||context.profileId!==after.profileId)
    error('CONTEXT_CHANGED','Školní účet nebo profil se během načítání změnil. Zkuste akci znovu.');
  }
  async function load(context){
   await auth?.ready;
   if(!context||!/^[a-z][a-z0-9-]{0,47}$/.test(context.appId||''))
    error('CONTEXT_REQUIRED','Chybí platná aplikace.');
   const before=identity();unchanged(before,context);
   if(typeof profiles?.request!=='function')error('DEPENDENCY_UNAVAILABLE','Uložené nastavení nyní není dostupné.');
   const profile=await profiles.request('/'+before.profileId,{fresh:true});
   unchanged(before,context);
   if(profile?.id!==before.profileId)error('INVALID_RECORD','Server vrátil jiný profil.');
   const config=profile.apps?.[context.appId]?.config;
   if(!config||typeof config!=='object'||Array.isArray(config)||config.empty===true||config.schemaVersion!==1)
    error('SETTINGS_REQUIRED','Nejprve uložte nastavení této aplikace do Eduvize.');
   return {config:copy(config),profileRevision:profile.revision};
  }
  async function loadData(context){
   const {config}=await load(context);
   if(!config.data||typeof config.data!=='object'||Array.isArray(config.data))
    error('SETTINGS_REQUIRED','Nejprve uložte nastavení této aplikace do Eduvize.');
   return copy(config.data);
  }
  return Object.freeze({load,loadData});
 }
 root.EduvizeSavedOutputSettings=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
