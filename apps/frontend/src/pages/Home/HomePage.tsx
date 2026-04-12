import styles from './HomePage.module.css';

export function HomePage() {
  return (
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
          oparte na Twojej historii gier. Nasz algorytm znajdzie ukryte perełki idealnie dopasowane
          do Ciebie.
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
  );
}
