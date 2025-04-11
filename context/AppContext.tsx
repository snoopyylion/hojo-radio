// app/context/AppContext.tsx
"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";

interface AppContextType {
  user: any;
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
  const { user } = useUser();
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const t = await getToken();
      setToken(t || null);
    };

    if (user) {
      fetchToken();
    }
  }, [user]);

  const clearSession = () => {
    setToken(null);
    localStorage.clear(); // optional: if you store anything else
    sessionStorage.clear();
  };

  const value: AppContextType = {
    user,
    token,
    clearSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
