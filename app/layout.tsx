import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist, Geist_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from 'react-hot-toast'
import { UserProvider } from "@/context/UserContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
const manrope = Manrope({
  subsets: ["latin"],
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
});
const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-sora',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hojo Media",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/authentication/sign-in"
    >
      <UserProvider>
        <AppContextProvider>
          <html lang="en">
            <body
              className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${sora.variable} ${manrope.variable} antialiased`}
            >
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
                  duration: 4000, // ✅ sets the global default
                }}
              />

            </body>
          </html>
        </AppContextProvider>
      </UserProvider>
    </ClerkProvider>
  );
}
