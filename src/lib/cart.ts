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

// Matches the "Buy Them All" rule in Wix: once the cart holds at least one
// tee, hoodie, sticker and poster (any designs, added one by one or as a
// bundle), everything in the order is 10% off, extras and other store
// products included (Don's decision, 27 Oct 2026). Wix applies the real
// discount at checkout; this is the estimate.
export function cartTotals(items: CartItem[]): CartTotals {
  let itemCount = 0;
  let itemsCents = 0;
  const kinds = new Set<string>();
  for (const item of items) {
    itemsCents += itemCents(item);
    if (item.kind === 'bundle') {
      itemCount += 4;
      ['tee', 'hoodie', 'sticker', 'poster'].forEach((k) => kinds.add(k));
    } else {
      itemCount += item.quantity;
      kinds.add(item.choice.product);
    }
  }
  const qualifies = ['tee', 'hoodie', 'sticker', 'poster'].every((k) => kinds.has(k));
  const bundleDiscountCents = qualifies ? discountCents(itemsCents, BUNDLE_DISCOUNT) : 0;
  return { itemCount, itemsCents, bundleDiscountCents, totalCents: itemsCents - bundleDiscountCents };
}
