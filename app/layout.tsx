import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Newsreader, Hanken_Grotesk } from "next/font/google";
import Script from "next/script";
import { SCRIPT_URL, DEFAULT_SCRIPT_ID } from "@marsidev/react-turnstile";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CheckinBliss — The premium way to stay in Africa",
  description:
    "Hand-selected apartments in Lagos and Abuja. Instantly bookable from anywhere. Verified short-stay apartments built for the diaspora.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${newsreader.variable} ${hankenGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <Script
          id={DEFAULT_SCRIPT_ID}
          src={SCRIPT_URL}
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
