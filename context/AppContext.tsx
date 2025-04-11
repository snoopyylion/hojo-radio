"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";

interface AppUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface AppContextType {
  user: AppUser | null;
  token: string | null;
  clearSession: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const t = await getToken();
      setToken(t || null);
    };

    if (clerkUser) {
      const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
      setUser({
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email,
      });

      fetchToken();
    } else {
      setUser(null);
    }
  }, [clerkUser]);

  const clearSession = () => {
    setToken(null);
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
  };

  const value: AppContextType = {
    user,
    token,
    clearSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
