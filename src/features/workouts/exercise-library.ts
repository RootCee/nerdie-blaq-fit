import { WorkoutLocation } from "@/types/onboarding";
import { ExerciseDetailMetadata, ExerciseMetadata, ExerciseSubstitution, ExerciseSubstitutionType } from "@/types/workout";

const placeholderImage = require("../../../assets/exercises/placeholder.png");

type ExerciseOverrides = Partial<Omit<ExerciseMetadata, "slug" | "name" | "image" | "substitutions">> & {
  substitutions?: Array<{
    type: ExerciseSubstitutionType;
    name: string;
    reason: string;
  }>;
};

function createSubstitution(name: string, type: ExerciseSubstitutionType, reason: string): ExerciseSubstitution {
  return {
    type,
    slug: toExerciseSlug(name),
    name,
    reason,
    existsInLibrary: false,
  };
}

function hydrateSubstitutions(substitutions: ExerciseSubstitution[]) {
  return substitutions.map((substitution) => ({
    ...substitution,
    existsInLibrary: false,
  }));
}

function createExerciseMetadata(name: string, overrides: ExerciseOverrides = {}): ExerciseMetadata {
  return {
    slug: toExerciseSlug(name),
    name,
    shortDescription: overrides.shortDescription,
    stepByStepInstructions: overrides.stepByStepInstructions ?? [],
    primaryMuscles: overrides.primaryMuscles ?? [],
    secondaryMuscles: overrides.secondaryMuscles ?? [],
    equipment: overrides.equipment ?? [],
    workoutLocation: overrides.workoutLocation ?? ["home", "gym"],
    tips: overrides.tips ?? [],
    commonMistakes: overrides.commonMistakes ?? [],
    image: placeholderImage,
    substitutions: hydrateSubstitutions(
      overrides.substitutions?.map((substitution) =>
        createSubstitution(substitution.name, substitution.type, substitution.reason),
      ) ?? [],
    ),
  };
}

export function toExerciseSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const detailedEntries: ExerciseMetadata[] = [
  createExerciseMetadata("Barbell bench press", {
    shortDescription: "A classic horizontal pressing movement for chest, shoulders, and triceps strength.",
    stepByStepInstructions: [
      "Lie on the bench with eyes under the bar and feet planted firmly.",
      "Grip the bar just outside shoulder width and pull the shoulder blades down and back.",
      "Unrack the bar, lower it with control toward the mid chest, then press back up.",
    ],
    primaryMuscles: ["Chest", "Front shoulders", "Triceps"],
    secondaryMuscles: ["Upper back", "Core"],
    equipment: ["Barbell", "Bench"],
    workoutLocation: ["gym"],
    tips: ["Keep wrists stacked over elbows.", "Drive feet into the floor for stability."],
    commonMistakes: ["Flaring elbows too wide.", "Bouncing the bar off the chest."],
    substitutions: [
      { type: "easier-option", name: "Incline push-up", reason: "Reduces total load while keeping a horizontal press pattern." },
      { type: "same-pattern-option", name: "Dumbbell bench press", reason: "Keeps the same movement pattern with more independent arm control." },
      { type: "home-alternative", name: "Push-up", reason: "Works well when you do not have a bench and barbell setup at home." },
    ],
  }),
  createExerciseMetadata("Goblet squat", {
    shortDescription: "A front-loaded squat that builds lower-body strength and teaches solid squat mechanics.",
    stepByStepInstructions: [
      "Hold one dumbbell or kettlebell close to the chest.",
      "Sit hips down and back while keeping the chest tall.",
      "Drive through the mid-foot to return to standing.",
    ],
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Core", "Adductors"],
    equipment: ["Dumbbell or kettlebell"],
    workoutLocation: ["home", "gym"],
    tips: ["Keep elbows pointed down.", "Use a smooth controlled descent."],
    commonMistakes: ["Letting the weight drift away from the body.", "Collapsing the chest forward."],
    substitutions: [
      { type: "easier-option", name: "Bodyweight squat", reason: "Strips away load while keeping the squat pattern." },
      { type: "same-pattern-option", name: "Kettlebell front squat", reason: "Keeps the front-loaded squat feel with a similar demand." },
      { type: "gym-alternative", name: "Barbell back squat", reason: "Fits a gym setup when you want a heavier squat option." },
    ],
  }),
  createExerciseMetadata("Push-up", {
    shortDescription: "A bodyweight press that develops upper-body strength and trunk control.",
    stepByStepInstructions: [
      "Set up in a straight-arm plank with hands slightly wider than shoulders.",
      "Lower your body as one unit until the chest is close to the floor.",
      "Press back up while keeping the core braced and hips level.",
    ],
    primaryMuscles: ["Chest", "Triceps", "Front shoulders"],
    secondaryMuscles: ["Core", "Serratus"],
    equipment: ["Bodyweight"],
    workoutLocation: ["home", "gym"],
    tips: ["Squeeze glutes to keep the torso stable.", "Lower with the same control you use to press."],
    commonMistakes: ["Sagging hips.", "Letting the head lead instead of the chest."],
    substitutions: [
      { type: "easier-option", name: "Incline push-up", reason: "Elevates the hands to reduce the pressing demand." },
      { type: "same-pattern-option", name: "Resistance band chest press", reason: "Keeps a horizontal press pattern with adjustable resistance." },
      { type: "gym-alternative", name: "Barbell bench press", reason: "Moves the same general pattern into a heavier gym-based press." },
    ],
  }),
  createExerciseMetadata("Single-arm dumbbell row", {
    shortDescription: "A unilateral pulling movement that trains the upper back and lats.",
    stepByStepInstructions: [
      "Brace one hand on a bench or thigh and hold a dumbbell in the other hand.",
      "Row the weight toward the hip while keeping the torso still.",
      "Lower under control until the arm is straight again.",
    ],
    primaryMuscles: ["Lats", "Mid back"],
    secondaryMuscles: ["Rear shoulders", "Biceps", "Core"],
    equipment: ["Dumbbell", "Bench optional"],
    workoutLocation: ["home", "gym"],
    tips: ["Think elbow toward hip, not shrug toward ear.", "Keep ribs square to the floor."],
    commonMistakes: ["Twisting the torso to move more weight.", "Yanking instead of rowing smoothly."],
    substitutions: [
      { type: "easier-option", name: "Resistance band row", reason: "Reduces loading demands while keeping the row pattern." },
      { type: "same-pattern-option", name: "Kettlebell row", reason: "Offers a similar one-arm row feel with a different implement." },
      { type: "gym-alternative", name: "Barbell bent-over row", reason: "Turns the movement into a heavier bilateral row option." },
    ],
  }),
  createExerciseMetadata("Romanian deadlift", {
    shortDescription: "A hip-dominant hinge that strengthens hamstrings, glutes, and posterior-chain control.",
    stepByStepInstructions: [
      "Stand tall with the bar close to the thighs and knees softly bent.",
      "Push hips back while sliding the bar down the legs.",
      "Stop when hamstrings are loaded, then drive hips forward to stand.",
    ],
    primaryMuscles: ["Hamstrings", "Glutes"],
    secondaryMuscles: ["Lower back", "Upper back", "Core"],
    equipment: ["Barbell"],
    workoutLocation: ["gym"],
    tips: ["Keep the bar close to the body.", "Maintain a long neutral spine."],
    commonMistakes: ["Turning it into a squat.", "Reaching too low and losing spinal position."],
    substitutions: [
      { type: "easier-option", name: "Hip hinge drill", reason: "Lets you groove the hinge pattern before loading it hard." },
      { type: "same-pattern-option", name: "Dumbbell Romanian deadlift", reason: "Keeps the hinge pattern with a simpler setup." },
      { type: "home-alternative", name: "Kettlebell deadlift", reason: "Works well when you have limited home equipment." },
    ],
  }),
  createExerciseMetadata("Plank", {
    shortDescription: "A simple anti-extension core exercise for trunk stiffness and posture.",
    stepByStepInstructions: [
      "Set forearms on the floor with elbows under shoulders.",
      "Lift the body into a straight line from head to heels.",
      "Brace the abs, glutes, and legs while breathing steadily.",
    ],
    primaryMuscles: ["Core"],
    secondaryMuscles: ["Shoulders", "Glutes"],
    equipment: ["Bodyweight"],
    workoutLocation: ["home", "gym"],
    tips: ["Think about pulling elbows toward toes.", "Keep the neck long and neutral."],
    commonMistakes: ["Letting the lower back sag.", "Holding breath the whole set."],
    substitutions: [
      { type: "easier-option", name: "Bird dog", reason: "Builds core control with a lower floor-based demand." },
      { type: "same-pattern-option", name: "Side plank", reason: "Keeps the bracing challenge while shifting the angle." },
      { type: "home-alternative", name: "Dead bug", reason: "Fits home training when you want another controlled core option." },
    ],
  }),
  createExerciseMetadata("Cardio intervals", {
    shortDescription: "Short work bouts alternated with recovery to build conditioning.",
    stepByStepInstructions: [
      "Choose a cardio machine or movement you can repeat safely.",
      "Work hard for the prescribed interval while staying in control.",
      "Recover fully enough to repeat quality efforts.",
    ],
    primaryMuscles: ["Heart and lungs"],
    secondaryMuscles: ["Depends on the modality"],
    equipment: ["Cardio machine or bodyweight"],
    workoutLocation: ["home", "gym"],
    tips: ["Keep intensity repeatable across rounds.", "Start conservative if you are new to intervals."],
    commonMistakes: ["Going all out on the first round.", "Letting form fall apart as fatigue rises."],
    substitutions: [
      { type: "easier-option", name: "Brisk walk or incline walk", reason: "Lowers intensity while still building conditioning." },
      { type: "home-alternative", name: "Shadow boxing intervals", reason: "Works well at home with no machine required." },
      { type: "gym-alternative", name: "Kettlebell swing finisher", reason: "Gives a harder conditioning option in a gym setup." },
    ],
  }),
];

const fallbackExerciseNames = [
  "Dumbbell bench press",
  "Dumbbell shoulder press",
  "Resistance band chest press",
  "Incline push-up",
  "Kettlebell floor press",
  "Pike push-up",
  "Barbell bent-over row",
  "Resistance band row",
  "Assisted pull-up or chin-up",
  "Back widows",
  "Prone Y-T-W raises",
  "Kettlebell row",
  "Barbell back squat",
  "Kettlebell front squat",
  "Bodyweight squat",
  "Reverse lunge",
  "Split squat",
  "Bench step-up",
  "Step-up",
  "Dumbbell Romanian deadlift",
  "Kettlebell deadlift",
  "Glute bridge",
  "Hip hinge drill",
  "Single-leg glute bridge",
  "Good morning",
  "Dead bug",
  "Side plank",
  "Hollow hold",
  "Bird dog",
  "Slow mountain climber",
  "Brisk walk or incline walk",
  "March in place finisher",
  "Low-impact bodyweight circuit",
  "Shadow boxing intervals",
  "Kettlebell swing finisher",
];

const fallbackEntries = fallbackExerciseNames.map((name) =>
  createExerciseMetadata(name, {
    shortDescription: `A foundational ${name.toLowerCase()} variation used in the current Nerdie Blaq Fit plan builder.`,
  }),
);

const allEntries = [...detailedEntries, ...fallbackEntries];

const rawExerciseLibrary: Record<string, ExerciseMetadata> = Object.fromEntries(
  allEntries.map((entry) => [entry.slug, entry]),
);

export const exerciseLibrary: Record<string, ExerciseMetadata> = Object.fromEntries(
  Object.values(rawExerciseLibrary).map((entry) => [
    entry.slug,
    {
      ...entry,
      substitutions: entry.substitutions.map((substitution) => ({
        ...substitution,
        existsInLibrary: Boolean(rawExerciseLibrary[substitution.slug]),
      })),
    },
  ]),
);

export function getExerciseMetadata(slug: string, fallbackName?: string): ExerciseDetailMetadata {
  const entry = exerciseLibrary[slug];

  if (entry) {
    const hasDetailedContent = Boolean(
      entry.shortDescription &&
      entry.stepByStepInstructions.length &&
      entry.primaryMuscles.length &&
      entry.tips.length,
    );

    return {
      ...entry,
      isFallback: !hasDetailedContent,
    };
  }

  const fallback = createExerciseMetadata(fallbackName ?? humanizeSlug(slug), {
    shortDescription: "This movement is part of your current plan, but full coaching notes have not been added yet.",
  });

  return {
    ...fallback,
    isFallback: true,
  };
}
