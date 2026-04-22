import { StyleSheet, View } from "react-native";

import { colors, spacing } from "@/theme";

interface ProgressDotsProps {
  activeIndex: number;
  count: number;
}

export function ProgressDots({ activeIndex, count }: ProgressDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
});
