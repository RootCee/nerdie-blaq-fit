import { WorkoutLocation } from "@/types/onboarding";
import { getExerciseImageForSlug } from "@/features/workouts/exercise-images";
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
  const slug = toExerciseSlug(name);
  const localImage = overrides.localImage ?? getExerciseImageForSlug(slug);

  return {
    slug,
    name,
    shortDescription: overrides.shortDescription,
    stepByStepInstructions: overrides.stepByStepInstructions ?? [],
    primaryMuscles: overrides.primaryMuscles ?? [],
    secondaryMuscles: overrides.secondaryMuscles ?? [],
    equipment: overrides.equipment ?? [],
    workoutLocation: overrides.workoutLocation ?? ["home", "gym"],
    tips: overrides.tips ?? [],
    commonMistakes: overrides.commonMistakes ?? [],
    localImage,
    image: localImage ?? placeholderImage,
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
    shortDescription: "A classic horizontal press for chest, shoulders, and triceps strength.",
    stepByStepInstructions: [
      "Set the eyes under the bar with feet planted hard.",
      "Lower the bar to the mid chest with stacked wrists and elbows.",
      "Press back up while keeping the upper back tight.",
    ],
    primaryMuscles: ["Chest", "Front shoulders", "Triceps"],
    secondaryMuscles: ["Upper back", "Core"],
    equipment: ["Barbell", "Bench"],
    workoutLocation: ["gym"],
    tips: ["Drive your feet into the floor.", "Keep the bar path smooth and repeatable."],
    commonMistakes: ["Flaring elbows too wide.", "Bouncing the bar off the chest."],
    substitutions: [
      { type: "same-pattern-option", name: "Dumbbell bench press", reason: "Keeps the same pressing pattern with more arm freedom." },
      { type: "gym-alternative", name: "Incline bench press", reason: "Shifts emphasis higher on the chest while staying in the same family." },
      { type: "home-alternative", name: "Push-up", reason: "Works when you need a bodyweight horizontal press." },
    ],
  }),
  createExerciseMetadata("Incline bench press", {
    shortDescription: "An upper-chest pressing move that still loads shoulders and triceps hard.",
    stepByStepInstructions: [
      "Set the bench to a moderate incline and plant the feet.",
      "Lower the bar or dumbbells toward the upper chest with control.",
      "Press up without losing shoulder blade position.",
    ],
    primaryMuscles: ["Upper chest", "Front shoulders", "Triceps"],
    secondaryMuscles: ["Serratus", "Upper back"],
    equipment: ["Barbell or dumbbells", "Incline bench"],
    workoutLocation: ["gym"],
    tips: ["Keep the rib cage stacked instead of over-arching.", "Use a bench angle you can control."],
    commonMistakes: ["Turning it into an overhead press.", "Shrugging shoulders at the top."],
    substitutions: [
      { type: "same-pattern-option", name: "Barbell bench press", reason: "Keeps a heavy chest press with a flatter angle." },
      { type: "easier-option", name: "Resistance band chest press", reason: "Lets you groove the press with simpler loading." },
      { type: "home-alternative", name: "Incline push-up", reason: "Matches the upward pressing line with bodyweight." },
    ],
  }),
  createExerciseMetadata("Chest fly", {
    shortDescription: "An isolation move that trains the chest through a long arc.",
    stepByStepInstructions: [
      "Set the shoulders down and back before each rep.",
      "Open the arms with a soft elbow bend until the chest stretches.",
      "Bring the hands back together by squeezing through the chest.",
    ],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Front shoulders", "Biceps"],
    equipment: ["Dumbbells or cables", "Bench optional"],
    workoutLocation: ["gym"],
    tips: ["Keep the elbow angle nearly fixed.", "Move through a pain-free stretch."],
    commonMistakes: ["Turning it into a press.", "Dropping too deep without control."],
    substitutions: [
      { type: "same-pattern-option", name: "Resistance band chest press", reason: "Keeps chest tension when cables or dumbbells are limited." },
      { type: "gym-alternative", name: "Chest dips", reason: "Adds chest-focused pressing through a larger range." },
      { type: "easier-option", name: "Push-up", reason: "Simplifies the setup while still training the chest." },
    ],
  }),
  createExerciseMetadata("Dumbbell pullover", {
    shortDescription: "A long-range upper-body movement that hits chest and lats together.",
    stepByStepInstructions: [
      "Lie across or along a bench and hold one dumbbell over the chest.",
      "Lower the weight back with a slight elbow bend until you feel a stretch.",
      "Pull the dumbbell back over the chest without flaring the ribs.",
    ],
    primaryMuscles: ["Lats", "Chest"],
    secondaryMuscles: ["Serratus", "Triceps"],
    equipment: ["Dumbbell", "Bench"],
    workoutLocation: ["gym"],
    tips: ["Keep the abs lightly braced.", "Move slowly through the stretched position."],
    commonMistakes: ["Overarching the lower back.", "Bending and straightening the elbows too much."],
    substitutions: [
      { type: "same-pattern-option", name: "Lat pulldown", reason: "Keeps lat emphasis with a simpler vertical pull." },
      { type: "gym-alternative", name: "Chest fly", reason: "Keeps the chest-focused stretch component." },
      { type: "easier-option", name: "Single-arm dumbbell row", reason: "Builds upper-body pulling strength with more stability." },
    ],
  }),
  createExerciseMetadata("Chest dips", {
    shortDescription: "A bodyweight compound press that biases chest, shoulders, and triceps.",
    stepByStepInstructions: [
      "Support yourself on the bars and lean the torso slightly forward.",
      "Lower under control until the shoulders stay comfortable.",
      "Press back up while keeping the chest proud and elbows tracking well.",
    ],
    primaryMuscles: ["Chest", "Triceps", "Front shoulders"],
    secondaryMuscles: ["Core", "Lower chest"],
    equipment: ["Dip bars"],
    workoutLocation: ["gym"],
    tips: ["Stay tight at the top before the next rep.", "Use a range that your shoulders tolerate well."],
    commonMistakes: ["Dropping too low too soon.", "Staying too upright if chest emphasis is the goal."],
    substitutions: [
      { type: "easier-option", name: "Push-up", reason: "Gives a scalable pressing option with less joint stress." },
      { type: "same-pattern-option", name: "Barbell bench press", reason: "Keeps a compound chest press in a stable setup." },
      { type: "home-alternative", name: "Resistance band chest press", reason: "Works when dip bars are not available." },
    ],
  }),
  createExerciseMetadata("Close-grip bench press", {
    shortDescription: "A pressing variation that emphasizes triceps while still loading the chest and shoulders.",
    stepByStepInstructions: [
      "Set up as you would for a bench press with a narrower-than-usual grip.",
      "Lower the bar to the lower chest while keeping elbows tucked.",
      "Press up smoothly without letting the wrists fold back.",
    ],
    primaryMuscles: ["Triceps", "Chest"],
    secondaryMuscles: ["Front shoulders"],
    equipment: ["Barbell", "Bench"],
    workoutLocation: ["gym"],
    tips: ["Keep the forearms close to vertical.", "Use a grip width that feels strong on the wrists and elbows."],
    commonMistakes: ["Going too narrow and stressing the wrists.", "Letting elbows flare like a regular bench press."],
    substitutions: [
      { type: "same-pattern-option", name: "Skullcrusher", reason: "Keeps strong direct triceps loading." },
      { type: "gym-alternative", name: "Overhead tricep extension", reason: "Still trains triceps through a long range." },
      { type: "easier-option", name: "Resistance band chest press", reason: "Simplifies the pressing setup while keeping triceps involved." },
    ],
  }),
  createExerciseMetadata("Resistance band chest press", {
    shortDescription: "A joint-friendly chest press with band resistance and simple setup.",
    stepByStepInstructions: [
      "Anchor the band behind you and set a split stance.",
      "Press the handles forward until the arms extend smoothly.",
      "Return with control while keeping the ribs stacked.",
    ],
    primaryMuscles: ["Chest", "Front shoulders", "Triceps"],
    secondaryMuscles: ["Core"],
    equipment: ["Resistance band"],
    workoutLocation: ["home", "gym"],
    tips: ["Keep tension on the band through the whole rep.", "Stay tall instead of leaning into the band."],
    commonMistakes: ["Letting the band yank the arms back.", "Overextending the lower back."],
    substitutions: [
      { type: "same-pattern-option", name: "Push-up", reason: "Keeps a similar horizontal pressing pattern." },
      { type: "gym-alternative", name: "Barbell bench press", reason: "Moves the pattern into a heavier gym press." },
      { type: "easier-option", name: "Incline push-up", reason: "Reduces total pressing demand for newer lifters." },
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
  createExerciseMetadata("Lat pulldown", {
    shortDescription: "A vertical pull that builds the lats, upper back, and arm flexors.",
    stepByStepInstructions: [
      "Set the pad tight enough to keep the torso anchored.",
      "Pull the bar toward the upper chest by driving elbows down.",
      "Control the return without shrugging into the top.",
    ],
    primaryMuscles: ["Lats", "Upper back"],
    secondaryMuscles: ["Biceps", "Rear shoulders"],
    equipment: ["Cable machine"],
    workoutLocation: ["gym"],
    tips: ["Stay tall through the torso.", "Think elbows to ribs on each rep."],
    commonMistakes: ["Leaning way back to cheat the rep.", "Pulling only with the hands."],
    substitutions: [
      { type: "same-pattern-option", name: "Assisted pull-up or chin-up", reason: "Matches the vertical pull pattern closely." },
      { type: "gym-alternative", name: "Dumbbell pullover", reason: "Adds a lat-focused upper-body pull through a longer arc." },
      { type: "easier-option", name: "Resistance band row", reason: "Simplifies loading when machines are not available." },
    ],
  }),
  createExerciseMetadata("Wide-grip pull-up", {
    shortDescription: "A bodyweight vertical pull that emphasizes upper-back width and lat strength.",
    stepByStepInstructions: [
      "Take a grip wider than shoulder width and set the shoulders down first.",
      "Pull the chest toward the bar by driving elbows down and out.",
      "Lower under control to a full stretch without swinging.",
    ],
    primaryMuscles: ["Lats", "Upper back"],
    secondaryMuscles: ["Biceps", "Forearms", "Core"],
    equipment: ["Pull-up bar"],
    workoutLocation: ["gym"],
    tips: ["Stay long through the torso instead of craning the neck.", "Own the lowering phase to build clean reps."],
    commonMistakes: ["Kipping through reps.", "Only reaching the chin over the bar without full-body control."],
    substitutions: [
      { type: "same-pattern-option", name: "Assisted pull-up or chin-up", reason: "Keeps a similar vertical pull with scalable assistance." },
      { type: "gym-alternative", name: "Lat pulldown", reason: "Lets you train the same pattern with more controlled loading." },
      { type: "easier-option", name: "Single-arm dumbbell row", reason: "Builds back strength when vertical pulling capacity is still developing." },
    ],
  }),
  createExerciseMetadata("Barbell bent-over row", {
    shortDescription: "A heavy horizontal row for back thickness and pulling strength.",
    stepByStepInstructions: [
      "Hinge to a strong bent-over position with the bar hanging below the shoulders.",
      "Row the bar toward the lower ribs or upper stomach.",
      "Lower under control without losing trunk position.",
    ],
    primaryMuscles: ["Mid back", "Lats"],
    secondaryMuscles: ["Rear shoulders", "Biceps", "Hamstrings"],
    equipment: ["Barbell"],
    workoutLocation: ["gym"],
    tips: ["Brace hard before every rep.", "Keep the bar close to the body."],
    commonMistakes: ["Standing too upright.", "Using too much body English."],
    substitutions: [
      { type: "same-pattern-option", name: "Single-arm dumbbell row", reason: "Keeps the horizontal pull with more support." },
      { type: "easier-option", name: "Resistance band row", reason: "Reduces spinal loading while keeping the pattern." },
      { type: "gym-alternative", name: "Lat pulldown", reason: "Still trains the back hard through a machine pull." },
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
      { type: "same-pattern-option", name: "Straight-leg deadlift", reason: "Keeps a similar hinge with a longer hamstring stretch." },
      { type: "easier-option", name: "Hip hinge drill", reason: "Lets you groove the hinge pattern before loading it hard." },
      { type: "home-alternative", name: "Kettlebell deadlift", reason: "Works well when you have limited home equipment." },
    ],
  }),
  createExerciseMetadata("Straight-leg deadlift", {
    shortDescription: "A longer-range hinge variation that heavily challenges the hamstrings.",
    stepByStepInstructions: [
      "Stand tall with the bar close and only a slight knee unlock.",
      "Hinge back while keeping the legs nearly fixed and the spine long.",
      "Drive the hips through to stand once the hamstrings are loaded.",
    ],
    primaryMuscles: ["Hamstrings", "Glutes"],
    secondaryMuscles: ["Lower back", "Forearms"],
    equipment: ["Barbell"],
    workoutLocation: ["gym"],
    tips: ["Only go as low as you can keep position.", "Keep the bar skimming the legs."],
    commonMistakes: ["Locking the knees hard.", "Rounding to chase extra depth."],
    substitutions: [
      { type: "same-pattern-option", name: "Romanian deadlift", reason: "Keeps the hinge pattern with a friendlier knee position." },
      { type: "gym-alternative", name: "Good morning", reason: "Still loads the posterior chain through a hinge." },
      { type: "easier-option", name: "Dumbbell Romanian deadlift", reason: "Simplifies the setup and balance demands." },
    ],
  }),
  createExerciseMetadata("Good morning", {
    shortDescription: "A barbell hinge that trains posterior-chain control under tension.",
    stepByStepInstructions: [
      "Set the bar on the upper back and brace before moving.",
      "Push the hips back until the torso reaches a strong hinge position.",
      "Stand by driving the hips forward without losing spinal alignment.",
    ],
    primaryMuscles: ["Hamstrings", "Glutes", "Lower back"],
    secondaryMuscles: ["Upper back", "Core"],
    equipment: ["Barbell"],
    workoutLocation: ["gym"],
    tips: ["Use conservative loading until the pattern feels automatic.", "Keep the chin tucked and ribs stacked."],
    commonMistakes: ["Bending the knees too much.", "Diving too low too fast."],
    substitutions: [
      { type: "same-pattern-option", name: "Romanian deadlift", reason: "Loads the same muscles with the bar in the hands." },
      { type: "easier-option", name: "Hip hinge drill", reason: "Builds the pattern with less loading." },
      { type: "home-alternative", name: "Glute bridge", reason: "Trains the posterior chain with simpler mechanics." },
    ],
  }),
  createExerciseMetadata("Clean and press", {
    shortDescription: "A total-body power move that links an explosive clean into an overhead press.",
    stepByStepInstructions: [
      "Explosively clean the weight to shoulder level with a tight rack position.",
      "Settle the body and brace before the press.",
      "Drive the weight overhead and lower it under control.",
    ],
    primaryMuscles: ["Shoulders", "Traps", "Legs"],
    secondaryMuscles: ["Core", "Glutes", "Triceps"],
    equipment: ["Barbell or dumbbells"],
    workoutLocation: ["gym"],
    tips: ["Treat the clean and press as two clean positions.", "Stay crisp instead of muscling every rep."],
    commonMistakes: ["Catching the clean with loose elbows.", "Pressing from a soft trunk."],
    substitutions: [
      { type: "same-pattern-option", name: "Dumbbell shoulder press", reason: "Keeps the overhead press portion with less complexity." },
      { type: "gym-alternative", name: "Upright row", reason: "Still hits shoulders and traps through a pull." },
      { type: "easier-option", name: "Front raise", reason: "Simplifies shoulder work when fatigue is high." },
    ],
  }),
  createExerciseMetadata("Dumbbell shoulder press", {
    shortDescription: "A stable overhead press for delts and triceps.",
    stepByStepInstructions: [
      "Start with dumbbells at shoulder level and ribs stacked.",
      "Press overhead until the arms finish near the ears.",
      "Lower slowly back to the start without flaring the ribs.",
    ],
    primaryMuscles: ["Shoulders", "Triceps"],
    secondaryMuscles: ["Upper chest", "Core"],
    equipment: ["Dumbbells"],
    workoutLocation: ["home", "gym"],
    tips: ["Squeeze glutes to stay tall.", "Keep the forearms vertical early in the rep."],
    commonMistakes: ["Overarching the low back.", "Letting elbows drift too far behind the body."],
    substitutions: [
      { type: "same-pattern-option", name: "Clean and press", reason: "Adds a total-body lead-in to the overhead press." },
      { type: "easier-option", name: "Front raise", reason: "Reduces coordination and loading demands." },
      { type: "gym-alternative", name: "Upright row", reason: "Still builds shoulders and traps in a gym setup." },
    ],
  }),
  createExerciseMetadata("Front raise", {
    shortDescription: "An isolation move for the front delts and shoulder control.",
    stepByStepInstructions: [
      "Stand tall with the weight in front of the thighs.",
      "Raise the arms to shoulder height without swinging.",
      "Lower back down with the same control.",
    ],
    primaryMuscles: ["Front shoulders"],
    secondaryMuscles: ["Upper chest", "Core"],
    equipment: ["Dumbbells, plates, or bands"],
    workoutLocation: ["home", "gym"],
    tips: ["Keep the torso quiet.", "Use a range that stays shoulder-friendly."],
    commonMistakes: ["Swinging the body to finish reps.", "Lifting too high and shrugging."],
    substitutions: [
      { type: "same-pattern-option", name: "Lateral raise", reason: "Keeps delt isolation with a different line of pull." },
      { type: "gym-alternative", name: "Dumbbell shoulder press", reason: "Turns shoulder work into a compound press." },
      { type: "easier-option", name: "Reverse fly", reason: "Still trains shoulder control with lighter loading." },
    ],
  }),
  createExerciseMetadata("Lateral raise", {
    shortDescription: "A staple side-delt movement for shoulder width and control.",
    stepByStepInstructions: [
      "Hold the weights by the thighs with a slight elbow bend.",
      "Raise the arms out to the sides until they reach shoulder height.",
      "Lower slowly without letting the traps take over.",
    ],
    primaryMuscles: ["Side shoulders"],
    secondaryMuscles: ["Upper traps", "Rear shoulders"],
    equipment: ["Dumbbells or cables"],
    workoutLocation: ["home", "gym"],
    tips: ["Lead with the elbows.", "Keep tension instead of rushing the bottom."],
    commonMistakes: ["Shrugging through every rep.", "Swinging the weights up."],
    substitutions: [
      { type: "same-pattern-option", name: "Reverse fly", reason: "Keeps shoulder isolation with more rear-delt bias." },
      { type: "gym-alternative", name: "Upright row", reason: "Adds a heavier compound pull for delts and traps." },
      { type: "easier-option", name: "Front raise", reason: "Keeps shoulder isolation with a simpler path." },
    ],
  }),
  createExerciseMetadata("Upright row", {
    shortDescription: "A vertical pull that loads delts and upper traps.",
    stepByStepInstructions: [
      "Stand tall and hold the bar or dumbbells in front of the thighs.",
      "Pull upward by leading with the elbows.",
      "Lower with control once the elbows reach a comfortable height.",
    ],
    primaryMuscles: ["Side shoulders", "Upper traps"],
    secondaryMuscles: ["Biceps", "Forearms"],
    equipment: ["Barbell, dumbbells, or cable"],
    workoutLocation: ["gym"],
    tips: ["Use a grip width that feels good on the shoulders.", "Stop before shoulder discomfort shows up."],
    commonMistakes: ["Pulling too high with pain.", "Yanking the weight with momentum."],
    substitutions: [
      { type: "same-pattern-option", name: "Lateral raise", reason: "Keeps delt emphasis with a shoulder-friendlier option." },
      { type: "gym-alternative", name: "Clean and press", reason: "Uses a more athletic shoulder and trap pattern." },
      { type: "easier-option", name: "Front raise", reason: "Reduces complexity and joint demand." },
    ],
  }),
  createExerciseMetadata("Reverse fly", {
    shortDescription: "An upper-back and rear-delt isolation move for posture and shoulder balance.",
    stepByStepInstructions: [
      "Hinge forward with a neutral spine and weights under the shoulders.",
      "Open the arms wide while squeezing through the upper back.",
      "Lower under control without shrugging.",
    ],
    primaryMuscles: ["Rear shoulders", "Upper back"],
    secondaryMuscles: ["Mid traps", "Rhomboids"],
    equipment: ["Dumbbells or cables"],
    workoutLocation: ["home", "gym"],
    tips: ["Move from the shoulder, not the hands.", "Keep the neck relaxed."],
    commonMistakes: ["Standing up during the rep.", "Using too much weight to feel the target muscles."],
    substitutions: [
      { type: "same-pattern-option", name: "Prone Y-T-W raises", reason: "Keeps rear-delt and upper-back control work." },
      { type: "gym-alternative", name: "Lateral raise", reason: "Still isolates the shoulders with a different bias." },
      { type: "easier-option", name: "Bird dog", reason: "Builds upper-back stability with simpler loading." },
    ],
  }),
  createExerciseMetadata("Barbell curl", {
    shortDescription: "A classic elbow-flexion move for biceps size and strength.",
    stepByStepInstructions: [
      "Stand tall with the bar hanging at arm's length.",
      "Curl the bar up without swinging the torso.",
      "Lower it slowly until the elbows straighten again.",
    ],
    primaryMuscles: ["Biceps"],
    secondaryMuscles: ["Forearms"],
    equipment: ["Barbell"],
    workoutLocation: ["gym"],
    tips: ["Keep elbows close to the body.", "Own the lowering phase."],
    commonMistakes: ["Rocking the torso to finish reps.", "Cutting the range short."],
    substitutions: [
      { type: "same-pattern-option", name: "Incline dumbbell curl", reason: "Keeps the curl pattern with more stretch." },
      { type: "easier-option", name: "Resistance band row", reason: "Still trains elbow flexors within a pull." },
      { type: "home-alternative", name: "Dumbbell shoulder press", reason: "Gives an upper-body alternative if curling tools are limited." },
    ],
  }),
  createExerciseMetadata("Incline dumbbell curl", {
    shortDescription: "A stretched-position curl that emphasizes the biceps hard.",
    stepByStepInstructions: [
      "Sit back on an incline bench with arms hanging straight down.",
      "Curl the dumbbells while keeping the upper arms mostly still.",
      "Lower with control to reclaim the stretch.",
    ],
    primaryMuscles: ["Biceps"],
    secondaryMuscles: ["Forearms", "Front shoulders"],
    equipment: ["Dumbbells", "Incline bench"],
    workoutLocation: ["gym"],
    tips: ["Let the bench hold your posture.", "Do not rush the bottom stretch."],
    commonMistakes: ["Rolling the shoulders forward.", "Turning it into a hammer curl unintentionally."],
    substitutions: [
      { type: "same-pattern-option", name: "Barbell curl", reason: "Keeps direct biceps work with a more stable setup." },
      { type: "easier-option", name: "Barbell bent-over row", reason: "Still trains the biceps as a secondary mover." },
      { type: "gym-alternative", name: "Lat pulldown", reason: "Includes strong elbow flexor involvement in a compound pull." },
    ],
  }),
  createExerciseMetadata("Skullcrusher", {
    shortDescription: "A direct triceps move that loads elbow extension through a long range.",
    stepByStepInstructions: [
      "Lie on a bench and hold the weight over the shoulders.",
      "Bend at the elbows to lower the weight toward the forehead or behind the head.",
      "Extend the elbows to return to the start.",
    ],
    primaryMuscles: ["Triceps"],
    secondaryMuscles: ["Shoulders"],
    equipment: ["EZ bar, barbell, or dumbbells", "Bench"],
    workoutLocation: ["gym"],
    tips: ["Keep the upper arms mostly fixed.", "Use a path that feels good on the elbows."],
    commonMistakes: ["Letting the elbows flare too hard.", "Dropping into the bottom too quickly."],
    substitutions: [
      { type: "same-pattern-option", name: "Overhead tricep extension", reason: "Still isolates the triceps through elbow extension." },
      { type: "gym-alternative", name: "Chest dips", reason: "Keeps a strong triceps-loaded press." },
      { type: "easier-option", name: "Push-up", reason: "Gives a simpler pressing pattern with triceps demand." },
    ],
  }),
  createExerciseMetadata("Overhead tricep extension", {
    shortDescription: "A triceps isolation move that challenges the long head in a stretched position.",
    stepByStepInstructions: [
      "Hold one or two weights overhead with elbows pointed forward.",
      "Lower behind the head by bending at the elbows.",
      "Extend back up without arching the torso.",
    ],
    primaryMuscles: ["Triceps"],
    secondaryMuscles: ["Core", "Shoulders"],
    equipment: ["Dumbbell, cable, or band"],
    workoutLocation: ["home", "gym"],
    tips: ["Brace lightly through the abs.", "Keep the upper arms steady."],
    commonMistakes: ["Flaring ribs and arching the back.", "Letting elbows drift wide."],
    substitutions: [
      { type: "same-pattern-option", name: "Skullcrusher", reason: "Keeps direct triceps work in a supported position." },
      { type: "gym-alternative", name: "Chest dips", reason: "Adds a compound triceps-heavy pattern." },
      { type: "easier-option", name: "Resistance band chest press", reason: "Still trains triceps through a pressing pattern." },
    ],
  }),
  createExerciseMetadata("Wrist curl up", {
    shortDescription: "A forearm flexor exercise for grip-supporting muscle endurance.",
    stepByStepInstructions: [
      "Rest the forearms on a bench or thighs with palms up.",
      "Curl the wrists upward through a full comfortable range.",
      "Lower slowly back into extension.",
    ],
    primaryMuscles: ["Forearms"],
    secondaryMuscles: ["Grip"],
    equipment: ["Barbell or dumbbells"],
    workoutLocation: ["home", "gym"],
    tips: ["Use slow reps to feel the forearms work.", "Keep the movement at the wrist."],
    commonMistakes: ["Bouncing through the bottom.", "Turning it into an elbow movement."],
    substitutions: [
      { type: "same-pattern-option", name: "Wrist curl down", reason: "Balances forearm work through the opposite side." },
      { type: "gym-alternative", name: "Barbell curl", reason: "Still trains the forearms heavily as helpers." },
      { type: "easier-option", name: "Farmer hold", reason: "Builds grip and forearm endurance simply." },
    ],
  }),
  createExerciseMetadata("Wrist curl down", {
    shortDescription: "A forearm extensor move to round out wrist and grip work.",
    stepByStepInstructions: [
      "Rest the forearms on a bench or thighs with palms facing down.",
      "Lift the back of the hands upward by extending the wrists.",
      "Lower slowly to the start.",
    ],
    primaryMuscles: ["Forearms"],
    secondaryMuscles: ["Grip"],
    equipment: ["Barbell or dumbbells"],
    workoutLocation: ["home", "gym"],
    tips: ["Use lighter weight than the palm-up version.", "Stay smooth instead of jerky."],
    commonMistakes: ["Using too much weight to control well.", "Moving from the shoulders or elbows."],
    substitutions: [
      { type: "same-pattern-option", name: "Wrist curl up", reason: "Keeps direct forearm work with the opposite emphasis." },
      { type: "gym-alternative", name: "Reverse fly", reason: "Still helps upper-arm and forearm control." },
      { type: "easier-option", name: "Farmer hold", reason: "Builds general grip capacity with simpler setup." },
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
      { type: "same-pattern-option", name: "Barbell squat", reason: "Keeps the squat pattern with more loading potential." },
      { type: "gym-alternative", name: "Leg extension", reason: "Lets you train the quads in a machine-based option." },
    ],
  }),
  createExerciseMetadata("Barbell squat", {
    shortDescription: "A classic squat variation for leg and full-body strength.",
    stepByStepInstructions: [
      "Set the bar securely on the upper back and brace hard.",
      "Sit down and slightly back while keeping the whole foot grounded.",
      "Drive up from the bottom without losing torso position.",
    ],
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Adductors", "Core", "Lower back"],
    equipment: ["Barbell", "Rack"],
    workoutLocation: ["gym"],
    tips: ["Find a stance you can own.", "Keep pressure through mid-foot and heel."],
    commonMistakes: ["Collapsing the chest.", "Losing balance at the bottom."],
    substitutions: [
      { type: "same-pattern-option", name: "Goblet squat", reason: "Keeps the squat pattern with simpler loading." },
      { type: "gym-alternative", name: "Leg extension", reason: "Still targets the quads when squatting is limited." },
      { type: "easier-option", name: "Bodyweight squat", reason: "Simplifies the pattern to bodyweight only." },
    ],
  }),
  createExerciseMetadata("Barbell deadlift", {
    shortDescription: "A heavy pull from the floor that builds total-body strength.",
    stepByStepInstructions: [
      "Set the feet under the bar and brace before the pull.",
      "Push the floor away while keeping the bar close.",
      "Stand tall, then lower the bar with control back to the floor.",
    ],
    primaryMuscles: ["Glutes", "Hamstrings", "Back"],
    secondaryMuscles: ["Quads", "Forearms", "Core"],
    equipment: ["Barbell"],
    workoutLocation: ["gym"],
    tips: ["Create tension before the bar leaves the floor.", "Keep the lats active."],
    commonMistakes: ["Jerking the bar from a loose start.", "Letting the bar drift away from the legs."],
    substitutions: [
      { type: "same-pattern-option", name: "Romanian deadlift", reason: "Keeps posterior-chain loading with a simpler start position." },
      { type: "gym-alternative", name: "Straight-leg deadlift", reason: "Maintains a heavy hinge with more hamstring bias." },
      { type: "easier-option", name: "Kettlebell deadlift", reason: "Reduces technical demand while preserving the hinge." },
    ],
  }),
  createExerciseMetadata("Leg extension", {
    shortDescription: "A machine isolation move that directly challenges the quads.",
    stepByStepInstructions: [
      "Set the machine so the knee lines up with the pivot point.",
      "Extend the legs until the quads contract hard.",
      "Lower under control without letting the stack crash.",
    ],
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Hip flexors"],
    equipment: ["Leg extension machine"],
    workoutLocation: ["gym"],
    tips: ["Pause briefly at peak contraction.", "Use a smooth lowering phase."],
    commonMistakes: ["Swinging through the bottom.", "Using a range that bothers the knees."],
    substitutions: [
      { type: "same-pattern-option", name: "Bodyweight squat", reason: "Still trains knee extension in a simple pattern." },
      { type: "gym-alternative", name: "Barbell squat", reason: "Turns quad work into a compound strength lift." },
      { type: "easier-option", name: "Step-up", reason: "Keeps quad focus with bodyweight or light loading." },
    ],
  }),
  createExerciseMetadata("Leg curl", {
    shortDescription: "A machine hamstring isolation exercise for knee flexion strength.",
    stepByStepInstructions: [
      "Set the machine so the pad sits comfortably above the ankles.",
      "Curl the heels toward the hips while staying braced.",
      "Lower slowly to keep tension on the hamstrings.",
    ],
    primaryMuscles: ["Hamstrings"],
    secondaryMuscles: ["Calves"],
    equipment: ["Leg curl machine"],
    workoutLocation: ["gym"],
    tips: ["Keep the hips down on the pad.", "Own the eccentric."],
    commonMistakes: ["Crashing the weight stack.", "Shortening the range to chase heavier weight."],
    substitutions: [
      { type: "same-pattern-option", name: "Romanian deadlift", reason: "Still trains the hamstrings strongly through hip extension." },
      { type: "gym-alternative", name: "Straight-leg deadlift", reason: "Adds a loaded stretch for the hamstrings." },
      { type: "easier-option", name: "Glute bridge", reason: "Simplifies posterior-chain work." },
    ],
  }),
  createExerciseMetadata("Calf raise", {
    shortDescription: "A lower-leg movement for calf size, ankle strength, and stiffness.",
    stepByStepInstructions: [
      "Stand with the balls of the feet on a stable edge or platform.",
      "Rise onto the toes as high as you can under control.",
      "Lower through a full stretch before the next rep.",
    ],
    primaryMuscles: ["Calves"],
    secondaryMuscles: ["Feet and ankles"],
    equipment: ["Bodyweight or machine"],
    workoutLocation: ["home", "gym"],
    tips: ["Pause at the top.", "Use the full available ankle range."],
    commonMistakes: ["Bouncing through the reps.", "Rushing the stretch."],
    substitutions: [
      { type: "same-pattern-option", name: "Step-up", reason: "Still trains lower-leg stiffness and ankle control." },
      { type: "gym-alternative", name: "Leg curl", reason: "Keeps lower-body accessory work in the session." },
      { type: "easier-option", name: "Brisk walk or incline walk", reason: "Adds lower-leg work with simpler conditioning." },
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
  createExerciseMetadata("Decline crunch", {
    shortDescription: "A trunk-flexion move that heavily targets the front abs through a longer range.",
    stepByStepInstructions: [
      "Lock the feet into the decline bench and brace first.",
      "Curl the rib cage toward the pelvis without yanking on the neck.",
      "Lower with control to keep tension on the abs.",
    ],
    primaryMuscles: ["Rectus abdominis"],
    secondaryMuscles: ["Hip flexors"],
    equipment: ["Decline bench"],
    workoutLocation: ["gym"],
    tips: ["Think ribs down, not elbows forward.", "Keep reps smooth instead of fast."],
    commonMistakes: ["Pulling on the neck.", "Swinging to get momentum."],
    substitutions: [
      { type: "same-pattern-option", name: "Cable crunch", reason: "Keeps loaded trunk flexion." },
      { type: "easier-option", name: "Dead bug", reason: "Simplifies core work while staying focused on trunk control." },
      { type: "gym-alternative", name: "Hanging leg raise", reason: "Trains the front abs with more lower-body contribution." },
    ],
  }),
  createExerciseMetadata("Hanging leg raise", {
    shortDescription: "A front-ab movement that challenges the core through a hanging position.",
    stepByStepInstructions: [
      "Hang from the bar and set the shoulders down first.",
      "Raise the legs by curling the pelvis upward under control.",
      "Lower without swinging into the next rep.",
    ],
    primaryMuscles: ["Rectus abdominis", "Hip flexors"],
    secondaryMuscles: ["Grip", "Lats"],
    equipment: ["Pull-up bar"],
    workoutLocation: ["gym"],
    tips: ["Posteriorly tilt the pelvis at the top.", "Reset the swing between reps if needed."],
    commonMistakes: ["Turning every rep into a kip.", "Only lifting the thighs instead of curling the pelvis."],
    substitutions: [
      { type: "same-pattern-option", name: "Ab wheel rollout", reason: "Keeps a high-tension front-core demand." },
      { type: "easier-option", name: "Decline crunch", reason: "Uses a more stable setup for front abs." },
      { type: "home-alternative", name: "Plank", reason: "Keeps the front core bracing challenge simple." },
    ],
  }),
  createExerciseMetadata("Cable crunch", {
    shortDescription: "A loaded ab exercise that trains forceful trunk flexion.",
    stepByStepInstructions: [
      "Kneel facing away from the cable and hold the rope at the temples.",
      "Curl the rib cage down toward the pelvis without just hinging at the hips.",
      "Return under control and keep tension on the abs.",
    ],
    primaryMuscles: ["Rectus abdominis"],
    secondaryMuscles: ["Obliques"],
    equipment: ["Cable machine"],
    workoutLocation: ["gym"],
    tips: ["Keep the hips mostly still.", "Exhale as you crunch down."],
    commonMistakes: ["Squatting the movement.", "Using the arms to yank the rope."],
    substitutions: [
      { type: "same-pattern-option", name: "Decline crunch", reason: "Still trains loaded trunk flexion." },
      { type: "gym-alternative", name: "Dragon flag", reason: "Offers a tougher front-core challenge." },
      { type: "easier-option", name: "Dead bug", reason: "Simplifies the front-core demand." },
    ],
  }),
  createExerciseMetadata("Dragon flag", {
    shortDescription: "A high-skill front-core movement demanding extreme trunk stiffness.",
    stepByStepInstructions: [
      "Grip the bench firmly overhead and lift the body into a rigid line.",
      "Lower the body slowly while keeping hips and ribs locked together.",
      "Return only through a range you can control well.",
    ],
    primaryMuscles: ["Rectus abdominis", "Deep core"],
    secondaryMuscles: ["Lats", "Hip flexors"],
    equipment: ["Bench"],
    workoutLocation: ["gym"],
    tips: ["Treat it like one solid plank moving through space.", "Use negatives before full reps."],
    commonMistakes: ["Breaking at the hips.", "Dropping too fast."],
    substitutions: [
      { type: "same-pattern-option", name: "Ab wheel rollout", reason: "Still gives a very high-tension front-core challenge." },
      { type: "easier-option", name: "Cable crunch", reason: "Trains the front abs with a more scalable load." },
      { type: "home-alternative", name: "Plank", reason: "Keeps the anti-extension focus simpler." },
    ],
  }),
  createExerciseMetadata("Ab wheel rollout", {
    shortDescription: "A demanding anti-extension drill for the front core and shoulders.",
    stepByStepInstructions: [
      "Start tall on the knees with the wheel under the shoulders.",
      "Roll forward while keeping the ribs tucked and glutes on.",
      "Pull back in without letting the low back sag.",
    ],
    primaryMuscles: ["Rectus abdominis", "Deep core"],
    secondaryMuscles: ["Lats", "Shoulders"],
    equipment: ["Ab wheel"],
    workoutLocation: ["home", "gym"],
    tips: ["Only roll as far as you can hold position.", "Squeeze glutes to protect the spine."],
    commonMistakes: ["Letting the hips lead back first.", "Collapsing into the low back."],
    substitutions: [
      { type: "same-pattern-option", name: "Dragon flag", reason: "Matches the advanced front-core demand." },
      { type: "easier-option", name: "Plank", reason: "Builds the same anti-extension pattern more simply." },
      { type: "home-alternative", name: "Dead bug", reason: "Reinforces rib and pelvis control." },
    ],
  }),
  createExerciseMetadata("Russian twist", {
    shortDescription: "A rotational core drill that targets the obliques and trunk control.",
    stepByStepInstructions: [
      "Sit tall with heels down or lifted and brace the trunk.",
      "Rotate side to side from the ribs while keeping the chest up.",
      "Move smoothly instead of whipping the weight around.",
    ],
    primaryMuscles: ["Obliques"],
    secondaryMuscles: ["Rectus abdominis", "Hip flexors"],
    equipment: ["Bodyweight or light weight"],
    workoutLocation: ["home", "gym"],
    tips: ["Rotate the torso, not just the arms.", "Keep the range clean."],
    commonMistakes: ["Slouching through the low back.", "Using momentum instead of control."],
    substitutions: [
      { type: "same-pattern-option", name: "Cable woodchop", reason: "Keeps a rotational oblique pattern with external load." },
      { type: "easier-option", name: "Side plank hip dip", reason: "Reduces rotational demand while keeping oblique tension." },
      { type: "gym-alternative", name: "Landmine twist", reason: "Adds a standing loaded rotation option." },
    ],
  }),
  createExerciseMetadata("Landmine twist", {
    shortDescription: "A standing rotational lift that challenges the obliques and shoulders together.",
    stepByStepInstructions: [
      "Hold the end of the landmine bar with arms mostly straight.",
      "Rotate the bar side to side while turning through the trunk and feet.",
      "Control the arc instead of bouncing between sides.",
    ],
    primaryMuscles: ["Obliques"],
    secondaryMuscles: ["Shoulders", "Core", "Hips"],
    equipment: ["Landmine setup"],
    workoutLocation: ["gym"],
    tips: ["Stay tall and rotate through the whole body.", "Keep the movement athletic but controlled."],
    commonMistakes: ["Only moving the arms.", "Losing balance to chase range."],
    substitutions: [
      { type: "same-pattern-option", name: "Cable woodchop", reason: "Still trains standing loaded rotation." },
      { type: "easier-option", name: "Russian twist", reason: "Uses a simpler seated rotation." },
      { type: "home-alternative", name: "Side plank hip dip", reason: "Keeps oblique emphasis with no equipment." },
    ],
  }),
  createExerciseMetadata("Cable woodchop", {
    shortDescription: "A loaded diagonal core movement for the obliques and trunk control.",
    stepByStepInstructions: [
      "Set the cable high or low and stand side-on to the stack.",
      "Pull the handle across the body through the torso, not just the arms.",
      "Return with control to resist the machine pulling you back.",
    ],
    primaryMuscles: ["Obliques"],
    secondaryMuscles: ["Rectus abdominis", "Shoulders", "Hips"],
    equipment: ["Cable machine"],
    workoutLocation: ["gym"],
    tips: ["Keep the ribs down and hips stable.", "Move through a clean diagonal line."],
    commonMistakes: ["Jerking the handle with the arms.", "Over-rotating the spine without control."],
    substitutions: [
      { type: "same-pattern-option", name: "Landmine twist", reason: "Keeps a strong standing rotational challenge." },
      { type: "easier-option", name: "Russian twist", reason: "Simplifies the setup while keeping oblique work." },
      { type: "home-alternative", name: "Side plank hip dip", reason: "Keeps oblique tension without cables." },
    ],
  }),
  createExerciseMetadata("Side plank hip dip", {
    shortDescription: "A side-core movement that loads the obliques through a controlled range.",
    stepByStepInstructions: [
      "Set a strong side plank with elbow under the shoulder.",
      "Lower the hip slightly toward the floor without collapsing.",
      "Lift back up by driving through the underside obliques.",
    ],
    primaryMuscles: ["Obliques"],
    secondaryMuscles: ["Shoulders", "Glutes"],
    equipment: ["Bodyweight"],
    workoutLocation: ["home", "gym"],
    tips: ["Stay long from head to heel.", "Use a range you can own."],
    commonMistakes: ["Turning the chest down.", "Dropping into the shoulder."],
    substitutions: [
      { type: "same-pattern-option", name: "Side plank", reason: "Keeps the same side-core pattern more statically." },
      { type: "easier-option", name: "Bird dog", reason: "Builds trunk control with lower demand." },
      { type: "gym-alternative", name: "Cable woodchop", reason: "Adds a loaded oblique challenge." },
    ],
  }),
  createExerciseMetadata("Hanging oblique raise", {
    shortDescription: "A hanging oblique move that adds side-flexion and pelvic control.",
    stepByStepInstructions: [
      "Hang from the bar and set the shoulders down first.",
      "Raise the knees toward one side by curling the pelvis and rotating lightly.",
      "Lower under control and alternate or finish one side at a time.",
    ],
    primaryMuscles: ["Obliques", "Rectus abdominis"],
    secondaryMuscles: ["Grip", "Hip flexors"],
    equipment: ["Pull-up bar"],
    workoutLocation: ["gym"],
    tips: ["Move from the trunk, not just the hips.", "Reset swing between reps if needed."],
    commonMistakes: ["Kipping through the rep.", "Only twisting the knees without pelvic control."],
    substitutions: [
      { type: "same-pattern-option", name: "Russian twist", reason: "Keeps rotational oblique work in a simpler setup." },
      { type: "easier-option", name: "Side plank hip dip", reason: "Maintains oblique emphasis with more stability." },
      { type: "gym-alternative", name: "Cable woodchop", reason: "Adds loaded standing rotation." },
    ],
  }),
  createExerciseMetadata("Hanging oblique knee raise", {
    shortDescription: "A hanging oblique move that adds side-flexion and pelvic control.",
    stepByStepInstructions: [
      "Hang from the bar and lock the shoulders down before you move.",
      "Raise the knees toward one side by curling the pelvis and rotating lightly.",
      "Lower slowly and reset the swing before the next rep.",
    ],
    primaryMuscles: ["Obliques", "Rectus abdominis"],
    secondaryMuscles: ["Grip", "Hip flexors"],
    equipment: ["Pull-up bar"],
    workoutLocation: ["gym"],
    tips: ["Move from the trunk instead of flicking the knees.", "Own each side evenly."],
    commonMistakes: ["Using momentum to swing through reps.", "Only turning the knees without curling the pelvis."],
    substitutions: [
      { type: "same-pattern-option", name: "Hanging oblique raise", reason: "Keeps the same hanging oblique pattern." },
      { type: "gym-alternative", name: "Cable woodchop", reason: "Still challenges the obliques with load." },
      { type: "easier-option", name: "Side plank hip dip", reason: "Uses a more stable setup for oblique work." },
    ],
  }),
  createExerciseMetadata("Toes to bar", {
    shortDescription: "A high-skill front-core movement that combines hanging control with strong ab tension.",
    stepByStepInstructions: [
      "Hang from the bar and set the shoulders before each rep.",
      "Raise the feet toward the bar by curling the pelvis and bracing hard.",
      "Lower under control without turning the movement into a swing.",
    ],
    primaryMuscles: ["Rectus abdominis", "Hip flexors"],
    secondaryMuscles: ["Grip", "Lats", "Obliques"],
    equipment: ["Pull-up bar"],
    workoutLocation: ["gym"],
    tips: ["Think ribs to pelvis before feet to bar.", "Reset if the swing takes over."],
    commonMistakes: ["Kipping every rep.", "Only lifting the legs without curling the trunk."],
    substitutions: [
      { type: "same-pattern-option", name: "Hanging leg raise", reason: "Keeps the same hanging front-core pattern with a lower skill floor." },
      { type: "gym-alternative", name: "Ab wheel rollout", reason: "Still delivers a high-tension front-core challenge." },
      { type: "easier-option", name: "Cable crunch", reason: "Scales front-ab work with more stability." },
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
  "Incline push-up",
  "Kettlebell floor press",
  "Pike push-up",
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
  "Farmer hold",
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

    if (__DEV__) {
      console.log("[exercise-library] resolved exercise metadata", {
        slug,
        hasLocalImage: Boolean(entry.localImage),
        usingPlaceholder: !entry.localImage,
      });
    }

    return {
      ...entry,
      isFallback: !hasDetailedContent,
    };
  }

  const fallback = createExerciseMetadata(fallbackName ?? humanizeSlug(slug), {
    shortDescription: "This movement is part of your current plan, but full coaching notes have not been added yet.",
  });

  if (__DEV__) {
    console.log("[exercise-library] fallback exercise metadata", {
      slug,
      fallbackName,
      hasLocalImage: Boolean(fallback.localImage),
      usingPlaceholder: !fallback.localImage,
    });
  }

  return {
    ...fallback,
    isFallback: true,
  };
}
