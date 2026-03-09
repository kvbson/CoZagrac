import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { Outlet } from 'react-router-dom';

export function AuthProvider() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/user/me', { credentials: 'include' })
      .then((res) => {
        setAuthorized(res.status === 200);
      })
      .catch(() => setAuthorized(false));
  }, []);

  return (
    <AuthContext.Provider value={{ authorized, setAuthorized }}>
      <Outlet />
    </AuthContext.Provider>
  );
}
