/*
 * SECTION: Allergen chips, search badges, portion warning
 * WHAT: Shared grey/red/orange/green allergen UI with short or full labels.
 * HOW: Interactive chips use short names + color; read-only (diary, search,
 *      product overview, portion warning) use full state phrases. Warning shows
 *      contains (red) and may_contain (orange) banners when relevant.
 * INPUT: allergen map + user allergen keys (or single key/state for a chip)
 * OUTPUT: colored pills / warning banner(s)
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { allergenChipLabel, allergenFullStateLabel } from '../lib/allergens';
import { colors, radius, spacing } from '../lib/theme';
import type { AllergenState } from '../lib/types';

export function stateColor(state: AllergenState): { bg: string; fg: string } {
  switch (state) {
    case 'contains':
      return { bg: colors.dangerSoft, fg: colors.danger };
    case 'may_contain':
      return { bg: colors.warnSoft, fg: colors.warn };
    case 'free':
      return { bg: colors.primarySoft, fg: colors.primaryDark };
    default:
      return { bg: '#F1F5F9', fg: colors.faint };
  }
}

type ChipSize = 'compact' | 'default';
type LabelMode = 'full' | 'short';

/**
 * One allergen pill.
 * labelMode full = Bevat X / Kan X bevatten / … (diary, search, product, warning).
 * labelMode short = short name only (interactive create / quick-add); color carries state.
 */
export function AllergenStateChip({
  allergenKey,
  state,
  onPress,
  size = 'default',
  labelMode = 'full',
  style,
}: {
  allergenKey: string;
  state: AllergenState;
  onPress?: () => void;
  size?: ChipSize;
  labelMode?: LabelMode;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const c = stateColor(state);
  const label = allergenChipLabel(t, allergenKey, state, labelMode);
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
  const containsHits = userAllergens.filter((k) => allergens?.[k] === 'contains');
  const mayHits = userAllergens.filter((k) => allergens?.[k] === 'may_contain');
  if (containsHits.length === 0 && mayHits.length === 0) return null;

  const containsList = containsHits.map((k) => allergenFullStateLabel(t, k, 'contains')).join(', ');
  const mayList = mayHits.map((k) => allergenFullStateLabel(t, k, 'may_contain')).join(', ');

  return (
    <View>
      {containsHits.length > 0 ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>⚠ {t('allergens.warning', { list: containsList })}</Text>
        </View>
      ) : null}
      {mayHits.length > 0 ? (
        <View style={styles.warningMay}>
          <Text style={styles.warningMayText}>⚠ {t('allergens.warningMayContain', { list: mayList })}</Text>
        </View>
      ) : null}
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
  warningMay: {
    backgroundColor: colors.warnSoft,
    borderRadius: radius.m,
    padding: spacing.m,
    marginVertical: spacing.s,
  },
  warningMayText: { color: colors.warn, fontWeight: '700' },
});
