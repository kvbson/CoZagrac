# CoZagrac — prezentacja MVP (konspekt slajd po slajdzie)

Format: **13 slajdów + 1 rezerwowy, ~10–12 min**. Każdy slajd zawiera: tytuł, bullety
(do wklejenia), notatkę prelegenta (co mówić) i opis grafiki (co narysować/wstawić).

**Do uzupełnienia przed prezentacją (placeholdery oznaczone `[UZUPEŁNIJ]`):**
- 4 zrzuty ekranu z działającej aplikacji (lista przy slajdzie 7),
- realne liczby katalogu: `SELECT count(*) FROM game_info;` i `... WHERE is_candidate;`
- liczba wygenerowanych embeddingów: `SELECT count(*) FROM game_embeddings;`

---

## Slajd 1 — Strona tytułowa

**Treść na slajdzie:**
- **CoZagrac**
- *Gry dobrane na podstawie Twojego profilu*
- MVP aplikacji rekomendującej gry Steam · [data, imię i nazwisko]

**Notatka (20 s):** „CoZagrac odpowiada na pytanie ‚w co zagrać dziś wieczorem'. Nie na podstawie
tego, co kupili inni — tylko na podstawie profilu Waszych własnych zwyczajów gamingowych."

**Grafika:** logo / zrzut karty aplikacji na ciemnym tle (najładniejszy kadr z demo).

---

## Slajd 2 — Problem

**Treść na slajdzie:**
- Steam: ponad 100 000 gier — paradoks wyboru
- Filtry (gatunek, cena) nie mówią, czy gra **Tobie** się spodoba
- Algorytmy sklepu sugerują to, co **kupić** — nie to, w co **zagrasz**

**Notatka (45 s):** Rozwinąć frustrację gracza: „milion gier i nic w co zagrać". Sklep monetyzuje
sprzedaż, nie trafność. Znajomi polecają losowo, Reddit/YouTube to szum. Brakuje narzędzia,
które zna *Ciebie*.

**Grafika:** zrzut ekranu przeglądarki Steam z setkami kafelków (symbol nadmiaru).

---

## Slajd 3 — Rozwiązanie w jednym zdaniu

**Treść na slajdzie:**
- Logujesz się kontem Steam → budujemy **Twój profil preferencji** → dostajesz gry,
  których **jeszcze nie posiadasz**, dobrane do Twojego gustu
- Profil budujemy z **czasu, który realnie spędzasz w grach** — nie z listy zakupów
- Dobranie odbywa się na poziomie **znaczenia** (opisy i recenzje), nie wspólnych tagów

**Notatka (45 s):** Podkreślić: MVP dowodzi, że da się bez ręcznych tagów, bez historii zakupów
i bez ankiety „co lubisz" — wystarczy biblioteka Steam i model językowy.

**Grafika:** ikony w przepływie: [ikona Steam] → [odcisk palca / radar preferencji] → [pad z plusem].

---

## Slajd 4 — Co dokładnie czytamy z profilu użytkownika

**Treść na slajdzie:**
- **Biblioteka Steam** — pełna lista posiadanych gier (publiczna, przez Steam Web API)
- **Godziny spędzone w każdej grze** (playtime) — najmocniejszy sygnał: nie „kupiłem", a „grałem"
- **Top 50 gier wg godzin** — rdzeń profilu; 50. gra z 8 h waży tyle, co pierwsza
- **Charakter tych gier** — gatunki, cechy i sentyment recenzji, zakodowane wektorowo
- **Zbiór wykluczeń** — wszystko co już masz, nigdy nie trafi do rekomendacji
- Klient Steam API ma już gotowe endpointy na kolejne sygnały (aktywność 2 tyg., osiągnięcia)

**Notatka (60 s):** To kluczowy slajd produktu: profil to NIE ankieta i NIE historia zakupów,
tylko twarde dane o zachowaniu. Godziny = dowód zainteresowania; recenzje gier, w które gramy,
uczą model czym jest „nasz typ gry". Rozbudowa profilu to podłączenie gotowych endpointów,
nie budowa od zera. Świadoma decyzja MVP: biblioteka musi być **publiczna** — jedyny warunek wejścia.

**Grafika:** „karta profilu" — po lewej awatar i lista gier z paskami godzin, strzałki do
słupków: Gatunki / Tryby / Sentyment recenzji → zbita w jeden „odcisk gustu" (heksagon/radar).

---

## Slajd 5 — Czym to się różni od „kupiły to też osoby…"

**Treść na slajdzie:**
- Rekomendacje **treściowe** (content-based), nie zakupowe
- Gramy na embeddingach: opis + cechy + recenzje **pozytywne i negatywne** (negatywne z wagą
  ujemną — uczymy się też, co odstrasza)
- Profil liczony z **gustu**, nie z portfela — darmowe grille i tanie indie nie zniekształcają wyniku
- Efekt: rekomendacje spoza bańki — dopasowanie ważne, popularność drugorzędna

**Notatka (45 s):** Porównać z „people who bought X": tam popularność napędza popularność.
U nas gra niszowa o profilu „twoich 50 gier" wygrywa z top100 sprzedażową.

**Grafika:** dwa koszyki — po lewej etykieta „algorytm zakupowy: poleca bestsellery",
po prawej „CoZagrac: poleca pasujące"; między nimi znak ≠.

---

## Slajd 6 — MVP: pięć ścieżek użytkownika

**Treść na slajdzie:**
1. Wejście jednym klikiem przez **Steam** (alternatywnie e-mail)
2. **„Build my profile"** — aplikacja czyta bibliotekę i buduje profil
3. **Tablica rekomendacji** — karty gier z % dopasowania, cena, okładka; „Load more"
4. **Karta gry** — opis, screeny, recenzje graczy z możliwością sortowania
5. **„Similar games"** — polecaj dalej od punktu, który już znasz i lubisz

**Notatka (45 s):** Każda ścieżka działa end-to-end na produkcji kodu — to nie makieta.
Kolejność = kolejność demo za chwilę.

**Grafika:** oś 5 kroków z ikonami (klucz Steam → różdżka → siatka kart → lupa → rozgałęzienie).

---

## Slajd 7 — Demo (zrzuty ekranu)

**Treść na slajdzie:** same zrzuty, podpisy:
- „Ekran logowania Steam"
- „Budowa profilu / pusty stan"
- „Tablica rekomendacji: % dopasowania + ceny"
- „Karta gry: recenzje i gry podobne"

**[UZUPEŁNIJ — 4 screenshoty]:** uruchom `npm run dev`, zaloguj Steamem, wykonaj kolejno:
(1) `/auth`, (2) stan „No profile yet", (3) `/recommendations` zapełniony, (4) `/games/<appid>`
z widoczną sekcją recenzji i „Similar games".

**Notatka (2–3 min — tu jest demo na żywo lub jego nagranie):** Pokazać: login → budowa profilu →
przewinięcie kilku stron „Load more" → wejście w grę → sortowanie recenzji → klik „similar".
Jeśli demo na żywo ryzykowne (katalog/konta), nagrać 90-sekundowy ekran wcześniej.

**Grafika:** 4 zrzuty w układzie 2×2.

---

## Slajd 8 — Jak to działa (wersja dla człowieka)

**Treść na slajdzie:**
- Każda gra w katalogu ma **„odcisk"**: opis + gatunki/cechy + głos recenzentów → jeden wektor (AI)
- Twój profil = **środek ciężkości odcisków** 50 gier, w które grasz najdłużej
- Rekomendacja = gra o **najbliższym odcisku**, której nie masz w bibliotece
- % na karcie to realne podobieństwo wektorowe, nie marketing

**Notatka (60 s):** Jedno zdanie o przestrzeni wektorowej: „gry o podobnym charakterze leżą
obok siebie — niezależnie od gatunku czy ceny". Nie wchodzić w HNSW/cosine na tym slajdzie;
jeśli padnie pytanie techniczne — slajd rezerwowy.

**Grafika:** mapa 2D kropek (gry), gwiazdka = Twój profil, okrąg najbliższych sąsiadów,
 jedna przekreślona kropka = „już posiadasz".

---

## Slajd 9 — Skąd bierzemy dane i dbamy o ich jakość

**Treść na slajdzie:**
- Oficjalne **Steam Web API + Store API** (legalnie: publiczne dane, zgoda użytkownika przy loginie)
- Pipeline synchronizacji: szczegóły → recenzje → embeddingi (odporny na błędy, retry)
- Filtr jakości: rekomendujemy tylko gry dobrze udokumentowane recenzjami
  (progi S/A/B, min. ~1000 recenzji) — katalog: **[UZUPEŁNIJ: N] gier, [N] embeddingów**

**Notatka (45 s):** Uzasadnić progi: gra z 20 recenzjami to za mało sygnału — jakość poleceń
bije ilość (Quality over Quantity). Embeddingi liczone raz per gra → koszt kontrolowany.

**Grafika:** lejek: cała para Steam → kandydaci z recenzjami → embeddingi → dostępni do rekomendacji.

---

## Slajd 10 — Architektura w 30 sekund (dla weryfikacji technicznej)

**Treść na slajdzie:**
- Frontend: React + TypeScript; Backend: Node/Express; Wspólny **kontrakt API** walidowany
  schematem Zod po obu stronach (ten sam kod pilnuje kształtu danych)
- Baza: PostgreSQL + **pgvector** — indeks HNSW, wyszukiwanie sąsiadów w milisekundach
- Integracje: Steam (OpenID + Web API), OpenAI Embeddings

**Notatka (30 s):** Jeden argument jakości: zmiana kontraktu wywala kompilację na froncie —
typy trzymane centralnie eliminują klasę błędów „API zwróciło coś innego niż się spodziewaliśmy".

**Grafika:** 3 klocki (frontend / backend / shared-typ) + strzałki do PG i światów zewnętrznych
(Steam, OpenAI).

---

## Slajd 11 — Zakres MVP: rdzeń vs świadome cięcia

**Treść na slajdzie (dwie kolumny):**

*Bez tego aplikacja się nie obejdzie (rdzeń):*
- **Publiczna biblioteka Steam + klucz Steam API** — bez danych o zwyczajach nie ma profilu
- **Model embeddingów (OpenAI)** — bez niego zostają tylko tagi = wracamy do filtrów ze slajdu 2
- **PostgreSQL + pgvector** — bez indeksu HNSW nie wyskalujemy ponad tysiące gier
- **Zsynchronizowany katalog z recenzjami** — pusty katalog = brak czego rekomendować
- **Logowanie/sesja** — profil musi mieć właściciela

*Świadomie poza MVP:*
- Ceny, promocje, filtry, widok biblioteki — dekoracja karty / plan P2, nie sygnał dopasowania
- Panel recenzji i „Similar games" — wartość dodana po kliknięciu, rdzeń działa bez nich
- **Dodatkowe media** (trailery, streamy) i **inne platformy** (Epic, GOG, Game Pass) —
  MVP opiera się na jednym źródle zachowania (Steam)

**Notatka (60 s):** Lewa kolumna to mapa zależności: każda pozycja to punkt awarii CAŁEJ pętli
wartości. Prawa to filozofia cięcia: jeśli element nie karmi rdzeniowej pętli (profil →
dopasowanie → klik), w MVP go nie ma — ale nie znaczy, że go nie będzie: media i platformy
łączą się z tym samym modelem profilu (graj = sygnał) i mają gotową ścieżkę rozwoju (slajd 12).

**Grafika:** po lewej łańcuch zębaty (5 kół, „brak = ✗"), po prawej walizka „MVP" z rdzeniem
i wieszak z odrzuconymi elementami w dwóch grupach.

---

## Slajd 12 — Świadome ograniczenia i plan rozwoju

**Treść na slajdzie:**

*Ograniczenia (znane, policzone, z planem):*
- Profil liczony **synchronicznie** — przy dużej bibliotece request czeka (limit 70 s)
  → w planie: kolejka ze statusem „liczymy Twój profil…"
- Prywatna biblioteka Steam = brak profilu → komunikat + zachęta do upublicznienia
- Zimny start katalogu — nowe gry czekają na synchronizację → harmonogram odświeżania
- Kursor paginacji i zmienność modelu — zabezpieczone wersjonowaniem embeddingów

*Plan rozwoju:*
- **P2:** filtry rekomendacji, widok biblioteki, asynchroniczny profil, recenzje/similar w API
- **Średni termin:** pętla sprzężenia (👍/👎 → dopalenie profilu), uzasadnienie rekomendacji,
  metryki trafności (precision@k), CI/CD + testy E2E
- **Długi termin:** Epic/GOG/Game Pass jako kolejne sygnały, media w embeddingach, hybryda
  z filtrem kolaboratywnym

**Notatka (60 s):** Każde ograniczenie pokazać jako „wiemy, mamy ownera w roadmapie" —
wiarygodność produktu, nie ukrywanie problemów. Plan: architektura nie blokuje rozwoju —
dodatkowe źródła zachowania doklejają się do profilu jako kolejne sygnały czasu gry.

**Grafika:** u góry tabela ryzyko → mitigacja (2 kolumny), u dołu droga na 3 stacje
(P2 → sprzężenie/produkcja → multi-platform hybrid).

---

## Slajd 13 — Jak zmierzymy sukces + podsumowanie

**Treść na slajdzie:**

*Metryki MVP:*
- **CTR kart** — % wejść w kartę z tablicy (cel: > 15%)
- **Kliknięcia „View on Steam"** — realna intencja zagrania
- **Powrót w 7 dni** — profil ma wartość tylko jeśli się wraca
- **Precision@50 offline** — na trzymanej części biblioteki (część badawcza pracy)

*Podsumowanie:*
- Działające **MVP end-to-end**: Steam login → profil → rekomendacje → karta gry → recenzje
- 5 twardych zależności definiujących produkt; zakres świadomie docięty z gotową ścieżką rozwoju
- **Nie budujemy kolejnej przeglądarki Steam — budujemy profil gracza i na nim skalujemy produkt**

**Notatka (45 s):** Metryki do wdrożenia wraz z analityką — MVP dostarcza zdarzenia, które je
liczą (wyświetlenie karty, klik, wejście na Steam). Domknąć tezą i podziękować; pytania.

**Grafika:** 4 kafle wskaźników u góry; u dołu powtórzenie pętli wartości ze slajdu 3
+ kod QR do repo/demo.

---

## Slajd 14 (rezerwowy — na pytania techniczne)

- Embeddingi: model OpenAI 1536-wym., normalizacja L2; wagi: opis 0.4–0.5, taksonomia 0.15,
recenzje +0.7 reszty / −0.05·pokrycie (negatywne), profil = centroid top-50 (bez wag),
kNN `1 − cosine`, indeks HNSW (cosine), wersjonowanie embeddingów `v1`/`v2-centroid`.
**Notatka:** wchodzić tu tylko na pytanie komisji/technicznej — na głównej prezentacji nie.

---

## Wskazówki techniczne do wykonania slajdów

- Fonty duże (min. 24 pt), 1 myśl na slajd; bullety powyżej — skracać do słów-kluczy, resztę mówić z notatek.
- Zrzuty robić w trybie ciemnym aplikacji (spójne tło), przeglądarka w oknie 1280×800 bez zakładek.
- Slajd 11 zrób jako dwie kolumny (rdzeń | cięcia), slajd 12 jako dwie sekcje (ryzyka | roadmapa) —
  czytelniejsze niż osobne slajdy.
- Jeśli demo na żywo: mieć otwarte drugie konto z już zbudowanym profilem jako plan B.
