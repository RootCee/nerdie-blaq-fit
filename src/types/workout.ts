import { ActivityLevel, EquipmentOption, FitnessGoal, OnboardingProfile, WorkoutExperience, WorkoutLocation } from "@/types/onboarding";

export type SupportedWorkoutGoal = "fat-loss" | "muscle-gain" | "general-fitness";

export interface WorkoutExercise {
  name: string;
  sets: string;
  reps: string;
  restTime: string;
  notes: string;
}

export interface WorkoutDay {
  id: string;
  title: string;
  focus: string;
  notes: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  title: string;
  summary: string;
  trainingDays: number;
  goal: SupportedWorkoutGoal;
  experience: WorkoutExperience;
  location: WorkoutLocation;
  activityLevel: ActivityLevel;
  equipment: EquipmentOption[];
  notes: string[];
  days: WorkoutDay[];
}

export interface WorkoutPlannerInput
  extends Pick<
    OnboardingProfile,
    "fitnessGoal" | "workoutExperience" | "workoutLocation" | "availableEquipment" | "activityLevel"
  > {}
