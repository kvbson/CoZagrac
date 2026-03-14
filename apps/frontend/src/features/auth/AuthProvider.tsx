import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { Outlet } from 'react-router-dom';
import { userService } from '../../services/userService';

export function AuthProvider() {
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await userService.checkAuth();
      setAuthorized(!!response?.userId);
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ authorized, setAuthorized }}>
      <Outlet />
    </AuthContext.Provider>
  );
}
