import { OnboardingProfile, SupabaseProfileRow } from "@/types/onboarding";

export const emptyOnboardingProfile: OnboardingProfile = {
  age: "",
  sex: null,
  height: "",
  weight: "",
  activityLevel: null,
  fitnessGoal: null,
  workoutExperience: null,
  workoutLocation: null,
  availableEquipment: [],
  dietaryPreference: null,
  injuriesOrLimitations: "",
};

export function mapProfileToSupabaseRow(
  profileId: string,
  profile: OnboardingProfile,
  onboardingCompleted: boolean,
): Omit<SupabaseProfileRow, "created_at" | "updated_at"> {
  return {
    id: profileId,
    age: profile.age || null,
    sex: profile.sex,
    height: profile.height || null,
    weight: profile.weight || null,
    activity_level: profile.activityLevel,
    fitness_goal: profile.fitnessGoal,
    workout_experience: profile.workoutExperience,
    workout_location: profile.workoutLocation,
    available_equipment: profile.availableEquipment,
    dietary_preference: profile.dietaryPreference,
    injuries_or_limitations: profile.injuriesOrLimitations || null,
    onboarding_completed: onboardingCompleted,
  };
}

export function mapSupabaseRowToProfile(row: SupabaseProfileRow): OnboardingProfile {
  return {
    age: row.age ?? "",
    sex: row.sex,
    height: row.height ?? "",
    weight: row.weight ?? "",
    activityLevel: row.activity_level,
    fitnessGoal: row.fitness_goal,
    workoutExperience: row.workout_experience,
    workoutLocation: row.workout_location,
    availableEquipment: row.available_equipment ?? [],
    dietaryPreference: row.dietary_preference,
    injuriesOrLimitations: row.injuries_or_limitations ?? "",
  };
}
