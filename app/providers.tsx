// app/providers.tsx
'use client';
import { ClerkProvider } from "@clerk/nextjs";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "@/context/UserContext";
import { GlobalNotificationsProvider } from '@/context/EnhancedGlobalNotificationsContext';
import { GlobalChatNotificationsProvider } from '@/context/GlobalNotificationsContext';
import { GlobalTypingProvider } from "@/context/GlobalTypingContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider signInUrl="/authentication/sign-in">
            <UserProvider>
                <GlobalNotificationsProvider>
                    <AppContextProvider>
                        <GlobalTypingProvider>
                            <GlobalChatNotificationsProvider>
                                {children}
                                <Toaster
                                    position="top-center"
                                    toastOptions={{
                                        className: '',
                                        style: {
                                            background: '#1f2937',
                                            color: '#fff',
                                            borderRadius: '0.5rem',
                                            padding: '12px 16px',
                                            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                                        },
                                        duration: 4000,
                                    }}
                                />
                            </GlobalChatNotificationsProvider>
                        </GlobalTypingProvider>
                    </AppContextProvider>
                </GlobalNotificationsProvider>
            </UserProvider>
        </ClerkProvider>
    );
}