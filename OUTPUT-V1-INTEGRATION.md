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
