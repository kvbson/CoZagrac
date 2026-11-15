import { SteamButton } from '../components/ui/SteamButton';
import { EmailAuthForm } from '../features/auth/EmailAuthForm';

export function AuthPage() {
  return (
    <div className="auth-page">
      <h1>Discover games you&apos;ll actually like</h1>
      <p className="muted">
        Sign in and we will match you with your next favorite game based on what you play.
      </p>

      <SteamButton />

      <div className="auth-page__divider">
        <span>or</span>
      </div>

      <EmailAuthForm />
    </div>
  );
}
