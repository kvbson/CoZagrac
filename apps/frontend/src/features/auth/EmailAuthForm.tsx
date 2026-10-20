import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res =
      mode === 'login'
        ? await userService.login({ email, password })
        : await userService.register({ email, password });

    if (!res.success) {
      setLoading(false);
      setError(res.error?.message ?? (mode === 'login' ? 'Login failed' : 'Registration failed'));
      return;
    }

    // backend ustawia sesję przy login/rejestracji - pobierz zalogowanego użytkownika
    const me = await userService.checkAuth();
    if (me.success && me.userData?.userId) {
      setUser({ userId: me.userData.userId });
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
      />

      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />

      {error && <p className="error">{error}</p>}

      <Button type="submit" disabled={loading}>
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
