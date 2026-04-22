import { LearnArticle } from "@/types/content";

export const learnArticles: LearnArticle[] = [
  {
    slug: "fat-loss-consistency-beats-extremes",
    title: "Fat Loss Works Better When Consistency Beats Extremes",
    category: "fat-loss",
    shortSummary:
      "Sustainable fat loss usually comes from repeatable habits, not all-or-nothing dieting.",
    fullContent: [
      "Fat loss is easier to sustain when your plan feels realistic on busy weekdays, social weekends, and lower-motivation days. That usually means using moderate calorie control, regular protein, and movement you can repeat.",
      "A good fat-loss week does not require perfect meals or maximal cardio. It requires enough structure to stay near your target most of the time without rebounding hard after every strict stretch.",
      "If your energy, mood, and training quality collapse, the plan is probably too aggressive. The better target is a routine you can repeat for months instead of white-knuckling for ten days.",
    ],
    tags: ["calorie balance", "habits", "consistency"],
    estimatedReadTimeMinutes: 3,
  },
  {
    slug: "muscle-gain-needs-food-and-recovery",
    title: "Muscle Gain Needs Enough Food and Enough Recovery",
    category: "muscle-gain",
    shortSummary:
      "Muscle gain works best when hard training is supported by a small surplus, solid protein, and sleep.",
    fullContent: [
      "Building muscle is not only about pushing harder in the gym. Your body also needs enough calories, enough protein, and enough recovery time to actually adapt to the work you do.",
      "That is why a small calorie surplus usually works better than wildly overeating. More food is not automatically more progress if your digestion, sleep, and training quality start slipping.",
      "A simple muscle-gain rhythm is strength-focused training, steady protein across meals, carbs around training, and a recovery routine that keeps your effort repeatable week after week.",
    ],
    tags: ["hypertrophy", "recovery", "protein"],
    estimatedReadTimeMinutes: 3,
  },
  {
    slug: "recovery-is-part-of-the-program",
    title: "Recovery Is Part of the Program, Not a Bonus",
    category: "recovery",
    shortSummary:
      "Sleep, stress control, and pacing make your training stick. Recovery is not separate from results.",
    fullContent: [
      "Progress happens when training stress and recovery work together. If workouts keep rising while sleep, stress, and soreness keep worsening, your output eventually drops.",
      "Recovery does not have to mean doing nothing. It can mean walking, mobility work, hydration, earlier sleep, or simply avoiding the urge to turn every session into a max-effort test.",
      "A strong recovery mindset helps you protect momentum. The goal is not to feel crushed after every workout. The goal is to stay ready for the next good one.",
    ],
    tags: ["sleep", "stress", "adaptation"],
    estimatedReadTimeMinutes: 2,
  },
  {
    slug: "hydration-supports-performance",
    title: "Hydration Quietly Supports Performance, Energy, and Focus",
    category: "hydration",
    shortSummary:
      "Hydration is one of the simplest ways to support better training quality and day-to-day energy.",
    fullContent: [
      "Hydration is easy to overlook because it feels basic, but it affects energy, training tolerance, focus, and how hard sessions feel. Small misses can add up fast during a busy week.",
      "A simple approach is to drink steadily through the day, not only during workouts. Many people do better when they anchor water to meals, commutes, and the start of training.",
      "If you sweat heavily or train in heat, a basic electrolyte strategy may help you stay more consistent. You do not need to complicate it. You just need a repeatable habit.",
    ],
    tags: ["water", "electrolytes", "energy"],
    estimatedReadTimeMinutes: 2,
  },
  {
    slug: "supplements-should-support-basics",
    title: "Supplements Should Support the Basics, Not Replace Them",
    category: "supplements",
    shortSummary:
      "Supplements can be useful, but they work best when food, training, and sleep are already in place.",
    fullContent: [
      "Supplements are most helpful when they solve a real gap. A protein powder may help convenience, creatine may support training, and electrolytes may help hard sweaty sessions. None of them replace the basics.",
      "The smartest way to think about supplements is as support tools, not shortcuts. If meals are scattered and sleep is inconsistent, adding more products rarely fixes the root issue.",
      "Start with the simplest useful option, use it consistently, and judge it by whether it makes your routine easier to maintain.",
    ],
    tags: ["protein powder", "creatine", "basics first"],
    estimatedReadTimeMinutes: 2,
  },
  {
    slug: "mindset-progress-comes-from-reps",
    title: "Mindset Improves When You Measure Progress in Reps, Not Perfection",
    category: "mindset",
    shortSummary:
      "A better fitness mindset comes from stacking enough good days, not from demanding flawless weeks.",
    fullContent: [
      "Many people lose momentum because they treat one missed workout or one off-plan meal like failure. A stronger mindset treats those moments as noise, not identity.",
      "Progress comes from enough reps of useful behaviors: showing up, getting back on track, and staying engaged long enough to learn what actually works for you.",
      "Confidence grows when you stop trying to be perfect and start becoming reliable. Reliability is what makes goals feel real over time.",
    ],
    tags: ["consistency", "self-talk", "motivation"],
    estimatedReadTimeMinutes: 2,
  },
  {
    slug: "beginner-tips-start-simple-and-repeatable",
    title: "Beginner Tips: Start With the Simplest Plan You Can Repeat",
    category: "beginner-tips",
    shortSummary:
      "Beginners usually win faster with a simple repeatable structure than with complicated optimization.",
    fullContent: [
      "If you are new, you do not need an advanced split, a perfect meal plan, or a long supplement stack. You need a small number of clear actions you can repeat.",
      "A useful beginner setup is straightforward training, enough protein, steady hydration, and realistic recovery habits. That gives you a stable base before you worry about fine-tuning.",
      "The most important beginner skill is learning what sustainable effort feels like. Once that is in place, everything else becomes easier to improve.",
    ],
    tags: ["beginners", "habit building", "simplicity"],
    estimatedReadTimeMinutes: 2,
  },
  {
    slug: "supersets-explained-for-beginners",
    title: "Supersets Explained: What They Are and When to Use Them",
    category: "beginner-tips",
    shortSummary:
      "Supersets pair two exercises back to back to save time and keep lighter work moving without changing the whole workout.",
    fullContent: [
      "A superset means performing one exercise and then moving to another before taking the full rest break. In beginner-friendly programming, supersets usually show up with accessory work, lighter conditioning, or a short finisher instead of your heaviest lifts.",
      "People use supersets because they can make a workout feel smoother and more efficient. A well-built superset can save time, keep your heart rate slightly higher, and help you get useful extra work done without turning the whole session into chaos.",
      "A simple beginner example is pairing a push movement with a pull movement, or pairing two short core drills at the end of a workout. The key is that both movements should still be done with control. You are not racing through sloppy reps.",
      "Use supersets carefully when fatigue could make technique fall apart. Heavy barbell work, complex lifts, or anything that already feels technically demanding usually deserves its own full attention and a normal rest break.",
    ],
    tags: ["supersets", "beginner training", "time efficiency"],
    estimatedReadTimeMinutes: 3,
  },
];

export function getLearnArticle(slug: string) {
  return learnArticles.find((article) => article.slug === slug) ?? null;
}
