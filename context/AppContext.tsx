// context/AppContext.tsx
"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { getUserRole } from "@/lib/actions/user";

// Updated AppUser type to include role
interface AppUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
}

interface AppContextType {
  user: AppUser | null;
  token: string | null;
  clearSession: () => void;
}

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};

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

      // Use the server action directly
      getUserRole(clerkUser.id).then((role) => {
        setUser({
          id: clerkUser.id,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          email,
          role, // This will be "user" by default from the server action
        });
      });

      fetchToken();
    } else {
      setUser(null);
    }
  }, [clerkUser, getToken]);

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