import { DietaryPreference } from "@/types/onboarding";
import { GroceryItem, GroceryList, MealPlan, MealPlanEntry } from "@/types/meal-plan";

const MEAL_PLANS: Record<DietaryPreference, MealPlanEntry[]> = {
  balanced: [
    {
      slot: "breakfast",
      title: "Scrambled eggs with oats and berries",
      description: "High-protein start with steady-release carbs.",
      ingredients: [
        { name: "Eggs", amount: "3 large", category: "protein" },
        { name: "Rolled oats", amount: "1/2 cup", category: "carbs" },
        { name: "Blueberries", amount: "1/2 cup", category: "carbs" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Cook oats first, scramble eggs in oil. ~500 cal · ~28g protein.",
    },
    {
      slot: "lunch",
      title: "Grilled chicken rice bowl",
      description: "Lean protein over brown rice with greens.",
      ingredients: [
        { name: "Chicken breast", amount: "5 oz", category: "protein" },
        { name: "Brown rice", amount: "3/4 cup cooked", category: "carbs" },
        { name: "Mixed greens", amount: "1 cup", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
      ],
      portionGuidance: "Season chicken simply, serve over rice and greens. ~550 cal · ~42g protein.",
    },
    {
      slot: "snack",
      title: "Greek yogurt with mixed nuts",
      description: "Protein-forward snack with healthy fats.",
      ingredients: [
        { name: "Greek yogurt", amount: "1 cup", category: "protein" },
        { name: "Mixed nuts", amount: "1/4 cup", category: "fats" },
      ],
      portionGuidance: "Plain or vanilla yogurt, unsalted nuts. ~250 cal · ~18g protein.",
    },
    {
      slot: "dinner",
      title: "Baked salmon with roasted broccoli and quinoa",
      description: "Omega-rich protein with a complete grain.",
      ingredients: [
        { name: "Salmon fillet", amount: "6 oz", category: "protein" },
        { name: "Quinoa", amount: "3/4 cup cooked", category: "carbs" },
        { name: "Broccoli", amount: "1 cup florets", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
        { name: "Garlic", amount: "2 cloves", category: "extras" },
      ],
      portionGuidance: "Roast broccoli and salmon at 400°F for 18–20 min. ~600 cal · ~45g protein.",
    },
  ],
  "high-protein": [
    {
      slot: "breakfast",
      title: "Protein oats with egg whites",
      description: "Double protein hit to anchor a high-demand day.",
      ingredients: [
        { name: "Rolled oats", amount: "1/2 cup", category: "carbs" },
        { name: "Egg whites", amount: "4 large", category: "protein" },
        { name: "Banana", amount: "1 medium", category: "carbs" },
        { name: "Protein powder", amount: "1 scoop", category: "protein" },
        { name: "Almond butter", amount: "1 tbsp", category: "fats" },
      ],
      portionGuidance: "Stir protein powder into cooked oats. Scramble egg whites separately. ~550 cal · ~45g protein.",
    },
    {
      slot: "lunch",
      title: "Turkey and cottage cheese bowl",
      description: "Dense protein from two low-fat sources.",
      ingredients: [
        { name: "Ground turkey", amount: "5 oz cooked", category: "protein" },
        { name: "Cottage cheese", amount: "1/2 cup", category: "protein" },
        { name: "Sweet potato", amount: "1 medium", category: "carbs" },
        { name: "Spinach", amount: "1 cup", category: "extras" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Bake sweet potato ahead, serve with seasoned turkey and cottage cheese on the side. ~600 cal · ~55g protein.",
    },
    {
      slot: "snack",
      title: "Cottage cheese with rice cakes",
      description: "Quick-grab protein with minimal prep.",
      ingredients: [
        { name: "Cottage cheese", amount: "3/4 cup", category: "protein" },
        { name: "Rice cakes", amount: "2 cakes", category: "carbs" },
      ],
      portionGuidance: "Spread or serve side by side. ~200 cal · ~20g protein.",
    },
    {
      slot: "dinner",
      title: "Lean beef stir-fry with vegetables",
      description: "High-protein dinner with a colorful vegetable base.",
      ingredients: [
        { name: "Lean ground beef", amount: "6 oz", category: "protein" },
        { name: "Bell peppers", amount: "1 cup sliced", category: "extras" },
        { name: "Broccoli", amount: "1 cup", category: "extras" },
        { name: "Low-sodium soy sauce", amount: "2 tbsp", category: "extras" },
        { name: "Brown rice", amount: "1/2 cup cooked", category: "carbs" },
        { name: "Sesame oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Stir-fry beef first, add vegetables last 3 min. Serve over rice. ~650 cal · ~50g protein.",
    },
  ],
  vegetarian: [
    {
      slot: "breakfast",
      title: "Veggie egg scramble with whole grain toast",
      description: "Egg-based protein with fiber-rich toast.",
      ingredients: [
        { name: "Eggs", amount: "3 large", category: "protein" },
        { name: "Whole grain bread", amount: "2 slices", category: "carbs" },
        { name: "Spinach", amount: "1 cup", category: "extras" },
        { name: "Cherry tomatoes", amount: "1/2 cup", category: "extras" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Scramble eggs with spinach and tomatoes. Serve with toast. ~480 cal · ~25g protein.",
    },
    {
      slot: "lunch",
      title: "Lentil and feta grain bowl",
      description: "Plant protein with a Mediterranean-style grain base.",
      ingredients: [
        { name: "Cooked lentils", amount: "3/4 cup", category: "protein" },
        { name: "Feta cheese", amount: "1 oz", category: "protein" },
        { name: "Quinoa", amount: "1/2 cup cooked", category: "carbs" },
        { name: "Cucumber", amount: "1/2 cup diced", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
        { name: "Lemon juice", amount: "1 tbsp", category: "extras" },
      ],
      portionGuidance: "Toss lentils and quinoa, top with feta and vegetables, dress with lemon oil. ~520 cal · ~28g protein.",
    },
    {
      slot: "snack",
      title: "Hummus with veggie sticks",
      description: "Chickpea-based protein with fresh crunch.",
      ingredients: [
        { name: "Hummus", amount: "1/3 cup", category: "protein" },
        { name: "Carrot sticks", amount: "1 cup", category: "extras" },
        { name: "Celery", amount: "1/2 cup", category: "extras" },
      ],
      portionGuidance: "Serve with a variety of cut vegetables. ~200 cal · ~7g protein.",
    },
    {
      slot: "dinner",
      title: "Paneer tikka with rice and raita",
      description: "High-protein paneer with warming spices.",
      ingredients: [
        { name: "Paneer", amount: "5 oz", category: "protein" },
        { name: "Basmati rice", amount: "3/4 cup cooked", category: "carbs" },
        { name: "Greek yogurt", amount: "1/4 cup", category: "protein" },
        { name: "Bell peppers", amount: "1 cup", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
        { name: "Tikka spice blend", amount: "1 tsp", category: "extras" },
      ],
      portionGuidance: "Marinate paneer in yogurt and spices, bake or pan-fry with peppers. Serve with rice and yogurt raita. ~580 cal · ~32g protein.",
    },
  ],
  vegan: [
    {
      slot: "breakfast",
      title: "Tofu scramble with whole grain toast",
      description: "Plant protein cooked like scrambled eggs.",
      ingredients: [
        { name: "Firm tofu", amount: "5 oz", category: "protein" },
        { name: "Whole grain bread", amount: "2 slices", category: "carbs" },
        { name: "Spinach", amount: "1 cup", category: "extras" },
        { name: "Turmeric", amount: "1/4 tsp", category: "extras" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Crumble tofu, season with turmeric and salt, sauté with spinach. ~450 cal · ~22g protein.",
    },
    {
      slot: "lunch",
      title: "Black bean and brown rice burrito bowl",
      description: "Fiber-dense, protein-complete bowl.",
      ingredients: [
        { name: "Black beans", amount: "3/4 cup cooked", category: "protein" },
        { name: "Brown rice", amount: "3/4 cup cooked", category: "carbs" },
        { name: "Avocado", amount: "1/2 medium", category: "fats" },
        { name: "Salsa", amount: "3 tbsp", category: "extras" },
        { name: "Romaine lettuce", amount: "1 cup", category: "extras" },
      ],
      portionGuidance: "Layer rice, beans, greens, avocado. Finish with salsa. ~550 cal · ~20g protein.",
    },
    {
      slot: "snack",
      title: "Edamame with sunflower seeds",
      description: "Complete amino acid profile from plant sources.",
      ingredients: [
        { name: "Shelled edamame", amount: "1/2 cup", category: "protein" },
        { name: "Sunflower seeds", amount: "2 tbsp", category: "fats" },
      ],
      portionGuidance: "Serve lightly salted. ~200 cal · ~12g protein.",
    },
    {
      slot: "dinner",
      title: "Tempeh stir-fry with buckwheat noodles",
      description: "Fermented plant protein with a satisfying noodle base.",
      ingredients: [
        { name: "Tempeh", amount: "5 oz", category: "protein" },
        { name: "Buckwheat noodles", amount: "2 oz dry", category: "carbs" },
        { name: "Bok choy", amount: "1 cup", category: "extras" },
        { name: "Tamari", amount: "2 tbsp", category: "extras" },
        { name: "Sesame oil", amount: "1 tbsp", category: "fats" },
        { name: "Ginger", amount: "1 tsp grated", category: "extras" },
      ],
      portionGuidance: "Cube and pan-fry tempeh until golden, add vegetables and sauce, serve over noodles. ~600 cal · ~32g protein.",
    },
  ],
  pescatarian: [
    {
      slot: "breakfast",
      title: "Greek yogurt with granola and banana",
      description: "Protein-rich yogurt with easy energy carbs.",
      ingredients: [
        { name: "Greek yogurt", amount: "1 cup", category: "protein" },
        { name: "Low-sugar granola", amount: "1/4 cup", category: "carbs" },
        { name: "Banana", amount: "1 medium", category: "carbs" },
        { name: "Chia seeds", amount: "1 tbsp", category: "fats" },
      ],
      portionGuidance: "Layer granola on yogurt, top with sliced banana. ~480 cal · ~22g protein.",
    },
    {
      slot: "lunch",
      title: "Tuna and white bean salad",
      description: "Omega-3 and fiber-rich quick-prep lunch.",
      ingredients: [
        { name: "Canned tuna", amount: "5 oz drained", category: "protein" },
        { name: "White beans", amount: "1/2 cup", category: "protein" },
        { name: "Mixed greens", amount: "2 cups", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
        { name: "Red onion", amount: "2 tbsp diced", category: "extras" },
        { name: "Whole grain crackers", amount: "6 crackers", category: "carbs" },
      ],
      portionGuidance: "Mix tuna and beans over greens, dress with oil and lemon. Serve with crackers. ~520 cal · ~40g protein.",
    },
    {
      slot: "snack",
      title: "Smoked salmon on cucumber rounds",
      description: "Elegant omega-3 snack with minimal prep.",
      ingredients: [
        { name: "Smoked salmon", amount: "2 oz", category: "protein" },
        { name: "Cucumber", amount: "1 medium", category: "extras" },
        { name: "Cream cheese", amount: "2 tbsp", category: "fats" },
      ],
      portionGuidance: "Slice cucumber into rounds, top with cream cheese and salmon. ~180 cal · ~14g protein.",
    },
    {
      slot: "dinner",
      title: "Baked cod with sweet potato and asparagus",
      description: "Lean white fish with nutrient-dense sides.",
      ingredients: [
        { name: "Cod fillet", amount: "6 oz", category: "protein" },
        { name: "Sweet potato", amount: "1 medium", category: "carbs" },
        { name: "Asparagus", amount: "1 cup", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
        { name: "Lemon", amount: "1/2 lemon", category: "extras" },
      ],
      portionGuidance: "Bake all at 400°F for 20–25 min. Season with oil, lemon, salt. ~560 cal · ~42g protein.",
    },
  ],
  keto: [
    {
      slot: "breakfast",
      title: "Bacon and egg avocado bowl",
      description: "Fat-forward keto start with high satiety.",
      ingredients: [
        { name: "Eggs", amount: "3 large", category: "protein" },
        { name: "Avocado", amount: "1/2 medium", category: "fats" },
        { name: "Bacon", amount: "2 strips", category: "protein" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Fry eggs and bacon, halve avocado, serve together. ~520 cal · ~25g protein · ~40g fat.",
    },
    {
      slot: "lunch",
      title: "Grilled chicken thighs with sautéed kale",
      description: "Dark meat with fat-soluble nutrients from leafy greens.",
      ingredients: [
        { name: "Chicken thighs", amount: "6 oz", category: "protein" },
        { name: "Kale", amount: "2 cups", category: "extras" },
        { name: "Avocado oil", amount: "1 tbsp", category: "fats" },
        { name: "Garlic", amount: "2 cloves", category: "extras" },
        { name: "Parmesan", amount: "1 oz", category: "protein" },
      ],
      portionGuidance: "Sear thighs skin-side down 6 min, finish in oven at 400°F. Sauté kale in garlic and oil. ~580 cal · ~45g protein · ~38g fat.",
    },
    {
      slot: "snack",
      title: "Cheese and macadamia nuts",
      description: "Dense fat and moderate protein with zero net carbs.",
      ingredients: [
        { name: "Cheddar cheese", amount: "1.5 oz", category: "protein" },
        { name: "Macadamia nuts", amount: "1/4 cup", category: "fats" },
      ],
      portionGuidance: "Pair together for a quick no-prep snack. ~280 cal · ~9g protein · ~24g fat.",
    },
    {
      slot: "dinner",
      title: "Salmon with creamy cauliflower mash",
      description: "Omega-3 fish over low-carb mash with butter.",
      ingredients: [
        { name: "Salmon fillet", amount: "6 oz", category: "protein" },
        { name: "Cauliflower", amount: "2 cups", category: "extras" },
        { name: "Butter", amount: "2 tbsp", category: "fats" },
        { name: "Heavy cream", amount: "2 tbsp", category: "fats" },
        { name: "Garlic", amount: "2 cloves", category: "extras" },
      ],
      portionGuidance: "Steam cauliflower, blend with butter and cream. Pan-sear salmon 3–4 min per side. ~620 cal · ~44g protein · ~44g fat.",
    },
  ],
  "low-carb": [
    {
      slot: "breakfast",
      title: "Egg muffins with turkey and vegetables",
      description: "Low-carb egg cups ready in 20 minutes.",
      ingredients: [
        { name: "Eggs", amount: "4 large", category: "protein" },
        { name: "Deli turkey", amount: "2 oz", category: "protein" },
        { name: "Bell peppers", amount: "1/2 cup diced", category: "extras" },
        { name: "Cheddar cheese", amount: "1 oz shredded", category: "protein" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Whisk eggs, pour into greased muffin tin with fillings, bake at 350°F for 18–20 min. ~420 cal · ~35g protein.",
    },
    {
      slot: "lunch",
      title: "Turkey lettuce wrap bowl",
      description: "Light and filling without the bread.",
      ingredients: [
        { name: "Ground turkey", amount: "5 oz", category: "protein" },
        { name: "Butter lettuce", amount: "3 large leaves", category: "extras" },
        { name: "Avocado", amount: "1/2 medium", category: "fats" },
        { name: "Salsa", amount: "2 tbsp", category: "extras" },
        { name: "Olive oil", amount: "1 tsp", category: "fats" },
      ],
      portionGuidance: "Season and brown turkey, serve in lettuce cups with avocado and salsa. ~480 cal · ~38g protein.",
    },
    {
      slot: "snack",
      title: "Hard-boiled eggs with almond butter",
      description: "Fast, portable, protein-fat balanced snack.",
      ingredients: [
        { name: "Hard-boiled eggs", amount: "2 large", category: "protein" },
        { name: "Almond butter", amount: "1 tbsp", category: "fats" },
      ],
      portionGuidance: "Boil eggs ahead of time, pair with almond butter. ~220 cal · ~14g protein.",
    },
    {
      slot: "dinner",
      title: "Baked chicken breast with zucchini noodles",
      description: "Clean protein with a satisfying pasta-style base.",
      ingredients: [
        { name: "Chicken breast", amount: "6 oz", category: "protein" },
        { name: "Zucchini", amount: "2 medium", category: "extras" },
        { name: "Marinara sauce", amount: "1/3 cup", category: "extras" },
        { name: "Olive oil", amount: "1 tbsp", category: "fats" },
        { name: "Parmesan", amount: "1 oz", category: "protein" },
      ],
      portionGuidance: "Bake chicken at 400°F for 20–22 min. Spiralize zucchini, sauté in olive oil, top with marinara and parmesan. ~520 cal · ~48g protein.",
    },
  ],
};

function buildGroceryList(meals: MealPlanEntry[]): GroceryList {
  const seen = new Map<string, GroceryItem>();

  for (const meal of meals) {
    for (const ingredient of meal.ingredients) {
      const key = ingredient.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          name: ingredient.name,
          amount: ingredient.amount,
          category: ingredient.category,
        });
      }
    }
  }

  const items = [...seen.values()];

  return {
    protein: items.filter((item) => item.category === "protein"),
    carbs: items.filter((item) => item.category === "carbs"),
    fats: items.filter((item) => item.category === "fats"),
    extras: items.filter((item) => item.category === "extras"),
  };
}

export function generateMealPlan(dietaryPreference: DietaryPreference): MealPlan {
  const meals = MEAL_PLANS[dietaryPreference];
  return { meals, groceryList: buildGroceryList(meals) };
}
