/*
 * SECTION: Shared native date picker
 * WHAT: Tap a label → platform date picker (Android dialog / iOS spinner or inline).
 * HOW: Pressable shows formatted date; opens @react-native-community/datetimepicker.
 * INPUT: value ISO YYYY-MM-DD; onChange; optional max/min; dateFormat for label
 * OUTPUT: onChange(iso) when user confirms a day
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  clampToToday,
  dateToIso,
  formatDateDisplay,
  isoToDate,
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
  // iOS: keep a draft until Done; Android fires once on set.
  const [iosDraft, setIosDraft] = useState<Date>(() => isoToDate(value));

  const max =
    maximumDate === null ? undefined : maximumDate ?? isoToDate(todayIso());
  const parsed = isoToDate(value);
  const closedLabel = displayText ?? formatDateDisplay(value, dateFormat);

  function apply(iso: string) {
    const next =
      maximumDate === null ? iso : clampToToday(iso, dateToIso(max ?? isoToDate(todayIso())));
    onChange(next);
  }

  function onAndroidChange(event: DateTimePickerEvent, date?: Date) {
    setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    apply(dateToIso(date));
  }

  function openPicker() {
    if (disabled) return;
    setIosDraft(parsed);
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

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parsed}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          maximumDate={max}
          minimumDate={minimumDate}
        />
      ) : null}

      {open && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.iosBackdrop} onPress={() => setOpen(false)} />
          <View style={styles.iosSheet}>
            <DateTimePicker
              value={iosDraft}
              mode="date"
              display="spinner"
              onChange={(_e, date) => {
                if (date) setIosDraft(date);
              }}
              maximumDate={max}
              minimumDate={minimumDate}
              style={{ alignSelf: 'stretch' }}
            />
            <View style={styles.iosActions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={() => setOpen(false)} />
              <View style={{ width: spacing.s }} />
              <Button
                title={t('common.done')}
                onPress={() => {
                  apply(dateToIso(iosDraft));
                  setOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Web / unknown: fall back to same Android-style one-shot if supported */}
      {open && Platform.OS !== 'ios' && Platform.OS !== 'android' ? (
        <DateTimePicker
          value={parsed}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'dismissed' || !date) return;
            apply(dateToIso(date));
          }}
          maximumDate={max}
          minimumDate={minimumDate}
        />
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
