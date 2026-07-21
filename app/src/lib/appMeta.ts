import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_VERSION = '1.0.0';

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
