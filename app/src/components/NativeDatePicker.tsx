/*
 * SECTION: Shared native date picker
 * WHAT: Tap a label → platform date picker (Android dialog / iOS spinner).
 * HOW: Pressable shows formatted date; opens @react-native-community/datetimepicker.
 *      While open, uses an internal draft so parent re-renders (countdown, soft field
 *      messages) cannot reset the spinner via new min/max Date identities or value sync.
 * INPUT: value ISO YYYY-MM-DD; onChange; optional max/min; dateFormat for label
 * OUTPUT: onChange(iso) when user confirms a day
 *
 * Keep stock native look (no brand theming plugin).
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  clampToToday,
  formatDateDisplay,
  isoToDate,
  toDateString,
  todayIso,
  type DateFormat,
} from '../lib/dates';
import { colors, radius, spacing } from '../lib/theme';
import { Button } from './ui';

type Props = {
  /** ISO YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  /** Profile date format preference for the closed label. */
  dateFormat?: DateFormat;
  /** Optional label above the pressable (e.g. DOB). */
  label?: string;
  /** Max selectable day (default: today). Pass null to allow future. */
  maximumDate?: Date | null;
  minimumDate?: Date;
  /** Override the closed-state display text (e.g. "Today"). */
  displayText?: string;
  disabled?: boolean;
  /** field = bordered input; plain = diary/reports nav label. */
  variant?: 'field' | 'plain';
};

/** Stable Date identity when the calendar day is unchanged (avoids spinner reset on re-render). */
function useStableDate(input: Date | null | undefined): Date | undefined {
  const ref = useRef<Date | undefined>(undefined);
  if (input == null) {
    ref.current = undefined;
    return undefined;
  }
  const t = input.getTime();
  if (ref.current == null || ref.current.getTime() !== t) {
    ref.current = new Date(t);
  }
  return ref.current;
}

export function NativeDatePicker({
  value,
  onChange,
  dateFormat = 'DD-MM-YYYY',
  label,
  maximumDate,
  minimumDate,
  displayText,
  disabled,
  variant = 'field',
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Draft while the picker is open (iOS spinner / Android set). Parent value must not
  // overwrite this mid-scroll when Settings re-renders (save countdown, soft messages).
  const [draft, setDraft] = useState<Date>(() => isoToDate(value));

  const maxRaw =
    maximumDate === null ? undefined : maximumDate ?? isoToDate(todayIso());
  const max = useStableDate(maxRaw);
  const min = useStableDate(minimumDate);

  const parsed = useMemo(() => isoToDate(value), [value]);
  const closedLabel = displayText ?? formatDateDisplay(value, dateFormat);

  // Sync closed value → draft only when the sheet is closed
  useEffect(() => {
    if (open) return;
    setDraft(parsed);
  }, [parsed, open]);

  function apply(iso: string) {
    if (maximumDate === null) {
      onChange(iso);
      return;
    }
    const maxIso = toDateString(max ?? isoToDate(todayIso()));
    onChange(clampToToday(iso, maxIso));
  }

  function onAndroidChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    // Commit only on explicit set (ignore any intermediate noise)
    if (event.type === 'set' && date) {
      setOpen(false);
      apply(toDateString(date));
    }
  }

  function openPicker() {
    if (disabled) return;
    setDraft(parsed);
    setOpen(true);
  }

  return (
    <View style={variant === 'plain' ? styles.wrapPlain : styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={({ pressed }) => [
          variant === 'plain' ? styles.plain : styles.field,
          pressed && !disabled && { opacity: 0.75 },
          disabled && { opacity: 0.5 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label ?? closedLabel}
      >
        <Text style={variant === 'plain' ? styles.plainText : styles.fieldText}>{closedLabel}</Text>
      </Pressable>

      {/* Android + web: one-shot dialog */}
      {open && Platform.OS !== 'ios' ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          maximumDate={max}
          minimumDate={min}
        />
      ) : null}

      {/* Keep Modal mounted while open; draft value so parent re-renders do not reset the wheel */}
      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="slide"
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.iosBackdrop} onPress={() => setOpen(false)} />
          <View style={styles.iosSheet}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={(_e, date) => {
                if (date) setDraft(date);
              }}
              maximumDate={max}
              minimumDate={min}
              style={{ alignSelf: 'stretch' }}
            />
            <View style={styles.iosActions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={() => setOpen(false)} />
              <View style={{ width: spacing.s }} />
              <Button
                title={t('common.done')}
                onPress={() => {
                  apply(toDateString(draft));
                  setOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.m },
  wrapPlain: { marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: spacing.xs },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  fieldText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  plain: { paddingHorizontal: spacing.s, paddingVertical: spacing.xs },
  plainText: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  iosBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  iosSheet: {
    backgroundColor: colors.card,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.m,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
  },
  iosActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.s },
});
