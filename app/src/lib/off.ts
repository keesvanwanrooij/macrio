// Live Open Food Facts lookup: when a scanned barcode is not in our database,
// we fetch it from OFF and import it (ADR-003).
import { OFF_TAG_MAP } from './allergens';
import type { AllergenState, Portion } from './types';

export type OffProduct = {
  name: string | null;
  brand: string | null;
  photoUrl: string | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  allergens: Record<string, AllergenState>;
  portions: Portion[];
};

export async function fetchFromOpenFoodFacts(barcode: string): Promise<OffProduct | null> {
  const fields =
    'product_name,product_name_nl,product_name_en,brands,image_front_url,nutriments,allergens_tags,serving_quantity,serving_size';
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`,
    { headers: { 'User-Agent': 'Macrio/1.0 (open source; github.com/keesvanwanrooij/macrio)' } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const n = p.nutriments ?? {};
  const kcal = Number(n['energy-kcal_100g']);
  // Without kcal per 100g the entry is useless for tracking.
  if (!kcal || isNaN(kcal)) return null;

  const allergens: Record<string, AllergenState> = {};
  for (const tag of p.allergens_tags ?? []) {
    const key = OFF_TAG_MAP[tag];
    if (key) allergens[key] = 'contains';
  }

  const portions: Portion[] = [];
  const servingGrams = Number(p.serving_quantity);
  if (servingGrams > 0) {
    portions.push({ name: p.serving_size || '1 portie', grams: servingGrams });
  }

  return {
    name: p.product_name_nl || p.product_name || p.product_name_en || null,
    brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
    photoUrl: p.image_front_url ?? null,
    kcal,
    carbs: Number(n.carbohydrates_100g) || 0,
    protein: Number(n.proteins_100g) || 0,
    fat: Number(n.fat_100g) || 0,
    allergens,
    portions,
  };
}
