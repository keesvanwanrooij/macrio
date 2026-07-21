// In-app feedback: text + optional screenshot + automatic metadata
// (app version, session seconds, days since install) — drives the roadmap.
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Field } from '../components/ui';
import { APP_VERSION, getDaysSinceInstall, getSessionSeconds } from '../lib/appMeta';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../lib/theme';

export default function Feedback() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setScreenshot({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  }

  async function send() {
    if (!session) return;
    setBusy(true);
    try {
      let screenshotUrl: string | null = null;
      if (screenshot) {
        const path = `${session.user.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('feedback')
          .upload(path, decode(screenshot.base64), { contentType: 'image/jpeg' });
        if (!upErr) screenshotUrl = path;
      }
      const { error } = await supabase.from('feedback').insert({
        user_id: session.user.id,
        message: message.trim(),
        screenshot_url: screenshotUrl,
        app_version: APP_VERSION,
        session_seconds: getSessionSeconds(),
        days_since_install: await getDaysSinceInstall(),
      });
      if (error) throw error;
      Alert.alert(t('feedback.thanks'));
      router.back();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.l }}>
      <Text style={styles.intro}>{t('feedback.intro')}</Text>
      <Field
        value={message}
        onChangeText={setMessage}
        placeholder={t('feedback.placeholder')}
        multiline
        numberOfLines={6}
        style={{ minHeight: 140, textAlignVertical: 'top' }}
      />
      {screenshot ? (
        <Pressable onPress={pickScreenshot}>
          <Image source={{ uri: screenshot.uri }} style={styles.shot} />
        </Pressable>
      ) : (
        <Pressable style={styles.shotBtn} onPress={pickScreenshot}>
          <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>{t('feedback.attachScreenshot')}</Text>
        </Pressable>
      )}
      <Button title={t('feedback.send')} onPress={send} loading={busy} disabled={!message.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: spacing.l },
  shot: { width: 100, height: 180, borderRadius: radius.m, marginBottom: spacing.l },
  shotBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.m,
    padding: spacing.l,
    alignItems: 'center',
    marginBottom: spacing.l,
    backgroundColor: colors.primarySoft,
  },
});
