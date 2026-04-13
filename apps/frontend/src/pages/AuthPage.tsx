import { SteamButton } from '../components/ui/SteamButton';
import { EmailAuthForm } from '../features/auth/EmailAuthForm';
import './AuthPage.css';

export function AuthPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__overlay" />

      <main className="auth-page__content">
        <header className="auth-page__header">
          <div className="auth-page__brand-row">
            <span className="auth-page__brand-icon" aria-hidden="true">
              🖥️
            </span>
            <h1 className="auth-page__brand">COZAGRAĆ</h1>
          </div>
          <p className="auth-page__subtitle">
            Zaloguj się, aby otrzymać spersonalizowane rekomendacje gier
          </p>
        </header>

        <section className="auth-card">
          <SteamButton className="steam-button" />

          <div className="auth-divider" role="presentation">
            <span>LUB</span>
          </div>

          <EmailAuthForm />

          <p className="auth-card__terms">
            Klikając „Zaloguj przez Steam”, akceptujesz naszą{' '}
            <a href="#" className="auth-link">
              Politykę Prywatności
            </a>
          </p>
        </section>

        <a href="/" className="auth-page__back-link">
          ← POWRÓT DO STRONY GŁÓWNEJ
        </a>
      </main>
    </div>
  );
}
