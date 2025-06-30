// context/GlobalTypingContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface TypingUser {
  userId: string;
  username: string;
  displayName?: string;
  timestamp: number;
}

interface GlobalTypingState {
  typingUsers: Record<string, TypingUser[]>;
  setTypingUsers: React.Dispatch<React.SetStateAction<Record<string, TypingUser[]>>>;
}

const GlobalTypingContext = createContext<GlobalTypingState | undefined>(undefined);

export const GlobalTypingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>({});
  
  return (
    <GlobalTypingContext.Provider value={{ typingUsers, setTypingUsers }}>
      {children}
    </GlobalTypingContext.Provider>
  );
};

export const useGlobalTyping = () => {
  const context = useContext(GlobalTypingContext);
  if (!context) {
    throw new Error('useGlobalTyping must be used within a GlobalTypingProvider');
  }
  return context;
};