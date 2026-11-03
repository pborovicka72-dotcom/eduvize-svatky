(function(root){
 function daysHeading(count,country='cz'){
  const n=Math.max(0,Math.trunc(Number(count)||0)),sk=country==='sk';
  if(!n)return '';
  if(n===1)return sk?'Ďalší deň':'Další den';
  if(n>=2&&n<=4)return (sk?'Ďalšie ':'Další ')+n+(sk?' dni':' dny');
  return (sk?'Ďalších ':'Dalších ')+n+(sk?' dní':' dnů');
 }
 function splitWords(text,fits){
  const words=String(text||'').trim().split(/\s+/u).filter(Boolean),pages=[];
  while(words.length){let lo=1,hi=words.length,best=1;
   while(lo<=hi){const mid=Math.floor((lo+hi)/2);if(fits(words.slice(0,mid).join(' '))){best=mid;lo=mid+1;}else hi=mid-1;}
   pages.push(words.splice(0,best).join(' '));
  }
  return pages.length?pages:[''];
 }
 root.EduvizeCalendarCopy=Object.freeze({daysHeading,splitWords});
})(typeof window==='undefined'?globalThis:window);
