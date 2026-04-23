import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

import { colors, spacing } from "@/theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, variant = "solid", style, disabled = false }: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === "ghost" ? styles.ghostButton : styles.solidButton,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "ghost" ? styles.ghostLabel : styles.solidLabel,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
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
  buttonDisabled: {
    opacity: 0.45,
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
  labelDisabled: {
    color: colors.textMuted,
  },
});
