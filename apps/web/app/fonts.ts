import { Hind_Siliguri, Inter, Space_Grotesk } from "next/font/google";

/** Fonts from DESIGN_SYSTEM §3, exposed as the CSS variables theme.css expects. */
export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--nfe-font-display",
  display: "swap",
});

export const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--nfe-font-body",
  display: "swap",
});

export const banglaFont = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
  variable: "--nfe-font-bangla",
  display: "swap",
});

export const fontVariables = `${displayFont.variable} ${bodyFont.variable} ${banglaFont.variable}`;
