import { EquipmentOption, FitnessGoal, WorkoutExperience, WorkoutLocation } from "@/types/onboarding";
import { getExerciseDisplayName, toExerciseSlug } from "@/features/workouts/exercise-library";
import { parseWeightInPounds } from "@/lib/body-metrics";
import {
  CoreFinisherBlock,
  CoreFinisherEmphasis,
  SupportedWorkoutGoal,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutPlannerInput,
  WorkoutSupersetGroup,
} from "@/types/workout";

const WORKOUT_PLAN_VERSION = "arnold-variation-1-v4";
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const ADVANCED_VARIATION_ANCHOR_UTC = Date.UTC(2026, 0, 5);
const ADVANCED_WEEKLY_WORKOUT_TARGET = 6;

type ExerciseLibrary = {
  push: string[];
  pull: string[];
  squat: string[];
  hinge: string[];
  core: string[];
  conditioning: string[];
  chest: string[];
  back: string[];
  shoulders: string[];
  arms: string[];
  forearms: string[];
  legs: string[];
  frontAbs: string[];
  obliques: string[];
};

function normalizeGoal(goal: FitnessGoal | null): SupportedWorkoutGoal {
  if (goal === "fat-loss") {
    return "fat-loss";
  }

  if (goal === "muscle-gain") {
    return "muscle-gain";
  }

  return "general-fitness";
}

function resolveLocation(location: WorkoutLocation | null, equipment: EquipmentOption[]): WorkoutLocation {
  if (location === "home" || location === "gym") {
    return location;
  }

  if (equipment.includes("barbell") || equipment.includes("bench") || equipment.includes("cardio-machine")) {
    return "gym";
  }

  return "home";
}

function resolveTrainingDays(
  goal: SupportedWorkoutGoal,
  experience: WorkoutExperience,
  activityLevel: WorkoutPlannerInput["activityLevel"],
  goalPace: WorkoutPlannerInput["goalPace"],
  weight: string,
  goalWeight: string,
): number {
  const experienceBase: Record<WorkoutExperience, number> = {
    beginner: 3,
    intermediate: 4,
    advanced: 5,
  };

  let days = experienceBase[experience];

  if (goal === "fat-loss" && days < 4) {
    days += 1;
  }

  if (goal === "muscle-gain" && experience === "advanced") {
    days = 5;
  }

  if (activityLevel === "sedentary") {
    days = Math.max(3, days - 1);
  }

  if (activityLevel === "athlete" && experience === "advanced") {
    days = Math.min(6, days + 1);
  }

  const currentWeight = parseWeightInPounds(weight);
  const targetWeight = parseWeightInPounds(goalWeight);
  const weightDelta = currentWeight && targetWeight ? targetWeight - currentWeight : null;

  if (goalPace === "aggressive" && goal === "fat-loss" && weightDelta !== null && weightDelta < 0) {
    days = Math.min(5, days + 1);
  }

  if (goalPace === "easy" && goal === "muscle-gain" && weightDelta !== null && weightDelta > 0) {
    days = Math.max(3, days - 1);
  }

  return days;
}

function buildExerciseLibrary(location: WorkoutLocation, equipment: EquipmentOption[]): ExerciseLibrary {
  const hasDumbbells = equipment.includes("dumbbells");
  const hasBands = equipment.includes("resistance-bands");
  const hasKettlebells = equipment.includes("kettlebells");
  const hasBarbell = equipment.includes("barbell");
  const hasBench = equipment.includes("bench");
  const hasPullUpBar = equipment.includes("pull-up-bar");
  const hasCardio = equipment.includes("cardio-machine");
  const isGym = location === "gym";

  return {
    push: [
      hasBarbell && isGym ? "Barbell bench press" : "",
      hasBench && hasDumbbells ? "Dumbbell bench press" : "",
      hasDumbbells ? "Dumbbell shoulder press" : "",
      hasBands ? "Resistance band chest press" : "",
      "Push-up",
      "Incline push-up",
      hasKettlebells ? "Kettlebell floor press" : "",
      "Pike push-up",
    ].filter(Boolean),
    pull: [
      hasBarbell && isGym ? "Barbell bent-over row" : "",
      hasDumbbells ? "Single-arm dumbbell row" : "",
      hasBands ? "Resistance band row" : "",
      hasPullUpBar ? "Assisted pull-up or chin-up" : "",
      "Back widows",
      "Prone Y-T-W raises",
      hasKettlebells ? "Kettlebell row" : "",
    ].filter(Boolean),
    squat: [
      hasBarbell && isGym ? "Barbell back squat" : "",
      hasDumbbells ? "Goblet squat" : "",
      hasKettlebells ? "Kettlebell front squat" : "",
      "Bodyweight squat",
      "Reverse lunge",
      "Split squat",
      hasBench ? "Bench step-up" : "Step-up",
    ].filter(Boolean),
    hinge: [
      hasBarbell && isGym ? "Romanian deadlift" : "",
      hasDumbbells ? "Dumbbell Romanian deadlift" : "",
      hasKettlebells ? "Kettlebell deadlift" : "",
      "Glute bridge",
      "Hip hinge drill",
      "Single-leg glute bridge",
      "Good morning",
    ].filter(Boolean),
    core: [
      "Dead bug",
      "Plank",
      "Side plank",
      "Hollow hold",
      "Bird dog",
      "Slow mountain climber",
    ],
    conditioning: [
      hasCardio ? "Cardio intervals" : "",
      "Brisk walk or incline walk",
      "March in place finisher",
      "Low-impact bodyweight circuit",
      "Shadow boxing intervals",
      hasKettlebells ? "Kettlebell swing finisher" : "",
    ].filter(Boolean),
    chest: [
      hasBarbell && isGym ? "Barbell bench press" : "",
      hasBench && isGym ? "Incline bench press" : "",
      hasDumbbells && hasBench ? "Chest fly" : "",
      hasDumbbells && hasBench ? "Dumbbell pullover" : "",
      isGym ? "Chest dips" : "",
      hasBands ? "Resistance band chest press" : "",
      "Push-up",
    ].filter(Boolean),
    back: [
      isGym ? "Lat pulldown" : "",
      hasBarbell && isGym ? "Barbell bent-over row" : "",
      hasDumbbells ? "Single-arm dumbbell row" : "",
      hasBands ? "Resistance band row" : "",
      hasPullUpBar ? "Assisted pull-up or chin-up" : "",
      "Back widows",
      "Prone Y-T-W raises",
    ].filter(Boolean),
    shoulders: [
      isGym ? "Clean and press" : "",
      hasDumbbells ? "Dumbbell shoulder press" : "",
      "Front raise",
      "Lateral raise",
      isGym ? "Upright row" : "",
      "Reverse fly",
    ].filter(Boolean),
    arms: [
      isGym ? "Barbell curl" : "",
      hasDumbbells && hasBench ? "Incline dumbbell curl" : "",
      isGym ? "Skullcrusher" : "",
      "Overhead tricep extension",
      "Push-up",
    ].filter(Boolean),
    forearms: [
      "Wrist curl up",
      "Wrist curl down",
      isGym ? "Barbell curl" : "",
    ].filter(Boolean),
    legs: [
      hasBarbell && isGym ? "Barbell squat" : "",
      hasBarbell && isGym ? "Barbell deadlift" : "",
      hasBarbell && isGym ? "Straight-leg deadlift" : "",
      hasBarbell && isGym ? "Good morning" : "",
      isGym ? "Leg extension" : "",
      isGym ? "Leg curl" : "",
      "Calf raise",
      hasDumbbells ? "Goblet squat" : "",
      "Split squat",
    ].filter(Boolean),
    frontAbs: [
      "Decline crunch",
      "Hanging leg raise",
      "Cable crunch",
      "Dragon flag",
      "Ab wheel rollout",
    ],
    obliques: [
      "Russian twist",
      "Landmine twist",
      "Cable woodchop",
      "Side plank hip dip",
      "Hanging oblique raise",
    ],
  };
}

function getPrescription(goal: SupportedWorkoutGoal, experience: WorkoutExperience) {
  if (goal === "muscle-gain") {
    return experience === "beginner"
      ? { sets: "3", reps: "8-12", rest: "75 sec" }
      : experience === "intermediate"
        ? { sets: "4", reps: "6-12", rest: "90 sec" }
        : { sets: "4-5", reps: "6-10", rest: "90-120 sec" };
  }

  if (goal === "fat-loss") {
    return experience === "beginner"
      ? { sets: "2-3", reps: "10-14", rest: "45-60 sec" }
      : experience === "intermediate"
        ? { sets: "3-4", reps: "10-15", rest: "45-60 sec" }
        : { sets: "4", reps: "10-16", rest: "30-60 sec" };
  }

  return experience === "beginner"
    ? { sets: "2-3", reps: "8-12", rest: "60 sec" }
    : experience === "intermediate"
      ? { sets: "3-4", reps: "8-12", rest: "60-75 sec" }
      : { sets: "4", reps: "6-12", rest: "60-90 sec" };
}

function exercise(name: string, sets: string, reps: string, restTime: string, notes: string): WorkoutExercise {
  return {
    slug: toExerciseSlug(name),
    name,
    displayName: getExerciseDisplayName(name),
    sets,
    reps,
    restTime,
    notes,
  };
}

function advancedPyramidExercise(
  name: string,
  restTime: string,
  notes: string,
  options?: {
    sets?: string;
    reps?: string;
  },
): WorkoutExercise {
  const sets = options?.sets ?? "5";
  const reps = options?.reps ?? "30 / 15 / 12 / 10 / 8";

  return exercise(
    name,
    sets,
    reps,
    restTime,
    `${notes} Set 1: 30 reps light warm-up. Set 2: 15 reps. Set 3: 12 reps. Set 4: 10 reps. Set 5: 8 reps. Increase weight each set only when form stays clean.`,
  );
}

function pick(list: string[], index: number): string {
  return list[index % list.length];
}

function resolveWeekIndex(referenceDate = new Date()) {
  const currentUtc = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const diffMs = Math.max(0, currentUtc - ADVANCED_VARIATION_ANCHOR_UTC);

  return Math.floor(diffMs / MS_PER_WEEK);
}

function resolveBiweeklyVariation<T>(options: T[], weekIndex: number) {
  return options[Math.floor(weekIndex / 2) % options.length];
}

function createCoreFinisher(
  emphasis: CoreFinisherEmphasis,
  index: number,
): CoreFinisherBlock {
  const frontCoreOptions = ["Dead bug", "Plank", "Hollow hold", "Bird dog"];
  const sideCoreOptions = ["Side plank", "Bird dog", "Slow mountain climber", "Dead bug"];

  if (emphasis === "front-core-trunk-stability") {
    return {
      title: "Core finisher",
      emphasis,
      notes: "A short trunk-stability finish to reinforce bracing without adding too much fatigue.",
      exercises: [
        exercise(frontCoreOptions[index % frontCoreOptions.length], "2", "8-12 reps or 20-30 sec", "15 sec", "Brace first, then move slowly."),
        exercise(frontCoreOptions[(index + 1) % frontCoreOptions.length], "2", "20-30 sec", "30 sec", "Breathe behind the brace and stay stacked."),
      ],
    };
  }

  return {
    title: "Core finisher",
    emphasis,
    notes: "A short side-core and anti-rotation finish to build control without draining recovery.",
    exercises: [
      exercise(sideCoreOptions[index % sideCoreOptions.length], "2", "20-30 sec each side", "15 sec", "Stay long through the spine."),
      exercise(sideCoreOptions[(index + 1) % sideCoreOptions.length], "2", "8-10 each side", "30 sec", "Move cleanly and keep the ribs quiet."),
    ],
  };
}

function createRotatingAbsFinisher(index: number, library: ExerciseLibrary): CoreFinisherBlock {
  const frontAbs = pick(library.frontAbs, index);
  const oblique = pick(library.obliques, index + 1);

  return {
    title: "Rotating abs superset",
    emphasis: "front-core-trunk-stability",
    notes: "Pair one front-ab move with one oblique move. Use strict reps and push the last quality set close to failure.",
    exercises: [
      exercise(frontAbs, "3-4", "10-15", "20 sec", "Pyramid into your top set, then finish the last clean set close to failure."),
      exercise(oblique, "3-4", "12-16 each side", "30 sec", "Stay controlled through the rotation or side bend and stop only when form starts to slip."),
    ],
  };
}

function createAdvancedAbsBlock(index: number): CoreFinisherBlock {
  const lowerAbsPool = [
    "Hanging knee raise",
    "Hanging leg raise",
    "Laying leg raise",
    "Toes to bar",
  ];
  const upperAbsPool = [
    "Decline sit-up",
    "Decline crunch",
    "Crunch",
    "Medicine ball sit-up",
    "Cable crunch",
  ];
  const obliquesPool = [
    "Russian twist",
    "Cable woodchop",
    "Hanging oblique knee raise",
    "Side plank hip dip",
  ];
  const coreStabilityPool = [
    "Plank",
    "Hollow hold",
    "Dead bug",
    "Bird dog",
  ];

  const lowerAbs = pick(lowerAbsPool, index);
  const upperAbs = pick(upperAbsPool, index);
  const obliques = pick(obliquesPool, index);
  const stability = pick(coreStabilityPool, index);

  return {
    title: "Blaq Core System",
    emphasis: "front-core-trunk-stability",
    notes: "Nerdie Blaq Fit finishes advanced sessions with dense standalone ab work: one lower-ab move, one upper-ab move, one oblique pattern, and one bracing hold. No supersets here. Level 1: 3 rounds. Level 2: 4 rounds. Level 3: 5 rounds.",
    exercises: [
      exercise(lowerAbs, "3-5 rounds", "15-25 reps", "20-30 sec", "Lower abs first. Keep the pelvis controlled and the reps clean."),
      exercise(upperAbs, "3-5 rounds", "15-25 reps", "20-30 sec", "Move through a full but controlled trunk-flexion range."),
      exercise(obliques, "3-5 rounds", "20 total reps or 10 each side", "20-30 sec", "Stay smooth side to side and own the oblique contraction."),
      exercise(stability, "3-5 rounds", "45-60 sec", "30-45 sec", "Brace hard and build time under tension without losing shape."),
    ],
  };
}

function createSupersetGroup(
  id: string,
  title: string,
  exercises: WorkoutExercise[],
  restAfterGroup: string,
  notes: string,
): WorkoutSupersetGroup {
  return {
    id,
    title,
    exerciseSlugs: exercises.map((entry) => entry.slug ?? toExerciseSlug(entry.name)),
    restAfterGroup,
    notes,
  };
}

function buildDay(
  id: string,
  title: string,
  focus: string,
  notes: string,
  exercises: WorkoutExercise[],
  options?: {
    coreFinisher?: CoreFinisherBlock | null;
    supersets?: WorkoutSupersetGroup[];
  },
): WorkoutDay {
  return {
    id,
    title,
    focus,
    notes,
    exercises,
    coreFinisher: options?.coreFinisher ?? null,
    supersets: options?.supersets ?? [],
  };
}

function buildFullBodyDays(
  trainingDays: number,
  library: ExerciseLibrary,
  goal: SupportedWorkoutGoal,
  experience: WorkoutExperience,
): WorkoutDay[] {
  const prescription = getPrescription(goal, experience);

  return Array.from({ length: trainingDays }).map((_, index) => {
    const mainExercises = [
      exercise(pick(library.squat, index), prescription.sets, prescription.reps, prescription.rest, "Own the tempo on the lowering phase."),
      exercise(pick(library.push, index), prescription.sets, prescription.reps, prescription.rest, "Stop each set before form breaks."),
      exercise(pick(library.pull, index), prescription.sets, prescription.reps, prescription.rest, "Pause briefly at peak contraction."),
      exercise(pick(library.hinge, index), prescription.sets, prescription.reps, prescription.rest, "Brace before each rep."),
      exercise(
        pick(library.conditioning, index),
        goal === "muscle-gain" ? "2" : "3",
        goal === "muscle-gain" ? "5-8 min" : "8-12 min",
        "As needed",
        goal === "muscle-gain" ? "Keep conditioning easy enough to preserve recovery." : "Sustainable pace over all-out effort.",
      ),
    ];
    const coreFinisher = createCoreFinisher(index % 2 === 0 ? "front-core-trunk-stability" : "obliques-side-core", index);

    return buildDay(
      `day-${index + 1}`,
      `Day ${index + 1}: Full Body`,
      index % 2 === 0 ? "Squat + push emphasis" : "Hinge + pull emphasis",
      goal === "fat-loss"
        ? "Move briskly between exercises while keeping form crisp."
        : "Leave 1-2 reps in reserve on most sets for steady weekly progress.",
      mainExercises,
      {
        supersets: [
          createSupersetGroup(
            `day-${index + 1}-superset-1`,
            "Accessory push/pull superset",
            [mainExercises[1], mainExercises[2]],
            goal === "fat-loss" ? "45-60 sec after both exercises" : "60-75 sec after both exercises",
            "Alternate the lighter press and pull before resting.",
          ),
          createSupersetGroup(
            `day-${index + 1}-core-finisher`,
            "Core finisher superset",
            coreFinisher.exercises,
            "30 sec after both exercises",
            "Move between the two core drills, then rest briefly.",
          ),
        ],
        coreFinisher,
      },
    );
  });
}

function buildSplitDays(
  trainingDays: number,
  library: ExerciseLibrary,
  goal: SupportedWorkoutGoal,
  experience: WorkoutExperience,
): WorkoutDay[] {
  const prescription = getPrescription(goal, experience);

  const dayOneExercises = [
    exercise(pick(library.push, 0), prescription.sets, prescription.reps, prescription.rest, "Make the first set your technique benchmark."),
    exercise(pick(library.pull, 0), prescription.sets, prescription.reps, prescription.rest, "Drive elbows, not hands."),
    exercise(pick(library.push, 1), prescription.sets, prescription.reps, prescription.rest, "Smooth reps beat sloppy load jumps."),
    exercise(pick(library.pull, 1), prescription.sets, prescription.reps, prescription.rest, "Own the last rep."),
  ];
  const dayOneCoreFinisher = createCoreFinisher("front-core-trunk-stability", 0);
  const upperOne = buildDay(
    "day-1",
    "Day 1: Upper Strength",
    "Push + pull foundation",
    "Start the week with controlled compounds and full range of motion.",
    dayOneExercises,
    {
      supersets: [
        createSupersetGroup("day-1-superset-1", "Accessory upper superset", [dayOneExercises[2], dayOneExercises[3]], "60 sec after both exercises", "Pair the later upper-body accessories before resting."),
        createSupersetGroup("day-1-core-finisher", "Core finisher superset", dayOneCoreFinisher.exercises, "30 sec after both exercises", "Short front-core finish for trunk stability."),
      ],
      coreFinisher: dayOneCoreFinisher,
    },
  );

  const dayTwoExercises = [
    exercise(pick(library.squat, 0), prescription.sets, prescription.reps, prescription.rest, "Use a depth you can control well."),
    exercise(pick(library.hinge, 0), prescription.sets, prescription.reps, prescription.rest, "Keep ribs stacked over hips."),
    exercise(pick(library.squat, 1), prescription.sets, prescription.reps, prescription.rest, "Work both legs evenly."),
    exercise(pick(library.hinge, 1), prescription.sets, prescription.reps, prescription.rest, "No rushed reps."),
  ];
  const dayTwoCoreFinisher = createCoreFinisher("obliques-side-core", 1);
  const lowerOne = buildDay(
    "day-2",
    "Day 2: Lower Body",
    "Squat + hinge patterning",
    "Keep the lower body work controlled and joint-friendly.",
    dayTwoExercises,
    {
      supersets: [
        createSupersetGroup("day-2-superset-1", "Accessory lower superset", [dayTwoExercises[2], dayTwoExercises[3]], "60 sec after both exercises", "Pair the later lower-body accessories before resting."),
        createSupersetGroup("day-2-core-finisher", "Core finisher superset", dayTwoCoreFinisher.exercises, "30 sec after both exercises", "Wrap with short side-core work."),
      ],
      coreFinisher: dayTwoCoreFinisher,
    },
  );

  const dayThreeExercises = [
    exercise(pick(library.push, 2), prescription.sets, prescription.reps, prescription.rest, "Focus on smooth control."),
    exercise(pick(library.pull, 2), prescription.sets, prescription.reps, prescription.rest, "Own the squeeze at the top."),
    exercise(pick(library.push, 3), prescription.sets, prescription.reps, prescription.rest, "Stop shy of technical failure."),
    exercise(pick(library.pull, 3), prescription.sets, prescription.reps, prescription.rest, "Use the full line of pull."),
    exercise(pick(library.conditioning, 0), goal === "muscle-gain" ? "2" : "3", goal === "muscle-gain" ? "5-8 min" : "8-12 min", "As needed", "Nasal breathing pace if possible."),
  ];
  const upperTwo = buildDay(
    "day-3",
    "Day 3: Upper Volume",
    "Hypertrophy and shoulder-friendly pressing",
    "Chase quality muscle work without grinding reps.",
    dayThreeExercises,
    {
      supersets: [
        createSupersetGroup("day-3-superset-1", "Accessory press/row superset", [dayThreeExercises[2], dayThreeExercises[3]], "45-60 sec after both exercises", "Use this pairing to keep upper-body volume efficient."),
      ],
    },
  );

  const dayFourExercises = [
    exercise(pick(library.squat, 2), prescription.sets, prescription.reps, prescription.rest, "Stay balanced through the whole foot."),
    exercise(pick(library.hinge, 2), prescription.sets, prescription.reps, prescription.rest, "Use a strong brace each set."),
    exercise(pick(library.squat, 3), prescription.sets, prescription.reps, prescription.rest, "Choose control over speed."),
    exercise(pick(library.hinge, 3), prescription.sets, prescription.reps, prescription.rest, "Pause briefly at the top."),
  ];
  const dayFourCoreFinisher = createCoreFinisher("front-core-trunk-stability", 2);
  const lowerTwo = buildDay(
    "day-4",
    "Day 4: Lower Volume",
    "Single-leg work and glute strength",
    "Finish strong with stable lower-body volume and core control.",
    dayFourExercises,
    {
      supersets: [
        createSupersetGroup("day-4-superset-1", "Accessory lower superset", [dayFourExercises[2], dayFourExercises[3]], "60 sec after both exercises", "Pair the later lower-body work to save time."),
        createSupersetGroup("day-4-core-finisher", "Core finisher superset", dayFourCoreFinisher.exercises, "30 sec after both exercises", "Short trunk-stability work to finish the day cleanly."),
      ],
      coreFinisher: dayFourCoreFinisher,
    },
  );

  const conditioningExercises = [
    exercise(pick(library.conditioning, 1), "3-4", "8-12 min", "60 sec", "Steady sustainable pace."),
    exercise(pick(library.conditioning, 2), "3", "45 sec", "30 sec", "Light, crisp movement."),
  ];
  const conditioningCoreFinisher = createCoreFinisher("obliques-side-core", 3);
  const conditioning = buildDay(
    "day-5",
    "Day 5: Conditioning + Core",
    "Aerobic work and recovery support",
    "Keep this day challenging but not punishing so the week stays sustainable.",
    conditioningExercises,
    {
      supersets: [
        createSupersetGroup("day-5-conditioning-superset", "Conditioning superset", conditioningExercises, "45 sec after both blocks", "Alternate the two conditioning pieces before resting."),
        createSupersetGroup("day-5-core-finisher", "Core finisher superset", conditioningCoreFinisher.exercises, "30 sec after both exercises", "Finish with low-stress side-core work."),
      ],
      coreFinisher: conditioningCoreFinisher,
    },
  );

  return [upperOne, lowerOne, upperTwo, lowerTwo, conditioning].slice(0, trainingDays);
}

type AdvancedIntensityPhase = "base" | "burnout" | "tempo";

function resolveAdvancedIntensityPhase(completedWorkoutCount: number): AdvancedIntensityPhase {
  const completedWeeks = Math.floor(completedWorkoutCount / ADVANCED_WEEKLY_WORKOUT_TARGET);

  if (completedWeeks >= 4) {
    return "tempo";
  }

  if (completedWeeks >= 2) {
    return "burnout";
  }

  return "base";
}

function applyAdvancedIntensityTechniques(exercises: WorkoutExercise[], phase: AdvancedIntensityPhase): WorkoutExercise[] {
  if (phase === "base" || !exercises.length) {
    return exercises;
  }

  return exercises.map((exerciseEntry, index) => {
    if (index !== exercises.length - 1) {
      return phase === "tempo"
        ? {
            ...exerciseEntry,
            tempoCue: "3-second eccentric on every rep.",
          }
        : exerciseEntry;
    }

    const withBurnout = {
      ...exerciseEntry,
      sets: `${exerciseEntry.sets} + 1 burnout`,
      notes: `${exerciseEntry.notes} Finish with one burnout set after your final full set.`,
      burnoutSetNote: "Add 1 burnout set after the final full set.",
    };

    if (phase === "tempo") {
      return {
        ...withBurnout,
        notes: `${withBurnout.notes} Use a 3-second eccentric on every rep.`,
        tempoCue: "3-second eccentric on every rep.",
      };
    }

    return withBurnout;
  });
}

function buildAdvancedBodybuildingDays(
  library: ExerciseLibrary,
  weekIndex: number,
  completedWorkoutCount: number,
): WorkoutDay[] {
  const workSets = "5";
  const repGoal = "30 / 15 / 12 / 10 / 8";
  const rest = "60-90 sec";
  const intensityPhase = resolveAdvancedIntensityPhase(completedWorkoutCount);
  const chestPressVariation = resolveBiweeklyVariation(
    ["Incline bench press", "Decline bench press", "Barbell bench press"],
    weekIndex,
  );
  const squatVariation = resolveBiweeklyVariation(
    ["Barbell squat", "Front squat", "Goblet squat"],
    weekIndex,
  );

  const chestBackOneAbs = createAdvancedAbsBlock(0);
  const shouldersArmsOneAbs = createAdvancedAbsBlock(1);
  const legsOneAbs = createAdvancedAbsBlock(2);
  const chestBackTwoAbs = createAdvancedAbsBlock(3);
  const shouldersArmsTwoAbs = createAdvancedAbsBlock(4);
  const legsTwoAbs = createAdvancedAbsBlock(5);

  const chestBackOneBase = [
    advancedPyramidExercise("Barbell bench press", rest, "Use the first three sets to build toward crisp working weight."),
    advancedPyramidExercise(chestPressVariation, rest, "Keep the current press variation strict and chest-driven."),
    advancedPyramidExercise("Chest fly", "45-60 sec", "Control the stretch and squeeze through the chest."),
    advancedPyramidExercise("Dumbbell pullover", "45-60 sec", "Stay long through the lats and ribs-down through the arc."),
    exercise("Wide-grip pull-up", "3-4", "10 or failure", rest, "Use bodyweight control first and let the last clean reps approach failure."),
    advancedPyramidExercise("Barbell bent-over row", rest, "Drive elbows back and own the squeeze without jerking the torso."),
    advancedPyramidExercise("Barbell deadlift", "90-120 sec", "Build patiently and keep every heavy rep technically sharp."),
  ];
  const chestBackOne = applyAdvancedIntensityTechniques(chestBackOneBase, intensityPhase);

  const shouldersArmsOneBase = [
    advancedPyramidExercise("Clean and press", rest, "Treat each rep as an athletic clean into a stacked press."),
    advancedPyramidExercise("Dumbbell shoulder press", rest, "Stay stacked through the trunk and press with control."),
    advancedPyramidExercise("Front raise", "45-60 sec", "Move the load cleanly without torso sway."),
    advancedPyramidExercise("Lateral raise", "45-60 sec", "Lead with the elbows and keep the shoulders quiet."),
    advancedPyramidExercise("Upright row", rest, "Use a shoulder-friendly range and smooth pull."),
    advancedPyramidExercise("Reverse fly", "45-60 sec", "Open through the upper back instead of shrugging."),
    advancedPyramidExercise("Barbell curl", "45-60 sec", "Lower slowly and avoid swinging."),
    advancedPyramidExercise("Incline dumbbell curl", "45-60 sec", "Use the stretched bottom to keep the biceps loaded."),
    advancedPyramidExercise("Close-grip bench press", rest, "Keep elbows tucked and make the triceps do the work."),
    advancedPyramidExercise("Skullcrusher", "45-60 sec", "Lower smoothly and lock out hard without flaring."),
    advancedPyramidExercise("Overhead tricep extension", "45-60 sec", "Keep elbows pointed forward and stay long through the triceps."),
    advancedPyramidExercise("Wrist curl up", "30-45 sec", "Move only at the wrist and hold the top briefly."),
    advancedPyramidExercise("Wrist curl down", "30-45 sec", "Use lighter load and continuous tension."),
  ];
  const shouldersArmsOne = applyAdvancedIntensityTechniques(shouldersArmsOneBase, intensityPhase);

  const legsOneBase = [
    advancedPyramidExercise(squatVariation, rest, "Build depth and tension before you chase load.", {
      sets: "8-10",
      reps: "30 / 15 / 12 / 10 / 8, then 3-5 x 8-10",
    }),
    advancedPyramidExercise("Reverse lunge", "60-90 sec", "Train both legs evenly and keep the torso tall."),
    advancedPyramidExercise("Leg extension", "45-60 sec", "Pause and squeeze the quads without slamming the stack."),
    advancedPyramidExercise("Leg curl", "45-60 sec", "Own the eccentric and finish every rep clean."),
    advancedPyramidExercise("Straight-leg deadlift", rest, "Load the hamstrings without losing spinal position."),
    advancedPyramidExercise("Good morning", rest, "Use strict hinge mechanics and conservative loading."),
    exercise("Standing calf raise", "4-5", "15-20", "30-45 sec", "Use a full stretch, pause high, and finish the lower legs without bouncing."),
  ];
  const legsOne = applyAdvancedIntensityTechniques(legsOneBase, intensityPhase);

  const chestBackTwoBase = [
    advancedPyramidExercise("Barbell bench press", rest, "Repeat the main press and chase repeatable high-quality reps."),
    advancedPyramidExercise(chestPressVariation, rest, "Stay crisp under fatigue and keep the variation controlled."),
    advancedPyramidExercise("Standing chest fly", "45-60 sec", "Use it as a chest accessory if the cable station is free; otherwise swap back to chest fly."),
    advancedPyramidExercise("Dumbbell pullover", "45-60 sec", "Stretch under control and keep the ribs stacked."),
    exercise("Wide-grip pull-up", "3-4", "10 or failure", rest, "Accumulate strong vertical pulling volume and push the last quality reps."),
    advancedPyramidExercise("Barbell bent-over row", rest, "Pause briefly at the top before lowering."),
    advancedPyramidExercise("Lat pulldown", "60-75 sec", "Drive the elbows down and keep the torso tall."),
    advancedPyramidExercise("Straight-leg deadlift", "90-120 sec", "Bias the posterior chain while keeping every hinge rep clean."),
  ];
  const chestBackTwo = applyAdvancedIntensityTechniques(chestBackTwoBase, intensityPhase);

  const shouldersArmsTwoBase = [
    advancedPyramidExercise("Clean and press", rest, "Stay explosive out of the clean and stacked on the press."),
    advancedPyramidExercise("Dumbbell shoulder press", rest, "Keep tension on the delts all the way through."),
    advancedPyramidExercise("Front raise", "45-60 sec", "Lift cleanly to shoulder height and own the lowering phase."),
    advancedPyramidExercise("Lateral raise", "45-60 sec", "Strict reps and no swinging through fatigue."),
    advancedPyramidExercise("Upright row", rest, "Pull smoothly to a comfortable shoulder height."),
    advancedPyramidExercise("Reverse fly", "45-60 sec", "Keep the rear delts and upper back engaged on every rep."),
    advancedPyramidExercise("Barbell curl", "45-60 sec", "Use the later sets to chase a hard but clean biceps pump."),
    advancedPyramidExercise("Incline dumbbell curl", "45-60 sec", "Stretch and squeeze on every rep."),
    advancedPyramidExercise("Close-grip bench press", rest, "Drive through the triceps and control the lowering phase."),
    advancedPyramidExercise("Skullcrusher", "45-60 sec", "Stay smooth through the elbows and stop before joint irritation builds."),
    advancedPyramidExercise("Overhead tricep extension", "45-60 sec", "Reach a full lockout while keeping the ribs down."),
    advancedPyramidExercise("Wrist curl up", "30-45 sec", "Stay smooth and keep tension in the forearm flexors."),
    advancedPyramidExercise("Wrist curl down", "30-45 sec", "Use strict wrist motion and lighter load."),
  ];
  const shouldersArmsTwo = applyAdvancedIntensityTechniques(shouldersArmsTwoBase, intensityPhase);

  const legsTwoBase = [
    advancedPyramidExercise(squatVariation, rest, "Repeat the current squat variation and keep output high without losing depth.", {
      sets: "8-10",
      reps: "30 / 15 / 12 / 10 / 8, then 3-5 x 8-10",
    }),
    advancedPyramidExercise("Reverse lunge", "60-90 sec", "Stay balanced and clean through each side."),
    advancedPyramidExercise("Leg extension", "45-60 sec", "Chase a hard quad squeeze without rushing the stack."),
    advancedPyramidExercise("Leg curl", "45-60 sec", "Own the hamstring squeeze with steady tempo."),
    advancedPyramidExercise("Straight-leg deadlift", rest, "Keep the bar close and the hamstrings loaded."),
    advancedPyramidExercise("Good morning", rest, "Treat this as strict lower-back and hinge practice under load."),
    exercise("Standing calf raise", "4-5", "15-20", "30-45 sec", "Full stretch, hard squeeze, no bouncing."),
  ];
  const legsTwo = applyAdvancedIntensityTechniques(legsTwoBase, intensityPhase);

  return [
    buildDay("day-1", "Mon: Chest + Back + Abs", "Arnold Variation #1 chest and back", "Advanced 60-75 minute muscle-build day. Pyramid your early sets, use clean reps, and let the final quality set on pulls approach failure when called for. Scale volume down if recovery slips.", chestBackOne, {
      coreFinisher: chestBackOneAbs,
      supersets: [
        createSupersetGroup("day-1-chest-superset", "Chest expansion superset", [chestBackOne[2], chestBackOne[3]], "60 sec after both exercises", "Pair the fly with the pullover after your main presses. Keep the reps smooth and chest-driven."),
        createSupersetGroup("day-1-back-superset", "Back density superset", [chestBackOne[4], chestBackOne[5]], "75-90 sec after both exercises", "Alternate the wide-grip pull-up and bent-over row once your shoulders and trunk are ready."),
      ],
    }),
    buildDay("day-2", "Tue: Shoulders + Arms + Forearms + Abs", "Arnold Variation #1 shoulders and arms", "High-volume advanced upper-body work. Keep isolation strict, respect the short rests, and stop only when form starts to break. Scale volume if elbows or shoulders stop recovering.", shouldersArmsOne, {
      coreFinisher: shouldersArmsOneAbs,
      supersets: [
        createSupersetGroup("day-2-shoulder-superset-1", "Shoulder cap superset", [shouldersArmsOne[2], shouldersArmsOne[3]], "45-60 sec after both exercises", "Run the front raise and lateral raise together for dense delt volume."),
        createSupersetGroup("day-2-shoulder-superset-2", "Shoulder balance superset", [shouldersArmsOne[4], shouldersArmsOne[5]], "60 sec after both exercises", "Pair the upright row with reverse fly for upper-back-supported shoulder work."),
        createSupersetGroup("day-2-biceps-superset", "Biceps stretch superset", [shouldersArmsOne[6], shouldersArmsOne[7]], "45-60 sec after both exercises", "Keep both curls strict and let the pump build without swinging."),
        createSupersetGroup("day-2-triceps-superset", "Triceps extension superset", [shouldersArmsOne[9], shouldersArmsOne[10]], "45-60 sec after both exercises", "Close-grip bench stays your heavy triceps compound; these two are the direct arm pairing."),
        createSupersetGroup("day-2-forearm-superset", "Forearm finish superset", [shouldersArmsOne[11], shouldersArmsOne[12]], "30-45 sec after both exercises", "Alternate palms-up and palms-down wrist work before resting."),
      ],
    }),
    buildDay("day-3", "Wed: Legs + Lower Back + Abs", "Arnold Variation #1 legs and lower back", "This is the lower-body and lower-back day. Keep the hinges disciplined, let squats own the session, and scale volume if lower-back recovery suffers.", legsOne, {
      coreFinisher: legsOneAbs,
      supersets: [
        createSupersetGroup("day-3-leg-superset", "Quad and hamstring superset", [legsOne[2], legsOne[3]], "60 sec after both exercises", "Use the leg extension and leg curl as a dense lower-body accessory pairing after the main squat and lunge work."),
      ],
    }),
    buildDay("day-4", "Thu: Chest + Back + Abs", "Arnold Variation #1 chest and back repeat", "Repeat the chest and back pattern with steady quality and controlled fatigue management. Split the final pairing apart if your hinge position degrades.", chestBackTwo, {
      coreFinisher: chestBackTwoAbs,
      supersets: [
        createSupersetGroup("day-4-chest-superset", "Chest expansion superset", [chestBackTwo[2], chestBackTwo[3]], "60 sec after both exercises", "Use the standing fly if the cable lane is open; otherwise swap back to the standard chest fly and keep the pullover strict."),
        createSupersetGroup("day-4-back-superset-1", "Back density superset", [chestBackTwo[4], chestBackTwo[5]], "75-90 sec after both exercises", "Keep the pull-up and row pairing controlled before you rest."),
        createSupersetGroup("day-4-back-superset-2", "Back hinge pairing", [chestBackTwo[6], chestBackTwo[7]], "90-120 sec after both exercises", "Only keep this as a true pairing when your bracing and recovery are solid. Otherwise perform them separately."),
      ],
    }),
    buildDay("day-5", "Fri: Shoulders + Arms + Forearms + Abs", "Arnold Variation #1 shoulders and arms repeat", "Repeat the shoulder and arm volume with strict execution and controlled near-failure effort. Pull volume down before your joints get cranky.", shouldersArmsTwo, {
      coreFinisher: shouldersArmsTwoAbs,
      supersets: [
        createSupersetGroup("day-5-shoulder-superset-1", "Shoulder cap superset", [shouldersArmsTwo[2], shouldersArmsTwo[3]], "45-60 sec after both exercises", "Run the front raise and lateral raise together for dense delt volume."),
        createSupersetGroup("day-5-shoulder-superset-2", "Shoulder balance superset", [shouldersArmsTwo[4], shouldersArmsTwo[5]], "60 sec after both exercises", "Pair the upright row with reverse fly to finish the shoulders cleanly."),
        createSupersetGroup("day-5-biceps-superset", "Biceps stretch superset", [shouldersArmsTwo[6], shouldersArmsTwo[7]], "45-60 sec after both exercises", "Strict curls only. Keep the elbows quiet."),
        createSupersetGroup("day-5-triceps-superset", "Triceps extension superset", [shouldersArmsTwo[9], shouldersArmsTwo[10]], "45-60 sec after both exercises", "Keep the close-grip bench press heavy and let the extensions finish the arms."),
        createSupersetGroup("day-5-forearm-superset", "Forearm finish superset", [shouldersArmsTwo[11], shouldersArmsTwo[12]], "30-45 sec after both exercises", "Alternate palms-up and palms-down wrist work before resting."),
      ],
    }),
    buildDay("day-6", "Sat: Legs + Lower Back + Abs", "Arnold Variation #1 legs and lower back repeat", "Finish the week with disciplined leg and lower-back work before a full Sunday rest. Keep the last third of the session strict instead of sloppy.", legsTwo, {
      coreFinisher: legsTwoAbs,
      supersets: [
        createSupersetGroup("day-6-leg-superset", "Quad and hamstring superset", [legsTwo[2], legsTwo[3]], "60 sec after both exercises", "Use the machine pairing for dense quad and hamstring work after the main lower-body lifts."),
      ],
    }),
  ];
}

export function canGenerateWorkoutPlan(input: WorkoutPlannerInput): boolean {
  return Boolean(input.fitnessGoal && input.workoutExperience && input.workoutLocation && input.activityLevel);
}

export function generateWorkoutPlan(input: WorkoutPlannerInput, completedWorkoutCount = 0): WorkoutPlan | null {
  if (!canGenerateWorkoutPlan(input)) {
    return null;
  }

  const goal = normalizeGoal(input.fitnessGoal);
  const experience = input.workoutExperience!;
  const location = resolveLocation(input.workoutLocation, input.availableEquipment);
  const activityLevel = input.activityLevel!;
  const equipment = input.availableEquipment;
  const goalPace = input.goalPace ?? "steady";
  const useAdvancedBodybuildingSplit = goal === "muscle-gain" && experience === "advanced" && location === "gym";
  const defaultTrainingDays = resolveTrainingDays(
    goal,
    experience,
    activityLevel,
    goalPace,
    input.weight,
    input.goalWeight,
  );
  const trainingDays = useAdvancedBodybuildingSplit ? 6 : defaultTrainingDays;
  const weekIndex = resolveWeekIndex();
  const library = buildExerciseLibrary(location, equipment);
  const days = useAdvancedBodybuildingSplit
    ? buildAdvancedBodybuildingDays(library, weekIndex, completedWorkoutCount)
    : trainingDays <= 3
      ? buildFullBodyDays(trainingDays, library, goal, experience)
      : buildSplitDays(trainingDays, library, goal, experience);
  const intensityPhase = resolveAdvancedIntensityPhase(completedWorkoutCount);

  if (__DEV__) {
    console.log("[workout-generator] plan selection", {
      goal,
      experience,
      requestedLocation: input.workoutLocation,
      resolvedLocation: location,
      goalPace,
      completedWorkoutCount,
      intensityPhase,
      weekIndex,
      trainingDays,
      branch: useAdvancedBodybuildingSplit
        ? "advanced-bodybuilding"
        : trainingDays <= 3
          ? "full-body"
          : "split",
    });
  }

  return {
    version: WORKOUT_PLAN_VERSION,
    weekIndex,
    completedWorkoutCount,
    advancedIntensityPhase: intensityPhase,
    title:
      useAdvancedBodybuildingSplit
        ? "Blaq Mass System v1"
        : goal === "fat-loss"
        ? "Lean & Athletic Week"
        : goal === "muscle-gain"
          ? "Build & Grow Split"
          : "Strong Foundations Week",
    summary:
      useAdvancedBodybuildingSplit
        ? "High-volume advanced muscle-building protocol with rotating Blaq Core work."
        : goal === "fat-loss"
        ? "A balanced weekly structure with strength work, short core finishers, and steady conditioning support."
        : goal === "muscle-gain"
          ? "A progressive split built around enough volume to drive muscle, with small supersets to keep accessory work efficient."
          : "A practical weekly plan that improves strength, movement quality, and consistency without overcomplicating recovery.",
    trainingDays,
    goal,
    experience,
    location,
    activityLevel,
    equipment,
    notes: [
      "Start each session with 5-8 minutes of easy warm-up and joint prep.",
      "Keep 1-2 reps in reserve on most sets unless an exercise note says otherwise.",
      "If an exercise bothers a joint, swap it for a similar movement pattern and pain-free range.",
      "Supersets pair two lighter movements back to back before resting.",
      useAdvancedBodybuildingSplit
        ? "This is high-volume advanced training. Keep sessions around 60-75 minutes, recover hard, and scale loads before pushing failure."
        : "Core finishers stay short on purpose so they support consistency instead of burying recovery.",
      useAdvancedBodybuildingSplit
        ? "Abs rotate deterministically from the front-core and oblique pools on every training day in this split."
        : "Core finishers stay short on purpose so they support consistency instead of burying recovery.",
      useAdvancedBodybuildingSplit
        ? `Current advanced variation block uses week ${weekIndex + 1}, rotating the secondary chest press and main squat every 2 weeks.`
        : "Your plan structure stays stable so progress stays easy to track week to week.",
      useAdvancedBodybuildingSplit && intensityPhase === "burnout"
        ? "You have passed 2 weeks of completed training, so the last exercise on each day now adds one burnout set."
        : useAdvancedBodybuildingSplit && intensityPhase === "tempo"
          ? "You have passed 4 weeks of completed training, so the last exercise adds a burnout set and all advanced lifts use a 3-second eccentric cue."
          : "Advanced intensity techniques unlock after multiple completed weeks of training.",
      input.goalWeight
        ? `Your current plan also tracks the direction toward ${input.goalWeight}${goalPace ? ` at a ${goalPace} pace` : ""}, using that as guidance instead of pressure.`
        : "Your current weight trend can shape the pace of the plan, but it never overrides recovery and consistency.",
    ],
    days,
  };
}
