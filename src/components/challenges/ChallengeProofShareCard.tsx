import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

export const SOCIAL_PROOF_STORY_WIDTH = 1080;
export const SOCIAL_PROOF_STORY_HEIGHT = 1920;

export interface ChallengeProofShareCardStats {
  proofScore: number;
  currentDay: number;
  currentWeek: number;
  completionPercentage: number;
  todayVolume: number;
  weeklyVolume: number;
  challengeVolume: number;
  bestSetToday: string;
  streakDays: number;
  weightGoalProgress: string;
  workoutsAccountedFor: number;
  workoutsCompleted: number;
  averageReadinessScore: number | null;
}

interface ChallengeProofShareCardProps {
  generatedOnLabel: string;
  stats: ChallengeProofShareCardStats;
}

function formatVolume(value: number) {
  return value > 0 ? Math.round(value).toLocaleString() : "0";
}

function formatReadiness(value: number | null) {
  return value === null ? "N/A" : String(value);
}

function ShareMetric({ label, value, variant = "default" }: { label: string; value: string; variant?: "default" | "accent" }) {
  return (
    <View style={[styles.metricTile, variant === "accent" ? styles.metricTileAccent : null]}>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {value}
      </Text>
    </View>
  );
}

export function ChallengeProofShareCard({ generatedOnLabel, stats }: ChallengeProofShareCardProps) {
  return (
    <LinearGradient
      colors={["#0D0F13", "#15171C", "#241005"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.brand}>NERDIE BLAQ FIT</Text>
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78}>
            4-Week Beast Challenge
          </Text>
        </View>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeLabel}>DAY</Text>
          <Text style={styles.dayBadgeValue}>{stats.currentDay}/28</Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>Proof Score</Text>
          <Text style={styles.scoreValue} numberOfLines={1} adjustsFontSizeToFit>{stats.proofScore}</Text>
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressValue}>{stats.completionPercentage}%</Text>
            <Text style={styles.progressLabel}>complete</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(Math.max(stats.completionPercentage, 0), 100)}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <ShareMetric label="Today Volume" value={formatVolume(stats.todayVolume)} />
        <ShareMetric label="Weekly Volume" value={formatVolume(stats.weeklyVolume)} />
        <ShareMetric label="Challenge Volume" value={formatVolume(stats.challengeVolume)} variant="accent" />
        <ShareMetric label="Streak" value={`${stats.streakDays} days`} />
      </View>

      <View style={styles.bestSetPanel}>
        <Text style={styles.metricLabel}>Best Set Today</Text>
        <Text style={styles.bestSetValue} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
          {stats.bestSetToday}
        </Text>
      </View>

      <View style={styles.bottomGrid}>
        <View style={styles.statPill}>
          <Text style={styles.pillValue}>{stats.streakDays}</Text>
          <Text style={styles.pillLabel}>day streak</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.pillValue}>W{stats.currentWeek}</Text>
          <Text style={styles.pillLabel}>challenge week</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.pillValue}>{stats.workoutsAccountedFor}</Text>
          <Text style={styles.pillLabel}>accounted</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.pillValue}>{formatReadiness(stats.averageReadinessScore)}</Text>
          <Text style={styles.pillLabel}>avg recovery</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>Goal: {stats.weightGoalProgress}</Text>
        <Text style={[styles.footerText, styles.footerDate]} numberOfLines={1}>{generatedOnLabel}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 9 / 16,
    backgroundColor: colors.surface,
    borderColor: "rgba(249, 115, 22, 0.55)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    justifyContent: "center",
    overflow: "hidden",
    padding: 14,
    width: "100%",
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    color: colors.primarySoft,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 13,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 23,
  },
  dayBadge: {
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.16)",
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  dayBadgeLabel: {
    color: colors.primarySoft,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 12,
  },
  dayBadgeValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 17,
  },
  heroPanel: {
    alignItems: "center",
    backgroundColor: "rgba(5, 5, 5, 0.38)",
    borderColor: "rgba(244, 244, 245, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  scoreBlock: {
    minWidth: 92,
  },
  scoreLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
  },
  scoreValue: {
    color: colors.primarySoft,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 50,
  },
  progressBlock: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  progressHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 5,
    justifyContent: "flex-end",
  },
  progressValue: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 27,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
  },
  progressTrack: {
    backgroundColor: "rgba(244, 244, 245, 0.14)",
    borderRadius: 999,
    height: 7,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricTile: {
    backgroundColor: "rgba(5, 5, 5, 0.42)",
    borderColor: "rgba(244, 244, 245, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "48.7%",
  },
  metricTileAccent: {
    backgroundColor: "rgba(20, 184, 166, 0.11)",
    borderColor: "rgba(94, 234, 212, 0.30)",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 12,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  bestSetPanel: {
    backgroundColor: "rgba(249, 115, 22, 0.12)",
    borderColor: "rgba(249, 115, 22, 0.34)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bestSetValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 19,
  },
  bottomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statPill: {
    backgroundColor: "rgba(244, 244, 245, 0.08)",
    borderColor: "rgba(244, 244, 245, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 9,
    paddingVertical: 6,
    width: "48.7%",
  },
  pillValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 19,
  },
  pillLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
  footer: {
    borderTopColor: "rgba(244, 244, 245, 0.14)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 7,
  },
  footerText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
  },
  footerDate: {
    flex: 0.45,
    textAlign: "right",
  },
});
