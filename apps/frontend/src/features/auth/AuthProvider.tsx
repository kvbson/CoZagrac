import { useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { userService } from '../../services/userService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ userId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { userData, success } = await userService.checkAuth();
        if (success && userData?.userId) {
          setUser({ userId: userData.userId });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading }}>{children}</AuthContext.Provider>;
}
