// Design Your Pet app: pure rules shared by the http-functions.
// No Wix imports here, so the rules can be unit-tested outside Wix
// (see wix-backend/tests/rules.test.js). They mirror src/lib/limits.ts in the
// app and the website's petDesigns.js.

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const MAX_GOOD_DESIGNS = 5;
export const MAX_ATTEMPTS = 12;
export const SITE_DESIGNS_PER_HOUR = 180;
export const KEEP_DESIGNS_DAYS = 7;
export const MAX_TEXT_LENGTH = 18;
// A design still "pending" after this long is treated as failed, so a stuck
// generation can't block the customer forever.
export const STALE_PENDING_MS = 15 * 60 * 1000;

// App style id -> PetDesigns.styleChoice.
export const STYLE_TO_SITE = {
  stamp: 'travelStamp',
  poster: 'travelPoster',
  evening: 'eveningPortrait',
  sticker: 'adventureSticker',
};
export const SITE_TO_STYLE = Object.fromEntries(Object.entries(STYLE_TO_SITE).map(([app, site]) => [site, app]));
export const STYLES_WITH_TEXT = ['stamp', 'poster'];

// PetDesigns.status (set by the site's aiDesign.web.js) -> the app's DesignStatus.
// 'unclean': both tries came out dirty. 'error': the studio hit a snag, or the
// photo checker was down.
const STATUS_TO_APP = {
  pending: 'processing',
  ready: 'ready',
  flagged: 'flagged',
  ordered: 'ordered',
  blocked: 'rejected',
  unclean: 'failed',
  error: 'failed',
};
export const GOOD_APP_STATUSES = ['ready', 'flagged', 'ordered'];
export const GOOD_SITE_STATUSES = ['ready', 'flagged', 'ordered'];

export function toAppStatus(siteStatus, createdAt, now) {
  const status = STATUS_TO_APP[siteStatus] ?? 'failed';
  if (status === 'processing' && now - createdAt > STALE_PENDING_MS) return 'failed';
  return status;
}

// Why a design didn't come out, as the app's error code. The site checks the
// photo inside the background generation, so no-pet and rejected photos show
// up here, on the design, rather than as an error from POST /designs.
export const CHECKER_BUSY_NOTE = 'The photo checker is busy';
export function problemFor(appStatus, siteStatus, note) {
  if (appStatus !== 'failed' && appStatus !== 'rejected') return null;
  const text = String(note ?? '');
  if (siteStatus === 'blocked' && text === 'No animal in the photo.') return 'NO_PET';
  if (siteStatus === 'blocked' && text.startsWith('Photo rejected')) return 'PHOTO_REJECTED';
  if (siteStatus === 'error' && text.startsWith(CHECKER_BUSY_NOTE)) return 'CHECKER_UNAVAILABLE';
  return 'DESIGN_FAILED';
}

// startPetDesign's { ok: false, step } -> the app's error code.
export function startFailureCode(step) {
  switch (step) {
    case 'text':
      return 'TEXT_REJECTED';
    case 'text checker':
      return 'CHECKER_UNAVAILABLE';
    case 'daily limit':
      return 'LIMIT_REACHED';
    case 'attempt ceiling':
      return 'TRIES_LIMIT';
    case 'site busy':
      return 'STUDIO_BUSY';
    default:
      return 'DESIGN_FAILED';
  }
}

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isDeviceId(value) {
  return typeof value === 'string' && DEVICE_ID.test(value);
}

// Limits over one device's designs. `records` are { createdAt: ms, status: app status }.
// Returns the same shape as summarizeLimits in src/lib/limits.ts.
export function summarizeLimits(records, now) {
  const recent = records.filter((r) => r.createdAt > now - DAY_MS && r.createdAt <= now);
  const good = recent.filter((r) => GOOD_APP_STATUSES.includes(r.status));
  const oldest = (rs) => (rs.length ? Math.min(...rs.map((r) => r.createdAt)) + DAY_MS : null);

  const nextDesignAt = oldest(good);
  const nextTryAt = oldest(recent);
  const inProgress = recent.some((r) => r.status === 'processing');

  let blockedBy = null;
  let unlocksAt = null;
  if (inProgress) {
    blockedBy = 'in-progress';
  } else if (good.length >= MAX_GOOD_DESIGNS) {
    blockedBy = 'designs';
    unlocksAt = nextDesignAt;
  } else if (recent.length >= MAX_ATTEMPTS) {
    blockedBy = 'tries';
    unlocksAt = nextTryAt;
  }

  return {
    available: Math.max(0, MAX_GOOD_DESIGNS - good.length),
    goodCount: good.length,
    attemptCount: recent.length,
    inProgress,
    nextDesignAt,
    nextTryAt,
    blockedBy,
    unlocksAt,
  };
}

// Validates the text for a style. Returns the trimmed text, or throws a string
// reason. The content check itself (profanity, protected names) is the site's.
export function cleanText(style, text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return '';
  if (!STYLES_WITH_TEXT.includes(style)) throw new Error('This style has no text.');
  if (trimmed.length > MAX_TEXT_LENGTH) throw new Error(`Text can be up to ${MAX_TEXT_LENGTH} characters.`);
  return trimmed;
}

// Wix media references stored in collections can be "wix:image://v1/<id>/..."
// or a static URL. The app needs a plain https URL.
export function mediaUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^wix:image:\/\/v1\/([^/]+)\//);
  if (m) return `https://static.wixstatic.com/media/${m[1]}`;
  return value.startsWith('https://') ? value : null;
}

// ---------------------------------------------------------------------------
// Store products (Wix Stores Catalog V3). IDs are from the live site.

export const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

export const PRODUCT_IDS = {
  tee: '99a7b234-fb1d-4999-9196-1bc4357c9ef3', // Design Your Pet Tee
  hoodie: '62e00cff-8b21-479a-9aad-324507e379f2', // Design Your Pet Hoodie
  sticker: '1e805e4e-eace-4a86-9391-5699beff4be9', // Bubble-free stickers
  poster: '11eb5e97-7490-499a-87c1-54b0059e6cde', // Poster
};

// Single-option products: app size id -> Wix variant id.
export const FLAT_VARIANTS = {
  sticker: {
    '3x3': 'a1be93ad-598a-491e-ad35-4fe66fefa891',
    '4x4': 'f9a31cb8-a86c-4dae-b15f-b4b9f3b7e99a',
    '5.5x5.5': '22c23d4e-8563-464f-9084-fa30011eaa32',
  },
  poster: {
    '12x12': '6acebb19-4a61-458e-acb6-6c00950df02f',
    '16x16': '2380aebf-d38a-4255-a422-f1baaa637c0a',
    '18x18': 'cbe28832-6bdc-485a-8639-8a7423049081',
  },
};

export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
export const BUNDLE_PRODUCTS = ['tee', 'hoodie', 'sticker', 'poster'];
export const MAX_QUANTITY = 10;
export const MAX_LINES = 20;

const idOf = (x) => x?._id ?? x?.id;

// Finds the variant of a Catalog V3 product (tee or hoodie) for a colour and
// size, matching by the option and choice names shown in the store.
export function findApparelVariantId(product, color, size) {
  const option = (name) => (product.options ?? []).find((o) => o.name === name);
  const choiceId = (opt, name) => opt?.choicesSettings?.choices?.find((c) => c.name === name)?.choiceId;
  const colorOpt = option('Color');
  const sizeOpt = option('Size');
  const want = [
    [idOf(colorOpt), choiceId(colorOpt, color)],
    [idOf(sizeOpt), choiceId(sizeOpt, size)],
  ];
  if (want.some(([o, c]) => !o || !c)) return null;
  const variant = (product.variantsInfo?.variants ?? []).find((v) =>
    want.every(([o, c]) => (v.choices ?? []).some((ch) => ch.optionChoiceIds?.optionId === o && ch.optionChoiceIds?.choiceId === c)),
  );
  return variant ? idOf(variant) : null;
}

// Checks one product choice from the app and returns { product, variantId? , color?, size }.
// Apparel variant ids are resolved later against the live product.
export function parseChoice(choice) {
  if (!choice || typeof choice !== 'object') throw new Error('Missing product choice.');
  const { product, size } = choice;
  if (product === 'tee' || product === 'hoodie') {
    if (!APPAREL_SIZES.includes(size)) throw new Error(`Unknown size ${size}.`);
    if (typeof choice.color !== 'string' || !choice.color) throw new Error('Missing colour.');
    return { product, color: choice.color, size };
  }
  if (product === 'sticker' || product === 'poster') {
    const variantId = FLAT_VARIANTS[product][size];
    if (!variantId) throw new Error(`Unknown size ${size} for ${product}.`);
    return { product, size, variantId };
  }
  throw new Error(`Unknown product ${product}.`);
}

// Validates the checkout lines from the app. Returns
// { designIds, items: [{ designId, quantity, choice }] }.
export function parseCheckoutLines(lines) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('The cart is empty.');
  if (lines.length > MAX_LINES) throw new Error('Too many items in the cart.');
  const items = [];
  for (const line of lines) {
    if (typeof line?.designId !== 'string' || !line.designId) throw new Error('Missing design.');
    if (line.kind === 'single') {
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new Error('Bad quantity.');
      items.push({ designId: line.designId, quantity, choice: parseChoice(line.choice) });
    } else if (line.kind === 'bundle') {
      const choices = (line.choices ?? []).map(parseChoice);
      const products = choices.map((c) => c.product).sort();
      if (products.join() !== [...BUNDLE_PRODUCTS].sort().join()) throw new Error('A bundle needs one of each product.');
      for (const choice of choices) items.push({ designId: line.designId, quantity: 1, choice });
    } else {
      throw new Error('Unknown cart line.');
    }
  }
  return { designIds: [...new Set(items.map((i) => i.designId))], items };
}

// Only send the customer back into the app, never to another site.
const RETURN_PREFIXES = ['designyourpet://', 'exp://', 'exp+design-your-pet://', 'http://localhost:', 'http://127.0.0.1:'];
export function isAllowedReturnUrl(url) {
  return typeof url === 'string' && url.length < 500 && RETURN_PREFIXES.some((p) => url.startsWith(p));
}

export function withQuery(url, params) {
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

// ---------------------------------------------------------------------------
// Orders

// Fallback when Printful has nothing to say: shipped once Wix has a
// fulfillment, otherwise still waiting for the hand review.
export function toAppOrderStatus(order, hasTracking) {
  if (order.fulfillmentStatus === 'FULFILLED' || order.fulfillmentStatus === 'PARTIALLY_FULFILLED' || hasTracking) return 'shipped';
  return 'in-review';
}

// The Printful external_id the site's printfulOrders.js gives one order line.
// Must stay identical to the code there.
export function printfulExternalId(order, lineItem) {
  return `${order.number || String(order._id).slice(0, 12)}-${String(lineItem._id || lineItem.id || '').slice(0, 12)}`
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);
}

// Printful order statuses -> the app's. Orders start as drafts that wait for
// a hand review ("confirm: false"), which is the app's "in review".
const PRINTFUL_PROGRESS = { draft: 0, onhold: 0, failed: 0, canceled: 0, pending: 1, inprocess: 1, partial: 2, fulfilled: 2 };
const APP_ORDER_STATUS = ['in-review', 'printing', 'shipped'];
// The least advanced line decides; null if Printful had nothing.
export function orderStatusFromPrintful(statuses) {
  const known = statuses.filter((st) => st in PRINTFUL_PROGRESS);
  if (!known.length) return null;
  return APP_ORDER_STATUS[Math.min(...known.map((st) => PRINTFUL_PROGRESS[st]))];
}

export function orderTitle(order) {
  const lines = order.lineItems ?? [];
  const names = lines.map((l) => l.productName?.original ?? l.productName ?? '');
  const has = (word) => names.some((n) => n.toLowerCase().includes(word));
  if (lines.length === 4 && ['tee', 'hoodie', 'sticker', 'poster'].every(has)) return 'Buy them all bundle';
  if (!lines.length) return 'Your order';
  return lines.length === 1 ? names[0] : `${names[0]} and ${lines.length - 1} more`;
}

export function toCents(amount) {
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

// The order custom field that ties a Wix order to the phone that placed it.
export const FIELD_DEVICE = 'Design Your Pet app device';

// Each line carries its design the same way the website's cart does: a
// custom text field "designRecordId", which Wix shows as a description line
// and the site's events.js reads to send the line to Printful.
export const DESIGN_FIELD = 'designRecordId';

export function designIdOfLine(lineItem) {
  const line = (lineItem?.descriptionLines ?? []).find((l) => l.name?.original === DESIGN_FIELD || l.name?.translated === DESIGN_FIELD);
  return line?.plainText?.original ?? line?.plainText?.translated ?? null;
}

export function readCustomField(entity, title) {
  const field = (entity?.customFields ?? []).find((f) => f.title === title);
  return field ? String(field.value ?? '') : null;
}
