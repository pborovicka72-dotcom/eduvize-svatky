# Eduvize · Svátky a jmeniny

Výstup kalendáře používá geometrii a obsahové profily z centrálního design systému. Číslo šablony již neurčuje vlastní výjimky pro velikosti a viditelnost částí.

- `segment-profile.js`: geometrie a priority dat.
- `holidays-layout.js`: převod profilu na prezentační tokeny.
- `holidays.css`: vzhled podle aktivní šablony.
- `segment-display.js`: přesné rozlišení segmentu a proporcionální zmenšení.

[Úplná specifikace a mapa všech segmentů](https://github.com/pborovicka72-dotcom/eduvize-styly/blob/main/design-system/SEGMENT-PROFILES.md).

Dnešní jmeniny a zapnuté dnešní události mají přednost. Přehled dalších dnů respektuje nastavení uživatele i kapacitu segmentu: běžný profil až 6 dnů, panoramatický až 3, kompaktní bez samostatného přehledu. Nejde o oprávnění zobrazovat více údajů, než uživatel zvolil.

`?debug=1` ukáže profil a skutečné rozměry. Test profilu pokrývá všech 36 segmentů; viz centrální `design-system/tests/segment-profile.test.mjs`. Test kalendáře zůstává v `tests/calendar.test.mjs`.

## Oprava zdroje jmenin 2. listopadu

Jmeniny: **Tobiáš**. Památka zesnulých (Dušičky) je samostatná událost, nikoli jméno, a není dnem pracovního klidu. Opraveny všechny roky 2025–2035. Ověření: [historie občanského kalendáře](https://kalendar.beda.cz/kdy-ma-svatek?name=Tobi%C3%A1%C5%A1) a [kalendář jmen](https://jmena.info/svatky/listopad/2/), 2. 11. 2026. Školní kalendář čte stejný `calendar.json`; neudržuje vlastní databázi jmenin.
