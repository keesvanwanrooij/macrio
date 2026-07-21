export type AllergenState = 'contains' | 'free' | 'unknown';

export type Portion = { name: string; grams: number };

export type Profile = {
  id: string;
  display_name: string | null;
  language: 'nl' | 'en';
  count_direction: 'up' | 'down';
  macro_display: 'overview' | 'focus';
  goal_kcal: number | null;
  goal_carbs: number | null;
  goal_protein: number | null;
  goal_fat: number | null;
  allergens: string[];
  onboarded: boolean;
};

export type ProductVersion = {
  id: string;
  product_id: string;
  version_number: number;
  name_nl: string | null;
  name_en: string | null;
  brand: string | null;
  photo_url: string | null;
  kcal_100g: number;
  carbs_100g: number;
  protein_100g: number;
  fat_100g: number;
  allergens: Record<string, AllergenState>;
  portions: Portion[];
  like_count: number;
  created_at: string;
  // present on current_product_versions view rows
  barcode?: string | null;
  source?: string;
  is_generic?: boolean;
};

export type DiaryEntry = {
  id: string;
  user_id: string;
  date: string;
  meal_slot: number;
  product_version_id: string | null;
  custom_name: string | null;
  grams: number | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  logged_at: string;
};

export type MacroTotals = { kcal: number; carbs: number; protein: number; fat: number };
