import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScribIA - Assistente di scrittura italiana",
  description: "Assistente di scrittura italiana con intelligenza artificiale. Migliora le tue competenze di scrittura con correzioni IA e autovalutazione.",
  keywords: ["ScribIA", "scrittura italiana", "correzione IA", "autovalutazione", "apprendimento"],
  authors: [{ name: "ScribIA" }],
  icons: {
    icon: "/logo-scribia.png",
  },
  openGraph: {
    title: "ScribIA - Assistente di scrittura italiana",
    description: "Migliora le tue competenze di scrittura con correzioni IA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScribIA - Assistente di scrittura italiana",
    description: "Migliora le tue competenze di scrittura con correzioni IA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
