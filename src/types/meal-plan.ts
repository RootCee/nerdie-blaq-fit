export type GroceryCategory = "protein" | "carbs" | "fats" | "extras";
export type MealSubstitutionType = "same-protein-swap" | "carb-swap" | "lighter-option" | "budget-option";

export interface MealPlanIngredient {
  name: string;
  amount: string;
  category: GroceryCategory;
}

export interface MealSubstitution {
  type: MealSubstitutionType;
  title: string;
  detail: string;
}

export interface MealPlanEntry {
  slot: "breakfast" | "lunch" | "snack" | "dinner";
  title: string;
  description: string;
  ingredients: MealPlanIngredient[];
  portionGuidance: string;
  estimatedCalories: number;
  substitutions?: MealSubstitution[];
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
