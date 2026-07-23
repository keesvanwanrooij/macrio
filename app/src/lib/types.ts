export type AllergenState = 'contains' | 'may_contain' | 'free' | 'unknown';

export type Portion = { name: string; grams: number };

export type DateFormat = 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY';

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  language: 'nl' | 'en';
  count_direction: 'up' | 'down';
  macro_display: 'overview' | 'focus';
  /** Display preference; default DD-MM-YYYY (migration 017). Optional until migration runs. */
  date_format?: DateFormat | null;
  goal_kcal: number | null;
  goal_carbs: number | null;
  goal_protein: number | null;
  goal_fat: number | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: 'male' | 'female' | 'other' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  weight_goal: 'lose' | 'maintain' | 'gain' | null;
  /** Legacy column from migration 019; unused by UI after unified % editor. */
  goal_macro_mode?: string | null;
  allergens: string[];
  onboarded: boolean;
  /** Set when soft-delete requested; purge after 30 days (migration 017). */
  deletion_requested_at?: string | null;
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
  visibility?: 'public' | 'private';
  product_created_by?: string | null;
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
  /**
   * Quick-add only: allergen key → contains | may_contain | free (unknown = omitted).
   * Product-linked rows leave this empty and use product_versions.allergens.
   */
  allergens?: Record<string, AllergenState> | null;
};

export type MacroTotals = { kcal: number; carbs: number; protein: number; fat: number };
