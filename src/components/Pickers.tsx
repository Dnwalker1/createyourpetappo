import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APPAREL_SIZES, ApparelSize, PRODUCTS, ProductChoice } from '../data/catalog';
import { colors, fonts } from '../theme';

// Colour swatches and size buttons shared by the product and bundle screens.

export function ColorPicker({ product, value, onChange, swatch = 44 }: { product: 'tee' | 'hoodie'; value: string; onChange: (name: string) => void; swatch?: number }) {
  const p = PRODUCTS[product];
  if (p.kind !== 'apparel') return null;
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {p.colors.map((c) => {
        const on = c.name === value;
        return (
          <Pressable
            key={c.name}
            accessibilityRole="radio"
            accessibilityLabel={c.name}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(c.name)}
            hitSlop={Math.max(0, (44 - swatch) / 2)}
            style={[
              styles.swatch,
              { width: swatch, height: swatch, borderRadius: swatch / 2, backgroundColor: c.hex },
              on && styles.swatchOn,
            ]}
          />
        );
      })}
    </View>
  );
}

export function SizePicker({ choice, onChange }: { choice: ProductChoice; onChange: (choice: ProductChoice) => void }) {
  const product = PRODUCTS[choice.product];
  const options =
    product.kind === 'apparel'
      ? APPAREL_SIZES.map((s) => ({ id: s as string, label: s as string }))
      : product.sizes.map((s) => ({ id: s.id, label: s.label }));
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.id === choice.size;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() =>
              onChange(
                choice.product === 'tee' || choice.product === 'hoodie'
                  ? { product: choice.product, color: choice.color, size: o.id as ApparelSize }
                  : { product: choice.product, size: o.id },
              )
            }
            style={[styles.size, product.kind === 'flat' && { flexGrow: 1 }, on ? styles.sizeOn : null]}
          >
            <Text style={[styles.sizeText, on && { color: colors.cream }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { borderWidth: 2, borderColor: colors.bronze },
  swatchOn: { borderWidth: 3, borderColor: colors.navy, transform: [{ scale: 1.08 }] },
  size: {
    minWidth: 48,
    height: 46,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.agedCream,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeOn: { borderColor: colors.navy, backgroundColor: colors.navy },
  sizeText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
});
