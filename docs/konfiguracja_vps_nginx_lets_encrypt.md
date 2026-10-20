# Konfiguracja VPS Ubuntu, domeny i Nginx --- notatki do dokumentacji

> **Status na 20 października 2026 r.**\
> Dokument opisuje czynności wykonane i ustalenia z konfiguracji VPS-a
> OVHcloud dla domeny `co-zagrac.pl`. Nie wszystkie etapy zostały
> zakończone. W szczególności w rozmowie nie potwierdzono, że certyfikat
> Let's Encrypt został pomyślnie wystawiony.

## 1. Cel

Przygotowanie VPS-a z Ubuntu do późniejszego wdrożenia aplikacji
dostępnej pod domeną `co-zagrac.pl`, z serwerem Nginx i szyfrowaniem
HTTPS przez certyfikat Let's Encrypt.

Na tym etapie nie wdrażamy aplikacji i nie tworzymy docelowej strony
WWW. Konfiguracja ma być przygotowana ostrożnie, bez nadpisywania
istniejących ustawień.

## 2. Domena i DNS

-   Domena: `co-zagrac.pl`
-   Rejestrator / panel zarządzania domeną: cyber_Folks.
-   Serwery nazw (NS) widoczne w zapytaniu DNS:
    -   `dns1.tld.pl`
    -   `dns2.tld.pl`
    -   `dns3.tld.pl`
-   Początkowo rekord A domeny wskazywał na `91.198.146.229`, czyli
    adres inny niż IP VPS-a OVH.
-   W panelu cyber_Folks rekord A był początkowo wyszarzony i nie można
    go było edytować, ponieważ domena była zaparkowana / rekord był
    zarządzany przez inną funkcję panelu.
-   Udało się następnie dodać lub zmienić rekord A na publiczny adres
    IPv4 VPS-a OVH.
-   Po zmianie dwa publiczne resolvery --- `1.1.1.1` i `8.8.8.8` ---
    zwracały już nowe IP. Zwykłe zapytanie DNS mogło jeszcze przez
    pewien czas zwracać starą odpowiedź z cache.

### Weryfikacja DNS

``` bash
dig +short co-zagrac.pl A
dig NS co-zagrac.pl +short
dig @1.1.1.1 co-zagrac.pl A +short
dig @8.8.8.8 co-zagrac.pl A +short
```

Adres zwracany przez rekord A należy porównać z publicznym IPv4 VPS-a.
Na VPS-ie można sprawdzić publiczny adres wyjściowy poleceniem:

``` bash
curl -4 https://icanhazip.com
```

Uwaga: `curl` pokazuje publiczny adres, z którego serwer wychodzi do
Internetu. W razie konfiguracji NAT lub dodatkowych adresów należy
porównać go z adresem przypisanym do VPS-a w panelu OVHcloud.

Nie zmieniano serwerów nazw na inne. Rekordy NS, SOA i TXT
`ownercheck.co-zagrac.pl` pozostawiono bez zmian. Nie należy usuwać
rekordów pocztowych ani weryfikacyjnych bez sprawdzenia, do czego służą.

## 3. Serwer VPS i system

-   Dostawca VPS: OVHcloud.
-   System: Ubuntu Server.
-   Użytkownik powłoki widoczny w terminalu: `ubuntu`.
-   Nazwa hosta widoczna w terminalu: `vps-37baf1c7`.

Połączenie z serwerem wykonywano z Windows przez SSH, w postaci:

``` powershell
ssh ubuntu@ADRES_IP_VPS
```

Należy użyć rzeczywistego adresu IP VPS-a. Nie umieszczono go w tym
dokumencie.

## 4. Stan Nginx

Nginx był zainstalowany i uruchomiony przed rozpoczęciem konfiguracji
certyfikatu.

Wykonane sprawdzenia:

``` bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo ss -ltnp | grep -E ':(80|443)\b'
```

Wyniki zaobserwowane w terminalu:

-   `nginx -t` zwrócił:
    -   `syntax is ok`
    -   `test is successful`
-   Usługa `nginx.service` miała status `active (running)`.
-   Nginx nasłuchiwał na porcie 80 dla IPv4 (`0.0.0.0:80`) oraz IPv6
    (`[::]:80`).
-   W pokazanym wyniku nie było nasłuchującej usługi na porcie 443.
    Oznacza to, że HTTPS nie był jeszcze aktywny w chwili wykonania
    sprawdzenia.

### Aktywne konfiguracje Nginx

Polecenie:

``` bash
ls -la /etc/nginx/sites-enabled/
```

wykazało tylko dowiązanie:

``` text
default -> /etc/nginx/sites-available/default
```

Polecenie:

``` bash
sudo grep -R "server_name" /etc/nginx/sites-enabled/
```

wykazało w konfiguracji domyślnej:

``` nginx
server_name _;
# server_name example.com;
```

Wniosek: w chwili sprawdzania nie było osobnego bloku `server`
przypisanego do `co-zagrac.pl`. Nie utworzono jeszcze konfiguracji
wirtualnego hosta dla tej domeny i nie wdrożono aplikacji.

## 5. Firewall

W toku przygotowań wskazano, że należy sprawdzić firewall systemowy i
ewentualny firewall w panelu OVHcloud. Nie ma w zapisanych wynikach
potwierdzenia aktualnego stanu UFW ani reguł firewalla OVHcloud.

Sprawdzenie UFW:

``` bash
sudo ufw status
```

Przed włączeniem UFW należy najpierw dopuścić sposób administracyjnego
połączenia SSH, aby nie odciąć sobie dostępu. Dla typowej konfiguracji
HTTP/HTTPS wymagane są porty TCP 80 i 443, a dla administracji również
port SSH (zwykle TCP 22). Reguły w firewallu OVHcloud muszą być zgodne z
konfiguracją systemową.

Nie należy zakładać, że firewall jest prawidłowo skonfigurowany bez
sprawdzenia jego reguł.

## 6. Certbot i Let's Encrypt --- stan

Wykonano:

``` bash
certbot --version
snap list certbot
```

Wyniki pokazały, że Certbot nie był zainstalowany:

``` text
Command 'certbot' not found
error: no matching snaps installed
```

W związku z tym certyfikat nie został jeszcze potwierdzony jako
wystawiony.

### Proponowana instalacja Certbota

Dla Ubuntu można zainstalować Certbota przez Snap:

``` bash
sudo snap install certbot --classic
```

Następnie sprawdzić:

``` bash
sudo certbot --version
```

### Ważna decyzja przed wystawieniem certyfikatu

W rozmowie rozważano dwie metody weryfikacji domeny:

-   **HTTP-01** --- wymaga, aby Let's Encrypt mógł dotrzeć do domeny
    przez port 80. Można użyć wtyczki Nginx, ale należy uwzględnić
    istniejącą konfigurację.
-   **DNS-01** --- wymaga dodania rekordu TXT w aktywnej strefie DNS.
    Nie wymaga działającej strony ani otwartego portu 80, ale ręczna
    weryfikacja nie zapewnia bezobsługowego odnawiania. Do
    automatycznego odnowienia potrzebna jest integracja z API dostawcy
    DNS lub inny automatyczny mechanizm.

Ponieważ Nginx ma tylko konfigurację `default` i nie ma jeszcze
konfiguracji domeny, nie należy bez sprawdzenia uruchamiać komendy,
która modyfikuje konfigurację Nginx.

Przykładowe polecenie, które może wystawić certyfikat i skonfigurować
Nginx automatycznie:

``` bash
sudo certbot --nginx -d co-zagrac.pl
```

Polecenie powyżej nie zostało potwierdzone jako wykonane. Opcja
`--nginx` może zmodyfikować konfigurację Nginx, dlatego przed użyciem
należy zdecydować, czy taka zmiana jest już pożądana.

Polecenie:

``` bash
sudo certbot certonly --nginx -d co-zagrac.pl
```

prosi o uzyskanie certyfikatu bez końcowej automatycznej instalacji
konfiguracji HTTPS przez Certbota, ale wtyczka Nginx nadal może
tymczasowo wykorzystywać konfigurację serwera do weryfikacji. Nie należy
zakładać, że polecenie zadziała bez konfiguracji domeny --- w razie
błędu należy przeanalizować komunikat.

## 7. Docelowe pliki certyfikatu

Po pomyślnym wystawieniu certyfikatu przez Certbota typowe ścieżki to:

``` text
/etc/letsencrypt/live/co-zagrac.pl/fullchain.pem
/etc/letsencrypt/live/co-zagrac.pl/privkey.pem
```

`fullchain.pem` zawiera certyfikat i wymagany łańcuch, a `privkey.pem`
jest kluczem prywatnym. Klucza prywatnego nie należy publikować ani
umieszczać w repozytorium kodu.

## 8. Automatyczne odnawianie

Po instalacji Certbota trzeba zweryfikować, czy mechanizm automatycznego
odnawiania jest aktywny. Dla instalacji Snap można sprawdzić:

``` bash
systemctl status snap.certbot.renew.timer --no-pager
```

Test odnowienia:

``` bash
sudo certbot renew --dry-run
```

Test `--dry-run` sprawdza procedurę odnowienia bez zastępowania
produkcyjnego certyfikatu. Należy go wykonać dopiero po poprawnym
wystawieniu certyfikatu i skonfigurowaniu metody weryfikacji.

Jeśli certyfikat zostanie użyty w Nginx, należy upewnić się, że po
odnowieniu Nginx przeładuje nowy certyfikat. Przy konfiguracji
obsługiwanej przez wtyczkę Nginx Certbota mechanizm ten jest zwykle
obsługiwany automatycznie; przy niestandardowym wdrożeniu należy to
zweryfikować.

## 9. Przyszła konfiguracja Nginx

Nie utworzono jeszcze docelowego bloku `server` dla `co-zagrac.pl`,
ponieważ aplikacja będzie wdrażana później.

W przyszłości konfiguracja może być umieszczona w pliku:

``` text
/etc/nginx/sites-available/co-zagrac.pl
```

a następnie aktywowana przez dowiązanie w:

``` text
/etc/nginx/sites-enabled/co-zagrac.pl
```

Po utworzeniu lub zmianie konfiguracji należy wykonać:

``` bash
sudo nginx -t
sudo systemctl reload nginx
```

Dokładny blok `server` zależy od sposobu wdrożenia aplikacji: -
statyczne pliki WWW --- dyrektywa `root`; - aplikacja backendowa ---
reverse proxy przez `proxy_pass` do lokalnego portu aplikacji; - osobne
subdomeny --- osobne wartości `server_name` i odpowiednie rekordy DNS.

Nie dodano jeszcze przykładowego bloku produkcyjnego, aby nie zakładać
nieznanego sposobu wdrożenia.

## 10. Lista kontrolna dalszych działań

-   [x] Sprawdzono, że Nginx jest zainstalowany i działa.
-   [x] Sprawdzono poprawność składni konfiguracji Nginx.
-   [x] Ustalono, że w `sites-enabled` znajduje się tylko konfiguracja
    `default`.
-   [x] Ustalono, że Nginx nasłuchuje na porcie 80.
-   [x] Ustalono, że Certbot nie był zainstalowany w momencie
    sprawdzania.
-   [x] Zmieniono rekord A domeny tak, aby wskazywał na IP VPS-a;
    publiczne resolvery `1.1.1.1` i `8.8.8.8` zwracały nowe IP.
-   [ ] Potwierdzić, że rekord A zwraca IP VPS-a z używanego resolvera.
-   [ ] Sprawdzić reguły firewalla UFW i OVHcloud.
-   [ ] Zainstalować Certbota.
-   [ ] Wybrać metodę walidacji domeny i wystawić certyfikat.
-   [ ] Skonfigurować i przetestować automatyczne odnawianie.
-   [ ] Przy wdrożeniu aplikacji utworzyć docelową konfigurację Nginx
    dla domeny i HTTPS.
-   [ ] Po wdrożeniu sprawdzić działanie HTTPS z zewnątrz.

## 11. Uwagi do dokumentacji pracy inżynierskiej

Ten plik jest notatką techniczną na podstawie wykonanych czynności i
zebranych wyników terminala. Przed wykorzystaniem w pracy inżynierskiej
należy uzupełnić: - dokładną wersję Ubuntu (`lsb_release -a`); - wersję
Nginx (`nginx -v`); - publiczny adres IP lub jego zamaskowaną postać,
zależnie od wymagań publikacji; - faktyczny wynik instalacji Certbota i
wystawienia certyfikatu; - sposób konfiguracji firewalla; - wynik testu
odnowienia; - docelowy schemat wdrożenia aplikacji.

Nie należy opisywać certyfikatu jako działającego ani automatycznego
odnowienia jako przetestowanego, dopóki odpowiednie polecenia nie
zakończą się powodzeniem.
