import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ColorPicker, SizePicker } from '../components/Pickers';
import { ProductPreview } from '../components/ProductPreview';
import { Body, Button, Card, Screen, TitleBar } from '../components/ui';
import { BUNDLE_DISCOUNT, DEFAULT_CHOICES, PRODUCTS, priceCents } from '../data/catalog';
import { BundleChoices, bundleItemsCents } from '../lib/cart';
import { discountCents, formatMoney } from '../lib/money';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

const INITIAL = DEFAULT_CHOICES as unknown as BundleChoices;
const KEYS: (keyof BundleChoices)[] = ['tee', 'hoodie', 'sticker', 'poster'];

export default function Bundle() {
  const { activeDesign, addToCart } = useAppState();
  const [choices, setChoices] = useState<BundleChoices>(INITIAL);
  const items = bundleItemsCents(choices);
  const discount = discountCents(items, BUNDLE_DISCOUNT);

  function add() {
    if (!activeDesign) return;
    addToCart({ kind: 'bundle', designId: activeDesign.id, styleId: activeDesign.styleId, preview: activeDesign.preview, choices });
    router.push('/cart');
  }

  return (
    <Screen
      footer={
        <>
          <Button title="Add bundle to cart" disabled={!activeDesign} onPress={add} />
          <Body style={{ textAlign: 'center', fontSize: 14 }}>Free shipping on everything in the store.</Body>
        </>
      }
    >
      <TitleBar
        title="Buy them all"
        right={
          <View style={styles.badge}>
            <Text style={styles.badgeText}>10% OFF</Text>
          </View>
        }
      />
      <Body style={{ fontSize: 15 }}>One of each, all with your design. Pick a color and size for each piece.</Body>

      {KEYS.map((key) => {
        const choice = choices[key];
        const set = (c: typeof choice) => setChoices((all) => ({ ...all, [key]: c }));
        return (
          <Card key={key}>
            <View style={styles.rowTop}>
              <View style={styles.thumb}>
                <ProductPreview choice={choice} design={activeDesign?.preview ?? null} size={60} />
              </View>
              <Text style={styles.name}>{PRODUCTS[key].name}</Text>
              <Text style={styles.price}>{formatMoney(priceCents(choice))}</Text>
            </View>
            {choice.product === 'tee' || choice.product === 'hoodie' ? (
              <ColorPicker product={choice.product} value={choice.color} swatch={30} onChange={(color) => set({ ...choice, color } as typeof choice)} />
            ) : null}
            <SizePicker choice={choice} onChange={(c) => set(c as typeof choice)} />
          </Card>
        );
      })}

      <View style={styles.summary}>
        <View style={styles.line}>
          <Text style={styles.summaryText}>Items</Text>
          <Text style={styles.summaryText}>{formatMoney(items)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.summaryText}>Bundle discount (10%)</Text>
          <Text style={styles.summaryText}>−{formatMoney(discount)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.totalLabel}>Bundle price</Text>
          <Text style={styles.total}>{formatMoney(items - discount)}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.rust },
  badgeText: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, color: colors.white },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: colors.white, overflow: 'hidden' },
  name: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
  price: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.navy },
  summary: { gap: 6, padding: 16, borderRadius: 14, backgroundColor: colors.navy },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  summaryText: { fontFamily: fonts.body, fontSize: 15, color: colors.agedCream },
  totalLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.cream },
  total: { fontFamily: fonts.display, fontSize: 26, color: colors.gold },
});
