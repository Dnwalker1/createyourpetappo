import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider, useAppState } from '../state/AppState';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Navigator() {
  const { ready } = useAppState();
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Navigator />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
