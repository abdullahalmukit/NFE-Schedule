import { TextInput, View } from "react-native";
import type { IconName } from "../icon-names";
import { Icon } from "./icon";
import { FONT } from "./fonts";
import { useUi } from "./ui-provider";

export interface TextFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Accessible name when there is no visible label. */
  label: string;
  icon?: IconName;
  /** `pill`: search field; `box`: form input. */
  shape?: "pill" | "box";
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  label,
  icon,
  shape = "box",
  keyboardType,
}: TextFieldProps) {
  const { theme: t, locale } = useUi();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        height: shape === "pill" ? 56 : 48,
        paddingHorizontal: 16,
        borderRadius: shape === "pill" ? 999 : 12,
        borderWidth: 1,
        borderColor: t.color.border,
        backgroundColor: t.color.surface,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={t.color.textMuted} /> : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.color.textFaint}
        keyboardType={keyboardType}
        style={{
          flex: 1,
          height: "100%",
          color: t.color.text,
          fontSize: t.size.body,
          fontFamily: locale === "bn" ? FONT.bangla : FONT.body,
        }}
      />
    </View>
  );
}
