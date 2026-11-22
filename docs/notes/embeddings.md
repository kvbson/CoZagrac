# Embedding gry — jak działa agregacja (embeddings.service.ts, kroki 5–7)

Wyjaśnienie fragmentu `apps/backend/src/services/embeddings.service.ts`
(pomocniki: `apps/backend/src/utils/embedding.helpers.ts`).

## Skąd się biorą dane wejściowe

Kroki 1–4 (wyżej w pliku) produkują **4 embeddingi z OpenAI**, każdy jako osobny `number[1536]`:

| Wektor | Z czego pochodzi |
|---|---|
| `descriptionVec` | tekst opisu gry (short + about, max ~4300 znaków) |
| `taxonomyVec` | gatunki + kategorie ("Game characteristics: …") |
| `positiveVec` | **średnia** embeddingów chunków pozytywnych recenzji |
| `negativeVec` | **średnia** embeddingów chunków negatywnych recenzji (może nie istnieć) |

Recenzje są chunkowane (`chunkReviews`, po 5 szt.), bo jeden request embeddingowy ma limit
tokenów — stąd `positiveRes.data` to **wiele** wektorów i trzeba je uśrednić. To robi
`meanOrZero`: sumuje komponent po komponencie i dzieli przez liczbę wektorów. Case „zero"
(pusta tablica → wektor zerowy) jest defensywny — wywołanie jest chronione ternary
`positiveRes ? ... : null`.

## Dynamiczna waga opisu (krok 6)

```ts
const descQuality = clamp((descLen - 800) / 2200, 0, 1);
const descriptionWeight = 0.4 + 0.1 * descQuality;
```

Ideą jest: **dłuższy, rozbudowany opis to lepszy sygnał** o grze niż opis dwuzdaniowy.
Rampa liniowa:

- opis ≤ 800 znaków → quality 0 → waga **0.4**
- opis ≥ 3000 znaków → quality 1 → waga **0.5**
- pomiędzy → proporcjonalnie

Krótki marketingowy opis bywa nieinformatywny ("Ever wanted to be a ninja? Buy now!"),
a pełny "About the game" faktycznie opisuje mechaniki — stąd zaufanie do opisu rośnie
z jego długością.

## Budżet wag i waga ujemna

```
reviewBaseWeight = 1 − descriptionWeight − 0.15   // reszta budżetu, 0.35–0.45
positiveWeight   = reviewBaseWeight × 0.7          // ~0.25–0.32
negativeWeight   = −0.05 × negativeCoverage        // zawsze ≤ 0
```

- **positiveWeight**: recenzje graczy dostają 70% tego, co zostało w budżecie — celowo
  mniej niż opis, bo opis to "wyselekcjonowana" opinia dewelopera, a recenzje są
  zróżnicowane i szumne.
- **negativeWeight jest UJEMNY** — wektor negatywnych recenzji jest **odejmowany** od
  kompozycji, czyli embedding finalny jest *odpychany* od tego, czego gracze w grze nie
  lubią. To ten sam styl Rocchio co w profilu użytkownika (`rating.helpers.ts` — 1–2
  gwiazdki odpychają).
- **negativeCoverage** = ile negatywnych recenzji faktycznie znaleziono względem limitu
  (`MAX_NEGATIVE_REVIEWS`). Gra z jedną marką recenzją dostaje karę −0.005, gra z pełnym
  wiaderkiem negatywów −0.05 — kara skaluje się z wiarygodnością dowodu.

## Pułapka: wagi NIE muszą sumować się do 1

`weightedMean` (`embedding.helpers.ts`, linia 18) **samo re-normalizuje** przez sumę
wartości bezwzględnych:

```ts
const totalWeight = items.reduce((s, i) => Math.abs(s) + Math.abs(i.weight), 0);
const normalizedWeight = weight / totalWeight;
```

Czyli te liczby to **proporcje i znaki**, nie bezwzględny budżet. `1` jako suma w kroku 6
to tylko wygodny sposób wymyślenia proporcji — mogłoby być 40/15/28/−5 i wynik byłby
identyczny.

Efekt dla typowej gry (descW = 0.45, coverage ≈ 70%):

- opis ≈ 49% kierunku wektora
- recenzje pozytywne ≈ 31%
- taksonomia ≈ 16%
- recenzje negatywne ≈ **−3.8%** (odejmowane)

## `.filter(Boolean) as ...` — składanie finalnego wektora

```ts
[
  { vec: descriptionVec, weight: descriptionWeight },            // zawsze jest
  positiveVec && { vec: positiveVec, weight: positiveWeight },   // null gdy brak pozytywów
  negativeVec && { vec: negativeVec, weight: negativeWeight },   // null gdy brak negatywów
  { vec: taxonomyVec, weight: taxonomyWeight },                  // zawsze jest
].filter(Boolean) as { vec: number[]; weight: number }[]
```

`false && obj` daje `null`/`false`, więc `.filter(Boolean)` usuwa komponenty, których nie
udało się zbudować (gra bez recenzji — częste, bo `negativeRes`/`positiveRes` są `null`
gdy chunki puste). Cast `as` jest potrzebny, bo TS nie domyka typów przez
`filter(Boolean)`.

Gra bez recenzji → kompozycja to opis + taksonomia z ich względnymi wagami (0.4–0.5 vs
0.15, po re-normalizacji ~75%/25%).

## `l2Normalize` — po co

Finalny wektor jest skalowany do **długości 1**:

1. KNN przez pgvector `<=>` (odległość kosinusowa) — normalizacja sprawia, że
   `1 - (embedding <=> v)` to czysta miara kosinusowa, bez zależności od długości wektora.
2. Wszystkie gry są w **jednakowej skali** — porównanie profilu z grą nie jest zaburzane
   przez to, że jedna gra miała więcej recenzji (dłuższy mix → dłuższy wektor przed
   normalizacją).

Log `[GAME_EMBEDDINGS][VECTOR]` z `normApprox` służy do weryfikacji, że normalizacja
zadziałała (≈1.0000).

## TL;DR

**Embedding gry = kierunek zbudowany z proporcji: opis (~50%) + dobre recenzje (~30%) +
taksonomia (~16%), skorygowany w dół o to, czego gracze nie lubią (~−4%); waga opisu rośnie
z długością opisu, kara za negatywy rośnie z ich ilością. Wszystko znormalizowane do
jednostki, żeby kosinus działał.**

## Znany corner case

Gdy gra ma negatywy, ale nie ma pozytywów (`positiveRes === null`, `negativeRes` istnieje),
`negativeWeight` liczony jest niezależnie od `reviewBaseWeight` — „reszta budżetu"
(0.35–0.45) wyparowuje, a jedyny ślad recenzji to mała kara ujemna. Po re-normalizacji gra
bez pozytywów ma opis/taksonomię mocniej domieszkane. Prawdopodobnie zamierzone (brak
pozytywnego sygnału ≠ pozytywny sygnał o zerze), ale warto wiedzieć, że tak działa.
