import { ActivityLevel, DietaryPreference, FitnessGoal, OnboardingProfile } from "@/types/onboarding";

export interface NutritionMacroRange {
  min: number;
  max: number;
}

export interface NutritionMealSlot {
  title: string;
  components: string[];
}

export interface SupplementSuggestion {
  category: string;
  suggestions: string[];
}

export interface NutritionGuidance {
  calorieTarget: number;
  proteinTargetGrams: number;
  carbsRangeGrams: NutritionMacroRange;
  fatsRangeGrams: NutritionMacroRange;
  waterTargetLiters: number;
  mealStructure: NutritionMealSlot[];
  supplementSuggestions: SupplementSuggestion[];
  dietaryPreference: DietaryPreference;
  activityLevel: ActivityLevel;
  goalLabel: string;
  bmiValue: number | null;
  bmiCategory: string | null;
}

export interface NutritionPlannerInput
  extends Pick<
    OnboardingProfile,
    "fitnessGoal" | "weight" | "goalWeight" | "goalPace" | "height" | "activityLevel" | "dietaryPreference"
  > {}
