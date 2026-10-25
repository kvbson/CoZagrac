import { createContext } from 'react';

export type AuthUser = {
  userId: string;
  /** account has a linked Steam profile (drives the profile-source wizard) */
  steamLinked: boolean;
};

export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
});
