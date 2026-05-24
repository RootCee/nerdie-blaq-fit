import { TrainingPathId } from "@/config/trainingPaths";

export type ChallengeId = "four-week-beast";

export interface ChallengeConfig {
  id: ChallengeId;
  title: string;
  durationDays: number;
  recommendedPathIds: TrainingPathId[];
  description: string;
  weeklyGoals: string[];
  trackedMetrics: string[];
}

export const CHALLENGES: ChallengeConfig[] = [
  {
    id: "four-week-beast",
    title: "4-Week Beast Challenge",
    durationDays: 28,
    recommendedPathIds: ["beast", "athlete", "foundation"],
    description: "Proof of consistency with Golden-Era Inspired AI Bodybuilding. Train hard. Adjust smart.",
    weeklyGoals: [
      "Complete the planned training days for your current path.",
      "Log daily readiness so the system can adjust without guesswork.",
      "Write short strength notes for key lifts when load, reps, or control improves.",
      "Track missed sessions honestly so the next week gets smarter, not heavier with guilt.",
    ],
    trackedMetrics: [
      "Workouts completed",
      "Missed workouts",
      "Daily readiness check-ins",
      "Average readiness score",
      "Soreness and pain flags",
      "Strength progress on key lifts",
      "Body weight entries when available",
    ],
  },
];

export function getChallengeById(challengeId: ChallengeId) {
  return CHALLENGES.find((challenge) => challenge.id === challengeId) ?? CHALLENGES[0];
}
