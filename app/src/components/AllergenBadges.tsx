/*
 * SECTION: Allergen chips, search badges, portion warning
 * WHAT: Shared red/green/grey allergen UI with state-aware labels.
 * HOW: allergenChipLabel always uses the full state phrase; Text may shrink
 *      to 70% via adjustsFontSizeToFit when space is tight.
 * INPUT: allergen map + user allergen keys (or single key/state for a chip)
 * OUTPUT: colored pills / warning banner
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { allergenChipLabel, allergenFullStateLabel } from '../lib/allergens';
import { colors, radius, spacing } from '../lib/theme';
import type { AllergenState } from '../lib/types';

export function stateColor(state: AllergenState): { bg: string; fg: string } {
  switch (state) {
    case 'contains': return { bg: colors.dangerSoft, fg: colors.danger };
    case 'free': return { bg: colors.primarySoft, fg: colors.primaryDark };
    default: return { bg: '#F1F5F9', fg: colors.faint };
  }
}

type ChipSize = 'compact' | 'default';

/**
 * One allergen pill. Always shows full state wording (bevat / -vrij / onbekend);
 * font can shrink to 0.7 so long labels still fit on one line.
 */
export function AllergenStateChip({
  allergenKey,
  state,
  onPress,
  size = 'default',
  style,
}: {
  allergenKey: string;
  state: AllergenState;
  onPress?: () => void;
  size?: ChipSize;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const c = stateColor(state);
  const label = allergenChipLabel(t, allergenKey, state);
  const fontSize = size === 'compact' ? 11 : 13;
  const body = (
    <View style={[size === 'compact' ? styles.compactChip : styles.chip, { backgroundColor: c.bg }, style]}>
      <Text
        style={{ color: c.fg, fontWeight: size === 'compact' ? '700' : '600', fontSize }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

/** Search / product-row badges for the user’s selected allergens only. */
export function AllergenBadges({
  allergens,
  userAllergens,
}: {
  allergens: Record<string, AllergenState>;
  userAllergens: string[];
}) {
  if (userAllergens.length === 0) return null;
  return (
    <View style={styles.row}>
      {userAllergens.map((key) => (
        <AllergenStateChip
          key={key}
          allergenKey={key}
          state={allergens?.[key] ?? 'unknown'}
          size="compact"
        />
      ))}
    </View>
  );
}

export function AllergenWarning({
  allergens,
  userAllergens,
}: {
  allergens: Record<string, AllergenState>;
  userAllergens: string[];
}) {
  const { t } = useTranslation();
  const hits = userAllergens.filter((k) => allergens?.[k] === 'contains');
  if (hits.length === 0) return null;
  // Full “Contains X” phrases; warning template is just {{list}}
  const list = hits.map((k) => allergenFullStateLabel(t, k, 'contains')).join(', ');
  return (
    <View style={styles.warning}>
      <Text style={styles.warningText}>⚠ {t('allergens.warning', { list })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  compactChip: {
    borderRadius: radius.s,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  warning: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.m,
    padding: spacing.m,
    marginVertical: spacing.s,
  },
  warningText: { color: colors.danger, fontWeight: '700' },
});
