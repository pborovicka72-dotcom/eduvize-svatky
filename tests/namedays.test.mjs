import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const snapshot = JSON.parse(fs.readFileSync(new URL('data/namedays-cz.json', root), 'utf8'));
const calendar = JSON.parse(fs.readFileSync(new URL('calendar.json', root), 'utf8'));
const scope = {};
vm.runInNewContext(fs.readFileSync(new URL('holiday-art.js', root), 'utf8'), { window: scope });
const { namedayNote } = scope.EduvizeHolidayArt;

assert.equal(Object.keys(snapshot.days).length, 366);
assert.deepEqual(snapshot.days['11-17'], ['Mahulena', 'Gertruda']);
for (const [monthDay, names] of Object.entries(snapshot.days)) {
  const text = names.join(', ');
  const note = namedayNote([{ name: 'Významný den' }], text, 'cz');
  assert.equal(note, text ? 'Dnes slaví: ' + text : '', monthDay);
  assert.equal(namedayNote([], text, 'cz'), '', monthDay);
}
for (const [date, day] of Object.entries(calendar.cz)) {
  const expected = snapshot.days[date.slice(5)];
  assert.ok(expected, date);
  assert.equal(day.nameday, expected.join(', '), date);
}
console.log('All 366 source dates and all Czech calendar entries preserve namedays beside observances.');
