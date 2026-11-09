# Eduvize · Svátky a jmeniny

Výstup kalendáře používá geometrii a obsahové profily z centrálního design systému. Číslo šablony již neurčuje vlastní výjimky pro velikosti a viditelnost částí.

- `segment-profile.js`: geometrie a priority dat.
- `holidays-layout.js`: převod profilu na prezentační tokeny.
- `holidays.css`: vzhled podle aktivní šablony.
- `segment-display.js`: přesné rozlišení segmentu a proporcionální zmenšení.

[Úplná specifikace a mapa všech segmentů](https://github.com/pborovicka72-dotcom/eduvize-styly/blob/main/design-system/SEGMENT-PROFILES.md).

Dnešní jmeniny a zapnuté dnešní události mají přednost. Přehled dalších dnů respektuje nastavení uživatele i kapacitu segmentu: běžný profil až 6 dnů, panoramatický až 3, kompaktní bez samostatného přehledu. Nejde o oprávnění zobrazovat více údajů, než uživatel zvolil.

`?debug=1` ukáže profil a skutečné rozměry. Test profilu pokrývá všech 36 segmentů; viz centrální `design-system/tests/segment-profile.test.mjs`. Test kalendáře zůstává v `tests/calendar.test.mjs`.


## Úplný zdroj českých jmenin

Jmeniny jsou oddělené od kalendářních událostí. Celoroční import pochází z [České jmeniny API – Tomáš Motl](https://tomasmotl.cz/aplikace/jmeniny). Uložený export `data/namedays-cz.json` obsahuje všech **366 dat**, seznamy jmen, původ zdroje a čas importu. Provoz čte místní `calendar.json`; není závislý na dostupnosti API.

```sh
python3 scripts/import_namedays.py --apply
```

Importer čte celý přestupný rok, respektuje omezení požadavků a při přerušení pokračuje z pracovní mezipaměti. Neúplná či chybná data odmítne. Teprve po validaci promítne celý zdroj do všech podporovaných let 2025–2035. Svátky, jejich typy a pracovní volno zachovává beze změny. Pro obnovu z uloženého exportu:

```sh
python3 scripts/import_namedays.py --snapshot data/namedays-cz.json --apply
```

Původní SvátkyAPI nebylo použito pro nový import: jeho interval vrací jen 365 záznamů a například 2. listopadu zaměňuje jmeniny za Památku zesnulých. Slovenská data tato změna neupravuje.

## Prostor pro popis a souběh událostí

NSP bez interaktivního ovládání střídá medailonky po 20 sekundách. Každý popis se vejde na jednu obrazovku: písmo se zmenší nejvýše o 15 %, poté se text zkrátí na hranici věty nebo slova. Nedělí se na další textové stránky.

Kiosek a interaktivní NSP mají tlačítka Předchozí / Další, pokud existuje více medailonků. Automaticky nepřepínají. Kiosek ukazuje celý text v přirozené výšce karty; běžná stránka všechny medailonky pod sebou. Podrobnosti fungují i s nulovým počtem dalších dnů. Při nedostupném doplňujícím zdroji zůstanou základní jmeniny a svátky.

Následující dny mají vlastní pás a nadpis ze skutečného počtu karet. S popisem je široký výstup omezen na nejvýše 3 následující dny, portrétní na 4, vždy podle zvoleného limitu a kapacity. Popis nenahrazuje budoucí kartu. Česká i slovenská varianta mají samostatné skloňování.

## Příprava společného kontraktu

Veřejný výstup nečte rozpracované nastavení z localStorage. Parametrické adresy jsou dosavadní vývojová cesta, nikoli implementace nového registru publikací. Bez explicitního profilu používá výstup standardní vzhled; nesmí přebrat profil posledního správce.

Sdílené soubory se načítají ze stejného originu `/eduvize-styly/design-system/`. Pro místní kontrolu servírujte společný nadřazený adresář obsahující oba repozitáře. Samotný server pro tento repozitář nestačí.

Resolver, publikování a veřejná konfigurace se integrují až přes koordinované rozhraní podle `../EDUVIZE-OUTPUT-CONTRACT.md`. Nezavádět aplikační API ani alternativní generátor. Historické vývojové odkazy nemusí zůstat kompatibilní; školní data se nemažou.

Podrobný audit, důkazy a dosud nevyřešené společné závislosti: [AUDIT-2026-11-06.md](AUDIT-2026-11-06.md). Tato příprava nepotvrzuje nezávislost celého nasazení na Renderu.

## Publikované výstupy v1

Nový renderer `published.html` a backend balíček `eduvize_holidays.output_adapter` integrují společný registr. Administrace používá běžné Uložit nastavení / Kopírovat odkaz / Otevřít náhled přes společný controller saved-copy-preview. Uložení aktualizuje existující výstup z přesně potvrzené konfigurace. První kopírování vytváří výstup z čerstvě načteného uloženého profilu, další kopie zachová stejnou URL bez aktualizace. Náhled čte aktuální formulář a otevírá novou záložku. Technický panel Publikace byl odstraněn. Starší `index.html` je dosavadní vývojový/náhledový renderer, nikoli cíl nového resolveru. Aktuální integrace a její testovací omezení jsou v [OUTPUT-V1-INTEGRATION.md](OUTPUT-V1-INTEGRATION.md); starší audit zachycuje výchozí stav před touto implementací.

Aktuální atomický V2 patch, instalační piny a závislosti jsou v [deployment/RENDERER-HANDOFF.md](deployment/RENDERER-HANDOFF.md) a [deployment/renderer-allowlist.json](deployment/renderer-allowlist.json). Lokální browser důkaz je v audit/output-admin-v2-results.json; vzdálené TEST nasazení a veřejná akceptace zůstávají úkolem jediného Server executora.

Místní koncepty a nabídka Obnovit/Zahodit jsou zrušené. Aplikace neaktivuje žádné capture/store/restore. Zachovává upozornění na neuložené změny a potvrzené cloudové ukládání.
