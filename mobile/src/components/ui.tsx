import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Image } from "react-native";
import { mediaUrl } from "../config";
import { colors, fonts } from "../theme";

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  tone = "teal",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "teal" | "coral" | "ghost";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "coral" && styles.coral,
        tone === "ghost" && styles.ghost,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      {disabled ? (
        <ActivityIndicator color={tone === "ghost" ? colors.ink : colors.white} />
      ) : (
        <Text style={[styles.buttonText, tone === "ghost" && styles.ghostText]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Avatar({
  name,
  photoUrl,
  size = 56,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const letter = name.slice(0, 1).toUpperCase();
  const photo = mediaUrl(photoUrl);
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{letter}</Text>
    </View>
  );
}

export function CopyrightLine() {
  return <Text style={styles.copyright}>© 2026 Eira. All rights reserved.</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 22, marginTop: 8 },
  field: { marginTop: 14 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.plum,
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  coral: { backgroundColor: colors.coral },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  ghostText: { color: colors.ink },
  avatar: { backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontWeight: "700" },
  error: { color: colors.coral, marginTop: 12, fontSize: 14 },
  copyright: { color: colors.muted, textAlign: "center", marginTop: 18, fontSize: 13 },
});
