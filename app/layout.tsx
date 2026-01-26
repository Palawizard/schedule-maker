import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Fraunces,
  Manrope,
  Playfair_Display,
  Sora,
  Space_Grotesk,
} from "next/font/google";
import AuthSessionSync from "./components/AuthSessionSync";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pala's Stream Schedule Maker",
  description: "Schedule builder for streamers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} ${sora.variable} ${manrope.variable} ${playfairDisplay.variable} antialiased`}
      >
        <AuthSessionSync />
        {children}
      </body>
    </html>
  );
}
