import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { userService } from '../services/userService';

// backend waliduje po swojej stronie (MIN_PASSWORD_LENGTH z @cozagrac/shared/contracts/consts)
const MIN_PASSWORD_LENGTH = 6;

export function AccountPage() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const userId = user?.userId ?? null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => userService.getById(userId as string),
    enabled: userId !== null,
  });

  const emailMutation = useMutation({
    mutationFn: (value: string) => userService.updateMe(userId as string, { email: value }),
  });
  const passwordMutation = useMutation({
    mutationFn: (value: string) => userService.updateMe(userId as string, { password: value }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => userService.deleteMe(userId as string),
    onSuccess: () => {
      setUser(null);
      navigate('/auth', { replace: true });
    },
  });

  function mutationMessage(m: { isSuccess: boolean; error: Error | null }, okText: string) {
    if (m.isSuccess) return <p className="muted">{okText}</p>;
    if (m.error) return <p className="error">{m.error.message}</p>;
    return null;
  }

  if (userId === null) {
    return <p>Loading account…</p>;
  }

  const profile = profileQuery.data?.userData ?? null;

  return (
    <section className="account">
      <div className="page__header">
        <h1>Account</h1>
      </div>

      <p className="muted">
        Account ID: <code>{userId}</code>
      </p>
      <p className="muted">
        Steam:{' '}
        {profileQuery.isPending
          ? 'checking…'
          : profile?.steamId
            ? `linked (${profile.steamId})`
            : 'not linked — recommendations cannot filter out games you own'}
      </p>

      <form
        className="account__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim()) emailMutation.mutate(email.trim());
        }}
      >
        <h2>Change email</h2>
        <Input
          type="email"
          label="New email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={emailMutation.isPending}>
          {emailMutation.isPending ? 'Saving…' : 'Save email'}
        </Button>
        {mutationMessage(emailMutation, 'Email updated.')}
      </form>

      <form
        className="account__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (password.length >= MIN_PASSWORD_LENGTH) passwordMutation.mutate(password);
        }}
      >
        <h2>Change password</h2>
        <Input
          type="password"
          label={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <Button type="submit" disabled={passwordMutation.isPending}>
          {passwordMutation.isPending ? 'Saving…' : 'Save password'}
        </Button>
        {mutationMessage(passwordMutation, 'Password updated.')}
      </form>

      <form
        className="account__form account__form--danger"
        onSubmit={(event) => {
          event.preventDefault();
          const confirmed = window.confirm(
            'Delete your account, profile and sessions? This cannot be undone.',
          );
          if (confirmed) deleteMutation.mutate();
        }}
      >
        <h2>Delete account</h2>
        <Button type="submit" disabled={deleteMutation.isPending}>
          {deleteMutation.isPending ? 'Deleting…' : 'Delete my account'}
        </Button>
        {deleteMutation.error ? (
          <p className="error">{deleteMutation.error.message}</p>
        ) : null}
      </form>
    </section>
  );
}
