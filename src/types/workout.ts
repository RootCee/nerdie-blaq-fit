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

export type CoreFinisherEmphasis = "front-core-trunk-stability" | "obliques-side-core";

export interface CoreFinisherBlock {
  title: string;
  emphasis: CoreFinisherEmphasis;
  notes: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutSupersetGroup {
  id: string;
  title: string;
  exerciseSlugs: string[];
  restAfterGroup: string;
  notes: string;
}

export interface GroupedWorkoutExerciseDisplay {
  exercise: WorkoutExercise;
  superset: WorkoutSupersetGroup | null;
  positionInSuperset: number | null;
}

export interface WorkoutDay {
  id: string;
  title: string;
  focus: string;
  notes: string;
  exercises: WorkoutExercise[];
  coreFinisher?: CoreFinisherBlock | null;
  supersets?: WorkoutSupersetGroup[];
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
  sets: WorkoutSetLog[];
  notes: string;
}

export interface WorkoutSetLog {
  setNumber: number;
  reps: string;
  weight: string;
  isCompleted: boolean;
}

export interface WorkoutDayLog {
  dayId: string;
  dayTitle: string;
  isCompleted: boolean;
  completedAt: string | null;
  exerciseLogs: WorkoutExerciseLog[];
}

export interface WorkoutExerciseVolumeSummary {
  exerciseSlug: string;
  exerciseName: string;
  totalVolume: number;
  totalCompletedReps: number;
  totalCompletedSets: number;
}

export interface WorkoutVolumeSummary {
  totalWorkoutVolume: number;
  totalCompletedReps: number;
  totalCompletedSets: number;
  exercises: WorkoutExerciseVolumeSummary[];
}

export interface WorkoutExerciseComparison {
  exerciseSlug: string;
  exerciseName: string;
  plannedSets: number;
  completedSets: number;
  missedSets: number;
  isBelowPlanned: boolean;
}

export interface WorkoutPlanComparisonSummary {
  totalPlannedExercises: number;
  totalCompletedExercises: number;
  totalPlannedSets: number;
  totalCompletedSets: number;
  coreFinisherWasPlanned: boolean;
  coreFinisherCompleted: boolean;
  hasMissedWork: boolean;
  missedExerciseCount: number;
  exercises: WorkoutExerciseComparison[];
}

export interface WorkoutPriorPerformanceSummary {
  exerciseSlug: string;
  exerciseName: string;
  dayId: string;
  dayTitle: string;
  completedAt: string;
  sets: WorkoutSetLog[];
  totalCompletedSets: number;
  totalCompletedReps: number;
  topWeight: number;
}

export interface WorkoutPreviousVsTodayComparison {
  exerciseSlug: string;
  previousTopWeight: number;
  currentTopWeight: number;
  previousCompletedReps: number;
  currentCompletedReps: number;
  previousTotalVolume: number;
  currentTotalVolume: number;
}

export interface WorkoutHistoryItem {
  dayId: string;
  dayTitle: string;
  completedAt: string;
  completionStatus: "completed";
  exerciseSummary: string;
  notesPreview: string | null;
  loggedExerciseCount: number;
  totalCompletedSets: number;
  totalCompletedReps: number;
  totalWorkoutVolume: number;
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
  exercise_logs: unknown[];
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
  substitutions: ExerciseSubstitution[];
}

export interface ExerciseDetailMetadata extends ExerciseMetadata {
  isFallback: boolean;
}

export type ExerciseSubstitutionType =
  | "easier-option"
  | "same-pattern-option"
  | "home-alternative"
  | "gym-alternative";

export interface ExerciseSubstitution {
  type: ExerciseSubstitutionType;
  slug: string;
  name: string;
  reason: string;
  existsInLibrary: boolean;
}

export interface WorkoutPlannerInput
  extends Pick<
    OnboardingProfile,
    "fitnessGoal" | "workoutExperience" | "workoutLocation" | "availableEquipment" | "activityLevel"
  > {}
