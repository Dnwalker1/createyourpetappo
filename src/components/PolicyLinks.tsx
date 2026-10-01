import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

// Addresses live in app.json > extra, so they can change without touching screens.
const extra = Constants.expoConfig?.extra ?? {};
export const PRIVACY_URL: string = extra.privacyPolicyUrl ?? 'https://www.goodwookie.com/privacy-policy';
export const TERMS_URL: string = extra.termsUrl ?? 'https://www.goodwookie.com/terms-and-conditions';
export const SHIPPING_URL: string = extra.shippingUrl ?? 'https://www.goodwookie.com/shipping-and-returns';

const LINKS = [
  { label: 'Privacy', url: PRIVACY_URL },
  { label: 'Terms', url: TERMS_URL },
  { label: 'Shipping & Returns', url: SHIPPING_URL },
];

/** A small row of policy links: Privacy · Terms · Shipping & Returns. */
export function PolicyLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const color = tone === 'dark' ? colors.agedCream : colors.slate;
  return (
    <View style={styles.row}>
      {LINKS.map((l, i) => (
        <View key={l.label} style={styles.item}>
          {i > 0 ? <Text style={[styles.dot, { color }]}>·</Text> : null}
          <Text accessibilityRole="link" style={[styles.link, { color }]} onPress={() => WebBrowser.openBrowserAsync(l.url)} suppressHighlighting>
            {l.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center' },
  dot: { fontFamily: fonts.body, fontSize: 14, marginHorizontal: 8 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, textDecorationLine: 'underline', paddingVertical: 6 },
});
