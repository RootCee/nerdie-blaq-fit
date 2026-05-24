import { FitnessGoal, OnboardingProfile, WorkoutExperience } from "@/types/onboarding";

export type TrainingPathId = "foundation" | "athlete" | "maintenance" | "beast";

export interface TrainingPathConfig {
  id: TrainingPathId;
  title: string;
  subtitle: string;
  description: string;
  daysPerWeek: number;
  experienceRequirement: string;
  recommendedFor: string[];
  weeklySplit: string[];
  proRequired: boolean;
}

export const TRAINING_PATHS: TrainingPathConfig[] = [
  {
    id: "foundation",
    title: "Foundation Path",
    subtitle: "Earn your way up",
    description: "A 12-week progression that builds from 3 days to 4, then 5, then 6 with recovery room baked in.",
    daysPerWeek: 3,
    experienceRequirement: "Beginner friendly",
    recommendedFor: ["New lifters", "Returners", "Anyone rebuilding consistency"],
    weeklySplit: [
      "Weeks 1-4: 3 full-body sessions",
      "Weeks 5-8: 4 upper/lower sessions",
      "Weeks 9-10: 5-day split",
      "Weeks 11-12: 6-day bodybuilding rhythm",
    ],
    proRequired: false,
  },
  {
    id: "athlete",
    title: "Athlete Path",
    subtitle: "Serious 4-day training",
    description: "A focused 4-day split for lifters who want hard work, better recovery, and repeatable progress.",
    daysPerWeek: 4,
    experienceRequirement: "Intermediate or advanced",
    recommendedFor: ["Strength and muscle gain", "Sport-minded lifters", "Consistent gym schedules"],
    weeklySplit: ["Upper Strength", "Lower Strength", "Upper Volume", "Lower Volume"],
    proRequired: false,
  },
  {
    id: "maintenance",
    title: "Maintenance Path",
    subtitle: "Busy-week bodybuilding",
    description: "A 4-day version that keeps compounds, trims fluff, and protects momentum when life is full.",
    daysPerWeek: 4,
    experienceRequirement: "All levels with basic movement familiarity",
    recommendedFor: ["Busy users", "Travel weeks", "Maintaining strength and muscle"],
    weeklySplit: ["Upper", "Lower", "Push/Pull", "Legs + Core"],
    proRequired: false,
  },
  {
    id: "beast",
    title: "Beast Path",
    subtitle: "Golden-Era Inspired AI Bodybuilding",
    description: "The premium 6-day high-frequency bodybuilding path with daily adaptation and recovery-aware coaching.",
    daysPerWeek: 6,
    experienceRequirement: "Intermediate to advanced recommended",
    recommendedFor: ["Muscle gain", "Gym-based lifters", "High-frequency bodybuilding"],
    weeklySplit: [
      "Chest + Back + Abs",
      "Shoulders + Arms + Forearms + Abs",
      "Legs + Lower Back + Abs",
      "Chest + Back + Abs",
      "Shoulders + Arms + Forearms + Abs",
      "Legs + Lower Back + Abs",
    ],
    proRequired: true,
  },
];

export function getTrainingPathById(pathId: TrainingPathId | null | undefined): TrainingPathConfig {
  return TRAINING_PATHS.find((path) => path.id === pathId) ?? TRAINING_PATHS[0];
}

export function isTrainingPathId(value: string | null | undefined): value is TrainingPathId {
  return value === "foundation" || value === "athlete" || value === "maintenance" || value === "beast";
}

export function recommendTrainingPath(profile: Pick<OnboardingProfile, "workoutExperience" | "fitnessGoal">): TrainingPathId {
  if (profile.workoutExperience === "beginner") {
    return "foundation";
  }

  if (isMuscleGainGoal(profile.fitnessGoal) && (profile.workoutExperience === "intermediate" || profile.workoutExperience === "advanced")) {
    return "beast";
  }

  if (profile.workoutExperience === "advanced") {
    return "athlete";
  }

  return "maintenance";
}

export function getTrainingPathGuidance(profile: Pick<OnboardingProfile, "workoutExperience" | "fitnessGoal" | "trainingPathId">) {
  const recommendedPathId = recommendTrainingPath(profile);
  const selectedPath = getTrainingPathById(profile.trainingPathId ?? recommendedPathId);
  const recommendedPath = getTrainingPathById(recommendedPathId);

  if (selectedPath.id === recommendedPath.id) {
    return `${recommendedPath.title} is the best starting lane for your current setup.`;
  }

  if (profile.workoutExperience === "beginner" && selectedPath.id === "beast") {
    return "Beast Path is high-frequency training. You can preview it, but Foundation is the safer recommendation while you build tolerance.";
  }

  return `${recommendedPath.title} is recommended from your profile, but you can choose ${selectedPath.title} for now.`;
}

function isMuscleGainGoal(goal: FitnessGoal | null): boolean {
  return goal === "muscle-gain" || goal === "strength" || goal === "recomposition";
}
