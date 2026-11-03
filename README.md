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

NSP a kiosek sdílejí jednu čtecí plochu. Jmeniny a svátky se střídají po 20 sekundách včetně hlavičky. Delší text se dělí podle skutečné kapacity na celé části bez ztráty slov. Běžná stránka ukáže všechny popisy pod sebou.

Následující dny mají vlastní pás a nadpis vzniká ze skutečného počtu vykreslených karet. S popisem je široký výstup omezen na nejvýše 3 následující dny, portrétní na 4 (vždy také respektuje zvolený limit a kapacitu segmentu). Žádná karta není nahrazena popisem. Česká i slovenská varianta mají samostatné skloňování.
