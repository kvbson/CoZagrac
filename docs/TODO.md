# TODO — praca inżynierska CoZagrac

> Stan: listopad 2026. Kod fazy 0–2 (oceny), widok listy, harness ewaluacji — gotowe.
> Szczegóły implementacji: `docs/oceny_uzytkownika_petla_informacji_zwrotnej.md`,
> plan ustaleń: `~/.opencode/plan`.

## 1. Materiał do rozdziału 6 (badania) — PRIORYTET

- [ ] **Uruchomić `npm run eval:loo`** (z `apps/backend`, wymaga `.env` + tunelu SSH) —
      leave-one-out na realnych kontach Steam; wynik: `docs/pomiary/leave-one-out-<data>.md`
- [ ] **Uruchomić `npm run eval:bench`** — HNSW vs seq scan, FTS GIN vs seq, p50/p95,
      recall przy `ef_search` 40/100; wynik: `docs/pomiary/benchmark-<data>.md`
- [ ] **Uzupełnić metodologię w wygenerowanym MD**: spec VPS (CPU/RAM), wersja PostgreSQL,
      `shared_buffers`, liczba gier/wektorów/profili (skrypt podaje część)
- [ ] **Uruchomić `npm run eval:cost`** — koszt katalogu w tokenach/$
      (`docs/pomiary/catalog-cost-<data>.md`)
- [ ] **Wariant eksplikacyjny 80/20** — sam się aktywuje w `eval:loo`, gdy profil ma
      ≥ 10 ocenionych gier z katalogu
- [ ] **Zebrać oceny od znajomych** (im więcej, tym mocniejszy rozdz. 6.3) — suwaki są
      na kartach rekomendacji, w bibliotece, na stronie gry i w kroku wizarda

## 2. Deployment

- [ ] **Migracja na prod**: `psql "$PROD_DB" -f apps/backend/src/db/scripts/migration_user_game_ratings.sql`
      (idempotentna; potem `verify.sql` → oczekiwane **21 tabel / 26 indeksów**)
- [ ] Push na `dev` → CI (`.github/workflows/deploy.yml`) → smoke test na VPS
      (rejestracja ze zgodą, ocena gry, rekomendacje po ocenie, reset ocen)
- [ ] Sprawdzić, że `PageTracking`/`ConsentBanner` nie blokują rejestracji przy checkboxie

## 3. Kod — drobne pozostałości

- [ ] Przejrzeć diff przed commitem — **kolizja z pracą równoległą**: moja sesja
      chwilowo nadpisała `PrivacyPage.tsx` (przywrócone z HEAD); zweryfikować
      `EmailAuthForm`, `contracts/api.ts`, `auth.controller.ts`, `Navbar`, `App.tsx`
- [ ] **E2E ręczny przepływ ocen**: rekomendacja → ocena → znika z listy →
      nowa kolejność po refetchu; biblioteka → ocena → zostaje; reset → stan wyjściowy
- [ ] Recenzje: potwierdzić na dev, że pusta strona to `200 {items: []}` (frontend nie
      mapuje już 404)
- [ ] (opcjonalnie) Testy frontendu (Testing Library) — RatingSlider, useRatings;
      w pracy można opisać zakres uczciwie

## 4. Pisanie pracy (rozdziały wg ustalonego spisu treści)

- [ ] **1. Wstęp** (numeracja: wstęp = rozdz. 1, podsumowanie = rozdz. 9 — ustalone
      2026-11-28; dopytać promotora tylko: czy wymagana sekcja „Struktura pracy")
- [ ] **2. Przegląd technologii** (2.1–2.5; uwaga: „modele językowe" → doprecyzować,
      że używamy wyłącznie embeddingów)
- [ ] **3. Analiza wymagań** (3.1–3.3; niefunkcjonalne: limity OpenAI z kodu)
- [ ] **4. Projekt systemu** (4.1–4.6; do 4.5 wchodzi audyt danych + zgoda)
- [ ] **5. Implementacja** (5.1–5.7; materiał: kod + `docs/oceny_uzytkownika_...md`
      + `docs/wdrozenie_aplikacji_vps.md` + `docs/widok_listy_gier.md` jeśli istnieje)
- [ ] **6. Testy i analiza wyników** — po uzupełnieniu sekcji 1 tego TODO;
      pamiętać o akapicie „test wykrył błąd weightedMean" (6.1)
- [ ] **7. Wdrożenie** (runbook + nginx + CI/CD)
- [ ] **8. Możliwość rozbudowy** (skalowanie, re-ranking, kolejne źródła;
      kolumny tabeli z sugestii agenta: rok wydania, platformy, gatunki…)
- [ ] **9. Podsumowanie i wnioski**
- [ ] **Części końcowe**: bibliografia (wzory WSB: wydawnictwa zwarte / artykuły /
      akty prawne / netografia z datą dostępu), wykaz tablic, wykaz rysunków,
      wykaz załączników (Załącznik A: instrukcja uruchomienia + struktura repo) —
      dodane do spisu treści 2026-11-28, wymagane pkt V.1.f–i zasad i sekcją VIII standardu
- [ ] Spójność metodologii: „centroid ważony" wszędzie (było „bez wag") — README
      i AGENTS.md już zaktualizowane

## 5. Znane drobiazgi techniczne (nietypowane)

- Caveat kursora po zmianie ocen w trakcie paginacji (udokumentowany w kodzie
  `embeddings.service.ts`) — opisać w 5.7 jako świadomy kompromis
- `schema.ts` (drizzle) utrzymywany ręcznie — po stabilizacji schematu rozważyć
  `npm run schema_gen -w backend` i przegląd diffu
- Koszt w `eval:cost` liczony po stałej $0.02/1M — jeśli zmieni się cennik,
  zaktualizować `PRICE_PER_1M_TOKENS`


!!!!!!!!!!!
# LINK DO SESJI OPENCODE
opencode -s ses_e20921839ffeJ8jpUQQe8ZaB9Z