"use client";
import { useUser } from "@clerk/nextjs";
import { createContext, useContext, ReactNode } from "react";

// Define a type for the context value
interface AppContextType {
  user: any; // You can replace `any` with a more specific type if needed, based on the user data structure from Clerk.
}

// Create the context with a default value of type `AppContextType`
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

// Define the type for the props of AppContextProvider
interface AppContextProviderProps {
  children: ReactNode; // ReactNode ensures that you can pass any valid JSX element as children
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const { user } = useUser();

  const value: AppContextType = {
    user
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
