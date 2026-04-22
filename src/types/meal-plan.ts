export type GroceryCategory = "protein" | "carbs" | "fats" | "extras";

export interface MealPlanIngredient {
  name: string;
  amount: string;
  category: GroceryCategory;
}

export interface MealPlanEntry {
  slot: "breakfast" | "lunch" | "snack" | "dinner";
  title: string;
  description: string;
  ingredients: MealPlanIngredient[];
  portionGuidance: string;
}

export interface GroceryItem {
  name: string;
  amount: string;
  category: GroceryCategory;
}

export interface GroceryList {
  protein: GroceryItem[];
  carbs: GroceryItem[];
  fats: GroceryItem[];
  extras: GroceryItem[];
}

export interface MealPlan {
  meals: MealPlanEntry[];
  groceryList: GroceryList;
}
