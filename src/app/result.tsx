import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Screen, StepHeader } from '../components/ui';
import { ImageViewer } from '../components/ImageViewer';
import { ProductPreview } from '../components/ProductPreview';
import { BUNDLE_DISCOUNT, DEFAULT_CHOICES, PRODUCT_ORDER, PRODUCTS, priceRange, styleById } from '../data/catalog';
import { bundleItemsCents } from '../lib/cart';
import { discountCents, formatMoney, formatRange } from '../lib/money';
import { useLimits } from '../lib/useLimits';
import { useAppState } from '../state/AppState';
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

export default function Result() {
  const { activeDesign, setPhoto } = useAppState();
  const { line } = useLimits();
  const [viewing, setViewing] = useState(false);

  if (!activeDesign) {
    return (
      <Screen>
        <Body>No design selected yet.</Body>
        <Button title="Make a design" onPress={() => router.replace('/upload')} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Body style={{ textAlign: 'center', fontSize: 14 }}>Free shipping on everything in the store.</Body>}>
      <StepHeader step={5} label={`STEP 5 OF 5 · ${styleById(activeDesign.styleId).name.toUpperCase()}`} />
      <Pressable accessibilityRole="button" accessibilityLabel="Enlarge your design" onPress={() => setViewing(true)} style={styles.preview}>
        <ProductPreview choice={DEFAULT_CHOICES.tee} design={activeDesign.preview} size={196} />
        <Text style={styles.enlarge}>Tap to enlarge</Text>
      </Pressable>
      <ImageViewer source={activeDesign.preview} visible={viewing} onClose={() => setViewing(false)} label={`Your ${styleById(activeDesign.styleId).name} design`} />
      <View style={styles.twoUp}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" title="Try another style" onPress={() => router.push('/style')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            title="Use a new photo"
            onPress={() => {
              setPhoto(null);
              router.push('/upload');
            }}
          />
        </View>
      </View>
      {line ? <Body style={{ textAlign: 'center', fontSize: 14 }}>{line}</Body> : null}

      <Text style={styles.h2} accessibilityRole="header">
        Pick your product
      </Text>
      <View style={{ gap: 8 }}>
        {PRODUCT_ORDER.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/product', params: { product: id } })}
            style={styles.productRow}
          >
            <Text style={styles.productName}>{PRODUCTS[id].name}</Text>
            <Text style={styles.productPrice}>{formatRange(priceRange(id))}</Text>
          </Pressable>
        ))}
      </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { height: 200, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.agedCream, alignItems: 'center', justifyContent: 'center' },
  enlarge: { position: 'absolute', right: 12, bottom: 10, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate },
  twoUp: { flexDirection: 'row', gap: 10 },
  h2: { fontFamily: fonts.display, fontSize: 20, color: colors.navy },
  productRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.agedCream,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 17, color: colors.navy },
  productPrice: { fontFamily: fonts.body, fontSize: 16, color: colors.slate },
  bundle: { minHeight: 64, padding: 14, borderRadius: 14, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bundleTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.cream },
  bundleSub: { fontFamily: fonts.body, fontSize: 14, color: colors.agedCream },
  bundlePrice: { fontFamily: fonts.display, fontSize: 20, color: colors.gold },
});
