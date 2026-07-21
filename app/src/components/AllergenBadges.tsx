// Compact allergen badges for the user's own allergens on product rows,
// and the warning banner used on portion/product screens.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '../lib/theme';
import type { AllergenState } from '../lib/types';

export function stateColor(state: AllergenState): { bg: string; fg: string } {
  switch (state) {
    case 'contains': return { bg: colors.dangerSoft, fg: colors.danger };
    case 'free': return { bg: colors.primarySoft, fg: colors.primaryDark };
    default: return { bg: '#F1F5F9', fg: colors.faint };
  }
}

export function AllergenBadges({
  allergens,
  userAllergens,
}: {
  allergens: Record<string, AllergenState>;
  userAllergens: string[];
}) {
  const { t } = useTranslation();
  if (userAllergens.length === 0) return null;
  return (
    <View style={styles.row}>
      {userAllergens.map((key) => {
        const state: AllergenState = allergens?.[key] ?? 'unknown';
        const c = stateColor(state);
        return (
          <View key={key} style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={[styles.badgeText, { color: c.fg }]}>
              {t(`allergens.${key}`)} · {t(`allergens.${state}`)}
            </Text>
          </View>
        );
      })}
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
  return (
    <View style={styles.warning}>
      <Text style={styles.warningText}>
        ⚠ {t('allergens.warning', { list: hits.map((k) => t(`allergens.${k}`)).join(', ') })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: {
    borderRadius: radius.s,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  warning: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.m,
    padding: spacing.m,
    marginVertical: spacing.s,
  },
  warningText: { color: colors.danger, fontWeight: '700' },
});
