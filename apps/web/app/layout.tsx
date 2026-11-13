import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, t } from "@nfe/core";

export const metadata: Metadata = {
  title: t(DEFAULT_LOCALE, "app.name"),
  description: t(DEFAULT_LOCALE, "app.tagline"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>{children}</body>
    </html>
  );
}
