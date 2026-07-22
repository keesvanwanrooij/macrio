import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/*
 * SECTION: App metadata for feedback + Settings
 * WHAT: App version string shown in Settings and sent with feedback rows.
 * HOW: Read from app.json via expo-constants (single source of truth).
 * INPUT: app/app.config.js → expo.version
 * OUTPUT: APP_VERSION string (fallback 0.1.0 if config missing)
 */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

const sessionStart = Date.now();

export function getSessionSeconds(): number {
  return Math.round((Date.now() - sessionStart) / 1000);
}

const INSTALL_KEY = 'macrio_installed_at';

export async function getDaysSinceInstall(): Promise<number> {
  try {
    let raw = await AsyncStorage.getItem(INSTALL_KEY);
    if (!raw) {
      raw = String(Date.now());
      await AsyncStorage.setItem(INSTALL_KEY, raw);
    }
    return Math.floor((Date.now() - Number(raw)) / 86_400_000);
  } catch {
    return 0;
  }
}
