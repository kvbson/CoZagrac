# CoZagrać — konspekt prezentacji MVP (na zaliczenie przedmiotu)

Aktualna prezentacja: `prezentacja_mvp_v7.pptx` (13 slajdów, motyw ciemny CoZagrać, Roboto).
Poniżej treść slajdów i gotowe zdania do wygłoszenia — czytać lub parafrazować.

---

## Slajd 1 — CoZagrać

**Na slajdzie:** CoZagrać · MVP aplikacji rekomendującej gry Steam · Jakub Porwoł · 2026/2027

**Do powiedzenia:**
> Cześć, jestem Jakub i pokażę wam CoZagrać — aplikację, która odpowiada na jedno pytanie:
> „w co zagrać dziś wieczorem?". Rekomendacje opierają się na Twoim profilu gracza,
> a nie na tym, co kupili inni.

---

## Slajd 2 — Problem i pomysł

**Na slajdzie:**
- Problem: tysiące gier na Steamie — trudno wybrać; recenzje mówią „czy gra dobra", nie „czy pasuje tobie"
- Pomysł: gry i twój gust opisujemy jako wektory; rekomendacja = gra najbliższa twojemu gustowi, której nie masz

**Do powiedzenia:**
> Na Steamie są tysiące gier i łatwo się pogubić. Recenzje mówią, czy gra jest dobra,
> ale nie mówią, czy spodoba się właśnie tobie. Mój pomysł: opisać każdą grę i twoje
> upodobania jako wektor liczb — i rekomendować grę najbliższą twojemu gustowi,
> której jeszcze nie masz.

---

## Slajd 3 — Architektura aplikacji

**Na slajdzie:** oryginalny diagram architektury (frontend → nginx → backend → PostgreSQL+pgvector; Steam Web API i OpenAI jako usługi zewnętrzne)

**Do powiedzenia:**
> Aplikacja ma trzy warstwy: frontend w React, backend w Node z Express i bazę
> PostgreSQL z rozszerzeniem pgvector, które wyszukuje najbliższe gry. Steam Web API
> i OpenAI to usługi zewnętrzne — niczego nie hostujemy sami. Ze Steam bierzemy
> bibliotekę i czas gry, z OpenAI wektory opisów gier.

---

## Slajd 4 — Serce aplikacji

**Na slajdzie:**
- 1. Wektor gry — opis, tagi i recenzje gry jako lista liczb
- 2. Wektor użytkownika — średnia gier, które lubisz — twój gust jako jeden punkt
- 3. Wyszukiwanie — baza PostgreSQL znajduje najbliższe gry

**Do powiedzenia:**
> Serce aplikacji to trzy elementy. Po pierwsze, każda gra ma swój wektor — liczbowy
> opis z opisu gry, tagów i recenzji. Po drugie, twój profil to średnia gier, w które
> grasz najdłużej — twój gust w jednym punkcie. Po trzecie, baza szuka gry najbliższej
> temu punktowi, której nie posiadasz. To cała rekomendacja.

---

## Slajd 5 — Funkcje niezbędne (must have)

**Na slajdzie:**
- Konto użytkownika — logowanie przez Steam
- Profil = średnia gier, które lubisz
- Rekomendacje najbliższych gier
- Wdrożenie dla testowych użytkowników

**Do powiedzenia:**
> W must have wchodzą cztery rzeczy: logowanie przez Steam — dzięki temu profil buduje
> się niemal sam z biblioteki i czasu gry; sam profil; ekran rekomendacji z tytułem,
> okładką i ceną; oraz wdrożenie — bo bez działającej aplikacji nie ma czego mierzyć.

---

## Slajd 6 — Poza MVP

**Na slajdzie:**
- Ręczny wybór gier ulubionych · filtry rekomendacji · recenzje gier
- Feedback 👍/👎 · konta e-mail/hasło · limity dzienne OpenAI

**Do powiedzenia:**
> Oto funkcje, które zostawiam na później. Ręczny wybór gier to alternatywa dla Steam —
> główna ścieżka go nie potrzebuje. Filtry i recenzje to doprecyzowanie — sensowna
> lista jest i bez nich, a recenzje są dostępne w Steam po kliknięciu. Feedback 👍/👎
> to tani pomiar trafności, ale wymaga dodatkowego interfejsu. Konta e-mail to
> rezerwowa droga logowania, a limity OpenAI — zabezpieczenie kosztów przy skali.

---

## Slajd 7 — MVP vs wersja finalna

**Na slajdzie:** tabela 9 wierszy — konto, biblioteka/profil/rekomendacje, ekran wyników, katalog, wdrożenie (✓ w MVP); ręczny wybór gier, filtry, recenzje, feedback (– w MVP, ✓ w finalnej)

**Do powiedzenia:**
> Ta tabela pokazuje podział na MVP i wersję finalną. Wszystko z ptaszkiem w kolumnie
> MVP wchodzi w zakres minimum: konto, biblioteka z profilem i rekomendacjami, prosty
> ekran wyników, katalog gier i wdrożenie. Wersja finalna dodaje po kolei to, co
> omówiłem na poprzednim slajdzie.

---

## Slajd 8 — Dlaczego właśnie te funkcje w MVP

**Na slajdzie:**
- Wartość — logowanie → rekomendacje → sprawdzenie gry; każda funkcja to ogniwo łańcucha
- Koszt i czas — rdzeń na gotowych komponentach (Steam API, OpenAI, PostgreSQL), bez własnych modeli ML
- Test hipotezy — sprawdzamy, czy podobne wektory dają trafne sugestie; dodatkowe funkcje zaciemniałyby wynik
- Puenta: MVP testuje jedną hipotezę: podobne wektory = trafne sugestie

**Do powiedzenia:**
> Dlaczego akurat te funkcje? Po pierwsze, wartość: logujesz się, dostajesz
> rekomendacje, sprawdzasz grę — każdy element must have jest ogniwem tego łańcucha.
> Po drugie, koszt: rdzeń stoi na gotowych komponentach, nie trenuję żadnych modeli.
> Po trzecie, hipoteza: MVP testuje jedno — czy podobieństwo wektorów daje trafne
> sugestie. Dodatkowe funkcje tylko zaciemniałyby wynik.

---

## Slajd 9 — Metryki sukcesu MVP

**Na slajdzie:**
- Konwersja do profilu
- Kliknięcia „sprawdź w Steam"
- Retencja D7
- Koszt embeddingów / użytkownik

**Do powiedzenia:**
> Sukces MVP mierzę czterema metrykami: konwersja — ilu zalogowanych użytkowników
> faktycznie buduje profil; kliknięcia „sprawdź w Steam" — czy rekomendacje prowadzą
> do realnej decyzji; retencja po siedmiu dniach — czy ludzie wracają; i koszt
> embeddingów na użytkownika — czy model się skaluje. Liczb jeszcze nie mam —
> zbierze je wdrożenie u testowych użytkowników.

---

## Slajd 10 — Technika tworzenia MVP

**Na slajdzie:**
- Gotowe API — OpenAI Embeddings + Steam Web API — niczego nie trenujemy
- PostgreSQL + pgvector — wyszukiwanie najbliższych gier wprost w bazie
- Deployment — docker-compose na jednym serwerze

**Do powiedzenia:**
> Kilka decyzji technicznych. Nie trenuję niczego własnego — gotowe embeddingi OpenAI
> i oficjalne Steam Web API. Wyszukiwanie najbliższych gier robi pgvector wprost
> w PostgreSQL — bez osobnego silnika. Całość wdrażam dockerem na jednym serwerze.
> Aplikacja jest webowa i responsywna, więc działa też na telefonie — ma trzy ekrany.

---

## Slajd 11 — Plan po MVP

**Na slajdzie:**
- Faza 1 — walidacja: feedback 👍/👎 · konta e-mail/hasło
- Faza 2 — komfort: ręczny wybór gier · filtry · recenzje
- Faza 3 — skala: limity OpenAI · CI/CD · monitoring

**Do powiedzenia:**
> Rozwój dzielę na trzy fazy. Najpierw walidacja — feedback 👍/👎, bo to najtańszy
> pomiar trafności rekomendacji. Potem komfort — ręczny wybór gier, filtry i recenzje.
> Na końcu skala — limity kosztów, CI/CD i monitoring.

---

## Slajd 12 — Podsumowanie

**Na slajdzie:**
- Użytkownik loguje się przez Steam i od razu dostaje rekomendacje dopasowane do jego gustu
- Rdzeń zbudowany na gotowych usługach — szybki i tani w utrzymaniu
- Rekomendacje testujemy na prawdziwych użytkownikach; dalszy rozwój zależy od wyników

**Do powiedzenia:**
> Podsumowując: użytkownik loguje się przez Steam i od razu dostaje rekomendacje
> dopasowane do jego gustu. Rdzeń zbudowałem na gotowych usługach, więc jest szybki
> i tani w utrzymaniu. A dalej rozwijam aplikację tylko tam, gdzie pokażą to dane
> z prawdziwych użytkowników.

---

## Slajd 13 — Dziękuję za uwagę

**Na slajdzie:** Dziękuję za uwagę · Jakub Porwoł · CoZagrać

**Do powiedzenia:**
> Dziękuję za uwagę. Chętnie odpowiem na pytania.
