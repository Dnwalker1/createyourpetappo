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
    expect(formatMoney(low.itemsCents)).toBe('$117.00');
    expect(formatMoney(low.totalCents)).toBe('$105.30');
    const high = cartTotals([{ ...base, id: 'b', kind: 'bundle', choices: priciest }]);
    expect(formatMoney(high.totalCents)).toBe('$119.70');
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
    expect(formatMoney(t.itemsCents)).toBe('$147.50');
    // Wix's rule discounts every Design Your Pet item once all four are in the cart.
    expect(formatMoney(t.bundleDiscountCents)).toBe('$14.75');
    expect(formatMoney(t.totalCents)).toBe('$132.75');
  });

  it('discounts four items added one at a time, like Wix does', () => {
    const singles: CartItem[] = [
      { ...base, id: 't', kind: 'single', choice: { product: 'tee', color: 'Athletic Heather', size: 'XL' }, quantity: 1 },
      { ...base, id: 'h', kind: 'single', choice: { product: 'hoodie', color: 'Sky Blue', size: 'XL' }, quantity: 1 },
      { ...base, id: 'p', kind: 'single', choice: { product: 'poster', size: '18x18' }, quantity: 1 },
      { ...base, id: 's', kind: 'single', choice: { product: 'sticker', size: '5.5x5.5' }, quantity: 1 },
    ];
    const t = cartTotals(singles);
    expect(formatMoney(t.itemsCents)).toBe('$123.00');
    expect(formatMoney(t.bundleDiscountCents)).toBe('$12.30');
    expect(formatMoney(t.totalCents)).toBe('$110.70');
    // Three of the four: no discount.
    expect(cartTotals(singles.slice(0, 3)).bundleDiscountCents).toBe(0);
  });

  it('does not discount single items', () => {
    const t = cartTotals([{ ...base, id: 'x', kind: 'single', choice: { product: 'poster', size: '18x18' }, quantity: 2 }]);
    expect(t.bundleDiscountCents).toBe(0);
    expect(formatMoney(t.totalCents)).toBe('$59.00');
    expect(bundleItemsCents(cheapest)).toBe(11700);
  });
});

describe('price ranges', () => {
  it('matches the product list', () => {
    expect(formatRange(priceRange('tee'))).toBe('$26–$31');
    expect(formatRange(priceRange('hoodie'))).toBe('$55.50–$60.50');
    expect(formatRange(priceRange('sticker'))).toBe('$11.50–$12');
    expect(formatRange(priceRange('poster'))).toBe('$24–$29.50');
  });
});
