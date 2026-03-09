import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export function ProtectedRoute() {
  const { authorized } = useContext(AuthContext);

  return authorized ? <Outlet /> : <Navigate to="/auth" />;
}
