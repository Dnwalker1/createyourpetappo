import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackPreview } from '../components/BackPreview';
import { BundleCard } from '../components/BundleCard';
import { ImageViewer } from '../components/ImageViewer';
import { ColorPicker, SizePicker } from '../components/Pickers';
import { ProductPreview } from '../components/ProductPreview';
import { Body, Button, Screen, TitleBar } from '../components/ui';
import { DEFAULT_CHOICES, PRINT_SIDES, PRODUCT_ORDER, PRODUCTS, PrintSide, ProductChoice, ProductId, priceCents, productDescription } from '../data/catalog';
import { formatMoney } from '../lib/money';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

function sizeNote(id: ProductId, print?: PrintSide): string {
  const p = PRODUCTS[id];
  if (p.kind === 'apparel') {
    const extra = print === 'Back' ? p.backExtraCents : 0;
    return `2XL ${formatMoney(p.priceCents['2XL'] + extra)} · 3XL ${formatMoney(p.priceCents['3XL'] + extra)}`;
  }
  return p.sizes.map((s) => `${s.label.split(' ')[0]} ${formatMoney(s.priceCents)}`).join(' · ');
}

export default function Product() {
  const params = useLocalSearchParams<{ product?: ProductId }>();
  const { activeDesign, addToCart, deviceId } = useAppState();
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
          <Body style={{ textAlign: 'center', fontSize: 14 }}>Add it and keep designing. There&apos;s no limit on how many shirts one dog can have.</Body>
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
        {(choice.product === 'tee' || choice.product === 'hoodie') && choice.print === 'Back' ? (
          <BackPreview deviceId={deviceId} designId={activeDesign?.id ?? null} choice={choice} design={activeDesign?.preview ?? null} size={220} />
        ) : (
          <ProductPreview choice={choice} design={activeDesign?.preview ?? null} size={220} />
        )}
      </Pressable>
      <ImageViewer source={activeDesign?.preview ?? null} visible={viewing} onClose={() => setViewing(false)} label="Your design" />
      {choice.product === 'tee' || choice.product === 'hoodie' ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Color: {choice.color}</Text>
          <ColorPicker product={choice.product} value={choice.color} onChange={(color) => setChoice({ ...choice, color })} />
        </View>
      ) : null}
      {choice.product === 'tee' || choice.product === 'hoodie' ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Design on</Text>
          <View style={styles.sides} accessibilityRole="radiogroup">
            {PRINT_SIDES.map((side) => {
              const on = (choice.print ?? 'Front') === side;
              const extra = side === 'Back' && product.kind === 'apparel' ? product.backExtraCents : 0;
              return (
                <Pressable
                  key={side}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setChoice({ ...choice, print: side })}
                  style={[styles.side, on && styles.sideOn]}
                >
                  <Text style={[styles.sideTitle, on && { color: colors.cream }]}>
                    {side}
                    {extra ? ` +${formatMoney(extra)}` : ''}
                  </Text>
                  <Text style={[styles.sideNote, on && { color: colors.cream }]}>
                    {side === 'Front' ? 'Logo on the sleeve' : 'Logo on the left chest'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.note}>{sizeNote(current, 'print' in choice ? choice.print : undefined)}</Text>
        </View>
        <SizePicker choice={choice} onChange={setChoice} />
      </View>
      <Body style={{ fontSize: 14 }}>{productDescription(choice)} Free shipping. Printed on demand; allow a few days plus shipping.</Body>
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
  sides: { flexDirection: 'row', gap: 8 },
  side: { flex: 1, minHeight: 56, borderRadius: 12, borderWidth: 2, borderColor: colors.agedCream, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  sideOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  sideTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  sideNote: { fontFamily: fonts.body, fontSize: 12, color: colors.slate },
});
