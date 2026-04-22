import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

interface StatChipProps {
  label: string;
  value: string;
}

export function StatChip({ label, value }: StatChipProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: 92,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
