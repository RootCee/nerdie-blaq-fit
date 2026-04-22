import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

import { colors, spacing } from "@/theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost";
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, variant = "solid", style }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, variant === "ghost" ? styles.ghostButton : styles.solidButton, style]}
    >
      <Text style={[styles.label, variant === "ghost" ? styles.ghostLabel : styles.solidLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  solidButton: {
    backgroundColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  solidLabel: {
    color: colors.background,
  },
  ghostLabel: {
    color: colors.text,
  },
});
