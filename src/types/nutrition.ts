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

export type FoodMealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodLogEntry {
  id: string;
  logDate: string;
  mealType: FoodMealType;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingNotes: string;
  createdAt: string;
  storageMode: "supabase" | "local";
}

export interface FoodLogEntryInput {
  logDate: string;
  mealType: FoodMealType;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingNotes: string;
}

export interface FoodLogRow {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: FoodMealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_notes: string | null;
  created_at: string;
}

export interface FoodLogDailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface FoodNutritionEstimateInput {
  foodName: string;
  amount: string;
  mealType?: FoodMealType;
}

export interface FoodNutritionEstimate {
  foodName: string;
  amount: string;
  servingInterpretation: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: "low" | "medium" | "high";
  notes: string;
}

export type SupplementTiming = "morning" | "pre-workout" | "intra-workout" | "post-workout" | "evening";

export interface SupplementLogEntry {
  id: string;
  logDate: string;
  timing: SupplementTiming;
  supplementName: string;
  amount: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
  createdAt: string;
  storageMode: "supabase" | "local";
}

export interface SupplementLogEntryInput {
  logDate: string;
  timing: SupplementTiming;
  supplementName: string;
  amount: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
}

export interface SupplementLogRow {
  id: string;
  user_id: string;
  log_date: string;
  timing: SupplementTiming;
  supplement_name: string;
  amount: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  created_at: string;
}
