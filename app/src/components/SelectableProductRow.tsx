/*
 * SECTION: Selectable product row (search / recents)
 * WHAT: Checkbox toggles multi-select; tapping the name opens portion detail.
 * HOW: Left checkbox Pressable; right/main Pressable for onOpenDetail.
 * INPUT: product version, selected flag, user allergens, callbacks
 * OUTPUT: Row UI
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AllergenBadges } from './AllergenBadges';
import { fmt, versionName } from '../lib/nutrition';
import { colors, radius, spacing } from '../lib/theme';
import type { ProductVersion } from '../lib/types';

export function SelectableProductRow({
  item,
  selected,
  userAllergens,
  onToggle,
  onOpenDetail,
}: {
  item: ProductVersion;
  selected: boolean;
  userAllergens: string[];
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={styles.checkHit}
      >
        <View style={[styles.box, selected && styles.boxOn]}>
          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable style={styles.body} onPress={onOpenDetail}>
        <Text style={styles.name} numberOfLines={1}>
          {versionName(item, i18n.language)}
          {item.brand ? <Text style={styles.brand}> · {item.brand}</Text> : null}
        </Text>
        <Text style={styles.meta}>
          {fmt(item.kcal_100g)} {t('common.kcal')} / 100 g
        </Text>
        <AllergenBadges allergens={item.allergens} userAllergens={userAllergens} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  checkHit: { paddingRight: spacing.m, justifyContent: 'center' },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.s,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  boxOn: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primarySoft,
  },
  checkMark: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, lineHeight: 16 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  brand: { fontWeight: '400', color: colors.muted },
  meta: { fontSize: 12, color: colors.faint, marginTop: 1 },
});
