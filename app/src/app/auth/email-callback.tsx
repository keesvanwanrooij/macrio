/*
 * SECTION: Email-change deep-link landing
 * WHAT: Fallback UI when expo-router opens /auth/email-callback after confirm-to-new-address.
 * HOW: Spinner + copy; root useAuthDeepLinkHandler exchanges the code and routes to Settings.
 * INPUT: deep link route
 * OUTPUT: visual wait state only
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '../../lib/theme';

export default function EmailChangeCallback() {
  const { t } = useTranslation();

  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{t('auth.emailChangeCallbackWorking')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.m,
  },
  text: { color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
