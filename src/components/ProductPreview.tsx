import { Image } from 'expo-image';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { colorFor, PRODUCTS, ProductChoice } from '../data/catalog';
import { colors } from '../theme';

// Places the watermarked design on the product, like the canvas previews.
// Positions are fractions of the square Printful flat mockups: center chest,
// between the neckline and the pocket.
const PLACEMENT = {
  // Matches Don's Printful tee layout (26 Sep): 10.7" wide, 3.2" down.
  tee: { top: 0.26, size: 0.29 },
  // Measured on the eight "ghost mannequin" hoodie photos (every color but
  // Bone): the neckline ends about 21% down and the pocket starts about 60%
  // down, so the design sits in between with a small gap under the collar.
  // Sized to match the print itself (Don's Printful layout, 26 Sep: about
  // 9.9" wide, 2.1" below the top of the front area, ending just above the
  // pocket). Before that it was 0.25 / 0.25, and before that 0.33 / 0.27.
  hoodie: { top: 0.27, size: 0.3 },
} as const;

// The Bone hoodie photo is a different shot (laid flat, hood standing up), so
// its chest sits lower in the frame than the other colors.
const COLOR_PLACEMENT: Record<string, { top: number; size: number }> = {
  'hoodie:Bone': { top: 0.38, size: 0.26 },
};

export function ProductPreview({ choice, design, size = 220 }: { choice: ProductChoice; design: ImageSourcePropType | null; size?: number }) {
  const name = PRODUCTS[choice.product].name;
  if (choice.product === 'tee' || choice.product === 'hoodie') {
    const color = colorFor(choice.product, choice.color);
    const p = COLOR_PLACEMENT[`${choice.product}:${choice.color}`] ?? PLACEMENT[choice.product];
    const d = size * p.size;
    return (
      <View style={{ width: size, height: size }} accessibilityLabel={`Your design on a ${color.name} ${name.toLowerCase()}`}>
        <Image source={color.mockup} style={StyleSheet.absoluteFill} contentFit="contain" />
        {design ? <Image source={design} style={{ position: 'absolute', width: d, height: d, left: (size - d) / 2, top: size * p.top }} contentFit="contain" /> : null}
      </View>
    );
  }
  // Ornament (16 Nov 2026): a white ceramic disc, the design filling it and the
  // circle trimming its corners, as it prints, with the hanging hole and string.
  if (choice.product === 'ornament') {
    const d = size * 0.78;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }} accessibilityLabel={`Your design on a round ${name.toLowerCase()}`}>
        <View style={[styles.disc, { width: d, height: d, borderRadius: d / 2, marginBottom: 4 }]}>
          {design ? <Image source={design} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={[styles.hole, { top: d * 0.12, left: d / 2 - 6 }]} />
        </View>
        {/* The string runs down to the hole, drawn over the disc's rim. */}
        <View style={[styles.string, { position: 'absolute', top: 0, left: size / 2 - 1.5, height: size - 4 - d + d * 0.12 + 6 }]} />
      </View>
    );
  }
  // Mug (16 Nov 2026): a white mug with the handle on the right, so the design
  // is the side the drinker sees. The logo is on the back, out of view.
  if (choice.product === 'mug') {
    const w = size * 0.6;
    const h = size * 0.66;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Your design on a ${name.toLowerCase()}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.mug, { width: w, height: h }]}>
            {design ? <Image source={design} style={{ width: w * 0.78, height: h * 0.78 }} contentFit="contain" /> : null}
          </View>
          <View style={[styles.handle, { width: size * 0.17, height: h * 0.55, marginLeft: -4 }]} />
        </View>
      </View>
    );
  }
  // Sticker and poster: scale the sheet with the chosen size.
  const sizes = PRODUCTS[choice.product].kind === 'flat' ? (PRODUCTS[choice.product] as { sizes: { id: string }[] }).sizes : [];
  const index = Math.max(0, sizes.findIndex((s) => s.id === choice.size));
  const scale = [0.62, 0.8, 0.92][index] ?? 0.8;
  const sheet = size * scale;
  const isSticker = choice.product === 'sticker';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Your design as a ${name.toLowerCase()}`}>
      <View style={[styles.sheet, { width: sheet, height: sheet, padding: isSticker ? 8 : 6, borderRadius: isSticker ? 6 : 0 }]}>
        {design ? <Image source={design} style={{ flex: 1 }} contentFit="contain" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: colors.white, overflow: 'hidden', borderWidth: 2, borderColor: '#E4E1DA', shadowColor: colors.navy, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  hole: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#C9C4B8' },
  string: { width: 3, backgroundColor: '#C79A3E', borderRadius: 2 },
  mug: { backgroundColor: colors.white, borderRadius: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E4E1DA', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  handle: { borderWidth: 9, borderLeftWidth: 0, borderColor: '#DCD7CB', borderTopRightRadius: 40, borderBottomRightRadius: 40, shadowColor: colors.navy, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  sheet: {
    backgroundColor: colors.white,
    shadowColor: colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
