/*
 * SECTION: GDPR data export (JSON + diary CSV)
 * WHAT: Fetch export_my_data RPC, write files, open the system share sheet.
 * HOW: 1) RPC JSON 2) build diary CSV 3) write cache files 4) Share.shareAsync
 * INPUT: authenticated session (RLS / security definer RPC)
 * OUTPUT: shared files on device (not email-only)
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { supabase } from './supabase';

export type ExportBundle = {
  exported_at: string;
  profile: Record<string, unknown> | null;
  diary_entries: Record<string, unknown>[];
  goal_revisions: Record<string, unknown>[];
  feedback: Record<string, unknown>[];
};

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Spreadsheet-friendly diary CSV from export JSON rows. */
export function diaryEntriesToCsv(entries: Record<string, unknown>[]): string {
  const headers = [
    'id',
    'date',
    'meal_slot',
    'product_version_id',
    'custom_name',
    'grams',
    'kcal',
    'carbs',
    'protein',
    'fat',
    'allergens',
    'logged_at',
  ];
  const lines = [headers.join(',')];
  for (const row of entries) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function fetchMyDataExport(): Promise<
  { data: ExportBundle; error: null } | { data: null; error: string }
> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) return { data: null, error: error.message };
  if (!data || typeof data !== 'object') {
    return { data: null, error: 'export_empty' };
  }
  const bundle = data as ExportBundle;
  return {
    data: {
      exported_at: bundle.exported_at,
      profile: bundle.profile ?? null,
      diary_entries: Array.isArray(bundle.diary_entries) ? bundle.diary_entries : [],
      goal_revisions: Array.isArray(bundle.goal_revisions) ? bundle.goal_revisions : [],
      feedback: Array.isArray(bundle.feedback) ? bundle.feedback : [],
    },
    error: null,
  };
}

/*
 * SECTION: Share export files
 * WHAT: Writes JSON + CSV into the cache dir and opens the share UI twice (or once if sharing unavailable).
 * INPUT: ExportBundle
 * OUTPUT: void; throws/returns error string on failure
 */
export async function shareDataExport(
  bundle: ExportBundle
): Promise<{ error: string | null }> {
  const base = FileSystem.cacheDirectory;
  if (!base) return { error: 'no_cache_dir' };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = `${base}macrio-export-${stamp}.json`;
  const csvPath = `${base}macrio-diary-${stamp}.csv`;

  const jsonBody = JSON.stringify(bundle, null, 2);
  const csvBody = diaryEntriesToCsv(bundle.diary_entries);

  await FileSystem.writeAsStringAsync(jsonPath, jsonBody, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await FileSystem.writeAsStringAsync(csvPath, csvBody, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return { error: 'sharing_unavailable' };
  }

  // Share JSON first, then diary CSV (two clear files for the user).
  await Sharing.shareAsync(jsonPath, {
    mimeType: 'application/json',
    dialogTitle: 'Macrio export (JSON)',
  });
  await Sharing.shareAsync(csvPath, {
    mimeType: 'text/csv',
    dialogTitle: 'Macrio diary (CSV)',
  });

  return { error: null };
}
