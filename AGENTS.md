# AGENTS.md — instrukcja pracy dla agenta (CoZagrac)

Ten plik opisuje kontekst projektu dla agenta AI z pustym kontekstem. Przeczytaj go w całości
zanim cokolwiek zmienisz. Jeśli treść rozmija się ze stanem kodu — kod ma rację, zaktualizuj ten plik.

## Co to jest

**CoZagrac** — aplikacja webowa (praca inżynierska) rekomendująca gry Steam na podstawie
embeddingów: gry i profil użytkownika są wektorami (OpenAI embeddings, 1536 wym.), rekomendacja =
najbliższe sąsiedztwo kosinusowe (pgvector) spośród gier, których użytkownik nie posiada.

Monorepo `npm workspaces` (`apps/*`). Poczytaj też `README.md` (architektura, uruchomienie).

## Komendy (zweryfikowane)

| Komenda | Działanie |
|---|---|
| `npm install` | **zawsze z roota** (patrz „Złota zasada" niżej) |
| `npm run build -w @cozagrac/shared` | wymagane przed `dev`/`build`, także po każdej zmianie `apps/shared/**` |
| `npm run dev` | frontend (Vite :5137) + backend (Express :3001) + typecheck backendu |
| `npm run build` | shared → frontend → backend |
| `npm run lint` | eslint frontend + backend |
| `npm test` | vitest (backend, katalog `apps/backend/test/`) |

Warunki końcowe każdej zmiany: `npm run build` i `npm run lint` czysto, `npm test` zielono.

## Złota zasada: nigdy `npm install` wewnątrz `apps/*`

Root jest jedynym workspace root. Zagnieżdżone `node_modules`/`package-lock.json` w `apps/backend`
tworzą **drugą kopię `zod`/`@types/pg`** → TypeScript porównuje dwie nominacje tego samego →
wybuch inferencji (`tsc` OOM >4 GB) i błędy typu „identyczne typy nieprzystające".
Te duplikaty już tu były i zostały usunięte — nie przywracaj ich. Analogicznie: `validate()`
musi przyjmować `ZodType` (nie `ZodObject`) — przy `ZodObject` schematy po `.refine()` też
powodowały OOM.

## Architektura

```
apps/shared/   @cozagrac/shared — KONTRAKTY: schematy Zod zapytań + typy odpowiedzi (TS)
apps/backend/  Express 5 (ESM!), Drizzle ORM, PostgreSQL+pgvector, passport-steam, OpenAI
apps/frontend/ React 19 + Vite + react-router 7 + React Compiler + TanStack Query
```

Backend warstwy: `routes → controllers → services → db/drizzle`. Dodatkowo:
`clients/` (endpointy Steam + steam store + openai), `functions/` (batch-sync scripty, np.
`getCandidatesJSON.ts`, `sync/syncAllGameEmbeddings.ts` — uruchamiane ręcznie przez `tsx`),
`middlewares/requireAuth.ts`, `schemas/` (zod lokalny backendu, np. create), `types/`
(`axios.d.ts` rozszerza AxiosResponse o `response`).

Frontend: `pages/` (routy) + `features/<domain>/` (hooki i komponenty funkcyjne) +
`services/*.ts` (fetchApi per domena) + `components/ui|layout` + `context/AuthContext`.
`AuthGate` pilnuje zalogowania, `AuthProvider` przy starcie woła `GET /api/user/me`.

## Kluczowe konwencje (trzymaj się ich)

### API / kontrakty
- Nowy endpoint = **najpierw typ/schemat w `apps/shared/contracts/api.ts`**, potem serwis
  backendu, kontroler, route. Po zmianach shared: `npm run build -w @cozagrac/shared`.
- Schematy http muszą mieć kształt `z.object({ body?, query?, params? })` — middleware
  `validate(schema)` parsuje obiekt `{ body, query, params }` z requesta (nie sam body!).
  Kontroler i tak robi ponownie `XHttpSchema.parse(req)` (wzorzec istniejący).
- Sesja: `requireAuth` + `getSessionUserId(req)`; endpointy zalogowanego: ścieżka `/user/me/...`.
- Odpowiedzi błędu: `res.status(N).json({ message })` — frontendowy `fetchApi` to parsesuje
  do `ServiceResponse.error.message`.
- Bieżące endpointy: `POST /api/auth/register|login|logout`, `GET /api/auth/steam`,
  `GET /api/user/me` (zwraca też `steamLinked`), CRUD `/api/user/:userId` (PATCH/DELETE),
  `GET /api/user/me/library`, `GET /api/user/me/recommendations?limit&cursor&isFree&minDiscount&minReviewTier&yearFrom&platform`,
  `GET/PUT /api/user/me/favorites` (ręczna podstawa profilu, 5–50 gier),
  `POST /api/user/me/embedding` body `{ source: 'steam-library' | 'manual-games' }` (job 202) +
  `GET /api/user/me/embedding/status`,
  `GET /api/game?appId=`, `GET /api/game/search?q&limit` (FTS na `search_vector`),
  `GET /api/game/similar?appId&limit`, `GET /api/reviews/:steamAppid?page&limit&sort&language`,
  `GET /api/health`.
- Kwirki API: **recenzje zwracają 404 gdy puste** (frontend mapuje na stan pusty);
  `recommendations` zwraca 200 z `hasEmbedding: false` gdy brak profilu (frontend pokazuje CTA);
  `POST /user/me/embedding` jest **asynchroniczne** (job w pamięci serwera, status przez
  `GET /embedding/status`; restart serwera kasuje statusy → `idle`);
  `review_tier` to **tier popularności** (`S/A/B` = ≥10k/5k/1k recenzji, nie ocena);
  **limity dzienne** (UTC, tabela `embedding_usage_daily`, liczniki w DB przeżywają restarty):
  429 gdy przekroczone `USER_PROFILE_BUILDS_PER_DAY` (buildy profilu, oba źródła, liczone
  przy starcie joba) lub budżet tokenów OpenAI przy `manual-games`; połowa ścieżki on-demand
  generuje embeddingi tylko dla gier poza katalogiem → `createEmbeddings`
  (`clients/openai/embeddings.ts`) jest **jedynym** punktem wołającym `embeddings.create`
  i księguje `usage.total_tokens` (konto + wiersz globalny o `user_id` =sentyminel
  `00000000-…`); przy wyczerpaniu w trakcie joba build degradowany (komunikat w statusie).
  Limit globalny = twardy sufit wydatków (10M ≈ $0.20/dzień przy $0.02/1M).
  Reset limitu = nowy klucz dnia (UTC) w `embedding_usage_daily`, zero kodu „zerującego";
  historia starsza niż `USAGE_RETENTION_DAYS` (domyślnie 90) usuwana przy starcie serwera
  i co 24 h (`index.ts`, `usageService.cleanupOldRows`).

### Rekomendacje (rdzeń pracy inżynierskiej — nie psuj metodologii)
`apps/backend/src/services/embeddings.service.ts`:
- embedding gry = ważona kombinacja L2: opis (0.4–0.5) + taksonomia (0.15) + recenzje
  pozytywne (~0.7 reszty) + **ujemna** waga recenzji negatywnych; wersja `ACTIVE_EMBEDDING_VERSION` ('v1').
- embedding użytkownika = centroid (bez wag) embeddingów top-50 gier wg playtime'u (źródło
  `steam-library`) albo ręcznie wybranych gier ulubionych (źródło `manual-games`,
  tabela `user_favorite_games`); obie ścieżki zapisują tę samą wersję 'v2-centroid'.
  Podstawy NIE zapisujemy w bazie (user wybiera ją przy każdym buildzie w kreatorze na froncie).
- kNN: `1 - (embedding <=> v::vector)`, odrzucenie gier posiadanych (Steam API `ownedGames`)
  oraz ręcznie wybranych ulubionych, kursor = similarity ostatniego elementu strony.
- **Pułapka pgvector:** odczyt przez drizzle zwraca `number[]`, ale w surowym `sql\`...\``
  trzeba wiązać `toPgVector(vec)::vector` — surowa tablica JS serializuje się do `{...}` i pgvector
  to odrzuca. INSERT-y przez `db.insert(...).values({ embedding })` są OK (drizzle sam konwertuje).

### Auth / sesje
- Session w Postgres (`connect-pg-simple`), klucz `session.passport.user = { userId }`
  (struktura passportowa — `setSessionUser` też tyle zapisuje; zmiana formatu = zepsute sesje).
- Login lokalny i Steam działają tak samo po stronie frontendu (sesja + `/user/me`).
- Frontend woła API **ścieżką względną `/api/...`**: dev → proxy Vite (5137→3001), prod →
  ten sam origin (nginx `location /api`). Nie przywracaj `VITE_API_URL` w adresach fetchy.
- `FRONTEND_URL` w `.env` backendu: redirecty po Steam OAuth + CORS. `domain` (runtime.ts) =
  returnURL dla Steama; w dev to `http://localhost:3001`.

### Backend / zmienne środowiskowe
- **Nie czytaj `process.env` w momencie oceny modułu** (stałe na górnej pozycji pliku,
  argumenty `new X({...})` przy imporcie). Importy w `index.ts` są sortowane alfabetycznie
  przez formattera, więc `./env.js` (dotenv) potrafi wykonać się **po** module, który już
  policzył swoją stałą → ciche wartości produkcyjne (historycznie: `DB_SSL`/`isDev` = `verify`,
  self-signed cert, zły `domain` Steam).
- Zawsze `import { env } from '.../env.js'` i odczyt z `env` (zwalidowany zod). Graf importów
  gwarantuje, że dotenv odpalił się przed importerem — niezależnie od sorter importów.
- `env.ts` jest jedynym miejscem walidacji i ładowania `.env`; nowe zmienne dodawaj do
  `envSchema`. Wyjątek: `drizzle.config.ts` (osobny proces CLI).

### Frontend
- Stan serwera **tylko przez TanStack Query** (`useQuery`/`useInfiniteQuery`/`useMutation`).
  Ręczne fetch+useState w efekcie blokuje lint `react-hooks/set-state-in-effect` (v7, React Compiler).
- `fetchApi<T>` (services/utils.ts) zwraca `ServiceResponse<T> { success, status, userData, error? }`
  i sam łapie wyjątki sieciowe; nie dodawaj try/catch wokół wywołań.
- Nagłówki UI po angielsku; nazwy plików/zmiennych po angielsku.
- Komponenty prezentacyjne w `components/ui`, logika feature'u w `features/<x>` (hook + komponenty).

### Baza danych
- Bootstrap schematu (dev i prod): skrypty `apps/backend/src/db/scripts/` w kolejności
  `extensions.sql` → `bootstrap_schema.sql` → `post_migrate.sql` → `grants.sql` → `verify.sql`
  (trigger `search_vector` utrzymuje `post_migrate.sql` — drizzle nim nie zarządza).
  `postgre_schema.sql` to legacy z dryfem — nie tworzyć na nim baz.
  Prod: VPS, baza `co_zagrac_db_prod`, rola aplikacji `app_user` (tylko DML, bez DDL);
  procedura wdrożeniowa: `docs/wdrozenie_aplikacji_vps.md`.
- `apps/backend/src/drizzle/schema.ts` jest **generowany introspekcją**:
  `npm run schema_gen -w backend` (uwaga: `tsvector` jest mapowany na text z TODO).
  Migracje: `npm run sql_gen -w backend`. Nie edytuj schema.ts ręcznie bez powodu.
- Zapytania SQL buduj przez drizzle `sql\`\`` z ostrożnym wiązaniem parametrów (patrz pgvector wyżej).

### Testy
- Backend: `vitest run`, testy w `apps/backend/test/*.spec.ts` — są testy czystych helperów
  (`embedding.helpers`) i progów recenzji. Przy zmianach w `embedding.helpers.ts` uruchom i rozszerz testy.
- Frontend: brak testów (plan P2: Testing Library). E2E: brak.

## Windows / środowisko
- Praca w Git Bash. `.env` backendu: `DATABASE_URL`, `STEAM_API_KEY`, `SESSION_SECRET`,
  `OPENAI_API_KEY`, `FRONTEND_URL`, `DB_SSL` (przykłady: `.env.example`).
- **DB przez tunel SSH** (dev na drugim komputerze: VPS → `localhost:5432`): TLS wyłącznie
  przez `DB_SSL` (`disable` dla tunelu; `no-verify` dla self-signed na VPS). Parametry
  `?ssl`/`?sslmode` w `DATABASE_URL` są w kodzie usuwane — `pg` nadpisuje nimi opcje z kodu
  i przy tunelu robił się `DEPTH_ZERO_SELF_SIGNED_CERT` (patrz komentarz w `db/init.ts`).
- Build backendu: `tsc -p tsconfig.build.json` — gdyby znów jadł RAM, przyczyną prawie zawsze
  jest duplikat zależności (patrz Złota zasada), nie rozmiar projektu.
- Limity serwera: `server.timeout=70s` pozostaje (długie żądania synchroniczne); budowanie
  profilu jest już asynchroniczne (job + `/embedding/status`), więc ten endpoint go nie dotyka.

## Gdzie jesteśmy (stan: październik 2026)
- P0+P1 zrobione i zweryfikowane: działające logowanie (Steam+email), rekomendacje z load more
  (kursor), budowanie profilu, `/games/:appId` ze szczegółami, recenzjami (sort/page) i podobnymi grami.
- W ramach P2 już zrobione: `/library`, filtry rekomendacji, asynchroniczne budowanie profilu
  ze statusem, `GET /api/game/search` (FTS), kreator wyboru podstawy profilu
  (Steam library / ręczny wybór gier `features/profile/ProfileWizard` + `user_favorite_games`).
- Roadmapa: P2 = recenzje zawsze 200, strona `/privacy` + zgoda użytkownika (audyt danych
  zrobiony: w bazie e-mail/hash, SteamID64, wektor profilu, sesje; biblioteka Steam live,
  nie zapisywana; OpenAI nie dostaje danych osobowych), testy frontendu/E2E, CI.
- Wdrożenie: runbook `docs/wdrozenie_aplikacji_vps.md` (w toku, faza 1 = docker na VPS);
  CI/CD `.github/workflows/deploy.yml` (branch `dev` → verify → deploy SSH), kontenery na
  127.0.0.1, edge = host nginx + certbot.

## Styl raportowania (wymaganie użytkownika)
- Po polsku, konkretnie: co zmienione (ścieżki), czego nie zrobiono i dlaczego, czego potrzebuje programista.
- Bez zbędnych wstępów. Komentarze w kodzie i identyfikatory po angielsku.
