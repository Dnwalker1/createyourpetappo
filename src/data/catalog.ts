import type { ImageSourcePropType } from 'react-native';

// Styles, products and prices. Prices are Printful retail prices in cents.
// Source: docs/app-spec.md > Styles, Products and prices.

export type StyleId = 'stamp' | 'poster' | 'evening' | 'sticker';

export type DesignStyle = {
  id: StyleId;
  name: string;
  /** The website's key for the style (PetDesigns.styleChoice). */
  siteKey: string;
  sample: ImageSourcePropType;
  allowsText: boolean;
};

export const MAX_TEXT_LENGTH = 18;

export const STYLES: DesignStyle[] = [
  { id: 'stamp', name: 'Travel Stamp', siteKey: 'travelStamp', sample: require('../../assets/images/styles/travel-stamp.png'), allowsText: true },
  { id: 'poster', name: 'Travel Poster', siteKey: 'travelPoster', sample: require('../../assets/images/styles/travel-poster.png'), allowsText: true },
  { id: 'evening', name: 'Evening Portrait', siteKey: 'eveningPortrait', sample: require('../../assets/images/styles/evening-portrait.png'), allowsText: false },
  { id: 'sticker', name: 'Adventure Sticker', siteKey: 'adventureSticker', sample: require('../../assets/images/styles/adventure-sticker.png'), allowsText: false },
];

/**
 * The app's style id for whatever the backend sent: the app key ("evening"),
 * the display name ("Evening Portrait") or the website key ("eveningPortrait").
 */
export function styleIdFrom(value: unknown): StyleId | undefined {
  const v = String(value ?? '').trim().toLowerCase();
  return STYLES.find((s) => s.id === v || s.name.toLowerCase() === v || s.siteKey.toLowerCase() === v)?.id;
}

export function styleById(id: StyleId): DesignStyle {
  const style = STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown style ${id}`);
  return style;
}

export type ProductId = 'tee' | 'hoodie' | 'sticker' | 'poster';
export type ApparelSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';
export const APPAREL_SIZES: ApparelSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export type ProductColor = { name: string; hex: string; mockup: ImageSourcePropType };
export type FlatSize = { id: string; label: string; priceCents: number };

type ApparelProduct = {
  id: 'tee' | 'hoodie';
  kind: 'apparel';
  name: string;
  printfulItem: string;
  description: string;
  colors: ProductColor[];
  priceCents: Record<ApparelSize, number>;
};

type FlatProduct = {
  id: 'sticker' | 'poster';
  kind: 'flat';
  name: string;
  printfulItem: string;
  description: string;
  sizes: FlatSize[];
};

export type Product = ApparelProduct | FlatProduct;

const SLEEVE = 'Goodwookie script logo on the left sleeve.';

export const PRODUCTS: Record<ProductId, Product> = {
  tee: {
    id: 'tee',
    kind: 'apparel',
    name: 'T-Shirt',
    printfulItem: 'Bella + Canvas 3001',
    description: `The Unisex Staple T-Shirt feels soft and light with just the right amount of stretch. ${SLEEVE}`,
    colors: [
      { name: 'White', hex: '#F5F5F5', mockup: require('../../assets/images/mockups/tee-white.webp') },
      { name: 'Natural', hex: '#F3E8CA', mockup: require('../../assets/images/mockups/tee-natural.webp') },
      { name: 'Ash', hex: '#DBDCD6', mockup: require('../../assets/images/mockups/tee-ash.webp') },
      { name: 'Heather Dust', hex: '#E2D9D0', mockup: require('../../assets/images/mockups/tee-heather-dust.webp') },
      { name: 'Athletic Heather', hex: '#C4C5C0', mockup: require('../../assets/images/mockups/tee-athletic-heather.webp') },
    ],
    priceCents: { S: 2400, M: 2400, L: 2400, XL: 2400, '2XL': 2650, '3XL': 2900 },
  },
  hoodie: {
    id: 'hoodie',
    kind: 'apparel',
    name: 'Hoodie',
    printfulItem: 'Cotton Heritage M2580',
    description: `Cotton Heritage M2580 unisex premium pullover hoodie. ${SLEEVE}`,
    colors: [
      { name: 'Bone', hex: '#F1E5CD', mockup: require('../../assets/images/mockups/hoodie-bone.webp') },
      { name: 'Carbon Grey', hex: '#A2A19D', mockup: require('../../assets/images/mockups/hoodie-carbon-grey.webp') },
      { name: 'Carolina Blue', hex: '#93ADDD', mockup: require('../../assets/images/mockups/hoodie-carolina-blue.webp') },
      { name: 'Khaki', hex: '#B38E66', mockup: require('../../assets/images/mockups/hoodie-khaki.webp') },
      { name: 'Lavender', hex: '#ECCDE2', mockup: require('../../assets/images/mockups/hoodie-lavender.webp') },
      { name: 'Light Pink', hex: '#ECC3BF', mockup: require('../../assets/images/mockups/hoodie-light-pink.webp') },
      { name: 'Oatmeal Heather', hex: '#D0C9BC', mockup: require('../../assets/images/mockups/hoodie-oatmeal-heather.webp') },
      { name: 'Sky Blue', hex: '#C8DCE5', mockup: require('../../assets/images/mockups/hoodie-sky-blue.webp') },
      { name: 'White', hex: '#FFFFFF', mockup: require('../../assets/images/mockups/hoodie-white.webp') },
    ],
    priceCents: { S: 5450, M: 5450, L: 5450, XL: 5450, '2XL': 5700, '3XL': 5950 },
  },
  sticker: {
    id: 'sticker',
    kind: 'flat',
    name: 'Sticker',
    printfulItem: 'Kiss-cut, bubble-free sticker',
    description: 'Kiss-cut, bubble-free sticker of your design.',
    sizes: [
      { id: '3x3', label: '3″ × 3″', priceCents: 1050 },
      { id: '4x4', label: '4″ × 4″', priceCents: 1050 },
      { id: '5.5x5.5', label: '5.5″ × 5.5″', priceCents: 1100 },
    ],
  },
  poster: {
    id: 'poster',
    kind: 'flat',
    name: 'Poster',
    printfulItem: 'Matte paper poster',
    description: 'Square matte paper poster of your design.',
    sizes: [
      { id: '12x12', label: '12″ × 12″', priceCents: 2200 },
      { id: '16x16', label: '16″ × 16″', priceCents: 2650 },
      { id: '18x18', label: '18″ × 18″', priceCents: 2750 },
    ],
  },
};

export const PRODUCT_ORDER: ProductId[] = ['tee', 'hoodie', 'sticker', 'poster'];

// The bundle discount is an automatic discount in the Wix store. The app only
// estimates it for display; Wix applies the real one at checkout.
export const BUNDLE_DISCOUNT = 0.1;

// What a customer picks for one product.
export type ProductChoice =
  | { product: 'tee' | 'hoodie'; color: string; size: ApparelSize }
  | { product: 'sticker' | 'poster'; size: string };

export function priceCents(choice: ProductChoice): number {
  const product = PRODUCTS[choice.product];
  if (product.kind === 'apparel') {
    return product.priceCents[choice.size as ApparelSize];
  }
  const size = product.sizes.find((s) => s.id === choice.size);
  if (!size) throw new Error(`Unknown size ${choice.size} for ${choice.product}`);
  return size.priceCents;
}

export function priceRange(id: ProductId): [number, number] {
  const product = PRODUCTS[id];
  const prices = product.kind === 'apparel' ? Object.values(product.priceCents) : product.sizes.map((s) => s.priceCents);
  return [Math.min(...prices), Math.max(...prices)];
}

export function colorFor(product: 'tee' | 'hoodie', name: string): ProductColor {
  const p = PRODUCTS[product] as ApparelProduct;
  return p.colors.find((c) => c.name === name) ?? p.colors[0];
}

export function describeChoice(choice: ProductChoice): string {
  const product = PRODUCTS[choice.product];
  if (choice.product === 'tee' || choice.product === 'hoodie') {
    return `${product.name} · ${choice.color} · ${choice.size}`;
  }
  const size = (product as FlatProduct).sizes.find((s) => s.id === choice.size);
  return `${product.name} · ${size?.label ?? choice.size}`;
}

export const DEFAULT_CHOICES: Record<ProductId, ProductChoice> = {
  tee: { product: 'tee', color: 'White', size: 'L' },
  hoodie: { product: 'hoodie', color: 'Bone', size: 'L' },
  sticker: { product: 'sticker', size: '4x4' },
  poster: { product: 'poster', size: '16x16' },
};
