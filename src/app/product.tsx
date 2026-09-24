import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BundleCard } from '../components/BundleCard';
import { ImageViewer } from '../components/ImageViewer';
import { ColorPicker, SizePicker } from '../components/Pickers';
import { ProductPreview } from '../components/ProductPreview';
import { Body, Button, Screen, TitleBar } from '../components/ui';
import { DEFAULT_CHOICES, PRODUCT_ORDER, PRODUCTS, ProductChoice, ProductId, priceCents } from '../data/catalog';
import { formatMoney } from '../lib/money';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

function sizeNote(id: ProductId): string {
  const p = PRODUCTS[id];
  if (p.kind === 'apparel') return `2XL ${formatMoney(p.priceCents['2XL'])} · 3XL ${formatMoney(p.priceCents['3XL'])}`;
  return p.sizes.map((s) => `${s.label.split(' ')[0]} ${formatMoney(s.priceCents)}`).join(' · ');
}

export default function Product() {
  const params = useLocalSearchParams<{ product?: ProductId }>();
  const { activeDesign, addToCart } = useAppState();
  const [current, setCurrent] = useState<ProductId>(params.product && PRODUCTS[params.product] ? params.product : 'tee');
  const [choices, setChoices] = useState<Record<ProductId, ProductChoice>>(DEFAULT_CHOICES);
  const choice = choices[current];
  const product = PRODUCTS[current];
  const [viewing, setViewing] = useState(false);
  const setChoice = (c: ProductChoice) => setChoices((all) => ({ ...all, [current]: c }));

  function add() {
    if (!activeDesign) return;
    addToCart({ kind: 'single', designId: activeDesign.id, styleId: activeDesign.styleId, preview: activeDesign.preview, choice, quantity: 1 });
    router.push('/cart');
  }

  return (
    <Screen
      footer={
        <>
          <Button title="Add to cart" disabled={!activeDesign} onPress={add} />
          <Body style={{ textAlign: 'center', fontSize: 14 }}>You can keep designing afterward and add more than one.</Body>
        </>
      }
    >
      <TitleBar title={product.name} right={<Text style={styles.price}>{formatMoney(priceCents(choice))}</Text>} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {PRODUCT_ORDER.map((id) => {
          const on = id === current;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setCurrent(id)} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && { color: colors.cream }]}>{PRODUCTS[id].name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enlarge your design"
        disabled={!activeDesign?.preview}
        onPress={() => setViewing(true)}
        style={styles.preview}
      >
        <ProductPreview choice={choice} design={activeDesign?.preview ?? null} size={220} />
      </Pressable>
      <ImageViewer source={activeDesign?.preview ?? null} visible={viewing} onClose={() => setViewing(false)} label="Your design" />
      {choice.product === 'tee' || choice.product === 'hoodie' ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Color: {choice.color}</Text>
          <ColorPicker product={choice.product} value={choice.color} onChange={(color) => setChoice({ ...choice, color })} />
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.note}>{sizeNote(current)}</Text>
        </View>
        <SizePicker choice={choice} onChange={setChoice} />
      </View>
      <Body style={{ fontSize: 14 }}>{product.description} Free shipping. Printed on demand; allow a few days plus shipping.</Body>
      <BundleCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { fontFamily: fonts.display, fontSize: 20, color: colors.navy },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.agedCream },
  tab: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.navy },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  preview: { height: 220, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.agedCream, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.slate },
});
