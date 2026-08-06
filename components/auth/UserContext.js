// components/auth/UserContext.js
'use client';
import { createContext, useContext } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ user, children }) => {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  return useContext(UserContext);
};
