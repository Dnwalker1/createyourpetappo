import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BUNDLE_DISCOUNT } from '../data/catalog';
import { bundleItemsCents } from '../lib/cart';
import { discountCents, formatMoney } from '../lib/money';
import { colors, fonts } from '../theme';

// Cheapest bundle: every piece at its lowest price.
function cheapestBundleCents(): number {
  const items = bundleItemsCents({
    tee: { product: 'tee', color: 'White', size: 'S' },
    hoodie: { product: 'hoodie', color: 'Bone', size: 'S' },
    sticker: { product: 'sticker', size: '3x3' },
    poster: { product: 'poster', size: '12x12' },
  });
  return items - discountCents(items, BUNDLE_DISCOUNT);
}

// The "Buy them all" offer, shown at the bottom of the result and every product page.
export function BundleCard() {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/bundle')} style={styles.bundle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.bundleTitle}>Buy them all · 10% off</Text>
        <Text style={styles.bundleSub}>Tee, hoodie, sticker and poster</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.bundleSub}>from</Text>
        <Text style={styles.bundlePrice}>{formatMoney(cheapestBundleCents())}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bundle: { minHeight: 64, padding: 14, borderRadius: 14, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bundleTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.cream },
  bundleSub: { fontFamily: fonts.body, fontSize: 14, color: colors.agedCream },
  bundlePrice: { fontFamily: fonts.display, fontSize: 20, color: colors.gold },
});
