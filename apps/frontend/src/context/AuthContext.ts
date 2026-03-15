import { createContext } from 'react';

export type AuthContextType = {
  user: { userId: string } | null;
  loading: boolean;
  setUser: (user: { userId: string } | null) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
});
