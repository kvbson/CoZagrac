# Spis treści — praca inżynierska (ustalony, 2026-11-15)

> Uzgodniony ze stanem projektu; 9 rozdziałów. Wskazówki do pisania w nawiasach kwadratowych
> — **do usunięcia przed wklejeniem do dokumentu**.

1. **Wstęp**
   - 1.1. Cel i zakres pracy
   - 1.2. Motywacja i kontekst problemu
   - 1.3. Struktura pracy *(dopytać promotora, czy wymagana)*

2. **Przegląd technologii i narzędzi**
   - 2.1. Steam OpenID i Steam Web API
   - 2.2. Systemy rekomendacji *(content-based vs collaborative filtering, podobieństwo kosinusowe, kNN)*
   - 2.3. Modele językowe i reprezentacje wektorowe — embeddingi *(tylko embeddingi OpenAI, nie LLM generatywne — nazwać precyzyjnie)*
   - 2.4. Bazy wektorowe *(pgvector, indeks HNSW, odległość kosinusowa)*
   - 2.5. Stack aplikacyjny *(TypeScript, Node.js/Express, React, PostgreSQL, Drizzle ORM, Zod)*

3. **Analiza wymagań systemowych**
   - 3.1. Wymagania funkcjonalne
   - 3.2. Wymagania niefunkcjonalne *(wydajność, bezpieczeństwo, limity kosztów OpenAI — z env.ts: budżety dzienne)*
   - 3.3. Scenariusze użycia *(logowanie Steam, budowa profilu, ocena gry, rekomendacje, wyszukiwarka, recenzje, ulubione, reset ocen)*

4. **Projekt systemu**
   - 4.1. Architektura aplikacji *(monorepo npm workspaces, warstwy routes→controllers→services, współdzielone kontrakty Zod)*
   - 4.2. Projekt bazy danych *(schemat, vector(1536), indeksy HNSW/GIN, sesje; diagram: `apps/frontend`… patrz commit „added db diagram schema")*
   - 4.3. Schemat przepływu danych *(sync katalogu → embedding gry → ważony centroid → kNN)*
   - 4.4. Projekt API *(endpointy, walidacja http-schema + ponowny parse w kontrolerze, obsługa błędów)*
   - 4.5. Autoryzacja, sesje i bezpieczeństwo danych *(Steam OpenID + e-mail/hasło, bcrypt, sesje w Postgres, zgoda przy rejestracji, audyt danych)*
   - 4.6. Integracja z API Steam *(ownedGames, appDetails, recenzje; rate limity, strumieniowe parsowanie JSON)*

5. **Implementacja**
   - 5.1. Synchronizacja katalogu gier *(batch scripty, retry, stream-json, progi recenzji S/A/B)*
   - 5.2. Mechanizm rekomendacji *(wagowanie wektora gry: opis 0.4–0.5 + taksonomia 0.15 + recenzje z wagą ujemną; normalizacja L2; odrzucenie posiadanych/ulubionych/ocenionych; paginacja kursorowa)*
   - 5.3. Budowa profilu użytkownika *(job asynchroniczny + endpoint statusu, limity dzienne, waga gry: (1+log1p(playtime)) × ocena/3)*
   - 5.4. Warstwa backendowa *(Express 5, middleware walidacji, obsługa błędów)*
   - 5.5. Warstwa frontendowa *(React 19, TanStack Query, kreator podstawy profilu z krokiem oceny gier, toasty, React Compiler)*
   - 5.6. Wyszukiwarka gier *(FTS: search_vector + trigger, websearch_to_tsquery, ts_rank; widok grid/tabela)*
   - 5.7. Pętla informacji zwrotnej — oceny rekomendacji i korekta profilu *(Rocchio w czasie zapytania, siła oceny |r−3|/2, FEEDBACK_WEIGHT=0.5, reset ocen; materiał: docs/oceny_uzytkownika_petla_informacji_zwrotnej.md)*

6. **Testy i analiza wyników**
   - 6.1. Testy poprawności *(vitest, 64 testy: embedding.helpers, rating.helpers, evaluation.helpers, getReviewTier, errorHandler, usage.helpers; akapit: test wykrył błąd weightedMean)*
   - 6.2. Testy wydajności *(kNN HNSW vs seq — p50/p95, recall vs ef_search 40/100; FTS GIN vs seq; czas buildu/syncu; koszt $ z embedding_usage_daily; wyniki: docs/pomiary/*.md)*
   - 6.3. Analiza jakości rekomendacji *(leave-one-out: HR@1/5/10/20, MRR, NDCG@10; wariant eksplikacyjny 80/20; ocena ekspercka top-N; opcjonalnie diversity/novelty/coverage)*

7. **Wdrożenie systemu**
   - 7.1. Konteneryzacja i docker-compose *(kontenery na 127.0.0.1, host.docker.internal; baza poza compose)*
   - 7.2. Serwer produkcyjny *(VPS Ubuntu, nginx jako edge, Let's Encrypt; runbook: docs/wdrozenie_aplikacji_vps.md)*
   - 7.3. Automatyzacja CI/CD *(GitHub Actions: push dev → verify → deploy SSH)*

8. **Możliwość rozbudowy systemu**
   - 8.1. Skalowanie *(partycjonowanie katalogu, cache, replica read)*
   - 8.2. Personalizacja *(re-ranking, kontekst sesji, oceny biblioteki w buildzie — już częściowo zrobione)*
   - 8.3. Integracja kolejnych źródeł danych *(GOG/Epic, wishlisty, dane społeczności)*

9. **Podsumowanie i wnioski**

---

## Mapa materiałów (gdzie co jest)

| Rozdział | Źródło w repo |
|---|---|
| 4.2, 5.3 | `apps/backend/src/db/scripts/`, `docs/oceny_uzytkownika_petla_informacji_zwrotnej.md` |
| 5.1–5.3, 5.7 | `apps/backend/src/services/embeddings.service.ts`, `utils/rating.helpers.ts` |
| 6.1 | `apps/backend/test/*.spec.ts` (64 testy) |
| 6.2, 6.3 | `docs/pomiary/*.md` (po uruchomieniu `eval:bench` / `eval:loo` / `eval:cost` — patrz `docs/TODO.md`) |
| 7 | `docs/wdrozenie_aplikacji_vps.md`, `docs/raport_wdrozenia.md`, `.github/workflows/deploy.yml` |
| 4.5 | `apps/frontend/src/pages/PrivacyPage.tsx`, `features/consent/` |

## Pozostałe materiały w docs/

- `wdrozenie_aplikacji_vps.md` — runbook produkcyjny (rozdz. 7)
- `raport_wdrozenia.md`, `konfiguracja_vps_nginx_lets_encrypt.md` — szczegóły wdrożenia
- `oceny_uzytkownika_petla_informacji_zwrotnej.md` — dokumentacja pętli feedbacku (rozdz. 4.5, 5.3, 5.7, 6)
- `TODO.md` — lista zadań do wykonania
- `mvp_prezentacja.pptx`, `prezentacja-mvp.md` — materiały prezentacji
