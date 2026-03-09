import { SteamButton } from '../components/ui/SteamButton';
import { EmailAuthForm } from '../features/auth/EmailAuthForm';

export function AuthPage() {
  return (
    <div>
      <h1>Discover games you'll actually like</h1>

      <SteamButton />

      <div>
        <span>or</span>
      </div>

      <EmailAuthForm />
    </div>
  );
}
