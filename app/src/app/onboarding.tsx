// Two-step onboarding: allergens (multi-select) → optional daily goals.
// Both steps are skippable so founders can reach the diary quickly.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Field } from '../components/ui';
import { EU_ALLERGENS } from '../lib/allergens';
import { parseNum } from '../lib/nutrition';
import { useSession } from '../lib/session';
import { colors, spacing } from '../lib/theme';

export default function Onboarding() {
  const { t } = useTranslation();
  const { updateProfile } = useSession();
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [kcal, setKcal] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  async function finish(withGoals: boolean) {
    setBusy(true);
    try {
      await updateProfile({
        allergens: selected,
        goal_kcal: withGoals ? parseNum(kcal) || null : null,
        goal_carbs: withGoals ? parseNum(carbs) || null : null,
        goal_protein: withGoals ? parseNum(protein) || null : null,
        goal_fat: withGoals ? parseNum(fat) || null : null,
        onboarded: true,
      });
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
    // Root layout redirects to (tabs) once onboarded=true.
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Text style={styles.title}>{t('onboarding.allergensTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.allergensSubtitle')}</Text>
            <View style={styles.chips}>
              {EU_ALLERGENS.map((key) => (
                <Chip
                  key={key}
                  label={t(`allergens.${key}`)}
                  active={selected.includes(key)}
                  onPress={() => toggle(key)}
                />
              ))}
            </View>
            <Text style={styles.disclaimer}>{t('allergens.disclaimer')}</Text>
            <Button title={t('common.next')} onPress={() => setStep(1)} />
            <Text style={styles.skip} onPress={() => finish(false)}>
              {t('common.skip')}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('onboarding.goalsTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.goalsSubtitle')}</Text>
            <Field label={t('settings.goalKcal')} value={kcal} onChangeText={setKcal} keyboardType="numeric" />
            <Field label={t('settings.goalCarbs')} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
            <Field label={t('settings.goalProtein')} value={protein} onChangeText={setProtein} keyboardType="numeric" />
            <Field label={t('settings.goalFat')} value={fat} onChangeText={setFat} keyboardType="numeric" />
            <Button title={t('onboarding.start')} onPress={() => finish(true)} loading={busy} />
            <Text style={styles.skip} onPress={() => finish(false)}>
              {t('common.skip')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: spacing.s, marginBottom: spacing.xl, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.l },
  disclaimer: { fontSize: 12, color: colors.faint, marginBottom: spacing.xl, lineHeight: 17 },
  skip: { color: colors.muted, textAlign: 'center', marginTop: spacing.l, fontWeight: '600' },
});
