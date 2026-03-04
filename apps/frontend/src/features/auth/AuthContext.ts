import { createContext } from 'react';

type AuthContextType = {
  authorized: boolean | null;
  setAuthorized: (value: boolean) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);
