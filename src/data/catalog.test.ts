import { applyServerPrices, PORTRAIT_SITTINGS, portraitSittings, PRODUCTS, productOrder } from './catalog';

describe('portraitSittings', () => {
  it('offers the Christmas portrait first, in November and December only', () => {
    expect(portraitSittings(new Date(2026, 10, 14))[0]).toBe('CHRISTMAS PORTRAIT');
    expect(portraitSittings(new Date(2026, 11, 31))[0]).toBe('CHRISTMAS PORTRAIT');
    expect(portraitSittings(new Date(2026, 10, 1))).toHaveLength(PORTRAIT_SITTINGS.length + 1);
  });

  it('offers only the year-round sittings out of season', () => {
    expect(portraitSittings(new Date(2027, 0, 1))).toEqual([...PORTRAIT_SITTINGS]);
    expect(portraitSittings(new Date(2026, 9, 31))).toEqual([...PORTRAIT_SITTINGS]);
  });
});

describe('productOrder', () => {
  it('shows the ornament in November and December only, and the mug all year', () => {
    expect(productOrder(new Date(2026, 10, 16))).toEqual(['tee', 'hoodie', 'sticker', 'poster', 'ornament', 'mug']);
    expect(productOrder(new Date(2027, 0, 2))).not.toContain('ornament');
    expect(productOrder(new Date(2027, 0, 2))).toContain('mug');
  });
});

describe('applyServerPrices', () => {
  it('takes the website prices, matching sizes loosely', () => {
    const changed = applyServerPrices([
      { key: 'poster', prices: { '12″×12″': 25, '16″×16″': 28.5, '18″×18″': 29.5 } },
      { key: 'ornament', prices: { Circle: 21 } },
      { key: 'mug', prices: { '11 oz': 22 } },
      { key: 'tee', prices: { S: 27, M: 27, L: 27, XL: 27, '2XL': 29.5, '3XL': 32 }, backPrices: { L: 35 } },
    ]);
    expect(changed).toBeGreaterThan(0);
    const poster = PRODUCTS.poster;
    if (poster.kind !== 'flat') throw new Error('poster should be flat');
    expect(poster.sizes[0].priceCents).toBe(2500);
    const ornament = PRODUCTS.ornament;
    const mug = PRODUCTS.mug;
    if (ornament.kind !== 'flat' || mug.kind !== 'flat') throw new Error('should be flat');
    expect(ornament.sizes[0].priceCents).toBe(2100);
    expect(mug.sizes[0].priceCents).toBe(2200);
    const tee = PRODUCTS.tee;
    if (tee.kind !== 'apparel') throw new Error('tee should be apparel');
    expect(tee.priceCents.L).toBe(2700);
    expect(tee.backExtraCents).toBe(800);
  });

  it('ignores unknown products and nonsense prices', () => {
    const before = JSON.stringify(PRODUCTS);
    expect(applyServerPrices([{ key: 'sock', prices: { M: 5 } }, { key: 'mug', prices: { '11 oz': -1 } }, { key: 'hoodie', prices: null }])).toBe(0);
    expect(JSON.stringify(PRODUCTS)).toBe(before);
  });
});
