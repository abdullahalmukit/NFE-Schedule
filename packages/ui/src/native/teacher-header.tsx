import { View } from "react-native";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Text } from "./text";

export interface TeacherHeaderProps {
  initial: string;
  name: string;
  designation: string;
  department: string;
  imageUrl?: string;
  callLabel?: string;
  emailLabel?: string;
  onCall?: () => void;
  onEmail?: () => void;
}

export function TeacherHeader(p: TeacherHeaderProps) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Avatar initial={p.initial} imageUrl={p.imageUrl} size={80} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{p.name}</Text>
          <Text variant="small" color="textMuted">
            {p.designation}
          </Text>
          <Text variant="small" color="textMuted">
            {p.department}
          </Text>
        </View>
      </View>
      {p.callLabel || p.emailLabel ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          {p.callLabel ? (
            <Button label={p.callLabel} icon="phone" size="medium" onPress={p.onCall} flex />
          ) : null}
          {p.emailLabel ? (
            <Button
              label={p.emailLabel}
              icon="mail"
              variant="secondary"
              size="medium"
              onPress={p.onEmail}
              flex
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
