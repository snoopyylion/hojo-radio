"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { getUserRole } from "@/lib/actions/user";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Add debug logging for environment variables
console.log('🔧 Supabase URL available:', !!supabaseUrl);
console.log('🔧 Supabase Key available:', !!supabaseAnonKey);
console.log('🔧 Supabase client initialized:', !!supabase);

interface SupabaseProfile {
  first_name: string;
  last_name?: string;
  username?: string;
  role: string;
}

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  // Add Supabase user fields
  supabaseProfile?: SupabaseProfile | null;
}

interface AppContextType {
  user: UserProfile | null;
  token: string | null;
  isLoaded: boolean;
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
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      console.log('🔄 Starting fetchData, clerkLoaded:', clerkLoaded, 'clerkUser exists:', !!clerkUser);
      
      if (!clerkLoaded) {
        console.log('⏳ Clerk not loaded yet');
        return;
      }

      // Reset loading state when starting fetch
      setContextLoaded(false);

      try {
        if (clerkUser) {
          console.log('👤 Clerk user found:', {
            id: clerkUser.id,
            email: clerkUser.emailAddresses?.[0]?.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName
          });

          const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
          
          // Get token
          let t: string | null = null;
          try {
            t = await getToken();
            console.log('🔑 Token retrieved:', !!t);
          } catch (tokenError) {
            console.error('❌ Error getting token:', tokenError);
          }
          setToken(t || null);

          // Get role from your existing function
          let role: string | null = null;
          try {
            role = await getUserRole(clerkUser.id);
            console.log('🔑 Role from getUserRole:', role);
          } catch (roleError) {
            console.error('❌ Error getting user role:', roleError);
          }
          
          // Attempt to fetch Supabase profile data with timeout, but don't block user creation
          let supabaseProfile: SupabaseProfile | null = null;
          
          if (supabase) {
            try {
              console.log('🔍 Attempting to fetch Supabase profile for user:', clerkUser.id);
              
              // Create a timeout promise that rejects after 3 seconds
              const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Supabase query timeout after 3s')), 3000)
              );

              // Race the query against the timeout
              const { data: userData, error: userError } = await Promise.race([
                supabase
                  .from('users')
                  .select('id, first_name, last_name, username, role')
                  .eq('id', clerkUser.id)
                  .single(),
                timeoutPromise
              ]);

              if (userError) {
                console.warn('⚠️ Supabase user query error (will continue with Clerk data):', userError);
              } else if (userData) {
                console.log('✅ Found Supabase user:', userData);
                supabaseProfile = {
                  first_name: userData.first_name || '',
                  last_name: userData.last_name || '',
                  username: userData.username || '',
                  role: userData.role || 'user',
                };
              }

            } catch (supabaseError) {
              console.warn('⚠️ Supabase operation failed (will continue with Clerk data):', supabaseError);
              // Don't try to create the user if we can't even query - connection issues
            }
          } else {
            console.warn('⚠️ Supabase client not initialized - using Clerk data only');
          }

          console.log('🔄 Proceeding with user creation using available data');

          // Set the user with combined data
          const userProfile: UserProfile = {
            id: clerkUser.id,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            email,
            role,
            supabaseProfile,
          };

          console.log('✅ Setting user profile:', userProfile);
          setUser(userProfile);

          // Set contextLoaded to true only after user is set
          console.log('🏁 Setting contextLoaded to true - user data complete');
          setContextLoaded(true);

        } else {
          console.log('👤 No Clerk user found, clearing user state');
          setUser(null);
          setToken(null);
          // Set contextLoaded to true even when no user (auth state is clear)
          setContextLoaded(true);
        }
      } catch (error) {
        console.error("❌ Error loading user data:", error);
        setUser(null);
        setToken(null);
        // Set contextLoaded to true even on error (so app doesn't stay in loading state)
        setContextLoaded(true);
      }
    };

    fetchData();
  }, [clerkLoaded, clerkUser, getToken]);

  // Add this effect to log state changes
  useEffect(() => {
    console.log('📊 AppContext State Update:', {
      user: user,
      isLoaded: contextLoaded,
      hasToken: !!token
    });
  }, [user, contextLoaded, token]);

  const clearSession = () => {
    setToken(null);
    setUser(null);
  };

  const value: AppContextType = {
    user,
    token,
    isLoaded: contextLoaded,
    clearSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};