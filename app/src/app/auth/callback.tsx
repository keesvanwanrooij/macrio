/*
 * SECTION: Auth email deep-link callback
 * WHAT: Fallback UI if expo-router opens /auth/callback (root useAuthDeepLinkHandler does the real work).
 * HOW: Show spinner; root handler exchanges code and navigates to reset-password.
 * INPUT: deep link route
 * OUTPUT: visual wait state only
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '../../lib/theme';

export default function AuthCallback() {
  const { t } = useTranslation();

  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{t('auth.callbackWorking')}</Text>
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
