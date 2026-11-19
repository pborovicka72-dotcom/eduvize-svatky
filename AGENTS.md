
## Testovací a ostré nasazení

- Nové funkce připravujte ve větvi a přes pull request. Změny v `main` se automaticky nasazují pouze na `https://test.skola.eduvize.cz`.
- Ostrý provoz `https://skola.eduvize.cz` smí přejít pouze na aktuální úspěšně otestované vydání přes workflow `eduvize-styly/.github/workflows/eduvize-production.yml`.
- Schválení prostředí `production` provádí vlastník projektu. AI agent za něj nekliká na Approve and deploy, neobchází schvalování a neposílá přímé změny na produkční server. Příprava testu není schválení ostrého vydání.
- Nikdy nekopírujte produkční data, Microsoft/OneDrive tokeny, SMTP/CRM údaje ani produkční klíče do testu. Test používá samostatné přístupy.
- Nasazujte stejné obrazy a statické soubory ověřené na testu; při publikaci nic znovu nesestavujte. Databázové změny musí být zpětně kompatibilní; destruktivní migrace vyžadují samostatný schválený plán.
- Provozní postup vlastní `eduvize-admin/deployment/README.md`. Historické vývojové odkazy nemusí zůstat kompatibilní; školní data, materiály a konfigurace se zachovávají; nepublikujte přes ně nové funkce mimo schvalovaný proces.

- Dodržujte `../EDUVIZE-OUTPUT-CONTRACT.md`. Integrujte jediný společný generátor a serverový registr, nevytvářejte vlastní resolver. Veřejný kontext nesmí pocházet z relace ani localStorage. Provoz musí být nezávislý na Renderu včetně studeného startu; statický audit není E2E důkaz.
