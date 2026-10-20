# CoZagrac — rekomendacje gier Steam oparte o embeddingsy

Aplikacja webowa sugerująca gry na Steamie na podstawie biblioteki i preferencji
użytkownika. Rekomendacje działają w przestrzeni wektorowej: gry i profil
użytkownika są opisywane embeddingami (OpenAI, 1536 wymiarów), a sugestią jest
gra o największym podobieństwie kosinusowym do profilu, której użytkownik jeszcze
nie posiada.

Projekt inżynierski: **system rekomendacji treści z wykorzystaniem modeli
 językowych (embeddingi) i danych Steam Web API**.

## Kluczowe funkcje

- Logowanie przez **Steam (OpenID, passport-steam)** oraz kontem e-mail/hasło (bcrypt, sesje w PostgreSQL).
- Pobieranie biblioteki gier, oszacowanego czasu gry, recenzji i statystyk z **Steam Web API**.
- **Synchronizacja katalogu gier** ze Steama (lista aplikacji, szczegóły, recenzje ze strumieniowym parsowaniem JSON, retry, filtrowanie kandydatów po liczbie recenzji — progi S/A/B).
- **Silnik rekomendacji** (embeddingi):
  - wektor gry = ważona kombinacja opisu, taksonomii (genre/kategorie) oraz recenzji pozytywnych i negatywnych (recenzje negatywne mają wagę ujemną), z normalizacją L2 i wagami zależnymi od długości opisu,
  - wektor użytkownika = centroid wektorów 50 najczęściej ogrywanych gier,
  - wyszukiwanie podobieństwa przez **pgvector** (indeks HNSW, odległość kosinusowa).
- Rekomendacje z odrzuceniem gier już posiadanych + wariant z paginacją kursorową.
- Wspólny kontrakt API walidowany **Zod** (typy współdzielone frontend ↔ backend).

## Stack

| Warstwa   | Technologie |
|-----------|-------------|
| Frontend  | React 19, Vite 7, TypeScript, React Compiler, react-router 7 |
| Backend   | Node.js, Express 5, TypeScript (ESM), Drizzle ORM, Zod, Passport |
| Baza      | PostgreSQL + pgvector (typ `vector(1536)`, indeksy HNSW), sesje w tabeli `sessions` |
| AI        | OpenAI Embeddings API |
| Integracje| Steam Web API + Steam Community API (OpenID) |
| Deployment| Docker, docker-compose, nginx (reverse proxy `/` → frontend, `/api` → backend) |

## Architektura

```
apps/
├── frontend/          # SPA (React)
│   └── src/           #   auth (Steam/e-mail), AuthGate, layout
├── backend/           # API Express (/api)
│   └── src/
│       ├── routes → controllers → services       # warstwy HTTP i domenowe
│       ├── clients/  # steam (endpointy + steam store), openai
│       ├── functions/# batchowe scripty synchronizacji i embeddingsów
│       ├── drizzle/  # schema + migracje (drizzle-kit)
│       └── db/       # inicjalizacja puli, schemat SQL, sesje
└── shared/            # @cozagrac/shared — kontrakty Zod współdzielone przez apps
```

Przepływ rekomendacji:

```
Steam login → synchronizacja biblioteki (owned games, playtime)
  → katalog gier w bazie (opisy, tagi, recenzje ze Steama)
  → embedding gry (openai/embeddings, opis+taksonomia+recenzje)
  → embedding użytkownika (centroid top-50 gier)
  → kNN po podobieństwie kosinusowym (pgvector <=>)
  → lista rekomendacji bez gier posiadanych
```

## Wymagania

- Node.js ≥ 20
- PostgreSQL ≥ 15 z rozszerzeniem **pgvector** (używane też `pgcrypto`)

## Uruchomienie (dev)

```bash
npm install                         # instalacja workspace'ów
npm run build -w @cozagrac/shared   # raz: kontrakty dla apps/*

cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# uzupełnij .env: DATABASE_URL, STEAM_API_KEY, SESSION_SECRET, OPENAI_API_KEY

psql "$DATABASE_URL" -f apps/backend/src/db/scripts/postgre_schema.sql   # stworzenie schematu

npm run dev    # frontend (Vite :5137) + backend (Express :3001) + typecheck
```

## Skrypty

| Polecenie | Działanie |
|---|---|
| `npm run dev` | uruchomienie frontendu, backendu i typechecku backendu równolegle |
| `npm run build` | budowa shared → frontend → backend |
| `npm run lint` | ESLint frontend + backend |
| `npm run schema_gen -w backend` | introspekcja bazy → `src/drizzle/schema.ts` |
| `npm run sql_gen -w backend` | generowanie migracji SQL ze schematu |

Batchowe operacje synchronizacji (scripty jednorazowe, uruchamiane np. przez
`tsx`): `src/functions/getCandidates.ts`, `getCandidatesJSON.ts`,
`sync/syncAllGameEmbeddings.ts`.

## Zmienne środowiskowe backendu

| Zmienna | Opis |
|---|---|
| `NODE_ENV` | `development`/`production` |
| `PORT` | port API (domyślnie 3001) |
| `DATABASE_URL` | connection string PostgreSQL |
| `STEAM_API_KEY` | klucz Steam Web API |
| `SESSION_SECRET` | sekret sesji express-session |
| `OPENAI_API_KEY` | klucz OpenAI (embeddings) |
| `FRONTEND_URL` | adres frontendu — redirecty po logowaniu Steam i CORS (domyślnie `http://localhost:5137`) |

## Deployment

```bash
docker compose up --build
```

nginx (port 80) serwuje frontend i proxy-uje `/api` na backend — oba komponenty
widoczne pod jedną domeną.

## Licencja

Apache-2.0 — patrz [LICENSE](LICENSE).
