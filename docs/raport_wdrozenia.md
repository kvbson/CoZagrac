# Raport z wdrożenia aplikacji CoZagrac — przebieg procesu

> **Data: 25 października 2026.** Dokument opisuje, jak aplikacja monorepo
> (shared/backend/frontend) trafiła z konfiguracji developerskiej na VPS OVH
> (`co-zagrac.pl`) wraz z pełną automatyzacją wdrożeń (GitHub Actions → SSH →
> Docker Compose). Plan operacyjny (co odpalić i w jakiej kolejności) znajduje
> się w `wdroczenie_aplikacji_vps.md`; ten dokument dokumentuje **co realnie
> zaszło, dlaczego i jakie pułapki napotkano**.

## 1. Architektura końcowa

```
Internet ──443/80──> host nginx (Ubuntu 24.04, certbot Let's Encrypt)
                       ├─ location /     → http://127.0.0.1:8081  (kontener frontend: nginx + SPA)
                       └─ location /api  → http://127.0.0.1:3001  (kontener backend: Express)

kontenery (docker compose, porty tylko na 127.0.0.1)
  backend ──TCP 5432──> host.docker.internal → PostgreSQL 16 (host): baza współdzielona z dev

GitHub Actions (push na dev) → verify: build+lint+test → deploy: SSH → scripts/deploy.sh
```

Kluczowe decyzje projektowe:

| Decyzja | Uzasadnienie |
|---|---|
| Edge = systemowy nginx na hoście, nie kontener nginx | certyfikat certbot Zarządzany wtyczką nginx; jeden publiczny punkt wejścia; kontenery bez TLS = prostszy obrót |
| Kontenery bindują wyłącznie `127.0.0.1` | z zewnątrz słychać tylko 80/443 (i SSH); compose nie ma już usługi nginx |
| PostgreSQL na hoście, nie w kontenerze | baza już tam żyła (dev), pgvector zainstalowany; kontenery + stan danych to osobne światy — DB państwowa została tam, gdzie była |
| Docker z repo Ubuntu (`docker.io` + `docker-compose-v2`) | compose używa tylko podstawowych funkcji; mniej ruchomych części niż repo Docker Inc. |
| Źródło deployu: branch `dev` | `deploy.sh` robi `git fetch && git reset --hard origin/dev`; `.env` jest poza gitem (chmod 600) |
| Jeden użytkownik bazodanowy `app_user` (tylko DML) | aplikacja nie posiada praw DDL — schemat zmienia wyłącznie człowiek, świadomie (sekcja 3.4) |

## 2. Co przygotowano w repo (zanim VPS zobaczył cokolwiek)

- `Dockerfile.frontend` — multi-stage: build Vite → obraz `nginx:alpine` ze statykami i `nginx/frontend.conf` (SPA `try_files`).
- `Dockerfile.backend` — `node:22-alpine`, `npm ci --workspace backend`, build shared→backend, `ENV NODE_ENV=production`.
- `docker-compose.yml` — bez usługi nginx; backend `127.0.0.1:3001`, frontend `127.0.0.1:8081`; `env_file: apps/backend/.env`; `extra_hosts: host.docker.internal:host-gateway` (most do bazy na hoście); healthchecki przez busybox `wget`; `restart: unless-stopped`.
- `nginx/co-zagrac.pl.conf` — szablon vhosta dla hostowego nginx (czysty `:80`; certbot dopisał 443 w wersji na hoście).
- `scripts/deploy.sh` — `git reset --hard origin/dev` → `compose build` → `up -d` → pętla health check (12×5 s) → `image prune`; **nigdy nie dotyka `.env` ani bazy**.
- `.github/workflows/deploy.yml` — `verify` (npm ci/build/lint/test na Node 22) → `deploy` (appleboy/ssh-action, secrets `DEPLOY_HOST/USER/SSH_KEY`, `environment: production`, `concurrency`, `workflow_dispatch`).
- Ścieżka bootstrapu bazy `apps/backend/src/db/scripts/`: `extensions.sql` → `bootstrap_schema.sql` (20 tabel, 2. wersje z `user_favorite_games` i `embedding_usage_daily`) → `post_migrate.sql` (FTS: funkcja + trigger + backfill) → `grants.sql` (rola `app_user`) → `verify.sql` (13 sekcji kontrolnych).

## 3. Przebieg na serwerze produkcyjnym

### 3.1 Docker (Faza 1)
Instalacja: `apt-get install docker.io docker-compose-v2`, `usermod -aG docker ubuntu`.
**Pułapka #1:** członkostwo w grupie `docker` nie działa w już otwartej sesji SSH — objaw `permission denied ... docker.sock` mimo poprawnego `getent group docker`. Rozwiązanie: pełne przeelogowanie (grupy są przypinane przy logowaniu).
Weryfikacja: `docker run --rm hello-world` → ✓.

### 3.2 Baza produkcyjna (Faza 2)
Baza `co_zagrac_prod` powstała w tej samej instancji PostgreSQL 16 co baza dev.
Schemat i dane katalogu przeniesiono **dumpem z dev** (wariant awaryjny planu;
`postgres_fdw` planowany jako primary, okazał się zbędny). Użytkownicy produkcyjnie
startują z danych, które przenieśliśmy; migracje struktury na dev (tabele
ulubionych i limitów dziennych) były wcześniej wykonane skryptami
`migration_*.sql`, więc dump zawierał kompletny stan 20 tabel.
Rola `app_user` z uprawnieniami wyłącznie DML (`grants.sql`), hasło losowe
(`openssl rand -base64 24`), never in git.

### 3.3 Sieć: kontenery → baza (Faza 2, część krytyczna)
Trzy warstwy musiały się zgodzić:

1. **PostgreSQL `listen_addresses = '*'`** — kontenery przychodzą mostkiem docker,
   nie loopbackiem. Celowo *nie* `172.17.0.1` jako jedyny bind: compose tworzy
   własne sieci z bramami z kolejnych podzakresów (172.18/19/...), więc bind
   po jednej bramie padłby przy pierwszym `docker compose up`. Bezpieczeństwa
   pilnują warstwy 2 i 3.
2. **`pg_hba.conf`**: `host co_zagrac_prod app_user 172.16.0.0/12 scram-sha-256` —
   tylko ta rola, tylko ta baza, tylko adresy z przestrzeni dockera.
3. **ufw** (`active`, `deny incoming`): ruch kontener→host uderza w łańcuch
   INPUT i bez zgody jest po cichu zrzucany, **mimo** zgody pg_hba. Reguła:
   `ufw allow from 172.16.0.0/12 to any port 5432 proto tcp`.
   Publiczny port 5432 pozostaje nieosiągalny (brak reguły dla `Anywhere`).

**Pułapka #2 (metodologia testów):** test „z hosta" na bramkę mostka
(`psql -h 172.17.0.1`) jest **niemiarygodny** — kernel przy własnej bramce
podmienia adres źródłowy na publiczny IP, a pg_hba słusznie odrzuca takiego
gościa. Jedyny miarodajny test jest z wnętrza kontenera:
`docker run --rm ubuntu:24.04` + `postgresql-client` → `psql -h 172.17.0.1 -U app_user co_zagrac_prod`
→ `app_user | co_zagrac_prod` ✓ (dokładnie ta ścieżka, którą pójdzie backend).

### 3.4 Zasada migracji
Deploy **nie dotyka schematu bazy**. Zmiany struktury = osobny, ręcznie
zatwierdzany krok (skrypt + `verify.sql`), wykonywany przez pgAdmin. Dzięki temu
fail deploya nie może uszkodzić danych, a historia schematu jest audytowalna.

## 4. Pierwsze uruchomienie aplikacji (Faza 4)

`git clone` → `/opt/cozagrac`; utworzenie `apps/backend/.env` (chmod 600, poza
gitem): `DATABASE_URL=postgresql://app_user:...@host.docker.internal:5432/co_zagrac_prod`,
`DB_SSL=disable` (ruch nie opuszcza maszyny), `FRONTEND_URL=https://co-zagrac.pl`,
klucze Steam/OpenAI, `SESSION_SECRET`. Limity OpenAI oparte o domyślne wartości
zwalidowanego `env.ts` (brak nadpisań w prod).

**Pułapka #3 (najpoważniejsza): `CMD` w Dockerfile backendu wskazywał `dist/src/index.js`.**
Kontener restartował się w pętli z `MODULE_NOT_FOUND`. Przyczyna: `tsconfig.json`
backendu ma `rootDir: "src"`, a wpis include `"drizzle.config.ts"` wskazuje na
nieistniejącą ścieżkę (plik leży w `src/`), więc `tsc` emituje **prosto do
`dist/`** (`dist/index.js`). Skrypt `start` w package.json zawierał tę samą
błędną ścieżkę, ale nigdy nie był realnie wykonywany (dev odpala backend przez
`tsx`, a obrazy lokalne tylko budowano, nie uruchamiano) — błąd przeżył
weryfikację „build przechodzi". Fix: `CMD`/`start` → `dist/index.js`
(+ ścieżki skryptów sync w runbooku), potwierdzone lokalnym buildem.
Nauczka: **obraz trzeba uruchomić, nie tylko zbudować** — pierwszy start na
czystym środowisku był jedynym momentem, który to ujawnił.

Po fixie: `docker compose ps` → oboje healthy; smoke: `/api/health`,
FTS `game/search`, SPA 200 ✓.

## 5. TLS i vhost (Faza 5)

Stan zastany: certbot (plugin nginx) wcześniej wystawił certyfikat dla
`co-zagrac.pl` i wpiął bloki 443+redirect do wspólnego `sites-available/default`.
Migracja bez utraty odnawiania:
1. skopiowanie szablonu vhosta z repo do `sites-available` + symlink w `sites-enabled`;
2. **usuniecie z `default` dwóch bloków certbot dla `co-zagrac.pl`** (inaczej dwa
   vhostry tej samej domeny — nginx wybrałby stary i ruch szedłby na `/var/www/html`);
3. `sudo certbot --nginx -d co-zagrac.pl` → **„Reinstall"** (ten sam certyfikat,
   nowe miejsce zarządzania; bez ponownego wystawiania i limitów CA).

Weryfikacja: `certbot renew --dry-run` ✓, `http→301→https` ✓, SPA 200 ✓,
`https://co-zagrac.pl/api/health` → `{"status":"ok"}` ✓, bloki certbot teraz
w `co-zagrac.pl.conf` ✓. Logowanie Steam przez domenę ✓ (callback
`https://co-zagrac.pl/api/auth/steam/callback`).

## 6. Automatyzacja: GitHub Actions (Faza 6)

Kanał: klucz ed25519 `cozagrac_deploy`. Publiczny → `~/.ssh/authorized_keys`
na VPS (GitHub Actions loguje się nim jako `ubuntu`) **oraz** Deploy Key repo
(tylko odczyt, bez write); prywatny → tylko sekret `DEPLOY_SSH_KEY` w repo
(+ lokalnie do testów). Sekrety: `DEPLOY_HOST=co-zagrac.pl`, `DEPLOY_USER=ubuntu`.

**Pułapka #4:** pierwszy realny deploy zatrzymał się w `deploy.sh`:
`fatal: could not read Username for 'https://github.com'` — klon na VPS-ie miał
remote HTTPS, a sesja SSH z pipeline jest nieinteraktywna. Fix: Deploy Key
read-only + `git remote set-url origin git@github.com:kvbson/CoZagrac.git` +
`~/.ssh/config` (IdentityFile, IdentitiesOnly) + keyscan github.com.

Kolejny run: fetch ✓, build obrazów (cache warstw działa — powtarzalne deploye
są tanie), recreacja kontenerów, health check ✓ — **pełny obieg green**.
(szum: pojedynczy `curl: (56)` w pierwszej próbie zdrowia, zanim backend zdążył
wstać — pętla 12×5 s jest na to; brak akcji).
Zmiana frontendowa (favicon + tytuł zakładki, commit `title + icon`) przeszła
tym obiegiem jako pierwszy prawdziwy end-to-end test użytkowy: index.html →
build → obraz → kontener → vhost → przeglądarka.

Model bezpieczeństwa pipeline: każdy z prawem push na `dev` może wdrożyć
(standard CI/CD). Zalecane hamulce (opcjonalne): branch protection `dev`
(PR+review) i `production` environment → Required reviewers (manual approval
gate przed jobem deploy).

## 7. Napotkane problemy — tabela zbiorcza

| # | Objaw | Przyczyna | Rozwiązanie |
|---|---|---|---|
| 1 | `permission denied docker.sock` po `usermod -aG docker` | grupa przypinana przy logowaniu | relogin SSH (test trwałym stanem: `getent group docker`) |
| 2 | `no pg_hba entry for host <publiczny IP>` przy teście `psql -h 172.17.0.1` z hosta | kernel podmienia źródło ruchu do własnej bramki mostka | test wyłącznie z kontenera (`docker run ubuntu:24.04` + psql) |
| 2b | kontener→5432 zrywane mimo zgody pg_hba | ufw `deny incoming` na INPUT | `ufw allow from 172.16.0.0/12 to any port 5432 proto tcp` |
| 3 | backend w restart-loop `MODULE_NOT_FOUND dist/src/index.js` | `CMD`/`start` ze złą ścieżką wyjścia `tsc` (`rootDir src`, mylne include) | `dist/index.js`; lekcja: obraz należy uruchomić, nie tylko zbudować |
| 4 | deploy: `could not read Username for 'https://github.com'` | remote HTTPS + nieinteraktywne SSH | Deploy Key read-only, remote na `git@github.com:` |
| 5 | dwa vhostry `co-zagrac.pl` po migracji TLS | bloki certbot zostały w `default` | usunięcie bloków z `default` + `certbot --nginx` **Reinstall** |
| 6 | `curl (56)` w health check deploya | pierwsza próba w oknie startu procesu | brak akcji (pętla retry projektowa) |

## 8. Stan końcowy i sprawy otwarte

Zamknięte: Docker ✓, baza prod + rola + dostęp kontenerów ✓, kontenery na
127.0.0.1 ✓, TLS/redirect/odnawianie ✓, Steam przez domenę ✓, obieg push→
Actions→VPS✓ (w tym zmiana użytkowa frontendu).

Otwarte (operatyka / backlog):
- backup cron `pg_dump -Fc co_zagrac_prod` (lokalnie + kopia poza maszyną) — do ustawienia;
- `users_email_key` na dev dla spójności z prod (jednorazowy `ALTER`, po kontroli duplikatów);
- hamulce pipeline: branch protection `dev`, Required reviewers na `production`;
- roadmapa P2 aplikacji (recenzje zawsze 200, strona `/privacy`, testy frontendu/E2E, CI na PR).

**Dla odtwarzalności:** każdy krok odtworzeniowy z tej historii (komendy w
kolejności, szablony plików) znajduje się w `wdroczenie_aplikacji_vps.md` —
niniejszy raport jest opisem *przebiegu*, runbook jest instrukcją *wykonania*.
