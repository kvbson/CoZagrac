import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { userService } from '../../services/userService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ userId: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await userService.checkAuth();
        setUser(data ?? null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
