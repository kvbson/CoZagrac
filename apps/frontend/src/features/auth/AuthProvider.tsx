import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((res) => {
        setAuthorized(res.status === 200);
      })
      .catch(() => setAuthorized(false));
  }, []);

  return (
    <AuthContext.Provider value={{ authorized, setAuthorized }}>{children}</AuthContext.Provider>
  );
}
