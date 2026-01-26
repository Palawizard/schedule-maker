import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthSessionSync from "./components/AuthSessionSync";
import "./globals.css";

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
      <body className="antialiased">
        <AuthSessionSync />
        {children}
      </body>
    </html>
  );
}
