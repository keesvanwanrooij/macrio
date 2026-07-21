// Small shared UI primitives — keep the app visually consistent without a UI library.
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '../lib/theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.danger
    : variant === 'secondary' ? colors.card
    : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#fff' : colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  trimOnBlur,
  onChangeText,
  onBlur,
  value,
  ...props
}: TextInputProps & { label?: string; trimOnBlur?: boolean }) {
  return (
    <View style={{ marginBottom: spacing.m }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        value={value}
        onChangeText={onChangeText}
        onBlur={(e) => {
          if (trimOnBlur && onChangeText && typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== value) onChangeText(trimmed);
          }
          onBlur?.(e);
        }}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function PasswordField({
  label,
  value,
  onChangeText,
  autoComplete,
  ...props
}: Omit<TextInputProps, 'secureTextEntry'> & { label?: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  return (
    <View style={{ marginBottom: spacing.m }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.passwordWrap}>
        <TextInput
          placeholderTextColor={colors.faint}
          value={value}
          onChangeText={onChangeText}
          autoComplete={autoComplete}
          secureTextEntry={!visible}
          {...props}
          style={[styles.input, styles.passwordInput, props.style]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Text style={styles.passwordToggleText}>{visible ? '🙈' : '👁'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Screen({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const bg = color ?? (active ? colors.primarySoft : colors.card);
  const border = active ? colors.primary : colors.border;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
    >
      <Text style={{ color: active ? colors.primaryDark : colors.muted, fontWeight: active ? '700' : '400', fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.m,
    paddingVertical: 14,
    paddingHorizontal: spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordToggleText: { fontSize: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s,
    marginTop: spacing.l,
  },
  screen: { flex: 1, backgroundColor: colors.bg },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: spacing.s,
    marginBottom: spacing.s,
  },
});
