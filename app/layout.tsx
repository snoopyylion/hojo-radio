// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Manrope, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Disable preload to reduce requests
});

const manrope = Manrope({
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '500', '600', '700'], // Reduce weight variants
  variable: '--font-manrope',
  preload: false,
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'], // Reduce weight variants
  variable: '--font-sora',
  preload: false,
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
    <html lang="en">
      <body
        className={`${inter.variable} ${sora.variable} ${manrope.variable} antialiased font-sans`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}