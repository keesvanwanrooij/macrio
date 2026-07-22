/*
 * SECTION: Last logged grams per product version
 * WHAT: For multi-add, prefer the grams the user last logged for that version.
 * HOW: Query own diary_entries newest-first; first hit per version_id wins.
 * INPUT: product_version ids
 * OUTPUT: Map versionId → grams (missing → caller uses 100 g)
 */
import { supabase } from './supabase';

export async function lastGramsByVersionIds(
  versionIds: readonly string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (versionIds.length === 0) return map;

  const { data } = await supabase
    .from('diary_entries')
    .select('product_version_id, grams, logged_at')
    .in('product_version_id', [...versionIds])
    .not('grams', 'is', null)
    .order('logged_at', { ascending: false });

  for (const row of data ?? []) {
    const id = row.product_version_id as string | null;
    if (!id || map.has(id)) continue;
    const g = Number(row.grams);
    if (g > 0) map.set(id, g);
  }
  return map;
}

/** Default when this version was never logged with grams. */
export const FALLBACK_LOG_GRAMS = 100;
