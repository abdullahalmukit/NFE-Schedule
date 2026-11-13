/**
 * Font family names the app registers with expo-font (see apps/mobile
 * app/_layout.tsx). Bangla text uses Hind Siliguri at the same sizes.
 */
export const FONT = {
  body: "Inter-Regular",
  bodySemiBold: "Inter-SemiBold",
  bodyBold: "Inter-Bold",
  display: "SpaceGrotesk-Regular",
  displayBold: "SpaceGrotesk-Bold",
  bangla: "HindSiliguri-Regular",
  banglaSemiBold: "HindSiliguri-SemiBold",
  banglaBold: "HindSiliguri-Bold",
} as const;

export type FontName = (typeof FONT)[keyof typeof FONT];
