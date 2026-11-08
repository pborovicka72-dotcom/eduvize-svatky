# Svátky — ověření běžných výstupů V2 na TEST

Zdrojové zapojení: deployment/RENDERER-HANDOFF.md a renderer-allowlist.json. Atomicky vyměnit adminBridgeFiles a odstranit publication-admin.js; žádný starý technický panel/handler současně s V2. Server jediný executor. Produkci neměnit.

Nutné sdílené verze: frozen V2 actions48bd6c1e/clientef4ce854 + existing guarded GET output-slots API; native readeraaed6374 je přesně přibalený app asset; kiosk setter93a1b157 se aplikuje jako reviewed hunk k aktuálnímu nsp-segments. Zachovat současné core, entitlement a profilové bezpečnostní kontroly. Package a adapter env append při build, ostatní apps zachovat.

Před vzdálenou akceptací potvrdit current TEST release/image/hash/CAS a approved public-output gate policy. Login gate se neobchází. Použít existující nezbytné školní fixtures a ověřit vazby; žádné automatické vytváření/mazání profilů. Soukromý fixtures soubor mode600, nikdy do Git/logů. HOLIDAYS_TEST_GATE_RELEASED=1 pouze potvrzuje dříve schválenou politiku, bránu neodemyká.

tools/verify_remote_test.cjs má aktuální běžný UI průchod: původní uložený profil → Uložit do Eduvize bez registry write → Generate/Update → read-only Copy → anonymní skutečný renderer → stejný URL po Update → fresh-browser Copy/Open GET-only → cizí škola/anonymous private API denied. Nespouští technical panels, first-of-many resolver, ani demo/default publication. Přesné release a report path povinné. Ve zdroji tento vzdálený test nebyl spuštěn.

Dále skutečně porovnat layout s původním UI, pořadí používaných tlačítek, dnešek fullwidth a multi-day rozvržení; uloženou plnou Presentation web/NSP/kiosk obě orientace, kiosk reload zachová viewport; render matici, style polling/izolaci, revoke/clear a krátký výpadek stejné revize. Serverová blokáda Renderu a cold start vyžadují samostatný infra důkaz. Lokální syntetické testy ani zelené veřejné CI nejsou tímto důkazem.
