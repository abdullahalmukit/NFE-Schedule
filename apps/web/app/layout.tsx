import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, t } from "@nfe/core";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: t(DEFAULT_LOCALE, "app.name"),
  description: t(DEFAULT_LOCALE, "app.tagline"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={fontVariables}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
