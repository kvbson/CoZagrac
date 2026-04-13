import { SteamButton } from '../components/ui/SteamButton';
import { EmailAuthForm } from '../features/auth/EmailAuthForm';

export function AuthPage() {
  return (
    <div className="auth-page">
      <div className="auth-overlay" />
      <div className="auth-card-shell">
        <header className="auth-header">
          <h1 className="auth-brand">
            <span className="auth-brand-icon">⌘</span>
            <span>
              <strong>CO</strong>ZAGRAĆ
            </span>
          </h1>
          <p className="auth-subtitle">
            Zaloguj się, aby otrzymać spersonalizowane rekomendacje gier
          </p>
        </header>

        <section className="auth-panel">
          <SteamButton className="steam-login">ZALOGUJ PRZEZ STEAM</SteamButton>

          <div className="auth-divider">
            <span>LUB</span>
          </div>

          <EmailAuthForm />
        </section>

        <button type="button" className="auth-back-button">
          ← POWRÓT DO STRONY GŁÓWNEJ
        </button>
      </div>
    </div>
  );
}
