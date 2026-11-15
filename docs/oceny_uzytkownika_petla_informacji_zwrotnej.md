# Pętla informacji zwrotnej — oceny użytkownika (1–5) i ich wpływ na rekomendacje

> Materiał do pracy inżynierskiej (rozdziały: Projekt systemu, Implementacja, Testy).
> Stan: listopad 2026, wszystko zaimplementowane i przetestowane (build/lint/testy zielone).

## 1. Cel

Użytkownik ocenia gry w skali **1–5** (5 = „bardzo mi się podoba"). Oceny pełnią trzy role:

1. **Korekta profilu na bieżąco** — gry ocenione pozytywnie przyciągają centroid profilu,
   negatywnie odpychają (korekta w stylu Rocchio), bez przebudowy profilu i bez wywołań OpenAI.
2. **Wykluczenie z kandydatów** — oceniona gra nie pojawia się ponownie w rekomendacjach
   (użytkownik wyraził już opinię).
3. **Ważenie centroidu przy buildzie** — w bibliotece ocena modyfikuje wkład gry do profilu
   (iloczyn oceny i czasu gry).

Oceny to **ground truth eksplikacyjny** dla ewaluacji jakości rekomendacji (rozdz. „Testy
i analiza wyników") — w odróżnieniu od playtime'u, który jest tylko proxy „podobało mi się".

## 2. Model danych

Tabela `user_game_ratings` — jedna na oba konteksty (rekomendacje i biblioteka):

```sql
CREATE TABLE user_game_ratings (
  user_id uuid NOT NULL,
  steam_appid integer NOT NULL,
  rating smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, steam_appid),
  CONSTRAINT user_game_ratings_rating_check CHECK (rating BETWEEN 1 AND 5)
);
```

- FK → `users(id)` i `game_info(steam_appid)`, oba `ON DELETE CASCADE` (oceny nie zostają
  po usunięciu konta ani gry z katalogu).
- Indeks `idx_user_game_ratings_steam_appid` (strona `user_id` jest pokryta prefiksem PK).
- Granty DML dla roli `app_user`.

**Pliki:** `apps/backend/src/db/scripts/migration_user_game_ratings.sql` (idempotentna
migracja dla istniejących baz), tabela dopisana też do `bootstrap_schema.sql` (świeże bazy).
Po aplikacji `verify.sql` oczekuje: **21 tabel, 26 indeksów**.

## 3. API

| Metoda i ścieżka | Opis | Odpowiedź |
|---|---|---|
| `GET /api/user/me/ratings` | wszystkie oceny użytkownika (z `name`/`headerImage` z katalogu — stan UI) | 200 `{ items: UserRating[] }` |
| `PUT /api/user/me/ratings` | upsert jednej oceny `{ steamAppid, rating: 1–5 }` (ostatni zapis wygrywa) | 200 `{ steamAppid, rating }` |
| `DELETE /api/user/me/ratings/:steamAppid` | usunięcie oceny | 204 (idempotentne) |
| `DELETE /api/user/me/ratings` | **reset wszystkich ocen** (pełny reset pętli feedbacku) | 204 |

- Gra spoza katalogu → `422` (walidacja przed zapisem; FK rzuciłoby 500).
- Walidacja wejścia: kontrakty Zod w `apps/shared/contracts/api.ts`
  (`putUserRatingHttpSchema`, `deleteUserRatingHttpSchema`), middleware `validate()`
  + ponowny parse w kontrolerze — wzorzec wspólny dla całego API.
- Wszystkie endpointy pod `requireAuth` (id użytkownika z sesji, nigdy z body).

## 4. Matematyka silnika

### 4.1. Siła oceny

```
strength(r) = |r − 3| / 2
```

| ocena | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| siła  | 1.0 | 0.5 | 0 (neutralna) | 0.5 | 1.0 |

Ocena 3 jest pomijana w całości — nie wpływa ani na korektę, ani na ważenie centroidu.

### 4.2. Korekta centroidu w czasie zapytania (Rocchio)

Przy każdym żądaniu rekomendacji (`recommendForUser`):

1. pobierane są oceny użytkownika zjoinowane z **aktualnymi** embeddingami gier
   (aktywna wersja embeddingów),
2. korekta:

```
pull = mean( { strength(r) · v_g : ocena r ∈ {4,5} } )
push = mean( { strength(r) · v_g : ocena r ∈ {1,2} } )
q'   = L2( q + FEEDBACK_WEIGHT · pull − FEEDBACK_WEIGHT · push )
```

gdzie `q` — bazowy centroid profilu, `v_g` — embedding gry, `FEEDBACK_WEIGHT = 0.5`.

**Przykład:** profil `q = [1, 0]`, jedna gra `v = [0, 1]` oceniona na 5 →
`q' = L2([1, 0] + 0.5·[0, 1]) = [0.894, 0.447]` — podobieństwo kosinusowe profilu do gry
wzrosło z 0 do 0.447. Ocena 4 dałaby `[0.970, 0.243]` (0.243) — słabszy ruch.

**Decyzje projektowe:**

- **Korekta w czasie zapytania, nie przebudowa profilu** — oceny działają natychmiast,
  zero kosztu OpenAI (wektory gier już są w bazie), bazowy profil w `user_embeddings`
  pozostaje nietknięty (korekta jest funkcją bieżących ocen).
- **Średnia wektorów przeskalowanych siłą oceny, a nie „ważona średnia" z renormalizacją
  wag.** Pierwsza implementacja użyła `weightedMean` (normalizuje wagi do sumy = 1), przez
  co ocena 4 i 5 dawały identyczną korektę — **błąd wychwycony przez test jednostkowy**
  („ocena 5 przyciąga silniej niż 4"). Wniosek dla pracy: absolutna siła oceny musi
  przeżyć agregację, więc skalujemy wektory przed średnią (`scaledMean`).
- **Ocenione gry wypadają z `excludeIds`** (razem z posiadannymi i ulubionymi) — po wystawieniu
  oceny gra nie wraca w wynikach.
- **Caveat kursora** (udokumentowany w kodzie): kursor paginacji to similarity ostatniego
  elementu; zmiana ocen w trakcie przewijania przesuwa skalę similarity, do której kursor
  się odnosi. Akceptowalne — korekta jest spójna w obrębie jednego „stanu ocen".
- Symetria z wektorem gry: recenzje negatywne mają tam wagę ujemną — korekta Rocchio to ten
  sam mechanizm, tylko po stronie profilu.

### 4.3. Ważenie centroidu przy buildzie profilu

W `generateFromSteamLibrary` (podstawa „steam-library", top-50 gier wg playtime):

```
w_g = (1 + log1p(playtime_min)) × (ocena_g / 3)
```

- `ocena/3`: ocena 3 = mnożnik 1.0 (neutralna), 5 → ×1.67, 1 → ×0.33; gra bez oceny →
  mnożnik 1.
- `1 + log1p(playtime)`: dłuższy czas gry wzmacnia wkład logarytmicznie; składnik „+1"
  gwarantuje, że gra z zerowym playtime wnosi wkład (waga ≥ 1), więc średnia ważona nie
  degeneruje się do wektora zerowego. Wcześniejsza metodologia (centroid bez wag) jest
  nadal dostępna jako przypadek szczególny — bez ocen różnica sprowadza się do
  ważenia playtime'em.
- Podstawa „manual-games" (`user_favorite_games`) nie ma danych playtime — stosowany jest
  wyłącznie mnożnik oceny (`ocena/3`, bez oceny 1.0).

Obie ścieżki zapisują profil z tą samą wersją `v2-centroid`; przebudowa to istniejący
asynchroniczny job (`POST /api/user/me/embedding` + `GET /embedding/status`).

**Pliki:** `apps/backend/src/utils/rating.helpers.ts` (czyste funkcje:
`ratingStrength`, `applyRatingCorrection`, `profileWeight`), integracja w
`apps/backend/src/services/embeddings.service.ts`, odczyty w
`apps/backend/src/services/ratings.service.ts`.

## 5. Frontend

| Element | Plik | Rola |
|---|---|---|
| Serwis ocen | `apps/frontend/src/services/ratingsService.ts` | `get`/`set`/`remove`/`removeAll` na `fetchApi` |
| Hook feedbacku | `apps/frontend/src/features/recommendations/useRatings.ts` | cache ocen + mutation z efektami optymistycznymi + `resetAll` |
| Suwak oceny | `apps/frontend/src/components/ui/RatingSlider.tsx` | 1–5, commit na zwolnieniu (jeden gest = jeden zapis) |
| Komunikaty | `apps/frontend/src/context/MessageContext.ts` + `MessageProvider.tsx` | toasty (success/error/info), auto-dismiss 5 s |
| Karta rekomendacji | `features/recommendations/RecommendationCard.tsx` | suwak; propsy `rating`/`onRate` opcjonalne |
| Lista rekomendacji | `features/recommendations/RecommendationList.tsx` / `RecommendationsTable.tsx` | `useRatings({ removeFromRecommendations: true })` — widok grid i tabela |
| Biblioteka | `pages/LibraryPage.tsx` + `features/games/LibraryTable.tsx` | suwak przy grach z katalogu; `removeFromRecommendations: false`; przycisk „Reset all ratings" |
| Kreator profilu | `features/profile/ProfileWizard.tsx` | **krok „rate your games"** dla ścieżki steam-library: ocena (opcjonalna) top-10 najgranych gier przed buildem |

Zachowanie:

- **Odświeżanie po ocenie**: `onSuccess` aktualizuje optymistycznie cache `['ratings']`
  (kontrolka wypełnia się od razu) i **unieważnia `['recommendations']`** — korekta centroidu
  działa w czasie zapytania, więc zbuforowana kolejność sprzed oceny jest nieaktualna.
  W rekomendacjach dodatkowo oceniona gra znika z listy optymistycznie (`onMutate`).
- **Reset wszystkich ocen** (przycisk w bibliotece): `DELETE /api/user/me/ratings` →
  invalidacja `['ratings']` i `['recommendations']` → rekomendacje wracają do stanu
  sprzed feedbacku.
- **Krok ratingów w kreatorze**: ścieżka steam-library to teraz source → rate (top-10 najgranych
  gier z katalogu, opcjonalne) → build; oceny zapisywane w `startBuild` przez
  `Promise.allSettled` — nieudany zapis nie blokuje builda (toast o błędzie).
- **Komunikaty** — sukces: „Rating saved." / „All ratings cleared."; błąd: „Could not save
  your rating. Please try again." (aplikacja nie ma globalnego bannera błędów — toasty są
  jedynym kanałem). Stylistyka na tokenach projektu, animacja wjazdu, `aria-live="polite"`.
- React Query jest jedynym właścicielem stanu serwera (zgodnie z konwencją projektu).
- Widok listy/tabeli (grid ↔ details jak w Eksploratorze Windows, wybór zapamiętywany
  w localStorage) — patrz `docs/widok_listy_gier.md`.

## 6. Testy

`apps/backend/test/rating.helpers.spec.ts` — 15 testów na czystych funkcjach:

- `ratingStrength`: pełne mapowanie skali 1–5,
- `applyRatingCorrection`: brak ocen = kopia wejścia, neutralność 3, przyciąganie
  (wzrost podobieństwa kosinusowego), odpychanie, „5 silniej niż 4", znoszenie się
  przeciwnych ocen na tym samym wektorze, norma L2 = 1, pomijanie wektorów o złym
  wymiarze, działanie w 1536 wymiarach,
- `profileWeight`: zachowanie bez ocen/playtime, mnożnik oceny (1/3…5/3), waga
  logarytmiczna, przycinanie ujemnego playtime, iloczyn (wzory z pracy).

Razem z istniejącymi: **53 testy zielone** (`npm test`). Testy celowo nie dotykają bazy —
logika domeny jest w czystych funkcjach, a warstwa DB jest cienka.

## 7. Mapa zmian (fazy 0–2)

**Backend:** `db/scripts/migration_user_game_ratings.sql` (nowy), `bootstrap_schema.sql`,
`verify.sql`, `drizzle/schema.ts` (tabela `userGameRatings`), `shared/contracts/api.ts`
(schematy + typy), `services/ratings.service.ts` (nowy),
`services/embeddings.service.ts` (korekta + wagi), `utils/rating.helpers.ts` (nowy),
`controllers/ratings.controller.ts` (nowy), `routes/user/user.routes.ts`,
`test/rating.helpers.spec.ts` (nowy).

**Frontend:** `services/ratingsService.ts` (nowy),
`features/recommendations/useRatings.ts` (nowy), `components/ui/RatingSlider.tsx` (nowy),
`context/MessageContext.ts` + `MessageProvider.tsx` (nowe),
`features/profile/useProfileWizard.ts` + `ProfileWizard.tsx` (krok rate),
`features/recommendations/RecommendationCard.tsx` + `RecommendationList.tsx`,
`pages/LibraryPage.tsx`, `App.tsx` (MessageProvider), `index.css` (`.rating-slider`, `.messages`).

## 8. Co dalej (rozdz. „Testy i analiza wyników")

- **Ewaluacja na ocenach eksplikacyjnych**: oceny 1–5 to etykiety trafności — po zebraniu
  danych Hit Rate@K / NDCG@K liczone wobec deklaracji użytkownika. Uwaga metodologiczna:
  ocenione gry są wykluczane z kandydatów, więc do ewaluacji trzeba potraktować część ocen
  jako held-out (podział train/test), a korektę centroidu liczyć tylko na zbiorze treningowym.
- **Ewaluacja leave-one-out na playtime** (niezależna od ocen): ukryć grę o wysokim
  playtime, przeliczyć centroid bez niej, sprawdzić jej pozycję w kNN.
- **Testy wydajności**: korekta centroidu to O(n·d) w pamięci (n = liczba ocen,
  d = 1536) — niezmierzalna względem zapytania kNN; jedynym nowym zapytaniem jest join
  ocen z embeddingami po PK.

## 9. Wdrożenie

1. Dev i prod: `psql "$DATABASE_URL" -f apps/backend/src/db/scripts/migration_user_game_ratings.sql`
   (rola admin, skrypt idempotentny).
2. Kontrola: `verify.sql` → 21 tabel, 26 indeksów.
3. Deploy bez dodatkowych kroków — endpointy i kontrakty wchodzą z buildem; istniejące
   profile nie wymagają przebudowy (korekta działa od razu, wagi odczytywane przy
   następnym buildzie).
