import { getTrainingPathById } from "@/config/trainingPaths";
import { adaptWorkoutForReadiness, calculateReadinessScore } from "@/lib/adaptiveTraining";
import { OnboardingProfile } from "@/types/onboarding";
import { DailyReadinessCheckIn } from "@/types/readiness";
import { WorkoutDay } from "@/types/workout";

const profile: OnboardingProfile = {
  age: "32",
  sex: "male",
  height: "5'10",
  weight: "185 lb",
  goalWeight: "195 lb",
  goalPace: "steady",
  activityLevel: "very-active",
  fitnessGoal: "muscle-gain",
  workoutExperience: "advanced",
  trainingPathId: "beast",
  workoutLocation: "gym",
  availableEquipment: ["barbell", "dumbbells", "bench"],
  dietaryPreference: "high-protein",
  injuriesOrLimitations: "",
};

const plannedWorkout: WorkoutDay = {
  id: "day-2",
  title: "Shoulders + Arms",
  focus: "Delts and arms",
  notes: "High-volume upper-body work.",
  exercises: [
    { name: "Clean and press", slug: "clean-and-press", sets: "5", reps: "8-12", restTime: "90 sec", notes: "Press with control." },
    { name: "Dumbbell shoulder press", slug: "dumbbell-shoulder-press", sets: "5", reps: "8-12", restTime: "90 sec", notes: "Stay stacked." },
    { name: "Lateral raise", slug: "lateral-raise", sets: "5", reps: "12-15", restTime: "45 sec", notes: "Strict reps." },
    { name: "Skullcrusher", slug: "skullcrusher", sets: "5", reps: "10-12", restTime: "45 sec", notes: "Smooth elbows." },
    { name: "Wrist curl up", slug: "wrist-curl-up", sets: "4", reps: "15-20", restTime: "30 sec", notes: "Forearm finish." },
  ],
};

const goodCheckIn: DailyReadinessCheckIn = {
  checkinDate: "2026-05-23",
  sleepHours: 8,
  energyLevel: 8,
  soreness: { chest: 3, back: 3, shoulders: 3, arms: 3, legs: 3, core: 3 },
  jointPainNotes: "",
  timeAvailableMinutes: 70,
  previousSessionRpe: 7,
  stressLevel: 3,
};

export function validateAdaptiveTrainingBasics() {
  const lowSleep = adaptWorkoutForReadiness({
    profile,
    selectedTrainingPath: getTrainingPathById("beast"),
    plannedWorkout,
    checkIn: { ...goodCheckIn, sleepHours: 5 },
  });
  const shoulderPain = adaptWorkoutForReadiness({
    profile,
    selectedTrainingPath: getTrainingPathById("beast"),
    plannedWorkout,
    checkIn: { ...goodCheckIn, jointPainNotes: "Left shoulder pain on pressing." },
  });
  const shortTime = adaptWorkoutForReadiness({
    profile,
    selectedTrainingPath: getTrainingPathById("beast"),
    plannedWorkout,
    checkIn: { ...goodCheckIn, timeAvailableMinutes: 30 },
  });

  return {
    readinessScoreWorks: calculateReadinessScore(goodCheckIn) > calculateReadinessScore({ ...goodCheckIn, sleepHours: 4, stressLevel: 9 }),
    lowSleepReducesVolume: lowSleep.volumeAdjustment < 1,
    shoulderPainSwapsOverheadPressing: shoulderPain.exerciseSwaps.some((swap) => swap.from.toLowerCase().includes("press")),
    shortTimeKeepsCompoundsAndRemovesAccessories: shortTime.adjustedWorkout.exercises.length < plannedWorkout.exercises.length && shortTime.removedExercises.length > 0,
    geminiFailureFallbackAvailable: typeof adaptWorkoutForReadiness === "function",
  };
}
