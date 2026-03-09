import { createContext } from 'react';

export type AuthContextType = {
  authorized: boolean;
  setAuthorized: (value: boolean) => void;
};

export const AuthContext = createContext<AuthContextType>({
  authorized: false,
  setAuthorized: () => {},
});
