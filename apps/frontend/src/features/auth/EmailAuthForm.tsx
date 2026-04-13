import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function EmailAuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const endpoint = mode === 'login' ? '/api/login' : '/api/register';

    await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <Input
        type="text"
        label="NAZWA UŻYTKOWNIKA STEAM"
        placeholder="Wpisz swoją nazwę"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        wrapperClassName="auth-field"
        labelClassName="auth-label"
        inputClassName="auth-input"
      />

      <Input
        type="password"
        label="HASŁO"
        placeholder="Wpisz swoje hasło"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        wrapperClassName="auth-field"
        labelClassName="auth-label"
        inputClassName="auth-input"
      />

      <div className="auth-form-meta">
        <label className="remember-me">
          <input type="checkbox" />
          <span>Zapamiętaj mnie</span>
        </label>
        <button type="button" className="auth-link-button">
          Zapomniałeś hasła?
        </button>
      </div>

      <Button type="submit" className="auth-submit">
        {mode === 'login' ? 'ZALOGUJ SIĘ' : 'ZAREJESTRUJ SIĘ'}
      </Button>

      <div className="auth-switch">
        <span>{mode === 'login' ? 'Nie masz konta?' : 'Masz już konto?'}</span>
        <button
          type="button"
          className="auth-link-button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </div>

      <p className="auth-policy">
        Klikając “Zaloguj przez Steam”, akceptujesz naszą{' '}
        <button type="button" className="auth-link-button">
          Politykę Prywatności
        </button>
      </p>
    </form>
  );
}
