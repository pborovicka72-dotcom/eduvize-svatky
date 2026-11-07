# Svátky: společný kontrakt v1

AppId `holidays`, licence `app.holidays`, renderer `/eduvize-svatky/published.html`. Adaptér je balíček `eduvize-svatky` v tomto repozitáři, export `eduvize_holidays.output_adapter.get_output_adapters`. Aktivovat jen koordinovaně na testu vedle galerie přes `EDUVIZE_OUTPUT_ADAPTER_MODULES`, nikoli přepsáním celé proměnné nebo změnou produkce.

## Implementace

- Payload v1: country cz/sk, monthFormat text/number, days integer 0..6, tomorrow/holidays/significant/nameDetails boolean. Žádná identita, URL, klíče, previewDate ani libovolné HTML. Neznámá pole a implicitní konverze se odmítají.
- Veřejná identita, oprávnění, licence, aktuální profilový styl, revize, polling a odvolání jsou výhradně ve společném serveru a output-runtime.js. Publikovaná stránka nenačítá legacy output-modes/admin-auth/active-theme/update-runtime/segment-display. Neexistuje Render fallback.
- Režim a geometrie pocházejí ze serverového snapshotu, ne query/localStorage; canonical canvas se proporcionálně přizpůsobí skutečné ploše. Kiosek menu/tiles určuje světlou/tmavou hlavičku. Přidané query parametry nepřepíšou školní kontext, datum ani obsah.
- Při odvolání, chybě oprávnění nebo vypršení ověření runtime skryje obsah; aplikace zastaví vlastní minutový kalendářní časovač a zruší probíhající načítání kalendáře i medailonků.
- Administrace používá output-client.js. Založení, uložení konceptu a publikování jsou explicitní. Kopie/otevření používá pouze GET link. UUID operace a její tělo se uloží před požadavkem, aby opakování po ztracené odpovědi nevytvářelo duplicity. SessionStorage slouží jen rozpracované administrativní operaci, nikdy veřejnému kontextu.
- Dosavadní outputUrl() zůstává jen pro náhled rozpracovaného nastavení ve společném pickeru. Publikované akce jej nepoužívají.

## Ověření

Lokálně prošly 3 původní + 4 nové Python testy a 3 JavaScript sady. Nové testy používají skutečné OutputRegistry/HTTP router jádra z revize eduvize-admin 162cd485, nikoli alternativní aplikační resolver. Testují striktní payload, izolaci, deduplikaci, draft/publish/link, všechny geometrie, restart registry, theme, entitlement i revoke.

Browser integrační skript `tests/published-browser.cjs` vytváří skutečné sestavy a publikace na loopback HTTP harnessu se syntetickými aktéry a SQLite. HTTP ověří redirect `/o`, potom otevře jeho cíl v izolovaném browser contextu na virtuálním test originu směrovaném do loopbacku. Služba na vzdálené test doméně není tímto testována. Veřejné API odpovědi, licence ani snapshoty se nemockují; jediný testovací boundary je syntetické ověření identity a izolovaný lokální datastore. Browser všechny vnější požadavky odmítá, takže blokuje i Render a Wikimedia. Čte místní kalendář a dostupný vestavěný medailonek Huberta.

Čtyři prezentace: web, panoramatický NSP, kiosek portrait menu, kiosek landscape tiles. Ověřeno skutečné jméno, neovlivnění cizím lokálním profilem, nepublikovaný koncept, stabilní odkaz, změna stylu při obnově, skrytí obsahu po revoke, absence JS výjimek a Render požadavků. Ve web případu se navíc otevře druhá škola/slovenský profil, jehož styl se změnou prvního profilu nezmění. Důkazy: `audit/published-browser-results.json`; PNG se generují skriptem a v CI jsou artefaktem.

## Vzdálený test — dosud neověřeno

Vyžaduje koordinované test-only balení adaptéru do administračního obrazu, jeho aktivaci, záznam konkrétního release/image digest a izolované školní sessions, dva profily a entitlement app.holidays. Následuje skutečná administrace → koncept → publikace → nepřihlášený resolver → aktualizace stylu → revoke, obě orientace/režimy a serverová Render blokáda se studeným startem. Nedoplňovat tajné údaje do reportů ani Gitu.

Koordinace probíhá s vláknem Hlavní strategie a workflow. Během zmrazeného okna galerie neprovádět main merge ani přestavbu testu. Produkce zůstává mimo rozsah změn. Lokální test ani úspěšné CI nepotvrzují vzdálené nasazení nebo úplný OAuth průchod.

Samostatný `publication-admin-browser.cjs` prošel skutečným formulářem administrace: explicitní založení konceptu, pokus o kopírování nepublikovaného výstupu bez zápisu, publikace, změna formuláře, kopírování poslední publikace bez zápisu a explicitní uložení konceptu. Používá syntetickou autentizační fasádu a společné skripty s existujícím single-host přepisem; není to důkaz skutečného přihlášení. Výsledek v `audit/publication-admin-results.json`.

## CI a přístup ke společnému jádru

Běh GitHub Actions 42215712593 skončil na checkout soukromého eduvize-admin (Repository not found pro GITHUB_TOKEN veřejného repo). Veřejné CI proto spouští pouze vlastní kalendářní/regresní a payload testy. API a browser integrační testy zůstávají povinné v prostředí soukromého backendu; nebyly potichu označeny za CI úspěch. Jádro se nevendorizuje do veřejného repozitáře a nepřidává se žádný trvalý přístupový token.

Lokální integrační příkaz: nastavte PYTHONPATH na tento repozitář a připnuté jádro admin, spusťte python -m unittest discover -s tests -p test_*.py. Loopback harness se spouští python -m uvicorn output_test_server:app --host 127.0.0.1 --port 8794 (PYTHONPATH musí zahrnout také adresář tests) s HOLIDAYS_TEST_STYLES cestou k připnutému shared klientovi. Browser skripty očekávají nadřazený workspace, port 8794 a instalovaný playwright. Syntetické sessions/harness nikdy nenasazovat na veřejnou doménu.

Vzdálená nezapisující kontrola 6. 11.: /api/v1/outputs/schema HTTP200, /eduvize-svatky/published.html HTTP404. Svátky tedy ještě nejsou nasazené; žádný vzdálený E2E nebyl prohlášen za úspěšný.

## Navazující ověření 6. 11. — obnovení po výpadku

Při novém požadavku na vzdálené nasazení koordinace potvrdila, že okno není uvolněné: serverová změna root-owned pilotních source pins vyžaduje dostupné sudo. Fronta je inventura → login CSS → společný runtime a gallery/transport regrese → Počasí → Svátky. Nejde o zákaz autorizované práce, ale o koordinované pořadí; žádný blind rerun/main merge ani produkční změna nebyly provedeny. Renderer na testu nadále HTTP404.

Svátky byly nově ověřeny proti immutable opravě společného runtime styles PR11 / 7ac201ecd34c03366a98fa462f09f3812c0a4afb. Čtyři browser prezentace prošly; web scénář navíc vložil krátké 503 při snapshot pollu a ověřil obnovení kalendářního načítání při stejné publikované revizi. Produkční renderer nebyl kvůli této chybě upravován workaroundem. Důkaz obsahuje source SHA a transientRecovery=true. Shared PR11 není tímto testem sloučený ani nasazený.

Nástroj tools/verify_remote_test.cjs je připraven pro skutečný test-only průchod: používá dvě již existující školní fixtures (nevytváří profily), autentizuje skutečnou relaci administrace, ověřuje koncept/publikaci/read-only kopii, sedm geometrických variant, cizí školu, profilový styl s obnovou a revoke. Vyžaduje privátní fixtures soubor s právy600, stav operací a přesný release ID. První fixture musí obsahovat serverem potvrzený profileThemeId, aby dočasná změna stylu zachovala přesnou původní vazbu. Tokeny ani hlavičky do reportu nevypisuje. Zatím nebyl spuštěn proti vzdálenému testu; předpokládá koordinované aktivování adaptéru, serverovou blokádu Renderu a ověření studeného startu mimo browser.

Přímý SSH privilege check z tohoto aplikačního chatu skončil na chybě ověření host key. Kontrola nebyla vypnuta a žádný nový klíč nebyl automaticky přijat; serverová koordinace zůstává vlastníkem přístupu a testovací aktivace.
