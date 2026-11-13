import { Image, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { LOGO_SVG } from "../logo";
import { useUi } from "./ui-provider";

export interface LogoProps {
  size?: number;
  /** Accessible name; leave out when a visible app name sits next to the logo. */
  label?: string;
}

/**
 * The single app logo. Shows the admin's logo when `UiProvider logoUrl` is set
 * (`branding.logo_path`), otherwise the built-in one.
 */
export function Logo({ size = 40, label }: LogoProps) {
  const { logoUrl } = useUi();
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      ) : (
        <SvgXml xml={LOGO_SVG} width={size} height={size} />
      )}
    </View>
  );
}
