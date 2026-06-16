import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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

export const metadata: Metadata = {
  title: "CheckinBliss — Premium Apartment Stays in Nigeria | Verified, Instantly Bookable",
  description:
    "Verified short-stay apartments in Lagos and Abuja, built for the diaspora. Book instantly with GBP, USD, or EUR. No host approval needed.",
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
      className={`${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bone text-ink font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
