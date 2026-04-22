import { WorkoutLocation } from "@/types/onboarding";
import { ExerciseDetailMetadata, ExerciseMetadata } from "@/types/workout";

const placeholderImage = require("../../../assets/exercises/placeholder.png");

type ExerciseOverrides = Partial<Omit<ExerciseMetadata, "slug" | "name" | "image">>;

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

export const exerciseLibrary: Record<string, ExerciseMetadata> = Object.fromEntries(
  allEntries.map((entry) => [entry.slug, entry]),
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
