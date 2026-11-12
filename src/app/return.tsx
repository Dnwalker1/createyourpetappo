import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { colors } from '../theme';

// designyourpet://return — the "Back to the app" button on the website's
// Thank You page lands here (added 12 Nov 2026).
//
// iOS: closes the checkout sheet, so the Review and pay screen underneath
// carries on and checks the order, exactly as if the customer had tapped ✕.
// Android: opening the app already brought it to the front over the Chrome
// tab, and Review and pay checks the order when the app comes back.
// Either way this screen steps back to wherever the customer was.
export default function Return() {
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'ios') {
        try {
          await WebBrowser.dismissBrowser();
        } catch {
          // No sheet open: nothing to close.
        }
      }
      if (router.canGoBack()) router.back();
      else router.replace('/orders');
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}
