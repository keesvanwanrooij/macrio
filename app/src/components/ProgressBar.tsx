/*
 * SECTION: Macro progress bar
 * WHAT: Thin filled track showing consumed / goal.
 * HOW: Clamp fill to 100%; overage changes color by tone (strong vs soft).
 * INPUT: ratio, optional highlight, overTone ('strong' | 'soft', default strong)
 * OUTPUT: Track + fill View
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../lib/theme';

export function ProgressBar({
  ratio,
  highlight,
  overTone = 'strong',
}: {
  ratio: number;
  highlight?: boolean;
  /** strong = day total danger; soft = coral for meal over (less intimidating). */
  overTone?: 'strong' | 'soft';
}) {
  const over = ratio > 1;
  const widthPct = Math.max(0, Math.min(ratio, 1)) * 100;
  const overColor = overTone === 'soft' ? colors.dangerMuted : colors.danger;
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: `${widthPct}%`,
            backgroundColor: over ? overColor : highlight ? colors.primary : colors.primaryDark,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
});
