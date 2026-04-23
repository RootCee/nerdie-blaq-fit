import { BodyWeightHistoryItem, BodyWeightHistorySummary, BodyWeightLogRecord } from "@/types/body-weight";
import { GoalPace } from "@/types/onboarding";
import { parseWeightInPounds } from "@/lib/body-metrics";

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function toHistoryItem(entry: BodyWeightLogRecord, previousEntry?: BodyWeightLogRecord): BodyWeightHistoryItem {
  return {
    loggedOn: entry.loggedOn,
    weight: entry.weight,
    changeFromPrevious: previousEntry ? roundToTenth(entry.weight - previousEntry.weight) : null,
  };
}

function resolveTrendDirection(weeklyChange: number | null): BodyWeightHistorySummary["trendDirection"] {
  if (weeklyChange === null) {
    return "insufficient-data";
  }

  if (weeklyChange >= 0.4) {
    return "up";
  }

  if (weeklyChange <= -0.4) {
    return "down";
  }

  return "steady";
}

function resolveDistanceFromGoal(latestWeight: number | null, goalWeight: string, currentWeight: string) {
  const goalInPounds = parseWeightInPounds(goalWeight);
  const currentInPounds = parseWeightInPounds(currentWeight);

  if (!goalInPounds || !currentInPounds || latestWeight === null) {
    return null;
  }

  const latestInPounds = currentInPounds > 0 ? latestWeight * (currentInPounds / Number.parseFloat(currentWeight.replace(/[^0-9.]/g, "") || "0")) : null;

  if (!latestInPounds || !Number.isFinite(latestInPounds)) {
    return null;
  }

  return roundToTenth(goalInPounds - latestInPounds);
}

function resolveAdjustmentSuggestion(
  trendDirection: BodyWeightHistorySummary["trendDirection"],
  distanceFromGoal: number | null,
  goalPace: GoalPace | null,
): string | null {
  if (distanceFromGoal === null || !goalPace) {
    return null;
  }

  if (Math.abs(distanceFromGoal) <= 1) {
    return "You’re close to target. Stay steady and let consistency do the work.";
  }

  if (distanceFromGoal < 0) {
    if (trendDirection === "up" && goalPace !== "aggressive") {
      return "Your trend is climbing past your target. A slightly lighter calorie week could help tighten things up.";
    }

    if (trendDirection === "steady") {
      return "You’re still above goal weight. A small calorie trim or a little more movement could help nudge the trend down.";
    }
  }

  if (distanceFromGoal > 0) {
    if (trendDirection === "down") {
      return "You’re trending below your goal direction. A small bump in meals or recovery could help keep progress steady.";
    }

    if (trendDirection === "steady") {
      return "You still have room before goal weight. Stay steady, and only push pace if recovery still feels solid.";
    }
  }

  return "Your trend is moving with the plan. Keep the routine simple and repeat what’s working.";
}

export function deriveBodyWeightHistorySummary(
  entries: BodyWeightLogRecord[],
  options?: {
    goalWeight?: string;
    goalPace?: GoalPace | null;
    currentWeight?: string;
  },
): BodyWeightHistorySummary {
  const historyItems = entries.map((entry, index) => toHistoryItem(entry, entries[index + 1]));
  const latestEntry = entries[0] ?? null;
  const oldestEntry = entries[entries.length - 1] ?? null;
  const weeklyChange =
    latestEntry && oldestEntry && latestEntry.loggedOn !== oldestEntry.loggedOn
      ? roundToTenth(latestEntry.weight - oldestEntry.weight)
      : null;
  const trendDirection = resolveTrendDirection(weeklyChange);
  const distanceFromGoal =
    options?.goalWeight && options.currentWeight
      ? resolveDistanceFromGoal(latestEntry?.weight ?? null, options.goalWeight, options.currentWeight)
      : null;

  return {
    latestWeight: latestEntry?.weight ?? null,
    latestLoggedOn: latestEntry?.loggedOn ?? null,
    changeFromPrevious: historyItems[0]?.changeFromPrevious ?? null,
    entries: historyItems,
    trendDirection,
    weeklyChange,
    distanceFromGoal,
    adjustmentSuggestion: resolveAdjustmentSuggestion(
      trendDirection,
      distanceFromGoal,
      options?.goalPace ?? null,
    ),
  };
}
