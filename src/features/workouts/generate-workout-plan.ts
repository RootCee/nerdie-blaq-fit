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
  const trainingDays = resolveTrainingDays(
    goal,
    experience,
    activityLevel,
    input.goalPace,
    input.weight,
    input.goalWeight,
  );
  const library = buildExerciseLibrary(location, equipment);
  const days = trainingDays <= 3
    ? buildFullBodyDays(trainingDays, library, goal, experience)
    : buildSplitDays(trainingDays, library, goal, experience);

  return {
    title:
      goal === "fat-loss"
        ? "Lean & Athletic Week"
        : goal === "muscle-gain"
          ? "Build & Grow Split"
          : "Strong Foundations Week",
    summary:
      goal === "fat-loss"
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
      "Core finishers stay short on purpose so they support consistency instead of burying recovery.",
      input.goalWeight
        ? `Your current plan also tracks the direction toward ${input.goalWeight}${input.goalPace ? ` at an ${input.goalPace} pace` : ""}, using that as guidance instead of pressure.`
        : "Your current weight trend can shape the pace of the plan, but it never overrides recovery and consistency.",
    ],
    days,
  };
}
