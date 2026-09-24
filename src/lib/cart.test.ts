import { BundleChoices, CartItem, bundleItemsCents, cartTotals } from './cart';
import { formatMoney, formatRange } from './money';
import { priceRange } from '../data/catalog';

const cheapest: BundleChoices = {
  tee: { product: 'tee', color: 'White', size: 'M' },
  hoodie: { product: 'hoodie', color: 'Bone', size: 'S' },
  sticker: { product: 'sticker', size: '3x3' },
  poster: { product: 'poster', size: '12x12' },
};
const priciest: BundleChoices = {
  tee: { product: 'tee', color: 'Ash', size: '3XL' },
  hoodie: { product: 'hoodie', color: 'Khaki', size: '3XL' },
  sticker: { product: 'sticker', size: '5.5x5.5' },
  poster: { product: 'poster', size: '18x18' },
};
const base = { designId: 'd1', styleId: 'stamp' as const, preview: null };

describe('bundle pricing', () => {
  it('matches the bundle prices in the spec', () => {
    const low = cartTotals([{ ...base, id: 'a', kind: 'bundle', choices: cheapest }]);
    expect(formatMoney(low.itemsCents)).toBe('$111.00');
    expect(formatMoney(low.totalCents)).toBe('$99.90');
    const high = cartTotals([{ ...base, id: 'b', kind: 'bundle', choices: priciest }]);
    expect(formatMoney(high.totalCents)).toBe('$114.30');
  });

  it('matches the cart example: bundle at L/4″/16″ plus a Natural M tee', () => {
    const items: CartItem[] = [
      {
        ...base,
        id: 'a',
        kind: 'bundle',
        choices: { ...cheapest, tee: { product: 'tee', color: 'White', size: 'L' }, hoodie: { product: 'hoodie', color: 'Bone', size: 'L' }, sticker: { product: 'sticker', size: '4x4' }, poster: { product: 'poster', size: '16x16' } },
      },
      { ...base, id: 'b', kind: 'single', choice: { product: 'tee', color: 'Natural', size: 'M' }, quantity: 1 },
    ];
    const t = cartTotals(items);
    expect(t.itemCount).toBe(5);
    expect(formatMoney(t.itemsCents)).toBe('$139.50');
    expect(formatMoney(t.bundleDiscountCents)).toBe('$11.55');
    expect(formatMoney(t.totalCents)).toBe('$127.95');
  });

  it('does not discount single items', () => {
    const t = cartTotals([{ ...base, id: 'x', kind: 'single', choice: { product: 'poster', size: '18x18' }, quantity: 2 }]);
    expect(t.bundleDiscountCents).toBe(0);
    expect(formatMoney(t.totalCents)).toBe('$55.00');
    expect(bundleItemsCents(cheapest)).toBe(11100);
  });
});

describe('price ranges', () => {
  it('matches the product list', () => {
    expect(formatRange(priceRange('tee'))).toBe('$24–$29');
    expect(formatRange(priceRange('hoodie'))).toBe('$54.50–$59.50');
    expect(formatRange(priceRange('sticker'))).toBe('$10.50–$11');
    expect(formatRange(priceRange('poster'))).toBe('$22–$27.50');
  });
});
