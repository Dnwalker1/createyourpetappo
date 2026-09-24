import { BUNDLE_DISCOUNT, ProductChoice, priceCents } from '../data/catalog';
import type { ImageSourcePropType } from 'react-native';
import type { StyleId } from '../data/catalog';
import { discountCents } from './money';

export type BundleChoices = {
  tee: Extract<ProductChoice, { product: 'tee' | 'hoodie' }>;
  hoodie: Extract<ProductChoice, { product: 'tee' | 'hoodie' }>;
  sticker: Extract<ProductChoice, { product: 'sticker' | 'poster' }>;
  poster: Extract<ProductChoice, { product: 'sticker' | 'poster' }>;
};

type ItemBase = { id: string; designId: string; styleId: StyleId; preview: ImageSourcePropType | null };

export type CartItem =
  | (ItemBase & { kind: 'single'; choice: ProductChoice; quantity: number })
  | (ItemBase & { kind: 'bundle'; choices: BundleChoices });

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** A cart item before it gets an ID. */
export type NewCartItem = DistributiveOmit<CartItem, 'id'>;

export function bundleItemsCents(choices: BundleChoices): number {
  return priceCents(choices.tee) + priceCents(choices.hoodie) + priceCents(choices.sticker) + priceCents(choices.poster);
}

export function itemCents(item: CartItem): number {
  return item.kind === 'bundle' ? bundleItemsCents(item.choices) : priceCents(item.choice) * item.quantity;
}

export type CartTotals = {
  itemCount: number;
  itemsCents: number;
  /** Estimate only: Wix applies the real automatic discount at checkout. */
  bundleDiscountCents: number;
  totalCents: number;
};

export function cartTotals(items: CartItem[]): CartTotals {
  let itemCount = 0;
  let itemsCents = 0;
  let bundleDiscountCents = 0;
  for (const item of items) {
    itemsCents += itemCents(item);
    if (item.kind === 'bundle') {
      itemCount += 4;
      bundleDiscountCents += discountCents(bundleItemsCents(item.choices), BUNDLE_DISCOUNT);
    } else {
      itemCount += item.quantity;
    }
  }
  return { itemCount, itemsCents, bundleDiscountCents, totalCents: itemsCents - bundleDiscountCents };
}
