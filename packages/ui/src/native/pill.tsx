import { View } from "react-native";
import { toneColors, type Tone } from "../theme";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface PillProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
}

/** Status pill: "In class time" (warning), "Syllabus: …" (neutral), "New" (accent), "Lab" (info). */
export function Pill({ label, tone = "neutral", size = "md" }: PillProps) {
  const t = useTheme();
  const c = toneColors(t.name, tone);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: c.bg,
        borderRadius: size === "sm" ? 6 : 8,
        paddingHorizontal: size === "sm" ? 6 : 10,
        paddingVertical: size === "sm" ? 2 : 4,
      }}
    >
      <Text
        variant="smallStrong"
        rawColor={c.fg}
        style={size === "sm" ? { fontSize: 12, lineHeight: 16 } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
