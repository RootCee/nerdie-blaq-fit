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

const WORKOUT_PLAN_VERSION = "arnold-variation-1-v3";
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
  const workSets = "3-4";
  const repGoal = "10";
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

  const chestBackOne = applyAdvancedIntensityTechniques([
    exercise("Barbell bench press", workSets, repGoal, rest, "Pyramid your warm-ups, then hit crisp sets toward a 10-rep goal."),
    exercise(chestPressVariation, workSets, repGoal, rest, "Stay strict with the current press variation and own all 10-rep sets."),
    exercise("Dumbbell pullover", workSets, repGoal, rest, "Stretch under control and keep the ribs stacked."),
    exercise("Wide-grip pull-up", workSets, "10 or failure", rest, "Use bodyweight control first and let the final reps approach failure cleanly."),
    exercise("Barbell bent-over row", workSets, repGoal, rest, "Drive elbows back and own the squeeze at the top."),
    exercise("Barbell deadlift", workSets, repGoal, "90-120 sec", "Build with disciplined sets and keep the final work set heavy but technically sharp."),
  ], intensityPhase);

  const shouldersArmsOne = applyAdvancedIntensityTechniques([
    exercise("Clean and press", workSets, repGoal, rest, "Treat each rep as an athletic but controlled clean into a press."),
    exercise("Lateral raise", workSets, repGoal, "45-60 sec", "Lead with the elbows and keep the torso quiet."),
    exercise("Upright row", workSets, repGoal, rest, "Use a shoulder-friendly range and smooth pull."),
    exercise("Dumbbell shoulder press", workSets, repGoal, rest, "Stay stacked through the trunk and press with control."),
    exercise("Barbell curl", workSets, repGoal, "45-60 sec", "Lower slowly and avoid swinging."),
    exercise("Incline dumbbell curl", workSets, repGoal, "45-60 sec", "Use the stretched position to keep biceps tension high."),
    exercise("Close-grip bench press", workSets, repGoal, rest, "Keep elbows tucked and press with triceps intent."),
    exercise("Skullcrusher", workSets, repGoal, "45-60 sec", "Lower smoothly and lock out hard without flaring."),
    exercise("Wrist curl up", workSets, repGoal, "30-45 sec", "Move only at the wrist and hold the top briefly."),
    exercise("Wrist curl down", workSets, repGoal, "30-45 sec", "Use lighter control and continuous tension."),
  ], intensityPhase);

  const legsOne = applyAdvancedIntensityTechniques([
    exercise(squatVariation, workSets, repGoal, rest, "Ramp into your work sets and keep every rep deep and stable."),
    exercise("Reverse lunge", workSets, repGoal, "60-90 sec", "Train both legs evenly and keep the torso tall."),
    exercise("Leg curl", workSets, repGoal, "45-60 sec", "Own the eccentric and squeeze at the top."),
    exercise("Straight-leg deadlift", workSets, repGoal, rest, "Load the hamstrings without losing position."),
    exercise("Good morning", workSets, repGoal, rest, "Use strict hinge mechanics and conservative loading."),
    exercise("Standing calf raise", workSets, repGoal, "30-45 sec", "Pause high and use the full stretch at the bottom."),
  ], intensityPhase);

  const chestBackTwo = applyAdvancedIntensityTechniques([
    exercise("Barbell bench press", workSets, repGoal, rest, "Repeat the main press and chase consistent 10-rep quality."),
    exercise(chestPressVariation, workSets, repGoal, rest, "Repeat the current press variation and stay crisp under fatigue."),
    exercise("Dumbbell pullover", workSets, repGoal, rest, "Stay long through the lats and chest on every rep."),
    exercise("Wide-grip pull-up", workSets, "10 or failure", rest, "Accumulate strong vertical pulling volume and push the last quality reps."),
    exercise("Barbell bent-over row", workSets, repGoal, rest, "Pause briefly at the top before lowering."),
    exercise("Straight-leg deadlift", workSets, repGoal, "90-120 sec", "Use this variation to bias the posterior chain while keeping form clean."),
  ], intensityPhase);

  const shouldersArmsTwo = applyAdvancedIntensityTechniques([
    exercise("Clean and press", workSets, repGoal, rest, "Stay explosive out of the clean and stacked on the press."),
    exercise("Lateral raise", workSets, repGoal, "45-60 sec", "Strict reps and no swinging through fatigue."),
    exercise("Upright row", workSets, repGoal, rest, "Pull smoothly to a comfortable shoulder height."),
    exercise("Dumbbell shoulder press", workSets, repGoal, rest, "Keep tension on the delts all the way through."),
    exercise("Barbell curl", workSets, repGoal, "45-60 sec", "Use your last set to approach failure without breaking form."),
    exercise("Incline dumbbell curl", workSets, repGoal, "45-60 sec", "Stretch and squeeze on every rep."),
    exercise("Close-grip bench press", workSets, repGoal, rest, "Drive through the triceps and control the lowering phase."),
    exercise("Overhead tricep extension", workSets, repGoal, "45-60 sec", "Keep elbows pointed forward and reach a full lockout."),
    exercise("Wrist curl up", workSets, repGoal, "30-45 sec", "Stay smooth and keep tension in the forearm flexors."),
    exercise("Wrist curl down", workSets, repGoal, "30-45 sec", "Use strict wrist motion and lighter load."),
  ], intensityPhase);

  const legsTwo = applyAdvancedIntensityTechniques([
    exercise(squatVariation, workSets, repGoal, rest, "Repeat the current squat variation and keep output high without losing depth."),
    exercise("Reverse lunge", workSets, repGoal, "60-90 sec", "Stay balanced and clean through each side."),
    exercise("Leg curl", workSets, repGoal, "45-60 sec", "Chase a hard hamstring squeeze with clean tempo."),
    exercise("Straight-leg deadlift", workSets, repGoal, rest, "Keep the bar close and the hamstrings loaded."),
    exercise("Good morning", workSets, repGoal, rest, "Treat this as strict lower-back and hinge practice under load."),
    exercise("Standing calf raise", workSets, repGoal, "30-45 sec", "Full stretch, hard squeeze, no bouncing."),
  ], intensityPhase);

  return [
    buildDay("day-1", "Mon: Chest + Back + Abs", "Arnold Variation #1 chest and back", "Advanced 60-75 minute muscle-build day. Pyramid your early sets, use clean reps, and let the final quality set on pulls approach failure when called for.", chestBackOne, {
      coreFinisher: chestBackOneAbs,
    }),
    buildDay("day-2", "Tue: Shoulders + Arms + Forearms + Abs", "Arnold Variation #1 shoulders and arms", "High-volume advanced upper-body work. Keep isolation strict, respect the short rests, and stop only when form starts to break.", shouldersArmsOne, {
      coreFinisher: shouldersArmsOneAbs,
    }),
    buildDay("day-3", "Wed: Legs + Lower Back + Abs", "Arnold Variation #1 legs and lower back", "This is the lower-body and lower-back day. Keep the hinges disciplined and treat the whole session like high-volume advanced work.", legsOne, {
      coreFinisher: legsOneAbs,
    }),
    buildDay("day-4", "Thu: Chest + Back + Abs", "Arnold Variation #1 chest and back repeat", "Repeat the chest and back pattern with steady quality and controlled fatigue management.", chestBackTwo, {
      coreFinisher: chestBackTwoAbs,
    }),
    buildDay("day-5", "Fri: Shoulders + Arms + Forearms + Abs", "Arnold Variation #1 shoulders and arms repeat", "Repeat the shoulder and arm volume with strict execution and controlled near-failure effort.", shouldersArmsTwo, {
      coreFinisher: shouldersArmsTwoAbs,
    }),
    buildDay("day-6", "Sat: Legs + Lower Back + Abs", "Arnold Variation #1 legs and lower back repeat", "Finish the week with disciplined leg and lower-back work before a full Sunday rest.", legsTwo, {
      coreFinisher: legsTwoAbs,
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
