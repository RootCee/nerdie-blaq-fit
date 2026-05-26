import { TrainingPathConfig } from "@/config/trainingPaths";
import { OnboardingProfile } from "@/types/onboarding";
import { DailyReadinessCheckIn } from "@/types/readiness";
import { WorkoutDay, WorkoutExercise } from "@/types/workout";

export interface AdaptiveTrainingInput {
  profile: OnboardingProfile;
  selectedTrainingPath: TrainingPathConfig;
  plannedWorkout: WorkoutDay;
  checkIn: DailyReadinessCheckIn;
}

export interface ExerciseSwap {
  from: string;
  to: string;
  reason: string;
}

export interface AdaptiveTrainingResult {
  adjustedWorkout: WorkoutDay;
  readinessScore: number;
  adjustmentSummary: string;
  coachMessage: string;
  safetyFlags: string[];
  volumeAdjustment: number;
  exerciseSwaps: ExerciseSwap[];
  removedExercises: string[];
  coachingCues: string[];
}

type JointRegion = "shoulder" | "knee" | "elbow" | "back";

const COMPOUND_PATTERNS = [
  "squat",
  "deadlift",
  "bench",
  "press",
  "row",
  "pull-up",
  "pulldown",
  "lunge",
  "clean",
];

const RISKY_MOVEMENT_SWAPS: Record<JointRegion, Array<{ pattern: RegExp; replacement: string }>> = {
  shoulder: [
    { pattern: /clean and press|shoulder press|overhead|upright row|skullcrusher/i, replacement: "Neutral-grip dumbbell press" },
    { pattern: /wide-grip pull-up/i, replacement: "Neutral-grip pulldown" },
    { pattern: /chest dips/i, replacement: "Push-up" },
  ],
  knee: [
    { pattern: /barbell squat|front squat/i, replacement: "Box squat" },
    { pattern: /reverse lunge|split squat/i, replacement: "Step-up" },
    { pattern: /leg extension/i, replacement: "Wall sit" },
  ],
  elbow: [
    { pattern: /skullcrusher|overhead tricep extension|upright row/i, replacement: "Cable pressdown" },
    { pattern: /barbell curl/i, replacement: "Hammer curl" },
    { pattern: /close-grip bench press/i, replacement: "Push-up" },
  ],
  back: [
    { pattern: /barbell deadlift|straight-leg deadlift|good morning/i, replacement: "Hip thrust" },
    { pattern: /barbell bent-over row/i, replacement: "Chest-supported row" },
    { pattern: /barbell squat|front squat/i, replacement: "Goblet squat" },
  ],
};

export function adaptWorkoutForReadiness(input: AdaptiveTrainingInput): AdaptiveTrainingResult {
  const readinessScore = calculateReadinessScore(input.checkIn);
  const safetyFlags = buildSafetyFlags(input.checkIn);
  const soreMusclePenalty = Math.max(...Object.values(input.checkIn.soreness));
  const volumeAdjustment = resolveVolumeAdjustment(input.checkIn, soreMusclePenalty);
  const jointRegions = detectJointRegions(input.checkIn.jointPainNotes);
  const exerciseSwaps: ExerciseSwap[] = [];
  const removedExercises: string[] = [];

  const swappedExercises = input.plannedWorkout.exercises.map((item) => {
    const swapped = swapExerciseForJointNotes(item, jointRegions);

    if (swapped.name !== item.name) {
      exerciseSwaps.push({
        from: item.name,
        to: swapped.name,
        reason: "Joint note suggests considering a safer movement pattern today.",
      });
    }

    return swapped;
  });

  const timeAdjustedExercises = trimForAvailableTime(swappedExercises, input.checkIn.timeAvailableMinutes, removedExercises);
  const adjustedExercises = applyVolumeAdjustment(timeAdjustedExercises, volumeAdjustment, input.checkIn.previousSessionRpe);
  const adjustedCoreFinisher = input.plannedWorkout.coreFinisher && input.checkIn.timeAvailableMinutes >= 45
    ? {
        ...input.plannedWorkout.coreFinisher,
        exercises: applyVolumeAdjustment(input.plannedWorkout.coreFinisher.exercises, Math.min(volumeAdjustment, 0.8), input.checkIn.previousSessionRpe),
      }
    : null;

  if (input.plannedWorkout.coreFinisher && !adjustedCoreFinisher) {
    removedExercises.push(input.plannedWorkout.coreFinisher.title);
  }

  const keptSlugs = new Set(adjustedExercises.map((item) => item.slug ?? item.name.toLowerCase()));
  const adjustedWorkout: WorkoutDay = {
    ...input.plannedWorkout,
    notes: buildWorkoutNotes(input.plannedWorkout.notes, volumeAdjustment, input.checkIn),
    exercises: adjustedExercises,
    coreFinisher: adjustedCoreFinisher,
    supersets: (input.plannedWorkout.supersets ?? [])
      .map((superset) => ({
        ...superset,
        exerciseSlugs: superset.exerciseSlugs.filter((slug) => keptSlugs.has(slug)),
      }))
      .filter((superset) => superset.exerciseSlugs.length >= 2),
  };

  const coachingCues = buildCoachingCues(input.checkIn, volumeAdjustment, input.selectedTrainingPath.title);
  const adjustmentSummary = buildAdjustmentSummary(volumeAdjustment, exerciseSwaps, removedExercises, input.checkIn.timeAvailableMinutes);

  return {
    adjustedWorkout,
    readinessScore,
    adjustmentSummary,
    coachMessage: buildCoachMessage(readinessScore, input.selectedTrainingPath.title, safetyFlags),
    safetyFlags,
    volumeAdjustment,
    exerciseSwaps,
    removedExercises,
    coachingCues,
  };
}

export function calculateReadinessScore(checkIn: DailyReadinessCheckIn): number {
  const sorenessAverage = Object.values(checkIn.soreness).reduce((sum, value) => sum + value, 0) / Object.values(checkIn.soreness).length;
  const previousSessionRpe = checkIn.previousSessionRpe <= 0 ? 7 : checkIn.previousSessionRpe;
  const sleepScore = clamp((checkIn.sleepHours / 8) * 100, 0, 100);
  const energyScore = checkIn.energyLevel * 10;
  const stressScore = 110 - checkIn.stressLevel * 10;
  const sorenessScore = 110 - sorenessAverage * 10;
  const rpeScore = 110 - previousSessionRpe * 10;
  const jointPainPenalty = checkIn.jointPainNotes.trim() ? 8 : 0;

  return Math.round(clamp(
    sleepScore * 0.25 + energyScore * 0.25 + stressScore * 0.2 + sorenessScore * 0.2 + rpeScore * 0.1 - jointPainPenalty,
    0,
    100,
  ));
}

function resolveVolumeAdjustment(checkIn: DailyReadinessCheckIn, highestSoreness: number): number {
  let multiplier = 1;

  if (checkIn.sleepHours < 5.5 || highestSoreness >= 8) {
    multiplier -= 0.4;
  } else if (checkIn.sleepHours < 6.5 || highestSoreness >= 7) {
    multiplier -= 0.25;
  } else if (checkIn.sleepHours < 7 || highestSoreness >= 6) {
    multiplier -= 0.2;
  }

  if (checkIn.previousSessionRpe >= 9) {
    multiplier -= 0.1;
  }

  if (checkIn.stressLevel >= 8) {
    multiplier -= 0.1;
  }

  return clamp(Number(multiplier.toFixed(2)), 0.5, 1);
}

function applyVolumeAdjustment(exercises: WorkoutExercise[], volumeAdjustment: number, previousSessionRpe: number): WorkoutExercise[] {
  return exercises.map((item, index) => {
    const shouldAdjust = index >= 2 || volumeAdjustment <= 0.7;
    const nextSets = shouldAdjust ? adjustSetText(item.sets, volumeAdjustment) : item.sets;
    const rpeNote = previousSessionRpe >= 9 ? " Keep top sets one rep further from failure today." : "";

    return {
      ...item,
      sets: nextSets,
      notes: `${item.notes}${shouldAdjust && nextSets !== item.sets ? " Volume trimmed for today's readiness." : ""}${rpeNote}`,
    };
  });
}

function adjustSetText(sets: string, multiplier: number) {
  const firstNumber = sets.match(/\d+/)?.[0];

  if (!firstNumber) {
    return sets;
  }

  const currentSets = Number.parseInt(firstNumber, 10);
  const adjustedSets = Math.max(1, Math.round(currentSets * multiplier));

  return sets.replace(firstNumber, String(adjustedSets));
}

function trimForAvailableTime(exercises: WorkoutExercise[], minutes: number, removedExercises: string[]) {
  if (minutes >= 55 || exercises.length <= 4) {
    return exercises;
  }

  const compoundExercises = exercises.filter((item, index) => index < 2 || isCompoundExercise(item.name));
  const targetCount = minutes < 35 ? 4 : 5;
  const kept = compoundExercises.slice(0, targetCount);
  const keptNames = new Set(kept.map((item) => item.name));

  exercises.forEach((item) => {
    if (!keptNames.has(item.name)) {
      removedExercises.push(item.name);
    }
  });

  return kept;
}

function swapExerciseForJointNotes(exercise: WorkoutExercise, jointRegions: JointRegion[]): WorkoutExercise {
  for (const region of jointRegions) {
    const match = RISKY_MOVEMENT_SWAPS[region].find((entry) => entry.pattern.test(exercise.name));

    if (match) {
      return {
        ...exercise,
        name: match.replacement,
        displayName: match.replacement,
        slug: match.replacement.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        notes: `${exercise.notes} Consider this safer ${region}-friendly alternative today. Stop if pain worsens.`,
      };
    }
  }

  return exercise;
}

function detectJointRegions(notes: string): JointRegion[] {
  const normalized = notes.toLowerCase();

  return (["shoulder", "knee", "elbow", "back"] as JointRegion[]).filter((region) => normalized.includes(region));
}

function buildSafetyFlags(checkIn: DailyReadinessCheckIn): string[] {
  const flags: string[] = [];

  if (checkIn.jointPainNotes.trim()) {
    flags.push("Joint pain noted. Consider safer alternatives, use pain-free ranges, and stop if pain worsens.");
  }

  if (checkIn.sleepHours < 5.5) {
    flags.push("Low sleep reported. Training volume reduced today.");
  }

  if (Math.max(...Object.values(checkIn.soreness)) >= 8) {
    flags.push("High soreness reported. Accessories reduced before compounds.");
  }

  return flags;
}

function buildWorkoutNotes(baseNotes: string, volumeAdjustment: number, checkIn: DailyReadinessCheckIn) {
  const notes = [baseNotes];

  if (volumeAdjustment < 1) {
    notes.push(`Today's accessory volume is set to ${Math.round(volumeAdjustment * 100)}% based on readiness.`);
  }

  if (checkIn.timeAvailableMinutes < 55) {
    notes.push(`Session compressed for ${checkIn.timeAvailableMinutes} minutes: compounds stay first, lower-priority accessories move out.`);
  }

  return notes.join(" ");
}

function buildAdjustmentSummary(volumeAdjustment: number, exerciseSwaps: ExerciseSwap[], removedExercises: string[], minutes: number) {
  const parts = [`Volume target: ${Math.round(volumeAdjustment * 100)}%.`];

  if (exerciseSwaps.length) {
    parts.push(`${exerciseSwaps.length} movement swap${exerciseSwaps.length === 1 ? "" : "s"} for joint notes.`);
  }

  if (removedExercises.length) {
    parts.push(`${removedExercises.length} lower-priority item${removedExercises.length === 1 ? "" : "s"} removed for recovery or time.`);
  }

  if (minutes < 55) {
    parts.push("Compounds preserved for the shorter session.");
  }

  return parts.join(" ");
}

function buildCoachMessage(readinessScore: number, pathTitle: string, safetyFlags: string[]) {
  if (safetyFlags.some((flag) => flag.includes("Joint pain"))) {
    return `${pathTitle} stays on track today, but pain-free movement quality comes first. Consider the swaps, stay conservative, and stop if pain worsens.`;
  }

  if (readinessScore < 55) {
    return `${pathTitle} still moves forward today. Keep the big rocks, trim the extra fatigue, and leave the gym better than you entered.`;
  }

  if (readinessScore > 80) {
    return `Readiness is strong. Run the plan with intent, keep form clean, and earn the next progression.`;
  }

  return `Good enough to train, smart enough to adjust. Hit the compounds, respect the accessories, and keep recovery honest.`;
}

function buildCoachingCues(checkIn: DailyReadinessCheckIn, volumeAdjustment: number, pathTitle: string) {
  const cues = [`Stay inside the ${pathTitle} target muscles and progression.`];

  if (volumeAdjustment < 1) {
    cues.push("Use crisp reps and stop before technical failure.");
  }

  if (checkIn.timeAvailableMinutes < 55) {
    cues.push("Start with compounds and skip anything removed today.");
  }

  if (checkIn.previousSessionRpe >= 9) {
    cues.push("Reduce load slightly if warm-ups feel heavier than usual.");
  }

  return cues;
}

function isCompoundExercise(name: string) {
  const normalized = name.toLowerCase();
  return COMPOUND_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
