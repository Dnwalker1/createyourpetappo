import AsyncStorage from '@react-native-async-storage/async-storage';

// The checkout that's open in the browser and not yet confirmed, saved to the
// phone so it survives the app being closed or restarted while the customer
// pays. Android (and Expo Go) can close the app in the background; without
// this, the payment went through but the app forgot to show the confirmation.

const KEY = 'dyp.pendingCheckout';
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // an abandoned checkout stops mattering after a few hours

type Saved = { id: string; at: number };

export async function savePendingCheckout(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() } satisfies Saved)).catch(() => undefined);
}

export async function loadPendingCheckout(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!saved?.id || Date.now() - saved.at > MAX_AGE_MS) {
      await clearPendingCheckout();
      return null;
    }
    return saved.id;
  } catch {
    return null;
  }
}

export async function clearPendingCheckout(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
