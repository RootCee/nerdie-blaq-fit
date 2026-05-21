import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

export const APPLE_HEALTH_DISCLOSURE =
  "Nerdie Blaq Fit can connect with Apple Health to sync workouts, activity, calories, weight, and wellness data to improve fitness tracking and personalized insights.";

export function AppleHealthInfo() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Ionicons name="heart" size={22} color={colors.danger} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Apple Health</Text>
          <Text style={styles.title}>Health data sync</Text>
        </View>
      </View>

      <Text style={styles.copy}>{APPLE_HEALTH_DISCLOSURE}</Text>

      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Data accessed</Text>
          <Text style={styles.detailText}>Workouts, activity, active calories, weight, and wellness metrics.</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>How it helps</Text>
          <Text style={styles.detailText}>Your dashboard can reflect progress, recovery context, and activity trends.</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Your control</Text>
          <Text style={styles.detailText}>You choose what Apple Health shares and can change permissions anytime.</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Privacy</Text>
          <Text style={styles.detailText}>Health data is used only for fitness tracking and personalized in-app insights.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  copy: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  detailItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    gap: 4,
    minWidth: 220,
    padding: spacing.sm,
  },
  detailLabel: {
    color: colors.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  detailText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
