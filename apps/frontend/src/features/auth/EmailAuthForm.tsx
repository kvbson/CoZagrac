import { useState } from 'react';

export function EmailAuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const endpoint = mode === 'login' ? '/api/login' : '/api/register';

    await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="email-auth-form">
      <label htmlFor="email" className="email-auth-form__label">
        NAZWA UŻYTKOWNIKA STEAM
      </label>
      <input
        id="email"
        className="email-auth-form__input"
        type="email"
        placeholder="Wpisz swoją nazwę"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="password" className="email-auth-form__label">
        HASŁO
      </label>
      <input
        id="password"
        className="email-auth-form__input"
        type="password"
        placeholder="Wpisz swoje hasło"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="email-auth-form__meta-row">
        <label className="email-auth-form__remember">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Zapamiętaj mnie
        </label>

        <a href="#" className="auth-link">
          Zapomniałeś hasła?
        </a>
      </div>

      <button className="email-auth-form__submit" type="submit">
        {mode === 'login' ? 'ZALOGUJ SIĘ' : 'ZAREJESTRUJ SIĘ'}
      </button>

      <p className="email-auth-form__switch-text">
        {mode === 'login' ? 'Nie masz konta? ' : 'Masz już konto? '}
        <button
          type="button"
          className="email-auth-form__switch-button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </p>
    </form>
  );
}
