import { createContext } from 'react';

export type AuthContextType = {
  user: { userId: number } | null;
  loading: boolean;
  setUser: (user: { userId: number } | null) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
});
