import styles from './HomePage.module.css';

const topGenres = ['Roguelike', 'Co-op', 'RPG', 'Strategy', 'Survival', 'Indie'];

const featureCards = [
  {
    title: 'Profil Steam + historia',
    description:
      'Po połączeniu konta analizujemy Twoje ulubione gatunki, tempo gry, czas sesji i styl rozgrywki.',
    statLabel: 'Biblioteka',
    statValue: 'Auto-sync',
  },
  {
    title: 'Silnik rekomendacji',
    description:
      'Łączymy sygnały z Twoich gier, ocen społeczności i metadanych Steam, aby znaleźć trafniejsze propozycje.',
    statLabel: 'Dopasowanie',
    statValue: 'AI Score',
  },
  {
    title: 'Twoje odkrycia tygodnia',
    description:
      'Codziennie odświeżamy shortlistę tytułów i ukrytych perełek w Twoim budżecie oraz preferowanym czasie gry.',
    statLabel: 'Aktualizacja',
    statValue: 'Co 24h',
  },
];

const howItWorks = [
  {
    step: '1. Połącz konto Steam',
    detail: 'Bezpieczne logowanie przez OpenID – bez podawania hasła do Steam.',
  },
  {
    step: '2. Ustaw preferencje',
    detail: 'Wybierz klimat, złożoność, długość sesji i budżet na gry.',
  },
  {
    step: '3. Otrzymaj shortlistę',
    detail: 'Dostaniesz listę rekomendacji z argumentacją „dlaczego właśnie to”.',
  },
];

export function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.hero__overlay} />

        <div className={styles.hero__content}>
          <h1 className={styles.hero__title}>
            ODKRYJ SWOJĄ
            <br />
            NASTĘPNĄ <span>OBSESJĘ</span>
          </h1>

          <p className={styles.hero__desc}>
            Zaloguj się, aby połączyć swoje konto Steam i otrzymać spersonalizowane rekomendacje oparte
            na Twojej historii gier. Nasz algorytm znajdzie ukryte perełki idealnie dopasowane do Ciebie.
          </p>

          <button type="button" className={styles.hero__btn}>
            <span className={styles.hero__btnIcon} aria-hidden="true">
              🎮
            </span>
            POŁĄCZ KONTO STEAM
          </button>

          <p className={styles.hero__note}>*Bezpieczne logowanie przez OpenID</p>
        </div>
      </section>

      <section className={styles.genres} aria-label="Najpopularniejsze gatunki">
        {topGenres.map((genre) => (
          <button key={genre} type="button" className={styles.genreChip}>
            {genre}
          </button>
        ))}
      </section>

      <section className={styles.features}>
        {featureCards.map((card) => (
          <article key={card.title} className={styles.featureCard}>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <div className={styles.featureMeta}>
              <span>{card.statLabel}</span>
              <strong>{card.statValue}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.workflow}>
        <div>
          <h2>Jak to działa?</h2>
          <p>Krótki onboarding i od razu dostajesz listę gier skrojoną pod Ciebie.</p>
        </div>
        <ol>
          {howItWorks.map((item) => (
            <li key={item.step}>
              <h3>{item.step}</h3>
              <p>{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
