import { HindSiliguri_400Regular } from "@expo-google-fonts/hind-siliguri/400Regular";
import { HindSiliguri_600SemiBold } from "@expo-google-fonts/hind-siliguri/600SemiBold";
import { HindSiliguri_700Bold } from "@expo-google-fonts/hind-siliguri/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { SpaceGrotesk_400Regular } from "@expo-google-fonts/space-grotesk/400Regular";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { FONT } from "@nfe/ui/native";

/** Font files registered under the names @nfe/ui/native expects (only the weights we use). */
export const fontMap = {
  [FONT.body]: Inter_400Regular,
  [FONT.bodySemiBold]: Inter_600SemiBold,
  [FONT.bodyBold]: Inter_700Bold,
  [FONT.display]: SpaceGrotesk_400Regular,
  [FONT.displayBold]: SpaceGrotesk_700Bold,
  [FONT.bangla]: HindSiliguri_400Regular,
  [FONT.banglaSemiBold]: HindSiliguri_600SemiBold,
  [FONT.banglaBold]: HindSiliguri_700Bold,
};
