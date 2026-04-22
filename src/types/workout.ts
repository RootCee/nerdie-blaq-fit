import { ActivityLevel, EquipmentOption, FitnessGoal, OnboardingProfile, WorkoutExperience, WorkoutLocation } from "@/types/onboarding";

export type SupportedWorkoutGoal = "fat-loss" | "muscle-gain" | "general-fitness";

export interface WorkoutExercise {
  slug?: string;
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

export interface StoredWorkoutPlanRow {
  user_id: string;
  plan_snapshot: WorkoutPlan;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExerciseLog {
  exerciseSlug: string;
  exerciseName: string;
  completedSets: string;
  reps: string;
  weightUsed: string;
  notes: string;
}

export interface WorkoutDayLog {
  dayId: string;
  dayTitle: string;
  isCompleted: boolean;
  completedAt: string | null;
  exerciseLogs: WorkoutExerciseLog[];
}

export interface WorkoutHistoryItem {
  dayId: string;
  dayTitle: string;
  completedAt: string;
  completionStatus: "completed";
  exerciseSummary: string;
  notesPreview: string | null;
  loggedExerciseCount: number;
}

export interface WorkoutMotivationStats {
  workoutsCompletedThisWeek: number;
  totalCompletedSessions: number;
  currentStreak: number;
}

export interface StoredWorkoutDayLogRow {
  user_id: string;
  day_id: string;
  day_title: string;
  is_completed: boolean;
  completed_at: string | null;
  exercise_logs: WorkoutExerciseLog[];
  created_at: string;
  updated_at: string;
}

export interface ExerciseMetadata {
  slug: string;
  name: string;
  shortDescription?: string;
  stepByStepInstructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  workoutLocation: WorkoutLocation[];
  tips: string[];
  commonMistakes: string[];
  image: number;
}

export interface ExerciseDetailMetadata extends ExerciseMetadata {
  isFallback: boolean;
}

export interface WorkoutPlannerInput
  extends Pick<
    OnboardingProfile,
    "fitnessGoal" | "workoutExperience" | "workoutLocation" | "availableEquipment" | "activityLevel"
  > {}
