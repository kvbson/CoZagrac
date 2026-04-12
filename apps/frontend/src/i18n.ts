import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  pl: {
    translation: {
      nav: {
        recommendations: 'REKOMENDACJE',
        explore: 'ODKRYWAJ',
        preferences: 'PREFERENCJE',
        searchPlaceholder: 'szukaj...',
        login: 'ZALOGUJ',
        language: 'Język',
      },
      home: {
        heroTitleLine1: 'ODKRYJ SWOJĄ',
        heroTitleLine2: 'NASTĘPNĄ',
        heroTitleHighlight: 'OBSESJĘ',
        heroDescription:
          'Zaloguj się, aby połączyć swoje konto Steam i otrzymać spersonalizowane rekomendacje oparte na Twojej historii gier.',
        heroDescriptionSecond:
          'Nasz algorytm znajdzie ukryte perełki idealnie dopasowane do Ciebie.',
        connectSteam: 'POŁĄCZ KONTO STEAM',
        secureLogin: '*Bezpieczne logowanie przez OpenID',
        stats: {
          games: 'gier analizowanych tygodniowo',
          users: 'użytkowników klika rekomendację',
          tags: 'tagów i filtrów Steam',
        },
        howItWorks: 'Jak to działa',
        recommendTitle: 'Co rekomendujemy',
        recommendDescription: 'Przykładowe segmenty, które budujemy pod Twój profil gracza.',
        whyTitle: 'Dlaczego CoZagrać?',
        ctaTitle: 'Gotowy na kolejną grę, którą naprawdę skończysz?',
        ctaDescription:
          'Połącz konto Steam i sprawdź pierwszą paczkę rekomendacji w mniej niż minutę.',
        ctaButton: 'Rozpocznij personalizację',
        onboardingSteps: [
          {
            title: '1. Połącz konto Steam',
            description:
              'Logowanie przez OpenID pozwala bezpiecznie pobrać bibliotekę i historię rozgrywki.',
          },
          {
            title: '2. Ustaw preferencje',
            description:
              'Wybierz ulubione gatunki, poziom trudności, długość gry i tryb (solo/co-op).',
          },
          {
            title: '3. Odbierz rekomendacje',
            description:
              'Dostajesz shortlistę gier dopasowaną do Twojego stylu i aktualnych promocji.',
          },
        ],
        recommendationPillars: [
          {
            title: 'Ukryte perełki',
            tags: 'Roguelite • Indie • Deck Verified',
          },
          {
            title: 'Najlepsze co-op',
            tags: '2-4 graczy • Online/LAN • Voice Friendly',
          },
          {
            title: 'Dla fanów fabuły',
            tags: 'Narrative • Single-player • Choices Matter',
          },
          {
            title: 'Szybkie sesje',
            tags: 'Do 30 min • Arcade • Low commitment',
          },
        ],
        keyFeatures: [
          'Rekomendacje oparte na realnej historii gier i czasie spędzonym w tytułach.',
          'Filtry pod platformę, budżet, gatunek, ocenę społeczności i język.',
          'Wykrywanie podobnych tytułów do Twoich ulubionych serii.',
          'Personalizowane listy „zagraj dziś”, „na weekend” i „na przecenie”.',
        ],
      },
    },
  },
  en: {
    translation: {
      nav: {
        recommendations: 'RECOMMENDATIONS',
        explore: 'EXPLORE',
        preferences: 'PREFERENCES',
        searchPlaceholder: 'search...',
        login: 'LOGIN',
        language: 'Language',
      },
      home: {
        heroTitleLine1: 'DISCOVER YOUR',
        heroTitleLine2: 'NEXT',
        heroTitleHighlight: 'OBSESSION',
        heroDescription:
          'Sign in to connect your Steam account and get personalized recommendations based on your play history.',
        heroDescriptionSecond:
          'Our algorithm will find hidden gems perfectly matched to your taste.',
        connectSteam: 'CONNECT STEAM ACCOUNT',
        secureLogin: '*Secure login via OpenID',
        stats: {
          games: 'games analyzed weekly',
          users: 'of users click a recommendation',
          tags: 'Steam tags and filters',
        },
        howItWorks: 'How it works',
        recommendTitle: 'What we recommend',
        recommendDescription: 'Example segments we build for your player profile.',
        whyTitle: 'Why CoZagrac?',
        ctaTitle: 'Ready for your next game you will actually finish?',
        ctaDescription:
          'Connect your Steam account and check your first recommendation pack in under a minute.',
        ctaButton: 'Start personalization',
        onboardingSteps: [
          {
            title: '1. Connect your Steam account',
            description:
              'OpenID login safely pulls your library and play history.',
          },
          {
            title: '2. Set your preferences',
            description:
              'Choose favorite genres, difficulty, playtime length, and mode (solo/co-op).',
          },
          {
            title: '3. Get recommendations',
            description:
              'Receive a shortlist of games tailored to your style and current deals.',
          },
        ],
        recommendationPillars: [
          {
            title: 'Hidden gems',
            tags: 'Roguelite • Indie • Deck Verified',
          },
          {
            title: 'Best co-op picks',
            tags: '2-4 players • Online/LAN • Voice Friendly',
          },
          {
            title: 'For story lovers',
            tags: 'Narrative • Single-player • Choices Matter',
          },
          {
            title: 'Quick sessions',
            tags: 'Up to 30 min • Arcade • Low commitment',
          },
        ],
        keyFeatures: [
          'Recommendations based on real game history and time spent in titles.',
          'Filters for platform, budget, genre, community score, and language.',
          'Detection of similar titles to your favorite series.',
          'Personalized lists for “play today”, “weekend picks”, and “on sale”.',
        ],
      },
    },
  },
};

const storedLanguage = localStorage.getItem('language');

i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage === 'en' || storedLanguage === 'pl' ? storedLanguage : 'pl',
  fallbackLng: 'pl',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
