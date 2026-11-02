import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../config.html',import.meta.url),'utf8');
const loader=html.slice(html.indexOf('let calendarPromise;'),html.indexOf('</script>',html.indexOf('let calendarPromise;')));
let requests=0;const records={cz:{'2026-10-30':{nameday:'Tadeáš',holidays:[]}}};
const scope={fetch:async()=>{requests++;if(requests===1)throw Error('offline');return {ok:true,json:async()=>records}}};
vm.runInNewContext(loader,scope);
await assert.rejects(scope.calendarDay('cz','2026-10-30'));
const [one,two]=await Promise.all([scope.calendarDay('cz','2026-10-30'),scope.calendarDay('cz','2026-10-30')]);assert.equal(one,two);assert.equal(one.nameday,'Tadeáš');assert.equal(requests,2);
await assert.rejects(scope.calendarDay('cz','2099-01-01'));
assert.ok(!html.includes('window.fetch='));assert.ok(!html.includes('<style'));assert.ok(html.includes('design-system/holidays.css?v='));assert.ok(admin.includes('id="saveSettings"'));
console.log('Calendar retries failed loads, shares successful loads, reports missing dates, and uses external shared styling.');

// Namedays and calendar observances must not replace each other.
const calendar=JSON.parse(fs.readFileSync(new URL('../calendar.json',import.meta.url),'utf8'));
for(const [date,entry] of Object.entries(calendar.cz).filter(([date])=>date.endsWith('-11-02'))){assert.equal(entry.nameday,'Tobiáš',date);assert.ok(entry.nameday_source);assert.ok(entry.holidays.some(e=>/Dušičky/.test(e.name)&&!e.day_off));}
console.log('November 2 contains Tobias separately from All Souls Day in every supported year.');
