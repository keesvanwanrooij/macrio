/*
 * SECTION: Macro progress bar
 * WHAT: Track for consumed vs goal; optional shared trackMax for comparable meal bars.
 * HOW: Track width = trackMax ?? max(goal, consumed).
 *      Fill = consumed / track. Optional goal marker line; over color from prop or auto.
 * INPUT: consumed, goal, optional trackMax / highlight / overTone / showMarker / over
 * OUTPUT: Bar with optional goal marker
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../lib/theme';

export function ProgressBar({
  consumed,
  goal,
  trackMax,
  highlight,
  overTone = 'strong',
  showMarker = true,
  over: overOverride,
}: {
  consumed: number;
  goal: number;
  /**
   * Shared ceiling for a group of bars (e.g. all meals that day).
   * Defaults to max(goal, consumed) so a single bar still expands when over.
   */
  trackMax?: number;
  highlight?: boolean;
  /** strong = day total danger; soft = coral for meal over. */
  overTone?: 'strong' | 'soft';
  /** Goal marker line (day total / diary). Off for report meal rows. */
  showMarker?: boolean;
  /** Override over color (e.g. meal red only when day is over). */
  over?: boolean;
}) {
  const safeConsumed = Math.max(0, consumed);
  const safeGoal = Math.max(0, goal);
  const scale = Math.max(trackMax ?? 0, safeGoal, safeConsumed);

  // Empty grey track (no goal and nothing eaten)
  if (scale <= 0) {
    return <View style={styles.barTrack} />;
  }

  const autoOver = safeGoal > 0 && safeConsumed > safeGoal;
  const over = overOverride ?? autoOver;
  const overColor = overTone === 'soft' ? colors.dangerMuted : colors.danger;
  const underColor = highlight ? colors.primary : colors.primaryDark;
  const widthPct = Math.max(0, Math.min(safeConsumed / scale, 1)) * 100;
  const markerPct =
    showMarker && safeGoal > 0 && safeGoal < scale - 1e-9
      ? Math.max(0, Math.min((safeGoal / scale) * 100, 100))
      : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${widthPct}%`,
              backgroundColor: over ? overColor : underColor,
            },
          ]}
        />
      </View>
      {markerPct != null ? (
        <View style={[styles.marker, { left: `${markerPct}%` }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  /** Vertical goal marker across the bar. */
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.text,
    opacity: 0.75,
    zIndex: 2,
  },
});
