import { useTranslation } from 'react-i18next';
import styles from './HomePage.module.css';

type HomeArrayItem = {
  title: string;
  description?: string;
  tags?: string;
};

export function HomePage() {
  const { t } = useTranslation();
  const onboardingSteps = t('home.onboardingSteps', { returnObjects: true }) as HomeArrayItem[];
  const recommendationPillars = t('home.recommendationPillars', {
    returnObjects: true,
  }) as HomeArrayItem[];
  const keyFeatures = t('home.keyFeatures', { returnObjects: true }) as string[];

  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <div className={styles.hero__overlay} />

        <div className={styles.hero__content}>
          <h1 className={styles.hero__title}>
            {t('home.heroTitleLine1')}
            <br />
            {t('home.heroTitleLine2')} <span>{t('home.heroTitleHighlight')}</span>
          </h1>

          <p className={styles.hero__desc}>
            {t('home.heroDescription')}
            <br /> {t('home.heroDescriptionSecond')}
          </p>

          <button type="button" className={styles.hero__btn}>
            <img
              className={styles.hero__btnIcon}
              src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg"
              alt="Steam logo"
            ></img>
            {t('home.connectSteam')}
          </button>

          <p className={styles.hero__note}>{t('home.secureLogin')}</p>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statValue}>12k+</p>
          <p className={styles.statLabel}>{t('home.stats.games')}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>89%</p>
          <p className={styles.statLabel}>{t('home.stats.users')}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>350+</p>
          <p className={styles.statLabel}>{t('home.stats.tags')}</p>
        </article>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('home.howItWorks')}</h2>
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
          <h2 className={styles.sectionTitle}>{t('home.recommendTitle')}</h2>
          <p>{t('home.recommendDescription')}</p>
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
        <h2 className={styles.sectionTitle}>{t('home.whyTitle')}</h2>
        <ul className={styles.featureList}>
          {keyFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className={styles.bottomCta}>
        <h2>{t('home.ctaTitle')}</h2>
        <p>{t('home.ctaDescription')}</p>
        <button type="button" className={styles.secondaryBtn}>
          {t('home.ctaButton')}
        </button>
      </section>
    </div>
  );
}
