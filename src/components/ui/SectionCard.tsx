import { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function SectionCard({ title, eyebrow, action, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    gap: 4,
    flexShrink: 1,
  },
  eyebrow: {
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
