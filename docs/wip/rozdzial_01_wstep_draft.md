# DRAFT — Rozdział 1. WSTĘP (wersja robocza 0.1, 2026-11-28)

> STATUS: tekst roboczy do samodzielnej redakcji studenta. NIE kopiować 1:1 do pracy —
> przepracować, uzupełnić danymi z katalogu (liczba gier, wymiar wektora) i zweryfikować
> zgodność z zatwierdzonym tematem. Zgodnie z zarządzeniem AWSB nr 140/2024/2025 § III
> treści wspierane AI muszą być oznaczone — patrz sekcja 1.4 poniżej i rejestr AI.

---

## 1.1. Cel i zakres pracy

Celem niniejszej pracy inżynierskiej jest zaprojektowanie, implementacja i wdrożenie
produkcyjne systemu rekomendacji gier komputerowych, w którym rekomendacje wynikają
z podobieństwa kosinusowego między wektorami reprezentującymi gry oraz profil użytkownika
w wielowymiarowej przestrzeni semantycznej. Gry i profil użytkownika opisywane są przez
embeddingi — gęste reprezentacje wektorowe generowane przez komercyjny model embeddingów
OpenAI (rodzina text-embedding-3, wektor o 1536 wymiarach) — a wyszukiwanie najbliższych
sąsiadów realizowane jest w relacyjnej bazie PostgreSQL z rozszerzeniem pgvector,
z wykorzystaniem indeksu HNSW.

Problem badawczy pracy można sformułować następująco: *w jakim stopniu rekomendacja
oparta na podobieństwie kosinusowym między embeddingami treści gier a ważonym centroidem
embeddingów gier użytkownika, wzmocnionym pętlą jawnej informacji zwrotnej (oceny 1–5)
korygowaną algorytmem Rocchio w czasie zapytania, prowadzi do rekomendacji uznanych za
trafne przez użytkowników, przy braku treningu dedykowanego modelu rekomendacyjnego?*

Odpowiedź na postawiony problem wymagała wykonania trzech zadań:

- budowy kompletnego, działającego systemu webowego (monorepo: backend Express,
  frontend React, baza PostgreSQL), zintegrowanego z Steam Web API oraz z API embeddingów
  OpenAI, wdrożonego na serwerze produkcyjnym (co-zagrac.pl);
- przeprowadzenia eksperymentów ewaluacyjnych na działającym systemie: testów
  poprawności (jednostkowych), testów wydajności wyszukiwania wektorowego (porównanie
  indeksu HNSW ze skanem sekwencyjnym) oraz oceny jakości rekomendacji metodą
  leave-one-out;
- analizy kosztów operacyjnych rozwiązania opartego o zewnętrzny model embeddingów
  (księgowanie zużycia tokenów w bazie danych, dzienne limity budżetowe).

Przyjęto następujące metody i techniki badawcze: (1) studia literaturowe nad systemami
rekomendacji, reprezentacjami wektorowymi i wyszukiwaniem przybliżonym; (2) metoda
projektowa — projektowanie architektury, modelu danych i interfejsu API; (3) metoda
eksperymentalna — pomiary wydajności (percentyle p50/p95, recall) oraz ewaluacja
jakości rekomendacji metrykami HR@k, MRR i NDCG@10; (4) analiza kosztowa na podstawie
danych telemetrii zapisywanych przez system.

Zakres pracy obejmuje: synchronizację katalogu gier ze Steama (opisy, taksonomia,
recenzje), mechanizm budowy wektorów gier jako ważonej kombinacji reprezentacji
cząstkowych, budowę profilu użytkownika (Źródło steam-library oraz manual-games),
pętlę informacji zwrotnej opartą o oceny użytkowników, wyszukiwarkę pełnotekstową,
warstwę frontendową oraz wdrożenie kontenerowe z automatyzacją CI/CD. Poza zakresem
pozostają: trening własnych modeli embeddingów, filtrowanie kolektywne (collaborative
filtering) oraz rekomendacje dla zalogowanych użytkowników innych platform (GOG, Epic
Games Store) — wskazane jako kierunki rozbudowy w rozdziale 8.

## 1.2. Motywacja i kontekst problemu

Platforma Steam oferuje katalog liczony w dziesiątkach tysięcy aktywnych pozycji,
przy czym każdego tygodnia publikowane są setki nowych tytułów [źródło: Steam
Steamworks / statystyki SteamDB — zweryfikować i przytoczyć]. Użytkownik posiadający
kilkaset gier w bibliotece nie jest w stanie samodzielnie prześledzić nawet ułamka
nowości; klasyczne listy bestsellerów i promocji uwzględniają popularność, lecz nie
indywidualne preferencje. Zjawisko przeciążenia informacyjnego (information overload)
jest jednym z klasycznych uzasadnień stosowania systemów rekomendacyjnych [1 — Ricci
i in.], a domena gier komputerowych dodatkowo utrudnia zadanie: o preferencjach gracza
nie świadczą wyłącznie gatunki zadeklarowane, lecz także niuansowane cechy treściowe
gry (klimat opisu, elementy mechanik, wydźwięk recenzji społeczności).

Inspiracją tematu były doświadczenia własne z platformą Steam (szeroki katalog,
trudność odkrywania tytułów dopasowanych do gustu) oraz dostrzeżona możliwość
zastosowania technologii, które w ostatnich latach zmieniły krajobraz systemów
informacji zwrotnej: gęstych reprezentacji wektorowych (embeddingów) generowanych
przez modele językowe oraz wektorowych rozszerzeń relacyjnych baz danych (pgvector),
pozwających wykonywać wyszukiwanie najbliższych sąsiadów bezpośrednio na bazie
aplikacyjnej, bez osobnej infrastruktury dedykowanych baz wektorowych.

Proponowane rozwiązanie ma charakter treściowy (content-based): rekomenduje gry
podobne do tych, które użytkownik ocenia dobrze — bez konieczności istnienia wspólnej
historii ocen wielu użytkowników, co eliminuje problem zimnego startu po stronie
pozycji [8 — Panda, Ray] i pozwala rekomendować także gry świeżo dodane do katalogu,
dla których nie istnieje historia interakcji.

## 1.3. Struktura pracy

*(sekcja do potwierdzenia u promotora — czy wymagana)*

Praca składa się z dziewięciu rozdziałów. Rozdział 2 przedstawia przegląd technologii
i narzędzi: mechanizmy Steam OpenID i Steam Web API, klasyfikację systemów
rekomendacyjnych, genezę reprezentacji wektorowych od modelu przestrzeni wektorowej
po embeddingi kontekstowe, bazy wektorowe oraz wykorzystany stack aplikacyjny.
Rozdział 3 formułuje wymagania funkcjonalne i niefunkcjonalne systemu wraz ze
scenariuszami użycia. Rozdział 4 opisuje projekt systemu: architekturę, model bazy
danych, przepływ danych, projekt API, mechanizmy autoryzacji i integrację ze Steam.
Rozdział 5 opisuje implementację poszczególnych mechanizmów. Rozdział 6 zawiera
wyniki testów poprawności i wydajności oraz analizę jakości rekomendacji.
Rozdział 7 przedstawia wdrożenie produkcyjne (konteneryzacja, serwer VPS z nginx,
automatyzacja CI/CD). Rozdział 8 wskazuje możliwości rozbudowy, a rozdział 9
podsumowuje pracę i odpowiada na postawiony problem badawczy.

## 1.4. Wykorzystanie narzędzi sztucznej inteligencji

*(sekcja zgodna z zarządzeniem Rektora AWSB nr 140/2024/2025 § III; przełącznik:
„we wstępie lub w rozdziale metod badawczych" — umieszczona we wstępie)*

Zgodnie z zarządzeniem Rektora Akademii WSB nr 140/2024/2025 z dnia 11 kwietnia 2025 r.
w sprawie zasad wykorzystania narzędzi sztucznej inteligencji w procesie kształcenia
(https://... — link do zarządzenia na stronie uczelni) w przygotowaniu pracy
wykorzystano następujące systemy AI:

| System (link) | Data | Cel użycia | Zakres materiału | Modyfikacje |
|---|---|---|---|---|
| [Claude / agent OpenCode — uzupełnić nazwę i link] | [daty sesji] | eksploracja tematu, tworzenie konspektów rozdziałów, wsparcie implementacji i dokumentowania kodu (repozytorium projektu), edytowanie tekstu | konspekty i szkielet dokumentu; tekst rozdziałów redagowany samodzielnie | wszystkie fragmenty zweryfikowane i zmodyfikowane przez autora |
| [nazwa, jeśli inne narzędzie] | | | | |

Treść rozdziałów merytorycznych, wyniki badań i wnioski stanowią samodzielną pracę
autora; materiały wygenerowane przez systemy AI (konspekty, propozycje redakcyjne)
były każdorazowo weryfikowane, modyfikowane i uzupełniane. Odpowiedzialność za
rzetelność odwołań do źródeł ponosi autor; wszystkie pozycje bibliograficzne zostały
zweryfikowane w oryginalnych publikacjach (audyt przypisów: 2026-11-28).

---

### Notatki do redakcji (do usunięcia)

1. **Liczby do uzupełnienia z bazy**: aktualna liczba gier w katalogu (game_info),
   liczba embeddingów (game_embeddings), liczba użytkowników/profili — podać w 1.1
   przy opisie eksperymentów (rozdz. 6 poda pełną metodologię).
2. **Steam stats w 1.2**: znaleźć wiarygodne źródło liczby aplikacji Steam (Steamworks
   lub publikacje) — nie podawać z pamięci.
3. **Temat pracy**: tytuł w szkieletu jest roboczy — musi być zgodny z zatwierdzonym
   tematem z systemu dyplomowania.
4. **Zarządzenie AI**: znaleźć publiczny link do zarządzenia nr 140/2024/2025 na
   stronie AWSB (w repo jest tylko lokalny PDF).
5. **Rejestr AI**: prowadzić na bieżąco (docs/wip/rejestr_ai.md?) — każda sesja
   z agentem: data, cel, zakres. Tabela w 1.4 powstanie z rejestru.
6. Numeracja przypisów [1], [8] — ostatecznie przypisy dolne TNR 10 wg standardu.
