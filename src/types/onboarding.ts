export type Sex = "female" | "male" | "non-binary" | "prefer-not-to-say";

export type ActivityLevel =
  | "sedentary"
  | "lightly-active"
  | "moderately-active"
  | "very-active"
  | "athlete";

export type FitnessGoal =
  | "fat-loss"
  | "muscle-gain"
  | "recomposition"
  | "strength"
  | "endurance"
  | "general-wellness";

export type WorkoutExperience = "beginner" | "intermediate" | "advanced";

export type WorkoutLocation = "home" | "gym" | "both";

export type DietaryPreference =
  | "balanced"
  | "high-protein"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "keto"
  | "low-carb";

export type GoalPace = "easy" | "steady" | "aggressive";

export type EquipmentOption =
  | "none"
  | "resistance-bands"
  | "dumbbells"
  | "barbell"
  | "kettlebells"
  | "bench"
  | "pull-up-bar"
  | "cardio-machine";

export interface OnboardingProfile {
  age: string;
  sex: Sex | null;
  height: string;
  weight: string;
  goalWeight: string;
  goalPace: GoalPace | null;
  activityLevel: ActivityLevel | null;
  fitnessGoal: FitnessGoal | null;
  workoutExperience: WorkoutExperience | null;
  workoutLocation: WorkoutLocation | null;
  availableEquipment: EquipmentOption[];
  dietaryPreference: DietaryPreference | null;
  injuriesOrLimitations: string;
}

export interface OnboardingState {
  isComplete: boolean;
  profile: OnboardingProfile;
  isHydrated: boolean;
  isSaving: boolean;
  storageMode: "local" | "supabase";
  error: string | null;
}

export interface SupabaseProfileRow {
  id: string;
  age: string | null;
  sex: Sex | null;
  height: string | null;
  weight: string | null;
  goal_weight?: string | null;
  goal_pace?: GoalPace | null;
  activity_level: ActivityLevel | null;
  fitness_goal: FitnessGoal | null;
  workout_experience: WorkoutExperience | null;
  workout_location: WorkoutLocation | null;
  available_equipment: EquipmentOption[] | null;
  dietary_preference: DietaryPreference | null;
  injuries_or_limitations: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}
