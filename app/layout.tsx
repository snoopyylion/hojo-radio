import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <ClerkProvider>
      <AppContextProvider>
        <html lang="en">
          <body
            className={`${geistSans.variable} ${geistMono.variable} ${inter.className} antialiased`}
          >
            {children}
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: '',
                style: {
                  background: '#1f2937', // dark background
                  color: '#fff',
                  borderRadius: '0.5rem',
                  padding: '12px 16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                },
                duration: 4000,
              }}
            />

          </body>
        </html>
      </AppContextProvider>
    </ClerkProvider>
  );
}
