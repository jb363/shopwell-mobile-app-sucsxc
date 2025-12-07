
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  healthScore: number;
  ingredients: string[];
  nutritionFacts: NutritionFacts;
  isHealthy: boolean;
}

export interface NutritionFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  checked: boolean;
}

export interface ScanResult {
  product: Product;
  recommendations: Product[];
  healthAnalysis: string;
}
