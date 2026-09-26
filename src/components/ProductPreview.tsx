import { Image } from 'expo-image';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { colorFor, PRODUCTS, ProductChoice } from '../data/catalog';
import { colors } from '../theme';

// Places the watermarked design on the product, like the canvas previews.
// Positions are fractions of the square Printful flat mockups: center chest,
// between the neckline and the pocket.
const PLACEMENT = {
  tee: { top: 0.21, size: 0.29 },
  // Measured on the eight "ghost mannequin" hoodie photos (every color but
  // Bone): the neckline ends about 21% down and the pocket starts about 60%
  // down, so the design sits in between with a small gap under the collar.
  // It used to be 0.33 / 0.27, which pushed it down onto the pocket.
  hoodie: { top: 0.25, size: 0.25 },
} as const;

// The Bone hoodie photo is a different shot (laid flat, hood standing up), so
// its chest sits lower in the frame than the other colors.
const COLOR_PLACEMENT: Record<string, { top: number; size: number }> = {
  'hoodie:Bone': { top: 0.37, size: 0.24 },
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
  sheet: {
    backgroundColor: colors.white,
    shadowColor: colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
