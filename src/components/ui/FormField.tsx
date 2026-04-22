import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { colors, spacing } from "@/theme";

interface FormFieldProps extends TextInputProps {
  label: string;
  helper?: string;
}

export function FormField({ label, helper, ...props }: FormFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
