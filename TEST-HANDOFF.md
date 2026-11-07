# Svátky — předání po uvolnění brány

Stav: lokální příprava; žádné nasazení, merge ani změna serveru. Stávající ovládací prvky a jejich rozmístění se v této etapě nemění.

## Podmínky vzdáleného ověření

- Serverový vlastník výslovně uvolní přístupovou politiku a přidělí testovací okno. Současný login gate se neobchází; redirect na přihlášení není aplikační regrese.
- Potvrdit přesné zdrojové revize, test-only image digest, lokální entitlement app.holidays a balení adaptéru vedle ostatních aplikací.
- Použít existující nezbytné školní fixtures, ověřit jejich vazby. Žádné automatické vytváření nebo mazání profilů.
- Soukromý vstup fixtures musí mít práva600. Obsahuje školní sessions a serverem potvrzený explicitní profileThemeId pro bezpečnou obnovu stylu; nesmí do Git ani logů.
- Teprve potom nastavit HOLIDAYS_TEST_GATE_RELEASED=1 a spustit tools/verify_remote_test.cjs se stanoveným release ID. Tato proměnná bránu neodemyká a není souhlasem s výjimkou v zabezpečení.

## Akceptace

Skutečná administrace → koncept → publikace → read-only kopie → resolver dle schválené gate policy; dvě školy/profily; web, NSP a kiosek v obou orientacích; aktuální kalendář a medailonky; profilový styl a jeho obnova; revoke/clear; krátký výpadek a obnova stejné revize. Porovnat pořadí a seskupení používaných ovládacích prvků s výchozím UI.

Serverová blokáda Renderu a cold start vyžadují samostatný důkaz od vlastníka infrastruktury. Lokální browser testy nejsou důkazem vzdálené akceptace. Historické důkazy platí jen pro uvedené revize a tehdejší přístupovou politiku. Produkční aplikace ani přístupová politika se tímto úkolem nemění.

## CI

Veřejné CI spouští vlastní kalendářní/payload regrese a kontrolu syntaxe klienta a akceptačních nástrojů. Integrační API/browser sady vyžadují oprávněný přístup k soukromému jádru a připnuté zdroje; soukromé jádro se do veřejného repo nekopíruje.
