import { FitnessGoal, OnboardingProfile } from "@/types/onboarding";

export type TrainingFocusId = "mass-power" | "sculpt-strength" | "athletic-conditioning" | "glutes-core";

export type CoreFrequency = "moderate" | "daily-rotating" | "frequent";
export type ConditioningBias = "low" | "moderate" | "high";
export type RecoverySensitivity = "standard" | "elevated" | "high";

export interface TrainingFocusConfig {
  id: TrainingFocusId;
  title: string;
  subtitle: string;
  description: string;
  recommendedFor: string[];
  primaryMusclePriorities: string[];
  weeklyVolumeBias: string;
  coreFrequency: CoreFrequency;
  conditioningBias: ConditioningBias;
  recoverySensitivity: RecoverySensitivity;
  proRequired: boolean;
}

export const TRAINING_FOCUSES: TrainingFocusConfig[] = [
  {
    id: "mass-power",
    title: "Mass & Power",
    subtitle: "Compounds, chest, back, arms",
    description: "The classic high-output lifting focus: heavy compounds, chest and back density, arm volume, and enough core to support big training.",
    recommendedFor: ["Muscle gain", "Strength", "Bodybuilding", "Chest/back/arms priority"],
    primaryMusclePriorities: ["chest", "back", "arms", "compounds"],
    weeklyVolumeBias: "Higher upper-body compound and arm volume with moderate core.",
    coreFrequency: "moderate",
    conditioningBias: "low",
    recoverySensitivity: "standard",
    proRequired: false,
  },
  {
    id: "sculpt-strength",
    title: "Sculpt & Strength",
    subtitle: "Glutes, legs, shoulders, core",
    description: "Built with women lifters in mind: glutes, legs, shoulders, core, posture, and conditioning in an intense, structured, recovery-aware system.",
    recommendedFor: ["Lean definition", "Recomposition", "Glutes and legs", "Shoulders and posture", "Serious lifters"],
    primaryMusclePriorities: ["glutes", "legs", "shoulders", "core", "posture"],
    weeklyVolumeBias: "Higher glute, leg, shoulder, posture, and daily rotating core volume.",
    coreFrequency: "daily-rotating",
    conditioningBias: "moderate",
    recoverySensitivity: "elevated",
    proRequired: false,
  },
  {
    id: "athletic-conditioning",
    title: "Athletic Conditioning",
    subtitle: "Strength, circuits, stamina",
    description: "A balanced strength and conditioning focus with more circuits, movement quality, stamina, and athletic repeatability.",
    recommendedFor: ["Endurance", "Athleticism", "Circuits", "General performance"],
    primaryMusclePriorities: ["full-body", "conditioning", "core", "movement"],
    weeklyVolumeBias: "Balanced strength with higher conditioning and circuit density.",
    coreFrequency: "frequent",
    conditioningBias: "high",
    recoverySensitivity: "elevated",
    proRequired: false,
  },
  {
    id: "glutes-core",
    title: "Glutes & Core",
    subtitle: "Lower body, brace, control",
    description: "Lower-body and glute priority with intelligent daily core rotation for waist control, trunk strength, posture, and bracing. Not endless crunches.",
    recommendedFor: ["Glute growth", "Lower body", "Core control", "Waist control", "Busy-week structure"],
    primaryMusclePriorities: ["glutes", "lower body", "core", "posture"],
    weeklyVolumeBias: "Higher glute, hamstring, single-leg, and rotating core volume.",
    coreFrequency: "daily-rotating",
    conditioningBias: "moderate",
    recoverySensitivity: "high",
    proRequired: false,
  },
];

export function getTrainingFocusById(focusId: TrainingFocusId | null | undefined): TrainingFocusConfig {
  return TRAINING_FOCUSES.find((focus) => focus.id === focusId) ?? TRAINING_FOCUSES[0];
}

export function isTrainingFocusId(value: string | null | undefined): value is TrainingFocusId {
  return value === "mass-power" || value === "sculpt-strength" || value === "athletic-conditioning" || value === "glutes-core";
}

export function recommendTrainingFocus(profile: Pick<OnboardingProfile, "fitnessGoal" | "goalWeight" | "weight">): TrainingFocusId {
  if (isDefinitionOrRecompositionGoal(profile.fitnessGoal)) {
    return "sculpt-strength";
  }

  if (profile.fitnessGoal === "endurance" || profile.fitnessGoal === "general-wellness") {
    return "athletic-conditioning";
  }

  if (profile.fitnessGoal === "muscle-gain" || profile.fitnessGoal === "strength") {
    return "mass-power";
  }

  return "glutes-core";
}

export function getTrainingFocusGuidance(profile: Pick<OnboardingProfile, "fitnessGoal" | "trainingFocusId" | "goalWeight" | "weight">) {
  const recommendedFocus = getTrainingFocusById(recommendTrainingFocus(profile));
  const selectedFocus = getTrainingFocusById(profile.trainingFocusId ?? recommendedFocus.id);

  if (selectedFocus.id === recommendedFocus.id) {
    return `${recommendedFocus.title} matches the body and performance focus from your setup.`;
  }

  return `${recommendedFocus.title} is recommended from your profile, but ${selectedFocus.title} is a valid focus if that is the build you want.`;
}

function isDefinitionOrRecompositionGoal(goal: FitnessGoal | null) {
  return goal === "fat-loss" || goal === "recomposition";
}
