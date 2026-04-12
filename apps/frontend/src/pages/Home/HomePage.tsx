import styles from './HomePage.module.css';

const onboardingSteps = [
  {
    title: '1. Połącz konto Steam',
    description:
      'Logowanie przez OpenID pozwala bezpiecznie pobrać bibliotekę i historię rozgrywki.',
  },
  {
    title: '2. Ustaw preferencje',
    description: 'Wybierz ulubione gatunki, poziom trudności, długość gry i tryb (solo/co-op).',
  },
  {
    title: '3. Odbierz rekomendacje',
    description: 'Dostajesz shortlistę gier dopasowaną do Twojego stylu i aktualnych promocji.',
  },
];

const recommendationPillars = [
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
];

const keyFeatures = [
  'Rekomendacje oparte na realnej historii gier i czasie spędzonym w tytułach.',
  'Filtry pod platformę, budżet, gatunek, ocenę społeczności i język.',
  'Wykrywanie podobnych tytułów do Twoich ulubionych serii.',
  'Personalizowane listy “zagraj dziś”, “na weekend” i “na przecenie”.',
];

export function HomePage() {
  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <div className={styles.hero__overlay} />

        <div className={styles.hero__content}>
          <h1 className={styles.hero__title}>
            ODKRYJ SWOJĄ
            <br />
            NASTĘPNĄ <span>OBSESJĘ</span>
          </h1>

          <p className={styles.hero__desc}>
            Zaloguj się, aby połączyć swoje konto Steam i otrzymać spersonalizowane rekomendacje
            oparte na Twojej historii gier.
            <br /> Nasz algorytm znajdzie ukryte perełki idealnie dopasowane do Ciebie.
          </p>

          <button type="button" className={styles.hero__btn}>
            <img
              className={styles.hero__btnIcon}
              src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg"
              alt="Steam logo"
            ></img>
            POŁĄCZ KONTO STEAM
          </button>

          <p className={styles.hero__note}>*Bezpieczne logowanie przez OpenID</p>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statValue}>12k+</p>
          <p className={styles.statLabel}>gier analizowanych tygodniowo</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>89%</p>
          <p className={styles.statLabel}>użytkowników klika rekomendację</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>350+</p>
          <p className={styles.statLabel}>tagów i filtrów Steam</p>
        </article>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Jak to działa</h2>
        <div className={styles.stepsGrid}>
          {onboardingSteps.map((step) => (
            <article key={step.title} className={styles.infoCard}>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Co rekomendujemy</h2>
          <p>Przykładowe segmenty, które budujemy pod Twój profil gracza.</p>
        </div>

        <div className={styles.pillarsGrid}>
          {recommendationPillars.map((pillar) => (
            <article key={pillar.title} className={styles.pillarCard}>
              <h3>{pillar.title}</h3>
              <p>{pillar.tags}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dlaczego CoZagrać?</h2>
        <ul className={styles.featureList}>
          {keyFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className={styles.bottomCta}>
        <h2>Gotowy na kolejną grę, którą naprawdę skończysz?</h2>
        <p>Połącz konto Steam i sprawdź pierwszą paczkę rekomendacji w mniej niż minutę.</p>
        <button type="button" className={styles.secondaryBtn}>
          Rozpocznij personalizację
        </button>
      </section>
    </div>
  );
}
