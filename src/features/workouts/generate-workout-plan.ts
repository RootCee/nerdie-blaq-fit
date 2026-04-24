import { EquipmentOption, FitnessGoal, WorkoutExperience, WorkoutLocation } from "@/types/onboarding";
import { toExerciseSlug } from "@/features/workouts/exercise-library";
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
  return { slug: toExerciseSlug(name), name, sets, reps, restTime, notes };
}

function pick(list: string[], index: number): string {
  return list[index % list.length];
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

function buildAdvancedBodybuildingDays(library: ExerciseLibrary, goal: SupportedWorkoutGoal, experience: WorkoutExperience): WorkoutDay[] {
  const prescription = getPrescription(goal, experience);

  const chestBackOne = [
    exercise(pick(library.chest, 0), prescription.sets, prescription.reps, prescription.rest, "Use 2-3 ascending warm-up jumps, then pyramid your work sets."),
    exercise(pick(library.back, 0), prescription.sets, prescription.reps, prescription.rest, "Drive elbows hard and take the last clean set close to failure."),
    exercise(pick(library.chest, 1), prescription.sets, prescription.reps, prescription.rest, "Stay one rep shy of technical breakdown until the final set."),
    exercise(pick(library.back, 1), prescription.sets, prescription.reps, prescription.rest, "Own the stretch and squeeze on every rep."),
    exercise(pick(library.chest, 2), prescription.sets, prescription.reps, prescription.rest, "Use this accessory as a controlled burnout."),
    exercise(pick(library.back, 2), prescription.sets, prescription.reps, prescription.rest, "Keep the torso still and finish with a hard contraction."),
  ];
  const chestBackOneAbs = createRotatingAbsFinisher(0, library);

  const shouldersArmsOne = [
    exercise(pick(library.shoulders, 0), prescription.sets, prescription.reps, prescription.rest, "Build across your sets and attack the top set with clean aggression."),
    exercise(pick(library.shoulders, 1), prescription.sets, prescription.reps, prescription.rest, "Keep the torso quiet and let the delts do the work."),
    exercise(pick(library.arms, 0), prescription.sets, prescription.reps, prescription.rest, "Squeeze the biceps hard and lower slowly."),
    exercise(pick(library.arms, 2), prescription.sets, prescription.reps, prescription.rest, "Use a full elbow range and take the final set near failure."),
    exercise(pick(library.arms, 1), prescription.sets, prescription.reps, prescription.rest, "Chase the stretch and keep the shoulders pinned back."),
    exercise(pick(library.forearms, 0), "3", "15-20", "30 sec", "Control the tempo and hold the peak briefly."),
    exercise(pick(library.forearms, 1), "3", "15-20", "30 sec", "Move only at the wrist and keep tension continuous."),
  ];

  const legsOne = [
    exercise(pick(library.legs, 0), prescription.sets, prescription.reps, prescription.rest, "Ramp your load gradually, then drive the top set hard."),
    exercise(pick(library.legs, 1), prescription.sets, prescription.reps, prescription.rest, "Reset the brace every rep and stop one rep before form slips."),
    exercise(pick(library.legs, 4), prescription.sets, prescription.reps, prescription.rest, "Pause briefly at peak quad tension."),
    exercise(pick(library.legs, 5), prescription.sets, prescription.reps, prescription.rest, "Own the eccentric and squeeze hard at the top."),
    exercise(pick(library.legs, 6), "4", "12-20", "30-45 sec", "Use a full stretch and hard lockout each rep."),
  ];
  const legsOneAbs = createRotatingAbsFinisher(2, library);

  const chestBackTwo = [
    exercise(pick(library.chest, 3), prescription.sets, prescription.reps, prescription.rest, "Stretch under control, then squeeze hard through the chest."),
    exercise(pick(library.back, 3), prescription.sets, prescription.reps, prescription.rest, "Keep constant tension and do not rush the bottom."),
    exercise(pick(library.chest, 4), prescription.sets, prescription.reps, prescription.rest, "Lean slightly forward and finish the last set close to failure."),
    exercise(pick(library.back, 4), prescription.sets, prescription.reps, prescription.rest, "Own the full line of pull and keep the chest tall."),
    exercise(pick(library.chest, 5), prescription.sets, prescription.reps, prescription.rest, "Use this as a pump-focused finisher."),
    exercise(pick(library.back, 5), prescription.sets, prescription.reps, prescription.rest, "Pause at peak contraction before lowering."),
  ];
  const chestBackTwoAbs = createRotatingAbsFinisher(3, library);

  const shouldersArmsTwo = [
    exercise(pick(library.shoulders, 2), prescription.sets, prescription.reps, prescription.rest, "Stay strict and avoid swinging through fatigue."),
    exercise(pick(library.shoulders, 3), prescription.sets, prescription.reps, prescription.rest, "Lead with the elbows and hold the top briefly."),
    exercise(pick(library.shoulders, 4), prescription.sets, prescription.reps, prescription.rest, "Pull smoothly and stop at a shoulder-friendly height."),
    exercise(pick(library.shoulders, 5), prescription.sets, prescription.reps, prescription.rest, "Control the rear-delt squeeze all the way through."),
    exercise(pick(library.arms, 3), prescription.sets, prescription.reps, prescription.rest, "Keep the elbows in and reach a full lockout."),
    exercise(pick(library.arms, 4), prescription.sets, prescription.reps, prescription.rest, "Use your final set as a controlled push-to-failure burner."),
    exercise(pick(library.forearms, 2), "3", "10-15", "45 sec", "Hold the squeeze and do not swing the bar."),
  ];

  const legsTwo = [
    exercise(pick(library.legs, 2), prescription.sets, prescription.reps, prescription.rest, "Feel the hamstrings load on every rep and keep the bar close."),
    exercise(pick(library.legs, 3), prescription.sets, prescription.reps, prescription.rest, "Stay braced and use clean hinge mechanics."),
    exercise(pick(library.legs, 7), prescription.sets, prescription.reps, prescription.rest, "Sit between the hips and stay tall through the chest."),
    exercise(pick(library.legs, 8), prescription.sets, prescription.reps, prescription.rest, "Use full range and finish each side evenly."),
    exercise(pick(library.legs, 6), "4", "15-20", "30-45 sec", "Chase a deep stretch and strong calf squeeze."),
  ];
  const legsTwoAbs = createRotatingAbsFinisher(5, library);

  return [
    buildDay(
      "day-1",
      "Mon: Chest + Back + Abs",
      "Heavy chest and back foundation",
      "Pyramid into your heaviest quality work sets, then use the accessories to chase a pump without losing form.",
      chestBackOne,
      {
        supersets: [
          createSupersetGroup("day-1-superset-1", "Chest/back pump superset", [chestBackOne[4], chestBackOne[5]], "60 sec after both exercises", "Alternate the final chest and back accessories before resting."),
          createSupersetGroup("day-1-abs-superset", "Rotating abs superset", chestBackOneAbs.exercises, "30 sec after both exercises", "One front-ab move plus one oblique move."),
        ],
        coreFinisher: chestBackOneAbs,
      },
    ),
    buildDay(
      "day-2",
      "Tue: Shoulders + Arms + Forearms",
      "Delts, arm density, and grip work",
      "Keep the compounds strong, then push the isolation work hard with short rest and one high-effort final set where noted.",
      shouldersArmsOne,
      {
        supersets: [
          createSupersetGroup("day-2-superset-1", "Biceps/triceps superset", [shouldersArmsOne[2], shouldersArmsOne[3]], "45-60 sec after both exercises", "Pair your first direct arm movements to keep tension high."),
          createSupersetGroup("day-2-superset-2", "Forearm finisher superset", [shouldersArmsOne[5], shouldersArmsOne[6]], "30 sec after both exercises", "Finish with palm-up and palm-down wrist work."),
        ],
      },
    ),
    buildDay(
      "day-3",
      "Wed: Legs + Abs",
      "Quad, posterior-chain, and lower-leg work",
      "Build across the big lifts, keep the machine work smooth, and treat abs as strict trunk work instead of sloppy conditioning.",
      legsOne,
      {
        supersets: [
          createSupersetGroup("day-3-superset-1", "Leg accessory superset", [legsOne[2], legsOne[3]], "60 sec after both exercises", "Pair the quad and hamstring machine work before resting."),
          createSupersetGroup("day-3-abs-superset", "Rotating abs superset", legsOneAbs.exercises, "30 sec after both exercises", "One front-ab move plus one oblique move."),
        ],
        coreFinisher: legsOneAbs,
      },
    ),
    buildDay(
      "day-4",
      "Thu: Chest + Back + Abs",
      "Stretch-mediated chest and back volume",
      "Use a slightly more pump-driven feel today while still driving the final quality set hard.",
      chestBackTwo,
      {
        supersets: [
          createSupersetGroup("day-4-superset-1", "Chest/back volume superset", [chestBackTwo[2], chestBackTwo[3]], "60 sec after both exercises", "Alternate the mid-session pressing and pulling work."),
          createSupersetGroup("day-4-abs-superset", "Rotating abs superset", chestBackTwoAbs.exercises, "30 sec after both exercises", "One front-ab move plus one oblique move."),
        ],
        coreFinisher: chestBackTwoAbs,
      },
    ),
    buildDay(
      "day-5",
      "Fri: Shoulders + Arms + Forearms",
      "Delt cap, arm pump, and forearm finish",
      "Keep the shoulder isolation strict and let the arm work climb toward a controlled near-failure finish.",
      shouldersArmsTwo,
      {
        supersets: [
          createSupersetGroup("day-5-superset-1", "Shoulder density superset", [shouldersArmsTwo[1], shouldersArmsTwo[3]], "45-60 sec after both exercises", "Pair side and rear-delt work to keep the session moving."),
          createSupersetGroup("day-5-superset-2", "Arm finisher superset", [shouldersArmsTwo[4], shouldersArmsTwo[5]], "45 sec after both exercises", "Finish with direct triceps and push-up burnout work."),
        ],
      },
    ),
    buildDay(
      "day-6",
      "Sat: Legs + Abs",
      "Posterior-chain and unilateral lower-body focus",
      "Keep the hinge work crisp, train both legs evenly, and finish with rotating abs before a full Sunday rest.",
      legsTwo,
      {
        supersets: [
          createSupersetGroup("day-6-superset-1", "Lower-body volume superset", [legsTwo[2], legsTwo[3]], "60 sec after both exercises", "Pair the squat and unilateral work to drive leg volume efficiently."),
          createSupersetGroup("day-6-abs-superset", "Rotating abs superset", legsTwoAbs.exercises, "30 sec after both exercises", "One front-ab move plus one oblique move."),
        ],
        coreFinisher: legsTwoAbs,
      },
    ),
  ];
}

export function canGenerateWorkoutPlan(input: WorkoutPlannerInput): boolean {
  return Boolean(input.fitnessGoal && input.workoutExperience && input.workoutLocation && input.activityLevel);
}

export function generateWorkoutPlan(input: WorkoutPlannerInput): WorkoutPlan | null {
  if (!canGenerateWorkoutPlan(input)) {
    return null;
  }

  const goal = normalizeGoal(input.fitnessGoal);
  const experience = input.workoutExperience!;
  const location = resolveLocation(input.workoutLocation, input.availableEquipment);
  const activityLevel = input.activityLevel!;
  const equipment = input.availableEquipment;
  const goalPace = input.goalPace ?? "steady";
  const useAdvancedBodybuildingSplit = experience === "advanced" && location === "gym";
  const defaultTrainingDays = resolveTrainingDays(
    goal,
    experience,
    activityLevel,
    goalPace,
    input.weight,
    input.goalWeight,
  );
  const trainingDays = useAdvancedBodybuildingSplit ? 6 : defaultTrainingDays;
  const library = buildExerciseLibrary(location, equipment);
  const days = useAdvancedBodybuildingSplit
    ? buildAdvancedBodybuildingDays(library, goal, experience)
    : trainingDays <= 3
      ? buildFullBodyDays(trainingDays, library, goal, experience)
      : buildSplitDays(trainingDays, library, goal, experience);

  return {
    title:
      useAdvancedBodybuildingSplit
        ? "Advanced Bodybuilding Rotation"
        : goal === "fat-loss"
        ? "Lean & Athletic Week"
        : goal === "muscle-gain"
          ? "Build & Grow Split"
          : "Strong Foundations Week",
    summary:
      useAdvancedBodybuildingSplit
        ? "A deterministic six-day bodybuilding split with repeated chest/back, shoulders/arms, rotating abs, and Sunday off."
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
        ? "Abs rotate deterministically across front-core and oblique pools on each abs day."
        : "Core finishers stay short on purpose so they support consistency instead of burying recovery.",
      useAdvancedBodybuildingSplit
        ? "Pyramid the first work sets, then take the final quality set close to failure where the exercise note calls for it."
        : "Core finishers stay short on purpose so they support consistency instead of burying recovery.",
      input.goalWeight
        ? `Your current plan also tracks the direction toward ${input.goalWeight}${goalPace ? ` at a ${goalPace} pace` : ""}, using that as guidance instead of pressure.`
        : "Your current weight trend can shape the pace of the plan, but it never overrides recovery and consistency.",
    ],
    days,
  };
}
