import {
  ActivityLevel,
  DietaryPreference,
  EquipmentOption,
  FitnessGoal,
  GoalPace,
  Sex,
  WorkoutExperience,
  WorkoutLocation,
} from "@/types/onboarding";

export const sexOptions: Array<{ label: string; value: Sex }> = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
];

export const activityLevelOptions: Array<{ label: string; value: ActivityLevel }> = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Lightly active", value: "lightly-active" },
  { label: "Moderately active", value: "moderately-active" },
  { label: "Very active", value: "very-active" },
  { label: "Athlete", value: "athlete" },
];

export const fitnessGoalOptions: Array<{ label: string; value: FitnessGoal }> = [
  { label: "Fat loss", value: "fat-loss" },
  { label: "Muscle gain", value: "muscle-gain" },
  { label: "Recomposition", value: "recomposition" },
  { label: "Strength", value: "strength" },
  { label: "Endurance", value: "endurance" },
  { label: "General wellness", value: "general-wellness" },
];

export const workoutExperienceOptions: Array<{ label: string; value: WorkoutExperience }> = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export const workoutLocationOptions: Array<{ label: string; value: WorkoutLocation }> = [
  { label: "Home", value: "home" },
  { label: "Gym", value: "gym" },
  { label: "Both", value: "both" },
];

export const equipmentOptions: Array<{ label: string; value: EquipmentOption }> = [
  { label: "No equipment", value: "none" },
  { label: "Resistance bands", value: "resistance-bands" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Barbell", value: "barbell" },
  { label: "Kettlebells", value: "kettlebells" },
  { label: "Bench", value: "bench" },
  { label: "Pull-up bar", value: "pull-up-bar" },
  { label: "Cardio machine", value: "cardio-machine" },
];

export const dietaryPreferenceOptions: Array<{ label: string; value: DietaryPreference }> = [
  { label: "Balanced", value: "balanced" },
  { label: "High protein", value: "high-protein" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Pescatarian", value: "pescatarian" },
  { label: "Keto", value: "keto" },
  { label: "Low carb", value: "low-carb" },
];

export const goalPaceOptions: Array<{ label: string; value: GoalPace }> = [
  { label: "Easy", value: "easy" },
  { label: "Steady", value: "steady" },
  { label: "Aggressive", value: "aggressive" },
];
