import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { userService } from '../../services/userService';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export function EmailAuthForm() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // backend requires a 6+ char password (registerUserHttpSchema); gate the
  // button on it so the raw Zod message never reaches the user
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 6;
  const canSubmit =
    mode === 'login'
      ? email.trim() !== '' && password !== ''
      : emailOk && passwordOk && acceptedPrivacy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setLoading(true);

    const res =
      mode === 'login'
        ? await userService.login({ email: email.trim(), password })
        : await userService.register({ email: email.trim(), password, acceptedPrivacyPolicy: true });

    if (!res.success) {
      setLoading(false);
      // strip the zod path prefix ("body.password: ...") from backend messages
      const raw = res.error?.message ?? (mode === 'login' ? 'Login failed' : 'Registration failed');
      setError(raw.replace(/^body\./, ''));
      return;
    }

    // backend ustawia sesję przy login/rejestracji - pobierz zalogowanego użytkownika
    const me = await userService.checkAuth();
    if (me.success && me.userData?.userId) {
      setUser({ userId: me.userData.userId, steamLinked: me.userData.steamLinked === true });
      navigate('/', { replace: true });
    } else {
      setLoading(false);
      setError('Logged in but session check failed');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        invalid={mode === 'register' && email !== '' && !emailOk}
      />

      {mode === 'register' && email !== '' && !emailOk && (
        <p className="field-hint field-hint--error" role="status">
          Please enter a valid email address.
        </p>
      )}

      <Input
        type="password"
        placeholder={mode === 'register' ? 'Password (min. 6 characters)' : 'Password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={mode === 'register' ? 6 : undefined}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        invalid={mode === 'register' && password !== '' && !passwordOk}
      />

      {mode === 'register' && password !== '' && !passwordOk && (
        <p className="field-hint field-hint--error" role="status">
          Password must be at least 6 characters.
        </p>
      )}

      {mode === 'register' && (
        <label className="auth-form__consent">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
          />
          <span>
            <span className="req">*</span> I accept the{' '}
            <Link to="/privacy">privacy policy</Link> (what we store and why).
          </span>
        </label>
      )}

      {error && <p className="error">{error}</p>}

      <Button type="submit" disabled={!canSubmit || loading}>
        {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
      >
        {mode === 'login' ? 'Create account' : 'Already have an account?'}
      </button>
    </form>
  );
}
