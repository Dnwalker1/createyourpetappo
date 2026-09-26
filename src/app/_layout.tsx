import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { type ErrorBoundaryProps, router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Text, View } from 'react-native';
import { api } from '../api';
import { clearPendingCheckout, loadPendingCheckout } from '../lib/pendingCheckout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider, useAppState } from '../state/AppState';
import { Body, Button, H1 } from '../components/ui';
import { colors, fonts } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// If the app was closed or restarted while the customer was paying, finish the
// job when it comes back: ask whether that checkout was paid, and if so show
// the confirmation and empty the cart.
function useResumeCheckout() {
  const { ready, deviceId, clearCart } = useAppState();
  const busy = useRef(false);
  // clearCart is a new function on every render; keep the latest in a ref so
  // the check below runs once per launch/return, not on every render.
  const clearCartRef = useRef(clearCart);
  useEffect(() => {
    clearCartRef.current = clearCart;
  }, [clearCart]);
  useEffect(() => {
    if (!ready || !deviceId) return;
    const check = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const id = await loadPendingCheckout();
        if (!id) return;
        const status = await api.getCheckoutStatus(deviceId, id).catch(() => null);
        if (status?.completed) {
          await clearPendingCheckout();
          clearCartRef.current();
          router.replace({ pathname: '/confirmation', params: status.orderNumber ? { number: status.orderNumber } : {} });
        }
      } finally {
        busy.current = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [ready, deviceId]);
}

function Navigator() {
  const { ready } = useAppState();
  useResumeCheckout();
  const [fontsLoaded, fontError] = useFonts({
    AlfaSlabOne_400Regular,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Oswald_600SemiBold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
    </>
  );
}

// Any error while showing a screen lands here instead of closing the app.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.cream }}>
      <H1>Something went wrong</H1>
      <Body>Sorry about that. Your designs and cart are safe. Try again, or start over from the beginning.</Body>
      <Button title="Try again" onPress={retry} />
      <Button
        variant="secondary"
        title="Start over"
        onPress={() => {
          router.replace('/');
          retry();
        }}
      />
      <Text selectable style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate }}>
        {error.message}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Navigator />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
