import {
  DAY_MS,
  FLAT_VARIANTS,
  STALE_PENDING_MS,
  cleanText,
  findApparelVariantId,
  isAllowedReturnUrl,
  mediaUrl,
  orderTitle,
  parseCheckoutLines,
  problemFor,
  startFailureCode,
  summarizeLimits,
  toAppOrderStatus,
  toAppStatus,
  toCents,
  withQuery,
} from '../backend/dyp/rules';

const NOW = Date.parse('2026-09-24T20:00:00Z');
const ago = (h) => NOW - h * 60 * 60 * 1000;

describe('limits', () => {
  it('matches the app rules: 5 good designs, unlock at the oldest + 24h', () => {
    const records = [1, 2, 3, 4, 5].map((h) => ({ createdAt: ago(h), status: 'ready' }));
    const s = summarizeLimits(records, NOW);
    expect(s.available).toBe(0);
    expect(s.blockedBy).toBe('designs');
    expect(s.unlocksAt).toBe(ago(5) + DAY_MS);
  });

  it('counts every attempt toward 12', () => {
    const records = Array.from({ length: 12 }, (_, i) => ({ createdAt: ago(i + 1), status: i < 2 ? 'ready' : 'rejected' }));
    const s = summarizeLimits(records, NOW);
    expect(s.available).toBe(3);
    expect(s.blockedBy).toBe('tries');
    expect(s.unlocksAt).toBe(ago(12) + DAY_MS);
  });

  it('ignores anything older than 24 hours', () => {
    const s = summarizeLimits([{ createdAt: ago(25), status: 'ready' }], NOW);
    expect(s.available).toBe(5);
    expect(s.nextDesignAt).toBeNull();
  });
});

describe('statuses', () => {
  it('maps the site statuses', () => {
    expect(toAppStatus('pending', NOW, NOW)).toBe('processing');
    expect(toAppStatus('blocked', NOW, NOW)).toBe('rejected');
    expect(toAppStatus('unclean', NOW, NOW)).toBe('failed');
    expect(toAppStatus('ordered', NOW, NOW)).toBe('ordered');
  });

  it('treats a stuck pending design as failed', () => {
    expect(toAppStatus('pending', NOW - STALE_PENDING_MS - 1, NOW)).toBe('failed');
  });
});

describe('text', () => {
  it('allows text only on stamp and poster, up to 18 characters', () => {
    expect(cleanText('stamp', '  Biscuit ')).toBe('Biscuit');
    expect(cleanText('evening', '')).toBe('');
    expect(() => cleanText('evening', 'Biscuit')).toThrow();
    expect(() => cleanText('poster', 'x'.repeat(19))).toThrow();
  });
});

describe('checkout lines', () => {
  const bundle = {
    kind: 'bundle',
    designId: 'd1',
    choices: [
      { product: 'tee', color: 'White', size: 'L' },
      { product: 'hoodie', color: 'Bone', size: 'L' },
      { product: 'sticker', size: '4x4' },
      { product: 'poster', size: '16x16' },
    ],
  };

  it('expands a bundle into four items', () => {
    const { designIds, items } = parseCheckoutLines([bundle, { kind: 'single', designId: 'd2', quantity: 2, choice: { product: 'poster', size: '12x12' } }]);
    expect(designIds).toEqual(['d1', 'd2']);
    expect(items).toHaveLength(5);
    expect(items[2].choice.variantId).toBe(FLAT_VARIANTS.sticker['4x4']);
    expect(items[4]).toMatchObject({ quantity: 2, choice: { variantId: FLAT_VARIANTS.poster['12x12'] } });
  });

  it('rejects bad input', () => {
    expect(() => parseCheckoutLines([])).toThrow();
    expect(() => parseCheckoutLines([{ ...bundle, choices: bundle.choices.slice(1) }])).toThrow();
    expect(() => parseCheckoutLines([{ kind: 'single', designId: 'd', quantity: 0, choice: { product: 'tee', color: 'White', size: 'L' } }])).toThrow();
    expect(() => parseCheckoutLines([{ kind: 'single', designId: 'd', quantity: 1, choice: { product: 'tee', color: 'White', size: 'XS' } }])).toThrow();
  });
});

describe('apparel variants', () => {
  const product = {
    options: [
      { id: 'color', name: 'Color', choicesSettings: { choices: [{ choiceId: 'bone', name: 'Bone' }, { choiceId: 'white', name: 'White' }] } },
      { id: 'size', name: 'Size', choicesSettings: { choices: [{ choiceId: 'l', name: 'L' }] } },
    ],
    variantsInfo: {
      variants: [
        { id: 'v-white-l', choices: [{ optionChoiceIds: { optionId: 'color', choiceId: 'white' } }, { optionChoiceIds: { optionId: 'size', choiceId: 'l' } }] },
        { id: 'v-bone-l', choices: [{ optionChoiceIds: { optionId: 'color', choiceId: 'bone' } }, { optionChoiceIds: { optionId: 'size', choiceId: 'l' } }] },
      ],
    },
  };

  it('finds the variant by colour and size name', () => {
    expect(findApparelVariantId(product, 'Bone', 'L')).toBe('v-bone-l');
    expect(findApparelVariantId(product, 'Khaki', 'L')).toBeNull();
  });
});

describe('orders and URLs', () => {
  it('maps order status', () => {
    expect(toAppOrderStatus({ paymentStatus: 'PAID', fulfillmentStatus: 'NOT_FULFILLED' }, false)).toBe('printing');
    expect(toAppOrderStatus({ paymentStatus: 'PAID', fulfillmentStatus: 'FULFILLED' }, false)).toBe('shipped');
    expect(toAppOrderStatus({ paymentStatus: 'PENDING', fulfillmentStatus: 'NOT_FULFILLED' }, false)).toBe('in-review');
  });

  it('names the bundle', () => {
    const lineItems = ['Design Your Pet Tee', 'Design Your Pet Hoodie', 'Bubble-free stickers', 'Poster'].map((n) => ({ productName: { original: n } }));
    expect(orderTitle({ lineItems })).toBe('Buy them all bundle');
    expect(orderTitle({ lineItems: lineItems.slice(0, 2) })).toBe('Design Your Pet Tee and 1 more');
  });

  it('only returns into the app', () => {
    expect(isAllowedReturnUrl('designyourpet://confirmation')).toBe(true);
    expect(isAllowedReturnUrl('https://evil.example/')).toBe(false);
    expect(withQuery('designyourpet://confirmation', { orderId: 'a b' })).toBe('designyourpet://confirmation?orderId=a%20b');
  });

  it('converts money and media', () => {
    expect(toCents('127.95')).toBe(12795);
    expect(mediaUrl('wix:image://v1/94607f_abc~mv2.png/x.png#originWidth=1')).toBe('https://static.wixstatic.com/media/94607f_abc~mv2.png');
    expect(mediaUrl('http://insecure')).toBeNull();
  });
});

describe('the site generator', () => {
  it('turns a design outcome into the right problem screen', () => {
    expect(problemFor('rejected', 'blocked', 'No animal in the photo.')).toBe('NO_PET');
    expect(problemFor('rejected', 'blocked', 'Photo rejected: unsuitable photo')).toBe('PHOTO_REJECTED');
    expect(problemFor('rejected', 'blocked', 'Gemini returned no image.')).toBe('DESIGN_FAILED');
    expect(problemFor('failed', 'error', 'The photo checker is busy — please try again in a minute.')).toBe('CHECKER_UNAVAILABLE');
    expect(problemFor('failed', 'unclean', 'The banner didn\'t come out reading "BISCUIT".')).toBe('DESIGN_FAILED');
    expect(problemFor('ready', 'ready', '')).toBeNull();
  });

  it('maps startPetDesign refusals', () => {
    expect(startFailureCode('text')).toBe('TEXT_REJECTED');
    expect(startFailureCode('text checker')).toBe('CHECKER_UNAVAILABLE');
    expect(startFailureCode('daily limit')).toBe('LIMIT_REACHED');
    expect(startFailureCode('attempt ceiling')).toBe('TRIES_LIMIT');
    expect(startFailureCode('site busy')).toBe('STUDIO_BUSY');
    expect(startFailureCode('starting the design')).toBe('DESIGN_FAILED');
  });

  it('knows the site statuses', () => {
    expect(toAppStatus('error', NOW, NOW)).toBe('failed');
  });
});
