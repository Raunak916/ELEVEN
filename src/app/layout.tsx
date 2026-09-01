import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { GlobalMusicPlayer } from "@/components/layout/global-music-player";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
  title: "Eleven | Football Auction",
  description: "Eleven — Premium football player auction and squad management platform for organizers",
  keywords: ["eleven", "football", "auction", "players", "draft", "fantasy", "sports"],
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`dark ${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative">
        <Providers>
          <GlobalMusicPlayer />
          {children}
        </Providers>
      </body>
    </html>
  );
}