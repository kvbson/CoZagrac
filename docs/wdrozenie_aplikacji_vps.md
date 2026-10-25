# Wdrożenie aplikacji CoZagrac na VPS — plan krok po kroku

> **Status: 25 października 2026 (aktualizacja 3).** Docker instalowany z repo
> Ubuntu (§3, nie z repo Docker Inc.). W kodzie od ostatniej aktualizacji:
> `POST /user/me/embedding` jest asynchroniczne (202 + `GET /embedding/status`),
> działa `GET /api/game/search` (FTS na `search_vector`) — smoke-testy §6 to
> uwzględniają. Plan operacyjny, kontynuacja
> `konfiguracja_vps_nginx_lets_encrypt.md`. Uzgodnione decyzje: edge = **systemowy
> nginx na hoście** (Opcja A), **jeden użytkownik bazodanowy** `app_user`
> (wariant 1 grantów), **źródło deploya: branch `dev`**, domena
> `https://co-zagrac.pl`, baza produkcyjna **`co_zagrac_db_prod`**,
> **baza dev i prod w tej samej instancji PostgreSQL na VPS** (dostęp przez
> pgAdmin), **migracja danych katalogu z embeddingami przez pgAdmin**
> (postgres_fdw), dane użytkowników na prod startują pusto.

## 1. Architektura docelowa

```
Internet ──443/80──> host nginx (Ubuntu, certbot Let's Encrypt)
                       ├─ location /     → http://127.0.0.1:8081   (kontener frontend: nginx+SPA)
                       └─ location /api  → http://127.0.0.1:3001   (kontener backend: Express)
kontenery (docker compose, porty tylko na 127.0.0.1)
  backend ──TCP 5432──> host.docker.internal → PostgreSQL (host): dev + co_zagrac_db_prod
```

| Komponent | Bind | Uwagi |
|---|---|---|
| host nginx | `0.0.0.0:80,443` | jedyny publiczny wejściowy (poza SSH) |
| kontener frontend | `127.0.0.1:8081` | statyki SPA + `try_files` (plik `nginx/frontend.conf`) |
| kontener backend | `127.0.0.1:3001` | `trust proxy` w expressie ustawione |
| PostgreSQL (host) | `*` (publicznie nieosiągalny) | dopuszcza tylko `pg_hba` (sieci dockera, `app_user`); 5432 bez reguły w ufw/OVH — patrz §4.3 |

## 2. Stan po inwentarzu

- [x] Domena `co-zagrac.pl` → IP VPS-a (potwierdzone `dig`)
- [x] Firewall: porty otwarte
- [x] PostgreSQL na hoście z pgvector (wersja potwierdzona)
- [x] Baza dev istnieje na VPS (nazwa `<dev_db>` — uzupelnić), połączenia w pgAdmin
- [x] Certyfikat Let's Encrypt `co-zagrac.pl` WYSTAWIONY (certbot plugin nginx;
      konfiguracja obecnie w `sites-available/default` — do przeniesienia §7)
- [ ] **Docker** — instalacja z repo Ubuntu (`docker.io` + `docker-compose-v2`, §3);
      do potwierdzenia `docker compose version` i hello-world
- [ ] pg_hba dla sieci dockera (§4.3)
- [ ] Baza prod `co_zagrac_db_prod` → Faza 2

## 3. Faza 1 — instalacja Dockera na Ubuntu (SSH, sudo)

Metoda: repo Ubuntu (decyzja 21.10) — `docker.io` to ten sam Docker Engine,
pakowany przez Ubuntu; nasz compose używa tylko podstawowych funkcji, więc
świeżość z repo Docker Inc. nie jest potrzebna (mniej ruchomych części).

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu     # potem WYLOGUJ i zaloguj SSH (grupa docker)
docker --version && docker compose version
docker run --rm hello-world
```

## 4. Faza 2 — baza prod przez pgAdmin (Query Tool)

### 4.1 Utworzenie bazy
W Query Tool na bazie **`postgres`** (nie na docelowej!):
```sql
CREATE DATABASE co_zagrac_db_prod;
```
Następnie **połącz się z `co_zagrac_db_prod`** — wszystkie poniższe kroki
wykonuj w Query Tool na tym połączeniu (pliki: `apps/backend/src/db/scripts/`).

### 4.2 Skrypty bootstrapu (kolejność, każdy osobno: Otwórz plik → Execute)
1. `extensions.sql` (superuser — wymagane do `CREATE EXTENSION`)
2. `bootstrap_schema.sql` (18 tabel, FK, indeksy; atomowy)
3. `post_migrate.sql` (funkcja + trigger `search_vector`; idempotentny)
4. `grants.sql` — **przed odpaleniem podmień `CHANGE_ME`** na wygenerowane
   hasło (np. `openssl rand -base64 24` na VPS). Zapisz hasło (menedżer haseł)
   — potrzebne do `.env` w Fazie 4. Nie commituj hasła do pliku w repo!
5. `verify.sql` — przejrzyj sekcje 1–13 wg oczekiwań w nagłówkach. Uwaga:
   sekcja 10 (grants `app_user`) i 11 (`users_email_key`) muszą wyjść zielono.

### 4.3 Sieć: dostęp kontenerów do PG
Edycja plików na hoście (SSH/sudo):
- `postgresql.conf`: `listen_addresses = '*'` — **nie** wpisuj samej bramy
  `172.17.0.1`: `docker compose` tworzy własną sieć bridge z bramą z kolejnego
  podzakresu (172.18/172.19...), i połączenie z kontenera padnie. `*` jest
  bezpieczne, bo 5432 i tak nie jest publikowane (brak reguły w ufw/panelu OVH),
  a dopuszcza tylko reguła `pg_hba` poniżej;
- `pg_hba.conf`: `host co_zagrac_db_prod app_user 172.16.0.0/12 scram-sha-256`
  (zakres 172.16–172.31 obejmuje domyślne podsieci dockera; jeśli sieci wyjdą
  spoza niego — dopisz konkretną podsieć z `docker network inspect`);
- restart: `sudo systemctl restart postgresql`.

## 5. Faza 3 — migracja danych katalogu (pgAdmin, postgres_fdw)

Obie bazy są w jednej instancji, więc przenosimy dane **SQL-em**, z
uruchomionego na `co_zagrac_db_prod` Query Tool. Zakres: `genres,
categories, tags, game_info, game_genres, game_categories, game_screenshots,
game_movies, game_publishers, game_reviews, game_embeddings`.
**Nie przenosimy:** `users, user_providers, sessions, user_embeddings,
user_*` (start pusty; profil embeddingu użytkownika buduje asynchroniczne
`POST /user/me/embedding` — status przez `GET /embedding/status`).

### 5.0 Rozmiar przed decyzją (Query Tool na dev):
```sql
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
```
Przy kilkunastu mln wierszy `game_reviews` czas liczyć w minutach–kilkunastu
minutach (fdw batchuje); gdyby było za wolne — wariant awaryjny §5.4.

### 5.1 Mostek (Query Tool na `co_zagrac_db_prod`, jako superuser):
```sql
CREATE EXTENSION IF NOT EXISTS postgres_fdw;
CREATE SERVER dev_srv FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host '127.0.0.1', port '5432', dbname '<dev_db>');
CREATE USER MAPPING FOR CURRENT_USER SERVER dev_srv
  OPTIONS (user '<użytkownik_dev>', password '<hasło_dev>', batch_size '50000');
CREATE SCHEMA dev_foreign;
IMPORT FOREIGN SCHEMA public LIMIT TO (
  genres, categories, tags, game_info, game_genres, game_categories,
  game_screenshots, game_movies, game_publishers, game_reviews, game_embeddings
) FROM SERVER dev_srv INTO dev_foreign;
```

### 5.2 Przesunięcie danych (ta sama baza, transakcja = atomowo):
```sql
BEGIN;
INSERT INTO genres          SELECT * FROM dev_foreign.genres;
INSERT INTO categories      SELECT * FROM dev_foreign.categories;
INSERT INTO tags            SELECT * FROM dev_foreign.tags;
INSERT INTO game_info       SELECT * FROM dev_foreign.game_info;
INSERT INTO game_genres     SELECT * FROM dev_foreign.game_genres;
INSERT INTO game_categories SELECT * FROM dev_foreign.game_categories;
INSERT INTO game_screenshots SELECT * FROM dev_foreign.game_screenshots;
INSERT INTO game_movies     SELECT * FROM dev_foreign.game_movies;
INSERT INTO game_publishers SELECT * FROM dev_foreign.game_publishers;
INSERT INTO game_reviews    SELECT * FROM dev_foreign.game_reviews;
INSERT INTO game_embeddings SELECT * FROM dev_foreign.game_embeddings;
COMMIT;
```
Kolejność = zależności FK (najpierw słowniki i `game_info`). `SELECT *` jest
bezpieczne, bo `bootstrap_schema.sql` odtwarza kolejność kolumn deva (był
pisany ze zrzutu katalogu dev) — gdyby dev kiedyś zmienił kolejność, podaj
jawne listy kolumn. Trigger `search_vector` przeliczy się przy INSERT
(wynik identyczny). Błąd w połowie = ROLLBACK całości, baza czysta do ponowienia.

### 5.3 Weryfikacja i sprzątanie mostka:
```sql
-- porównaj liczby po obu stronach (dev i prod, ta sama kwerenda):
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;
-- próbkowo: SELECT count(*) FROM game_embeddings;  oraz SELECT count(DISTINCT steam_appid) FROM game_info;

DROP SCHEMA dev_foreign CASCADE;
DROP USER MAPPING FOR CURRENT_USER SERVER dev_srv;
DROP SERVER dev_srv;      -- CASCADE nie było potrzebne po usunięciu schematu
```

### 5.4 Wariant awaryjny (gdy fdw za wolny) — i tak bez scp, bo bazy na jednej maszynie:
```bash
pg_dump -U postgres <dev_db> --data-only -Fc \
  --table=genres --table=categories --table=tags --table=game_info \
  --table=game_genres --table=game_categories --table=game_screenshots \
  --table=game_movies --table=game_publishers --table=game_reviews \
  --table=game_embeddings -f /tmp/seed_catalog.dump
pg_restore -U postgres -d co_zagrac_db_prod --data-only --single-transaction /tmp/seed_catalog.dump
```
(Uwaga: devowa `game_embeddings` może mieć starsze wersje embeddingów —
na prod i tak liczy się `ACTIVE_EMBEDDING_VERSION`; oba przechodzą.)

## 6. Faza 4 — repo i pierwszy deploy (ręcznie, przez SSH)

Zmiany repo **już wykonane** (faza 3 z planu pierwotnego): compose bez nginx,
porty na 127.0.0.1, `nginx/co-zagrac.pl.conf`, `scripts/deploy.sh`,
`.github/workflows/deploy.yml`, README.

```bash
sudo mkdir -p /opt/cozagrac && sudo chown ubuntu:ubuntu /opt/cozagrac
git clone -b dev https://github.com/kvbson/CoZagrac /opt/cozagrac
# apps/backend/.env (chmod 600):
#   NODE_ENV=production
#   PORT=3001
#   DATABASE_URL=postgresql://app_user:<HASLO>@host.docker.internal:5432/co_zagrac_db_prod
#   DB_SSL=disable
#   SESSION_SECRET=<openssl rand -hex 32>
#   OPENAI_API_KEY / STEAM_API_KEY  (klucze produkcyjne)
#   FRONTEND_URL=https://co-zagrac.pl
cd /opt/cozagrac && docker compose up -d --build
curl -fsS http://127.0.0.1:3001/api/health && echo OK
docker compose ps      # dwoje: healthy
# FTS (dowód, że trigger search_vector + GIN działają po Fazie 3):
curl -s 'http://127.0.0.1:3001/api/game/search?q=zelda&limit=3'
```

## 7. Faza 5 — TLS na nowym vhoście (certyfikat JUŻ ISTNIEJE)

Stan zastany: certyfikat `/etc/letsencrypt/live/co-zagrac.pl/` wystawiony, a
certbot (plugin nginx) wpiął 443 + redirect do `sites-available/default`
(bloki „managed by Certbot"). Zadanie: przenieść vhost na nasz plik BEZ
utraty certyfikatu i odnawiania. Kolejność: po Fazie 4 (wtedy testy od razu
na działającą aplikację).

### 7.1 Plik vhosta + aktywacja
```bash
sudo cp /opt/cozagrac/nginx/co-zagrac.pl.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/co-zagrac.pl.conf /etc/nginx/sites-enabled/co-zagrac.pl.conf
```

### 7.2 Porządki w `default` (KLUCZOWE)
`sudo nano /etc/nginx/sites-available/default` — usunąć z końcówki pliku DWA
ostatnie bloki `server { ... }` z `server_name co-zagrac.pl` (443 „managed by
Certbot" oraz redirect-owy 80 z `return 404`). Zostawić pierwszy blok
`default_server` (catch-all dla ruchu po IP). Bez tego dwa vhostry tej samej
domeny na 443 — nginx wybierze pierwszy i ruch pójdzie na `/var/www/html`.

### 7.3 Przeładowanie i reinstalacja certyfikatu
```bash
certbot --version                      # certbot jest już na hoście (wystawił cert)
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d co-zagrac.pl   # przy istniejącym certem: wybrać "Reinstall"
```
Certbot dopisze `listen 443 ssl`, ścieżki certyfikatu i redirect do NASZEGO
pliku; stan odnawiania (`/etc/letsencrypt/renewal/co-zagrac.pl.conf`, wtyczka
nginx) sam zacznie zarządzać nowym vhostem. NIE wystawiać nowego certyfikatu.

### 7.4 Weryfikacja
```bash
sudo certbot certificates          # domena + ważność
sudo certbot renew --dry-run       # odnawianie na nowym vhoście
systemctl list-timers | grep -i certbot
curl -I  http://co-zagrac.pl       # 301 → https
curl -I https://co-zagrac.pl       # 200 (frontend) po Fazie 4; 502 przed nią = normalne
```

### 7.5 Panel Steam (klucz Web API)
Domain `co-zagrac.pl`, Callback `https://co-zagrac.pl/api/auth/steam/callback`
→ test logowania Steam i pierwszej rekomendacji.

## 8. Faza 6 — automatyzacja GitHub Actions (sekrety KIEDY? GDZIE? JAK?)

### 8.1 Klucz SSH deploy (Git Bash na Windows):
```bash
ssh-keygen -t ed25519 -C "cozagrac-deploy" -f ~/.ssh/cozagrac_deploy
# na VPS (jako ubuntu):
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo '<treść cozagrac_deploy.pub>' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 8.2 Sekrety w GitHub — lokalizacja
Repo → zakładka **Settings** → lewy sidebar **Secrets and variables → Actions**
→ sekcja **Repository secrets** → **New repository secret** (nazwa = klucz,
wartość = dane; sekrety są maskowane w logach i NIEODWRACALNE — po zapisie
nie da się ich podejrzeć, tylko nadpisać):

| Nazwa | Wartość |
|---|---|
| `DEPLOY_HOST` | IP VPS-a (albo `co-zagrac.pl`) |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | **cała zawartość pliku** `~/.ssh/cozagrac_deploy` (private), łącznie z `-----BEGIN/END OPENSSH PRIVATE KEY-----` |

Opcjonalnie (polecane do pracy inż.): **Settings → Environments → New
environment** o nazwie **`production`** (musi zgadzać się z `environment:`
w workflow) → *Protection rules → Required reviewers* = Ty — każdy deploy
czeka wtedy na ręczne zatwierdzenie w zakładce Actions (ładnie wygląda
w dokumentacji procesu).

### 8.3 Test obiegu: pusty commit → Actions → verify (build/lint/test) →
(ew. approval) → deploy → `curl https://co-zagrac.pl/api/health`.

## 9. Operatyka

- **Rollback:** `git -C /opt/cozagrac reset --hard <poprzedni-commit> && docker compose up -d --build`; logi `docker compose logs --tail=100 backend`
- **Aktualizacja katalogu na prod** (na co dzień, nie pełny seed):
  `docker compose exec backend node dist/src/functions/sync/<skrypt>.js`
- **Backup proda (cron):** `pg_dump -Fc co_zagrac_db_prod` z retencją
- **Zasada migracji:** deploy NIE dotyka bazy; schemat = skrypt + `verify.sql` ręcznie
- **Znane TBD:** cron synchronizacji katalogu (P2), monitoring/up-time (P2)

## 10. Ryzyka i otwarte punkty

- nazwa bazy dev `<dev_db>` i użytkownik/hasło dev do user mapingu — uzupełnić §5.1
- rozmiar `game_reviews` (§5.0) decyduje o metodzie (fdw vs §5.4)
- edytę `pg_hba`/`listen_addresses` robimy razem punkt po punkcie (restart PG krótko zrywa dev)
- `certbot --nginx` modyfikuje vhost na hoście (dryf vs repo — celowe)
